/**
 * FIN-01 — Canonical financial state.
 *
 * A server-only Data Access Layer over Prisma, following the installed
 * Next.js guidance in `node_modules/next/dist/docs/01-app/02-guides/
 * data-security.md`: "a dedicated Data Access Layer… only run on the
 * server, perform authorization checks, return safe, minimal Data
 * Transfer Objects". `import "server-only"` is the enforcement, and
 * every reader returns shallow-frozen row DTOs rather than Prisma rows so a whole
 * record cannot be handed to a Client Component by accident.
 *
 * WHY THIS EXISTS
 * ---------------
 * The read surface was split-brain. Some callers read Prisma
 * (`liveEnvelopesFromDb`, `liveGoalsFromDb`, page-local queries); others
 * read `globalThis` through `src/lib/store.ts` `read*()`, which is
 * per-process and vanishes on restart. Two of the memory readers sit
 * on decision and mutation paths:
 *
 *   - `src/lib/opportunities.ts`  — produces user-facing recommendations
 *   - `src/app/(app)/envelopes/actions.ts` — a server action feeding a
 *     client dropdown
 *
 * so a stale process-local read could drive a real decision.
 *
 * WHAT THIS MODULE REFUSES TO DO
 * ------------------------------
 * * It never writes. No seeding, no materializing a pay period, no
 *   plan creation.
 * * It never falls back to `store.ts` memory or to demo/persona
 *   constants on error. That silent fallback is the defect being fixed;
 *   keeping it as an error path would preserve the bug.
 * * It never infers financial settlement. See "confirmation" below.
 * * Legacy PayPeriod rows with a NULL `userId` (the pre-tenant-scoping
 *   global rows) are excluded: the filter is `userId`, so an unowned
 *   row is simply not the caller's.
 *
 * CONFIRMATION — WHY THERE IS NO "RECEIVED" FIELD
 * ----------------------------------------------
 * `Transaction.source` is CREATION PROVENANCE — which writer produced
 * the row. `apply-paycheck.ts` writes `"recurring"` for a cron-created
 * paycheck and `"manual"` for a user-clicked one; `log-transaction.ts`
 * writes `"manual"` for a user-logged entry. None of those is evidence
 * that money arrived. `Transaction.cleared` exists in the schema but is
 * never written anywhere and defaults to `true`, so it carries no
 * information either.
 *
 * Therefore income carries `confirmation: "unknown"`. That asserts
 * neither settlement nor failure — it states that the database does not
 * know. Treating provenance as settlement is exactly the error this
 * field exists to prevent, and naming matters: a field called
 * `received` would be a claim the data cannot support. FIN-05 owns
 * explicit writer semantics plus the migration and backfill.
 */

import "server-only";
import { cache } from "react";
// Type-only imports are erased at build time, so referencing the UI's
// PlanetId union here pulls nothing from a client module into the
// server graph.
import type { PlanetId } from "@/components/alchemy/VesselGlyph";
import type { GoalType } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

/**
 * The slice of the Prisma client these reads need. Both `prisma` and a
 * transaction client satisfy it, which is what lets one query definition
 * serve both the selective readers and the snapshot aggregate.
 */
type Reader = Pick<
  Prisma.TransactionClient,
  | "envelope"
  | "goal"
  | "transaction"
  | "account"
  | "bill"
  | "debt"
  | "allocationPlan"
  | "allocationRule"
  | "payPeriod"
>;

/** Explicit outcome. `ok: false` is an error; `ok: true` with empty
 *  arrays is "this tenant has no rows" — never interchangeable. */
/**
 * STABLE error codes. These cross the DAL boundary on purpose.
 *
 * B2 (Polar, FIN-01 review): the DAL previously returned `err.message`
 * verbatim, and `queryDebtsHandler` put that string into
 * `publicView.error`, which is serialised to the LLM and reaches the
 * user. A Prisma connection error carries the database host, port, user
 * name and invocation text. None of that may leave the server.
 *
 * So the DAL returns ONE OF THESE CODES and nothing else. Only a bounded
 * diagnostic code is logged server-side.
 */
