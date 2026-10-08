/**
 * Automatic paycheck allocation.
 *
 * The manual card on the dashboard exists so the flow can be seen and
 * tested. This is the trigger the design actually calls for (00-DESIGN.md
 * D12): when a paycheck arrives, the armed plan runs — no confirm modal,
 * no friction, and the user sees the post-hoc summary.
 *
 * WHY IT NEEDED A PERSISTED LEDGER FIRST
 * --------------------------------------
 * "A paycheck arrived" is a Transaction. Until transactions were durable,
 * that fact lived in a process-local store and evaporated on restart, so
 * there was nothing durable to react to. That is why the transaction
 * migration had to land before this could.
 *
 * WHY A CRON, NOT A PAGE LOAD
 * ---------------------------
 * Mirror of `lib/vault/scheduler.ts` + `/api/cron/vault`. Allocation
 * MOVES MONEY. It must not depend on the user happening to open a page,
 * and it must not fire twice because two tabs mounted.
 *
 * IDEMPOTENCY IS INHERITED, NOT RE-DERIVED
 * -----------------------------------------
 * `applyPaycheck` already refuses a duplicate paycheck via
 * `PaycheckRun`'s unique `[userId, periodKey, paycheckCents]`. So this
 * scheduler does NOT need its own "have I fired?" flag to be safe — a
 * cron that runs twice, or a cron plus a manual click, both land on the
 * same guard. `runPaycheckForUser` still checks first so it can report
 * "already ran" cleanly instead of relying on a caught constraint.
 */

import "server-only";
import { prisma } from "@/server/db";
import { applyPaycheck } from "@/lib/apply-paycheck";
import { getCurrentPayPeriod } from "@/lib/mock";
import { addCalendarDaysKeepingTime } from "@/lib/dates";

const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  semi_monthly: 15,
  monthly: 30,
};
const DEFAULT_PERIOD_DAYS = 14;

function daysFor(cadence: string): number {
  return CADENCE_DAYS[cadence] ?? DEFAULT_PERIOD_DAYS;
}

/**
 * The pay date inside the given period, derived from the schedule's
 * anchor.
 *
 * Walks forward from `startDate` one cadence at a time until it reaches
 * or passes the period start. Bounded at 400 steps (≈10 years) so a
 * schedule anchored decades ago cannot spin.
 */
export function payDateInPeriod(
  scheduleStart: Date,
  cadence: string,
  periodStart: Date,
): Date | null {
  const days = daysFor(cadence);
  let d = new Date(scheduleStart.getTime());
  for (let i = 0; i < 400; i++) {
    if (d.getTime() >= periodStart.getTime()) return d;
    // Calendar days, not a fixed 24h offset: this loop accumulates, so an
    // instant offset drifts an hour every time a step crosses a DST
    // transition and never recovers. Measured over 222 realistic
    // start/cadence combinations in US/Central, 111 returned a pay date
    // 1 hour late — and the caller gates real allocation on
    // `payDate > now`, so a late pay date is a late paycheck.
    d = addCalendarDaysKeepingTime(d, days);
  }
  return null;
}

export interface AutoPaycheckResult {
  userId: string;
  status: "applied" | "already_applied" | "not_due" | "no_schedule" | "plan_not_armed" | "error";
  paycheckCents?: number;
  payDate?: string;
  periodKey?: string;
  error?: string;
}

/**
 * Fire the armed plan for one user if their paycheck for the current
 * period has arrived and has not already been applied.
 */
export async function runPaycheckForUser(
  userId: string,
  now: Date = new Date(),
): Promise<AutoPaycheckResult> {
  const schedule = await prisma.paySchedule.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { cadence: true, amount: true, accountId: true, startDate: true },
  });
  if (!schedule) return { userId, status: "no_schedule" };

  if (schedule.amount <= 0) {
    return { userId, status: "error", error: "PaySchedule has a non-positive amount." };
  }

  const period = await getCurrentPayPeriod(userId);
  const periodKey = period.startDate.toISOString().slice(0, 10);
  const payDate = payDateInPeriod(schedule.startDate, schedule.cadence, period.startDate);

  if (!payDate) {
    return { userId, status: "error", error: "could not derive a pay date for this period" };
  }

  // Not due yet. The pay date is the first pay day at or after the
  // period START, so a paycheck that lands on day 3 of the period has
  // NOT arrived until the third — this check must not fire early.
  if (payDate.getTime() > now.getTime()) {
    return {
      userId,
      status: "not_due",
      payDate: payDate.toISOString().slice(0, 10),
      periodKey,
    };
  }

  // Cheap pre-check purely so the response reads cleanly. The database
  // constraint remains the real guard.
  const already = await prisma.paycheckRun.findUnique({
    where: {
      userId_periodKey_paycheckCents: {
        userId,
        periodKey,
        paycheckCents: schedule.amount,
      },
    },
    select: { id: true },
  });
  if (already) {
    return {
      userId,
      status: "already_applied",
      paycheckCents: schedule.amount,
      payDate: payDate.toISOString().slice(0, 10),
      periodKey,
    };
  }

  const result = await applyPaycheck({
    userId,
    paycheckCents: schedule.amount,
    source: "payday (automatic)",
    trigger: "automatic",
    accountId: schedule.accountId,
    now,
  });

  if (!result.ok) {
    return {
      userId,
      status: result.planArmed === false ? "plan_not_armed" : "error",
      paycheckCents: schedule.amount,
      payDate: payDate.toISOString().slice(0, 10),
      periodKey,
      error: result.reason,
    };
  }

  return {
    userId,
    status: result.skipped ? "already_applied" : "applied",
    paycheckCents: schedule.amount,
    payDate: payDate.toISOString().slice(0, 10),
    periodKey,
  };
}

/** Sweep every user with an active pay schedule. Called by the cron route. */
export async function runAutoPaychecks(now: Date = new Date()) {
  const users = await prisma.paySchedule.findMany({
    where: { isActive: true },
    select: { userId: true },
    orderBy: { userId: "asc" },
  });

  const seen = new Set<string>();
  const results: AutoPaycheckResult[] = [];
  for (const u of users) {
    if (seen.has(u.userId)) continue;
    seen.add(u.userId);
    try {
      results.push(await runPaycheckForUser(u.userId, now));
    } catch (err) {
      results.push({
        userId: u.userId,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
