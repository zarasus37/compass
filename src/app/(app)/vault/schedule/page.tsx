/**
 * /vault/schedule — Cluster 6.0.
 *
 * The auto bill-pay configuration page. Server-rendered shell
 * with two client islands:
 *   - <ScheduleForm /> — the cron + look-ahead + reserve-gate form
 *   - <RunHistoryTable /> — the last 20 audit-log entries
 *
 * The page itself reads the current schedule (or null) from the
 * DB and hands it to the form. The form talks to
 * POST /api/vault/schedule via fetch.
 */
import * as React from "react";

import { PageHead } from "@/components/alchemy/PageHead";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/user";
import { computeNextRun } from "@/lib/vault/scheduler";
import { ScheduleForm } from "./ScheduleForm";
import { RunHistoryTable } from "./RunHistoryTable";
import { RunNowButton } from "./RunNowButton";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  enabled: true,
  cronExpression: "0 9 * * *",
  timezone: "America/Chicago",
  lookAheadDays: 1,
  minReserveCents: 0,
};

export default async function VaultSchedulePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHead
          eyebrow="// ledger · vault"
          title="Scheduler"
          em="sign in first."
          explanation={<>You need to be signed in to configure the scheduler.</>}
        />
      </div>
    );
  }

  const [schedule, vault, auditRows] = await Promise.all([
    prisma.vaultSchedule.findUnique({ where: { userId: user.id } }),
    prisma.vaultAccount.findUnique({
      where: { userId: user.id },
      select: { settlementReserve: true, availableBalance: true },
    }),
    prisma.auditLog.findMany({
      where: { userId: user.id, actionType: "vault.scheduler_run" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Compute the live "next 3 fire times" preview for the cron
  // expression the user is editing. The form passes the current
  // cronExpression back to us, so this is a hint for the default
  // render too.
  const currentCron = schedule?.cronExpression ?? DEFAULTS.cronExpression;
  const currentTz = schedule?.timezone ?? DEFAULTS.timezone;
  const upcoming: string[] = [];
  try {
    let cursor = new Date();
    for (let i = 0; i < 3; i += 1) {
      const next = computeNextRun(currentCron, currentTz, cursor);
      if (!next) break;
      upcoming.push(next.toISOString());
      cursor = new Date(next.getTime() + 60_000);
    }
  } catch {
    // ignore
  }

  const runHistory = auditRows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      billId: typeof payload.billId === "string" ? payload.billId : null,
      skipped: payload.skipped === true,
      skipReason: typeof payload.reason === "string" ? payload.reason : null,
      error: typeof payload.error === "string" ? payload.error : null,
    };
  });

  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault · scheduler"
        title="Auto bill-pay"
        em="set it and let it run."
        accent="cyan"
        explanation={
          <>
            A cron that wakes the off-ramp gateway, finds every scheduled bill whose
            execution window is about to open, and runs the 7-condition <code>canExecute</code> gate
            on each. Bills that pass are routed through the same adapter chain as a manual
            "Execute now" click. The schedule runs in your local dev process now
            (<code>pnpm cron:dev</code>); the production Vercel cron route lands in Cluster 6.0.1.
          </>
        }
      />

      <SectionHeader
        eyebrow="// config"
        title="Schedule"
        em="when the scheduler should fire and what it should look at."
        accent="cyan"
      />

      <div data-testid="vault-schedule-form" style={{ marginBottom: 32 }}>
        <ScheduleForm
          initialSchedule={schedule}
          defaults={DEFAULTS}
          upcomingFireTimes={upcoming}
          vaultSettlementReserveCents={vault?.settlementReserve ?? 0}
          vaultAvailableBalanceCents={vault?.availableBalance ?? 0}
        />
      </div>

      <SectionHeader
        eyebrow="// status"
        title="Run state"
        em="what the scheduler is doing right now."
        accent="cyan"
      />

      <div
        data-testid="vault-schedule-status"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--vessel-border)",
          background: "var(--vessel-surface)",
          marginBottom: 32,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
        }}
      >
        <StatusCell
          label="next run"
          value={schedule?.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "—"}
          sub={schedule?.nextRunAt ? "computed from cron + timezone" : "save a schedule to compute"}
          tone="cyan"
        />
        <StatusCell
          label="last run"
          value={schedule?.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : "never"}
          sub={
            schedule?.lastRunAt
              ? `${schedule.lastRunBillsAffected} bill${schedule.lastRunBillsAffected === 1 ? "" : "s"} · ${schedule.lastRunStatus}`
              : "no runs yet"
          }
          tone={schedule?.lastRunStatus === "ERROR" ? "watch" : "ink"}
        />
        <StatusCell
          label="manual override"
          value="Run now"
          sub="bypass the cron, fire immediately"
          tone="ok"
          isLast
          action={<RunNowButton />}
        />
      </div>

      <SectionHeader
        eyebrow="// history"
        title="Last 20 runs"
        em="one row per audit log entry, newest first."
        accent="cyan"
      />

      <div data-testid="vault-schedule-history" style={{ marginBottom: 32 }}>
        <RunHistoryTable initialRuns={runHistory} />
      </div>
    </div>
  );
}

function StatusCell({
  label,
  value,
  sub,
  tone,
  isLast,
  action,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "watch" | "cyan" | "ink";
  isLast?: boolean;
  action?: React.ReactNode;
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "watch"
        ? "var(--vessel-watch)"
        : tone === "cyan"
          ? "var(--vessel-accent)"
          : "var(--ink)";
  return (
    <div
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
      <div style={{ color, fontWeight: 700, fontSize: 12 }}>{value}</div>
      <div style={{ color: "var(--ink-3)", fontSize: 10, marginTop: 4 }}>{sub}</div>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
