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
  type EnvelopeSeed,
  type GoalSeed,
  type TransactionSeed,
  type AllocationPlanSeed,
  type AllocationRuleSeed,
  type AccountSeed,
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

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface StoreState {
  envelopes: Envelope[];
  goals: Goal[];
  transactions: Transaction[];
  plan: AllocationPlan;
  account: Account;
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
