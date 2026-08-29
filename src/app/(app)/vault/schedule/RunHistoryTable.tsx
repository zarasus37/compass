"use client";

/**
 * RunHistoryTable — last 20 scheduler runs.
 *
 * One row per audit log entry with actionType: "vault.scheduler_run".
 * Server-rendered initial list passed via props; the table is
 * non-interactive (read-only history).
 */

import * as React from "react";

type RunRow = {
  id: string;
  createdAt: string;
  billId: string | null;
  skipped: boolean;
  skipReason: string | null;
  error: string | null;
};

function relativeTime(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  const diff = now.getTime() - t;
  const abs = Math.abs(diff);
  if (abs < 60_000) return "just now";
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RunHistoryTable({ initialRuns }: { initialRuns: RunRow[] }) {
  if (initialRuns.length === 0) {
    return (
      <div
        data-testid="vault-schedule-history-empty"
        style={{
          padding: 24,
          background: "var(--surface)",
          border: "1px dashed var(--line)",
          color: "var(--ink-3)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "0.10em",
        }}
      >
        // no runs yet — your schedule will fire at the next computed tick.
      </div>
    );
  }

  const now = new Date();

  return (
    <div
      data-testid="vault-schedule-history-table"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 80px 1fr 1fr",
          padding: "8px 14px",
          borderBottom: "1px solid var(--line-soft)",
          color: "var(--ink-3)",
          fontSize: 9.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span>when</span>
        <span>status</span>
        <span>bill</span>
        <span>detail</span>
      </div>
      {initialRuns.map((r) => {
        const isError = !!r.error;
        const isSkip = r.skipped;
        const status = isError ? "ERROR" : isSkip ? "SKIPPED" : "EXECUTED";
        const statusColor = isError
          ? "var(--over)"
          : isSkip
            ? "var(--warn)"
            : "var(--ok)";
        return (
          <div
            key={r.id}
            data-testid="vault-schedule-history-row"
            data-status={status}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 80px 1fr 1fr",
              padding: "8px 14px",
              borderBottom: "1px solid var(--line-soft)",
              color: "var(--ink-2)",
              letterSpacing: "0.06em",
            }}
          >
            <span title={new Date(r.createdAt).toISOString()}>{relativeTime(r.createdAt, now)}</span>
            <span style={{ color: statusColor, fontWeight: 700 }}>[{status}]</span>
            <span
              style={{
                color: "var(--ink-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.billId ?? "—"}
            </span>
            <span style={{ color: "var(--ink-3)" }}>
              {r.error ?? r.skipReason ?? (status === "EXECUTED" ? "executed" : "—")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
