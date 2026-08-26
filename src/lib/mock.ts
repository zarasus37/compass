/**
 * Mock data — now a thin compatibility shim over `@/lib/store`.
 *
 * Pages import these names the same way they always have:
 *   import { ENVELOPES, GOALS, TRANSACTIONS, ACCOUNT, SNAPSHOT,
 *            TODAY, PERIOD_START, PERIOD_END, NEXT_PAY_DATE } from "@/lib/mock";
 *
 * Each export is a fresh read from the live in-memory store, so when
 * the auto-allocate engine mutates balances, every page picks up the
 * change on its next render.
 *
 * The shapes here are the legacy "display" shapes (e.g. `current` not
 * `currentCents`); they're mapped from the store's normalized form.
 *
 * When the real Prisma queries land (Cluster 2), this file becomes
 * the swap point: replace each function body with a Prisma call.
 */

import {
  readEnvelopes,
  readGoals,
  readTransactions,
  readAccount,
  readBills,
  readDebts,
  readSnapshot,
  readPlan,
  ensureUserEnvelopesSeeded,
  type Envelope,
  type Goal,
  type Transaction,
  type Bill,
  type Debt,
  type PlanetId,
} from "./store";
import {
  TODAY,
  PERIOD_START,
  PERIOD_END,
  NEXT_PAY_DATE,
} from "./mock-seed";
import { prisma } from "@/server/db";

// ---------------------------------------------------------------------------
// Re-export date constants
// ---------------------------------------------------------------------------

export { TODAY, PERIOD_START, PERIOD_END, NEXT_PAY_DATE };

/**
 * PayPeriod snapshot — read from Prisma (PayPeriod table) with a
 * fallback to the PERIOD_START / PERIOD_END constants. The TopAppBar
 * uses this to render the "CYCLE" chip ("AUG 15 ↔ AUG 29") and to
 * compute the day-of-period.
 *
 * Why fallback: the v1 mock-seed.ts defines the period as constants
 * for the case where the PayPeriod table is empty. Production users
 * will have at least one active row seeded; the fallback just keeps
 * the dev experience smooth before the seed step runs.
 */
export interface PayPeriodSnapshot {
  startDate: Date;
  endDate: Date;
  /** True when this came from the PayPeriod table; false when from constants. */
  fromDb: boolean;
}

export async function getCurrentPayPeriod(): Promise<PayPeriodSnapshot> {
  try {
    const row = await prisma.payPeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: "desc" },
    });
    if (row) {
      return {
        startDate: row.startDate,
        endDate: row.endDate,
        fromDb: true,
      };
    }
  } catch (err) {
    // If the table doesn't exist yet or the DB is unreachable, fall
    // back to the constants. The layout will still render something
    // sensible.
    console.warn("getCurrentPayPeriod: DB read failed, using constants:", err);
  }
  return {
    startDate: PERIOD_START,
    endDate: PERIOD_END,
    fromDb: false,
  };
}

// ---------------------------------------------------------------------------
// Re-export derived snapshot
// ---------------------------------------------------------------------------

export const SNAPSHOT = readSnapshot();

// ---------------------------------------------------------------------------
// Re-export store data in the legacy display shape
// ---------------------------------------------------------------------------

function toDisplayEnvelope(e: Envelope) {
  return {
    id: e.id,
    name: e.name,
    planet: e.planet as PlanetId,
    current: e.currentCents,
    target: e.targetCents,
  };
}

function toDisplayGoal(g: Goal) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    planet: g.planet as PlanetId,
    targetCents: g.targetCents,
    currentCents: g.currentCents,
    targetDate: g.targetDate,
    envelopeId: g.envelopeId,
    perPaycheckCents: g.perPaycheckCents,
    isPrimary: g.isPrimary,
    kind: g.kind,
    goalType: g.goalType ?? null,
  };
}

function toDisplayTransaction(t: Transaction) {
  return {
    id: t.id,
    date: t.date,
    payee: t.payee,
    amountCents: t.amountCents,
    envelope: t.envelopeId,
    envelopeId: t.envelopeId,
    isAuto: t.isAuto,
    isIncome: t.isIncome,
    isPrimaMateria: t.isPrimaMateria,
    source: t.source,
  };
}

function toDisplayAccount(a: ReturnType<typeof readAccount>) {
  return {
    id: a.id,
    name: a.name,
    mask: a.mask,
    institution: a.institution,
    type: a.type,
    balanceCents: a.balanceCents,
  };
}

function toDisplayBill(b: Bill) {
  return {
    id: b.id,
    name: b.name,
    amountCents: b.amountCents,
    dueDay: b.dueDay,
    autopay: b.autopay,
    paidAt: b.paidAt,
    envelopeId: b.envelopeId,
    accountId: b.accountId,
    sortOrder: b.sortOrder,
  };
}

