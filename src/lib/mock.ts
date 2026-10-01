/**
 * Mock data — now a thin compatibility shim over `@/lib/store`.
 *
 * Pages import these names the same way they always have:
 *   import { TODAY, PERIOD_START, PERIOD_END, NEXT_PAY_DATE } from "@/lib/mock";
 *   import { liveEnvelopes, liveGoals, liveSnapshot, … } from "@/lib/mock";
 *
 * Each export is a fresh read from the live in-memory store, so when
 * the auto-allocate engine mutates balances, every page picks up the
 * change on its next render.
 *
 * The shapes here are the legacy "display" shapes (e.g. `current` not
 * `currentCents`); they're mapped from the store's normalized form.
 *
 * Store reads are per-user: every `live*` function takes the
 * authenticated `userId` and hands it to the store, which keeps one
 * state object per user. There is deliberately no module-level
 * snapshot of the store — a value read at import time has no session
 * to scope it to, so it would leak one user's data to the next.
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
/**
 * Period length in days, per `PaySchedule.cadence`.
 *
 * Deliberately day-based rather than calendar-aware. A "monthly"
 * period as 30 days drifts against real months, but the alternative
 * (clamping to month length) makes the window length depend on which
 * month you happen to land in, which is worse for a countdown the user
 * reads every day. 30 days is the conventional approximation and keeps
 * `endDate - startDate` constant, so the roll-forward below is exact.
 */
const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  semi_monthly: 15,
  monthly: 30,
};

const DEFAULT_PERIOD_DAYS = 14;

function periodDaysFor(cadence: string | null | undefined): number {
  if (!cadence) return DEFAULT_PERIOD_DAYS;
  return CADENCE_DAYS[cadence] ?? DEFAULT_PERIOD_DAYS;
}

export interface PayPeriodSnapshot {
  startDate: Date;
  endDate: Date;
  /** True when this came from the PayPeriod table; false when from constants. */
  fromDb: boolean;
}

