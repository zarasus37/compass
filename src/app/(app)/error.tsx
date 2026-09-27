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
 * No console.error — the upstream Next.js handler already logs to
 * the dev server / Vercel logs. Re-empting would double-log.
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