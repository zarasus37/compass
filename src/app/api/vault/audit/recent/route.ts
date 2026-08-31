/**
 * GET /api/vault/audit/recent — Latest N audit rows for the current user.
 *
 * Cluster 7.11.1 — added to support the LiveActivityTicker's
 * reconcile-on-reconnect. When the SSE connection drops and
 * reconnects, `EventSource` does NOT replay missed events (the
 * audit log is append-only, not a ring buffer). The ticker
 * hits this endpoint on the reconnect → live transition to
 * backfill any rows that arrived during the disconnect window.
 *
 * **Auth**: session cookie required. Mirrors the auth pattern
 * from `/api/vault/audit/stream`.
 *
 * **Query**:
 *   - `?take=N` — number of rows. Default 3, clamped to [1, 50].
 *     The ticker passes 3 (its TICKER_LIMIT); the route accepts
 *     a wider range so other surfaces can reuse it.
 *
 * **Response**:
 *   - `{ ok: true, rows: AuditLogRow[] }` on success
 *   - `401` when the user is not signed in
 *
 * **Why not just hit `/api/vault/audit/stream`?**: the stream
 * is a long-lived SSE connection; this route is a one-shot
 * JSON read for the client's reconcile fetch. Same data layer
 * (`getAuditLog` in `audit-log.ts`), different shape.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/user";
import { getAuditLog } from "@/lib/vault/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TAKE = 3;
const MAX_TAKE = 50;
const MIN_TAKE = 1;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const takeParam = req.nextUrl.searchParams.get("take");
  let take = DEFAULT_TAKE;
  if (takeParam) {
    const n = Number.parseInt(takeParam, 10);
    if (Number.isFinite(n)) {
      take = Math.max(MIN_TAKE, Math.min(MAX_TAKE, n));
    }
  }

  const rows = await getAuditLog(user.id, { take });
  return NextResponse.json({ ok: true, rows });
}
