/**
 * In-memory store for Compass. Wraps the mock seed data with a mutable
 * layer so the UI can react to user actions (e.g. "simulate a paycheck")
 * while the real Prisma layer is being wired up.
 *
 * Persistence note: state lives on `globalThis` so Next.js HMR doesn't
 * reset balances between dev hot-reloads. When the real DB is wired in
 * (Cluster 2), this module's reads/writes are the only call sites that
 * need to change — the rest of the app talks to it as a black box.
 *
 * Cluster 3.x Prisma cutover (2026-08-24): the atomic rebalance engine
 * (`rebalanceEnvelopes`) is now backed by `prisma.$transaction` and writes
 * its audit row to the `AuditLog` Prisma model. The rest of the store
 * still uses the in-memory array; after each rebalance the engine
 * mirrors the new balances into the in-memory state so reads stay
 * consistent without a synchronous DB read. Reads will migrate to
 * Prisma in a future cluster.
 */

import { prisma } from "@/server/db";
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
  type GoalKindSeed,
  type TransactionSeed,
  type AllocationPlanSeed,
  type AllocationRuleSeed,
  type AccountSeed,
  type BillSeed,
  type DebtSeed,
} from "./mock-seed";

/**
 * Ensure the DB has the 7 default envelopes for the given user. Called
 * by the rebalance engine on first use so the action always has rows
 * to mutate. Idempotent — no-op if the user already has envelopes.
 *
 * Cluster 5.2.6 widget switch: the seeded rows are tagged with
 * `source="seed"` so production reads can filter canonical vessels
 * apart from any future user- or identity-projected envelopes.
 */
export async function ensureUserEnvelopesSeeded(userId: string): Promise<void> {
  const count = await prisma.envelope.count({ where: { userId } });
  if (count > 0) return;
  await prisma.envelope.createMany({
    data: ENVELOPES_SEED.map((e) => ({
      id: e.id,
      userId,
      name: e.name,
      planet: e.planet,
      currentBalance: e.currentCents,
      targetBalance: e.targetCents,
      source: "seed",
    })),
  });
}

/**
 * Drop all envelopes + audit logs for the user and re-insert the seed
 * envelopes. Used by the /api/reset-seed admin endpoint when test
 * drift corrupts the live state.
 *
 * Cluster 5.2.6 widget switch: the re-inserted rows are tagged with
 * `source="seed"` so the production read filter stays consistent.
 */
export async function resetUserEnvelopesToSeed(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { userId } });
    await tx.envelope.deleteMany({ where: { userId } });
    await tx.envelope.createMany({
      data: ENVELOPES_SEED.map((e) => ({
        id: e.id,
        userId,
        name: e.name,
        planet: e.planet,
        currentBalance: e.currentCents,
        targetBalance: e.targetCents,
        source: "seed",
      })),
    });
  });
}

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
  /** TRANSFER (auto money movement) or MILESTONE (destination amount).
   *  Mirrors the Prisma `GoalKind` enum. */
  kind: GoalKindSeed;
  /** EMERGENCY = canonical Emergency Fund. INVEST = long-horizon
   *  investment goal. Null for custom goals. The /goals page filters
   *  by `?kind=emergency|invest` which maps to this field. */
  goalType: "EMERGENCY" | "INVEST" | null;
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
      kind: g.kind,
      goalType: g.goalType ?? null,
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

/**
 * Add a new goal to the live store. Used by the "+ New goal" form
 * (Cluster 1.10). If the new goal is marked `isPrimary`, demote
 * any current primary goal to `isPrimary: false` (only one goal
 * can be the top-priority hero on the dashboard).
 */
