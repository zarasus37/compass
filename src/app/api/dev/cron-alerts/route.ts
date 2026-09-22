/**
 * Dev-only test endpoint for the cron alert surface (Cluster 7.10).
 *
 * The smoke uses this to:
 *   1. POST a fake alert (auth-gated, user-scoped) — the
 *      server writes a `vault.cron_prune_failure` audit row
 *      and (if `CRON_ALERT_WEBHOOK_URL` is set) fires the
 *      webhook. The smoke verifies the audit row was written
 *      via the GET endpoint.
 *   2. GET recent alerts for the user — the smoke reads back
 *      what it just wrote.
 *
 * The endpoint is gated by `process.env.NODE_ENV === "development"`
 * (same pattern as `/api/dev/audit-log-prune` and
 * `/api/dev/audit-log-write`). The companion smoke
 * (`tests/smoke-cron-alerts.mjs`) is the only intended consumer.
 *
 * Request:
 *   POST { error: string, context?: object } — writes an alert
 *   GET ?limit=<n> (default 20) — returns recent alerts for the user
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import {
  recordCronAlert,
  getRecentCronAlerts,
} from "@/lib/vault/audit-log-alerts";

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
    error?: unknown;
    context?: unknown;
  };
  const error = typeof body.error === "string" ? body.error : "smoke test alert";
  const context =
    body.context && typeof body.context === "object" && !Array.isArray(body.context)
      ? (body.context as Record<string, unknown>)
      : {};
  await recordCronAlert({
    userId: user.id,
    kind: "prune_failure",
    error,
    context,
  });
  return NextResponse.json({ ok: true, error });
}

export async function GET(req: NextRequest) {
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
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(100, Number(limitRaw) || 20)) : 20;
  const alerts = await getRecentCronAlerts(user.id, limit);
  return NextResponse.json({ ok: true, count: alerts.length, alerts });
}
