import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/user";
import {
  recordClientError,
  pathnameFromUrl,
  type ClientErrorSource,
} from "@/lib/client-error";

/**
 * Client error capture — POST endpoint.
 *
 * Cluster 7.52 — receives error events from:
 *   - `(app)/error.tsx` on boundary fires
 *   - `<ClientErrorCapture>` on `window.onerror`
 *   - `<ClientErrorCapture>` on `window.unhandledrejection`
 *
 * All call paths share this single endpoint so the dedup logic
 * stays in one place. The server-side `safeSection` callers write
 * DIRECTLY to the table via `recordClientError` (no client
 * round-trip needed) — this endpoint is only for browser-side
 * captures.
 *
 * Auth — accepts events from anonymous callers too. The
 * boundary can fire before auth resolves (e.g. login page);
 * the client capture runs in the browser, where the session
 * cookie may not be present yet. We attach `userId` if the
 * session is valid; otherwise store NULL. This lets the
 * operator view sort auth issues separately.
 *
 * Validation — the body comes from a browser so it could be
 * anything. Zod schema with sensible bounds. The capture path
 * must never break the page that already errored, so we
 * swallow all errors.
 *
 * Dedup key: `(digest, url, source)` — see `recordClientError`.
 */

export const dynamic = "force-dynamic";
// Never cache error reports.
export const revalidate = 0;

// Validate the body. Zod schema rejects unknown sources and
// clamps string lengths — the capture path has its own clamp
// but defense-in-depth at the API boundary keeps malformed
// payloads out of the table.
const sourceSchema = z.enum([
  "client-error-boundary",
  "client-window-onerror",
  "client-unhandledrejection",
]);

const bodySchema = z.object({
  digest: z.string().max(64).nullable().optional(),
  message: z.string().max(2048).nullable().optional(),
  stack: z.string().max(8192).nullable().optional(),
  url: z.string().max(2048),
  pathname: z.string().max(1024).optional(),
  envelopeId: z.string().max(64).nullable().optional(),
  source: sourceSchema,
  userAgent: z.string().max(512).nullable().optional(),
  viewportWidth: z.number().int().min(0).max(8192).nullable().optional(),
  viewportHeight: z.number().int().min(0).max(8192).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  // Resolve auth (best-effort). Don't 401 — auth failures
  // during a throw are themselves the kind of bug we want
  // to capture.
  const user = await getCurrentUser();

  // Parse JSON body. If parsing fails we still want to log a
  // stub event so the operator knows the client capture path
  // itself is broken.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (err) {
    // Body parse failure — can't do anything meaningful, just
    // 400. The capture path must still not throw upward.
    // eslint-disable-next-line no-console
    console.error("[client-error] POST body parse failed:", err);
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const pathname = body.pathname ?? pathnameFromUrl(body.url);

  const result = await recordClientError({
    userId: user?.id ?? null,
    digest: body.digest ?? null,
    message: body.message ?? null,
    stack: body.stack ?? null,
    url: body.url,
    pathname,
    envelopeId: body.envelopeId ?? null,
    source: body.source as ClientErrorSource,
    userAgent: body.userAgent ?? getRequestUserAgent(request),
    viewportWidth: body.viewportWidth ?? null,
    viewportHeight: body.viewportHeight ?? null,
    payloadJson: body.payload ?? {},
  });

  // 204 even on no-op dedup misses — `recordClientError` only
  // returns null when it had to drop the event (e.g. malformed
  // payload). Clients can read the body for diagnostics but
  // nothing depends on it.
  if (!result) {
    return NextResponse.json({ ok: false, dropped: true }, { status: 204 });
  }
  return NextResponse.json(
    {
      ok: true,
      id: result.id,
      occurrences: result.occurrences,
    },
    { status: 200 },
  );
}

/**
 * Fall back to the User-Agent header when the client didn't
 * pass one — useful for the rare case where the capture runs
 * before `navigator.userAgent` is reachable (SSR boundary
 * fires, very early bootstrap error).
 */
function getRequestUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}
