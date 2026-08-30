/**
 * Compass Vault — audit log data access (Cluster 7.4 + 7.5).
 *
 * Reads + writes the project's append-only `AuditLog` table for
 * the `/vault/audit` page (Cluster 7.4) and the per-bill
 * drill-down at `/vault/bills/[id]/history` (Cluster 7.5).
 * Both pages are force-dynamic, so these helpers are called on
 * every render.
 *
 * Conventions:
 *   - `actionType` is the dotted string column (`vault.synced`,
 *     `vault.bill_state_changed`, etc.). The full set is
 *     enforced by the `recordVaultAudit` actionType union in
 *     `db.ts`; we don't enforce it here because older rows may
 *     have types that pre-date the union (e.g. pre-vault
 *     `auto_allocate`, `plan_armed`, `envelope_created`).
 *   - `payload` is a JSON string in the DB; we parse on read.
 *   - All reads are scoped to the current user; never leak
 *     across users.
 *
 * Filter contract (URL → AuditLogFilter):
 *   - `?type=<exactActionType>`     → filter.type
 *   - `?prefix=<vault|auto|plan|...>` → filter.prefix
 *   - `?q=<substring>`              → filter.q
 *   - `?take=<n>`                   → filter.take (default 50, max 200)
 *   Combinations are AND. The 4-cell headline strip always
 *   shows the UNFILTERED totals so the user always sees the
 *   full picture; the activity strip / type distribution /
 *   table all respect the filter.
 *
 * Cluster 7.5 — Per-bill filter (URL → BillHistoryFilter):
 *   - `?type=<exactActionType>`     → filter.type
 *   - `?take=<n>`                   → filter.take (default 50, max 200)
 *   Combinations are AND. No prefix or q (per-bill scope is
 *   already narrow).
 */
import "server-only";
import { prisma } from "@/server/db";
import { recordVaultAudit } from "./db";
import type { ScheduledBill, BillStatus, EnvelopeCategory } from "./types";
// Cluster 7.6 — re-export the shared types + pure helpers so
// existing server-side imports (e.g. `import { colorForActionType
// } from "@/lib/vault/audit-log"`) keep working. The actual
// implementations now live in `audit-log-shared.ts` so the new
// client wrappers (LiveAuditTable, LiveBillEventTable) can import
// the same helpers without dragging in `server-only`.
import {
  payloadMentionsBillId,
  rowMatchesAuditFilter,
} from "./audit-log-shared";
import type {
  AuditLogFilter,
  AuditLogRow,
  BillHistoryFilter,
} from "./audit-log-shared";
export type {
  AuditLogFilter,
  AuditLogRow,
  BillHistoryFilter,
} from "./audit-log-shared";
export {
  DATE_RANGE_PRESETS,
  auditLogFilterToQuery,
  billHistoryFilterToQuery,
  billHistoryHrefForAuditRow,
  colorForActionType,
  dateRangeForPreset,
  hasDateRange,
  parseAuditLogFilter,
  parseBillHistoryFilter,
  parseYmdDate,
  payloadMentionsBillId,
  rowMatchesAuditFilter,
  toYmd,
} from "./audit-log-shared";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export type AuditLogActivityDay = {
  /** YYYY-MM-DD in the user's local timezone. */
  dateKey: string;
  count: number;
  failedCount: number;
};

export type AuditLogTypeCount = {
  actionType: string;
  count: number;
  failedCount: number;
};

export type AuditLogSummary = {
  totalEvents: number;
  firstEventAt: string | null;
  eventsThisWeek: number;
  failedThisWeek: number;
  lastActivityAt: string | null;
  last24hCount: number;
  mostActiveType: AuditLogTypeCount | null;
  quiet7d: boolean;
};

