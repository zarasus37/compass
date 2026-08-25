/**
 * Seed data for the in-memory store. The shapes here mirror the
 * eventual Prisma models one-for-one so the swap to real DB queries
 * is a single search-and-replace away.
 *
 * When the real persistence layer is wired in (Cluster 2), this file
 * is the only place that knows about seed/mock data; everything else
 * reads through `@/lib/store`.
 */

import { addDays } from "./format";

export const TODAY = new Date("2026-08-30T18:30:00");
export const PERIOD_START = new Date("2026-08-22T00:00:00");
export const PERIOD_END = new Date("2026-09-05T00:00:00"); // exclusive end
export const NEXT_PAY_DATE = new Date("2026-08-28T00:00:00");

/**
 * Prior-period summary stats (for the /period comparison chart).
 * Three periods before the current one, in reverse-chronological order
 * (newest first). Each entry has the period's start date + the three
 * summary numbers: total income, total spending (negative), and the
 * carry (closing balance at period end).
 *
 * Plausible values for the demo persona (mom@compass.local). When the
 * real persistence layer lands (Cluster 5.x), this becomes a query
 * over the PayPeriod table.
 */
export interface PriorPeriodSummary {
  startDate: Date;
  endDate: Date;
  incomeCents: number;
  spendingCents: number; // positive number, even though it's outflow
  carryCents: number;
  label: string; // e.g. "Aug 8 – Aug 21"
}

export const PRIOR_PERIODS: PriorPeriodSummary[] = [
  {
    startDate: new Date("2026-08-08T00:00:00"),
    endDate: new Date("2026-08-22T00:00:00"),
    incomeCents: 2_400_00,
    spendingCents: 1_890_32,
    carryCents: 2_910_44,
    label: "Aug 8 – Aug 21",
  },
  {
    startDate: new Date("2026-07-25T00:00:00"),
    endDate: new Date("2026-08-08T00:00:00"),
    incomeCents: 2_400_00,
    spendingCents: 1_650_18,
    carryCents: 3_150_26,
    label: "Jul 25 – Aug 7",
  },
  {
    startDate: new Date("2026-07-11T00:00:00"),
    endDate: new Date("2026-07-25T00:00:00"),
    incomeCents: 2_400_00,
    spendingCents: 1_720_45,
    carryCents: 2_680_81,
    label: "Jul 11 – Jul 24",
  },
];

export type PlanetSeed =
  | "sol"
  | "luna"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn";

export interface EnvelopeSeed {
  id: string;
  name: string;
  planet: PlanetSeed;
  currentCents: number;
  targetCents: number;
}

export const ENVELOPES_SEED: EnvelopeSeed[] = [
  { id: "env-rent",      name: "Rent",          planet: "sol",     currentCents: 80_000,  targetCents: 80_000   },
  { id: "env-groceries", name: "Groceries",     planet: "luna",    currentCents: 61_200,  targetCents: 40_000   },
  { id: "env-utilities", name: "Utilities",     planet: "mercury", currentCents: 18_000,  targetCents: 20_000   },
  { id: "env-dining",    name: "Dining & Joy",  planet: "venus",   currentCents: 7_800,   targetCents: 10_000   },
  { id: "env-buffer",    name: "Buffer",        planet: "mars",    currentCents: 9_600,   targetCents: 9_600    },
  { id: "env-savings",   name: "Savings",       planet: "jupiter", currentCents: 136_000, targetCents: 400_000  },
  { id: "env-debt",      name: "Debt",          planet: "saturn",  currentCents: 202_100, targetCents: 482_000  },
];

export type GoalKindSeed = "TRANSFER" | "MILESTONE";
export type GoalTypeSeed = "EMERGENCY" | "INVEST";

export interface GoalSeed {
  id: string;
  name: string;
  description: string;
  planet: PlanetSeed;
  targetCents: number;
  currentCents: number;
  targetDate: Date;
  envelopeId: string | null;
  perPaycheckCents: number;
  isPrimary: boolean;
  /** TRANSFER = automatic money movement (e.g. emergency-fund sweep);
   *  MILESTONE = a destination amount the user is working toward.
   *  Mirrors the Prisma `GoalKind` enum. */
  kind: GoalKindSeed;
  /** EMERGENCY = the canonical Emergency Fund goal.
   *  INVEST = the long-horizon investment goal.
   *  Null for custom goals (trip, purchase, anything else).
   *  Mirrors the Prisma `GoalType` enum. */
  goalType: GoalTypeSeed | null;
}

