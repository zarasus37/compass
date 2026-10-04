/**
 * POST /api/cron/audit-log-prune — Cluster 7.8.1 cron endpoint.
 *
 * Production contract (Vercel cron):
 *   - Vercel sends a POST on a schedule (e.g. nightly at 03:00)
 *     with an `Authorization: Bearer <CRON_SECRET>` header.
 *   - The endpoint calls `pruneAuditLogForAllUsers` and returns
 *     a JSON summary: { ok, usersProcessed, totalRolledUp,
 *     totalDeleted, totalRollupRows, results }.
 *   - Each user's prune is wrapped in try/catch (see
 *     `pruneAuditLogForAllUsers`) so a single user's failure
 *     does NOT abort the whole batch.
 *
 * Dev usage (scripts/cron-audit-prune-dev.mjs):
 *   - The dev process hits this same endpoint on a configurable
 *     poll (default 24h, override via `AUDIT_LOG_PRUNE_POLL_MS`).
 *     In dev we typically override to 5-30s for fast feedback.
 *   - With COMPASS_SANDBOX=1 and no CRON_SECRET the auth check is
 *     skipped — the endpoint is local-only by virtue of the
 *     process being on the dev machine. On Vercel this route now
 *     fails CLOSED (503) instead of running unprotected.
 *
 * 401 when CRON_SECRET is set and the bearer is wrong.
 * 503 when CRON_SECRET is unset in production.
 * 405 for any non-POST / non-GET method.
 */
import { NextResponse } from "next/server";
import { rejectUnlessCronAuthorized } from "@/lib/cron-auth";
import { pruneAuditLogForAllUsers } from "@/lib/vault/audit-log-cron";
import { getRetentionDays } from "@/lib/vault/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = rejectUnlessCronAuthorized(req);
  if (denied) return denied;
  const result = await pruneAuditLogForAllUsers();
  return NextResponse.json(result);
}

// GET is useful for ops debugging. Returns the same shape
// POST would (it actually runs the prune). The smoke uses
// GET to verify the route is wired without mutating state;
// in dev a follow-up POST is the real test.
export async function GET(req: Request) {
  // Reuse the POST handler (same auth, same work). Next.js
  // routes can't call each other directly; just delegate via
  // a thin wrapper.
  return POST(req);
}
