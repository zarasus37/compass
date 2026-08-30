/**
 * AuditTable — the events table.
 *
 * Newest first, capped at `take` rows (default 50). Each row:
 *   - // when: ISO timestamp in JetBrains Mono
 *   - // type: actionType as a chip with the type's stable color
 *   - // ai tier: aiTierAtTime (mono)
 *   - // payload: pretty-printed JSON in a <details> block
 *     (collapsed by default, click to expand)
 *
 * Server component. The "Show N more" button is a plain <Link>
 * that bumps `take` by 50 (capped at 200 by the data layer).
 */
import * as React from "react";
import Link from "next/link";
import type { AuditLogRow } from "@/lib/vault/audit-log";
import { colorForActionType } from "@/lib/vault/audit-log";

export function AuditTable({
  rows,
  take,
  filter,
  hasMore,
}: {
  rows: AuditLogRow[];
  take: number;
  filter: {
    type?: string;
    prefix?: string;
    q?: string;
  };
  /** True if there are more rows to show (we returned exactly
   *  `take`, so another page may exist). */
  hasMore: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div
        data-testid="vault-audit-table-empty"
        style={{
          padding: "24px 18px",
          border: "1px solid var(--vessel-border)",
          background: "var(--vessel-surface)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 16,
        }}
      >
        // no events match this filter
      </div>
    );
  }
  return (
    <div
      data-testid="vault-audit-table"
      style={{
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        fontFamily: "var(--font-jetbrains), monospace",
        marginBottom: 16,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
        }}
      >
        <thead>
          <tr
            style={{
              textAlign: "left",
              fontSize: 9.5,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              borderBottom: "1px solid var(--vessel-border)",
            }}
          >
            <th style={{ padding: "10px 14px", width: 180 }}>// when</th>
            <th style={{ padding: "10px 14px", width: 240 }}>// type</th>
            <th style={{ padding: "10px 14px", width: 60 }}>// ai</th>
            <th style={{ padding: "10px 14px" }}>// payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              data-testid="vault-audit-row"
              style={{
                borderBottom: "1px solid var(--vessel-border)",
                verticalAlign: "top",
              }}
            >
              <td
                style={{
                  padding: "10px 14px",
                  whiteSpace: "nowrap",
                  color: "var(--ink-2)",
                }}
              >
                {formatTableTime(r.createdAtIso)}
              </td>
              <td style={{ padding: "10px 14px" }}>
                <span
                  data-testid="vault-audit-row-type"
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "lowercase",
                    letterSpacing: "0.05em",
                    background: colorForActionType(r.actionType),
                    color: "var(--vessel-dark)",
                    borderRadius: 2,
                  }}
                >
                  {r.actionType}
                </span>
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  color: "var(--ink-2)",
                  textAlign: "right",
                }}
              >
                {r.aiTierAtTime}
              </td>
              <td style={{ padding: "10px 14px", color: "var(--ink-2)" }}>
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "var(--ink-3)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      listStyle: "none",
                    }}
                  >
                    [SHOW JSON]
                  </summary>
                  <pre
                    data-testid="vault-audit-row-payload"
                    style={{
                      margin: "8px 0 0",
                      padding: "10px 12px",
                      background: "var(--vessel-dark)",
                      border: "1px solid var(--vessel-border)",
                      color: "var(--ink-1)",
                      fontSize: 10.5,
                      lineHeight: 1.5,
                      borderRadius: 2,
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore ? (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--vessel-border)",
            textAlign: "center",
          }}
        >
          <Link
            href={moreHref(filter, take)}
            data-testid="vault-audit-show-more"
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vessel-accent)",
              textDecoration: "none",
              border: "1px solid var(--vessel-accent)",
              padding: "6px 14px",
              borderRadius: 2,
            }}
          >
            [SHOW 50 MORE →]
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function formatTableTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

function moreHref(
  filter: { type?: string; prefix?: string; q?: string },
  take: number,
): string {
  const next = Math.min(200, take + 50);
  const params = new URLSearchParams();
  if (filter.type) params.set("type", filter.type);
  if (filter.prefix) params.set("prefix", filter.prefix);
  if (filter.q) params.set("q", filter.q);
  if (next !== 50) params.set("take", String(next));
  const s = params.toString();
  return s ? `/vault/audit?${s}` : "/vault/audit";
}