export const STATE_ERROR = {
  /** The query itself failed (connection, permission, timeout, ...). */
  READ_FAILED: "read-failed",
  /** The tenant id is unusable; no query was attempted. */
  INVALID_TENANT: "invalid-tenant-id",
} as const;

export type StateErrorCode = (typeof STATE_ERROR)[keyof typeof STATE_ERROR];

/** Explicit outcome. `ok: false` is an error; `ok: true` with empty
 *  arrays is "this tenant has no rows" — never interchangeable. */
export type StateResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StateErrorCode };

/**
 * Server-side diagnostics only. Logs a bounded Prisma code, never its
 * message, connection details, tenant id or query values.
 */
function logReadFailure(scope: string, err: unknown): void {
  // Prisma messages can embed connection credentials, tenant identifiers and
  // query values. Retain only its bounded diagnostic code in server logs.
  const code = err && typeof err === "object" && "code" in err ? err.code : null;
  const diagnostic = typeof code === "string" && /^P\d{4}$/.test(code)
    ? code
    : "unknown";
  console.error(`[financial-state] ${scope} read failed:`, diagnostic);
}

/** Thrown by normalizeTenantId; carries no user data. */
class InvalidTenantError extends Error {
  constructor(reason: string) {
    super(`${STATE_ERROR.INVALID_TENANT}: ${reason}`);
    this.name = "InvalidTenantError";
  }
}

/**
 * Reject a tenant id before Prisma can silently drop the filter.
 *
 * A real hazard, not defensive boilerplate: Prisma treats `undefined`
 * in a `where` clause as "no filter", so
 * `where: { userId: undefined }` returns EVERY user's rows rather
 * than none.
 *
 * N4 (Polar): a tenant id with surrounding spaces used to pass
 * validation but be queried UNTRIMMED, so validation and the query
 * disagreed. The TRIMMED value is returned and used for the query.
 */
function normalizeTenantId(userId: unknown): string {
  if (typeof userId !== "string") {
    throw new InvalidTenantError("expected a string");
  }
  const trimmed = userId.trim();
  if (trimmed.length === 0) {
    throw new InvalidTenantError("blank");
  }
  if (trimmed.length > 128) {
    throw new InvalidTenantError("implausible length");
  }
  if (/[\u0000-\u001f]/.test(userId)) {
    throw new InvalidTenantError("control characters");
  }
  return trimmed;
}

/**
 * Run one tenant-scoped read and map every outcome onto a stable code.
 *
 * A single funnel so the eight selective readers and the aggregate
 * cannot drift apart in how they report failure.
 */
/**
 * Exported for tests: the single failure funnel. Exporting it lets a
 * smoke induce a real failure through the real code path and assert the
 * sanitisation, rather than only grepping the source for a string.
 */
export async function read<T>(
  scope: string,
  userId: unknown,
  fn: (tenantId: string) => Promise<T>,
): Promise<StateResult<T>> {
  let tenantId: string;
  try {
    tenantId = normalizeTenantId(userId);
  } catch {
    // Not logged: an invalid tenant id can be an attack probe, and the
    // value itself must never be echoed.
    return { ok: false, error: STATE_ERROR.INVALID_TENANT };
  }
  try {
    return { ok: true, data: await fn(tenantId) };
  } catch (err) {
    logReadFailure(scope, err);
    return { ok: false, error: STATE_ERROR.READ_FAILED };
  }
}

// ── DTOs (frozen; never a raw Prisma row) ──────────────────────────

/**
 * The canonical set of planet values the `Envelope.planet` /
 * `Goal.planet` columns may hold.
 *
 * The columns are nullable in the database, while the UI models a
 * vessel's planet as a non-null union. Rather than each caller casting
 * `as PlanetId` — which asserts a planet an unassigned vessel does not
 * have — narrow through this guard, so an unassigned vessel simply has
 * no planet.
 */