// ──────────────────────────────────────────────────────────────────────
// Filter parsing (URL → AuditLogFilter)
//
// Moved to `audit-log-shared.ts` (Cluster 7.6) so client
// wrappers can use the same logic without pulling in the
// `server-only` `audit-log.ts` module. The re-exports at the
// top of this file preserve the existing import surface for
// server-side callers.
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────
// Reads
// ──────────────────────────────────────────────────────────────────────

/** Build a Prisma `where` clause from a filter.
 *  Cluster 7.7 — added date range (`from` / `to`, both
 *  `YYYY-MM-DD` inclusive). The `to` upper bound is `to + 1
 *  day` exclusive, so a `?to=2026-08-30` filter still
 *  includes rows that landed at 23:59:59 on Aug 30 (a full
 *  day of events on the named day). */
function whereFromFilter(userId: string, f: AuditLogFilter) {
  const where: Record<string, unknown> = { userId };
  if (f.type) {
    where.actionType = f.type;
  } else if (f.prefix) {
    where.actionType = { startsWith: f.prefix };
  } else if (f.q) {
    where.actionType = { contains: f.q, mode: "insensitive" };
  }
  // Date range. The strings are YYYY-MM-DD (local). We compare
  // against the UTC `createdAt`; the small day-boundary drift
  // (a local day in some timezone might span 2 UTC days) is
  // acceptable for a UI filter — the precision is "within a
  // day", not "within a second".
  if (f.from || f.to) {
    const createdAt: Record<string, Date> = {};
    if (f.from) {
      // `from` inclusive: createdAt >= from 00:00 local
      const fromDate = new Date(`${f.from}T00:00:00`);
      createdAt.gte = fromDate;
    }
    if (f.to) {
      // `to` inclusive: createdAt < (to + 1 day) 00:00 local
      const toDate = new Date(`${f.to}T00:00:00`);
      toDate.setDate(toDate.getDate() + 1);
      createdAt.lt = toDate;
    }
    where.createdAt = createdAt;
  }
  return where;
}

/** The "failed" action types — used to flag days/periods with errors. */
const FAILED_ACTION_TYPES = new Set<string>([
  "vault.payment_failed",
  "vault.safe_deploy_failed",
  "vault.apy_refresh_failed",
  "vault.adapter_fallback",
]);

function isFailedActionType(t: string): boolean {
  return FAILED_ACTION_TYPES.has(t);
}

/**
 * Fetch the audit log rows for the table view. Newest first.
 * Returns parsed payload as `Record<string, unknown>`. Capped
 * at `filter.take` rows (default 50, max 200).
 */
export async function getAuditLog(
  userId: string,
  filter: AuditLogFilter,
): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: whereFromFilter(userId, filter),
    orderBy: { createdAt: "desc" },
    take: filter.take ?? 50,
  });
  return rows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.payload);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      // Bad JSON; render as empty.
    }
    return {
      id: r.id,
      actionType: r.actionType,
      payload,
      aiTierAtTime: r.aiTierAtTime,
      createdAtIso: r.createdAt.toISOString(),
    };
  });
}

/**
 * Aggregate the user's audit log by `actionType` for the type
 * distribution + filter pills. Unfiltered — the user always sees
 * the full set of types their system has ever produced.
 */
export async function getDistinctActionTypes(
  userId: string,
): Promise<AuditLogTypeCount[]> {
  const rows = await prisma.auditLog.findMany({
    where: { userId },
    select: { actionType: true },
  });
  const counts = new Map<string, { count: number; failedCount: number }>();
  for (const r of rows) {
    const cur = counts.get(r.actionType) ?? { count: 0, failedCount: 0 };
    cur.count += 1;
    if (isFailedActionType(r.actionType)) cur.failedCount += 1;
    counts.set(r.actionType, cur);
  }
  return Array.from(counts.entries())
    .map(([actionType, { count, failedCount }]) => ({
      actionType,
      count,
      failedCount,
    }))
    .sort((a, b) => b.count - a.count || a.actionType.localeCompare(b.actionType));
}