function toDisplayDebt(d: Debt) {
  return {
    id: d.id,
    name: d.name,
    balanceCents: d.balanceCents,
    originalBalanceCents: d.originalBalanceCents,
    aprBps: d.aprBps,
    minPaymentCents: d.minPaymentCents,
    dueDay: d.dueDay,
    accountId: d.accountId,
    sortOrder: d.sortOrder,
    isArchived: d.isArchived,
  };
}

/**
 * Live reads from the store. These are plain function calls, so they
 * are re-evaluated on every server-component render. The result of the
 * last read is what the page sees — not a stale module-level constant.
 */
export const ENVELOPES = readEnvelopes().map(toDisplayEnvelope);
export const GOALS = readGoals().map(toDisplayGoal);
export const TRANSACTIONS = readTransactions().map(toDisplayTransaction);
export const ACCOUNT = toDisplayAccount(readAccount());
export const BILLS = readBills().map(toDisplayBill);
export const DEBTS = readDebts().map(toDisplayDebt);

// ---------------------------------------------------------------------------
// Live re-readers — call these inside a server component if you want to
// guarantee a fresh fetch (e.g. after a server action mutation).
// ---------------------------------------------------------------------------

export function liveEnvelopes() {
  return readEnvelopes().map(toDisplayEnvelope);
}

// ---------------------------------------------------------------------------
// Cluster 5.2.6 widget switch — DB-backed envelope reads.
//
// The /envelopes page, dashboard "Envelope Status" + "Next Step"
// cards, /period vessel feed, /allocation envelopes list, /insights
// "Every envelope" row, and the /goals + /recurring + /debts page
// filters all read from the in-memory `ENVELOPES_SEED` (via
// `liveEnvelopes()`). After this cluster they read from the
// Prisma `Envelope` table.
//
// The seeder (`ensureUserEnvelopesSeeded` in `./store.ts`) runs
// lazily on the rebalance engine; the read function below also
// runs it lazily on first call for safety (so a fresh user who
// hits the /envelopes page directly still gets the 7 canonical
// vessels).
// ---------------------------------------------------------------------------

/**
 * Read the user's envelopes from the Prisma `Envelope` table.
 * Idempotently seeds the canonical 7 vessels on first call so
 * the page has data immediately. Returns the same display shape
 * as `liveEnvelopes()` so page components can swap one import
 * for the other with no other changes.
 */
export async function liveEnvelopesFromDb(userId: string) {
  // ensureUserEnvelopesSeeded is idempotent: a no-op once the
  // user has envelopes. Calling it on every read costs one cheap
  // COUNT query.
  await ensureUserEnvelopesSeeded(userId);
  const rows = await prisma.envelope.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet as PlanetId | null,
    current: e.currentBalance,
    target: e.targetBalance,
  }));
}
export function liveGoals() {
  return readGoals().map(toDisplayGoal);
}

// ---------------------------------------------------------------------------
// Cluster 5.2.6 widget switch — DB-backed goal reads.
// ---------------------------------------------------------------------------

/**
 * Read the user's goals from the Prisma `Goal` table. Idempotently
 * seeds the canonical GOALS_SEED rows on first call so the page
 * has data immediately.
 *
 * Returns the same display shape as `liveGoals()` so page
 * components can swap one import for the other with no other
 * changes.
 */
export async function liveGoalsFromDb(userId: string) {
  const { ensureUserGoalsSeeded } = await import("./seed-goals");
  await ensureUserGoalsSeeded(userId);
  const rows = await prisma.goal.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? "",
    planet: g.planet as PlanetId | null,
    targetCents: g.targetAmount,
    currentCents: g.currentAmount,
    targetDate: g.targetDate,
    envelopeId: g.envelopeId,
    perPaycheckCents: 0, // Not in the Goal model — derived from the linked envelope's allocation rule
    isPrimary: g.isPrimary,
    kind: g.kind,
    goalType: g.goalType,
  }));
}
export function liveTransactions() {
  return readTransactions().map(toDisplayTransaction);
}
export function liveSnapshot() {
  return readSnapshot();
}
export function liveAccount() {
  return toDisplayAccount(readAccount());
}
export function liveBills() {
  return readBills().map(toDisplayBill);
}

// ---------------------------------------------------------------------------
// Cluster 5.2.6 widget switch — DB-backed bill reads.
//
// The /recurring (=/obligations?tab=bills), dashboard, and /calendar
// widgets now read from the Prisma `Bill` table instead of the
// in-memory BILLS_SEED. The seeder (`ensureUserBillsSeeded` in
// `./seed-bills.ts`) runs lazily on the first call per user so the
// first read of a fresh user gets the 6 canonical rows migrated.
//
// The legacy `liveBills()` (in-memory) is kept for non-widget code
// paths that still depend on it (e.g. the PaycheckBreakdown engine
// in store.ts which uses bill shapes to compute the 5-way split).
// Those callers are out of scope for this cluster.
// ---------------------------------------------------------------------------

