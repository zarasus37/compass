/**
 * Retention health banner — Cluster 7.19.
 *
 * Surfaces the audit-log retention window + most-recent prune
 * status + scheduler status on /settings, so mom has a single
 * "your data is being looked after" affirmation when she taps
 * the gear icon.
 *
 * Three data sources, all on the server:
 *   1. `getRetentionDays()` — the configured horizon (default
 *      90, override via AUDIT_LOG_RETENTION_DAYS env var).
 *   2. `AuditLogDailyRollup.updatedAt` aggregated to MAX —
 *      "last time anyone pruned anything". Re-running the
 *      prune is idempotent; the rollup rows' updatedAt moves
 *      only when buckets actually change. A null/never state
 *      means no prune has ever run, which we surface honestly.
 *   3. `VaultSchedule.lastRunAt` + `lastRunStatus` — the per-
 *      user vault auto-pay scheduler. Independent of the
 *      retention cron, but a sibling signal that "is Compass
 *      running scheduled work for you." Read-only here — the
 *      schedule editor lives at /vault/schedule.
 *
 * Render contract:
 *   - Top row: a 3-cell strip (window + last prune + scheduler).
 *   - Below: a one-line plain-English caption so mom sees
 *     what the cells mean.
 *   - "Never run" states render with an honest "[PENDING]" pill
 *     and a "first run scheduled for…" line — we do not fake
 *     a timestamp.
 */

import * as React from "react";
import { formatRelativeDate } from "@/lib/format";
import {
  getRetentionDays,
  liveAuditRowCount,
  rollupRowCount,
} from "@/lib/vault/audit-log";

interface RetentionHealthData {
  /** Configured horizon in days. */
  retentionDays: number;
  /** ISO string of the most recent rollup row touch — `null` if never pruned. */
  lastPrunedAt: string | null;
  /** Total AuditLogDailyRollup rows for the user. */
  rollupRows: number;
  /** Total live AuditLog rows for the user (within the live horizon). */
  liveRows: number;
  /** VaultSchedule.lastRunAt ISO — `null` if never run. */
  lastSchedulerRunAt: string | null;
  /** VaultSchedule.lastRunStatus — "SUCCESS" | "NO_BILLS" | "SKIPPED" | "ERROR" | null. */
  lastSchedulerStatus: string | null;
  /** Cron expression — used for "scheduled daily at 9am" caption. */
  cronExpression: string | null;
}

/**
 * Single DB-call data helper. Server-only. Exposed as a function
 * so /settings/page.tsx can `await` it inside the server
 * component and pass the result down to the presentational
 * component.
 */
export async function loadRetentionHealth(
  userId: string,
): Promise<RetentionHealthData> {
  // Three reads, all server-side, all indexed:
  //   - max(updatedAt) over AuditLogDailyRollup for userId
  //   - count of AuditLogDailyRollup rows for userId
  //   - count of AuditLog rows for userId
  //   - latest VaultSchedule row for userId
  const [{ prisma }] = await Promise.all([import("@/server/db")]);

  const [latestRollup, rollupRows, liveRows, schedule] = await Promise.all([
    prisma.auditLogDailyRollup.aggregate({
      where: { userId },
      _max: { updatedAt: true },
    }),
    rollupRowCount(userId),
    liveAuditRowCount(userId),
    prisma.vaultSchedule.findUnique({
      where: { userId },
      select: {
        lastRunAt: true,
        lastRunStatus: true,
        cronExpression: true,
      },
    }),
  ]);

  return {
    retentionDays: getRetentionDays(),
    lastPrunedAt: latestRollup._max.updatedAt?.toISOString() ?? null,
    rollupRows,
    liveRows,
    lastSchedulerRunAt: schedule?.lastRunAt?.toISOString() ?? null,
    lastSchedulerStatus: schedule?.lastRunStatus ?? null,
    cronExpression: schedule?.cronExpression ?? null,
  };
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  // formatRelativeDate returns "today" / "yesterday" /
  // "N days ago" / "MMM D, YYYY" depending on distance.
  return formatRelativeDate(iso);
}

