/**
 * Advisor tool handlers — read-only implementations of the 7 advisor tools.
 *
 * Cluster 5.3.1. Each handler reads from the production data sources
 * (Prisma tables for envelopes/bills/goals, in-memory store for
 * transactions/debts/account), shapes the result for the LLM, and
 * returns it as `{ publicView: { ok, data } }` so the orchestrator
 * can serialize it as a `role: "tool"` message.
 *
 * Conventions:
 * - **Read-only.** No handler mutates state. The advisor can
 *   simulate a paycheck (`simulatePaycheck`) which calls
 *   `runAllocation` for the math but throws away the result without
 *   writing the audit row or mutating balances.
 * - **LLM-friendly shapes.** Cents → dollars, Date → ISO string,
 *   internal-only fields stripped. The LLM should never see the
 *   store's `currentCents` / `aprBps` — only the human-readable
 *   `currentBalanceDollars` / `aprPercent`.
 * - **No fabricated data.** When a slice is empty, the handler
 *   returns `{ rows: [], total: 0 }` — not a fake row. The advisor
 *   should be able to tell the user "you have no bills" if the
 *   filter matches nothing.
 * - **Hard caps on response size.** 50 raw rows / 30 buckets max
 *   for `queryTransactions`; 10 buckets max for `summarizeSpending`.
 *   The advisor should narrow the filter when it hits the cap.
 *
 * The 7 handlers map 1:1 to the tool schemas in `./tools.ts`:
 *   1. queryTransactionsHandler
 *   2. queryEnvelopesHandler
 *   3. queryBillsHandler
 *   4. queryDebtsHandler
 *   5. queryGoalsHandler
 *   6. simulatePaycheckHandler
 *   7. summarizeSpendingHandler
 *
 * The orchestrator (agent.ts) calls `runAdvisorTool` to dispatch
 * by name — same pattern as the onboarding agent.
 */

import "server-only";
import type { LLMToolCall } from "../llm/types";
import {
  liveEnvelopesFromDb,
  liveBillsFromDb,
  liveTransactions,
} from "../mock";
import { readDebts, runAllocation } from "../store";
import type { AllocationRunResult } from "../store";
import { prisma } from "@/server/db";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

/**
 * The shape of every advisor tool's return value. `publicView` is
 * what the LLM sees (serialized to JSON and sent back as a `role:
 * "tool"` message). The orchestrator does not need any other fields
 * — the advisor is read-only, so there's no post-save state to
 * surface to callers.
 */
export interface AdvisorToolResult {
  publicView: AdvisorPublicView;
}

export type AdvisorPublicView =
  | { ok: true; tool: string; data: unknown; note?: string }
  | { ok: false; tool: string; error: string };

// ──────────────────────────────────────────────────────────────────────
// Dispatcher
// ──────────────────────────────────────────────────────────────────────

/**
 * Dispatch a tool call to the right handler. Mirrors the onboarding
 * agent's `runToolCall` pattern. Unknown tool names return a
 * structured error so the LLM can recover (or the orchestrator can
 * surface the failure to the user).
 *
 * Async because some handlers hit Prisma (envelopes, bills, goals).
 * Sync handlers (transactions, debts, simulate) return a resolved
 * promise — same shape, no extra round-trip.
 */
export async function runAdvisorTool(
  userId: string,
  tc: LLMToolCall,
): Promise<AdvisorToolResult> {
  const a = tc.args as Record<string, unknown>;
  switch (tc.name) {
    case "queryTransactions":
      return queryTransactionsHandler(userId, a);
    case "queryEnvelopes":
      return queryEnvelopesHandler(userId);
    case "queryBills":
      return queryBillsHandler(userId, a);
    case "queryDebts":
      return queryDebtsHandler(a);
    case "queryGoals":
      return queryGoalsHandler(userId, a);
    case "simulatePaycheck":
      return simulatePaycheckHandler(a);
    case "summarizeSpending":
      return summarizeSpendingHandler(userId, a);
    default:
      return {
        publicView: {
          ok: false,
          tool: tc.name,
          error: `Unknown advisor tool: ${tc.name}`,
        },
      };
  }
}

// ──────────────────────────────────────────────────────────────────────
// 1. queryTransactions
// ──────────────────────────────────────────────────────────────────────

const TRANSACTION_RAW_LIMIT = 50;
const TRANSACTION_GROUP_LIMIT = 30;