const PLANET_IDS: ReadonlySet<string> = new Set([
  "sol",
  "luna",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
]);

export function isPlanetId(v: string | null | undefined): v is PlanetId {
  return typeof v === "string" && PLANET_IDS.has(v);
}

export interface EnvelopeDTO {
  readonly id: string;
  readonly name: string;
  readonly planet: string | null;
  readonly currentCents: number;
  readonly targetCents: number;
  readonly source: string;
  readonly sortOrder: number;
}

export interface GoalDTO {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly planet: string | null;
  readonly targetCents: number;
  readonly currentCents: number;
  readonly targetDate: Date | null;
  readonly envelopeId: string | null;
  readonly isPrimary: boolean;
  readonly kind: string;
  readonly goalType: GoalType | null;
}

/**
 * Transaction provenance and confirmation, kept strictly apart.
 *
 * `provenance` is the stored `source` string, verbatim. `cleared` is the
 * stored boolean, verbatim — it is never reinterpreted as settlement.
 * `confirmation` is always the literal `"unknown"` for income: the
 * schema records who wrote the row, not whether money moved.
 */
export interface TransactionDTO {
  readonly id: string;
  readonly accountId: string;
  readonly envelopeId: string | null;
  readonly amountCents: number;
  readonly date: Date;
  readonly payee: string;
  readonly notes: string | null;
  readonly source: string;
  /** Alias of `source`, named for what it actually is. */
  readonly provenance: string;
  readonly isPrimaMateria: boolean;
  readonly fromPlanId: string | null;
  readonly fromPaycheckId: string | null;
  /** Stored value, passed through untouched. Never read as "settled". */
  readonly cleared: boolean;
  /** "unknown" on income rows. See the file header. */
  readonly confirmation: "unknown";
}

export interface AccountDTO {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly currentCents: number;
  readonly institution: string | null;
  readonly mask: string | null;
  readonly source: string;
  readonly sortOrder: number;
}

export interface BillDTO {
  readonly id: string;
  readonly name: string;
  readonly amountCents: number;
  readonly cadence: string;
  readonly dueDay: number | null;
  readonly autopay: boolean;
  readonly paidAt: string | null;
  readonly envelopeId: string | null;
  readonly accountId: string | null;
  readonly sortOrder: number;
}

export interface DebtDTO {
  readonly id: string;
  readonly name: string;
  readonly balanceCents: number;
  readonly originalBalanceCents: number;
  readonly aprBps: number;
  readonly minPaymentCents: number;
  readonly dueDay: number;
  readonly accountId: string | null;
  readonly source: string;
  readonly sortOrder: number;
}

export interface AllocationPlanDTO {
  readonly id: string;
  readonly strategyId: string;
  readonly isArmed: boolean;
  readonly name: string | null;
  readonly source: string;
}

export interface AllocationRuleDTO {
  readonly id: string;
  readonly planId: string;
  readonly envelopeId: string;
  readonly pct: number;
  readonly fixedCents: number | null;
  readonly source: string;
  readonly sortOrder: number;
}

export interface PayPeriodDTO {
  readonly id: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly isActive: boolean;
}

export interface FinancialState {
  readonly envelopes: readonly EnvelopeDTO[];
  readonly goals: readonly GoalDTO[];
  readonly transactions: readonly TransactionDTO[];
  readonly accounts: readonly AccountDTO[];
  readonly bills: readonly BillDTO[];
  readonly debts: readonly DebtDTO[];
  readonly plan: AllocationPlanDTO | null;
  readonly rules: readonly AllocationRuleDTO[];
  readonly period: PayPeriodDTO | null;
}

// ── Query definitions ──────────────────────────────────────────────
// Pure functions over a Reader. Deliberately NOT exported: callers must
// go through a selective reader or the aggregate, never reach a query
// and hand it an arbitrary client.
//
// `orderBy` matches the existing DB-backed adapters exactly so display
// order is unchanged.

