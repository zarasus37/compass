/**
 * Client error capture — server-side helpers.
 *
 * Cluster 7.52 — the persistent [ERR] digest 3789288087 mom kept
 * seeing on /envelopes and /envelopes/[id] was being masked by
 * 7.43/7.44 defensive wraps without ever being pinpointed. Two
 * physical blockers prevented finding the actual throw:
 *
 *   1. Vercel production logs (which carry the file:line + stack
 *      + URL + user ID at the moment of the throw) are unreachable
 *      from this machine — the personal VERCEL_TOKEN doesn't have
 *      team-scope access to the sovereign-monad-ecosystem project.
 *
 *   2. `pnpm dev` times out on this Windows box (Turbopack
 *      subprocess issue), so a local repro path is closed.
 *
 * This module closes both blockers by writing client + server
 * capture events to a `ClientError` table in the project's own
 * Postgres. Anything that throws in the (app) shell — boundary
 * fires, window.onerror, unhandledrejection, safeSection catches —
 * ends up here.
 *
 * Operator view: `npx tsx scripts/show-client-errors.mjs` (no
 * Vercel logs needed).
 *
 * Dedup key is `(digest, url, source)` — Next.js prod digests are
 * deterministic per throw site, so a single broken session becomes
 * one row with an incremented counter, not 50 spam rows.
 */

import { prisma } from "@/server/db";

/**
 * Where the error came from. Drives dedup partitioning: same
 * `(digest, url)` from a boundary vs a window.onerror are kept
 * separate because they imply different throw sites in the
 * browser-vs-server boundary.
 *
 * Concurrency-safe on the dedup index: the
 * `recordClientError` helper uses Prisma's `upsert` to bump
 * `occurrences` + roll `lastSeenAt` forward atomically.
 */
export type ClientErrorSource =
  | "client-error-boundary"
  | "client-window-onerror"
  | "client-unhandledrejection"
  | "server-safe-section";

/**
 * Shape of a captured error event. Anything might be missing —
 * client JS errors cross-origin → no message; boundary fires →
 * no URL beyond pathname; server `safeSection` catches → no
 * userAgent/viewport.
 */
export type ClientErrorEvent = {
  userId?: string | null;
  digest?: string | null;
  message?: string | null;
  stack?: string | null;
  url: string;
  pathname: string;
  envelopeId?: string | null;
  source: ClientErrorSource;
  userAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  payloadJson?: Record<string, unknown>;
};

/**
 * Max length for captured stack/message strings — anything bigger
 * would bloat the table and isn't useful for triage. Next.js
 * stack traces for a typical page throw are ~2–4 KB; the cap
 * leaves headroom without inviting abuse.
 */
const MAX_STACK_BYTES = 8 * 1024;
const MAX_MESSAGE_BYTES = 2 * 1024;

/**
 * Persist an error event. Upsert on the dedup key:
 * `(digest, url, source)`. On match, increment `occurrences` and
 * roll `lastSeenAt` forward (so a spam error keeps signaling
 * "active right now"). On miss, insert a new row with
 * occurrences=1.
 *
 * Returns `null` when the event was a no-op (e.g. missing all
 * dedup fields). Never throws — the capture path itself is the
 * last thing we want crashing the page that already errored.
 */
export async function recordClientError(
  event: ClientErrorEvent,
): Promise<{ id: string; occurrences: number } | null> {
  try {
    // Normalize: clamp to byte limits, coerce nulls to undefined.
    const message = truncate(event.message ?? null, MAX_MESSAGE_BYTES);
    const stack = truncate(event.stack ?? null, MAX_STACK_BYTES);
    const payloadJson = JSON.stringify(event.payloadJson ?? {});
    const digest = event.digest ?? null;

    // Dedup requires at least a digest OR a URL — without
    // either, we have nothing stable to upsert on. In that case
    // we silently drop the event (the page already errored;
    // thrashing on the log channel makes things worse).
    const dedupDigest = digest ?? `nodigest:${event.source}`;
    const dedupUrl = event.url || `${event.pathname || "?"}#${event.source}`;

    const row = await prisma.clientError.upsert({
      where: {
        digest_url_source: {
          digest: dedupDigest,
          url: dedupUrl,
          source: event.source,
        },
      },
      create: {
        userId: event.userId ?? null,
        digest,
        message,
        stack,
        url: event.url || dedupUrl,
        pathname: event.pathname || "/",
        envelopeId: event.envelopeId ?? null,
        source: event.source,
        userAgent: event.userAgent ?? null,
        viewportWidth: event.viewportWidth ?? null,
        viewportHeight: event.viewportHeight ?? null,
        payloadJson,
        occurrences: 1,
      },
      update: {
        occurrences: { increment: 1 },
        lastSeenAt: new Date(),
        // Refresh user/stack if it was missing on the first hit
        // (e.g. client capture after a server-only first hit).
        userId: event.userId ?? undefined,
        message: message ?? undefined,
        stack: stack ?? undefined,
        userAgent: event.userAgent ?? undefined,
        viewportWidth: event.viewportWidth ?? undefined,
        viewportHeight: event.viewportHeight ?? undefined,
        payloadJson,
      },
    });

    return { id: row.id, occurrences: row.occurrences };
  } catch (err) {
    // Capture path must never throw. Log to stderr (Vercel picks
    // it up) so a future cluster can diagnose a broken
    // ClientError table without crashing the page that already
    // errored.
    // eslint-disable-next-line no-console
    console.error("[client-error] recordClientError failed:", err);
    return null;
  }
}

/**
 * Best-effort byte truncator. Returns null for null/undefined
 * input. Slices at the byte limit and appends `…` so the reader
 * knows it was cut. UTF-8 safe — measures bytes, not chars.
 */
function truncate(s: string | null | undefined, maxBytes: number): string | null {
  if (s == null) return null;
  // `Buffer.byteLength` is the UTF-8 truth — `.length` lies for
  // emoji + non-Latin scripts.
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return s;
  // Slice to (maxBytes - 1) bytes, then append `…` (3 bytes).
  // `Buffer.from(s, "utf8")` converts the codepoints; slice is
  // by byte; then back to string with the slice flag so we
  // don't half-codepoint.
  const sliced = Buffer.from(s, "utf8").subarray(0, maxBytes - 3).toString("utf8");
  return sliced + "…";
}

/**
 * Extract the pathname from a URL. Falls back to the URL itself
 * when the URL fails to parse (e.g. we got handed a path-only
 * string from somewhere unexpected). Used as the dedup grouping
 * key for "same throw on the same page" detection.
 */
export function pathnameFromUrl(url: string): string {
  try {
    // URL constructor throws on malformed input — treat as
    // fallback rather than letting the capture path itself error.
    return new URL(url, "http://placeholder.local").pathname;
  } catch {
    return url;
  }
}
