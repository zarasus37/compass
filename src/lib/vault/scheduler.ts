/**
 * Compass Vault — auto bill-pay scheduler (Cluster 6.0).
 *
 * The engine that powers /vault/schedule. Given a user's
 * `VaultSchedule` (cron + look-ahead + reserve gate) and a
 * current time, it finds eligible `ScheduledBill` rows and calls
 * `executePayment` on each through the off-ramp gateway.
 *
 * The off-ramp gateway (`./gateway.ts`) is unchanged — the
 * scheduler is a thin orchestrator on top of it. Every bill that
 * the scheduler executes goes through the same 7-condition
 * `canExecute` gate as a manual "Execute now" click.
 *
 * Three entry points:
 *   1. `computeNextRun(cronExpression, timezone, from)` — pure,
 *      returns the next Date the cron fires, or null if the
 *      expression is invalid.
 *   2. `runSchedulerForUser(userId, now)` — called by the dev
 *      scheduler process and (in production) the Vercel cron
 *      endpoint. Returns `{ status, billsAffected, error? }`.
 *   3. `processEligibleBills(userId, now, ...)` — the inner
 *      "find + execute" loop. Exposed separately so the smoke
 *      can test it without going through the cron gate.
 *
 * Idempotency: each call to `executePayment` passes a fresh
 * idempotency key (the `executionIdempotencyKey` in `server.ts`).
 * Re-running the scheduler for the same user at the same instant
 * is safe — the unique constraint on `(providerName,
 * idempotencyKey)` keeps PaymentAttempt rows from doubling.
 */

import "server-only";

import { CronExpressionParser } from "cron-parser";

import { prisma } from "@/server/db";
import { canExecute, eventFromResult, OffRampGateway } from "./gateway";
import {
  executionIdempotencyKey,
  toScheduledBillLocal,
  toVaultAccountLocal,
} from "./server";
import { transitionBillDb } from "./db";

// ─── Public types ──────────────────────────────────────────────────

export type ScheduleRunStatus = "SUCCESS" | "NO_BILLS" | "SKIPPED" | "ERROR";

export type RunSchedulerResult = {
  status: ScheduleRunStatus;
  billsAffected: number;
  error?: string;
  nextRunAt?: Date | null;
};

// ─── Pure helpers (testable without DB) ────────────────────────────

/**
 * Compute the next time the cron expression fires after `from`,
 * in the given IANA timezone. Returns null if the expression is
 * invalid (the API layer surfaces this as a 400).
 *
 * We use `cron-parser` (the `CronExpressionParser.parse(...)` API)
 * and override the `tz` field on the iterator's options.
 */
export function computeNextRun(
  cronExpression: string,
  timezone: string,
  from: Date = new Date(),
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate: from,
      tz: timezone,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/**
 * Find the `ScheduledBill` rows that the scheduler considers
 * eligible for execution at `now`, given the look-ahead window.
 *
 * Eligibility = status in {FUNDED, EARNING} AND the bill's
 * execution window covers [now, now + lookAheadDays]. The
 * 7-condition `canExecute` gate runs in `processEligibleBills`
 * after this query — this function does the cheap, indexable
 * part of the filter.
 */
export async function findEligibleBillsForUser(
  userId: string,
  now: Date,
  lookAheadDays: number,
) {
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId },
    select: { id: true, status: true, settlementReserve: true },
  });
  if (!vault) return [];

  const horizon = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000);

  return prisma.scheduledBill.findMany({
    where: {
      vaultId: vault.id,
      status: { in: ["FUNDED", "EARNING"] },
      executionWindowStart: { lte: horizon },
      executionWindowEnd: { gte: now },
    },
    orderBy: { dueDate: "asc" },
  });
}

// ─── The orchestrator ──────────────────────────────────────────────

/**
 * Run the scheduler for a single user. Called by the dev
 * scheduler process and (eventually) the production cron route.
 *
 * Behavior:
 *   - No schedule row → no-op (returns SKIPPED). Users opt in
 *     by visiting /vault/schedule and saving one.
 *   - Schedule disabled → SKIPPED.
 *   - `nextRunAt` is in the future → SKIPPED (we already fired
 *     this cron tick).
 *   - Otherwise → call `processEligibleBills` and `recordScheduleRun`.
 */
