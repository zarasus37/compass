/**
 * AuditTable — the events table.
 *
 * Newest first, capped at `take` rows (default 50). Each row:
 *   - // when: ISO timestamp in JetBrains Mono. Cluster 7.5
 *     wires a deep-link: when the row's payload carries a
 *     `billId`, the timestamp is a <Link> to
 *     /vault/bills/<billId>/history (so a payment_settled or
 *     bill_state_changed row is a one-click hop to the bill's
 *     full event stream).
 *   - // type: actionType as a chip with the type's stable color
 *   - // ai tier: aiTierAtTime (mono)
 *   - // payload: pretty-printed JSON in a <details> block
 *     (collapsed by default, click to expand)
 *
 * Server component. Cluster 7.6 extracted the row JSX into
 * `AuditTableView` so the live-updating `LiveAuditTable` client
 * wrapper can use the same presentation. The "Show N more"
 * button is a plain <Link> that bumps `take` by 50 (capped at
 * 200 by the data layer).
 */
import * as React from "react";
import type { AuditLogRow } from "@/lib/vault/audit-log";
import { AuditTableView } from "./AuditTableView";

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
  return (
    <AuditTableView
      rows={rows}
      take={take}
      filter={filter}
      hasMore={hasMore}
      testId="vault-audit-table"
    />
  );
}
