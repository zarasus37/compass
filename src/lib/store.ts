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
  type EnvelopeSeed,
  type GoalSeed,
  type TransactionSeed,
  type AllocationPlanSeed,
  type AllocationRuleSeed,
  type AccountSeed,
  type BillSeed,
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
