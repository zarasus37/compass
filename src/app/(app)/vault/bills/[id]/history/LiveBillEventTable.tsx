/**
 * LiveBillEventTable — Cluster 7.6.
 *
 * The bill history page's live table. Mirrors `LiveAuditTable`
 * but scoped to a single bill: the stream is opened with
 * `?billId=...` and only events whose payload mentions the
 * bill are forwarded.
 *
 * **Self-feedback guard**: drops `vault.bill_history_viewed`
 * (this page's own write-after-read meta event) AND
 * `vault.audit_log_viewed` (the audit page's meta event; the
 * user can navigate between audit and history, and a
 * `vault.audit_log_viewed` row would briefly show up in the
 * history table otherwise).
 */
"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  type AuditLogRow,
} from "@/lib/vault/audit-log-shared";
import { useAuditStream } from "@/lib/vault/use-audit-stream";
import { BillEventTableView } from "./BillEventTableView";

export function LiveBillEventTable({
  billId,
  initialRows,
  take,
  filter,
  hasMore,
}: {
  billId: string;
  initialRows: AuditLogRow[];
  take: number;
  filter: { type?: string };
  hasMore: boolean;
}) {
  const [streamed, setStreamed] = useState<AuditLogRow[]>([]);
  const [flashCount, setFlashCount] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(
    new Set(initialRows.map((r) => r.id)),
  );

  const onRow = useCallback(
    (row: AuditLogRow) => {
      // Self-feedback guard: drop both this page's meta event
      // and the audit page's meta event. The hook also filters
      // these via ignoreActionTypes; defense in depth.
      if (
        row.actionType === "vault.bill_history_viewed" ||
        row.actionType === "vault.audit_log_viewed"
      ) {
        return;
      }
      // Filter gate: the page's `?type=` filter (same as the
      // server's WHERE clause).
      if (filter.type && row.actionType !== filter.type) return;
      // De-dupe.
      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setStreamed((prev) => {
        const next = [row, ...prev];
        if (next.length > take) {
          const dropped = next.slice(take);
          for (const d of dropped) seenIds.current.delete(d.id);
          return next.slice(0, take);
        }
        return next;
      });
      setFlashCount((c) => c + 1);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        setFlashCount(0);
        flashTimer.current = null;
      }, 3000);
    },
    [filter.type, take],
  );

  const { state } = useAuditStream({
    billId,
    onRow,
    ignoreActionTypes: [
      "vault.bill_history_viewed",
      "vault.audit_log_viewed",
    ],
  });

  const combined = [...streamed, ...initialRows];

  return (
    <div>
      <div
        data-testid="vault-bill-history-stream-bar"
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
        <span data-testid="vault-bill-history-stream-state">
          {state === "live" ? "// stream: live" : null}
          {state === "reconnecting" ? "// stream: reconnecting" : null}
          {state === "connecting" ? "// stream: connecting" : null}
          {state === "closed" ? "// stream: closed" : null}
        </span>
        {flashCount > 0 ? (
          <span
            data-testid="vault-bill-history-stream-flash"
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
      <BillEventTableView
        rows={combined}
        take={take}
        filter={filter}
        hasMore={
          hasMore ||
          (streamed.length >= take && initialRows.length === take)
        }
        testId="vault-bill-history-table-live"
      />
    </div>
  );
}
