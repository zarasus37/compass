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
 *
 * Cluster 7.11 — added `LiveTickerEvent`, the humanizer map, and
 * the relative-time formatter used by the LiveActivityTicker in
 * the sidebar. All client-safe (no Prisma, no `server-only`).
 */

import { formatMoney } from "@/lib/money";
import {
  VAULT_AUDIT_ACTION_TYPES,
  LIVE_TICKER_IGNORED_TYPES,
  type VaultAuditActionType,
} from "./audit-action-types";

// Re-export the action-type bits so consumers can import
// everything from `@/lib/vault/audit-log-shared` (one import path
// for the live-ticker use case).
export { VAULT_AUDIT_ACTION_TYPES, LIVE_TICKER_IGNORED_TYPES };
export type { VaultAuditActionType };

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
 *
 * Cluster 7.8 — added the `365d` ("Last 12 months") preset for
 * the year view. The activity strip caps at 90 columns for
 * display, so the 365-day strip downsamples to 90 buckets
 * (each bar ≈ 4 days). The table shows the full year.
 */
export type DateRangePresetId = "24h" | "7d" | "30d" | "90d" | "365d" | "all";

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
  { id: "365d", label: "Last 12 months", daysBack: 365 },
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

// ──────────────────────────────────────────────────────────────────────
// Live ticker types + humanizer (Cluster 7.11)
// ──────────────────────────────────────────────────────────────────────

/**
 * Shape of a single row in the sidebar's live activity ticker.
 * `summary` is the humanized 1-liner; `at` is the row's UTC ISO
 * timestamp. `href` is set when the payload carries a billId
 * (deep-link to `/vault/bills/[id]/history`, via the existing
 * `billHistoryHrefForAuditRow` helper — same source of truth
 * the AuditTable row uses).
 */
export type LiveTickerEvent = {
  id: string;
  actionType: VaultAuditActionType | string;
  summary: string;
  /** Semantic tone for the color dot. Drives the row's signal
   *  color (good=green, watch=orange, bad=red, neutral=ink-3).
   *  Cluster 7.11.1 — replaced the djb2 hash from 7.11 with a
   *  semantic map; djb2 confetti was noise in a 3-row ticker. */
  tone: HumanizeTone;
  at: string;
  href?: string;
};

/**
 * Semantic tone for a vault event. Drives the LiveActivityTicker's
 * color dot — green for "good news", orange for "needs attention",
 * red for "broken", neutral for everything else.
 *
 * Cluster 7.11.1 — the 7.11 djb2 hash (`colorForActionType`) is
 * kept for the audit page (where a 50+ row table benefits from
 * type-distinct colors) but replaced in the 3-row ticker, where
 * djb2 confetti was noise.
 */
export type HumanizeTone = "good" | "watch" | "bad" | "neutral";

/**
 * Per-action-type tone. Compile-time exhaustiveness on the
 * `VaultAuditActionType` union — a missing key is a TS error.
 * Edit together with the `humanize` switch below.
 *
 * Rationale per type:
 *   - "good"    — money in, success, manual confirm, risk accepted
 *   - "watch"   — in-progress, fallback, transient data stale
 *   - "bad"     — failed, paused, unhandled risk
 *   - "neutral" — config/state changes, ambient events, meta
 */
const TONE_FOR: Record<VaultAuditActionType, HumanizeTone> = {
  // Vault lifecycle
  "vault.synced": "neutral",
  "vault.paused": "bad",
  "vault.resumed": "good",
  "vault.balance_refreshed": "neutral",
  "vault.safe_deployed": "good",
  "vault.safe_deploy_failed": "bad",
  "vault.funded": "good",
  // Aave
  "vault.aave_supply": "good",
  "vault.aave_withdraw": "neutral",
  "vault.apy_refreshed": "neutral",
  "vault.apy_refresh_failed": "watch",
  // Yield routing
  "vault.yield_routed": "good",
  "vault.yield_routing_changed": "neutral",
  // Bills
  "vault.bill_added": "neutral",
  "vault.bill_updated": "neutral",
  "vault.bill_deleted": "neutral",
  "vault.bill_state_changed": "neutral",
  // Payments
  "vault.payment_attempted": "watch",
  "vault.payment_settled": "good",
  "vault.payment_failed": "bad",
  "vault.payment_executed": "good",
  "vault.payment_manually_confirmed": "good",
  // Adapters
  "vault.adapter_fallback": "watch",
  // Off-ramp / risk
  "vault.off_ramp_provider_changed": "neutral",
  "vault.risk_acknowledged": "good",
  "vault.risk_unacknowledged": "bad",
  // Scheduler
  "vault.scheduler_run": "neutral",
  // Meta (filtered at the hook, but humanized for completeness)
  "vault.audit_log_viewed": "neutral",
  "vault.bill_history_viewed": "neutral",
  // Cluster 7.10 — cron alert surface
  "vault.cron_prune_failure": "bad",
};

