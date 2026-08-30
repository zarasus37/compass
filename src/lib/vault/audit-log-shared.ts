/**
 * Compass Vault — shared audit-log helpers (Cluster 7.6).
 *
 * Pure types + functions that BOTH server modules and client
 * components can import. Anything that touches Prisma or
 * `recordVaultAudit` stays in `audit-log.ts` (which is
 * `import "server-only"`). This file deliberately does NOT
 * import `server-only` so the client wrappers for the SSE
 * live-update feature can use the same color palette and
 * URL helpers as the server-rendered initial view.
 *
 * **Re-exports for backward compat**: `audit-log.ts` re-exports
 * everything from this file, so existing server-side imports
 * (e.g. `import { colorForActionType } from "@/lib/vault/audit-log"`)
 * keep working unchanged.
 */

// ──────────────────────────────────────────────────────────────────────
// Public types (shared with the client wrappers)
// ──────────────────────────────────────────────────────────────────────

export type AuditLogRow = {
  id: string;
  actionType: string;
  /** Parsed JSON payload. Empty object on parse failure. */
  payload: Record<string, unknown>;
  aiTierAtTime: number;
  createdAtIso: string;
};

export type AuditLogFilter = {
  /** Exact actionType match (e.g. "vault.synced"). */
  type?: string;
  /** Prefix match (e.g. "vault." or "auto_"). Case-sensitive. */
  prefix?: string;
  /** Substring search on actionType (case-insensitive contains). */
  q?: string;
  /** Inclusive lower-bound date (YYYY-MM-DD, local). When set,
   *  only events with `createdAt >= from` are returned. */
  from?: string;
  /** Inclusive upper-bound date (YYYY-MM-DD, local). When set,
   *  only events with `createdAt <= to + 1 day` are returned
   *  (the SQL range is exclusive on the upper end, so we add
   *  one day to make `to` inclusive of the named day). */
  to?: string;
  /** Max rows to return. Default 50, max 200. */
  take?: number;
};

export type BillHistoryFilter = {
  /** Exact actionType match (e.g. "vault.bill_state_changed"). */
  type?: string;
  /** Max rows to return. Default 50, max 200. */
  take?: number;
};

// ──────────────────────────────────────────────────────────────────────
// Filter parsing (URL → filter object) — pure logic
// ──────────────────────────────────────────────────────────────────────

/**
 * Validate a `YYYY-MM-DD` date string. Returns the string when
 * it's a valid date in the calendar, `null` otherwise. The
 * smoke + the parser use this to silently drop malformed
 * `?from=` / `?to=` values rather than 400 the page.
 */
export function parseYmdDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // Strict format check: YYYY-MM-DD, 10 chars.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  // Round-trip through Date to reject impossible dates
  // (e.g. 2026-02-31 → 2026-03-03 in JS Date, so the
  // round-trip would change the string).
  const dt = new Date(`${raw}T00:00:00`);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() + 1 !== m ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return raw;
}

/**
 * Build an `AuditLogFilter` from a Next.js `searchParams` object.
 * Strings only; missing/empty values are dropped. `take` is
 * clamped to [10, 200] with a default of 50. `from` and `to`
 * are validated as `YYYY-MM-DD`; malformed values are silently
 * dropped (per the 7.4 contract — the URL is the source of
 * truth, but invalid values are forgiven).
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
  // Validate dates; if `from > to`, drop `to` so the range is
  // "from and after" (more useful than silently returning 0).
  let from = parseYmdDate(get("from"));
  let to = parseYmdDate(get("to"));
  if (from && to && from > to) {
    to = null;
  }
  return {
    type: get("type"),
    prefix: get("prefix"),
    q: get("q"),
    from: from ?? undefined,
    to: to ?? undefined,
    take,
  };
}

/** Serialize a filter back to a URL query string (preserves the contract). */
export function auditLogFilterToQuery(f: AuditLogFilter): string {
  const params = new URLSearchParams();
  if (f.type) params.set("type", f.type);
  if (f.prefix) params.set("prefix", f.prefix);
  if (f.q) params.set("q", f.q);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.take && f.take !== 50) params.set("take", String(f.take));
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * The fixed preset chips the DateRangeBar offers. Each preset
 * maps to a `{ from, to }` window relative to `now` (a parameter
 * so the smoke can pin a date). `to` defaults to the current
 * day; the rendered chip's href uses `auditLogFilterToQuery`
 * merged with the rest of the page's filter.
 *
 * Cluster 7.7 — date range filter. The 30-day window matches the
 * existing unfiltered `getAuditLogActivity` default, so the
 * default page state shows the same 30 bars before AND after
 * the date range filter ships.
 */
export type DateRangePresetId = "24h" | "7d" | "30d" | "90d" | "all";

export const DATE_RANGE_PRESETS: ReadonlyArray<{
  id: DateRangePresetId;
  label: string;
  /** Days back from `now` (rounded to start-of-day). 0 = today only. */
  daysBack: number;
}> = [
  { id: "24h", label: "Last 24 hours", daysBack: 1 },
  { id: "7d", label: "Last 7 days", daysBack: 7 },
  { id: "30d", label: "Last 30 days", daysBack: 30 },
  { id: "90d", label: "Last 90 days", daysBack: 90 },
  { id: "all", label: "All time", daysBack: -1 },
];