export function addGoal(input: {
  name: string;
  description: string;
  planet: PlanetId;
  targetCents: number;
  currentCents: number;
  targetDate: Date;
  envelopeId: string | null;
  perPaycheckCents: number;
  isPrimary: boolean;
  goalType?: "EMERGENCY" | "INVEST" | null;
}): { ok: boolean; reason?: string; goal?: Goal } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Name is required." };
  }
  if (!Number.isFinite(input.targetCents) || input.targetCents <= 0) {
    return { ok: false, reason: "Target must be greater than $0." };
  }
  if (!Number.isFinite(input.perPaycheckCents) || input.perPaycheckCents < 0) {
    return { ok: false, reason: "Per-paycheck amount must be $0 or more." };
  }
  const s = getState();

  // If the new goal is primary, demote any current primary
  if (input.isPrimary) {
    for (const g of s.goals) {
      g.isPrimary = false;
    }
  }

  const goal: Goal = {
    id: nextId("goal"),
    name: input.name.trim(),
    description: input.description.trim(),
    planet: input.planet,
    targetCents: Math.round(input.targetCents),
    currentCents: Math.max(0, Math.round(input.currentCents)),
    targetDate: input.targetDate,
    envelopeId: input.envelopeId,
    perPaycheckCents: Math.max(0, Math.round(input.perPaycheckCents)),
    isPrimary: input.isPrimary,
    kind: "MILESTONE", // default; UI can flip to TRANSFER when the user arms a sweep rule
    goalType: input.goalType ?? null,
  };
  s.goals.push(goal);

  s.audit.unshift({
    id: nextId("aud-goal"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Added goal "${goal.name}" (target $${(goal.targetCents / 100).toFixed(2)}).`,
    meta: { goalId: goal.id, targetCents: goal.targetCents },
  });

  return { ok: true, goal };
}

/**
 * Update an existing goal's name, description, target, per-paycheck,
 * target date, planet, vessel link, and primary flag. Used by the
 * Edit Goal form at /goals/[id]/edit (Cluster 1.10).
 *
 * currentCents is preserved (modifying the target doesn't reset
 * progress; the user is just changing the destination, not the
 * journey so far). If `isPrimary` is set, demote any other primary.
 */
export function updateGoal(
  goalId: string,
  input: {
    name: string;
    description: string;
    planet: PlanetId;
    targetCents: number;
    targetDate: Date;
    envelopeId: string | null;
    perPaycheckCents: number;
    isPrimary: boolean;
  },
): { ok: boolean; reason?: string; goal?: Goal } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Name is required." };
  }
  if (!Number.isFinite(input.targetCents) || input.targetCents <= 0) {
    return { ok: false, reason: "Target must be greater than $0." };
  }
  if (!Number.isFinite(input.perPaycheckCents) || input.perPaycheckCents < 0) {
    return { ok: false, reason: "Per-paycheck amount must be $0 or more." };
  }
  const s = getState();
  const goal = s.goals.find((g) => g.id === goalId);
  if (!goal) return { ok: false, reason: "Goal not found." };

  // If making this one primary, demote others first
  if (input.isPrimary && !goal.isPrimary) {
    for (const g of s.goals) {
      if (g.id !== goalId) g.isPrimary = false;
    }
  }

  const before = {
    targetCents: goal.targetCents,
    perPaycheckCents: goal.perPaycheckCents,
    targetDate: goal.targetDate,
    name: goal.name,
  };
  goal.name = input.name.trim();
  goal.description = input.description.trim();
  goal.planet = input.planet;
  goal.targetCents = Math.round(input.targetCents);
  goal.targetDate = input.targetDate;
  goal.envelopeId = input.envelopeId;
  goal.perPaycheckCents = Math.max(0, Math.round(input.perPaycheckCents));
  goal.isPrimary = input.isPrimary;

  s.audit.unshift({
    id: nextId("aud-goal"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Updated goal "${goal.name}".`,
    meta: {
      goalId,
      before,
      after: {
        targetCents: goal.targetCents,
        perPaycheckCents: goal.perPaycheckCents,
        targetDate: goal.targetDate,
        name: goal.name,
      },
    },
  });

  return { ok: true, goal: { ...goal } };
}

