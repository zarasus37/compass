/**
 * LiveActivityTicker — Cluster 7.11.
 *
 * Sidebar widget that surfaces the last 3 vault events as a
 * live feed under the `// Ledger` chapter header. The user
 * sees the most recent things that happened (payments, state
 * changes, sync, alerts) without navigating away from the
 * current page.
 *
 * **Wiring**:
 *   - Subscribes to the existing `useAuditStream` SSE hook
 *     (same wire as the audit page + bill history page).
 *   - `limit: 3` is implicit via local state trim.
 *   - `ignoreActionTypes: [...LIVE_TICKER_IGNORED_TYPES]` drops
 *     the two meta events (`vault.audit_log_viewed`,
 *     `vault.bill_history_viewed`) so the ticker doesn't echo
 *     the page renders that subscribe to it.
 *   - `liveTickerEventFromRow` is the single point that turns
 *     a raw `AuditLogRow` into a `LiveTickerEvent` (humanize +
 *     deep-link).
 *
 * **Empty state is silent**: when there are no events, the
 * component renders nothing. The sidebar just doesn't show the
 * ticker. A new row that streams in makes the ticker appear
 * (the `+1 NEW` flash fires on the new row, not on the section).
 *
 * **Server-side initial render**: the sidebar's parent server
 * component passes `initialRows` (the last 3 events from the
 * DB). The client mounts with that seed and then subscribes.
 * The combined list is `streamed` (prepended) + `initialRows`.
 *
 * **Resize behavior**: the ticker re-renders its time column
 * (e.g. "2s ago" → "3s ago") every 5s via a `useEffect` /
 * `setInterval` so the relative time stays accurate without
 * hammering the bus.
 *
 * **Accessibility**:
 *   - `aria-label="Recent vault activity"` on the wrapping
 *     `<section>` so screen readers announce the section.
 *   - `aria-live="polite"` on the new-row region so AT users
 *     hear about new events without being interrupted.
 *   - Each row is a `<Link>` when `href` is set, otherwise
 *     plain text (so the cursor / focus state is only present
 *     on actionable rows).
 */
"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  colorForActionType,
  formatRelativeTime,
  humanizeVaultAction,
  liveTickerEventFromRow,
  LIVE_TICKER_IGNORED_TYPES,
  billHistoryHrefForAuditRow,
  type AuditLogRow,
  type LiveTickerEvent,
} from "@/lib/vault/audit-log-shared";
import { useAuditStream } from "@/lib/vault/use-audit-stream";

const TICKER_LIMIT = 3;
// Re-render relative-time column every 5s. Cheap (single state
// tick on the ticker component). The 5s cadence means "Xs ago"
// stays accurate within ±5s, which is the resolution a human
// can perceive for a "just happened" indicator.
const REL_TICK_MS = 5_000;

export type LiveActivityTickerProps = {
  /** The last N events (newest first) read server-side. Empty
   *  array = no initial rows. The ticker subscribes for live
   *  updates on mount. */
  initialRows: AuditLogRow[];
};

export function LiveActivityTicker({ initialRows }: LiveActivityTickerProps) {
  // Convert initialRows to LiveTickerEvent shape (centralizes the
  // humanize + deep-link work). Use a ref-based memo so the
  // initial events don't get re-humanized on every re-render.
  // The server passes the last 3 rows; we filter out the meta
  // events here so the initial render never shows them (the
  // hook's `ignoreActionTypes` only protects streamed rows).
  const seed = React.useMemo<LiveTickerEvent[]>(
    () =>
      initialRows
        .filter((r) => !LIVE_TICKER_IGNORED_TYPES.has(r.actionType as never))
        .map(liveTickerEventFromRow),
    [initialRows],
  );

  const [streamed, setStreamed] = useState<LiveTickerEvent[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set(seed.map((e) => e.id)));
  // Relative-time tick. Bumping this state re-renders the
  // ticker so the "2s ago" → "3s ago" column updates.
  const [, setRelTick] = useState(0);

  const onRow = useCallback((row: AuditLogRow) => {
    if (seenIds.current.has(row.id)) return;
    const ev = liveTickerEventFromRow(row);
    seenIds.current.add(row.id);
    setStreamed((prev) => {
      const next = [ev, ...prev];
      if (next.length > TICKER_LIMIT) {
        const dropped = next.slice(TICKER_LIMIT);
        for (const d of dropped) seenIds.current.delete(d.id);
        return next.slice(0, TICKER_LIMIT);
      }
      return next;
    });
    setFlashId(ev.id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashId(null);
      flashTimer.current = null;
    }, 2000);
  }, []);

  const { state } = useAuditStream({
    onRow,
    ignoreActionTypes: [...LIVE_TICKER_IGNORED_TYPES],
  });

  // Tick the relative-time column.
  useEffect(() => {
    const id = setInterval(() => setRelTick((n) => n + 1), REL_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Cleanup the flash timer on unmount.
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Combine: streamed first (newest), then seed rows not in
  // streamed. Trim to TICKER_LIMIT.
  const events: LiveTickerEvent[] = [...streamed, ...seed]
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .slice(0, TICKER_LIMIT);

  if (events.length === 0) return null;

  return (
    <section
      aria-label="Recent vault activity"
      data-testid="vault-live-ticker"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        margin: "4px 0 8px",
        borderTop: "1px solid var(--vessel-border)",
        borderBottom: "1px solid var(--vessel-border)",
        padding: "6px 0",
      }}
    >
      {/* Stream state chip — terminal mono, 9px, dim color */}
      <div
        aria-live="polite"
        data-testid="vault-live-ticker-state"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 500,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "2px 12px 6px",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>
          {state === "live"
            ? "// stream: live"
            : state === "reconnecting"
              ? "// stream: reconnecting"
              : state === "connecting"
                ? "// stream: connecting"
                : null}
        </span>
        {flashId ? (
          <span
            data-testid="vault-live-ticker-flash"
            style={{
              color: "var(--vessel-accent)",
              fontWeight: 700,
            }}
          >
            +1 NEW
          </span>
        ) : null}
      </div>

      {/* The event list. Each row is a Link when href is set. */}
      {events.map((ev) => {
        const color = colorForActionType(ev.actionType);
        const time = formatRelativeTime(ev.at);
        const isFlash = ev.id === flashId;
        const rowContent = (
          <>
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: color,
                flexShrink: 0,
                boxShadow: isFlash ? `0 0 6px ${color}` : "none",
                transition: "box-shadow 600ms",
              }}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isFlash ? "var(--ink)" : "var(--ink-2)",
                transition: "color 600ms",
              }}
            >
              {ev.summary}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9,
                color: "var(--ink-3)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {time}
            </span>
          </>
        );
        const rowStyle: React.CSSProperties = {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          fontSize: 11.5,
          fontFamily: "var(--font-jetbrains), monospace",
          textDecoration: "none",
          background: isFlash
            ? "var(--vessel-accent-soft)"
            : "transparent",
          transition: "background 600ms",
        };
        return ev.href ? (
          <Link
            key={ev.id}
            href={ev.href}
            data-testid="vault-live-ticker-row"
            data-action-type={ev.actionType}
            style={{ ...rowStyle, color: "var(--ink-2)" }}
          >
            {rowContent}
          </Link>
        ) : (
          <div
            key={ev.id}
            data-testid="vault-live-ticker-row"
            data-action-type={ev.actionType}
            style={rowStyle}
          >
            {rowContent}
          </div>
        );
      })}
    </section>
  );
}
