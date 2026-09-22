/**
 * BillEventTableView — shared row JSX for the bill history table.
 *
 * Mirrors the AuditTableView pattern (Cluster 7.6): pure
 * presentation, no server-only imports, used by both the
 * server `BillEventTable` (initial view) and the client
 * `LiveBillEventTable` (live-update wrapper).
 *
 * Differences from the audit log table:
 *   - No [SHOW 50 MORE →] button on the empty state (the bill's
 *     event set is bounded; default 50 is usually enough;
 *     ?take=200 still works for a busy bill).
 *   - No `// ai tier` column (the per-bill scope is narrow
 *     enough that the column is visual noise).
 *   - The type chip color uses the same `colorForActionType`
 *     palette as the audit page, so the same actionType shows
 *     the same color in both surfaces.
 */
import * as React from "react";
import Link from "next/link";
import {
  colorForActionType,
  type AuditLogRow,
} from "@/lib/vault/audit-log-shared";

export function BillEventTableView({
  rows,
  take,
  filter,
  hasMore,
  testId = "vault-bill-history-table",
}: {
  rows: AuditLogRow[];
  take: number;
  filter: { type?: string };
  /** True if there are more rows to show (we returned exactly
   *  `take`, so another page may exist). */
  hasMore: boolean;
  testId?: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        data-testid="vault-bill-history-table-empty"
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span>// no events for this bill</span>
        <Link
          href="/vault/audit?type=vault.bill_state_changed"
          data-testid="vault-bill-history-see-vault-audit"
          style={{
            color: "var(--vessel-accent)",
            textDecoration: "none",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            border: "1px solid var(--vessel-accent)",
            padding: "4px 10px",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          [SEE VAULT AUDIT →]
        </Link>
      </div>
    );
  }
  return (
    <div
      id="vault-bill-history-events"
      data-testid={testId}
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
            <th style={{ padding: "10px 14px", width: 280 }}>// type</th>
            <th style={{ padding: "10px 14px" }}>// payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              id={r.id}
              data-testid="vault-bill-history-row"
              style={{
                borderBottom: "1px solid var(--vessel-border)",
                verticalAlign: "top",
                transition: "background-color 200ms ease, box-shadow 200ms ease",
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
                  data-testid="vault-bill-history-row-type"
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
                    data-testid="vault-bill-history-row-payload"
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
            data-testid="vault-bill-history-show-more"
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

function moreHref(filter: { type?: string }, take: number): string {
  const next = Math.min(200, take + 50);
  const params = new URLSearchParams();
  if (filter.type) params.set("type", filter.type);
  if (next !== 50) params.set("take", String(next));
  const s = params.toString();
  return s ? `?${s}` : "";
}
