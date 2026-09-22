/**
 * Dev-only test endpoint for the audit log retention smoke
 * (Cluster 7.8).
 *
 * Calls `pruneAuditLog(userId, options)` for the current user
 * and returns the counts. The smoke uses small `retentionDays`
 * values (e.g. 0 or 7) to exercise the rollup path in seconds
 * rather than days — the production horizon is 90 days.
 *
 * The route is gated by `process.env.NODE_ENV === "development"`
 * so a production build cannot accidentally expose it. The
 * companion smoke (`tests/smoke-audit-log-retention.mjs`) is
 * the only intended consumer.
 *
 * Request: POST {
 *   retentionDays?: number,   // default = getRetentionDays()
 *   now?: string,             // ISO date string for the pinned now
 * }
 * Response: { ok: true, retentionDays, rolledUp, deleted, rollupRows }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { pruneAuditLog } from "@/lib/vault/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.COMPASS_SANDBOX !== "1"
  ) {
    return NextResponse.json(
      { ok: false, error: "dev only" },
      { status: 403 },
    );
  }
  const user = await requireUser("/login");
  const body = (await req.json().catch(() => ({}))) as {
    retentionDays?: unknown;
    now?: unknown;
  };
  const opts: { retentionDays?: number; now?: Date } = {};
  if (typeof body.retentionDays === "number" && Number.isFinite(body.retentionDays)) {
    opts.retentionDays = Math.max(0, Math.floor(body.retentionDays));
  }
  if (typeof body.now === "string") {
    const d = new Date(body.now);
    if (!Number.isNaN(d.getTime())) opts.now = d;
  }
  const result = await pruneAuditLog(user.id, opts);
  return NextResponse.json({ ok: true, ...result });
}
