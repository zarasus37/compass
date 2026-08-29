/**
 * Compass Vault — schedule summary card (Cluster 7.0).
 *
 * The compact schedule status block on the `/vault/preferences`
 * page. Mirrors the `SchedulerIndicator` on the main vault page
 * but rendered as a discrete section in its own right, with
 * the link to `/vault/schedule` and a clearer "configured vs
 * not configured" presentation.
 *
 * Server component (no "use client"). Reads from props.
 */

import * as React from "react";
import Link from "next/link";

export function ScheduleSummaryCard({
  scheduleExists,
  enabled,
  cronExpression,
  timezone,
  nextRunAt,
  lastRunAt,
  lastRunStatus,
  lastRunBillsAffected,
}: {
  scheduleExists: boolean;
  enabled: boolean;
  cronExpression: string | null;
  timezone: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunBillsAffected: number;
}) {
  if (!scheduleExists) {
    return (
      <div
        data-testid="vault-schedule-summary-empty"
        style={{
          padding: "20px 24px",
          border: "1px solid var(--vessel-border)",
          background: "var(--vessel-surface)",
          borderRadius: 2,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 8,
          }}
        >
          // schedule
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            color: "var(--ink)",
            marginBottom: 12,
          }}
        >
          No auto bill-pay schedule yet.
        </div>
        <Link
          href="/vault/schedule"
          data-testid="vault-schedule-summary-configure"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--vessel-accent)",
            textDecoration: "none",
            border: "1px solid var(--vessel-accent)",
            padding: "8px 14px",
            display: "inline-block",
            borderRadius: 2,
          }}
        >
          [CONFIGURE] →
        </Link>
      </div>
    );
  }

  const isError = lastRunStatus === "ERROR";
  const isSkipped = lastRunStatus === "SKIPPED";
  const isPaused = !enabled;

  const statusTone = isError
    ? "neg"
    : isSkipped
      ? "watch"
      : isPaused
        ? "ink"
        : "ok";
  const statusText = isError
    ? "ERROR"
    : isSkipped
      ? "SKIPPED"
      : isPaused
        ? "PAUSED"
        : (lastRunStatus ?? "—");

  const nextRel = nextRunAt
    ? relativeFromNow(new Date(nextRunAt), new Date())
    : "—";
  const nextAbs = nextRunAt
    ? new Date(nextRunAt).toLocaleString()
    : "save a schedule to compute";
  const lastRel = lastRunAt
    ? relativeFromNow(new Date(lastRunAt), new Date())
    : "never";

  return (
    <div
      data-testid="vault-schedule-summary"
      style={{
        padding: "20px 24px",
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        borderRadius: 2,
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          // schedule
        </div>
        <div
          data-testid="vault-schedule-summary-status"
          style={{
            display: "inline-block",
            padding: "2px 7px",
            border: `1px solid ${
              statusTone === "ok"
                ? "var(--ok)"
                : statusTone === "watch"
                  ? "var(--vessel-watch)"
                  : statusTone === "neg"
                    ? "var(--vessel-over)"
                    : "var(--ink-3)"
            }`,
            color:
              statusTone === "ok"
                ? "var(--ok)"
                : statusTone === "watch"
                  ? "var(--vessel-watch)"
                  : statusTone === "neg"
                    ? "var(--vessel-over)"
                    : "var(--ink-3)",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            borderRadius: 2,
          }}
        >
          [{statusText}]
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <SummaryField
          label="cron"
          value={cronExpression ?? "—"}
          sub={timezone ?? "—"}
        />
        <SummaryField
          label="next run"
          value={nextRel}
          sub={nextAbs}
        />
        <SummaryField
          label="last run"
          value={lastRel}
          sub={
            lastRunAt
              ? `${lastRunBillsAffected} bill${lastRunBillsAffected === 1 ? "" : "s"} · ${(lastRunStatus ?? "—").toLowerCase()}`
              : "no runs yet"
          }
        />
      </div>
      <Link
        href="/vault/schedule"
        data-testid="vault-schedule-summary-edit"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--vessel-accent)",
          textDecoration: "none",
        }}
      >
        [SCHEDULE] →
      </Link>
    </div>
  );
}

function SummaryField({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 6,
          letterSpacing: "0.10em",
        }}
      >
        // {label}
      </div>
      <div
        style={{
          color: "var(--ink)",
          fontSize: 13,
          fontFamily: "var(--font-sora)",
          fontWeight: 600,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--ink-3)",
          fontSize: 10,
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
    </div>
  );
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