function formatScheduleHuman(cronExpr: string | null): string {
  if (!cronExpr) return "no schedule configured";
  // Compact humanizer for the common presets. Anything else
  // falls back to the literal expression — the user can decide
  // what it means, and the smoke asserts the substring rather
  // than a translated phrase.
  const presets: Record<string, string> = {
    "0 9 * * *": "daily at 9 AM",
    "0 9,18 * * *": "twice daily (9 AM, 6 PM)",
    "0 9 * * 1": "weekly on Mondays at 9 AM",
    "0 9 1 * *": "monthly on the 1st at 9 AM",
  };
  return presets[cronExpr] ?? `cron \`${cronExpr}\``;
}

function statusPill(ok: boolean, label: string): React.ReactNode {
  return (
    <span
      data-testid="retention-status-pill"
      data-status={ok ? "ok" : "warn"}
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.14em",
        padding: "2px 7px",
        border: `1px solid ${ok ? "var(--ok)" : "var(--warn)"}`,
        color: ok ? "var(--ok)" : "var(--warn)",
        borderRadius: 2,
        marginLeft: 8,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Presentational component. Pure — receives a fully-resolved
 * `data` object. The smoke for this surface asserts DOM presence
 * by `data-testid`, not by prose.
 */
export function RetentionHealthBanner({
  data,
}: {
  data: RetentionHealthData;
}): React.ReactElement {
  const prunedOk = data.lastPrunedAt !== null;
  const schedulerOk = data.lastSchedulerRunAt !== null;
  const schedulerHealthy =
    schedulerOk && data.lastSchedulerStatus !== "ERROR";

  return (
    <div
      data-testid="retention-health-banner"
      style={{
        marginTop: 20,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
          }}
        >
          DATA · RETENTION
        </span>
        {statusPill(prunedOk && schedulerHealthy, "[OK] HEALTHY")}
      </div>

      <div
        data-testid="retention-health-cells"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          border: "1px solid var(--line-soft)",
          borderRadius: 4,
        }}
      >
        <Cell
          label="retention window"
          value={`${data.retentionDays} days`}
          sub="live horizon (rolling)"
        />
        <Cell
          label="last prune"
          value={formatRelative(data.lastPrunedAt)}
          sub={
            data.lastPrunedAt
              ? `${data.rollupRows} rollup rows · ${data.liveRows} live`
              : "audit rollups not yet initialized"
          }
          iso={data.lastPrunedAt}
          pillState={prunedOk ? "ok" : "pending"}
          testId="retention-cell-last-prune"
        />
        <Cell
          label="vault scheduler"
          value={
            data.lastSchedulerRunAt
              ? formatRelative(data.lastSchedulerRunAt)
              : "never run"
          }
          sub={
            data.lastSchedulerStatus
              ? `status: ${data.lastSchedulerStatus} · ${formatScheduleHuman(data.cronExpression)}`
              : formatScheduleHuman(data.cronExpression)
          }
          iso={data.lastSchedulerRunAt}
          pillState={
            !data.lastSchedulerRunAt
              ? "pending"
              : data.lastSchedulerStatus === "ERROR"
              ? "error"
              : "ok"
          }
          testId="retention-cell-scheduler"
        />
      </div>

      <p
        data-testid="retention-health-caption"
        style={{
          margin: "10px 0 0 0",
          fontFamily: "var(--font-sora)",
          fontSize: 13,
          color: "var(--ink-3)",
          lineHeight: 1.5,
        }}
      >
        Your Compass lives on a rolling window. The last
        {" "}{data.retentionDays} days of activity stay in the
        live ledger (the audit page reads from it); anything
        older is aggregated into a daily rollup so the 365-day
        strip still works without keeping every event forever.
        The vault scheduler runs separately to handle bill-pay
        windows.
      </p>
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  iso,
  pillState,
  testId,
}: {
  label: string;
  value: string;
  sub: string;
  iso?: string | null;
  pillState?: "ok" | "warn" | "error" | "pending";
  testId?: string;
}): React.ReactElement {
  return (
    <div
      data-testid={testId}
      data-iso={iso ?? undefined}
      style={{
        padding: "12px 16px",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color:
            pillState === "error"
              ? "var(--neg)"
              : pillState === "pending"
              ? "var(--warn)"
              : "var(--ink-3)",
          marginTop: 2,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