/**
 * Compute the 30-day activity strip. Returns one entry per day,
 * oldest first (so the strip can render left→right). `dateKey`
 * is local YYYY-MM-DD. Days with no events are included with
 * count=0 so the strip is always 30 columns.
 *
 * Uses a fixed `now` argument so the test path can pin a date.
 * The page calls this without `now` (defaults to `new Date()`).
 */
export async function getAuditLogActivity(
  userId: string,
  days = 30,
  now: Date = new Date(),
): Promise<AuditLogActivityDay[]> {
  // Compute the start of the window (00:00 local, `days` ago).
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const rows = await prisma.auditLog.findMany({
    where: { userId, createdAt: { gte: start } },
    select: { actionType: true, createdAt: true },
  });
  // Bucket by local dateKey.
  const buckets = new Map<string, { count: number; failedCount: number }>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKeyLocal(d);
    buckets.set(key, { count: 0, failedCount: 0 });
  }
  for (const r of rows) {
    const key = dateKeyLocal(r.createdAt);
    const cur = buckets.get(key) ?? { count: 0, failedCount: 0 };
    cur.count += 1;
    if (isFailedActionType(r.actionType)) cur.failedCount += 1;
    buckets.set(key, cur);
  }
  // Emit oldest → newest.
  const out: AuditLogActivityDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKeyLocal(d);
    const { count, failedCount } = buckets.get(key) ?? {
      count: 0,
      failedCount: 0,
    };
    out.push({ dateKey: key, count, failedCount });
  }
  return out;
}

/**
 * Compute the 4-cell headline strip. All counts are unfiltered
 * (the user always sees the full picture); the activity strip
 * + table respect the filter.
 */
export async function getAuditLogSummary(
  userId: string,
  now: Date = new Date(),
): Promise<AuditLogSummary> {
  const [total, first, last7, last24, types] = await Promise.all([
    prisma.auditLog.count({ where: { userId } }),
    prisma.auditLog.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId, createdAt: { gte: daysAgo(7, now) } },
      select: { actionType: true },
    }),
    prisma.auditLog.count({
      where: { userId, createdAt: { gte: daysAgo(1, now) } },
    }),
    getDistinctActionTypes(userId),
  ]);
  const failedThisWeek = last7.filter((r) => isFailedActionType(r.actionType))
    .length;
  const lastActivityAt = await prisma.auditLog.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return {
    totalEvents: total,
    firstEventAt: first ? first.createdAt.toISOString() : null,
    eventsThisWeek: last7.length,
    failedThisWeek,
    lastActivityAt: lastActivityAt ? lastActivityAt.createdAt.toISOString() : null,
    last24hCount: last24,
    mostActiveType: types.length > 0 ? (types[0] ?? null) : null,
    quiet7d: last7.length === 0,
  };
}

/**
 * Distinct prefix values that exist in the user's data. Used
 * to build the prefix filter row — only show prefixes that
 * the user actually has events for.
 */
export async function getAuditLogPrefixes(userId: string): Promise<string[]> {
  const types = await prisma.auditLog.findMany({
    where: { userId },
    select: { actionType: true },
    distinct: ["actionType"],
  });
  const set = new Set<string>();
  for (const t of types) {
    const a = t.actionType;
    // The "prefix" is everything up to and including the first
    // `.` or `_` (whichever comes first). E.g. `vault.synced`
    // → `vault.`, `auto_allocate` → `auto_`. Bare strings
    // (no separator) are skipped.
    const dot = a.indexOf(".");
    const und = a.indexOf("_");
    let cut: number;
    if (dot === -1 && und === -1) continue;
    if (dot === -1) cut = und + 1;
    else if (und === -1) cut = dot + 1;
    else cut = Math.min(dot, und) + 1;
    set.add(a.slice(0, cut));
  }
  return Array.from(set).sort();
}

// ──────────────────────────────────────────────────────────────────────
// Writes
// ──────────────────────────────────────────────────────────────────────

