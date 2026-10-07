/**
 * Shared bearer-token auth for /api/cron/* routes.
 *
 * - Fails CLOSED in production: if CRON_SECRET is unset the route refuses to
 *   run (these routes move money and prune audit data for every user).
 * - Only a local developer machine / CI sandbox may run without a secret.
 * - Compares SHA-256 digests with timingSafeEqual (constant time, and
 *   independent of the secret's length).
 *
 * Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when a
 * CRON_SECRET env var is set on the project.
 *
 * Cluster: Health endpoint hardening (2026-10-07).
 * The hand-rolled `Bearer ${secret}` template comparison moved into
 * `@/lib/http/bearer-auth`, which parses the header per RFC 6750 first.
 * The *security* semantics are unchanged — still constant-time, still
 * fail-closed — but the comparison now happens on the parsed credential
 * rather than on the raw header string. Two behavioural notes:
 *
 *  1. `Bearer  <token>` (two spaces) is now ACCEPTED. RFC 7235 §2.1
 *     specifies `1*SP` between scheme and credentials, so extra spaces
 *     are legal and were previously a silent 401.
 *  2. The credential must match token68. If an operator sets a
 *     CRON_SECRET containing a character outside that set, Vercel's own
 *     client would send it verbatim and we would reject it. We surface
 *     that as a 401 with a specific reason rather than failing silently.
 */
import { NextResponse } from "next/server";
import { isSandbox } from "@/lib/env/sandbox";
import { parseBearerHeader, safeEquals } from "@/lib/http/bearer-auth";

/** Returns a Response to send back if the request is NOT authorized, else null. */
export function rejectUnlessCronAuthorized(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    const lenient = process.env.NODE_ENV !== "production" || isSandbox();
    if (lenient) return null;
    console.error(
      "[cron] CRON_SECRET is not set; refusing to run cron route.",
    );
    return NextResponse.json(
      { ok: false, error: "cron not configured" },
      { status: 503 },
    );
  }

  const parsed = parseBearerHeader(req.headers.get("authorization"));
  if (!parsed.ok) {
    // The reason is structural (scheme missing, token malformed), not a
    // statement about the secret, so logging it is safe.
    console.error(`[cron] Authorization rejected: ${parsed.reason}`);
    return NextResponse.json(
      { ok: false, error: "unauthorized", reason: parsed.reason },
      { status: 401 },
    );
  }

  if (!safeEquals(parsed.credentials, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
