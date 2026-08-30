/**
 * AuditHeadlineStrip — the 4-cell summary at the top of /vault/audit.
 *
 * Mirrors the PolicySummaryCard pattern (vessel-surface bg, vessel-
 * border, mono caps labels, vessel-accent values, ink-3 sub). The
 * cells carry a **growth-oriented suggestion** per xKryptic User
 * Memory 2026-08-24: a clickable chip that turns the descriptive
 * number into an actionable entry into the data.
 *
 * Server component (no "use client"). The page passes the
 * pre-computed summary; this component is a pure render.
 */
import * as React from "react";
import Link from "next/link";
import type { AuditLogSummary } from "@/lib/vault/audit-log";

export function AuditHeadlineStrip({
  summary,
  prefixFilter,
}: {
  summary: AuditLogSummary;
  /** A current prefix filter (if any) — used to build the
   *  suggestion links that ADD a filter without dropping one. */
  prefixFilter?: string;
}) {
  const total = summary.totalEvents;
  const weekCount = summary.eventsThisWeek;
  const failed = summary.failedThisWeek;
  const last = summary.lastActivityAt ? new Date(summary.lastActivityAt) : null;
  const since = summary.firstEventAt ? new Date(summary.firstEventAt) : null;
  const top = summary.mostActiveType;
  const topLink = top
    ? prefixFilter
      ? `?type=${encodeURIComponent(top.actionType)}&prefix=${encodeURIComponent(prefixFilter)}`
      : `?type=${encodeURIComponent(top.actionType)}`
    : null;
  const failureLink = failed > 0
    ? "?q=failed&type=vault.payment_failed"
    : "?q=failed";
  const lastLink = last
    ? `?take=200${prefixFilter ? `&prefix=${encodeURIComponent(prefixFilter)}` : ""}`
    : null;

  return (
    <div
      data-testid="vault-audit-headline"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 0,
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <AuditCell
        label="total events"
        value={total.toLocaleString("en-US")}
        sub={since ? `// since ${formatShortDate(since)}` : "// no events yet"}
        tone="cyan"
      />
      <AuditCell
        label="this week"
        value={weekCount.toLocaleString("en-US")}
        sub={
          weekCount === 0
            ? "// quiet — 0 in last 7d"
            : failed > 0
              ? `[WARN] ${failed} failed · last 7d`
              : "[OK] no failures · last 7d"
        }
        tone={failed > 0 ? "watch" : weekCount > 0 ? "ok" : "ink"}
        href={failed > 0 ? failureLink : undefined}
        hrefLabel={failed > 0 ? "[VIEW FAILURES →]" : undefined}
      />
      <AuditCell
        label="most active type"
        value={top ? top.actionType : "—"}
        sub={top ? `// ${top.count.toLocaleString("en-US")} events` : "// no data"}
        tone="cyan"
        href={topLink ?? undefined}
        hrefLabel={top ? "[FILTER →]" : undefined}
      />
      <AuditCell
        label="last activity"
        value={
          last
            ? relativeFromNow(last, new Date())
            : "—"
        }
        sub={
          last
            ? `// ${summary.last24hCount} in last 24h`
            : "// no events yet"
        }
        tone={summary.quiet7d ? "watch" : "ink"}
        isLast
        href={lastLink ?? undefined}
        hrefLabel={last ? "[VIEW LATEST →]" : undefined}
      />
    </div>
  );
}

function AuditCell({
  label,
  value,
  sub,
  tone,
  isLast,
  href,
  hrefLabel,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "watch" | "neg" | "cyan" | "ink";
  isLast?: boolean;
  href?: string;
  hrefLabel?: string;
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "watch"
        ? "var(--vessel-watch)"
        : tone === "neg"
          ? "var(--vessel-over)"
          : tone === "cyan"
            ? "var(--vessel-accent)"
            : "var(--ink)";
  return (
    <div
      data-testid={`vault-audit-cell-${label.replace(/\s+/g, "-")}`}
      style={{
        padding: "16px 18px",
        borderRight: isLast ? "none" : "1px solid var(--vessel-border)",
        color: "var(--ink-2)",
        letterSpacing: "0.10em",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        // {label}
      </div>
      <div
        style={{
          color,
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "var(--font-sora)",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--ink-3)",
          fontSize: 10,
          marginTop: 6,
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {sub}
      </div>
      {href && hrefLabel ? (
        <div style={{ marginTop: 10 }}>
          <Link
            href={href}
            data-testid={`vault-audit-cell-${label.replace(/\s+/g, "-")}-link`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vessel-accent)",
              textDecoration: "none",
            }}
          >
            {hrefLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeFromNow(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return past ? "just now" : "in <1m";
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}
