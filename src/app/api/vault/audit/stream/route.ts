/**
 * GET /api/vault/audit/stream — Server-Sent Events for the audit
 * log (Cluster 7.6).
 *
 * Opens a `text/event-stream` response, subscribes to the audit
 * event bus (`src/lib/vault/audit-bus.ts`), and forwards each new
 * `AuditLog` row that belongs to the current user. The
 * `/vault/audit` page and the `/vault/bills/[id]/history` page
 * both subscribe via the `useAuditStream` client hook.
 *
 * **Auth**: session cookie required. The middleware already
 * redirects unauthenticated requests away from `/api/vault/*` —
 * but we re-check here so a direct fetch (or a future route
 * protection change) still returns 401, not 200 with no data.
 *
 * **Query**:
 *   - `?billId=<id>` — when set, only events whose payload
 *     mentions the bill (via `payload.billId` or
 *     `payload.billsCredited`) are forwarded. Used by the bill
 *     history page.
 *
 * **Wire format**:
 *   - First event: `id: connected\ndata: {"ok":true}\n\n`
 *   - Each new row: `id: <rowId>\ndata: <JSON AuditLogRow>\n\n`
 *   - Heartbeat every 15s: `: heartbeat\n\n` (SSE comment)
 *
 * **Cleanup**: on `request.signal.aborted`, the bus listener is
 * removed and the heartbeat timer is cleared. Without this,
 * disconnected clients would leak listeners and pin the bus
 * reference (and eventually the process) in memory.
 *
 * **Single-server assumption**: the bus is an in-process
 * EventEmitter. A multi-server deploy would need to swap the bus
 * for Postgres LISTEN/NOTIFY; this file stays the same.
 */
import { getCurrentUser } from "@/server/auth/user";
import {
  subscribeAuditEvents,
  type AuditBusEvent,
} from "@/lib/vault/audit-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Heartbeat interval. 15s keeps proxies (nginx, Vercel) from
// dropping the connection without flooding the wire. The smoke
// can override this in test mode via the X-Compass-Test-Heartbeat
// header (parsed below).
const DEFAULT_HEARTBEAT_MS = 15_000;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const billId = url.searchParams.get("billId")?.trim() || null;

  // Allow the smoke to shorten the heartbeat for fast tests. Off
  // by default. The header is consumed only when explicitly set;
  // production callers can't influence it.
  const headerHeartbeat = req.headers.get("x-compass-test-heartbeat-ms");
  const heartbeatMs = headerHeartbeat
    ? Math.max(100, Number.parseInt(headerHeartbeat, 10) || DEFAULT_HEARTBEAT_MS)
    : DEFAULT_HEARTBEAT_MS;

  // SSE response. We use a TransformStream so we can `enqueue`
  // events from the bus listener without buffering, and so the
  // `request.signal` abort path is just `controller.close()`.
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Initial hello. Browsers expect to see something within
      // ~3s of opening the connection or EventSource will
      // surface an error event.
      controller.enqueue(
        encoder.encode(`id: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`),
      );

      // Subscribe. The listener forwards each event filtered to
      // the current user (and the bill, if a billId is set).
      unsubscribe = subscribeAuditEvents((e: AuditBusEvent) => {
        if (e.userId !== user.id) return;
        if (billId && !payloadMentionsBill(e.payload, billId)) return;
        const data = JSON.stringify({
          id: e.id,
          actionType: e.actionType,
          payload: e.payload,
          aiTierAtTime: e.aiTierAtTime,
          createdAtIso: e.createdAtIso,
        });
        try {
          controller.enqueue(encoder.encode(`id: ${e.id}\ndata: ${data}\n\n`));
        } catch {
          // Controller is closed (client disconnected). The
          // abort handler below will clean up the listener;
          // nothing more to do here.
        }
      });

      // Heartbeat. SSE comments (lines starting with `:`) are
      // ignored by the client but keep the TCP connection warm.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Same as above.
        }
      }, heartbeatMs);

      // Client-side disconnect. The browser closes the
      // EventSource on navigation; the runtime sets the abort
      // signal. We remove the listener + clear the heartbeat
      // so the bus doesn't pin a reference to a dead handler.
      req.signal.addEventListener("abort", () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    cancel() {
      // The stream was cancelled (typically because the client
      // disconnected before the abort handler ran). Same cleanup.
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable nginx response buffering (defensive — Vercel
      // doesn't buffer, but a self-hosted reverse proxy might).
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Mirror of `payloadMentionsBillId` from `audit-log.ts`. Kept
 * local so the route handler doesn't pull in the audit-log
 * module's full surface. Returns true when the payload's JSON
 * carries the given billId — either as `payload.billId` (most
 * event types) or inside the `payload.billsCredited` array
 * (`vault.yield_routed`).
 */
function payloadMentionsBill(
  p: Record<string, unknown>,
  billId: string,
): boolean {
  if (typeof p.billId === "string" && p.billId === billId) return true;
  if (Array.isArray(p.billsCredited)) {
    for (const id of p.billsCredited) {
      if (typeof id === "string" && id === billId) return true;
    }
  }
  return false;
}
