/**
 * BillEventTable — Cluster 7.5.
 *
 * The per-bill event table. Mirrors the AuditTable shape from
 * /vault/audit (Cluster 7.4) but:
 *   - No [SHOW 50 MORE →] button on the empty state (the bill's
 *     event set is bounded; default 50 is usually enough;
 *     ?take=200 still works for a busy bill).
 *   - No `// ai tier` column (the per-bill scope is narrow
 *     enough that the column is visual noise).
 *   - The type chip color uses the same `colorForActionType`
 *     palette as the audit page, so the same actionType
 *     shows the same color in both surfaces.
 *
 * Server component. Cluster 7.6 extracted the row JSX into
 * `BillEventTableView` so the live-updating `LiveBillEventTable`
 * client wrapper can use the same presentation.
 */
import * as React from "react";
import type { AuditLogRow } from "@/lib/vault/audit-log";
import { BillEventTableView } from "./BillEventTableView";

export function BillEventTable({
  rows,
  take,
  filter,
  hasMore,
}: {
  rows: AuditLogRow[];
  take: number;
  filter: { type?: string };
  /** True if there are more rows to show (we returned exactly
   *  `take`, so another page may exist). */
  hasMore: boolean;
}) {
  return (
    <BillEventTableView
      rows={rows}
      take={take}
      filter={filter}
      hasMore={hasMore}
      testId="vault-bill-history-table"
    />
  );
}