/**
 * Record that the user opened `/vault/audit`. The payload
 * captures the filter the page was rendered with so the
 * user can see "I opened with the Spritz filter active"
 * later. The page calls this AFTER its read so the just-
 * written row doesn't show up in the same visit's table.
 */
export async function recordAuditLogViewed(args: {
  userId: string;
  filter: AuditLogFilter;
}): Promise<void> {
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.audit_log_viewed",
    payload: {
      filter: {
        type: args.filter.type ?? null,
        prefix: args.filter.prefix ?? null,
        q: args.filter.q ?? null,
        take: args.filter.take ?? 50,
      },
      at: new Date().toISOString(),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Color map (stable per actionType)
//
// Moved to `audit-log-shared.ts` (Cluster 7.6). Re-exported at
// the top of this file for backward compat with existing
// server-side imports.
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number, now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

// ──────────────────────────────────────────────────────────────────────
// Cluster 7.5 — Per-bill audit drill-down
//
// The /vault/bills/[id]/history page scopes the audit log to a
// single bill. The page reads rows whose payload carries the
// bill's id (in `payload.billId` for most event types, or
// `payload.billsCredited` for `vault.yield_routed`). Auth is
// enforced by scoping the bill lookup to the user's vault —
// a bill id from another user's vault returns null and the
// page renders a 404 panel.
//
// The `payload` column is `String` in the schema (per the
// existing audit-log pattern), so we can't use Prisma's JSON
// path filter. Instead we narrow the DB query to the action
// types that CAN have a billId in the payload, then post-
// filter in JS over the parsed payload. The per-bill set is
// bounded (a single bill accumulates ~10s of events over its
// lifetime) so the JS cost is negligible.
// ──────────────────────────────────────────────────────────────────────

/** Action types that may carry a `billId` in the payload. */
const BILL_AUDITABLE_ACTION_TYPES = [
  "vault.bill_state_changed",
  "vault.bill_added",
  "vault.bill_updated",
  "vault.bill_deleted",
  "vault.bill_history_viewed",
  "vault.payment_attempted",
  "vault.payment_settled",
  "vault.payment_failed",
  "vault.payment_executed",
  "vault.payment_manually_confirmed",
  "vault.scheduler_run",
  "vault.yield_routed",
] as const;

/** True if the payload's JSON carries the given billId — either
 *  as `payload.billId` (most event types) or inside the
 *  `payload.billsCredited` array (vault.yield_routed).
 *
 *  Takes the raw Prisma string (Prisma's `AuditLog.payload` is
 *  a JSON-as-string column) and delegates to the shared
 *  `payloadMentionsBillId` after parsing. The shared helper
 *  itself lives in `audit-log-shared.ts` so client wrappers can
 *  apply the same predicate without pulling in `server-only`. */
function payloadMentionsBill(
  rawPayload: string,
  billId: string,
): boolean {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(rawPayload);
  } catch {
    return false;
  }
  return payloadMentionsBillId(p) === billId;
}

export type BillWithEnvelope = {
  bill: ScheduledBill;
  envelope: { id: string; name: string; category: EnvelopeCategory } | null;
};

export type BillAuditSummary = {
  totalEvents: number;
  firstEventAt: string | null;
  lastActivityAt: string | null;
  mostActiveType: AuditLogTypeCount | null;
  eventsThisWeek: number;
  /** Count of `vault.bill_state_changed` rows grouped by the
   *  `to` field. Drives the BillTimeline stepper. */
  stateTransitionsByState: Record<string, number>;
  /** The bill's current status (read from `ScheduledBill.status`).
   *  Null when the bill doesn't exist. */
  currentState: BillStatus | null;
};

/**
 * Fetch a bill by id, scoped to the current user. Returns null
 * if the bill doesn't exist OR exists for a different user
 * (the two are indistinguishable from the page's perspective).
 * The page renders a 404 panel on null.
 */
export async function getBillByIdForUser(
  userId: string,
  billId: string,
): Promise<BillWithEnvelope | null> {
  const row = await prisma.scheduledBill.findFirst({
    where: { id: billId, vault: { userId } },
    include: { envelope: { select: { id: true, name: true, category: true } } },
  });
  if (!row) return null;
  return {
    bill: toScheduledBillPublic(row),
    envelope: row.envelope
      ? {
          id: row.envelope.id,
          name: row.envelope.name,
          category: row.envelope.category as EnvelopeCategory,
        }
      : null,
  };
}

/**
 * Fetch the per-bill audit log rows. Newest first. Scoped to
 * the current user + the bill's id. Returns parsed payloads.
 * The optional `type` filter narrows to one actionType. Capped
 * at `filter.take` rows (default 50, max 200).
 */
export async function getBillAuditLog(
  userId: string,
  billId: string,
  filter: BillHistoryFilter,
): Promise<AuditLogRow[]> {
  const all = await prisma.auditLog.findMany({
    where: {
      userId,
      actionType: { in: [...BILL_AUDITABLE_ACTION_TYPES] },
    },
    orderBy: { createdAt: "desc" },
  });
  // Post-filter on the parsed payload. Per-bill set is bounded.
  const billRows = all.filter((r) => payloadMentionsBill(r.payload, billId));
  // Optional type filter, applied after the bill scoping.
  const filtered = filter.type
    ? billRows.filter((r) => r.actionType === filter.type)
    : billRows;
  const take = filter.take ?? 50;
  const sliced = filtered.slice(0, take);
  return sliced.map(rowToAuditLogRow);
}

/**
 * 4-cell summary for the bill's history page. Computes totals,
 * most-active type, the 8 user-facing state transition counts
 * (for the BillTimeline stepper), and last activity.
 */
export async function getBillAuditSummary(
  userId: string,
  billId: string,
  now: Date = new Date(),
): Promise<BillAuditSummary> {
  // Read the bill separately so we can return its current state
  // even when the audit log is empty.
  const billRow = await prisma.scheduledBill.findFirst({
    where: { id: billId, vault: { userId } },
    select: { status: true },
  });
  if (!billRow) {
    return {
      totalEvents: 0,
      firstEventAt: null,
      lastActivityAt: null,
      mostActiveType: null,
      eventsThisWeek: 0,
      stateTransitionsByState: {},
      currentState: null,
    };
  }
  const all = await prisma.auditLog.findMany({
    where: {
      userId,
      actionType: { in: [...BILL_AUDITABLE_ACTION_TYPES] },
    },
    select: { actionType: true, payload: true, createdAt: true },
  });
  const billRows = all.filter((r) => payloadMentionsBill(r.payload, billId));
  if (billRows.length === 0) {
    return {
      totalEvents: 0,
      firstEventAt: null,
      lastActivityAt: null,
      mostActiveType: null,
      eventsThisWeek: 0,
      stateTransitionsByState: {},
      currentState: billRow.status as BillStatus,
    };
  }
  // Totals + most active type.
  const typeCounts = new Map<string, number>();
  for (const r of billRows) {
    typeCounts.set(r.actionType, (typeCounts.get(r.actionType) ?? 0) + 1);
  }
  const mostActive: AuditLogTypeCount | null = (() => {
    let best: { t: string; c: number } | null = null;
    for (const [t, c] of typeCounts) {
      if (!best || c > best.c || (c === best.c && t < best.t)) best = { t, c };
    }
    return best
      ? { actionType: best.t, count: best.c, failedCount: 0 }
      : null;
  })();
  // First / last timestamps.
  const sorted = [...billRows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  // This week count.
  const weekCutoff = daysAgo(7, now);
  const eventsThisWeek = billRows.filter(
    (r) => r.createdAt >= weekCutoff,
  ).length;
  // State transition counts (from `vault.bill_state_changed` rows).
  const stateTransitionsByState: Record<string, number> = {};
  for (const r of billRows) {
    if (r.actionType !== "vault.bill_state_changed") continue;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(r.payload);
    } catch {
      continue;
    }
    if (typeof payload.to !== "string") continue;
    stateTransitionsByState[payload.to] =
      (stateTransitionsByState[payload.to] ?? 0) + 1;
  }
  return {
    totalEvents: billRows.length,
    firstEventAt: first.createdAt.toISOString(),
    lastActivityAt: last.createdAt.toISOString(),
    mostActiveType: mostActive,
    eventsThisWeek,
    stateTransitionsByState,
    currentState: billRow.status as BillStatus,
  };
}

/**
 * Record that the user opened `/vault/bills/[id]/history`. The
 * payload captures the bill id + the filter the page was
 * rendered with, so the user can see "I opened the Spectrum
 * bill's history with the state-change filter" later. The page
 * calls this AFTER its read so the just-written row doesn't
 * show up in the same visit's table — the next visit will.
 */
export async function recordBillHistoryViewed(args: {
  userId: string;
  billId: string;
  billerName: string;
  filter: BillHistoryFilter;
}): Promise<void> {
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.bill_history_viewed",
    payload: {
      billId: args.billId,
      billerName: args.billerName,
      filter: {
        type: args.filter.type ?? null,
        take: args.filter.take ?? 50,
      },
      at: new Date().toISOString(),
    },
  });
}

