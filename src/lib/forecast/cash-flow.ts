/**
 * cash-flow.ts — 30/60/90-day balance projection (Cluster 7.26).
 *
 * Reads the user's existing data (Account, PaySchedule, Bill,
 * AllocationPlan, Envelope) and projects the spendable account
 * balance forward over a horizon. The output is a chart-friendly
 * series sampled at every pay-period boundary, with the first
 * "red day" (balance dips below the bill-cycle buffer) flagged
 * if any.
 *
 * No schema change. No new env vars. Pure read of existing
 * tables. Server-only — uses the `@/lib/db` Prisma client.
 *
 * Honest states:
 *   - `pending_no_pay_schedule` — no active PaySchedule row. No
 *     paycheck cadence → can't project. The component renders
 *     "Set up pay schedule to enable projection."
 *   - `pending_no_account` — no non-archived Account row. No
 *     balance → can't project. Renders "Add a checking account."
 *   - `pending_no_bills` — paychecks project cleanly but no
 *     bills to subtract. Renders "Add a bill to see when
 *     they'll hit your balance." (We still produce the series
 *     so the chart isn't empty.)
 *
 * No fake timestamps, no fake projections.
 */

import { prisma } from "@/server/db";

export type CashFlowStatus =
  | "ok"
  | "pending_no_pay_schedule"
  | "pending_no_account"
  | "pending_no_bills";

export interface CashFlowPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Projected end-of-day balance in cents. */
  balanceCents: number;
  /** Paycheck that lands on this date, if any (cents). */
  incomeCents: number;
  /** Bill subtotal that lands on this date, if any (cents). */
  billsCents: number;
  /** Envelope allocation (non-bill envelopes), per paycheck (cents). */
  envelopeCents: number;
}

export interface CashFlowForecast {
  status: CashFlowStatus;
  /** User's spendable account balance at start (cents). */
  startBalanceCents: number;
  /** ISO date the projection starts on (today). */
  startDate: string;
  /** Horizon length (30, 60, or 90). */
  horizonDays: number;
  /** Sample of the projected balance at every pay-period boundary. */
  series: CashFlowPoint[];
  /** First day balance dips below bufferFloorCents, if any. */
  lowPoint: {
    date: string;
    balanceCents: number;
    daysFromNow: number;
  } | null;
  /** Balance at the end of the horizon (cents). */
  endBalanceCents: number;
  /**
   * Buffer floor used to flag tight days: total bills in the next
   * 30 days. If 0 (no bills), the floor is the next paycheck's
   * envelope allocation, or 0.
   */
  bufferFloorCents: number;
  /** Summary counts for the card subtext. */
  paycheckCount: number;
  billCount: number;
}

export interface CashFlowInput {
  userId: string;
  /** Defaults to today. Injectable for tests. */
  today?: Date;
  /** 30 / 60 / 90. Defaults to 60. */
  horizonDays?: number;
}

/**
 * Resolve the "spendable" account: the first non-archived Account
 * with `type` in ('checking', 'savings'). Falls back to the first
 * non-archived account if none match by type. Returns null if no
 * accounts exist at all.
 */
async function getSpendableAccount(userId: string) {
  const rows = await prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length === 0) return null;
  const typed = rows.find((a) => a.type === "checking" || a.type === "savings");
  return typed ?? rows[0];
}

/**
 * Expand a bill's dueDay (1..31) into actual Date objects that
 * fall within [today, today + horizonDays]. Bills with cadence
 * "monthly" (the only cadence currently exposed in /recurring/new)
 * recur every month on the same day-of-month.
 */
