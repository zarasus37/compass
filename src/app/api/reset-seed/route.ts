/**
 * Admin reset endpoint — wipes the in-memory live store and re-inserts
 * the seed data for the current user.
 *
 * Used by the "Reset to seed" button in /settings to clear test drift
 * from running smokes. The action authenticates the user via the
 * session cookie and resets ONLY that user's data — multi-user safe
 * by construction (the userId filter is applied to every delete +
 * insert).
 *
 * The reset covers two layers:
 *   1. The Prisma-backed envelopes (multi-user safe — deletes + inserts
 *      are scoped to the current userId).
 *   2. The in-memory live store (`resetStore()`), which holds the
 *      goals, transactions, allocation plan, account, audit log,
 *      bills, and debts. The in-memory state is pinned to
 *      `globalThis.__COMPASS_STORE__` for HMR; `resetStore()` re-seeds
 *      it from `mock-seed.ts` so a code change to the seed picks up
 *      after a reset (no dev server restart needed).
 *
 * Cluster 4.2: extended to also call `resetStore()` so new goals
 * (e.g. the INVEST seed) show up immediately after a seed change.
 *
 * In a future cluster this could grow a richer reset surface
 * (e.g. preserve user-created envelopes, only reset the 7 planetary
 * ones) — for v1, "wipe and reseed everything" is the simplest
 * correct answer.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { resetUserEnvelopesToSeed, resetStore } from "@/lib/store";
import { ensureUserBillsSeeded } from "@/lib/seed-bills";
import { ensureUserGoalsSeeded } from "@/lib/seed-goals";
import { ensureUserAllocationSeeded } from "@/lib/seed-allocation";
import { revalidatePath } from "next/cache";

export async function POST() {
  const user = await requireUser();
  try {
    await resetUserEnvelopesToSeed(user.id);
    // Cluster 5.2.6: also (re)seed the Bill table so the
    // /recurring + dashboard + /calendar widgets have the 6
    // canonical BILLS_SEED rows. Idempotent: subsequent calls are
    // a no-op.
    await ensureUserBillsSeeded(user.id);
    // Same for Goal — the /goals page now reads from the Prisma
    // Goal table, and the canonical 4 GOALS_SEED rows need to be
    // migrated for the page to render the right data.
    await ensureUserGoalsSeeded(user.id);
    // Same for AllocationPlan + AllocationRule — the /allocation
    // page now reads the active plan from the Prisma tables, and
    // the canonical ALLOCATION_PLAN_SEED (1 plan + 7 rules) needs
    // to be migrated for the page to render the right data.
    await ensureUserAllocationSeeded(user.id);
    // Also wipe + reseed the in-memory store. The single-user v1
    // model has no userId scoping here (the store is global), but
    // the action authenticates the user, so a stranger can't
    // trigger this.
    resetStore();
    // Bust the root layout so every page re-reads the freshly-seeded
    // state immediately.
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      message: "Envelopes + bills + goals + allocation + live store reset to seed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
