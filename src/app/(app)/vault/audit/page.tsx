/**
 * /vault/audit — Cluster 7.4 + 7.7.
 *
 * The audit-log viewer. Surfaces every action the system has
 * taken on the user's behalf in one reverse-chronological
 * surface. Server-rendered, force-dynamic so the values reflect
 * the latest DB state.
 *
 * Page sections:
 *   1. PageHead (eyebrow + title + em + explanation)
 *   2. DateRangeBar (C7.7 — preset chips: 24h / 7d / 30d / 90d / all)
 *   3. AuditHeadlineStrip (4 cells, unfiltered totals)
 *   4. ActivityStrip (30-day SVG bar chart, visual-first)
 *   5. TypeDistribution (horizontal stacked bar, click to filter)
 *   6. TypeFilterPills (type pills + prefix filter + free-text q)
 *   7. AuditTable (the table; details payload per row)
 *
 * URL contract (server-side filter, query string):
 *   - ?type=<exactActionType>      → filter.type
 *   - ?prefix=<vault|auto|plan|...> → filter.prefix
 *   - ?q=<substring>                → filter.q
 *   - ?from=YYYY-MM-DD              → filter.from (C7.7)
 *   - ?to=YYYY-MM-DD                → filter.to (C7.7, inclusive)
 *   - ?take=<n>                     → filter.take (default 50, max 200)
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
  hasDateRange,
  parseAuditLogFilter,
  recordAuditLogViewed,
} from "@/lib/vault/audit-log";
import { AuditHeadlineStrip } from "./AuditHeadlineStrip";
import { ActivityStrip } from "./ActivityStrip";
import { TypeDistribution } from "./TypeDistribution";
import { TypeFilterPills } from "./TypeFilterPills";
import { DateRangeBar } from "./DateRangeBar";
import { LiveAuditTable } from "./LiveAuditTable";

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
  //
  // Cluster 7.7 — the date range filter is also applied at
  // the DB layer (getAuditLog respects it). The 30-day
  // activity strip is the user's "view of recent activity"
  // and stays fixed-width; when a date range is active, the
  // strip's bars that fall OUTSIDE the range are visually
  // dimmed (handled by ActivityStrip's data shape — we pass
  // the unfiltered 30-day window and the bar component does
  // the rest).
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
  const dateRangeActive = hasDateRange(filter);

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
            reverse-chronological, filterable by action type and date range, and
            audit-the-audited (your visit to this page is itself an event).
          </>
        }
      />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Cluster 7.7 — date range filter (presets 24h / 7d / 30d
              / 90d / all time). The page is server-rendered, so
              the bar takes the current filter for href merging +
              active-state highlighting. */}
          <DateRangeBar filter={filter} now={new Date()} />

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
            title={dateRangeActive ? "Last 30 days (range dimmed)" : "Last 30 days"}
            em="one bar per day. hover for the breakdown."
            accent="cyan"
          />

          <ActivityStrip
            days={activityStrip}
            // Cluster 7.7 — when a range is active, dim the bars
            // that fall outside the window. The smoke verifies
            // the dimming via the activity bar's opacity.
            rangeFrom={filter.from}
            rangeTo={filter.to}
          />

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

          <LiveAuditTable
            initialRows={tableRows}
            take={filter.take ?? 50}
            filter={{
              type: filter.type,
              prefix: filter.prefix,
              q: filter.q,
              from: filter.from,
              to: filter.to,
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