/**
 * CSS var for each tone. Tied to the design system's status colors
 * (good=--ok, watch=--vessel-watch, bad=--vessel-over) plus a dim
 * neutral (`--ink-3`) that doesn't compete with the brand's
 * purple `--vessel-accent`.
 *
 * Exported so the LiveActivityTicker (Cluster 7.11.1) and any
 * future tone-driven surface can share the same mapping.
 */
export const TONE_COLOR: Record<HumanizeTone, string> = {
  good: "var(--ok)",
  watch: "var(--vessel-watch)",
  bad: "var(--vessel-over)",
  neutral: "var(--ink-3)",
};

/**
 * Map a vault action to a human-readable summary + semantic tone.
 * Covers all 30 action types in the `VaultAuditActionType` union.
 * Returns `null` for any unknown type (a future-added action type
 * that bypassed the type system) — the ticker filters `null` out
 * silently rather than rendering an "event happened" placeholder.
 *
 * Cluster 7.11.1 — return shape changed from `string` to
 * `{ text, tone } | null`. The ticker uses `tone` for the color
 * dot. The null branch replaces the old "event happened"
 * fallback: hiding is safer than rendering jargon in a non-tech
 * user's sidebar.
 *
 * The map is exhaustive for known types (TS error on missing key).
 * The runtime null fallback is the "future type" safety net; it
 * should not fire in normal use.
 */
function humanize(
  actionType: VaultAuditActionType,
  payload: Record<string, unknown>,
): { text: string; tone: HumanizeTone } {
  const tone = TONE_FOR[actionType];
  switch (actionType) {
    case "vault.synced":
      return { text: "Vault synced", tone };
    case "vault.paused":
      return { text: "Vault paused", tone };
    case "vault.resumed":
      return { text: "Vault resumed", tone };
    case "vault.balance_refreshed":
      return { text: "Balance refreshed", tone };
    case "vault.safe_deployed":
      return { text: "Safe deployed", tone };
    case "vault.safe_deploy_failed":
      return { text: "Safe deploy failed", tone };
    case "vault.funded":
      return {
        text: `Safe funded${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.aave_supply":
      return {
        text: `Aave supply${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.aave_withdraw":
      return {
        text: `Aave withdraw${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.apy_refreshed":
      return {
        text: `APY refreshed${
          payload.fromApr != null && payload.toApr != null
            ? ` · ${payload.fromApr}% → ${payload.toApr}%`
            : ""
        }`,
        tone,
      };
    case "vault.apy_refresh_failed":
      return { text: "APY refresh failed", tone };
    case "vault.yield_routed":
      return {
        text: `Yield routed${formatAmount(payload.totalRoutedCents)}`,
        tone,
      };
    case "vault.yield_routing_changed":
      return {
        text:
          payload.fromStrategy || payload.toStrategy
            ? `Yield routing · ${payload.fromStrategy ?? "—"} → ${payload.toStrategy ?? "—"}`
            : "Yield routing changed",
        tone,
      };
    case "vault.bill_added":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} added${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.bill_updated":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} updated`,
        tone,
      };
    case "vault.bill_deleted":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} deleted`,
        tone,
      };
    case "vault.bill_state_changed":
      return {
        text:
          payload.from || payload.to
            ? `${strField(payload.billerName) ?? "Bill"} · ${payload.from ?? "—"} → ${payload.to ?? "—"}`
            : "Bill state changed",
        tone,
      };
    case "vault.payment_attempted":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} · payment attempted${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.payment_settled":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} · payment settled${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.payment_failed":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} · payment FAILED${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.payment_executed":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} · executed via ${strField(payload.provider) ?? "gateway"}${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.payment_manually_confirmed":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} · confirmed manually${formatAmount(payload.amountCents)}`,
        tone,
      };
    case "vault.adapter_fallback":
      return {
        text: `Adapter fallback${payload.from || payload.to ? ` · ${payload.from ?? "—"} → ${payload.to ?? "—"}` : ""}`,
        tone,
      };
    case "vault.off_ramp_provider_changed":
      return {
        text: `Off-ramp: ${strField(payload.from) ?? "—"} → ${strField(payload.to) ?? "—"}`,
        tone,
      };
    case "vault.risk_acknowledged":
      return { text: "Risk acknowledged", tone };
    case "vault.risk_unacknowledged":
      return { text: "Risk unacknowledged", tone };
    case "vault.scheduler_run":
      return {
        text: `Scheduler run${
          payload.usersProcessed != null || payload.billsAffected != null
            ? ` · ${payload.usersProcessed ?? 0} users, ${payload.billsAffected ?? 0} bills`
            : ""
        }`,
        tone,
      };
    // Meta events are excluded by LIVE_TICKER_IGNORED_TYPES, but
    // the humanizer still maps them so a smoke that bypasses the
    // ignore-set can verify the map is exhaustive.
    case "vault.audit_log_viewed":
      return { text: "Audit log opened", tone };
    case "vault.bill_history_viewed":
      return {
        text: `${strField(payload.billerName) ?? "Bill"} history opened`,
        tone,
      };
    case "vault.cron_prune_failure":
      return {
        text: `Audit log prune failed${payload.error ? ` · ${truncate(strField(payload.error) ?? "", 40)}` : ""}`,
        tone,
      };
    default: {
      // Exhaustiveness check — if a new action type is added to
      // the union without a humanizer, this assignment fails
      // at compile time. The `TONE_FOR` map above would also
      // fail to compile, so both gates fire in the same edit.
      const _exhaustive: never = actionType;
      void _exhaustive;
      // Unreachable in normal use; the public humanizer wraps
      // this and returns null for unknown types.
      return { text: "event happened", tone: "neutral" };
    }
  }
}