async function qEnvelopes(db: Reader, userId: string): Promise<EnvelopeDTO[]> {
  const rows = await db.envelope.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((e) =>
    Object.freeze({
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.currentBalance,
      targetCents: e.targetBalance,
      source: e.source,
      sortOrder: e.sortOrder,
    }),
  );
}

async function qGoals(db: Reader, userId: string): Promise<GoalDTO[]> {
  const rows = await db.goal.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((g) =>
    Object.freeze({
      id: g.id,
      name: g.name,
      description: g.description ?? "",
      planet: g.planet,
      targetCents: g.targetAmount,
      currentCents: g.currentAmount,
      targetDate: g.targetDate,
      envelopeId: g.envelopeId,
      isPrimary: g.isPrimary,
      kind: g.kind,
      goalType: g.goalType,
    }),
  );
}

async function qTransactions(
  db: Reader,
  userId: string,
): Promise<TransactionDTO[]> {
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((t) =>
    Object.freeze({
      id: t.id,
      accountId: t.accountId,
      envelopeId: t.envelopeId,
      amountCents: t.amount,
      date: t.date,
      payee: t.payee,
      notes: t.notes,
      source: t.source,
      provenance: t.source,
      isPrimaMateria: t.isPrimaMateria,
      fromPlanId: t.fromPlanId,
      fromPaycheckId: t.fromPaycheckId,
      cleared: t.cleared,
      confirmation: "unknown" as const,
    }),
  );
}

async function qAccounts(db: Reader, userId: string): Promise<AccountDTO[]> {
  const rows = await db.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((a) =>
    Object.freeze({
      id: a.id,
      name: a.name,
      type: a.type,
      currentCents: a.currentBalance,
      institution: a.institution,
      mask: a.mask,
      source: a.source,
      sortOrder: a.sortOrder,
    }),
  );
}

async function qBills(db: Reader, userId: string): Promise<BillDTO[]> {
  const rows = await db.bill.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((b) =>
    Object.freeze({
      id: b.id,
      name: b.name,
      amountCents: b.amountCents,
      cadence: b.cadence,
      // The legacy display contract uses 0 for "no due day"; Prisma
      // stores NULL. Preserved rather than "cleaned up".
      dueDay: b.dueDay ?? 0,
      autopay: b.autopay,
      // Prisma holds Date | null; the page compares with a Date and
      // calls new Date(...) on it, so the DTO keeps the ISO string.
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      envelopeId: b.envelopeId,
      accountId: b.accountId,
      sortOrder: b.sortOrder,
    }),
  );
}

async function qDebts(db: Reader, userId: string): Promise<DebtDTO[]> {
  const rows = await db.debt.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((d) =>
    Object.freeze({
      id: d.id,
      name: d.name,
      balanceCents: d.balanceCents,
      originalBalanceCents: d.originalBalanceCents,
      aprBps: d.aprBps,
      minPaymentCents: d.minPaymentCents,
      dueDay: d.dueDay ?? 0,
      accountId: d.accountId,
      source: d.source,
      sortOrder: d.sortOrder,
    }),
  );
}

async function qPlanAndRules(
  db: Reader,
  userId: string,
): Promise<{ plan: AllocationPlanDTO | null; rules: AllocationRuleDTO[] }> {
  const plan = await db.allocationPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!plan) return { plan: null, rules: [] };
  const rules = await db.allocationRule.findMany({
    where: { planId: plan.id },
    orderBy: { sortOrder: "asc" },
  });
  return {
    plan: Object.freeze({
      id: plan.id,
      strategyId: plan.strategyId,
      isArmed: plan.isArmed,
      name: plan.name,
      source: plan.source,
    }),
    rules: rules.map((r) =>
      Object.freeze({
        id: r.id,
        planId: r.planId,
        envelopeId: r.envelopeId,
        pct: r.pct,
        fixedCents: r.fixedCents,
        source: r.source,
        sortOrder: r.sortOrder,
      }),
    ),
  };
}

/**
 * The stored tenant period. Excludes legacy NULL-owner rows by
 * construction: the filter is `userId`. This is a READ. It does not
 * create, roll forward or materialize anything — that is
 * `getCurrentPayPeriod` in `src/lib/mock.ts`, a separate concern.
 */