/** Local mapper for the AuditLog row → AuditLogRow domain shape.
 *  Mirrors the inline mapper in `getAuditLog` so the new readers
 *  produce identical results. */
function rowToAuditLogRow(r: {
  id: string;
  actionType: string;
  payload: string;
  aiTierAtTime: number;
  createdAt: Date;
}): AuditLogRow {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(r.payload);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    // Bad JSON; render as empty.
  }
  return {
    id: r.id,
    actionType: r.actionType,
    payload,
    aiTierAtTime: r.aiTierAtTime,
    createdAtIso: r.createdAt.toISOString(),
  };
}

/** Prisma row → ScheduledBill domain shape. Local to this
 *  module so the data layer doesn't need a new db.ts export.
 *  Mirrors the `toScheduledBill` mapper in db.ts (which is
 *  not exported). */
function toScheduledBillPublic(row: {
  id: string;
  vaultId: string;
  envelopeId: string;
  billerName: string;
  billerId: string;
  maskedAccountNumber: string;
  amount: number;
  maxAuthorizedAmount: number;
  currency: string;
  frequency: string;
  dueDate: Date;
  executionWindowStart: Date;
  executionWindowEnd: Date;
  status: string;
  providerPreference: string | null;
  lastAttemptAt: Date | null;
  settlementReference: string | null;
  appliedYieldCents: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): ScheduledBill {
  return {
    id: row.id,
    vaultId: row.vaultId,
    envelopeId: row.envelopeId,
    billerName: row.billerName,
    billerId: row.billerId,
    maskedAccountNumber: row.maskedAccountNumber,
    amount: row.amount,
    maxAuthorizedAmount: row.maxAuthorizedAmount,
    currency: row.currency as ScheduledBill["currency"],
    frequency: row.frequency as ScheduledBill["frequency"],
    dueDate: row.dueDate.toISOString(),
    executionWindowStart: row.executionWindowStart.toISOString(),
    executionWindowEnd: row.executionWindowEnd.toISOString(),
    status: row.status as BillStatus,
    providerPreference: row.providerPreference ?? undefined,
    lastAttemptAt: row.lastAttemptAt ? row.lastAttemptAt.toISOString() : undefined,
    settlementReference: row.settlementReference ?? undefined,
    appliedYieldCents: row.appliedYieldCents,
    source: (row.source as "seed" | "user") ?? "seed",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
