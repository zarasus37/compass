/**
 * Compass Vault — audit log data access (Cluster 7.4).
 *
 * Reads + writes the project's append-only `AuditLog` table for
 * the `/vault/audit` page. The page is force-dynamic, so these
 * helpers are called on every render.
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
 */
import "server-only";
import { prisma } from "@/server/db";
import { recordVaultAudit } from "./db";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export type AuditLogFilter = {
  /** Exact actionType match (e.g. "vault.synced"). */
  type?: string;
  /** Prefix match (e.g. "vault." or "auto_"). Case-sensitive. */
  prefix?: string;
  /** Substring search on actionType (case-insensitive contains). */
  q?: string;
  /** Max rows to return. Default 50, max 200. */
  take?: number;
};

export type AuditLogRow = {
  id: string;
  actionType: string;
  /** Parsed JSON payload. Empty object on parse failure. */
  payload: Record<string, unknown>;
  aiTierAtTime: number;
  createdAtIso: string;
};

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
// ──────────────────────────────────────────────────────────────────────

/**
 * Build an `AuditLogFilter` from a Next.js `searchParams` object.
 * Strings only; missing/empty values are dropped. `take` is
 * clamped to [10, 200] with a default of 50.
 */
export function parseAuditLogFilter(
  sp: Record<string, string | string[] | undefined> | undefined,
): AuditLogFilter {
  if (!sp) return { take: 50 };
  const get = (k: string): string | undefined => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const takeRaw = get("take");
  const takeNum = takeRaw ? Number.parseInt(takeRaw, 10) : NaN;
  const take = Number.isFinite(takeNum) ? Math.min(200, Math.max(10, takeNum)) : 50;
  return {
    type: get("type"),
    prefix: get("prefix"),
    q: get("q"),
    take,
  };
}

/** Serialize a filter back to a URL query string (preserves the contract). */
export function auditLogFilterToQuery(f: AuditLogFilter): string {
  const params = new URLSearchParams();
  if (f.type) params.set("type", f.type);
  if (f.prefix) params.set("prefix", f.prefix);
  if (f.q) params.set("q", f.q);
  if (f.take && f.take !== 50) params.set("take", String(f.take));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ──────────────────────────────────────────────────────────────────────
// Reads
// ──────────────────────────────────────────────────────────────────────

/** Build a Prisma `where` clause from a filter. */
function whereFromFilter(userId: string, f: AuditLogFilter) {
  const where: Record<string, unknown> = { userId };
  if (f.type) {
    where.actionType = f.type;
  } else if (f.prefix) {
    where.actionType = { startsWith: f.prefix };
  } else if (f.q) {
    where.actionType = { contains: f.q, mode: "insensitive" };
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
// ──────────────────────────────────────────────────────────────────────

/**
 * Palette for the type distribution + table chips. 10 distinct
 * terminal colors; types beyond the 10th reuse the palette by
 * index, so the distribution is always colorful regardless of
 * how many types the user has.
 *
 * Order is by visual weight (vessel-accent first because it's
 * the primary signal).
 */
const TYPE_PALETTE = [
  "var(--vessel-accent)",   // 0: cyan
  "var(--ok)",              // 1: green
  "var(--vessel-gold)",     // 2: gold
  "var(--vessel-watch)",    // 3: orange
  "var(--vessel-over)",     // 4: red
  "var(--terminal-cyan)",   // 5: terminal-cyan
  "var(--ink-2)",           // 6: ink-2 (neutral mid)
  "var(--ink-3)",           // 7: ink-3 (neutral dim)
  "var(--jupiter)",         // 8: jupiter purple
  "var(--mars)",            // 9: mars red-orange
] as const;

/**
 * Deterministic hash → index in the palette. Same input always
 * returns the same color (so the table chip + the type
 * distribution segment match for the same type). djb2 variant.
 */
function typeColorIndex(t: string): number {
  let h = 5381;
  for (let i = 0; i < t.length; i += 1) {
    h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  }
  return h % TYPE_PALETTE.length;
}

/** Get the color for a given actionType. Stable across renders. */
export function colorForActionType(t: string): string {
  return TYPE_PALETTE[typeColorIndex(t)] ?? TYPE_PALETTE[0];
}

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