async function qPayPeriod(db: Reader, userId: string): Promise<PayPeriodDTO | null> {
  const row = await db.payPeriod.findFirst({
    where: { isActive: true, userId },
    orderBy: { startDate: "desc" },
  });
  return row
    ? Object.freeze({
        id: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
        isActive: row.isActive,
      })
    : null;
}

// ── Selective readers ──────────────────────────────────────────────
// One `cache()` per entity, so an envelope-only consumer never loads
// transactions, goals or debts, and two components in the same request
// share a single round trip.
//
// `cache()` is per-request. It is deliberately NOT used around the
// aggregate, whose reads must all come from the one snapshot
// transaction rather than from values memoized outside it.

export const getEnvelopes = cache((userId: string) =>
  read("envelopes", userId, (id) => qEnvelopes(prisma, id)),
);

export const getGoals = cache((userId: string) =>
  read("goals", userId, (id) => qGoals(prisma, id)),
);

export const getTransactions = cache((userId: string) =>
  read("transactions", userId, (id) => qTransactions(prisma, id)),
);

export const getAccounts = cache((userId: string) =>
  read("accounts", userId, (id) => qAccounts(prisma, id)),
);

export const getBills = cache((userId: string) =>
  read("bills", userId, (id) => qBills(prisma, id)),
);

export const getDebts = cache((userId: string) =>
  read("debts", userId, (id) => qDebts(prisma, id)),
);

export const getAllocationPlan = cache((userId: string) =>
  read("allocation-plan", userId, (id) => qPlanAndRules(prisma, id)),
);

export const getStoredPayPeriod = cache((userId: string) =>
  read("pay-period", userId, (id) => qPayPeriod(prisma, id)),
);

// ── Aggregate with an explicit snapshot boundary ───────────────────

/**
 * The whole financial state, read inside ONE RepeatableRead
 * transaction so every entity comes from a single coherent snapshot.
 *
 * WHY REPEATABLEREAD AND NOT THE DEFAULT
 * --------------------------------------
 * Postgres defaults to READ COMMITTED, under which each *statement*
 * may observe a different committed state. Wrapping the reads in
 * `prisma.$transaction` gives one connection and one unit of work —
 * but under READ COMMITTED it still does NOT give one snapshot: a
 * paycheck committed midway through the aggregate could appear in
 * transactions and be missing from balances. REPEATABLEREAD fixes
 * exactly that, which is why it is explicit here rather than
 * inherited.
 *
 * This is a READ-consistency decision inside FIN-01's authorized
 * scope. It changes no writer, no allocation rule and no ledger
 * behaviour.
 *
 * The `q*` functions are called directly with `tx`. They are
 * deliberately not routed through the `cache()`d selective readers:
 * those memoize reads taken OUTSIDE this transaction, so using them
 * here would silently mix a pre-snapshot value into the aggregate —
 * the precise inconsistency this function exists to prevent.
 */
export async function getFinancialState(
  userId: string,
): Promise<StateResult<FinancialState>> {
  return read("financial-state", userId, (tenantId) =>
    prisma.$transaction(
      async (tx) => {
        const [envelopes, goals, transactions, accounts, bills, debts, planAndRules, period] =
          await Promise.all([
            qEnvelopes(tx, tenantId),
            qGoals(tx, tenantId),
            qTransactions(tx, tenantId),
            qAccounts(tx, tenantId),
            qBills(tx, tenantId),
            qDebts(tx, tenantId),
            qPlanAndRules(tx, tenantId),
            qPayPeriod(tx, tenantId),
          ]);
        return Object.freeze({
          envelopes,
          goals,
          transactions,
          accounts,
          bills,
          debts,
          plan: planAndRules.plan,
          rules: planAndRules.rules,
          period,
        });
      },
      {
        isolationLevel: "RepeatableRead",
        timeout: 10_000,
      },
    ),
  );
}