export const GOALS_SEED: GoalSeed[] = [
  {
    id: "goal-emergency",
    name: "Emergency Fund",
    description: "Your safety net. Three months of expenses, ready when life surprises you.",
    planet: "jupiter",
    targetCents: 2_000_000,   // $20,000
    currentCents: 680_000,    // $6,800
    targetDate: new Date("2027-02-01"),
    envelopeId: "env-savings",
    perPaycheckCents: 43_200, // $432
    isPrimary: true,
    kind: "TRANSFER",         // auto-sweep from paycheck → savings
    goalType: "EMERGENCY",
  },
  {
    id: "goal-invest",
    name: "Investment Goal",
    description: "The long-horizon money. Compounding does most of the work; keep feeding it through the cycles.",
    planet: "jupiter",
    targetCents: 120_000_000, // $1,200,000 (target at age 65)
    currentCents: 5_080_000,  // $50,800 (today)
    targetDate: new Date("2048-01-01"),
    envelopeId: "env-savings",
    perPaycheckCents: 40_000, // $400 / month (allocation-driven)
    isPrimary: false,
    kind: "MILESTONE",        // a destination amount to hit
    goalType: "INVEST",
  },
  {
    id: "goal-debt",
    name: "Debt Free",
    description: "One debt at a time. The weight of past spending, paid down and gone.",
    planet: "saturn",
    targetCents: 482_000,
    currentCents: 202_100,
    targetDate: new Date("2026-05-01"),
    envelopeId: "env-debt",
    perPaycheckCents: 0,
    isPrimary: false,
    kind: "MILESTONE",        // a destination amount to hit
    goalType: null,
  },
  {
    id: "goal-visit",
    name: "Visit Family",
    description: "A trip to the kids in Austin. Set aside a little each paycheck.",
    planet: "venus",
    targetCents: 100_000,
    currentCents: 18_000,
    targetDate: new Date("2025-12-01"),
    envelopeId: null,
    perPaycheckCents: 0,
    isPrimary: false,
    kind: "MILESTONE",        // saving up for a trip
    goalType: null,
  },
];

export interface TransactionSeed {
  id: string;
  date: Date;
  payee: string;
  amountCents: number;
  envelopeId: string | null;
  isAuto?: boolean;
  isIncome?: boolean;
  isPrimaMateria?: boolean;
  source?: "user" | "allocation" | "system";
}

export const TRANSACTIONS_SEED: TransactionSeed[] = [
  { id: "t1",  date: TODAY,                 payee: "H-E-B · Groceries",     amountCents: -8_742,  envelopeId: "env-groceries" },
  { id: "t2",  date: TODAY,                 payee: "Pappasito's · Dinner",   amountCents: -4_820,  envelopeId: "env-dining"    },
  { id: "t3",  date: addDays(TODAY, -1),     payee: "Costco · Stock-up",      amountCents: -18_416, envelopeId: "env-groceries" },
  { id: "t4",  date: addDays(TODAY, -1),     payee: "Spectrum · Internet",    amountCents: -7_500,  envelopeId: "env-utilities", isAuto: true },
  { id: "t5",  date: addDays(TODAY, -3),     payee: "Chase · Paycheck",       amountCents: 240_000, envelopeId: null,          isIncome: true, isPrimaMateria: true, source: "user" },
  { id: "t6",  date: addDays(TODAY, -3),     payee: "Discover · Auto-pay",    amountCents: -9_600,  envelopeId: "env-debt",     isAuto: true },
];

export interface AccountSeed {
  id: string;
  name: string;
  mask: string;
  institution: string;
  type: "checking" | "savings" | "credit";
  balanceCents: number;
}

export const ACCOUNT_SEED: AccountSeed = {
  id: "acct-chase",
  name: "Chase Checking",
  mask: "4218",
  institution: "Chase",
  type: "checking",
  balanceCents: 8_421_000, // $84,210.00 — mirrors SNAPSHOT.netWorth for v1
};

// ---------------------------------------------------------------------------
// Bills — recurring monthly charges (Cluster 1.8). Each bill has a
// dueDay (1-31), an amount, and an autopay flag. The engine bins them
// into the current pay period based on `dueDay` relative to the
// biweekly schedule. `paidAt` is the ISO timestamp of the most recent
// payment (cleared on each pay-period close).
// ---------------------------------------------------------------------------

export interface BillSeed {
  id: string;
  name: string;
  amountCents: number;
  /** Day of month the bill is due (1-31). */
  dueDay: number;
  autopay: boolean;
  /** ISO string. null if not yet paid for the current period. */
  paidAt: string | null;
  /** Optional destination envelope. */
  envelopeId: string | null;
  /** Optional account the bill auto-pays from. */
  accountId: string | null;
  sortOrder: number;
}

export const BILLS_SEED: BillSeed[] = [
  { id: "bill-rent",      name: "Rent",                amountCents: 80_000,  dueDay: 1,   autopay: false, paidAt: null, envelopeId: "env-rent",      accountId: "acct-chase", sortOrder: 1 },
  { id: "bill-spectrum",  name: "Spectrum Internet",   amountCents: 7_500,   dueDay: 27,  autopay: true,  paidAt: null, envelopeId: "env-utilities", accountId: "acct-chase", sortOrder: 2 },
  { id: "bill-discover",  name: "Discover Auto-pay",   amountCents: 9_600,   dueDay: 27,  autopay: true,  paidAt: null, envelopeId: "env-debt",     accountId: "acct-chase", sortOrder: 3 },
  { id: "bill-spotify",   name: "Spotify",             amountCents: 1_099,   dueDay: 5,   autopay: true,  paidAt: null, envelopeId: "env-dining",   accountId: "acct-chase", sortOrder: 4 },
  { id: "bill-chatgpt",   name: "ChatGPT Plus",        amountCents: 2_000,   dueDay: 12,  autopay: true,  paidAt: null, envelopeId: "env-dining",   accountId: "acct-chase", sortOrder: 5 },
  { id: "bill-electric",  name: "Magic Valley Electric", amountCents: 11_200, dueDay: 18, autopay: false, paidAt: null, envelopeId: "env-utilities", accountId: "acct-chase", sortOrder: 6 },
];

