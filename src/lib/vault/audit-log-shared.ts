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
 */
export function rowMatchesAuditFilter(
  row: { actionType: string },
  filter: { type?: string; prefix?: string; q?: string },
): boolean {
  if (filter.type) return row.actionType === filter.type;
  if (filter.prefix) return row.actionType.startsWith(filter.prefix);
  if (filter.q)
    return row.actionType.toLowerCase().includes(filter.q.toLowerCase());
  return true;
}
