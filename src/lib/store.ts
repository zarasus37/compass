/**
 * In-memory store for Compass. Wraps the mock seed data with a mutable
 * layer so the UI can react to user actions (e.g. "simulate a paycheck")
 * while the real Prisma layer is being wired up.
 *
 * Persistence note: state lives on `globalThis` so Next.js HMR doesn't
 * reset balances between dev hot-reloads. When the real DB is wired in
 * (Cluster 2), this module's reads/writes are the only call sites that
 * need to change — the rest of the app talks to it as a black box.
 */

import {
  ENVELOPES_SEED,
  GOALS_SEED,
  TRANSACTIONS_SEED,
  ALLOCATION_PLAN_SEED,
  ACCOUNT_SEED,
  BILLS_SEED,
  DEBTS_SEED,
  type EnvelopeSeed,
  type GoalSeed,
  type TransactionSeed,
  type AllocationPlanSeed,
  type AllocationRuleSeed,
  type AccountSeed,
  type BillSeed,
  type DebtSeed,
} from "./mock-seed";

export type PlanetId =
  | "sol"
  | "luna"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn";

export interface Envelope {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  planet: PlanetId;
  targetCents: number;
  currentCents: number;
  targetDate: Date;
  envelopeId: string | null;
  perPaycheckCents: number;
  isPrimary: boolean;
}

export interface Transaction {
  id: string;
  date: Date;
  payee: string;
  amountCents: number;
  envelopeId: string | null;
  isAuto?: boolean;
  isIncome?: boolean;
  isPrimaMateria?: boolean; // a paycheck that triggers auto-allocate
  source?: "user" | "allocation" | "system";
}

export interface AllocationPlan {
  id: string;
  strategy: "envelope" | "zero-based" | "fifty-thirty-twenty" | "pay-yourself-first";
  isArmed: boolean;
  rules: AllocationRule[];
}

export interface AllocationRule {
  id: string;
  envelopeId: string;
  mode: "percent" | "fixed" | "remainder";
  value: number; // percent (0-100) or cents
  priority: number; // order in which rules are applied
}

export interface Account {
  id: string;
  name: string;
  mask: string;
  institution: string;
  type: "checking" | "savings" | "credit";
  balanceCents: number;
}

export interface AuditLogEntry {
  id: string;
  at: Date;
  kind: "paycheck-allocation" | "manual-adjust" | "system";
  summary: string;
  meta?: Record<string, unknown>;
}

/// A recurring bill (Cluster 1.8). Mirrors the Prisma `Bill` model
/// (added in a future migration — the in-memory store is the source
/// of truth for v1, the Prisma row is the durable mirror).
export interface Bill {
  id: string;
  name: string;
  amountCents: number;
  /** Day of month the bill is due (1-31). */
  dueDay: number;
  autopay: boolean;
  /** ISO string. null if not yet paid for the current period. */
  paidAt: string | null;
  envelopeId: string | null;
  accountId: string | null;
  sortOrder: number;
}

