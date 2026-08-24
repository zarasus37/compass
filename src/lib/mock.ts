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

// ---------------------------------------------------------------------------
// Re-export date constants
// ---------------------------------------------------------------------------

export { TODAY, PERIOD_START, PERIOD_END, NEXT_PAY_DATE };

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
export function liveGoals() {
  return readGoals().map(toDisplayGoal);
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
export function liveDebts() {
  return readDebts().map(toDisplayDebt);
}
export function livePlan() {
  return readPlan();
}
