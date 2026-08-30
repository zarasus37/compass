/**
 * useAuditStream — client hook for the SSE audit stream (Cluster 7.6).
 *
 * Opens an `EventSource` to `/api/vault/audit/stream` and calls
 * `onRow(row)` for each new audit event that arrives. The hook is
 * used by `LiveAuditTable` (the /vault/audit page) and
 * `LiveBillEventTable` (the /vault/bills/[id]/history page).
 *
 * **Wire contract** (mirrors the server route):
 *   - First event is the hello: `data: {"ok":true}`. The hook
 *     treats this as a "connected" signal and does NOT call
 *     `onRow` for it.
 *   - Subsequent events are `data: <JSON AuditLogRow>`. The hook
 *     parses + filters + calls `onRow`.
 *
 * **Filtering**:
 *   - `ignoreActionTypes` — client-side filter. Used to avoid
 *     self-feedback: the audit page ignores `vault.audit_log_viewed`
 *     (the page's own write-after-read meta event); the bill
 *     history page ignores `vault.bill_history_viewed` (and
 *     `vault.audit_log_viewed` if the user navigates between the
 *     two pages in quick succession).
 *   - `billId` — also enforced server-side, but the hook applies
 *     a defensive client-side check too. Cheap; protects against
 *     a future code path where the URL gets mutated.
 *
 * **Reconnect**: `EventSource` auto-reconnects on error (browser
 * default). The hook tracks the connection state for a small
 * "live / reconnecting" indicator and re-opens cleanly on
 * navigation back. Reconnect does NOT replay missed events — the
 * audit log is append-only, the user can refresh to reconcile.
 *
 * **Cleanup**: on unmount or when `isOpen` flips to `false`, the
 * hook calls `eventSource.close()`. The server-side route
 * receives the abort signal, removes the bus listener, and
 * clears its heartbeat timer.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditLogRow } from "./audit-log";

export type UseAuditStreamOptions = {
  /** When set, the stream is scoped to this bill's events only. */
  billId?: string;
  /** Called for each new event that passes the ignore filter. */
  onRow: (row: AuditLogRow) => void;
  /** Event types the consumer wants to drop (e.g. the page's
   *  own meta event to avoid self-feedback). */
  ignoreActionTypes?: string[];
  /** Set to `false` to disconnect the stream (e.g. while a
   *  filter is being applied). Default `true`. */
  isOpen?: boolean;
};

export type AuditStreamState = "connecting" | "live" | "reconnecting" | "closed";

/**
 * Subscribe to the audit event stream. Returns the current
 * connection state for the page to render a small indicator.
 *
 * The hook deliberately keeps its state machine simple:
 *   - on mount (or when isOpen flips true): open an EventSource
 *   - on error: state = "reconnecting" (browser will auto-retry)
 *   - on unmount (or isOpen false): close + state = "closed"
 *
 * No "live → reconnecting" transition on a single missed event —
 * `EventSource` swallows transient errors and reconnects silently.
 * We only flip to "reconnecting" when the browser's `onerror`
 * actually fires (which it does for hard failures, auth issues,
 * and 5xx responses).
 */
export function useAuditStream(opts: UseAuditStreamOptions): {
  state: AuditStreamState;
} {
  const { billId, onRow, ignoreActionTypes, isOpen = true } = opts;
  const [state, setState] = useState<AuditStreamState>("connecting");
  // Stash the latest values in refs so the effect doesn't re-run
  // on every render. The handler closure is fresh on each call,
  // which is fine — EventSource just overwrites `onmessage`.
  const onRowRef = useRef(onRow);
  const ignoreRef = useRef(ignoreActionTypes);
  const billIdRef = useRef(billId);
  onRowRef.current = onRow;
  ignoreRef.current = ignoreActionTypes;
  billIdRef.current = billId;

  useEffect(() => {
    if (!isOpen) {
      setState("closed");
      return;
    }
    if (typeof window === "undefined") return; // SSR safety
    if (typeof EventSource === "undefined") {
      // Old browser / test env without EventSource. Treat as
      // closed; the page still renders the server-rendered
      // initial rows.
      setState("closed");
      return;
    }

    setState("connecting");
    const qs = billIdRef.current
      ? `?billId=${encodeURIComponent(billIdRef.current)}`
      : "";
    const es = new EventSource(`/api/vault/audit/stream${qs}`);

    es.onopen = () => {
      setState("live");
    };
    es.onerror = () => {
      // Browser will auto-retry with a backoff. We surface the
      // transient state so the page can show a "reconnecting"
      // chip if it wants. EventSource will fire `onopen` again
      // when the next attempt succeeds.
      setState("reconnecting");
    };
    es.onmessage = (ev: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      // Hello message — first event on every connection. Skip.
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { ok?: unknown }).ok === true
      ) {
        setState("live");
        return;
      }
      // Real row. Validate the shape.
      const row = parsed as Partial<AuditLogRow> & { id?: unknown };
      if (
        !row ||
        typeof row.id !== "string" ||
        typeof row.actionType !== "string" ||
        !row.payload ||
        typeof row.payload !== "object" ||
        typeof row.createdAtIso !== "string"
      ) {
        return;
      }
      // Self-feedback / ignore filter.
      const ignore = ignoreRef.current;
      if (ignore && ignore.includes(row.actionType)) return;
      // Defensive bill-scope check.
      if (billIdRef.current) {
        const p = row.payload as Record<string, unknown>;
        const matches =
          (typeof p.billId === "string" && p.billId === billIdRef.current) ||
          (Array.isArray(p.billsCredited) &&
            (p.billsCredited as unknown[]).includes(billIdRef.current));
        if (!matches) return;
      }
      onRowRef.current({
        id: row.id,
        actionType: row.actionType,
        payload: row.payload as Record<string, unknown>,
        aiTierAtTime:
          typeof row.aiTierAtTime === "number" ? row.aiTierAtTime : 0,
        createdAtIso: row.createdAtIso,
      });
    };

    return () => {
      es.close();
      setState("closed");
    };
  }, [isOpen, billId]);

  return { state };
}