/// A debt (Cluster 1.9). APR is stored in basis points (2499 = 24.99%)
/// so the payoff engine never has to touch floats.
export interface Debt {
  id: string;
  name: string;
  balanceCents: number;
  originalBalanceCents: number;
  aprBps: number;
  minPaymentCents: number;
  dueDay: number;
  accountId: string | null;
  sortOrder: number;
  isArchived: boolean;
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface StoreState {
  envelopes: Envelope[];
  goals: Goal[];
  transactions: Transaction[];
  plan: AllocationPlan;
  account: Account;
  bills: Bill[];
  debts: Debt[];
  audit: AuditLogEntry[];
  paycheckCount: number; // how many sims have been run this session
}

function seedState(): StoreState {
  return {
    envelopes: ENVELOPES_SEED.map((e: EnvelopeSeed) => ({
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.currentCents,
      targetCents: e.targetCents,
    })),
    goals: GOALS_SEED.map((g: GoalSeed) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      planet: g.planet,
      targetCents: g.targetCents,
      currentCents: g.currentCents,
      targetDate: g.targetDate,
      envelopeId: g.envelopeId,
      perPaycheckCents: g.perPaycheckCents,
      isPrimary: g.isPrimary,
    })),
    transactions: TRANSACTIONS_SEED.map((t: TransactionSeed) => ({
      id: t.id,
      date: t.date,
      payee: t.payee,
      amountCents: t.amountCents,
      envelopeId: t.envelopeId,
      isAuto: t.isAuto,
      isIncome: t.isIncome,
      isPrimaMateria: t.isPrimaMateria,
      source: t.source,
    })),
    plan: {
      id: ALLOCATION_PLAN_SEED.id,
      strategy: ALLOCATION_PLAN_SEED.strategy,
      isArmed: ALLOCATION_PLAN_SEED.isArmed,
      rules: ALLOCATION_PLAN_SEED.rules.map((r: AllocationRuleSeed) => ({
        id: r.id,
        envelopeId: r.envelopeId,
        mode: r.mode,
        value: r.value,
        priority: r.priority,
      })),
    },
    account: {
      id: ACCOUNT_SEED.id,
      name: ACCOUNT_SEED.name,
      mask: ACCOUNT_SEED.mask,
      institution: ACCOUNT_SEED.institution,
      type: ACCOUNT_SEED.type,
      balanceCents: ACCOUNT_SEED.balanceCents,
    },
    bills: BILLS_SEED.map((b: BillSeed) => ({ ...b })),
    debts: DEBTS_SEED.map((d: DebtSeed) => ({ ...d })),
    audit: [],
    paycheckCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Singleton: pin on globalThis so HMR doesn't wipe state
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __COMPASS_STORE__: StoreState | undefined;
}

function getState(): StoreState {
  if (!globalThis.__COMPASS_STORE__) {
    globalThis.__COMPASS_STORE__ = seedState();
  }
  return globalThis.__COMPASS_STORE__;
}

// ---------------------------------------------------------------------------
// Read API — used by server components
// ---------------------------------------------------------------------------

export function readEnvelopes(): Envelope[] {
  return getState().envelopes.map((e) => ({ ...e }));
}

export function readGoals(): Goal[] {
  return getState().goals.map((g) => ({ ...g, targetDate: new Date(g.targetDate) }));
}