/**
 * Read the user's bills from the Prisma `Bill` table. Idempotently
 * seeds the canonical BILLS_SEED rows on first call so the page has
 * data immediately.
 *
 * Returns the same display shape as `liveBills()` (the legacy
 * function), so page components can swap one import for the other
 * with no other changes.
 */
export async function liveBillsFromDb(userId: string) {
  const { ensureUserBillsSeeded } = await import("./seed-bills");
  await ensureUserBillsSeeded(userId);
  const rows = await prisma.bill.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    amountCents: b.amountCents,
    cadence: b.cadence,
    dueDay: b.dueDay ?? 0,
    autopay: b.autopay,
    // The Prisma `paidAt` is a Date | null; the legacy shape uses
    // ISO string | null so the page can compare with `b.paidAt` and
    // do `new Date(b.paidAt)` when rendering. Keep the legacy
    // contract for the page.
    paidAt: b.paidAt ? b.paidAt.toISOString() : null,
    envelopeId: b.envelopeId,
    accountId: b.accountId,
    sortOrder: b.sortOrder,
  }));
}
export function liveDebts() {
  return readDebts().map(toDisplayDebt);
}
export function livePlan() {
  return readPlan();
}

// ---------------------------------------------------------------------------
// Cluster 5.2.6 widget switch — DB-backed allocation plan reads.
//
// The /allocation page, the dashboard "Plan My Next Check" widget, and
// the Sankey ("Automation Map") all read the active plan from the
// in-memory `ALLOCATION_PLAN_SEED` (via `livePlan()`). After this
// cluster they read from the Prisma `AllocationPlan` + `AllocationRule`
// tables.
//
// The seeder (`ensureUserAllocationSeeded` in `./seed-allocation.ts`)
// runs lazily on the first call per user so a fresh user who hits the
// /allocation page directly still gets the canonical 1-plan + 7-rule
// set migrated.
//
// The schema stores rules as `(pct, fixedCents?)` — there is no
// `mode` column. The mapping between the in-memory `mode + value`
// shape (consumed by the auto-allocate engine in `store.ts`) and the
// schema is:
//
//   in-memory mode  | in-memory value | schema pct | schema fixedCents
//   ----------------|-----------------|------------|------------------
//   "percent"       | 0–100           | value      | null
//   "fixed"         | cents (>=0)     | 0          | value
//   "remainder"     | 0               | 0          | null
//
// The reverse mapping reconstructs the legacy shape so the page
// (and the engine) keep working unchanged.
//
// The legacy `livePlan()` (in-memory) is kept for non-widget code
// paths (the auto-allocate engine reads `s.plan.rules` directly).
// ---------------------------------------------------------------------------

/**
 * Read the user's allocation plan from the Prisma `AllocationPlan`
 * + `AllocationRule` tables. Idempotently seeds the canonical
 * ALLOCATION_PLAN_SEED on first call.
 *
 * Returns the same `{ id, strategy, isArmed, rules: [{ id, envelopeId,
 * mode, value, priority }] }` shape as `livePlan()` so the page
 * can swap one import for the other.
 *
 * If the user has no plan (e.g. just signed up and the seeder
 * hasn't run yet — shouldn't happen in practice because this
 * function runs the seeder first), throws a recoverable error
 * so the page can render a helpful empty state.
 */
export async function livePlanFromDb(userId: string) {
  const { ensureUserAllocationSeeded } = await import("./seed-allocation");
  await ensureUserAllocationSeeded(userId);
  const plan = await prisma.allocationPlan.findFirst({
    where: { userId, source: "seed", isArmed: true },
    include: {
      rules: { orderBy: { sortOrder: "asc" } },
    },
  });
  // Fallback: any seed plan (armed or not) — supports future "paused
  // plans" where isArmed is false but the plan still exists.
  const fallback = plan
    ? plan
    : await prisma.allocationPlan.findFirst({
        where: { userId, source: "seed" },
        include: {
          rules: { orderBy: { sortOrder: "asc" } },
        },
      });
  if (!fallback) {
    // The seeder just ran and found nothing — shouldn't happen, but
    // surface a clear error so the page can render an empty state.
    throw new Error(
      "livePlanFromDb: no seed plan found for user after seeding. This is a bug.",
    );
  }
  return {
    id: fallback.id,
    strategy: fallback.strategyId as
      | "envelope"
      | "zero-based"
      | "fifty-thirty-twenty"
      | "pay-yourself-first",
    isArmed: fallback.isArmed,
    rules: fallback.rules.map((r) => {
      // Reverse mapping: schema (pct, fixedCents) → in-memory (mode, value).
      let mode: "percent" | "fixed" | "remainder";
      let value: number;
      if (r.fixedCents !== null && r.fixedCents !== undefined) {
        mode = "fixed";
        value = r.fixedCents;
      } else if (r.pct > 0) {
        mode = "percent";
        value = r.pct;
      } else {
        mode = "remainder";
        value = 0;
      }
      return {
        id: r.id,
        envelopeId: r.envelopeId,
        mode,
        value,
        priority: r.sortOrder,
      };
    }),
  };
}