/** Format a Date as local `YYYY-MM-DD`. */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute the `{ from, to }` window for a preset, relative to
 * `now`. `to` is always today. `from` is `to - daysBack` (or
 * undefined when `daysBack === -1` → "all time", which
 * intentionally removes the date filter entirely).
 */
export function dateRangeForPreset(
  preset: DateRangePresetId,
  now: Date = new Date(),
): { from?: string; to?: string } {
  const spec = DATE_RANGE_PRESETS.find((p) => p.id === preset);
  if (!spec) return {};
  // "All time" — no filter. The chip clears the date range
  // entirely, so the page returns to the unfiltered default.
  if (spec.daysBack < 0) return {};
  const to = toYmd(now);
  // Anchor `from` to the start of the day, `daysBack` days back.
  // The "24h" preset uses daysBack=1, which gives "from = today
  // midnight, to = today". That's a one-day window — effectively
  // "the last 24 hours from now-midnight". Good enough for a
  // visual filter; the precise "last 24 hours" would need a
  // time-of-day component which the URL contract doesn't carry.
  const fromDate = new Date(now);
  fromDate.setHours(0, 0, 0, 0);
  fromDate.setDate(fromDate.getDate() - spec.daysBack);
  return { from: toYmd(fromDate), to };
}

/** True when the filter has a date range set. */
export function hasDateRange(f: AuditLogFilter): boolean {
  return Boolean(f.from || f.to);
}

/**
 * Build a `BillHistoryFilter` from a Next.js `searchParams` object.
 * Strings only; missing/empty values are dropped. `take` is
 * clamped to [10, 200] with a default of 50.
 */
export function parseBillHistoryFilter(
  sp: Record<string, string | string[] | undefined> | undefined,
): BillHistoryFilter {
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
    take,
  };
}

/** Serialize a bill-history filter back to a URL query string. */
export function billHistoryFilterToQuery(f: BillHistoryFilter): string {
  const params = new URLSearchParams();
  if (f.type) params.set("type", f.type);
  if (f.take && f.take !== 50) params.set("take", String(f.take));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ──────────────────────────────────────────────────────────────────────
// Color map (stable per actionType) — used by both server and client
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
// Bill-scope helpers (used by both the page and the live wrapper)
// ──────────────────────────────────────────────────────────────────────

/** Extract a billId from a parsed payload, or null. */
export function payloadMentionsBillId(
  p: Record<string, unknown>,
): string | null {
  if (typeof p.billId === "string") return p.billId;
  if (Array.isArray(p.billsCredited)) {
    for (const id of p.billsCredited) {
      if (typeof id === "string") return id;
    }
  }
  return null;
}

/** Build a `/vault/bills/<id>/history?type=...` deep-link from a
 *  row's payload, when the payload carries a billId. Used by
 *  the AuditTable row to deep-link into this page. Returns null
 *  when the row has no billId (so the caller can render the
 *  cell without a link). */
export function billHistoryHrefForAuditRow(
  payload: Record<string, unknown>,
): string | null {
  const billId = payloadMentionsBillId(payload);
  if (!billId) return null;
  const t =
    typeof payload.actionType === "string"
      ? (payload.actionType as string)
      : null;
  // Most rows should NOT inherit the audit row's type as the
  // bill-history filter (e.g. a "vault.funded" row would
  // naturally filter to funded, but the user wants to see the
  // bill's full history). Exception: when the row's payload
  // actionType is "vault.bill_state_changed" or a payment
  // outcome, the type is a meaningful starting filter.
  const preserveType =
    t === "vault.bill_state_changed" ||
    t === "vault.payment_settled" ||
    t === "vault.payment_failed" ||
    t === "vault.payment_attempted" ||
    t === "vault.scheduler_run";
  const qs = preserveType ? `?type=${encodeURIComponent(t!)}` : "";
  return `/vault/bills/${encodeURIComponent(billId)}/history${qs}`;
}

// ──────────────────────────────────────────────────────────────────────
// Where-clause predicate (mirrors `whereFromFilter` in audit-log.ts)
// ──────────────────────────────────────────────────────────────────────

/**
 * Pure JS predicate matching `whereFromFilter` in `audit-log.ts`.
 * Used by the client wrapper to filter streamed rows against the
 * page's current filter (the server already does this on the
 * initial read, but a streamed row that arrives after a filter
 * change needs the same gate on the client).
 *
 * Cluster 7.7 — also gates on the date range. The `from` /
 * `to` strings are `YYYY-MM-DD`; we compare against the row's
 * `createdAtIso` (a UTC ISO string). The server applies the
 * same window at the DB layer; the client-side check is
 * defense-in-depth for streamed rows.
 */
export function rowMatchesAuditFilter(
  row: { actionType: string; createdAtIso?: string },
  filter: {
    type?: string;
    prefix?: string;
    q?: string;
    from?: string;
    to?: string;
  },
): boolean {
  if (filter.type && row.actionType !== filter.type) return false;
  if (filter.prefix && !row.actionType.startsWith(filter.prefix)) return false;
  if (
    filter.q &&
    !row.actionType.toLowerCase().includes(filter.q.toLowerCase())
  ) {
    return false;
  }
  if (row.createdAtIso) {
    const rowDate = row.createdAtIso.slice(0, 10); // YYYY-MM-DD
    if (filter.from && rowDate < filter.from) return false;
    if (filter.to && rowDate > filter.to) return false;
  }
  return true;
}
