/**
 * LiveActivityTicker — Cluster 7.11 (live ticker) + 7.11.1 (semantic
 * tone colors + reconcile-on-reconnect).
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
 *     tone + deep-link). Returns null for unmapped types; the
 *     ticker filters them out silently.
 *
 * **Color**: Cluster 7.11.1 — replaced the djb2 hash
 * (`colorForActionType`) with semantic tone colors from the
 * humanizer (good=green, watch=orange, bad=red, neutral=ink-3).
 * In a 3-row ticker, djb2 confetti was noise; semantic colors
 * let the user triage at a glance. The audit page keeps djb2
 * for type-distinct rendering in a 50+ row table.
 *
 * **Reconcile on reconnect** (7.11.1): `useAuditStream`'s
 * docblock states reconnect does NOT replay missed events.
 * When the connection transitions from `reconnecting` / `closed`
 * back to `live`, the ticker fetches the last 3 rows from
 * `GET /api/vault/audit/recent` and prepends any new events not
 * already in `seenIds`. Capped at TICKER_LIMIT.
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
  formatRelativeTime,
  liveTickerEventFromRow,
  LIVE_TICKER_IGNORED_TYPES,
  TONE_COLOR,
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
  // hook's `ignoreActionTypes` only protects streamed rows), and
  // we drop any row the humanizer can't map (null return).
  const seed = React.useMemo<LiveTickerEvent[]>(
    () =>
      initialRows
        .filter((r) => !LIVE_TICKER_IGNORED_TYPES.has(r.actionType as never))
        .map(liveTickerEventFromRow)
        .filter((e): e is LiveTickerEvent => e !== null),
    [initialRows],
  );

  const [streamed, setStreamed] = useState<LiveTickerEvent[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set(seed.map((e) => e.id)));
  // Relative-time tick. Bumping this state re-renders the
  // ticker so the "2s ago" → "3s ago" column updates.
  const [, setRelTick] = useState(0);
  // Cluster 7.11.1 — reconcile-on-reconnect. Set to true after
  // the ticker has ever been in a non-live state (reconnecting /
  // closed). The next transition to "live" triggers a single
  // fetch from /api/vault/audit/recent to backfill any events
  // that arrived during the disconnect window.
  const hasBeenDisconnected = useRef(false);

  const onRow = useCallback((row: AuditLogRow) => {
    if (seenIds.current.has(row.id)) return;
    const ev = liveTickerEventFromRow(row);
    if (!ev) return; // unmapped type — silently drop
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

  // Cluster 7.11.1 — reconcile-on-reconnect. EventSource auto-
  // reconnects on transient errors, but it does NOT replay
  // missed events. When we transition from a non-live state
  // back to "live", fetch the last TICKER_LIMIT rows from the
  // server and prepend any new events not already in seenIds.
  //
  // We use a ref to track "ever been disconnected" so the first
  // mount → "live" doesn't fire a redundant fetch (the initial
  // rows already cover it).
  useEffect(() => {
    if (state === "reconnecting" || state === "closed") {
      hasBeenDisconnected.current = true;
      return;
    }
    if (state !== "live" || !hasBeenDisconnected.current) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/vault/audit/recent?take=${TICKER_LIMIT}`,
          { credentials: "same-origin" },
        );
        if (!r.ok) return;
        const body = (await r.json()) as {
          ok?: boolean;
          rows?: AuditLogRow[];
        };
        if (cancelled || !body.ok || !Array.isArray(body.rows)) return;
        // Convert + filter + dedupe against seenIds. The
        // server's rows are newest-first; we want to prepend
        // any that aren't already in the ticker. Re-use the
        // same liveTickerEventFromRow helper so the filter
        // (meta events + unmapped) stays consistent.
        const newEvents: LiveTickerEvent[] = [];
        for (const row of body.rows) {
          if (seenIds.current.has(row.id)) continue;
          if (LIVE_TICKER_IGNORED_TYPES.has(row.actionType as never)) {
            // Don't add to seenIds — these never reach the ticker.
            continue;
          }
          const ev = liveTickerEventFromRow(row);
          if (!ev) continue;
          seenIds.current.add(row.id);
          newEvents.push(ev);
          if (newEvents.length >= TICKER_LIMIT) break;
        }
        if (cancelled || newEvents.length === 0) return;
        setStreamed((prev) => {
          const next = [...newEvents, ...prev].slice(0, TICKER_LIMIT);
          // Drop seenIds entries that fell out of the window.
          const nextIds = new Set(next.map((e) => e.id));
          for (const id of [...seenIds.current]) {
            if (!nextIds.has(id)) seenIds.current.delete(id);
          }
          return next;
        });
        // Flash the newest prepended row so the user sees the
        // backfill arrived.
        const newest = newEvents[0];
        if (newest) {
          setFlashId(newest.id);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => {
            setFlashId(null);
            flashTimer.current = null;
          }, 2000);
        }
      } catch {
        // Network blip. The next reconnect cycle will retry.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

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
        // Cluster 7.11.1 — semantic tone color (good/watch/bad/
        // neutral → CSS var). The audit page keeps djb2 (50+ row
        // table is where type-distinct colors earn their keep);
        // the 3-row ticker uses the humanizer's tone.
        const color = TONE_COLOR[ev.tone] ?? TONE_COLOR.neutral;
        const time = formatRelativeTime(ev.at);
        const isFlash = ev.id === flashId;
        const rowContent = (
          <>
            <span
              aria-hidden
              data-tone={ev.tone}
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
            data-tone={ev.tone}
            style={{ ...rowStyle, color: "var(--ink-2)" }}
          >
            {rowContent}
          </Link>
        ) : (
          <div
            key={ev.id}
            data-testid="vault-live-ticker-row"
            data-action-type={ev.actionType}
            data-tone={ev.tone}
            style={rowStyle}
          >
            {rowContent}
          </div>
        );
      })}
    </section>
  );
}
