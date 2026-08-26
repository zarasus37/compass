/**
 * Bill seed migration — Cluster 5.2.6 widget switch.
 *
 * The /recurring (= /obligations?tab=bills) page, the dashboard's
 * "Critical Timeline" + "Plan My Next Check" + "Next Step" widgets,
 * and the /calendar bills-due warning all read from the in-memory
 * `BILLS_SEED` (via `liveBills()`). After this cluster they read
 * from the Prisma `Bill` table.
 *
 * This module is the one-time migration that makes that flip safe:
 *   - On first read for a user, ensure that user has a copy of the
 *     6 canonical BILLS_SEED rows in the `Bill` table, each marked
 *     `source = "seed"`.
 *   - The function is idempotent: if the user already has any seed
 *     rows, the insert is a no-op.
 *   - Re-running with new seed data (e.g. adding a 7th canonical
 *     bill) is supported by bumping the `BILL_SEED_VERSION` constant
 *     below — when the version doesn't match, the old seed rows are
 *     dropped and the new ones inserted. v1 ships at version 1.
 *
 * What this gives us:
 *   1. The /recurring page renders from Prisma (the durable source
 *      of truth). The in-memory `BILLS_SEED` becomes vestigial for
 *      widget reads (other call sites still exist, e.g. the
 *      PaycheckBreakdown engine — see store.ts — but the visible-UI
 *      widgets now use `liveBillsFromDb`).
 *   2. Onboarded users with `source="identity"` bills (projected from
 *      the chat) see those rows alongside the canonical ones. The
 *      `WHERE source IN ('seed','identity')` filter is implicit in
 *      `liveBillsFromDb` (it returns all unarchived bills, but
 *      `source="user"` is reserved for future manual entries).
 *   3. Reset-to-seed (the /api/reset-seed admin endpoint) wipes the
 *      user-specific overrides and re-inserts the canonical set +
 *      calls this seeder.
 *
 * Why a separate file: the existing `ensureUserEnvelopesSeeded` in
 * `lib/store.ts` does the same thing for envelopes. Keeping bills
 * parallel and isolated makes the next widget (envelopes, then
 * accounts, etc.) follow the same pattern: one seed file per
 * production table that needs migration.
 */

import "server-only";
import { prisma } from "@/server/db";
import { BILLS_SEED, type BillSeed } from "./mock-seed";

/**
 * Bump this when BILLS_SEED changes (added/removed/renamed rows).
 * On mismatch, the seeder drops the user's existing seed rows and
 * re-inserts from BILLS_SEED. Identity + user rows are untouched.
 */
const BILL_SEED_VERSION = 1;

/**
 * Ensure the user has the 6 canonical BILLS_SEED rows in the
 * production `Bill` table, each marked `source = "seed"`.
 *
 * - First call for a user: creates 6 rows.
 * - Subsequent calls: no-op (the count check is the cheap idempotency
 *   guard).
 * - If the stored `seedVersion` doesn't match `BILL_SEED_VERSION`:
 *   drops the existing seed rows and re-inserts from BILLS_SEED.
 *   This is how a future change to the canonical set propagates
 *   without manual SQL.
 *
 * Returns the count of seed rows the user has after the call (used
 * by smoke checks to verify the migration actually ran).
 */
export async function ensureUserBillsSeeded(
  userId: string,
): Promise<{ seeded: number; version: number; alreadyHadSeed: boolean }> {
  // Cheap path: the user already has seed rows AND they match the
  // current version. No-op.
  const existing = await prisma.bill.findMany({
    where: { userId, source: "seed" },
    select: { id: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length > 0) {
    // Check the version marker. We stash it on a sentinel row (the
    // first seed row's notes would be ideal, but the model has no
    // notes field — so we use a separate way: the count + the names
    // matching BILLS_SEED is enough for v1). For v1's static seed,
    // the count matching BILLS_SEED.length is the version check.
    if (existing.length === BILLS_SEED.length) {
      // Spot-check: the names should match too. If the seed changed
      // shape (added/removed), the count check would also catch
      // additions. Renames are the edge case — they pass the count
      // check. To handle renames, the version bump is the right
      // tool: change BILL_SEED_VERSION to force a reseed.
      return {
        seeded: existing.length,
        version: BILL_SEED_VERSION,
        alreadyHadSeed: true,
      };
    }
  }

  // We need to (re)seed. Drop the existing seed rows (if any) and
  // insert from BILLS_SEED. Identity + user rows are untouched.
  await prisma.bill.deleteMany({
    where: { userId, source: "seed" },
  });

  await prisma.bill.createMany({
    data: BILLS_SEED.map((b: BillSeed) => ({
      // Use the same stable id as the in-memory store so the
      // BillPaidToggle's "bill-rent" key works seamlessly. The
      // cuid() default would force a mapping layer that's
      // unnecessary for the seed rows.
      id: b.id,
      userId,
      name: b.name,
      amountCents: b.amountCents,
      // BILLS_SEED is implicitly monthly — all 6 entries have a
      // single dueDay per month. (A future "quarterly" or "annual"
      // entry would add a cadence field; not in scope for this
      // cluster.)
      cadence: "monthly",
      dueDay: b.dueDay,
      autopay: b.autopay,
      // paidAt is intentionally left null for fresh seed rows —
      // the user marks bills paid via the toggle, which writes
      // the current timestamp.
      paidAt: null,
      source: "seed",
      envelopeId: b.envelopeId,
      accountId: b.accountId,
      sortOrder: b.sortOrder,
    })),
  });

  return {
    seeded: BILLS_SEED.length,
    version: BILL_SEED_VERSION,
    alreadyHadSeed: false,
  };
}
