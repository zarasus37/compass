/**
 * /vault/audit — Cluster 7.4.
 *
 * The audit-log viewer. Surfaces every action the system has
 * taken on the user's behalf in one reverse-chronological
 * surface. Server-rendered, force-dynamic so the values reflect
 * the latest DB state.
 *
 * Page sections:
 *   1. PageHead (eyebrow + title + em + explanation)
 *   2. AuditHeadlineStrip (4 cells, unfiltered totals)
 *   3. ActivityStrip (30-day SVG bar chart, visual-first)
 *   4. TypeDistribution (horizontal stacked bar, click to filter)
 *   5. TypeFilterPills (type pills + prefix filter + free-text q)
 *   6. AuditTable (the table; details payload per row)
 *
 * URL contract (server-side filter, query string):
 *   - ?type=<exactActionType>     → filter.type
 *   - ?prefix=<vault|auto|plan|...> → filter.prefix
 *   - ?q=<substring>               → filter.q
 *   - ?take=<n>                    → filter.take (default 50, max 200)
 *   Combinations are AND.
 *
 * Meta event: writes a `vault.audit_log_viewed` row AFTER the
 * reads, so the just-written event doesn't show up in the same
 * visit's table — the next visit will see it. The audit log is
 * auditable itself.
 */
import * as React from "react";

import { PageHead } from "@/components/alchemy/PageHead";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/user";
import {
  getAuditLog,
  getAuditLogActivity,
  getAuditLogSummary,
  getDistinctActionTypes,
  getAuditLogPrefixes,
  parseAuditLogFilter,
  recordAuditLogViewed,
} from "@/lib/vault/audit-log";
import { AuditHeadlineStrip } from "./AuditHeadlineStrip";
import { ActivityStrip } from "./ActivityStrip";
import { TypeDistribution } from "./TypeDistribution";
import { TypeFilterPills } from "./TypeFilterPills";
import { AuditTable } from "./AuditTable";

export const dynamic = "force-dynamic";

export default async function VaultAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHead
          eyebrow="// ledger · vault · audit"
          title="Audit log"
          em="sign in first."
          accent="cyan"
          explanation={<>You need to be signed in to view your audit log.</>}
        />
      </div>
    );
  }
  const sp = await searchParams;
  const filter = parseAuditLogFilter(sp);

  // Parallel reads. The headline strip and type distribution
  // are unfiltered; the activity strip + table respect the
  // filter. Prefixes are unfiltered (used to render the prefix
  // row, which only shows prefixes that exist in the data).
  const [
    summary,
    allTypes,
    activityStrip,
    tableRows,
    prefixes,
  ] = await Promise.all([
    getAuditLogSummary(user.id),
    getDistinctActionTypes(user.id),
    getAuditLogActivity(user.id, 30),
    getAuditLog(user.id, filter),
    getAuditLogPrefixes(user.id),
  ]);

  // Meta event: record the view AFTER reads so the just-written
  // row doesn't show in this visit's table. The next visit will.
  // Done in a Promise that doesn't block the render (fire and
  // forget is fine — the audit log is best-effort).
  void recordAuditLogViewed({ userId: user.id, filter });

  // Quick sanity: is there data at all?
  const hasData = summary.totalEvents > 0;
  const hasMore = tableRows.length === filter.take;

  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault · audit"
        title="Audit log"
        em="every action, in order."
        accent="cyan"
        explanation={
          <>
            Every change the system makes — yield routing, off-ramp provider, risk
            acknowledgment, deploys, funding, supply, withdraw, payments, scheduler
            runs — is recorded with a timestamp and a JSON payload. The list is
            reverse-chronological, filterable by action type, and audit-the-audited
            (your visit to this page is itself an event).
          </>
        }
      />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <SectionHeader
            eyebrow="// summary"
            title="The shape of your system"
            em="headline numbers, in one strip."
            accent="cyan"
          />

          <AuditHeadlineStrip
            summary={summary}
            prefixFilter={filter.prefix}
          />

          <SectionHeader
            eyebrow="// activity"
            title="Last 30 days"
            em="one bar per day. hover for the breakdown."
            accent="cyan"
          />

          <ActivityStrip days={activityStrip} />

          <SectionHeader
            eyebrow="// type distribution"
            title="Where the events come from"
            em="each color is one action type. click a segment to filter."
            accent="cyan"
          />

          <TypeDistribution
            types={allTypes}
            total={summary.totalEvents}
            currentType={filter.type}
            prefixFilter={filter.prefix}
          />

          <TypeFilterPills
            types={allTypes}
            total={summary.totalEvents}
            currentType={filter.type}
            currentPrefix={filter.prefix}
            currentQ={filter.q}
            prefixes={prefixes}
          />

          <SectionHeader
            eyebrow="// events"
            title="The detail"
            em="newest first. expand a row to see the JSON payload."
            accent="cyan"
          />

          <AuditTable
            rows={tableRows}
            take={filter.take ?? 50}
            filter={{
              type: filter.type,
              prefix: filter.prefix,
              q: filter.q,
            }}
            hasMore={hasMore}
          />
        </>
      )}

      <AuditFooter firstEventAt={summary.firstEventAt} />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="vault-audit-empty"
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: "var(--font-jetbrains), monospace",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 8,
        }}
      >
        // empty log
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-2)",
          maxWidth: 480,
          margin: "0 auto",
          lineHeight: 1.5,
        }}
      >
        No audit events yet. The first one is written when the vault seeds or when
        the auto-allocate engine runs. Once you take an action — change a setting,
        deploy, fund, or settle a bill — it appears here.
      </div>
    </div>
  );
}

function AuditFooter({ firstEventAt }: { firstEventAt: string | null }) {
  return (
    <div
      data-testid="vault-audit-footer"
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        color: "var(--ink-3)",
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        marginTop: 24,
        paddingTop: 16,
        borderTop: "1px solid var(--vessel-border)",
      }}
    >
      // first event:{" "}
      {firstEventAt
        ? new Date(firstEventAt).toLocaleString()
        : "no events yet"}
    </div>
  );
}
