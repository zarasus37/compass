/**
 * LiveAuditTable — Cluster 7.6.
 *
 * The `/vault/audit` page's live table. Wraps the shared
 * `AuditTableView` row JSX and subscribes to the SSE audit stream
 * so new rows land at the top of the table in real time without
 * a full page reload.
 *
 * **What it does**:
 *   1. Server renders the initial rows (passed as `initialRows`).
 *   2. The client mounts and subscribes to `/api/vault/audit/stream`.
 *   3. Each new event that passes the page's filter is prepended;
 *      the tail is trimmed to `take` so the list never grows
 *      unbounded.
 *   4. A small `// stream: live | reconnecting | connecting`
 *      chip is shown above the table. A `[+1 NEW]` flash fires
 *      for 3s when a new row arrives.
 *
 * **Self-feedback guard**: the page writes a
 * `vault.audit_log_viewed` row on every render (the audit-the-
 * audited pattern from C7.4). Without the `ignoreActionTypes`
 * filter, the SSE stream would push that row back to the same
 * page and it would visibly appear in the table mid-render.
 * The hook drops it before `onRow` is called.
 *
 * **Server-rendered initial rows remain authoritative**: the
 * wrapper uses `initialRows` as the base; streamed rows are
 * prepended. A reconnect doesn't replay missed events — the
 * user can refresh to reconcile.
 */
"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  rowMatchesAuditFilter,
  type AuditLogRow,
} from "@/lib/vault/audit-log-shared";
import { useAuditStream } from "@/lib/vault/use-audit-stream";
import { AuditTableView } from "./AuditTableView";

export function LiveAuditTable({
  initialRows,
  take,
  filter,
  hasMore,
}: {
  initialRows: AuditLogRow[];
  take: number;
  filter: { type?: string; prefix?: string; q?: string };
  hasMore: boolean;
}) {
  // Rows that have streamed in since the initial render. We
  // prepend these on top of the initial rows. The list is
  // trimmed to `take` in the onRow handler.
  const [streamed, setStreamed] = useState<AuditLogRow[]>([]);
  // Small [+1 NEW] chip flash. The setTimeout clears it after
  // 3s. We use a ref so successive arrivals within the window
  // don't reset the timer (the user gets one continuous flash).
  const [flashCount, setFlashCount] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which row IDs are already in the rendered list so a
  // race (initial render writes a row, stream pushes it back)
  // doesn't double-insert.
  const seenIds = useRef<Set<string>>(
    new Set(initialRows.map((r) => r.id)),
  );

  const onRow = useCallback(
    (row: AuditLogRow) => {
      // Self-feedback guard: the page's own write-after-read
      // meta event. The hook ALSO filters this in the
      // ignoreActionTypes, but defense in depth — the audit
      // page should never show a row that says "the audit page
      // was viewed" while the user is looking at the audit
      // page.
      if (row.actionType === "vault.audit_log_viewed") return;
      // Filter gate: a streamed row that doesn't match the
      // page's current filter is dropped. (The server already
      // filters the initial read; this is for rows that arrive
      // after a filter change — rare, but the smoke checks it.)
      if (!rowMatchesAuditFilter(row, filter)) return;
      // De-dupe against the initial set + already-streamed set.
      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setStreamed((prev) => {
        const next = [row, ...prev];
        // Trim the tail to `take` so the list never grows
        // unbounded. The "tail" rows get evicted from `seenIds`
        // so they can re-stream if the user resets the page.
        if (next.length > take) {
          const dropped = next.slice(take);
          for (const d of dropped) seenIds.current.delete(d.id);
          return next.slice(0, take);
        }
        return next;
      });
      // Flash the [+1 NEW] chip for 3s.
      setFlashCount((c) => c + 1);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        setFlashCount(0);
        flashTimer.current = null;
      }, 3000);
    },
    [filter, take],
  );

  const { state } = useAuditStream({
    onRow,
    ignoreActionTypes: ["vault.audit_log_viewed"],
  });

  // Combine: streamed (newest first) + initial. Both are already
  // newest-first; the concatenation preserves the order.
  const combined = [...streamed, ...initialRows];

  return (
    <div>
      <div
        data-testid="vault-audit-stream-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--ink-3)",
        }}
      >
        <span data-testid="vault-audit-stream-state">
          {state === "live" ? "// stream: live" : null}
          {state === "reconnecting" ? "// stream: reconnecting" : null}
          {state === "connecting" ? "// stream: connecting" : null}
          {state === "closed" ? "// stream: closed" : null}
        </span>
        {flashCount > 0 ? (
          <span
            data-testid="vault-audit-stream-flash"
            style={{
              color: "var(--vessel-accent)",
              fontWeight: 700,
              animation: "vault-audit-flash 3s ease-out",
            }}
          >
            [+1 NEW] ×{flashCount}
          </span>
        ) : null}
      </div>
      <AuditTableView
        rows={combined}
        take={take}
        filter={filter}
        // hasMore is meaningful only for the initial set. With
        // streaming, the list is always "more" — but to keep
        // the link consistent, pass hasMore as true only if the
        // combined set reached the cap. This avoids showing
        // [SHOW 50 MORE] when the initial set was 5 rows and
        // nothing has streamed in.
        hasMore={
          hasMore ||
          // If we trimmed the tail (i.e. we received enough
          // streamed rows to evict initial rows), there is
          // effectively more data to fetch via the deeper
          // pagination URL.
          (streamed.length >= take && initialRows.length === take)
        }
        testId="vault-audit-table-live"
      />
    </div>
  );
}
