/**
 * Per-user namespacing for seeded primary keys.
 *
 * The canonical seed dataset in `mock-seed.ts` is one fixed set of
 * primary keys (`env-rent`, `bill-rent`, `acct-chase`, `goal-emergency`,
 * `plan-default`, …). Every seeder used to write those ids verbatim, so
 * the seeded baseline could only ever exist for ONE user in the
 * database — the second user's insert died on the primary key, and any
 * seeder that *did* run for a second user clobbered the first user's
 * rows. `POST /api/reset-seed` calls every seeder, so it could only
 * succeed while exactly one user existed.
 *
 * `seededId` derives the stored id from the userId, deterministically.
 * That determinism is the whole point: `seedState()` in `store.ts` and
 * each Prisma seeder call the SAME function with the SAME (userId,
 * canonicalId) pair, so the cross-references between accounts,
 * envelopes, goals, bills and allocation rules line up on their own —
 * no remap table, no cross-seeder coordination.
 *
 * The in-memory store must use these ids too. Several places join
 * in-memory rows to DB rows by id (e.g. `setBillPaidDb` mirrors a DB
 * write back into `s.bills`, `/period` matches transaction
 * `envelopeId` against DB envelope ids), so the two layers have to
 * agree on the spelling of a seeded id.
 */

/**
 * The primary key a seeded row is stored under for `userId`.
 *
 * Example: `seededId("u_123", "env-rent")` → `"env-rent--u_123"`.
 */
export function seededId(userId: string, canonicalId: string): string {
  return `${canonicalId}--${userId}`;
}

/**
 * True when `valueId` is the row that `queryId` refers to.
 *
 * Accepts either spelling — the canonical seed id (`"env-rent"`) or
 * the namespaced one (`"env-rent--u_123"`). The advisor's
 * `queryTransactions` tool is the reason this exists: its schema and
 * system prompt talk to the model in canonical ids, while the rows it
 * filters carry namespaced ones. Matching both keeps either form
 * working instead of silently returning zero rows.
 */
export function isSeededIdMatch(
  userId: string,
  queryId: string,
  valueId: string | null,
): boolean {
  if (valueId === null) return false;
  return valueId === queryId || valueId === seededId(userId, queryId);
}