export async function getCurrentPayPeriod(): Promise<PayPeriodSnapshot> {
  const now = new Date();
  try {
    const row = await prisma.payPeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: "desc" },
    });
    if (row) {
      // The active row can expire. The app used to ship one row seeded
      // to a fixed window and nothing ever advanced it, so every date
      // on the dashboard silently froze at the end of that period.
      // Roll the window forward off the user's pay cadence until it
      // actually contains "now", then persist it so every reader sees
      // the same window.
      if (row.endDate.getTime() <= now.getTime()) {
        const rolled = await rollForward(row, now);
        if (rolled) return rolled;
      }
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

/**
 * Advance an expired PayPeriod forward, one cadence-length at a time,
 * until it contains `now`, and persist the result.
 *
 * Each step is exact: the new start is the old end (the schema stores
 * `endDate` as EXCLUSIVE), and the new end is that plus one period. So
 * a user who has not opened the app for six weeks lands on the correct
 * current window rather than one period after the original.
 *
 * Returns null if the write fails or the row vanished underneath us —
 * the caller then falls back to the un-rolled row, which is stale but
 * not wrong-shaped. A read path should never throw because a period
 * needs advancing.
 */
async function rollForward(
  row: { id: string; startDate: Date; endDate: Date },
  now: Date,
): Promise<PayPeriodSnapshot | null> {
  try {
    const schedule = await prisma.paySchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    const days = periodDaysFor(schedule?.cadence);

    // The caller only calls this when `row.endDate <= now`, so the very
    // first advance ALWAYS happens — that advance is what brings the
    // window back over the present. Counting it as step 1 matters: an
    // earlier version started steps at 0 and bailed out with
    // "nothing to do" whenever that first advance already overshot
    // `now`, which is the common case for a period that lapsed by less
    // than one cadence length. That left the row expired forever.
    let start = row.endDate;
    let end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    let steps = 1;
    while (end.getTime() <= now.getTime() && steps < 400) {
      start = end;
      end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      steps += 1;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payPeriod.update({
        where: { id: row.id },
        data: { startDate: start, endDate: end, isActive: true },
      });
      return true;
    });

    if (!updated) return null;
    return { startDate: start, endDate: end, fromDb: true };
  } catch (err) {
    console.warn("getCurrentPayPeriod: roll-forward failed, using stale row:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Re-export derived snapshot
// ---------------------------------------------------------------------------

// NOTE: the store snapshot used to be frozen into a module-level
// `export const SNAPSHOT`. It can't be anymore — a read taken at
// import time has no session, so it would belong to whichever user
// happened to load the module first. `liveSnapshot(userId)` is the
// per-user replacement.

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
    // Cluster 7.48/7.49/7.50 depend on this and it was missing here, so
    // liveDebts() handed the page a debt with no credit limit. DebtCard
    // reads `debt.creditLimitCents ?? null` and falls back to null when it
    // is missing, which made utilizationPct null for EVERY debt — so the
    // "% used" caption, the utilization gauge and the rainbow gradient
    // never rendered for any user. The source-regex smokes could not see
    // it because they only read DebtCard's source, never the value.
    creditLimitCents: d.creditLimitCents,
  };
}

/**
 * Live reads from the store, scoped to the authenticated user. These
 * are plain function calls, so they are re-evaluated on every
 * server-component render. The result of the last read is what the
 * page sees — not a stale module-level constant.
 *
 * The `ENVELOPES` / `GOALS` / `TRANSACTIONS` / `ACCOUNT` / `BILLS` /
 * `DEBTS` module-level exports that used to sit here are gone: a read
 * taken at import time has no session to scope it to, so it belonged
 * to whichever user loaded the module first. The `live*` functions
 * below are the per-user replacement.
 */
export function liveEnvelopes(userId: string) {
  return readEnvelopes(userId).map(toDisplayEnvelope);
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
  // No auto-seed. This is a READ, and a read must not write. It used to
  // call `ensureUserEnvelopesSeeded` here, which meant that any account
  // with zero envelopes was handed the demo persona's vessels and
  // balances — Rent $800, Groceries $612 — on its very first page load,
  // with nothing in the UI saying so and no way to opt out that
  // actually held. A real account now reads back as empty until the
  // user (or the setup wizard) creates something.
  //
  // Creating rows is explicit: the setup wizard step for envelopes, and
  // `POST /api/reset-seed` / `scripts/clear-demo-data` for tooling.
  const rows = await prisma.envelope.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet as PlanetId,
    current: e.currentBalance,
    target: e.targetBalance,
  }));
}
export function liveGoals(userId: string) {
  return readGoals(userId).map(toDisplayGoal);
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
  // No auto-seed — see `liveEnvelopesFromDb` for the reasoning.
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
export function liveTransactions(userId: string) {
  return readTransactions(userId).map(toDisplayTransaction);
}
export function liveSnapshot(userId: string) {
  return readSnapshot(userId);
}
export function liveAccount(userId: string) {
  return toDisplayAccount(readAccount(userId));
}
export function liveBills(userId: string) {
  return readBills(userId).map(toDisplayBill);
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
  // No auto-seed, for the same reason as `liveEnvelopesFromDb`.
  //
  // This one is worse than it looks: BILLS_SEED rows carry an
  // `envelopeId` pointing at the seeded vessel ids. With the envelope
  // seeder removed but this one left running, a cleared account regrows
  // 6 bills whose envelope ids resolve to nothing, and the dashboard's
  // `ENVELOPES.find(e => e.id === b.envelopeId)` hands back undefined
  // for every one of them — a 500 on the root page.
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
export function liveDebts(userId: string) {
  return readDebts(userId).map(toDisplayDebt);
}

/**
 * Durable debt read. This is the one `/debts` uses.
 *
 * The old `liveDebts` read `globalThis.__COMPASS_STORE__`, which lives
 * inside the dev-server process: debts rendered, and disappeared on
 * restart. Anything a user entered via `/debts/new` went into the same
 * store, so a debt the user had just saved vanished on refresh.
 *
 * No auto-seed, for the same reason as `liveEnvelopesFromDb`: a reader
 * that invents rows can leave them pointing at cross-references that no
 * longer exist. The seeder is `ensureUserDebtsSeeded` in
 * `./seed-debts.ts`, called from `/api/reset-seed` and from the test
 * fixture. A user with no debt rows gets a real empty state, not a 500
 * and not an invented set.
 */
export async function liveDebtsFromDb(userId: string) {
  const rows = await prisma.debt.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((d) => ({
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
    // Carried across deliberately. DebtCard reads
    // `debt.creditLimitCents ?? null` and derives utilizationPct from
    // it; dropping this key is exactly the bug that kept Clusters
    // 7.48/7.49 from ever rendering.
    //
    // `?? undefined` normalises the storage detail: the column is
    // nullable so it yields `null`, while the `Debt` contract has
    // always used an optional `creditLimitCents?: number`. Both mean
    // "no limit" and DebtCard's `?? null` accepts either, so the
    // boundary is where they meet rather than widening the type.
    creditLimitCents: d.creditLimitCents ?? undefined,
  }));
}
export function livePlan(userId: string) {
  return readPlan(userId);
}

// ---------------------------------------------------------------------------
// Cluster 5.2.6 widget switch — DB-backed account reads.
//
// The /accounts page reads from the in-memory `ACCOUNT_SEED` (via
// `liveAccount()`). After this cluster it reads from the Prisma
// `Account` table.
//
// The seeder (`ensureUserAccountsSeeded` in `./seed-accounts.ts`)
// runs lazily on the first call per user so a fresh user who hits
// the /accounts page directly still gets the 1 canonical row
// migrated.
//
// The schema distinguishes the canonical seed account
// (`source = "seed"`) from the onboarding projection's accounts
// (`name startsWith "[identity] "`). The page surfaces both
// lists — the canonical one as the primary "your money lives
// here" card, the projection rows as a separate "from the chat"
// section. The new function returns both lists so the page can
// render them.
//
// The legacy `liveAccount()` (in-memory) is kept for non-widget
// code paths that still depend on it (e.g. the SNAPSHOT.netWorthCents
// read derives from the in-memory account's balance). Those callers
// are out of scope for this cluster — the snapshot is still
// in-memory because the Transaction model isn't migrated.
// ---------------------------------------------------------------------------

/**
 * Read the user's accounts from the Prisma `Account` table.
 * Idempotently seeds the canonical ACCOUNT_SEED row on first call.
 *
 * Returns an object with two lists:
 *   - `canonical`: the 1 seed account (or empty if not seeded —
 *     shouldn't happen in practice because the seeder runs first)
 *   - `projected`: the 0+ `[identity] ` accounts from the
 *     onboarding projection (income, assets, debts that the user
 *     shared with the chat)
 *
 * Both lists are returned in `sortOrder: asc` order. The page
 * renders the canonical as the primary card and the projected
 * as a secondary list.
 */
export async function liveAccountsFromDb(userId: string) {
  // No auto-seed. A read must not write: a real account that has added
  // nothing should read back as empty, not as a fictional "Chase
  // Checking" it never created. Demo data belongs on the marketing
  // side of the product, not inside someone's budget. Seeding is
  // explicit now — the setup wizard and `scripts/clear-demo-data` /
  // `POST /api/reset-seed` are the only paths that create rows.
  const rows = await prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const canonical: Array<{
    id: string;
    name: string;
    mask: string | null;
    institution: string | null;
    type: string;
    balanceCents: number;
    source: "seed" | "user" | "identity";
  }> = [];
  const projected: typeof canonical = [];
  for (const r of rows) {
    const entry = {
      id: r.id,
      name: r.name,
      mask: r.mask,
      institution: r.institution,
      type: r.type,
      balanceCents: r.currentBalance,
      source: r.source as "seed" | "user" | "identity",
    };
    // The projection doesn't set `source` today — a follow-up
    // backfill pass will mark those rows source="identity". For
    // v1 we discriminate by the `[identity] ` name prefix, which
    // wins over `source` (a projection row with source="seed"
    // still belongs in the projected list, not canonical).
    if (r.name.startsWith("[identity] ")) {
      projected.push(entry);
    } else if (entry.source === "seed") {
      canonical.push(entry);
    }
    // Future "user" rows would land in a third list — not used in v1.
  }
  return { canonical, projected };
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
  // No auto-seed — see `liveEnvelopesFromDb` for the reasoning.
  //
  // This was the one that actually crashed the dashboard on an empty
  // account. `ensureUserAllocationSeeded` inserts AllocationRules whose
  // `envelopeId` points at the seeded vessel ids, so with the envelopes
  // gone the insert fails on `AllocationRule_envelopeId_fkey` and the
  // whole render 500s. A read must not write, and certainly must not
  // write something that depends on rows it did not create.
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
    // An account with no allocation plan is a normal state, not a bug:
    // a new user has not set one up, and a deliberate clear leaves none.
    // This used to throw — the comment claimed "the seeder just ran, so
    // this shouldn't happen" — which was true only while the read path
    // auto-seeded. Removing that auto-seed made the assumption false and
    // turned every empty account's dashboard into a 500.
    //
    // Return an unarmed plan with no rules so callers render an empty
    // state instead of crashing.
    return {
      id: null,
      strategy: "zero-based" as const,
      isArmed: false,
      rules: [],
    };
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
