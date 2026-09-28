"use client";
/**
 * Route-level error boundary for every (app) page.
 *
 * Cluster 7.39 — when any page in the signed-in shell throws
 * (DB hiccup, malformed data, network blip), Next.js falls back to
 * this. Mom sees a calm card with retry + back-to-dashboard, not
 * a stack trace.
 *
 * The boundary receives the error + a reset() callback from Next.js.
 * `reset()` re-renders the segment (same as a soft refresh of the
 * route that errored).
 *
 * Cluster 7.52 — capture the throw site so we can pinpoint it from
 * this machine instead of needing Vercel logs. POSTs to
 * `/api/client-error` with `error.digest` + the URL + the user
 * ID + the stack. Same dedup logic as the table itself, so a single
 * broken session becomes one row, not 50.
 *
 * Cluster 7.39 also kept no console.error here — the upstream
 * Next.js handler already logs to dev server / Vercel logs, but
 * for prod we now ALSO write to our table. The dual-channel is
 * intentional: Next.js logs remain the operator's red-line
 * console; our table is the triage-friendly indexed view.
 */
import * as React from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Cluster 7.52 — capture the throw to /api/client-error. Runs
  // once per boundary fire (or once per dedup window on repeat
  // fires from the same throw, server-side). Side-effect-only;
  // the boundary renders normally even if the POST fails.
  React.useEffect(() => {
    const url =
      typeof window !== "undefined" ? window.location.href : "/";
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "/";
    const message = error?.message ? error.message.slice(0, 1024) : null;
    const stack = error?.stack ? error.stack.slice(0, 8192) : null;
    // Extract envelope ID from pathname when the throw happened
    // on `/envelopes/[id]`. Cheap regex — pattern is the route
    // itself. If the throw is elsewhere, we leave it null.
    const envelopeMatch = pathname.match(/^\/envelopes\/([^/?#]+)/);
    const envelopeId = envelopeMatch ? envelopeMatch[1] : null;
    const body = JSON.stringify({
      digest: error?.digest ?? null,
      message,
      stack,
      url,
      pathname,
      envelopeId,
      source: "client-error-boundary",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      viewportWidth:
        typeof window !== "undefined" ? window.innerWidth : null,
      viewportHeight:
        typeof window !== "undefined" ? window.innerHeight : null,
    });
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        signal: AbortSignal.timeout(4000),
      }).catch(() => {});
    } catch {
      // Capture never throws.
    }
    // `error.digest` is the natural dedup key; if Next.js
    // doesn't expose one, the URL + message do double duty. The
    // table's `(digest, url, source)` unique index handles the
    // happy case; the server-side `recordClientError` falls
    // back to a synthetic digest when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.digest]);

  // The error's `digest` is a server-side hash Next.js attaches for
  // production. Don't render the raw error message — it may include
  // stack-trace fragments or DB connection strings.
  const ref = error.digest ?? "unknown";
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        maxWidth: 560,
        margin: "64px auto",
        padding: 32,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--vessel-over)",
        borderRadius: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--vessel-over)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        [ERR] something broke
      </span>
      <h1
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "8px 0 12px",
        }}
      >
        We hit a snag on that page.
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-3)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        Your data is safe. Try the page again — if it keeps happening,
        back to the dashboard and try a different route. Reference{" "}
        <code
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--ink-2)",
          }}
        >
          {ref}
        </code>{" "}
        if you need to report it.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "12px 24px",
            background: "var(--vessel-accent)",
            color: "var(--background)",
            border: "none",
            borderRadius: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "12px 24px",
            background: "transparent",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}