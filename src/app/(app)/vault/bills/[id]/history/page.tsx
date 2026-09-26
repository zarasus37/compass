/**
 * /vault/bills/[id]/history — Cluster 7.5.
 *
 * Per-bill audit drill-down. Surfaces every action the
 * system has taken on this single bill in one reverse-
 * chronological view. Mirrors the /vault/audit page (7.4)
 * but scoped to a single bill.
 *
 * Page sections:
 *   1. PageHead (eyebrow + title + em + explanation)
 *   2. BillHeader (bill name, amount, state badge, vessel,
 *      back-links)
 *   3. BillSummaryStrip (4 cells, growth-oriented suggestion
 *      chips per the 2026-08-24 directive)
 *   4. BillTimeline (state-machine stepper + alternate paths)
 *   5. BillEventTable (the table; per-row JSON payload)
 *
 * URL contract (server-side filter, query string):
 *   - ?type=<exactActionType>  → filter.type
 *   - ?take=<n>                → filter.take (default 50, max 200)
 *   Combinations are AND.
 *
 * Meta event: writes a `vault.bill_history_viewed` row AFTER
 * the reads, so the just-written event doesn't show up in the
 * same visit's table. Next visit will see it. The bill's
 * history is auditable itself.
 *
 * Auth: the bill lookup is scoped to the current user via
 * `vault: { userId }`. A bill id from another user's vault
 * returns null and the page renders a 404 panel (preserves
 * the surrounding chrome).
 */
import * as React from "react";

import { PageHead } from "@/components/alchemy/PageHead";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { getCurrentUser } from "@/server/auth/user";
import {
  getBillByIdForUser,
  getBillAuditLog,
  getBillAuditSummary,
  parseBillHistoryFilter,
  recordBillHistoryViewed,
} from "@/lib/vault/audit-log";
import { BillHeader } from "./BillHeader";
import { BillSummaryStrip } from "./BillSummaryStrip";
import { BillTimeline } from "./BillTimeline";
import { BillEventTable } from "./BillEventTable";
import { LiveBillEventTable } from "./LiveBillEventTable";
import {
  PaymentHistorySparkline,
  type SparklineDot,
} from "./_components/PaymentHistorySparkline";
import { BillOffRampPicker } from "@/components/vault/BillOffRampPicker";
import { OffRampGateway, chainSourceLabel, normalizeOffRampProvider } from "@/lib/vault/gateway";
import { getOrCreateVaultPreferences } from "@/lib/vault/db";
import {
  humanizeVaultAction,
  type HumanizeTone,
} from "@/lib/vault/audit-log-shared";
import {
  OFFRAMP_PROVIDER_LABEL,
  type OffRampProvider,
} from "@/lib/vault/types";

export const dynamic = "force-dynamic";