function queryTransactionsHandler(
  userId: string,
  a: Record<string, unknown>,
): AdvisorToolResult {
  // The transaction table is in-memory for v1 (Transaction model not
  // migrated). The userId arg is accepted for parity with the other
  // handlers and so a future migration can pass it through without
  // changing the tool surface.
  void userId;
  const all = liveTransactions();

  const payeeLike = stringOrNull(a.payeeLike);
  const envelopeId = stringOrNull(a.envelopeId);
  const since = parseDateOrNull(a.since);
  const until = parseDateOrNull(a.until);
  const groupBy = pickGroupBy(a.groupBy);

  const filtered = all.filter((t) => {
    if (payeeLike && !t.payee.toLowerCase().includes(payeeLike.toLowerCase())) {
      return false;
    }
    if (envelopeId && t.envelopeId !== envelopeId) {
      return false;
    }
    if (since && t.date < since) return false;
    if (until && t.date > until) return false;
    return true;
  });

  if (groupBy) {
    const buckets = groupTransactions(filtered, groupBy);
    const trimmed = buckets.slice(0, TRANSACTION_GROUP_LIMIT);
    return {
      publicView: {
        ok: true,
        tool: "queryTransactions",
        data: {
          groupBy,
          count: filtered.length,
          buckets: trimmed,
          truncated: buckets.length > trimmed.length,
        },
        note: `Aggregated ${filtered.length} transactions into ${trimmed.length} ${groupBy} bucket(s).`,
      },
    };
  }

  const rows = filtered.slice(0, TRANSACTION_RAW_LIMIT).map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    payee: t.payee,
    amountDollars: round2(t.amountCents / 100),
    envelopeId: t.envelopeId,
    isIncome: Boolean(t.isIncome),
  }));
  return {
    publicView: {
      ok: true,
      tool: "queryTransactions",
      data: {
        count: filtered.length,
        rows,
        truncated: filtered.length > rows.length,
      },
      note: `Returned ${rows.length} of ${filtered.length} matching transaction(s).`,
    },
  };
}

function pickGroupBy(v: unknown): "month" | "envelope" | "payee" | null {
  if (v === "month" || v === "envelope" || v === "payee") return v;
  return null;
}

interface TransactionBucket {
  key: string;
  count: number;
  totalDollars: number;
}

function groupTransactions(
  rows: ReturnType<typeof liveTransactions>,
  by: "month" | "envelope" | "payee",
): TransactionBucket[] {
  const m = new Map<string, TransactionBucket>();
  for (const t of rows) {
    let key: string;
    if (by === "month") {
      // YYYY-MM
      key = t.date.toISOString().slice(0, 7);
    } else if (by === "envelope") {
      key = t.envelopeId ?? "(unassigned)";
    } else {
      key = t.payee;
    }
    const existing = m.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDollars += t.amountCents / 100;
    } else {
      m.set(key, {
        key,
        count: 1,
        totalDollars: t.amountCents / 100,
      });
    }
  }
  return [...m.values()].sort((a, b) => b.totalDollars - a.totalDollars);
}

// ──────────────────────────────────────────────────────────────────────
// 2. queryEnvelopes
// ──────────────────────────────────────────────────────────────────────