function expandBillDates(
  bill: { amountCents: number; dueDay: number },
  today: Date,
  horizonEnd: Date,
): Date[] {
  if (!bill.dueDay || bill.dueDay < 1 || bill.dueDay > 31) return [];
  const out: Date[] = [];
  // Start from the current month — if the day-of-month has passed,
  // the next occurrence is in the following month.
  let year = today.getFullYear();
  let month = today.getMonth();
  for (let i = 0; i < 4; i += 1) {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(bill.dueDay, lastDayOfMonth);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (d.getTime() >= today.getTime() && d.getTime() <= horizonEnd.getTime()) {
      out.push(d);
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return out;
}

/**
 * Project N pay periods forward using a `nextPayDate` step.
 * Returns the list of pay dates within [today, today + horizonDays].
 */
function expandPayDates(
  cadence: string,
  startDate: Date,
  today: Date,
  horizonEnd: Date,
): Date[] {
  const out: Date[] = [];
  let cursor = new Date(startDate.getTime());
  // Step the cursor forward until it's strictly past `today`.
  while (cursor.getTime() <= today.getTime()) {
    cursor = stepPayDate(cursor, cadence);
  }
  while (cursor.getTime() <= horizonEnd.getTime()) {
    out.push(new Date(cursor.getTime()));
    cursor = stepPayDate(cursor, cadence);
  }
  return out;
}

function stepPayDate(d: Date, cadence: string): Date {
  const next = new Date(d.getTime());
  switch (cadence) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "semi_monthly":
      next.setDate(next.getDate() + 15);
      break;
    default:
      // Unknown cadence — fall back to biweekly so we don't loop forever.
      next.setDate(next.getDate() + 14);
      break;
  }
  return next;
}

/**
 * Sum the next 30 days of bills from the user's bills list.
 * Used as the buffer-floor heuristic: if balance dips below
 * "what's coming due in the next cycle", that's a tight day.
 */
function upcomingBillsTotal(
  bills: Array<{ amountCents: number; dueDay: number }>,
  today: Date,
): number {
  const windowEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  let sum = 0;
  for (const b of bills) {
    for (const d of expandBillDates(b, today, windowEnd)) {
      sum += b.amountCents;
    }
  }
  return sum;
}

/** Format a Date as ISO YYYY-MM-DD in local time. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build the cash-flow forecast. Pure read; no mutations.
 */
export async function loadCashFlowForecast(
  input: CashFlowInput,
): Promise<CashFlowForecast> {
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = input.horizonDays ?? 60;
  const horizonEnd = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  // ----- Required reads -----
  const [account, paySchedules, bills, envelopes, plan] = await Promise.all([
    getSpendableAccount(input.userId),
    prisma.paySchedule.findMany({
      where: { userId: input.userId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bill.findMany({
      where: { userId: input.userId, isArchived: false },
      orderBy: { dueDay: "asc" },
    }),
    prisma.envelope.findMany({
      where: { userId: input.userId, isArchived: false },
    }),
    prisma.allocationPlan.findFirst({
      where: { userId: input.userId },
      include: { rules: true },
    }),
  ]);

  if (!account) {
    return {
      status: "pending_no_account",
      startBalanceCents: 0,
      startDate: toISODate(today),
      horizonDays,
      series: [],
      lowPoint: null,
      endBalanceCents: 0,
      bufferFloorCents: 0,
      paycheckCount: 0,
      billCount: 0,
    };
  }

  if (paySchedules.length === 0) {
    return {
      status: "pending_no_pay_schedule",
      startBalanceCents: account.currentBalance,
      startDate: toISODate(today),
      horizonDays,
      series: [],
      lowPoint: null,
      endBalanceCents: account.currentBalance,
      bufferFloorCents: 0,
      paycheckCount: 0,
      billCount: bills.length,
    };
  }

  // ----- Build the event lists -----
  // Each paycheck date, the per-paycheck envelope allocation
  // (excluding bill-shaped envelopes — those are already in
  // billsCents) is summed from the AllocationPlan rules.
  const billShapePlanet = new Set<string>(["sol", "mercury"]);
  const planetByEnvelope = new Map<string, string | null>(
    envelopes.map((e) => [e.id, e.planet]),
  );
  let envelopeCentsPerPaycheck = 0;
  if (plan) {
    for (const rule of plan.rules) {
      const planet = planetByEnvelope.get(rule.envelopeId);
      if (!planet || billShapePlanet.has(planet)) continue;
      // AllocationRule has pct (percentage of paycheck) and
      // fixedCents (fixed amount). If both are 0/null, the
      // rule is inactive — skip. Bill-shaped envelopes (sol,
      // mercury) are already counted via billsCents, so we
      // skip them to avoid double-counting.
      if (rule.fixedCents && rule.fixedCents > 0) {
        envelopeCentsPerPaycheck += rule.fixedCents;
      } else if (rule.pct > 0) {
        const avgPaycheck =
          paySchedules.reduce((s, p) => s + p.amount, 0) / paySchedules.length;
        envelopeCentsPerPaycheck += Math.floor((avgPaycheck * rule.pct) / 100);
      }
    }
  }

  const payEvents: Array<{ date: Date; amount: number }> = [];
  for (const ps of paySchedules) {
    for (const d of expandPayDates(ps.cadence, ps.startDate, today, horizonEnd)) {
      payEvents.push({ date: d, amount: ps.amount });
    }
  }
  payEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  const billEvents: Array<{ date: Date; amount: number }> = [];
  for (const b of bills) {
    // Filter out bills with null dueDay — they can't be projected.
    if (b.dueDay === null) continue;
    const shaped = { amountCents: b.amountCents, dueDay: b.dueDay };
    for (const d of expandBillDates(shaped, today, horizonEnd)) {
      billEvents.push({ date: d, amount: b.amountCents });
    }
  }
  billEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  // ----- Walk the timeline -----
  // Sample at every pay-period boundary (every pay date + the
  // start + the end). Bill events between samples contribute to
  // the running balance so the projected balance at the next
  // sample reflects all intervening activity.
  const sampleDates: Date[] = [
    new Date(today.getTime()),
    ...payEvents.map((e) => new Date(e.date.getTime())),
    new Date(horizonEnd.getTime()),
  ];
  // De-dupe by day.
  const sampleMap = new Map<string, CashFlowPoint>();
  for (const d of sampleDates) {
    sampleMap.set(toISODate(d), {
      date: toISODate(d),
      balanceCents: 0, // filled in the walk
      incomeCents: 0,
      billsCents: 0,
      envelopeCents: 0,
    });
  }
  const samples = Array.from(sampleMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let runningBalance = account.currentBalance;
  let billCursor = 0;
  let payCursor = 0;

  const lowDay = { bufferFloorCents: upcomingBillsTotal(bills.filter((b) => b.dueDay !== null) as Array<{ amountCents: number; dueDay: number }>, today) };
  let lowPoint: CashFlowForecast["lowPoint"] = null;

  for (const s of samples) {
    const sampleDate = new Date(s.date);
    while (billCursor < billEvents.length && billEvents[billCursor]!.date.getTime() <= sampleDate.getTime()) {
      const ev = billEvents[billCursor]!;
      runningBalance -= ev.amount;
      s.billsCents += ev.amount;
      billCursor += 1;
    }
    while (payCursor < payEvents.length && payEvents[payCursor]!.date.getTime() <= sampleDate.getTime()) {
      const ev = payEvents[payCursor]!;
      runningBalance += ev.amount;
      s.incomeCents += ev.amount;
      // Each paycheck also triggers the envelope allocation.
      runningBalance -= envelopeCentsPerPaycheck;
      s.envelopeCents += envelopeCentsPerPaycheck;
      payCursor += 1;
    }
    s.balanceCents = runningBalance;
    if (
      lowPoint === null &&
      runningBalance < lowDay.bufferFloorCents &&
      sampleDate.getTime() > today.getTime()
    ) {
      const daysFromNow = Math.max(
        0,
        Math.round((sampleDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
      );
      lowPoint = {
        date: s.date,
        balanceCents: runningBalance,
        daysFromNow,
      };
    }
  }

  const status: CashFlowStatus = bills.length === 0 ? "pending_no_bills" : "ok";
  const lastSample = samples[samples.length - 1];

  return {
    status,
    startBalanceCents: account.currentBalance,
    startDate: toISODate(today),
    horizonDays,
    series: samples,
    lowPoint,
    endBalanceCents: lastSample?.balanceCents ?? account.currentBalance,
    bufferFloorCents: lowDay.bufferFloorCents,
    paycheckCount: payEvents.length,
    billCount: billEvents.length,
  };
}
