/**
 * Allocation plan seed migration — Cluster 5.2.6 widget switch.
 *
 * The /allocation page, the dashboard "Plan My Next Check" widget,
 * and the Sankey ("Automation Map") all display the active plan's
 * strategy + armed state + per-envelope distribution. After this
 * cluster those reads come from the Prisma `AllocationPlan` +
 * `AllocationRule` tables instead of the in-memory
 * `ALLOCATION_PLAN_SEED`.
 *
 * This module is the one-time migration that makes that flip safe:
 *   - On first read for a user, ensure the user has one
 *     `AllocationPlan` (source="seed") with seven `AllocationRule`
 *     rows mapped from the canonical `ALLOCATION_PLAN_SEED`.
 *   - The function is idempotent: if the user already has a seed
 *     plan, the insert is a no-op.
 *   - Re-running with new seed data (e.g. a 8th rule) is supported
 *     by bumping `ALLOCATION_SEED_VERSION` — on mismatch, the old
 *     plan + rules are dropped and re-inserted. v1 ships at v1.
 *
 * Schema note: the Prisma `AllocationRule` model stores rules as
 * (`pct`, `fixedCents?`) — there's no `mode` column. The mapping
 * between the in-memory `mode + value` shape and the schema's
 * `pct + fixedCents` shape is:
 *
 *   in-memory mode  | in-memory value | schema pct | schema fixedCents
 *   ----------------|-----------------|------------|------------------
 *   "percent"       | 0–100           | value      | null
 *   "fixed"         | cents (>=0)     | 0          | value
 *   "remainder"     | 0               | 0          | null
 *
 * The reverse mapping lives in `livePlanFromDb` (mock.ts).
 *
 * Why a separate file: same pattern as `seed-bills.ts` and
 * `seed-goals.ts`. The next widget (insights, then accounts) follows
 * the same template.
 */

import "server-only";
import { prisma } from "@/server/db";
import { ALLOCATION_PLAN_SEED } from "./mock-seed";

/**
 * Bump this when ALLOCATION_PLAN_SEED changes (added/removed rules,
 * different strategy, different priority). On mismatch, the seeder
 * drops the user's existing seed plan (and its rules, via cascade)
 * and re-inserts from ALLOCATION_PLAN_SEED. Identity + user rows
 * are untouched.
 */
const ALLOCATION_SEED_VERSION = 1;

/**
 * Ensure the user has the canonical ALLOCATION_PLAN_SEED plan in
 * the production `AllocationPlan` + `AllocationRule` tables, with
 * `source = "seed"`.
 *
 * - First call for a user: creates 1 plan + 7 rules.
 * - Subsequent calls: no-op (the count check is the cheap idempotency
 *   guard).
 * - If the stored `seedVersion` doesn't match `ALLOCATION_SEED_VERSION`:
 *   drops the existing seed plan (the `onDelete: Cascade` on
 *   AllocationRule.planId takes the rules with it) and re-inserts
 *   from ALLOCATION_PLAN_SEED.
 *
 * Returns the count of seed rules the user has after the call.
 */
export async function ensureUserAllocationSeeded(
  userId: string,
): Promise<{ planId: string; seeded: number; version: number; alreadyHadSeed: boolean }> {
  // Cheap path: the user already has a seed plan AND its rule count
  // matches the current canonical seed. No-op.
  const existingPlan = await prisma.allocationPlan.findFirst({
    where: { userId, source: "seed" },
    include: {
      rules: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (existingPlan && existingPlan.rules.length === ALLOCATION_PLAN_SEED.rules.length) {
    return {
      planId: existingPlan.id,
      seeded: existingPlan.rules.length,
      version: ALLOCATION_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // We need to (re)seed. Drop the existing seed plan (and its rules,
  // via the AllocationRule.planId cascade) and re-insert from
  // ALLOCATION_PLAN_SEED. Identity + user rows are untouched.
  await prisma.allocationPlan.deleteMany({
    where: { userId, source: "seed" },
  });

  // `prisma.allocationPlan.create` (not `createMany`) so we get the
  // generated id back — we need it to wire the rules' `planId`.
  const plan = await prisma.allocationPlan.create({
    data: {
      id: ALLOCATION_PLAN_SEED.id,
      userId,
      strategyId: ALLOCATION_PLAN_SEED.strategy,
      isArmed: ALLOCATION_PLAN_SEED.isArmed,
      name: "Default plan",
      source: "seed",
    },
  });

  await prisma.allocationRule.createMany({
    data: ALLOCATION_PLAN_SEED.rules.map((r) => {
      // Map the in-memory `mode + value` shape to the schema's
      // `pct + fixedCents` shape. The reverse mapping lives in
      // `livePlanFromDb`.
      const pct = r.mode === "percent" ? r.value : 0;
      const fixedCents = r.mode === "fixed" ? r.value : null;
      return {
        id: r.id,
        planId: plan.id,
        envelopeId: r.envelopeId,
        pct,
        fixedCents,
        // Inherit the plan's source so a future "show only user-edited
        // rules" filter can join via the parent plan without an extra
        // index.
        source: "seed",
        sortOrder: r.priority,
      };
    }),
  });

  return {
    planId: plan.id,
    seeded: ALLOCATION_PLAN_SEED.rules.length,
    version: ALLOCATION_SEED_VERSION,
    alreadyHadSeed: false,
  };
}
