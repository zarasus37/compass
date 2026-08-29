/**
 * Cluster 6.0 — Vault scheduler indicator.
 *
 * The compact row that appears under the vault status strip when
 * the user has a VaultSchedule row. Shows:
 *   - Next auto-run (relative + absolute)
 *   - Last auto-run (relative + bills affected + status pill)
 *   - "Schedule" link button → /vault/schedule
 *
 * Renders nothing when no schedule row exists, so first-time
 * users don't see noise. The /vault/schedule page handles its
 * own empty state for the "set up your schedule" CTA.
 */

import * as React from "react";
import Link from "next/link";

import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/user";

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

function absoluteTime(d: Date): string {
  // Locale-agnostic 12-hour time so the smoke can match a regex.
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mm} ${ampm}`;
}

export async function SchedulerIndicator() {
  const user = await getCurrentUser();
  if (!user) return null;
  const schedule = await prisma.vaultSchedule.findUnique({
    where: { userId: user.id },
  });
  if (!schedule) return null;

  const now = new Date();
  const nextRel = schedule.nextRunAt ? relativeFromNow(schedule.nextRunAt, now) : "—";
  const nextAbs = schedule.nextRunAt ? absoluteTime(schedule.nextRunAt) : "";
  const lastRel = schedule.lastRunAt ? relativeFromNow(schedule.lastRunAt, now) : "never";
  const lastStatus = schedule.lastRunStatus ?? "—";
  const lastBills = schedule.lastRunBillsAffected;
  const isError = lastStatus === "ERROR";
  const isSkipped = lastStatus === "SKIPPED";
  const isPaused = !schedule.enabled;

  // Terminal-voice chip color, kept in sync with the rest of the
  // vault page's [OK] / [WARN] / [SIGIL] / [INDEXED] marker
  // convention. Cluster 7.0 re-skinned to vessel tokens.
  const statusColor = isError
    ? "var(--vessel-over)"
    : isSkipped
      ? "var(--vessel-watch)"
      : isPaused
        ? "var(--ink-3)"
        : "var(--ok)";

  const statusText = isError
    ? "ERROR"
    : isSkipped
      ? "SKIPPED"
      : isPaused
        ? "PAUSED"
        : lastStatus;

  return (
    <div
      data-testid="vault-scheduler-indicator"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
        padding: "10px 14px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderLeft: `3px solid ${statusColor}`,
        marginBottom: 24,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        color: "var(--ink-2)",
        letterSpacing: "0.10em",
      }}
    >
      <span style={{ color: statusColor, fontWeight: 700 }}>
        [{statusText}]
      </span>
      <span>
        NEXT AUTO-RUN: <strong style={{ color: "var(--ink)" }}>{nextRel}</strong>
        {nextAbs ? ` (${nextAbs})` : ""}
      </span>
      <span style={{ color: "var(--vessel-border)" }}>·</span>
      <span>
        LAST: <strong style={{ color: "var(--ink)" }}>{lastRel}</strong>
        {schedule.lastRunAt
          ? ` — ${lastBills} bill${lastBills === 1 ? "" : "s"} ${lastStatus === "SUCCESS" ? "settled" : lastStatus === "NO_BILLS" ? "due" : lastStatus.toLowerCase()}`
          : ""}
      </span>
      {isError && schedule.lastRunError ? (
        <span style={{ color: "var(--vessel-over)" }}>· {schedule.lastRunError}</span>
      ) : null}
      <span style={{ flex: 1 }} />
      <Link
        href="/vault/schedule"
        style={{
          color: "var(--vessel-accent)",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 10.5,
          letterSpacing: "0.18em",
        }}
      >
        [SCHEDULE] →
      </Link>
    </div>
  );
}