// ---------------------------------------------------------------------------
// Debts — Cluster 1.9. Each debt has a current balance, an APR (in basis
// points to avoid float math — 24.99% = 2499), a minimum monthly
// payment, and the original balance (so the page can show progress).
// The engine ranks them with snowball (smallest first) or avalanche
// (highest APR first) and projects the payoff timeline given a monthly
// extra payment.
// ---------------------------------------------------------------------------

export interface DebtSeed {
  id: string;
  name: string;
  /** Current balance in cents. */
  balanceCents: number;
  /** Original balance when the debt was first tracked, in cents. */
  originalBalanceCents: number;
  /** Annual percentage rate, in basis points. 24.99% → 2499. */
  aprBps: number;
  /** Minimum monthly payment, in cents. */
  minPaymentCents: number;
  /** Day of month the bill is due (1-31). 0 if not on a schedule. */
  dueDay: number;
  /** Optional destination account. */
  accountId: string | null;
  sortOrder: number;
  isArchived: boolean;
}

export const DEBTS_SEED: DebtSeed[] = [
  {
    id: "debt-discover",
    name: "Discover It",
    balanceCents: 4_820_00,        // $4,820
    originalBalanceCents: 6_841_00, // started at $6,841
    aprBps: 2499,                  // 24.99%
    minPaymentCents: 96_00,        // $96
    dueDay: 27,
    accountId: "acct-chase",
    sortOrder: 1,
    isArchived: false,
  },
  {
    id: "debt-chase-sapphire",
    name: "Chase Sapphire",
    balanceCents: 2_100_00,        // $2,100
    originalBalanceCents: 2_100_00, // not paid down yet
    aprBps: 2199,                  // 21.99%
    minPaymentCents: 45_00,        // $45
    dueDay: 22,
    accountId: "acct-chase",
    sortOrder: 2,
    isArchived: false,
  },
  {
    id: "debt-carecredit",
    name: "CareCredit",
    balanceCents: 1_240_00,        // $1,240
    originalBalanceCents: 4_500_00,
    aprBps: 0,                     // 0% promo
    minPaymentCents: 0,            // pay in full this month
    dueDay: 5,
    accountId: "acct-chase",
    sortOrder: 3,
    isArchived: false,
  },
];

// ---------------------------------------------------------------------------
// Allocation plan — the seven default rules (Envelope strategy).
// Each rule tells the engine what to do with a paycheck when it arrives.
// Order matters: percent + fixed rules run in `priority` order, then any
// `remainder` rules split whatever is left. Per 00-DESIGN.md §5b the
// default strategy is Envelope (proportional).
// ---------------------------------------------------------------------------

export type AllocationStrategySeed =
  | "envelope"
  | "zero-based"
  | "fifty-thirty-twenty"
  | "pay-yourself-first";

export interface AllocationRuleSeed {
  id: string;
  envelopeId: string;
  mode: "percent" | "fixed" | "remainder";
  value: number; // percent (0-100) or cents
  priority: number;
}

export interface AllocationPlanSeed {
  id: string;
  strategy: AllocationStrategySeed;
  isArmed: boolean;
  rules: AllocationRuleSeed[];
}

export const ALLOCATION_PLAN_SEED: AllocationPlanSeed = {
  id: "plan-default",
  strategy: "envelope",
  isArmed: true, // D12: armed = auto-distribute on every paycheck, no confirm
  rules: [
    // The seven vessels in priority order, with realistic percentages
    // that sum to exactly 100. The last rule is `remainder` to absorb
    // rounding dust.
    { id: "rule-rent",      envelopeId: "env-rent",      mode: "percent",   value: 33,  priority: 1 },
    { id: "rule-utilities", envelopeId: "env-utilities", mode: "percent",   value: 8,   priority: 2 },
    { id: "rule-groceries", envelopeId: "env-groceries", mode: "percent",   value: 17,  priority: 3 },
    { id: "rule-dining",    envelopeId: "env-dining",    mode: "percent",   value: 4,   priority: 4 },
    { id: "rule-savings",   envelopeId: "env-savings",   mode: "percent",   value: 18,  priority: 5 },
    { id: "rule-debt",      envelopeId: "env-debt",      mode: "percent",   value: 15,  priority: 6 },
    { id: "rule-buffer",    envelopeId: "env-buffer",    mode: "remainder", value: 0,   priority: 7 },
  ],
};
