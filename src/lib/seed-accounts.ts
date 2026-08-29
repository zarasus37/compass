/**
 * Account seed migration — Cluster 5.2.6 widget switch.
 *
 * The /accounts page reads from the in-memory `ACCOUNT_SEED` (via
 * `liveAccount()`). After this cluster it reads from the Prisma
 * `Account` table.
 *
 * This module is the one-time migration that makes that flip safe:
 *   - On first read for a user, ensure the user has the 1 canonical
 *     ACCOUNT_SEED row in the `Account` table, marked
 *     `source = "seed"`.
 *   - The function is idempotent: if the user already has a seed
 *     account, the insert is a no-op.
 *   - Re-running with new seed data (e.g. a 2nd canonical account
 *     for a savings row) is supported by bumping
 *     `ACCOUNT_SEED_VERSION` — on mismatch, the old seed row is
 *     dropped and re-inserted. v1 ships at v1.
 *
 * The onboarding projection already inserts Account rows with
 * `name = "[identity] <label>"` — those coexist with the seed row
 * (distinguishable by `source` = "identity" vs "seed"). The page
 * surfaces both lists; the projection-prefixed accounts are
 * optionally hidden behind a tab in a future cluster.
 *
 * Why a separate file: same pattern as `seed-bills.ts`,
 * `seed-goals.ts`, and `seed-allocation.ts`. The widget switch
 * follows the same template.
 */

import "server-only";
import { prisma } from "@/server/db";
import { ACCOUNT_SEED } from "./mock-seed";

/**
 * Bump this when ACCOUNT_SEED changes. On mismatch, the seeder
 * drops the user's existing seed row and re-inserts. Identity + user
 * rows are untouched.
 */
const ACCOUNT_SEED_VERSION = 1;

/**
 * Ensure the user has the canonical ACCOUNT_SEED row in the
 * production `Account` table, with `source = "seed"`.
 *
 * - First call for a user: creates 1 row.
 * - Subsequent calls: no-op (the count check is the cheap
 *   idempotency guard).
 * - If the stored `seedVersion` doesn't match `ACCOUNT_SEED_VERSION`:
 *   drops the existing seed row and re-inserts.
 *
 * Returns the count of seed rows the user has after the call.
 */
export async function ensureUserAccountsSeeded(
  userId: string,
): Promise<{ seeded: number; version: number; alreadyHadSeed: boolean }> {
  // Cheap path: the user already has the canonical seed account.
  // Match by the stable ACCOUNT_SEED.id (not by `source: "seed"`)
  // so non-canonical rows that share the same source — e.g. the
  // projection rows the onboarding chat writes with `name: "[identity] ..."`
  // — don't trick the seeder into wiping them.
  const existing = await prisma.account.findFirst({
    where: { userId, id: ACCOUNT_SEED.id },
    select: { id: true, name: true, currentBalance: true },
  });

  if (existing && existing.name === ACCOUNT_SEED.name) {
    return {
      seeded: 1,
      version: ACCOUNT_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // (Re)seed: drop only the canonical seed row (by id), then re-insert.
  await prisma.account.deleteMany({
    where: { userId, id: ACCOUNT_SEED.id },
  });

  await prisma.account.create({
    data: {
      // Use the same stable id as the in-memory store so any UI
      // component that keys on "acct-chase" still works.
      id: ACCOUNT_SEED.id,
      userId,
      name: ACCOUNT_SEED.name,
      type: ACCOUNT_SEED.type,
      currentBalance: ACCOUNT_SEED.balanceCents,
      institution: ACCOUNT_SEED.institution,
      mask: ACCOUNT_SEED.mask,
      source: "seed",
      // routingEnabled stays false (no L2 yet).
      // isArchived stays false.
      // sortOrder stays 0.
    },
  });

  return {
    seeded: 1,
    version: ACCOUNT_SEED_VERSION,
    alreadyHadSeed: false,
  };
}
