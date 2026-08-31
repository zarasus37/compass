/**
 * Compass Vault — audit log retention bulk helper (Cluster 7.8.1).
 *
 * The nightly cron entry point. Iterates every user and calls
 * `pruneAuditLog(userId, ...)` for each. Used by:
 *   - `POST /api/cron/audit-log-prune` (the cron endpoint, both
 *      dev and prod)
 *   - the dev scheduler (`scripts/cron-audit-prune-dev.mjs`)
 *   - the smoke (`tests/smoke-cron-audit-log-prune.mjs`)
 *
 * Each user's prune is wrapped in try/catch so one user's
 * failure does NOT abort the whole batch. The result for each
 * user is recorded individually so the operator can see which
 * users succeeded / failed.
 *
 * Why a bulk helper instead of calling the endpoint in a loop:
 * 1. One DB round-trip for the user list (vs N).
 * 2. Easier to test the bulk path directly.
 * 3. The endpoint can still add auth/observability around the
 *    bulk call without duplicating the loop.
 */
import "server-only";
import { prisma } from "@/server/db";
import { pruneAuditLog, getRetentionDays } from "./audit-log";

export type BulkPruneResult = {
  ok: boolean;
  usersProcessed: number;
  usersFailed: number;
  totalRolledUp: number;
  totalDeleted: number;
  totalRollupRows: number;
  /** Per-user breakdown. Each entry is one user's prune outcome. */
  results: Array<{
    userId: string;
    status: "PRUNED" | "NOOP" | "ERROR";
    rolledUp: number;
    deleted: number;
    rollupRows: number;
    error?: string;
  }>;
  retentionDays: number;
  now: string;
};

/**
 * Run `pruneAuditLog` for every user in the system. Returns a
 * summary suitable for the cron endpoint's JSON response and
 * the dev scheduler's stdout log.
 *
 * The user list is `prisma.user.findMany({ select: { id: true } })`
 * — no ordering, no filter. A user with no audit log rows still
 * gets a `NOOP` entry so the count is honest.
 *
 * Per-user `try/catch` isolates failures. A user whose prune
 * throws gets `{ status: "ERROR", error: <message> }`; the
 * remaining users are processed normally. The endpoint reports
 * `usersFailed` so the operator can spot problems.
 */
export async function pruneAuditLogForAllUsers(opts?: {
  /** Pinned "now" for the prune cutoff. Default = new Date(). */
  now?: Date;
  /** Per-user retention override. Default = getRetentionDays(). */
  retentionDays?: number;
}): Promise<BulkPruneResult> {
  const now = opts?.now ?? new Date();
  const retentionDays = opts?.retentionDays ?? getRetentionDays();

  const users = await prisma.user.findMany({ select: { id: true } });
  const results: BulkPruneResult["results"] = [];
  let totalRolledUp = 0;
  let totalDeleted = 0;
  let totalRollupRows = 0;
  let usersFailed = 0;

  for (const u of users) {
    try {
      const r = await pruneAuditLog(u.id, { now, retentionDays });
      if (r.rolledUp === 0 && r.deleted === 0) {
        results.push({
          userId: u.id,
          status: "NOOP",
          rolledUp: 0,
          deleted: 0,
          rollupRows: 0,
        });
      } else {
        results.push({
          userId: u.id,
          status: "PRUNED",
          rolledUp: r.rolledUp,
          deleted: r.deleted,
          rollupRows: r.rollupRows,
        });
      }
      totalRolledUp += r.rolledUp;
      totalDeleted += r.deleted;
      totalRollupRows += r.rollupRows;
    } catch (err) {
      usersFailed += 1;
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        userId: u.id,
        status: "ERROR",
        rolledUp: 0,
        deleted: 0,
        rollupRows: 0,
        error: message,
      });
    }
  }

  return {
    ok: usersFailed === 0,
    usersProcessed: results.length,
    usersFailed,
    totalRolledUp,
    totalDeleted,
    totalRollupRows,
    results,
    retentionDays,
    now: now.toISOString(),
  };
}
