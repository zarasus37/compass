/**
 * Debt seed migration.
 *
 * `/debts` read from the in-memory `DEBTS_SEED` via `liveDebts()`, which
 * means debt state lived in `globalThis.__COMPASS_STORE__` inside the
 * dev-server process: it rendered correctly, and it was gone on restart.
 * The "+ Add debt" form wrote into the same store, so a debt the user
 * entered vanished on refresh. After this module the `Debt` table is
 * the durable source of truth and both the read and the write paths go
 * through Prisma.
 *
 * Copied from `seed-bills.ts` deliberately. Every other entity in this
 * repo was migrated the same way — one seed file per production table —
 * and inventing a new pattern here is how the two silent gaps below
 * would have crept back in:
 *
 *  1. `creditLimitCents` must be carried across. The canonical in-memory
 *     `Debt` type had it, `DebtCard` consumed it, and `toDisplayDebt`
 *     forgot to copy it — which silently made `utilizationPct` null for
 *     every debt and meant Clusters 7.48/7.49 never rendered for anyone.
 *  2. `aprBps` is BASIS POINTS. 24.99% is 2499. The form converts at the
 *     boundary; nothing here may re-derive it as a float percent.
 *
 * Idempotent by count, like the bills seeder: a user who already has
 * `DEBTS_SEED.length` seed rows is a no-op. Bump `DEBT_SEED_VERSION`
 * when the canonical set changes.
 */

import "server-only";
import { prisma } from "@/server/db";
import { DEBTS_SEED, type DebtSeed } from "./mock-seed";
import { seededId } from "./seed-ids";

/** Bump when DEBTS_SEED changes shape. */
const DEBT_SEED_VERSION = 1;

/**
 * Ensure the user has the canonical DEBTS_SEED rows in the production
 * `Debt` table, each marked `source = "seed"`.
 *
 * Returns the count of seed rows the user has after the call, plus
 * whether they were already there — the shape `ensureUserBillsSeeded`
 * returns, so smoke checks can assert the migration actually ran.
 */
export async function ensureUserDebtsSeeded(
  userId: string,
): Promise<{ seeded: number; version: number; alreadyHadSeed: boolean }> {
  const existing = await prisma.debt.findMany({
    where: { userId, source: "seed" },
    select: { id: true },
  });

  if (existing.length === DEBTS_SEED.length) {
    return {
      seeded: existing.length,
      version: DEBT_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // (Re)seed. User-entered rows (source="user") are never touched.
  await prisma.debt.deleteMany({ where: { userId, source: "seed" } });

  await prisma.debt.createMany({
    data: DEBTS_SEED.map((d: DebtSeed) => ({
      // Namespaced, exactly like bills. A bare `debt-discover` would be a
      // global primary key and the second user could never hold the
      // seeded set.
      id: seededId(userId, d.id),
      userId,
      name: d.name,
      balanceCents: d.balanceCents,
      originalBalanceCents: d.originalBalanceCents,
      // Copied verbatim. Never re-derived as a percent.
      aprBps: d.aprBps,
      minPaymentCents: d.minPaymentCents,
      dueDay: d.dueDay,
      // Same namespacing as the row ids so the debt resolves against
      // this user's account, which is what `accountsByDebtId` on
      // /debts is built from.
      accountId: d.accountId ? seededId(userId, d.accountId) : null,
      // The whole point of the Cluster 7.48/7.49 fix. Loans leave this
      // null and DebtCard falls back to the paid-down bar.
      creditLimitCents: d.creditLimitCents ?? null,
      source: "seed",
      isArchived: d.isArchived,
      sortOrder: d.sortOrder,
    })),
  });

  return {
    seeded: DEBTS_SEED.length,
    version: DEBT_SEED_VERSION,
    alreadyHadSeed: false,
  };
}