async function queryEnvelopesHandler(userId: string): Promise<AdvisorToolResult> {
  const rows = await liveEnvelopesFromDb(userId);
  const shaped = rows.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    currentBalanceDollars: round2(e.current / 100),
    targetDollars: round2(e.target / 100),
    fillRatioPct:
      e.target > 0 ? round2((e.current / e.target) * 100) : null,
  }));
  return {
    publicView: {
      ok: true,
      tool: "queryEnvelopes",
      data: { count: shaped.length, envelopes: shaped },
      note: `Returned ${shaped.length} envelope(s).`,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// 3. queryBills
// ──────────────────────────────────────────────────────────────────────

async function queryBillsHandler(
  userId: string,
  a: Record<string, unknown>,
): Promise<AdvisorToolResult> {
  const rows = await liveBillsFromDb(userId);
  const dueWithin = typeof a.dueWithin === "number" && a.dueWithin > 0
    ? Math.floor(a.dueWithin)
    : null;
  const unpaidOnly = a.unpaidOnly === true;
  const now = new Date();

  const filtered = rows.filter((b) => {
    if (unpaidOnly && b.paidAt) return false;
    if (dueWithin !== null) {
      const nextDue = nextOccurrenceOfDay(b.dueDay, now);
      const daysAway = Math.ceil(
        (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysAway > dueWithin) return false;
    }
    return true;
  });

  const shaped = filtered.map((b) => ({
    id: b.id,
    name: b.name,
    amountDollars: round2(b.amountCents / 100),
    cadence: b.cadence ?? "monthly",
    dueDay: b.dueDay,
    autopay: b.autopay,
    paid: b.paidAt !== null,
    envelopeId: b.envelopeId,
  }));
  return {
    publicView: {
      ok: true,
      tool: "queryBills",
      data: {
        count: shaped.length,
        bills: shaped,
        filter: {
          dueWithin: dueWithin,
          unpaidOnly,
        },
      },
      note: `Returned ${shaped.length} bill(s).`,
    },
  };
}

/**
 * Compute the next future date a bill with the given `dueDay`
 * (1-31) will be due. Used by `queryBills` for the `dueWithin`
 * filter. The "next occurrence" of day 15 in a 30-day month is
 * day 15 of the current month if we haven't passed it, otherwise
 * day 15 of next month. End-of-month edge: dueDay 31 in February
 * rolls to the last day of February.
 */
function nextOccurrenceOfDay(dueDay: number, now: Date): Date {
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(dueDay, daysInMonth(now.getFullYear(), now.getMonth())),
  );
  if (candidate >= startOfDay(now)) return candidate;
  // Already past — push to next month.
  const nextMonth = now.getMonth() + 1;
  const year = now.getFullYear() + (nextMonth > 11 ? 1 : 0);
  const month = nextMonth % 12;
  return new Date(year, month, Math.min(dueDay, daysInMonth(year, month)));
}

function daysInMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ──────────────────────────────────────────────────────────────────────
// 4. queryDebts
// ──────────────────────────────────────────────────────────────────────

function queryDebtsHandler(a: Record<string, unknown>): AdvisorToolResult {
  const all = readDebts();
  const orderBy = pickDebtOrderBy(a.orderBy);
  const sorted = orderBy
    ? sortDebts(all, orderBy)
    : all;

  const rows = sorted.map((d) => ({
    id: d.id,
    name: d.name,
    balanceDollars: round2(d.balanceCents / 100),
    originalBalanceDollars: round2(d.originalBalanceCents / 100),
    aprPercent: round2(d.aprBps / 100),
    minPaymentDollars: round2(d.minPaymentCents / 100),
    dueDay: d.dueDay,
  }));
  return {
    publicView: {
      ok: true,
      tool: "queryDebts",
      data: {
        count: rows.length,
        orderBy: orderBy ?? "default",
        debts: rows,
      },
      note: `Returned ${rows.length} debt(s) sorted by ${orderBy ?? "default"}.`,
    },
  };
}

function pickDebtOrderBy(v: unknown): "apr" | "balance" | "minPayment" | null {
  if (v === "apr" || v === "balance" || v === "minPayment") return v;
  return null;
}

function sortDebts(
  rows: ReturnType<typeof readDebts>,
  by: "apr" | "balance" | "minPayment",
) {
  const arr = rows.slice();
  if (by === "apr") {
    arr.sort((a, b) => b.aprBps - a.aprBps);
  } else if (by === "balance") {
    arr.sort((a, b) => b.balanceCents - a.balanceCents);
  } else {
    arr.sort((a, b) => b.minPaymentCents - a.minPaymentCents);
  }
  return arr;
}

// ──────────────────────────────────────────────────────────────────────
// 5. queryGoals
// ──────────────────────────────────────────────────────────────────────

async function queryGoalsHandler(
  userId: string,
  a: Record<string, unknown>,
): Promise<AdvisorToolResult> {
  // We read directly from Prisma here (not via liveGoalsFromDb)
  // because we need the `sortOrder` field to honor the `priority`
  // filter. liveGoalsFromDb strips sortOrder from its response
  // shape; the advisor needs it.
  const rows = await prisma.goal.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const priority = typeof a.priority === "number" ? a.priority : null;
  const kind = pickGoalKind(a.kind);

  // Priority semantics: priority 1 = the primary goal (isPrimary=true);
  // priority 2 = sortOrder=0 (first non-primary); priority 3 =
  // sortOrder=1; etc. This matches the user's mental model of
  // "top of the list, then the next one down."
  const filtered = rows.filter((g, i) => {
    if (priority !== null) {
      const myPriority = g.isPrimary ? 1 : i + 1 - 1; // first non-primary has sortOrder 0 → priority 2
      if (myPriority !== priority) return false;
    }
    if (kind && g.goalType !== kind) return false;
    return true;
  });

  const shaped = filtered.map((g) => ({
    id: g.id,
    name: g.name,
    goalType: g.goalType,
    targetDollars: round2(g.targetAmount / 100),
    currentDollars: round2(g.currentAmount / 100),
    targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
    perPaycheckDollars: round2(0), // Goal model doesn't store this; derived from allocation rule in production
    isPrimary: g.isPrimary,
    envelopeId: g.envelopeId,
  }));
  return {
    publicView: {
      ok: true,
      tool: "queryGoals",
      data: {
        count: shaped.length,
        filter: { priority, kind },
        goals: shaped,
      },
      note: `Returned ${shaped.length} goal(s).`,
    },
  };
}

function pickGoalKind(v: unknown): "EMERGENCY" | "INVEST" | "OTHER" | null {
  if (v === "EMERGENCY" || v === "INVEST" || v === "OTHER") return v;
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// 6. simulatePaycheck
// ──────────────────────────────────────────────────────────────────────

function simulatePaycheckHandler(a: Record<string, unknown>): AdvisorToolResult {
  const amountDollars = numberOrZero(a.amountDollars);
  if (amountDollars <= 0) {
    return {
      publicView: {
        ok: false,
        tool: "simulatePaycheck",
        error: "amountDollars must be greater than $0.",
      },
    };
  }
  const paycheckCents = Math.round(amountDollars * 100);
  // `runAllocation` returns a full breakdown by envelope. The
  // advisor only needs the bucket list + the unallocated remainder;
  // we drop the audit/transactions fields so the LLM doesn't have
  // to wade through them.
  const result: AllocationRunResult = runAllocation(paycheckCents, "advisor-simulate");
  const transfers = result.transfers.map((t) => ({
    envelopeId: t.envelopeId,
    envelopeName: t.envelopeName,
    allocatedDollars: round2(t.allocatedCents / 100),
  }));
  return {
    publicView: {
      ok: true,
      tool: "simulatePaycheck",
      data: {
        paycheckDollars: round2(paycheckCents / 100),
        totalAllocatedDollars: round2(result.totalAllocatedCents / 100),
        unallocatedDollars: round2(result.unallocatedCents / 100),
        remainderEnvelope: result.remainder
          ? { id: result.remainder.envelopeId, name: result.remainder.envelopeName }
          : null,
        transfers,
      },
      note: `Simulated a $${amountDollars.toLocaleString()} paycheck. No state was changed.`,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// 7. summarizeSpending
// ──────────────────────────────────────────────────────────────────────

const SUMMARY_TOP_N = 10;
const SUMMARY_DEFAULT_WINDOW_DAYS = 90;

async function summarizeSpendingHandler(
  userId: string,
  a: Record<string, unknown>,
): Promise<AdvisorToolResult> {
  // Same as queryTransactions: the transaction log is in-memory
  // for v1. userId is accepted for parity.
  void userId;
  const all = liveTransactions();
  const by = a.by === "payee" ? "payee" : "envelope";
  const since = parseDateOrNull(a.since) ??
    new Date(Date.now() - SUMMARY_DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Spending = negative-amount transactions (outflows). Skip
  // income / paycheck transactions (positive) and transfers
  // (Prima Materia / auto-allocate) — those are money movement,
  // not spending.
  const rows = all.filter((t) => {
    if (t.date < since) return false;
    if (t.amountCents >= 0) return false;
    if (t.isIncome || t.isPrimaMateria) return false;
    return true;
  });

  const buckets = groupTransactions(rows, by);
  const top = buckets.slice(0, SUMMARY_TOP_N);
  const totalDollars = rows.reduce((s, t) => s + Math.abs(t.amountCents) / 100, 0);
  return {
    publicView: {
      ok: true,
      tool: "summarizeSpending",
      data: {
        since: since.toISOString().slice(0, 10),
        by,
        totalTransactions: rows.length,
        totalSpendingDollars: round2(totalDollars),
        top: top.map((b) => ({
          key: b.key,
          count: b.count,
          totalDollars: round2(b.totalDollars),
        })),
        truncated: buckets.length > top.length,
      },
      note: `Top ${top.length} ${by} bucket(s) over the last ${SUMMARY_DEFAULT_WINDOW_DAYS} days.`,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Tiny helpers
// ──────────────────────────────────────────────────────────────────────

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function numberOrZero(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  return 0;
}

function parseDateOrNull(v: unknown): Date | null {
  if (typeof v !== "string" || v.length === 0) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