/**
 * Update an existing envelope's name and target. Used by the Edit
 * Envelope form at /envelopes/[id]/edit and the focused Edit Target
 * form at /envelopes/[id]/edit-target (Cluster 1.10).
 *
 * currentCents is preserved — the user is changing the destination,
 * not resetting what's already in the vessel.
 */
export function updateEnvelope(
  envelopeId: string,
  input: { name: string; targetCents: number },
): { ok: boolean; reason?: string; envelope?: Envelope } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Name is required." };
  }
  if (!Number.isFinite(input.targetCents) || input.targetCents < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }
  const s = getState();
  const env = s.envelopes.find((e) => e.id === envelopeId);
  if (!env) return { ok: false, reason: "Envelope not found." };

  const before = { name: env.name, targetCents: env.targetCents };
  env.name = input.name.trim();
  env.targetCents = Math.round(input.targetCents);

  s.audit.unshift({
    id: nextId("aud-env"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Updated envelope "${env.name}" (target $${(env.targetCents / 100).toFixed(2)}).`,
    meta: { envelopeId, before, after: { name: env.name, targetCents: env.targetCents } },
  });

  return { ok: true, envelope: { ...env } };
}

/**
 * Atomic envelope rebalancing — Prisma cutover.
 *
 * Move `transferCents` from `sourceEnvelopeId` to `destinationEnvelopeId`
 * in a single safe operation. The two balance mutations happen together
 * inside a Prisma `$transaction` — if any check fails, the whole
 * transaction rolls back and neither balance is applied.
 *
 * Cluster 3.x cutover (2026-08-24): the engine is now durable. The
 * rebalance writes through to the `Envelope` table and drops a
 * matching `AuditLog` row in the same transaction. After the
 * transaction commits, the new balances are mirrored to the in-memory
 * store so existing reads (which still go through the in-memory array)
 * see the change immediately.
 *
 * The UI return shape is unchanged from the pre-Prisma version:
 * `{ ok, reason?, source?, destination?, audit? }` where `source` /
 * `destination` use the in-memory store's `currentCents` field name
 * (mapped from the DB's `currentBalance`).
 *
 * Status state (OVER / WATCH / CALM) is derived from
 * `currentBalance / targetBalance` on the next read, not stored. The
 * AllocationFeed and Status pill pick up the new state automatically.
 */
export async function rebalanceEnvelopes(
  userId: string,
  sourceEnvelopeId: string,
  destinationEnvelopeId: string,
  transferCents: number,
): Promise<{
  ok: boolean;
  reason?: string;
  source?: Envelope;
  destination?: Envelope;
  audit?: AuditLogEntry;
}> {
  // 1. Validate input shape.
  if (!Number.isInteger(transferCents) || transferCents <= 0) {
    return { ok: false, reason: "Transfer amount must be a positive integer (cents)." };
  }
  if (sourceEnvelopeId === destinationEnvelopeId) {
    return { ok: false, reason: "Source and destination must be different envelopes." };
  }

  // 2. Ensure the user has the 7 default envelopes in the DB.
  // Idempotent — no-op once the user has any envelopes.
  await ensureUserEnvelopesSeeded(userId);

  // 3. Atomic Prisma transaction. The callback form (`$transaction
  // (async (tx) => ...)`) gives snapshot isolation: any concurrent
  // transaction that races against this one will be serialized, and
  // if anything throws inside the callback, the whole transaction
  // rolls back — neither envelope moves, no audit row is written.
  const result = await prisma.$transaction(async (tx) => {
    const source = await tx.envelope.findUnique({
      where: { id: sourceEnvelopeId },
    });
    const dest = await tx.envelope.findUnique({
      where: { id: destinationEnvelopeId },
    });
    if (!source || !dest) {
      return { ok: false as const, reason: "One or both envelopes were not found." };
    }
    if (source.userId !== userId || dest.userId !== userId) {
      return { ok: false as const, reason: "Envelopes do not belong to the current user." };
    }
    if (source.currentBalance < transferCents) {
      return {
        ok: false as const,
        reason: "Source envelope has insufficient balance for the transfer.",
      };
    }

    // 4. Mutate both balances. Prisma's increment/decrement helpers
    // do the math in SQL — race-safe even under concurrent requests.
    await tx.envelope.update({
      where: { id: sourceEnvelopeId },
      data: { currentBalance: { decrement: transferCents } },
    });
    await tx.envelope.update({
      where: { id: destinationEnvelopeId },
      data: { currentBalance: { increment: transferCents } },
    });

    // 5. Audit row in the same transaction. The Prisma schema uses
    // `actionType` (string) and `payload` (JSON-encoded string, since
    // SQLite has no JSONB). We serialize the transfer details so the
    // audit log can be browsed later.
    const auditRow = await tx.auditLog.create({
      data: {
        userId,
        actionType: "envelope_rebalance",
        payload: JSON.stringify({
          sourceEnvelopeId,
          destinationEnvelopeId,
          transferCents,
          sourceBalanceAfterCents: source.currentBalance - transferCents,
          destinationBalanceAfterCents: dest.currentBalance + transferCents,
          at: new Date().toISOString(),
        }),
        aiTierAtTime: 1,
      },
    });

    return {
      ok: true as const,
      source: { ...source, currentBalance: source.currentBalance - transferCents },
      dest: { ...dest, currentBalance: dest.currentBalance + transferCents },
      audit: auditRow,
    };
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  // 6. Mirror to the in-memory store so the rest of the app (which
  // still reads from the in-memory array) sees the new state on the
  // next render. This is a one-line write per envelope — no read
  // contention because rebalance is per-user.
  const inMemory = getState();
  const srcMem = inMemory.envelopes.find((e) => e.id === sourceEnvelopeId);
  const dstMem = inMemory.envelopes.find((e) => e.id === destinationEnvelopeId);
  if (srcMem) srcMem.currentCents = result.source.currentBalance;
  if (dstMem) dstMem.currentCents = result.dest.currentBalance;

  // 7. Build the AuditLogEntry shape the UI expects (a thin wrapper
  // over the Prisma row so existing call sites keep working).
  const audit: AuditLogEntry = {
    id: result.audit.id,
    at: result.audit.createdAt,
    kind: "manual-adjust",
    summary: `Rebalanced ${formatCentsInline(transferCents)} from "${result.source.name}" → "${result.dest.name}".`,
    meta: {
      sourceEnvelopeId: result.source.id,
      destinationEnvelopeId: result.dest.id,
      transferCents,
      sourceBalanceAfterCents: result.source.currentBalance,
      destinationBalanceAfterCents: result.dest.currentBalance,
    },
  };

  return {
    ok: true,
    source: { ...srcMem!, currentCents: result.source.currentBalance },
    destination: { ...dstMem!, currentCents: result.dest.currentBalance },
    audit,
  };
}

/**
 * Add a new envelope (vessel) to the live store. Used by the
 * "+ New envelope" form on /envelopes/new (Cluster 1.10).
 * currentCents starts at 0 — the new vessel begins empty.
 */
export function addEnvelope(input: {
  name: string;
  planet: PlanetId;
  targetCents: number;
}): { ok: boolean; reason?: string; envelope?: Envelope } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Give the vessel a name." };
  }
  if (!Number.isFinite(input.targetCents) || input.targetCents < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }
  const s = getState();

  const env: Envelope = {
    id: nextId("env"),
    name: input.name.trim(),
    planet: input.planet,
    currentCents: 0,
    targetCents: Math.round(input.targetCents),
  };
  s.envelopes.push(env);

  s.audit.unshift({
    id: nextId("aud-env"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Added envelope "${env.name}" (target $${(env.targetCents / 100).toFixed(2)}).`,
    meta: { envelopeId: env.id, targetCents: env.targetCents },
  });

  return { ok: true, envelope: { ...env } };
}

/**
 * Add a new bill to the live store. Used by the "+ Add bill"
 * button on /recurring (Cluster 1.10).
 */
export function addBill(input: {
  name: string;
  amountCents: number;
  dueDay: number;
  autopay: boolean;
  envelopeId: string | null;
}): { ok: boolean; reason?: string; bill?: Bill } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Give the bill a name." };
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents < 0) {
    return { ok: false, reason: "Amount must be $0 or more." };
  }
  if (!Number.isFinite(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return { ok: false, reason: "Due day must be between 1 and 31." };
  }
  const s = getState();
  if (input.envelopeId && !s.envelopes.find((e) => e.id === input.envelopeId)) {
    return { ok: false, reason: "Vessel not found." };
  }
  const maxSort = s.bills.reduce((m, b) => Math.max(m, b.sortOrder), 0);

  const bill: Bill = {
    id: nextId("bill"),
    name: input.name.trim(),
    amountCents: Math.round(input.amountCents),
    dueDay: Math.floor(input.dueDay),
    autopay: input.autopay,
    paidAt: null,
    envelopeId: input.envelopeId,
    accountId: null,
    sortOrder: maxSort + 1,
  };
  s.bills.push(bill);

  s.audit.unshift({
    id: nextId("aud-bill"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Added bill "${bill.name}" ($${(bill.amountCents / 100).toFixed(2)} due day ${bill.dueDay}).`,
    meta: { billId: bill.id, amountCents: bill.amountCents, dueDay: bill.dueDay },
  });

  return { ok: true, bill: { ...bill } };
}

/**
 * Cluster 5.2.6 widget switch — durable Prisma-backed bill create.
 *
 * Same contract as `addBill` (above) but writes through to the
 * `Bill` table with `source="user"` so the new bill shows up in
 * the /recurring + dashboard + /calendar widgets (which now read
 * from Prisma). The in-memory mirror is kept in sync so the
 * legacy `PaycheckBreakdown` engine still computes correctly.
 */
export async function addBillDb(
  userId: string,
  input: {
    name: string;
    amountCents: number;
    dueDay: number;
    autopay: boolean;
    envelopeId: string | null;
  },
): Promise<{ ok: boolean; reason?: string; bill?: Bill }> {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Give the bill a name." };
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents < 0) {
    return { ok: false, reason: "Amount must be $0 or more." };
  }
  if (!Number.isFinite(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return { ok: false, reason: "Due day must be between 1 and 31." };
  }

  // Compute next sortOrder based on the DB rows.
  const maxSortRow = await prisma.bill.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (maxSortRow?.sortOrder ?? 0) + 1;

  const created = await prisma.bill.create({
    data: {
      userId,
      name: input.name.trim(),
      amountCents: Math.round(input.amountCents),
      // User-entered bills are always monthly for v1. A future
      // cluster can extend the form to take a cadence.
      cadence: "monthly",
      dueDay: Math.floor(input.dueDay),
      autopay: input.autopay,
      paidAt: null,
      source: "user",
      envelopeId: input.envelopeId,
      sortOrder,
    },
  });

  // Mirror to in-memory store so the legacy engine still works.
  const s = getState();
  const mirror: Bill = {
    id: created.id,
    name: created.name,
    amountCents: created.amountCents,
    dueDay: created.dueDay ?? 0,
    autopay: created.autopay,
    paidAt: created.paidAt ? created.paidAt.toISOString() : null,
    envelopeId: created.envelopeId,
    accountId: created.accountId,
    sortOrder: created.sortOrder,
  };
  s.bills.push(mirror);

  s.audit.unshift({
    id: nextId("aud-bill"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Added bill "${mirror.name}" ($${(mirror.amountCents / 100).toFixed(2)} due day ${mirror.dueDay}).`,
    meta: { billId: mirror.id, amountCents: mirror.amountCents, dueDay: mirror.dueDay, via: "db" },
  });

  return { ok: true, bill: { ...mirror } };
}

/**
 * Add a new debt to the live store. Used by the "+ Add debt"
 * button on /debts (Cluster 1.10).
 */
export function addDebt(input: {
  name: string;
  balanceCents: number;
  aprBps: number;
  minPaymentCents: number;
  dueDay: number;
}): { ok: boolean; reason?: string; debt?: Debt } {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, reason: "Give the debt a name." };
  }
  if (!Number.isFinite(input.balanceCents) || input.balanceCents <= 0) {
    return { ok: false, reason: "Balance must be greater than $0." };
  }
  if (!Number.isFinite(input.aprBps) || input.aprBps < 0 || input.aprBps > 10000) {
    // 0% to 100% APR (in bps: 0 to 10000)
    return { ok: false, reason: "APR must be between 0% and 100%." };
  }
  if (!Number.isFinite(input.minPaymentCents) || input.minPaymentCents < 0) {
    return { ok: false, reason: "Min payment must be $0 or more." };
  }
  if (!Number.isFinite(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return { ok: false, reason: "Due day must be between 1 and 31." };
  }
  const s = getState();
  const maxSort = s.debts.reduce((m, d) => Math.max(m, d.sortOrder), 0);

  const debt: Debt = {
    id: nextId("debt"),
    name: input.name.trim(),
    balanceCents: Math.round(input.balanceCents),
    originalBalanceCents: Math.round(input.balanceCents),
    aprBps: Math.round(input.aprBps),
    minPaymentCents: Math.round(input.minPaymentCents),
    dueDay: Math.floor(input.dueDay),
    accountId: null,
    sortOrder: maxSort + 1,
    isArchived: false,
  };
  s.debts.push(debt);

  s.audit.unshift({
    id: nextId("aud-debt"),
    at: new Date(),
    kind: "manual-adjust",
    summary: `Added debt "${debt.name}" ($${(debt.balanceCents / 100).toFixed(2)} @ ${(debt.aprBps / 100).toFixed(2)}% APR).`,
    meta: { debtId: debt.id, balanceCents: debt.balanceCents, aprBps: debt.aprBps },
  });

  return { ok: true, debt: { ...debt } };
}

/**
 * Add a new transaction to the live store and, if the transaction
 * reduces an envelope's balance, decrement that envelope's current
 * cents accordingly. Used by the "+ Log a transaction" form on
 * /transactions/new (Cluster 1.10).
 *
 * Form input is dollars (human-readable); the server boundary
 * converts to cents. Same pattern as the paycheck and bills actions.
 */
export function addTransaction(input: {
  payee: string;
  amountCents: number;
  envelopeId: string | null;
  date?: Date;
  isIncome?: boolean;
  source?: "user" | "allocation" | "system";
}): { ok: boolean; reason?: string; transaction?: Transaction } {
  if (!input.payee || input.payee.trim().length === 0) {
    return { ok: false, reason: "Payee is required." };
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents === 0) {
    return { ok: false, reason: "Enter an amount other than $0." };
  }
  const s = getState();
  const env = input.envelopeId
    ? s.envelopes.find((e) => e.id === input.envelopeId)
    : null;
  if (input.envelopeId && !env) {
    return { ok: false, reason: "Envelope not found." };
  }

  const tx: Transaction = {
    id: nextId("tx"),
    date: input.date ?? new Date(),
    payee: input.payee.trim(),
    amountCents: input.amountCents,
    envelopeId: input.envelopeId,
    isIncome: input.isIncome ?? input.amountCents > 0,
    source: input.source ?? "user",
  };
  s.transactions.unshift(tx);

  // Reflect the spend on the envelope's current cents. Positive
  // amounts (income/refund/transfer-in) ADD to the envelope; negative
  // amounts (spends) SUBTRACT. This keeps the bar chart in sync.
  if (env) {
    env.currentCents = Math.max(0, env.currentCents + input.amountCents);
  }

  s.audit.unshift({
    id: nextId("aud-tx"),
    at: new Date(),
    kind: "manual-adjust",
    summary:
      input.amountCents >= 0
        ? `Logged ${formatCentsInline(input.amountCents)} ${input.isIncome ? "income" : "in"} to ${env?.name ?? "envelope"}: ${tx.payee}.`
        : `Logged ${formatCentsInline(Math.abs(input.amountCents))} spend from ${env?.name ?? "envelope"}: ${tx.payee}.`,
    meta: {
      txId: tx.id,
      envelopeId: tx.envelopeId,
      amountCents: tx.amountCents,
    },
  });

  return { ok: true, transaction: tx };
}



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

/**
 * Cluster 5.2.6 widget switch — durable Prisma-backed bill toggle.
 *
 * Same contract as `setBillPaid` (above) but writes through to the
 * `Bill` table so the dashboard / /recurring / /calendar widgets
 * see the new state across dev server restarts and HMR cycles.
 * The in-memory mirror is kept in sync so the legacy
 * `PaycheckBreakdown` engine (which still reads from
 * `liveBills()`) computes the right number.
 *
 * `userId` scopes the update so a stale bill id from one user
 * can't write to another user's row.
 *
 * Returns the updated bill (display shape, with `paidAt` as an
 * ISO string) or `null` if the bill wasn't found.
 */
export async function setBillPaidDb(
  userId: string,
  billId: string,
  paid: boolean,
): Promise<Bill | null> {
  const paidAt = paid ? new Date() : null;
  const updated = await prisma.bill.updateMany({
    where: { id: billId, userId },
    data: { paidAt },
  });
  if (updated.count === 0) return null;

  // Mirror to the in-memory store so the legacy read path stays
  // consistent. The BILLS_SEED ids ("bill-rent", "bill-spectrum",
  // etc.) are the same as the DB ids (we set them explicitly in
  // ensureUserBillsSeeded), so a lookup by id works.
  const s = getState();
  const memBill = s.bills.find((b) => b.id === billId);
  if (memBill) {
    memBill.paidAt = paidAt ? paidAt.toISOString() : null;
  }

  // Audit entry — same shape as the in-memory path so future
  // audit-log UIs (a future cluster) see the right summary.
  s.audit.unshift({
    id: nextId("aud-bill"),
    at: new Date(),
    kind: "manual-adjust",
    summary: paid
      ? `Marked ${memBill?.name ?? billId} as paid.`
      : `Reset ${memBill?.name ?? billId} to unpaid.`,
    meta: { billId, paid, via: "db" },
  });

  if (memBill) {
    return { ...memBill };
  }
  // Edge case: DB had the bill but the in-memory mirror doesn't.
  // Return a minimal display shape from the DB row.
  const row = await prisma.bill.findFirst({
    where: { id: billId, userId },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amountCents,
    dueDay: row.dueDay ?? 0,
    autopay: row.autopay,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    envelopeId: row.envelopeId,
    accountId: row.accountId,
    sortOrder: row.sortOrder,
  };
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
// Debt payoff engine (Cluster 1.9) — pure functions extracted to
// lib/payoff-projection.ts so client components can import without
// pulling in better-sqlite3. Re-exported here for backwards compat.
// ---------------------------------------------------------------------------

export {
  orderDebtsByMethod,
  payoffProjection,
  type PayoffMethod,
  type PayoffProjection,
  type DebtPayoffRow,
} from "./payoff-projection";

// ---------------------------------------------------------------------------
// Allocation engine — pure function, returns the plan + summary
// ---------------------------------------------------------------------------
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