function strField(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function formatAmount(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return ` · ${formatMoney(v)}`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/**
 * Public humanizer. Returns `{ text, tone }` for any action type
 * in the `VaultAuditActionType` union, or `null` for an unknown
 * type (a future-added action that bypassed the type system).
 *
 * Cluster 7.11.1 — return shape changed from `string` to
 * `{ text, tone } | null`. The `null` branch replaces the old
 * "event happened" fallback so a non-technical user never sees
 * a placeholder string in the sidebar ticker.
 *
 * The audit page chips and any other caller that previously did
 * `humanizeVaultAction(t, p)` must now check for null. Today
 * the only caller is the LiveActivityTicker via
 * `liveTickerEventFromRow`; the audit page renders `actionType`
 * directly (not the humanized text).
 */
export function humanizeVaultAction(
  actionType: string,
  payload: Record<string, unknown>,
): { text: string; tone: HumanizeTone } | null {
  // Fast path: known type → exhaustive switch.
  if ((VAULT_AUDIT_ACTION_TYPES as ReadonlyArray<string>).includes(actionType)) {
    return humanize(actionType as VaultAuditActionType, payload);
  }
  // Unknown type (likely a future-added one before the humanizer
  // is updated). The smoke asserts this never fires for a
  // type in the union. The ticker treats null as "don't render".
  return null;
}

/**
 * Format a millisecond-accurate ISO timestamp as a compact
 * "2s ago" / "1m ago" / "3h ago" / "2d ago" string. Used by
 * the ticker for the right-aligned timestamp column. Past
 * timestamps only; future timestamps render as `"now"`.
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const delta = now.getTime() - t;
  if (delta < 0) return "now";
  const sec = Math.floor(delta / 1000);
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  // Older than a month — show the date so the user knows it's
  // not "fresh" activity.
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Build a `LiveTickerEvent` from a row received via the SSE
 * stream (or read from the initial server render). Centralizes
 * the humanize + deep-link + tone assignment so the ticker
 * component stays purely presentational.
 *
 * Returns `null` when the humanizer doesn't recognize the action
 * type (a future-added type that bypassed the union). The ticker
 * filters null out — unmapped events are silently dropped instead
 * of rendering an "event happened" placeholder.
 *
 * Cluster 7.11.1 — added the `tone` field for the semantic color
 * dot. The audit page uses `colorForActionType` (djb2); the
 * ticker uses the humanizer's tone.
 */
export function liveTickerEventFromRow(row: {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAtIso: string;
}): LiveTickerEvent | null {
  const h = humanizeVaultAction(row.actionType, row.payload);
  if (!h) return null;
  const href = billHistoryHrefForAuditRow(row.payload) ?? undefined;
  return {
    id: row.id,
    actionType: row.actionType,
    summary: h.text,
    tone: h.tone,
    at: row.createdAtIso,
    href,
  };
}