export default async function BillHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHead
          eyebrow="// ledger · vault · bills · history"
          title="Bill history"
          em="sign in first."
          accent="cyan"
          explanation={<>You need to be signed in to view a bill's history.</>}
        />
      </div>
    );
  }
  const { id: billId } = await params;
  const sp = await searchParams;
  const filter = parseBillHistoryFilter(sp);

  // Parallel reads. The summary computes the unfiltered totals
  // for the 4-cell strip; the table respects the filter.
  // Cluster 7.14 — also read the user's preferences so the
  // per-bill off-ramp picker can render the resolved chain and
  // the "use my default" chip label.
  const [billWithEnv, summary, tableRows, prefs] = await Promise.all([
    getBillByIdForUser(user.id, billId),
    getBillAuditSummary(user.id, billId),
    getBillAuditLog(user.id, billId, filter),
    getOrCreateVaultPreferences(user.id),
  ]);

  // 404 — bill not found (or not the user's). Render the
  // PageHead + an empty-state panel so the surrounding chrome
  // is preserved.
  if (!billWithEnv) {
    return (
      <div>
        <PageHead
          eyebrow="// ledger · vault · bills · history"
          title="Bill not found"
          em="no such bill for this vault."
          accent="cyan"
          explanation={
            <>This bill doesn't exist, or it doesn't belong to your vault.</>
          }
        />
        <div
          data-testid="vault-bill-history-not-found"
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
            // 404 — bill not found
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
            The bill id <code>{billId}</code> is not in your vault. It may have
            been deleted, or you may be following a link from a prior session.
            Head back to the vault to see the current bill schedule.
          </div>
        </div>
      </div>
    );
  }

  const { bill, envelope } = billWithEnv;
  const hasData = summary.totalEvents > 0;
  const hasMore = tableRows.length === (filter.take ?? 50);

  // Cluster 7.15 — compute the sparkline dots server-side. The
  // page already has `tableRows` (the same rows the
  // LiveBillEventTable below renders); we map them to
  // {id, at, actionType, tone, summary} so the
  // PaymentHistorySparkline client component is purely
  // presentational + interactive (no humanizer in the bundle).
  //
  // The mapping uses the existing `humanizeVaultAction` from
  // 7.11.1 (client-safe; no `server-only`). An actionType that
  // is unknown to the humanizer (a future-added type) is
  // represented as a neutral-tone dot with an empty summary;
  // it still appears in the rhythm (the user sees *that*
  // something happened) without jargon in the tooltip.
  const sparklineDots: SparklineDot[] = tableRows.map((r) => {
    const h = humanizeVaultAction(r.actionType, r.payload);
    const tone: HumanizeTone = h?.tone ?? "neutral";
    const summary = h?.text ?? `${r.actionType}`;
    return {
      id: r.id,
      at: r.createdAtIso,
      actionType: r.actionType,
      tone,
      summary,
    };
  });

  // Meta event: record the view AFTER reads so the just-written
  // row doesn't show in this visit's table. Fire-and-forget is
  // fine — the audit log is best-effort.
  void recordBillHistoryViewed({
    userId: user.id,
    billId,
    billerName: bill.billerName,
    filter,
  });

  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault · bills · history"
        title={`${bill.billerName} — full event stream`}
        em="every action this bill has ever seen."
        accent="cyan"
        explanation={
          <>
            State changes, payment attempts, scheduler runs, yield credits — every
            event the system has ever recorded for this bill. The timeline below
            mirrors the 13-state machine, and the table is the full chronological
            detail. Visit the page records a row of its own; the next visit will
            show the prior visits.
          </>
        }
      />

      <BillHeader
        bill={bill}
        envelopeName={envelope?.name ?? null}
        envelopeCategory={envelope?.category ?? null}
      />

      {(() => {
        // Cluster 7.14 — per-bill off-ramp provider picker. The
        // gateway is built server-side with the user's default
        // provider baked in; we then ask it to resolve the chain
        // for THIS bill (which respects the per-bill override via
        // the C7.14 resolveChain fix). The picker renders the
        // chain + the chips for switching.
        const userDefault: OffRampProvider = (prefs.offRampProvider ??
          "MOCK") as OffRampProvider;
        const gateway = OffRampGateway.buildDefault(user.id, userDefault);
        const chain = gateway.resolveChain(bill);
        const source = chainSourceLabel(bill, userDefault);
        // Normalize the stored value to the enum form for the
        // picker's `current` prop. Legacy rows may have the
        // display form ("Spritz") or lowercase ("spritz"); the
        // helper handles both.
        const current = normalizeOffRampProvider(bill.providerPreference);
        return (
          <>
            <SectionHeader
              eyebrow="// off-ramp"
              title="Off-ramp provider"
              em="which rail this bill settles through."
              accent="cyan"
            />
            <div
              data-testid="vault-bill-offramp-section"
              style={{ marginBottom: 32 }}
            >
              <BillOffRampPicker
                billId={billId}
                current={current}
                userDefaultLabel={OFFRAMP_PROVIDER_LABEL[userDefault]}
                chain={chain}
                source={source}
              />
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginTop: 10,
                  lineHeight: 1.5,
                  maxWidth: 720,
                }}
              >
                {current === null
                  ? "This bill follows your user-level provider. Pick any of the chips above to pin it to a specific rail — useful for routing high-value bills to Spritz while subscriptions stay on MOCK, or for one-off kill switches."
                  : "This bill is pinned to a specific provider. Pick a different chip to switch, or [USE MY DEFAULT] to revert to the user-level choice."}
              </div>
            </div>
          </>
        );
      })()}

      <SectionHeader
        eyebrow="// summary"
        title="The shape of this bill"
        em="headline numbers, in one strip."
        accent="cyan"
      />

      <BillSummaryStrip bill={bill} summary={summary} filter={filter} />

      {/*
        Cluster 7.15 — per-bill payment history sparkline. Sits
        between the headline numbers (BillSummaryStrip) and the
        state progression (BillTimeline). Chart-first view of
        the bill's audit events: one dot per event, positioned
        by time, colored by tone. Click a dot to jump to the
        matching row in the LiveBillEventTable below.
       */}
      <PaymentHistorySparkline dots={sparklineDots} />

      <div id="vault-bill-history-timeline">
        <SectionHeader
          eyebrow="// timeline"
          title="State progression"
          em="where the bill has been. where it is now."
          accent="cyan"
        />
        <BillTimeline
          currentState={bill.status}
          stateTransitionsByState={summary.stateTransitionsByState}
        />
      </div>

      <SectionHeader
        eyebrow="// events"
        title="The detail"
        em="newest first. expand a row to see the JSON payload."
        accent="cyan"
      />

      <LiveBillEventTable
        billId={billId}
        initialRows={tableRows}
        take={filter.take ?? 50}
        filter={{ type: filter.type }}
        hasMore={hasMore}
      />

      {!hasData ? (
        <div
          data-testid="vault-bill-history-empty-footer"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginTop: 16,
            marginBottom: 24,
            padding: "12px 14px",
            border: "1px dashed var(--vessel-border)",
            background: "var(--vessel-surface)",
          }}
        >
          // no audit events for this bill yet — events appear here
          when the scheduler runs, the keeper begins settlement, or the
          user edits the bill.
        </div>
      ) : (
        <div
          data-testid="vault-bill-history-footer"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--vessel-border)",
          }}
        >
          // first event:{" "}
          {summary.firstEventAt
            ? new Date(summary.firstEventAt).toLocaleString()
            : "no events yet"}
        </div>
      )}
    </div>
  );
}
