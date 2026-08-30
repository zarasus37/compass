/**
 * BillSummaryStrip — Cluster 7.5.
 *
 * The 4-cell headline strip for /vault/bills/[id]/history.
 * Per the xKryptic 2026-08-24 directive ("headline numbers
 * need growth-oriented suggestions"), every cell has a
 * clickable suggestion chip that drives the user toward the
 * next useful action.
 *
 *   total events      — count + // since <date of first>
 *                       chip: [OPEN EVENT →] (deep-links to the
 *                       first event in the table — the page
 *                       always renders newest first, so the
 *                       "first" is the last row).
 *   current state     — userLabel(status) + tone color block +
 *                       chip: [TIMELINE →] (anchor to the
 *                       timeline section)
 *   most active type  — top actionType + count + chip:
 *                       [FILTER →] (deep-links to ?type=<type>)
 *   last activity     — relative time + sub:
 *                       // n events / last 7d
 *
 * Server component. The chips are <Link> elements; no JS.
 */
import * as React from "react";
import Link from "next/link";
import type { BillAuditSummary, BillHistoryFilter } from "@/lib/vault/audit-log";
import { tone, userLabel } from "@/lib/vault/state-machine";
import type { ScheduledBill } from "@/lib/vault/types";

const TONE_TO_COLOR: Record<"ok" | "warn" | "cyan" | "ink", string> = {
  ok: "var(--ok)",
  warn: "var(--vessel-watch)",
  cyan: "var(--vessel-accent)",
  ink: "var(--ink-2)",
};

export function BillSummaryStrip({
  bill,
  summary,
  filter,
}: {
  bill: ScheduledBill;
  summary: BillAuditSummary;
  filter: BillHistoryFilter;
}) {
  const t = tone(bill.status);
  const color = TONE_TO_COLOR[t];
  const hasData = summary.totalEvents > 0;
  return (
    <div
      data-testid="vault-bill-summary-strip"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 0,
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <Cell
        testId="vault-bill-history-cell-total-events"
        label="total events"
        value={hasData ? String(summary.totalEvents) : "—"}
        sub={
          summary.firstEventAt
            ? `// since ${formatShortDate(summary.firstEventAt)}`
            : "// no events yet"
        }
        tone="cyan"
        chip={
          hasData ? (
            <a
              href="#vault-bill-history-events"
              data-testid="vault-bill-history-cell-total-events-link"
              style={chipStyle("var(--vessel-accent)")}
            >
              [OPEN EVENT →]
            </a>
          ) : null
        }
      />
      <Cell
        testId="vault-bill-history-cell-current-state"
        label="current state"
        value={userLabel(bill.status)}
        sub={`// ${bill.status}`}
        tone={t}
        accent={color}
        chip={
          <a
            href="#vault-bill-history-timeline"
            data-testid="vault-bill-history-cell-current-state-link"
            style={chipStyle("var(--vessel-accent)")}
          >
            [TIMELINE →]
          </a>
        }
      />
      <Cell
        testId="vault-bill-history-cell-most-active-type"
        label="most active type"
        value={summary.mostActiveType?.actionType ?? "—"}
        sub={
          summary.mostActiveType
            ? `// ${summary.mostActiveType.count} event${
                summary.mostActiveType.count === 1 ? "" : "s"
              }`
            : "// no activity"
        }
        tone="ink"
        chip={
          summary.mostActiveType ? (
            <Link
              href={`?type=${encodeURIComponent(summary.mostActiveType.actionType)}`}
              data-testid="vault-bill-history-cell-most-active-type-link"
              style={chipStyle("var(--vessel-accent)")}
            >
              [FILTER →]
            </Link>
          ) : null
        }
      />
      <Cell
        testId="vault-bill-history-cell-last-activity"
        label="last activity"
        value={
          summary.lastActivityAt
            ? formatShortDate(summary.lastActivityAt)
            : "—"
        }
        sub={
          summary.eventsThisWeek > 0
            ? `// ${summary.eventsThisWeek} event${
                summary.eventsThisWeek === 1 ? "" : "s"
              } / last 7d`
            : "// quiet"
        }
        tone="ink"
        isLast
      />
    </div>
  );
}

function Cell({
  testId,
  label,
  value,
  sub,
  tone,
  accent,
  chip,
  isLast,
}: {
  testId: string;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "cyan" | "ink";
  accent?: string;
  chip?: React.ReactNode;
  isLast?: boolean;
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--vessel-watch)"
        : tone === "cyan"
          ? "var(--vessel-accent)"
          : "var(--ink-1)";
  return (
    <div
      data-testid={testId}
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
          color: accent ?? color,
          fontWeight: 700,
          fontSize: 13,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--ink-3)",
          fontSize: 10,
          marginTop: 4,
        }}
      >
        {sub}
      </div>
      {chip ? <div style={{ marginTop: 8 }}>{chip}</div> : null}
    </div>
  );
}

function chipStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 8px",
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color,
    border: `1px solid ${color}`,
    borderRadius: 2,
    textDecoration: "none",
  };
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
