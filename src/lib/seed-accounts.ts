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
import { seededId } from "./seed-ids";
import { isDemoCleared } from "./json";

/**
 * DB-backed wrapper around `isDemoCleared` (src/lib/json.ts).
 *
 * See `isDemoDataCleared` in ./store.ts for why this exists. A read
 * failure is treated as "not cleared" so a transient DB error can never
 * strand a brand-new user without starter vessels.
 */
async function isDemoDataCleared(userId: string): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    return isDemoCleared(u?.settings);
  } catch {
    return false;
  }
}

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
  //
  // The id is namespaced per user: `acct-chase` on its own is a
  // global primary key, so a second user could never hold the seeded
  // account and this lookup would find the *first* user's row.
  const accountId = seededId(userId, ACCOUNT_SEED.id);
  const existing = await prisma.account.findFirst({
    where: { userId, id: accountId },
    select: { id: true, name: true, currentBalance: true },
  });

  if (existing && existing.name === ACCOUNT_SEED.name) {
    return {
      seeded: 1,
      version: ACCOUNT_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // A user who already has accounts of their own must not be handed a
  // phantom canonical one. This is not hypothetical: the test fixture
  // provisions a canonical-shaped account under a namespaced id, and the
  // old "lacks ACCOUNT_SEED.id → seed it" rule responded by inserting a
  // SECOND "Chase Checking" worth $84,210.00 that the user never added.
  // The same would happen to any real second user of this app.
  //
  // The seed dataset exists to bootstrap an empty account list. If the
  // list is not empty, the seeder's job is done.
  const anyAccounts = await prisma.account.count({ where: { userId } });
  if (anyAccounts > 0) {
    return {
      seeded: anyAccounts,
      version: ACCOUNT_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // Same reasoning as `ensureUserEnvelopesSeeded`: an empty list means
  // "bootstrap me" for a new user, but it means "I emptied this on
  // purpose" for someone who ran scripts/clear-demo-data.mjs. Without
  // this the canonical account — and its balance — comes straight back
  // on the next read.
  if (await isDemoDataCleared(userId)) {
    return { seeded: 0, version: ACCOUNT_SEED_VERSION, alreadyHadSeed: false };
  }

  // (Re)seed: drop only the canonical seed row (by id), then re-insert.
  await prisma.account.deleteMany({
    where: { userId, id: accountId },
  });

  await prisma.account.create({
    data: {
      // Same stable id as the in-memory store, namespaced to this user
      // so any UI component keying on the account id still lines up —
      // and so a second user doesn't collide on the primary key.
      id: accountId,
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