export async function runSchedulerForUser(
  userId: string,
  now: Date = new Date(),
): Promise<RunSchedulerResult> {
  const schedule = await prisma.vaultSchedule.findUnique({
    where: { userId },
  });

  if (!schedule) {
    return { status: "SKIPPED", billsAffected: 0, error: "no schedule" };
  }

  if (!schedule.enabled) {
    return { status: "SKIPPED", billsAffected: 0, error: "disabled" };
  }

  if (schedule.nextRunAt && schedule.nextRunAt.getTime() > now.getTime()) {
    return { status: "SKIPPED", billsAffected: 0, error: "not yet due" };
  }

  try {
    const { billsAffected, error } = await processEligibleBills(
      userId,
      now,
      schedule.lookAheadDays,
      schedule.minReserveCents,
    );

    // NO_BILLS is a successful run that did nothing (no eligible
    // bills in the window). Distinguishes it from SKIPPED so the
    // UI can show "Schedule ran — no bills were due" rather than
    // "Schedule was skipped".
    const status: ScheduleRunStatus =
      billsAffected > 0 ? "SUCCESS" : "NO_BILLS";

    const nextRunAt = computeNextRun(
      schedule.cronExpression,
      schedule.timezone,
      now,
    );

    await recordScheduleRun(userId, {
      status,
      billsAffected,
      error: error ?? null,
      nextRunAt,
    });

    // Top-level audit row for the run summary. Per-bill rows are
    // written inside processEligibleBills (skipped / errored
    // bills). This row is what the /vault/schedule run history
    // table reads.
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: "vault.scheduler_run",
        payload: JSON.stringify({
          scope: "scheduler",
          status,
          billsAffected,
          error: error ?? null,
        }),
      },
    });

    return { status, billsAffected, error, nextRunAt };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const nextRunAt = computeNextRun(
      schedule.cronExpression,
      schedule.timezone,
      now,
    );
    await recordScheduleRun(userId, {
      status: "ERROR",
      billsAffected: 0,
      error,
      nextRunAt,
    });
    // Top-level audit row for the run (the per-bill rows are
    // written inside processEligibleBills).
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: "vault.scheduler_run",
        payload: JSON.stringify({ error, scope: "scheduler" }),
      },
    });
    return { status: "ERROR", billsAffected: 0, error, nextRunAt };
  }
}

/**
 * The inner "find eligible + execute" loop. Exposed separately
 * so the smoke can test the bill-level logic without going
 * through the cron gate.
 *
 * Returns the count of bills that successfully transitioned.
 * Bills that fail `canExecute` are counted as "skipped" but
 * not as "affected" (the UI distinction).
 */
export async function processEligibleBills(
  userId: string,
  now: Date,
  lookAheadDays: number,
  minReserveCents: number,
): Promise<{ billsAffected: number; error?: string }> {
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId },
  });
  if (!vault) return { billsAffected: 0, error: "no vault" };

  if (minReserveCents > 0 && vault.settlementReserve < minReserveCents) {
    return {
      billsAffected: 0,
      error: `reserve short: need ${minReserveCents}, have ${vault.settlementReserve}`,
    };
  }

  const bills = await findEligibleBillsForUser(userId, now, lookAheadDays);
  if (bills.length === 0) return { billsAffected: 0 };

  const gateway = OffRampGateway.buildDefault(userId);
  let affected = 0;

  for (const bill of bills) {
    // Re-fetch the vault so each iteration sees the freshest
    // settlement reserve (a previous bill's execution may have
    // drained it).
    const freshVaultRow =
      (await prisma.vaultAccount.findUnique({ where: { userId } })) ?? vault;
    const freshVault = toVaultAccountLocal(freshVaultRow);

    const gatewayBill = toScheduledBillLocal(bill);

    const gate = await canExecute(gatewayBill, freshVault, now);
    if (!gate.ok) {
      // Write a debug-level audit row so the run history shows
      // why each bill was skipped, but don't count it as affected.
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: "vault.scheduler_run",
          payload: JSON.stringify({
            billId: bill.id,
            skipped: true,
            reason: gate.reason,
          }),
        },
      });
      continue;
    }

    // Drive the state machine: BEGIN_SETTLEMENT → EXECUTE → gateway →
    // CONFIRM_SETTLED. Same flow as executeBillPaymentAction but
    // without the requireUser() gate (we're in cron, not a UI click).
    const begin = await transitionBillDb(userId, bill.id, {
      type: "BEGIN_SETTLEMENT",
    });
    if (!begin.ok) continue;

    const exec = await transitionBillDb(userId, bill.id, { type: "EXECUTE" });
    if (!exec.ok) continue;

    const idempotencyKey = executionIdempotencyKey(bill.id, now);

    try {
      const result = await gateway.executePayment(exec.bill, idempotencyKey);
      const event = eventFromResult(result, exec.bill);
      const transition = await transitionBillDb(userId, bill.id, event);
      if (transition.ok && result.success) affected += 1;
    } catch (err) {
      // Per-bill errors don't fail the whole run. They get an
      // audit row + the loop continues to the next bill.
      const error = err instanceof Error ? err.message : String(err);
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: "vault.scheduler_run",
          payload: JSON.stringify({ billId: bill.id, error }),
        },
      });
    }
  }

  return { billsAffected: affected };
}

/**
 * Update the `VaultSchedule` row with the result of a run.
 * Computes `nextRunAt` so the /vault "Next auto-run" indicator
 * stays accurate.
 */
export async function recordScheduleRun(
  userId: string,
  result: {
    status: ScheduleRunStatus;
    billsAffected: number;
    error: string | null;
    nextRunAt: Date | null;
  },
): Promise<void> {
  await prisma.vaultSchedule.update({
    where: { userId },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: result.status,
      lastRunError: result.error,
      lastRunBillsAffected: result.billsAffected,
      nextRunAt: result.nextRunAt,
    },
  });
}