export function readTransactions(): Transaction[] {
  return getState()
    .transactions.map((t) => ({
      ...t,
      date: new Date(t.date),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function readPlan(): AllocationPlan {
  const p = getState().plan;
  return { ...p, rules: p.rules.map((r) => ({ ...r })) };
}

export function readAccount(): Account {
  return { ...getState().account };
}

export function readAudit(): AuditLogEntry[] {
  return getState()
    .audit.map((a) => ({ ...a, at: new Date(a.at) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function readSnapshot() {
  const s = getState();
  return {
    netWorthCents: s.account.balanceCents,
    periodDeltaCents: s.transactions
      .filter((t) => t.isPrimaMateria || t.isIncome)
      .reduce((sum, t) => sum + t.amountCents, 0),
    nextPaycheckCents: 240_000, // pulled from pay schedule (mock for v1)
    paycheckCount: s.paycheckCount,
  };
}

export function readBills(): Bill[] {
  return getState()
    .bills.slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b) => ({ ...b }));
}

export function readDebts(): Debt[] {
  return getState()
    .debts.slice()
    .filter((d) => !d.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({ ...d }));
}

/**
 * Apply an extra payment to a debt. Subtracts the cents from the
 * debt's balance, writes an audit entry, and records the new balance.
 * The extra payment is the "Free" amount from the Plan My Next Check
 * (or a slider value from the "What if?" simulator).
 */
export function applyExtraDebtPayment(
  debtId: string,
  amountCents: number,
  source: "plan-my-next-check" | "what-if-slider" = "plan-my-next-check",
): { ok: boolean; reason?: string; debt?: Debt } {
  if (amountCents <= 0) {
    return { ok: false, reason: "Enter an amount greater than $0." };
  }
  const s = getState();
  const debt = s.debts.find((d) => d.id === debtId);
  if (!debt) return { ok: false, reason: "Debt not found." };
  if (debt.balanceCents <= 0) {
    return { ok: false, reason: "Debt is already paid off." };
  }

  // Don't overpay — apply the lesser of the two.
  const applied = Math.min(amountCents, debt.balanceCents);
  debt.balanceCents -= applied;

  s.audit.unshift({
    id: nextId("aud-debt"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Applied $${(applied / 100).toFixed(2)} extra payment to ${debt.name} (balance now $${(debt.balanceCents / 100).toFixed(2)}).`,
    meta: { debtId, appliedCents: applied, newBalance: debt.balanceCents, source },
  });

  // If this payment zeroed the debt, the celebration fires on the next render.
  return { ok: true, debt: { ...debt } };
}

// ---------------------------------------------------------------------------
// Write API — called only from server actions
// ---------------------------------------------------------------------------

export function applyAllocation(result: AllocationRunResult): void {
  const s = getState();

  // Bump envelope balances
  for (const r of result.transfers) {
    const env = s.envelopes.find((e) => e.id === r.envelopeId);
    if (env) env.currentCents = r.newBalanceCents;
  }

  // Bump goal balances when the envelope is bound to a goal
  for (const r of result.transfers) {
    const goal = s.goals.find((g) => g.envelopeId === r.envelopeId);
    if (goal) goal.currentCents += r.allocatedCents;
  }

  // Record the paycheck + ledger transfers
  const now = new Date();
  s.transactions.unshift({
    id: result.paycheckTransactionId,
    date: now,
    payee: result.source,
    amountCents: result.paycheckCents,
    envelopeId: null,
    isIncome: true,
    isPrimaMateria: true,
    source: "user",
  });
  for (const r of result.transfers) {
    s.transactions.unshift({
      id: r.transferId,
      date: now,
      payee: `Auto-allocate → ${r.envelopeName}`,
      amountCents: r.allocatedCents,
      envelopeId: r.envelopeId,
      source: "allocation",
    });
  }

  // Update account balance
  s.account.balanceCents += result.paycheckCents;

  s.paycheckCount += 1;
  s.audit.unshift({
    id: result.auditId,
    at: now,
    kind: "paycheck-allocation",
    summary: `Paycheck of $${(result.paycheckCents / 100).toFixed(2)} allocated across ${result.transfers.length} envelopes.`,
    meta: { strategy: result.strategy, totalAllocated: result.totalAllocatedCents },
  });
}

export function resetStore(): void {
  globalThis.__COMPASS_STORE__ = seedState();
}

// ---------------------------------------------------------------------------
// Bill mutators (Cluster 1.8)
// ---------------------------------------------------------------------------

/**
 * Toggle a bill between paid and unpaid. When `paid === true`, sets
 * `paidAt` to now. When `paid === false`, clears `paidAt`. Returns the
 * updated bill (or null if not found).
 */
export function setBillPaid(billId: string, paid: boolean): Bill | null {
  const s = getState();
  const bill = s.bills.find((b) => b.id === billId);
  if (!bill) return null;
  bill.paidAt = paid ? new Date().toISOString() : null;
  s.audit.unshift({
    id: nextId("aud-bill"),
    at: new Date(),
    kind: "manual-adjust",
    summary: paid
      ? `Marked ${bill.name} as paid (${formatCentsInline(bill.amountCents)}).`
      : `Reset ${bill.name} to unpaid.`,
    meta: { billId, paid },
  });
  return { ...bill };
}

// ---------------------------------------------------------------------------
// Bill engine (Cluster 1.8) — "Plan My Next Check" + calendar warnings
// ---------------------------------------------------------------------------

/**
 * For a bill, compute the next due date on or after `fromDate`, on or
 * before `toDate`. The bill is "due this period" if that date lands
 * inside the range. If `paidAt` is set and falls inside the same
 * range, the bill is already paid for this period.
 *
 * Period semantics (D11, D17): biweekly, [paycheck, nextPaycheck).
 * A monthly bill with dueDay=1 is due on the 1st of each month. If
 * the period covers the 1st, it's due; if `paidAt` is set in the
 * same period, it's already paid.
 */
export function billsDueInPeriod(
  bills: Bill[],
  periodStart: Date,
  periodEnd: Date,
): Array<{ bill: Bill; dueDate: Date; paidThisPeriod: boolean }> {
  const out: Array<{ bill: Bill; dueDate: Date; paidThisPeriod: boolean }> = [];
  // The period is 14 days (D17 biweekly). A monthly bill can land on
  // at most one date in any 14-day window, but the window can cross
  // a month boundary (Aug 22 → Sep 5 includes both Aug 27 and Sep 1).
  // We check the candidate in the period's starting month and the
  // period's ending month; whichever (if either) is in range wins.
  for (const b of bills) {
    const candidates: Date[] = [];
    const startYear = periodStart.getFullYear();
    const startMonth = periodStart.getMonth();
    const endYear = periodEnd.getFullYear();
    const endMonth = periodEnd.getMonth();
    const monthsToCheck: Array<[number, number]> = [];
    for (let y = startYear; y <= endYear; y += 1) {
      const mStart = y === startYear ? startMonth : 0;
      const mEnd = y === endYear ? endMonth : 11;
      for (let m = mStart; m <= mEnd; m += 1) {
        monthsToCheck.push([y, m]);
      }
    }
    for (const [y, m] of monthsToCheck) {
      const candidate = new Date(y, m, Math.min(b.dueDay, daysInMonth(y, m)));
      if (candidate >= periodStart && candidate <= periodEnd) {
        candidates.push(candidate);
      }
    }
    if (candidates.length > 0) {
      // Use the earliest candidate in the period.
      const dueDate = candidates.sort((a, b) => a.getTime() - b.getTime())[0]!;
      const paidThisPeriod =
        b.paidAt !== null &&
        new Date(b.paidAt) >= periodStart &&
        new Date(b.paidAt) <= periodEnd;
      out.push({ bill: b, dueDate, paidThisPeriod });
    }
  }
  return out;
}

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function formatCentsInline(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

/**
 * The 5-way "Plan My Next Check" breakdown.
 *
 *   Paycheck  =  total incoming
 *   Bills     =  sum of recurring bills due in the period (paid or not —
 *                you still need to set the money aside)
 *   Spending  =  discretionary envelope allocations (Groceries, Dining, Buffer)
 *   Debt      =  allocation to the debt envelope (Saturn)
 *   Savings   =  allocation to the savings envelope (Jupiter)
 *   Unallocated = paycheck - everything else
 *
 * Bill-shaped envelopes (Rent, Utilities / Sol, Mercury) are funded
 * by their bills, so the breakdown doesn't double-count their
 * envelope allocations. They show up in "Bills" via the recurring
 * bill list, which is the source of truth.
 */
export interface PaycheckBreakdown {
  paycheckCents: number;
  billsCents: number;
  spendingCents: number;
  debtCents: number;
  savingsCents: number;
  unallocatedCents: number;
  /** Bills that are still unpaid at the time of the run. */
  unpaidBillCount: number;
  /** True when bills > paycheck — a red flag. */
  billsExceedPaycheck: boolean;
}

export function paycheckBreakdown(
  paycheckCents: number,
  bills: Bill[],
  plan: AllocationPlan,
  envelopes: ReadonlyArray<{ id: string; planet: PlanetId }>,
  periodStart: Date,
  periodEnd: Date,
): PaycheckBreakdown {
  // Bills: sum of bills due in the period, regardless of paid status.
  // Unpaid bills still need to come out of this paycheck.
  const due = billsDueInPeriod(bills, periodStart, periodEnd);
  const billsCents = due.reduce((s, d) => s + d.bill.amountCents, 0);
  const unpaidBillCount = due.filter((d) => !d.paidThisPeriod).length;

  // Map envelope id → planet for the spending/debt/savings classification.
  const planetByEnvelope = new Map(envelopes.map((e) => [e.id, e.planet]));

  // Allocation rules → cents for this paycheck.
  let spendingCents = 0;
  let debtCents = 0;
  let savingsCents = 0;
  for (const rule of plan.rules) {
    if (rule.mode === "remainder") continue; // unallocated bucket, computed last
    const cents =
      rule.mode === "percent"
        ? Math.floor((paycheckCents * rule.value) / 100)
        : rule.mode === "fixed"
        ? rule.value
        : 0;
    const planet = planetByEnvelope.get(rule.envelopeId);
    if (planet === "saturn") debtCents += cents;
    else if (planet === "jupiter") savingsCents += cents;
    else if (planet === "sol" || planet === "mercury") {
      // Bill-shaped envelope — already counted in "Bills" via the bill list.
      // Skip to avoid double-counting.
      continue;
    } else {
      // luna, mars, venus → discretionary
      spendingCents += cents;
    }
  }

  const allocated =
    billsCents + spendingCents + debtCents + savingsCents;
  const unallocatedCents = Math.max(0, paycheckCents - allocated);

  return {
    paycheckCents,
    billsCents,
    spendingCents,
    debtCents,
    savingsCents,
    unallocatedCents,
    unpaidBillCount,
    billsExceedPaycheck: billsCents > paycheckCents,
  };
}

/**
 * "Safe to spend" — the number she can actually spend on discretionary
 * things this period. Pulled from the breakdown as:
 *
 *   safeToSpend = unallocatedCents
 *
 * Surfaced as a single number on the dashboard and as a 5-way breakdown
 * on the Plan My Next Check action.
 */
export function safeToSpend(breakdown: PaycheckBreakdown): number {
  return breakdown.unallocatedCents;
}

// ---------------------------------------------------------------------------
// Debt payoff engine (Cluster 1.9)
// ---------------------------------------------------------------------------

export type PayoffMethod = "snowball" | "avalanche";

/**
 * Order debts by method. Snowball = smallest balance first
 * (momentum); Avalanche = highest APR first (saves interest).
 * Zero-balance debts are filtered out.
 */
export function orderDebtsByMethod(
  debts: Debt[],
  method: PayoffMethod,
): Debt[] {
  const active = debts.filter((d) => d.balanceCents > 0);
  if (method === "snowball") {
    return active.slice().sort((a, b) => a.balanceCents - b.balanceCents);
  }
  // Avalanche
  return active.slice().sort((a, b) => b.aprBps - a.aprBps);
}

export interface DebtPayoffRow {
  debtId: string;
  debtName: string;
  monthsToPayoff: number;
  totalInterestCents: number;
  startingBalanceCents: number;
}

export interface PayoffProjection {
  method: PayoffMethod;
  monthlyExtraCents: number;
  totalMonths: number;
  totalInterestCents: number;
  payoffDate: Date;
  perDebt: DebtPayoffRow[];
  /**
   * True when at least one debt's minimum payment can't cover its
   * monthly interest (the "never pays off" case). The UI should
   * surface this as a warning.
   */
  hasUnpayableDebt: boolean;
  /** If hasUnpayableDebt, the IDs of the debts that won't pay off. */
  unpayableDebtIds: string[];
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375; // ~average month

/**
 * Closed-form months-to-payoff for a single debt with monthly
 * payment P, balance B, and monthly rate r. Returns Infinity if
 * P <= B*r (the payment can't even cover the interest — debt
 * grows forever).
 */
function monthsToPayoffForDebt(
  balanceCents: number,
  monthlyPaymentCents: number,
  monthlyRateBps: number,
): number {
  if (balanceCents <= 0) return 0;
  const r = monthlyRateBps / 10000; // bps → decimal monthly rate
  if (r === 0) {
    if (monthlyPaymentCents <= 0) return Infinity;
    return balanceCents / monthlyPaymentCents;
  }
  const interest = balanceCents * r;
  if (monthlyPaymentCents <= interest) return Infinity;
  // N = -log(1 - B*r / P) / log(1 + r)
  return -Math.log(1 - interest / monthlyPaymentCents) / Math.log(1 + r);
}

/**
 * Project the total months to be debt-free and the total interest
 * paid, given a list of debts, a payoff method, and a monthly extra
 * payment. The extra rolls into the highest-priority debt; freed
 * minimums from paid-off debts cascade into the next.
 *
 * Algorithm: simulate month by month. Each month, every active debt
 * accrues interest, then the minimum is applied. Whatever's left
 * (cascading minimums + extra) goes to the highest-priority debt
 * (per the chosen method). When a debt hits zero, mark the date.
 *
 * This is iterative for accuracy (cascading can be complex); we cap
 * the simulation at 360 months (30 years) to avoid infinite loops
 * on the unpayable case.
 */
export function payoffProjection(
  debts: Debt[],
  method: PayoffMethod,
  monthlyExtraCents: number,
  anchor: Date = new Date(),
  paychecksPerMonth: number = 2,
): PayoffProjection {
  // Deep-copy the debts' mutable state so we don't mutate the input.
  const ordered = orderDebtsByMethod(debts, method).map((d) => ({
    ...d,
  }));

  // Filter to only those with non-zero balance.
  let active = ordered.filter((d) => d.balanceCents > 0);
  if (active.length === 0) {
    return {
      method,
      monthlyExtraCents,
      totalMonths: 0,
      totalInterestCents: 0,
      payoffDate: anchor,
      perDebt: ordered.map((d) => ({
        debtId: d.id,
        debtName: d.name,
        monthsToPayoff: 0,
        totalInterestCents: 0,
        startingBalanceCents: d.balanceCents,
      })),
      hasUnpayableDebt: false,
      unpayableDebtIds: [],
    };
  }

  const perDebtStart = new Map(active.map((d) => [d.id, d.balanceCents]));
  const perDebtInterest = new Map<string, number>(active.map((d) => [d.id, 0]));
  const perDebtMonths = new Map<string, number>(active.map((d) => [d.id, 0]));
  const paidOffAt = new Map<string, number>(); // debtId → month index when paid
  const unpayable = new Set<string>();

  // Convert extra from "per paycheck" to "per month" — user thinks
  // of extra as a per-check amount, but the simulation runs monthly.
  const extraPerMonth = Math.round(monthlyExtraCents * paychecksPerMonth);

  const MAX_MONTHS = 360;
  for (let m = 1; m <= MAX_MONTHS; m += 1) {
    if (active.length === 0) break;

    // 1. Accrue interest on every active debt.
    for (const d of active) {
      const r = d.aprBps / 10000; // monthly rate in decimal
      const interest = Math.round(d.balanceCents * r);
      d.balanceCents += interest;
      perDebtInterest.set(d.id, (perDebtInterest.get(d.id) ?? 0) + interest);
    }

    // 2. Apply the minimum payment to every active debt.
    for (const d of active) {
      const min = Math.min(d.minPaymentCents, d.balanceCents);
      d.balanceCents -= min;
    }

    // 3. Cascade freed minimums + extra into the highest-priority
    //    active debt. Highest priority = lowest in `active` array
    //    (already sorted by method).
    const head = active[0]!;
    if (head.balanceCents > 0) {
      // Sum the minimums of all OTHER active debts that are now
      // depleted enough that paying them more wouldn't help, plus
      // the extra. Simpler: just add the extra + the min of the
      // *other* debts to the head.
      let cascade = extraPerMonth;
      for (let i = 1; i < active.length; i += 1) {
        // Their minimum was already applied; the freed amount
        // is whatever they were paying. For a closed form, the
        // safest approximation: add their min to the cascade.
        cascade += active[i]!.minPaymentCents;
      }
      const apply = Math.min(cascade, head.balanceCents);
      head.balanceCents -= apply;
    }

    // 4. Track months for debts still active.
    for (const d of active) {
      perDebtMonths.set(d.id, m);
    }

    // 5. Mark paid-off debts, check for unpayable.
    const stillActive: typeof active = [];
    for (const d of active) {
      if (d.balanceCents <= 0) {
        d.balanceCents = 0;
        paidOffAt.set(d.id, m);
      } else {
        stillActive.push(d);
        // Detect "never pays off": balance still ≥ original
        // starting balance (or the interest accrued this month
        // exceeded the min payment on this debt).
        const r = d.aprBps / 10000;
        const startBal = perDebtStart.get(d.id) ?? 0;
        if (m % 6 === 0 && d.balanceCents >= startBal && r > 0) {
          unpayable.add(d.id);
        }
      }
    }
    active = stillActive;
  }

  const totalMonths = perDebtMonths.size > 0
    ? Math.max(...Array.from(perDebtMonths.values()))
    : 0;
  const totalInterestCents = Array.from(perDebtInterest.values()).reduce(
    (s, n) => s + n,
    0,
  );

  return {
    method,
    monthlyExtraCents,
    totalMonths,
    totalInterestCents,
    payoffDate: new Date(anchor.getTime() + totalMonths * MS_PER_MONTH),
    perDebt: ordered.map((d) => {
      const startBal = perDebtStart.get(d.id) ?? 0;
      const months = perDebtMonths.get(d.id) ?? 0;
      const interest = perDebtInterest.get(d.id) ?? 0;
      // If the debt was already at $0 in the seed, months=0.
      return {
        debtId: d.id,
        debtName: d.name,
        monthsToPayoff: months,
        totalInterestCents: interest,
        startingBalanceCents: startBal,
      };
    }),
    hasUnpayableDebt: unpayable.size > 0,
    unpayableDebtIds: Array.from(unpayable),
  };
}

// ---------------------------------------------------------------------------
// Allocation engine — pure function, returns the plan + summary
// ---------------------------------------------------------------------------

export interface AllocationTransfer {
  transferId: string;
  ruleId: string;
  envelopeId: string;
  envelopeName: string;
  planet: PlanetId;
  mode: AllocationRule["mode"];
  allocatedCents: number;
  previousBalanceCents: number;
  newBalanceCents: number;
  pctOfPaycheck: number;
}

export interface AllocationRunResult {
  paycheckTransactionId: string;
  auditId: string;
  source: string;
  paycheckCents: number;
  strategy: AllocationPlan["strategy"];
  isArmed: boolean;
  transfers: AllocationTransfer[];
  totalAllocatedCents: number;
  unallocatedCents: number;
  remainder: { envelopeId: string; envelopeName: string; cents: number } | null;
  ranAt: Date;
}

let __idSeq = 1000;
function nextId(prefix: string): string {
  __idSeq += 1;
  return `${prefix}-${__idSeq}-${Date.now().toString(36)}`;
}

export function runAllocation(
  paycheckCents: number,
  source: string,
  now: Date = new Date(),
): AllocationRunResult {
  const state = getState();
  const plan = state.plan;

  // Resolve rule order
  const orderedRules = [...plan.rules].sort((a, b) => a.priority - b.priority);

  // Phase 1: apply percent + fixed rules in priority order
  let remaining = paycheckCents;
  const partials: Array<{
    rule: AllocationRule;
    cents: number;
  }> = [];

  for (const rule of orderedRules) {
    if (rule.mode === "remainder") continue; // handled last
    let cents = 0;
    if (rule.mode === "percent") {
      cents = Math.floor((paycheckCents * rule.value) / 100);
    } else if (rule.mode === "fixed") {
      cents = rule.value;
    }
    cents = Math.max(0, Math.min(cents, remaining));
    partials.push({ rule, cents });
    remaining -= cents;
  }

  // Phase 2: handle remainder rule(s) — split the leftover across them
  const remainderRules = orderedRules.filter((r) => r.mode === "remainder");
  if (remainderRules.length > 0 && remaining > 0) {
    const share = Math.floor(remaining / remainderRules.length);
    let leftover = remaining - share * remainderRules.length;
    for (let i = 0; i < remainderRules.length; i += 1) {
      const r = remainderRules[i]!;
      const cents = share + (i < leftover ? 1 : 0);
      partials.push({ rule: r, cents });
    }
    remaining = 0;
  }

  // Phase 3: apply to envelopes
  const transfers: AllocationTransfer[] = [];
  let totalAllocated = 0;
  for (const { rule, cents } of partials) {
    if (cents <= 0) continue;
    const env = state.envelopes.find((e) => e.id === rule.envelopeId);
    if (!env) continue;
    const previous = env.currentCents;
    const next = previous + cents;
    transfers.push({
      transferId: nextId("xfer"),
      ruleId: rule.id,
      envelopeId: env.id,
      envelopeName: env.name,
      planet: env.planet,
      mode: rule.mode,
      allocatedCents: cents,
      previousBalanceCents: previous,
      newBalanceCents: next,
      pctOfPaycheck: paycheckCents > 0 ? (cents / paycheckCents) * 100 : 0,
    });
    totalAllocated += cents;
  }

  // Compute the remainder pointer (used by the UI to explain leftovers)
  const remainder =
    transfers.length > 0
      ? {
          envelopeId: transfers[transfers.length - 1]!.envelopeId,
          envelopeName: transfers[transfers.length - 1]!.envelopeName,
          cents: remaining,
        }
      : null;

  return {
    paycheckTransactionId: nextId("pc"),
    auditId: nextId("aud"),
    source,
    paycheckCents,
    strategy: plan.strategy,
    isArmed: plan.isArmed,
    transfers,
    totalAllocatedCents: totalAllocated,
    unallocatedCents: remaining,
    remainder,
    ranAt: now,
  };
}
