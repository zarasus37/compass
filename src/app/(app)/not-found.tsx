/**
 * Route-level not-found UI for every (app) page.
 *
 * Cluster 7.39 — Next.js renders this segment when a page calls
 * `notFound()` or when the URL doesn't match any route. Mom sees a
 * calm 404 with a back-to-dashboard CTA, not the generic Next.js
 * "404 — This page could not be found" page.
 */
import Link from "next/link";

export default function AppNotFound() {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "64px auto",
        padding: 32,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--vessel-watch)",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--vessel-watch)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        [404] not found
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
        That page doesn&apos;t exist.
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
        The link may be stale, or the page may have moved. Head back
        to the dashboard — everything lives there.
      </p>
      <Link
        href="/"
        style={{
          padding: "12px 24px",
          background: "var(--vessel-accent)",
          color: "var(--background)",
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
  );
}