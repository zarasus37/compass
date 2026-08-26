import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { loadCurrentVaultSnapshot } from "@/lib/vault/server";
import { userLabel, type BillTone } from "@/lib/vault/state-machine";
import type {
  ScheduledBill,
  VaultAlertState,
  VaultEnvelope,
  YieldEvent,
  OffRampAdapterStatus,
  VaultAccount,
} from "@/lib/vault/types";
import { formatShortDate } from "@/lib/format";
import { SyncButton } from "@/components/vault/SyncButton";
import { YieldRoutingPicker } from "@/components/vault/YieldRoutingPicker";
import { BillTransitionMenu } from "@/components/vault/BillTransitionMenu";
import { RiskAckButton } from "@/components/vault/RiskAckButton";
import { VaultPauseToggle } from "@/components/vault/VaultPauseToggle";

export const dynamic = "force-dynamic";

/**
 * Compass Vault — self-custodial bill reserve.
 *
 * Phase 2.0 (2026-08-25) shipped the DB-sourced page with the
 * 6 vault tables, the seed, the DB-backed off-ramp adapters,
 * and the audit log. Phase 2.5 (2026-08-25) made the page
 * interactive: yield-routing picker, per-bill state transitions,
 * risk-disclosure persistence, vault pause/resume. All
 * persistence is on the new `VaultPreferences` table + the
 * existing `VaultAccount.status` column; the existing `Bill`
 * rows are driven through the pure 13-state machine in
 * `state-machine.ts` and persisted via `transitionBillDb`.
 *
 * Page order (top to bottom):
 *   1. Risk disclosure (mandatory on first visit; Phase 2.5
 *      hides after the user clicks the "I understand" button;
 *      audit log records the acknowledgment)
 *   2. Alert state banner (CALM / WATCH / ACTION REQUIRED / PAUSED)
 *   3. Vault pause toggle (Phase 2.5 — pause/resume the vault)
 *   4. Source-of-truth indicator (DB-sourced | fallback | empty)
 *   5. 5-cell status strip (vault principal, reserved, yield,
 *      next execution, liquid buffer)
 *   6. Bill schedule table with lifecycle badges + per-bill
 *      transition menu (Phase 2.5)
 *   7. Yield attribution (per envelope)
 *   8. Yield-routing picker (Phase 2.5 — 4 strategies)
 *   9. Off-ramp adapter status panel
 *  10. Strategy allocation summary (planned vs deployed)
 *  11. Audit footer (event count)
 */

export default async function VaultPage() {
  const { snapshot, source } = await loadCurrentVaultSnapshot();
  if (!snapshot) {
    return <EmptyState />;
  }
  const snap = snapshot;
  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault"
        title="Vault"
        em="self-custody, scheduled."
        accent="cyan"
        actions={
          <>
            <SourceChip source={source} />
            <span style={{ width: 8 }} />
            <VaultStatusChip status={snap.vault.status} />
          </>
        }
        explanation={
          <>
            A self-custodial bill-reserve account. Money in your envelopes that backs upcoming bills is parked in a stablecoin yield strategy; at each bill's execution window the system redeems the principal and routes it through an off-ramp provider. You stay in control of the wallet; Compass coordinates the policy, visibility, and automation. Nothing on this page has been wired to a live chain yet — this is the Phase 2 simulation so you can react to the data model and visual treatment.
          </>
        }
      />

      <RiskDisclosure acknowledged={snap.preferences.riskAcknowledgedAt !== null} />

      <AlertBanner state={snap.alert} />

      <VaultPauseRow vault={snap.vault} />

      <StatusStrip snap={snap} />

      <BillSchedule bills={snap.bills} />

      <YieldAttribution
        envelopes={snap.envelopes}
        totalAccrued={snap.vault.accruedYield}
        totalAttributed={snap.totalAttributedYield}
        apy={snap.vault.simulatedApy}
      />

      <YieldRoutingSection current={snap.preferences.yieldRoutingStrategy} />

      <OffRampPanel adapters={snap.offRampAdapters} />

      <StrategyAllocation
        deployed={snap.vault.deployedToYield}
        reserved={snap.envelopes.reduce((s, e) => s + e.reservedForBills, 0)}
        liquid={snap.kpis.liquidBuffer}
      />

      <AuditFooter
        source={source}
        envelopes={snap.envelopes.length}
        bills={snap.bills.length}
        yieldEvents={snap.yieldEvents.length}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Empty state — the user has no vault data yet
// ──────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault"
        title="Vault"
        em="self-custody, scheduled."
        accent="cyan"
        explanation={
          <>
            A self-custodial bill-reserve account. Your Compass envelopes already hold the principal; the vault projects them into bill-locked reserves + a yield strategy. This preview build has no vault data yet — sync it once from your envelopes to populate the page.
          </>
        }
      />
      <RiskDisclosure acknowledged={false} />
      <section
        data-testid="vault-empty-state"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderTop: "2px solid var(--terminal-cyan)",
          borderRadius: 2,
          padding: "32px 28px",
          marginBottom: 48,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "var(--terminal-cyan)",
            border: "1px solid var(--terminal-cyan)",
            padding: "4px 8px",
            borderRadius: 2,
            display: "inline-block",
            marginBottom: 16,
          }}
        >
          [SIGIL] No vault data
        </div>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 24,
            margin: "0 0 12px",
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Sync your vault from the live envelopes
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            maxWidth: 720,
            margin: "0 0 24px",
          }}
        >
          The sync creates a vault row, one vault envelope per live envelope,
          and one scheduled bill per recurring bill. It is idempotent — re-run
          any time and only the changed rows update. The audit log records
          every sync.
        </p>
        <SyncButton />
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 1. Risk disclosure — mandatory on first visit, persistent after
//    acknowledgment (Phase 2.5)
//
// The disclosure renders as a prominent top notice with the exact
// copy from the spec. The user dismisses it by clicking the
// "I understand" button (RiskAckButton), which writes
// `riskAcknowledgedAt = now()` on the user's `VaultPreferences` row
// and a `vault.risk_acknowledged` audit entry. After
// acknowledgment the disclosure is suppressed — the section header
// "Risk disclosure acknowledged" replaces it.
// ──────────────────────────────────────────────────────────────────────

function RiskDisclosure({ acknowledged }: { acknowledged: boolean }) {
  if (acknowledged) {
    return (
      <div
        data-testid="vault-risk-disclosure-acknowledged"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 2,
          marginBottom: 24,
        }}
      >
        <div
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--ok)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            border: "1px solid var(--ok)",
            padding: "3px 7px",
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          [OK] Risk
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          Risk disclosure acknowledged. Yield is variable and not guaranteed; Compass cannot guarantee a bill will be paid if funding, protocol, provider, or settlement conditions fail.
        </div>
      </div>
    );
  }
  return (
    <aside
      role="alert"
      aria-label="Vault risk disclosure"
      data-testid="vault-risk-disclosure"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--warn)",
        borderRadius: 2,
        padding: "20px 24px",
        marginBottom: 32,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--warn)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            border: "1px solid var(--warn)",
            padding: "4px 8px",
            borderRadius: 2,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          [WARN] Risk
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 8,
              letterSpacing: "-0.005em",
            }}
          >
            This is a self-custodial digital-asset vault, not a bank account.
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--ink-2)",
            }}
          >
            Stablecoin, smart-contract, protocol, automation, off-ramp, and
            settlement risks apply. Yield is variable and not guaranteed.
            Compass cannot guarantee a bill will be paid if funding, protocol,
            provider, or settlement conditions fail. By continuing past this
            notice you acknowledge these risks.
          </div>
          <RiskAckButton />
        </div>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2. Alert banner — single vault-level state.
// ──────────────────────────────────────────────────────────────────────

const ALERT_COPY: Record<
  VaultAlertState,
  { label: string; detail: string; tone: "ok" | "warn" | "ink" }
> = {
  CALM: {
    label: "CALM",
    detail: "All bills fully reserved. No near-term risk.",
    tone: "ok",
  },
  WATCH: {
    label: "WATCH",
    detail: "A bill is approaching its execution window. Compass is monitoring.",
    tone: "ink",
  },
  ACTION_REQUIRED: {
    label: "ACTION REQUIRED",
    detail:
      "A bill needs attention. Open the schedule below for the offending row.",
    tone: "warn",
  },
  PAUSED: {
    label: "PAUSED",
    detail: "Automation is paused. Bills will not execute until you resume.",
    tone: "ink",
  },
};

function AlertBanner({ state }: { state: VaultAlertState }) {
  const copy = ALERT_COPY[state];
  const color =
    copy.tone === "warn"
      ? "var(--warn)"
      : copy.tone === "ok"
        ? "var(--ok)"
        : "var(--ink-3)";
  return (
    <div
      data-testid="vault-alert-banner"
      data-alert-state={state}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderTop: `2px solid ${color}`,
        borderRadius: 2,
        padding: "16px 24px",
        marginBottom: 16,
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color,
          border: `1px solid ${color}`,
          padding: "4px 8px",
          borderRadius: 2,
        }}
      >
        {copy.tone === "ok" ? "[OK]" : copy.tone === "warn" ? "[WARN]" : "[SIGIL]"}{" "}
        {copy.label}
      </span>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-2)",
          flex: 1,
        }}
      >
        {copy.detail}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2b. Vault pause row (Phase 2.5) — pause/resume the vault as a
// whole. The toggle sits between the alert banner and the status
// strip so it's the first thing the user can act on.
// ──────────────────────────────────────────────────────────────────────

function VaultPauseRow({ vault }: { vault: VaultAccount }) {
  return (
    <div
      data-testid="vault-pause-row"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 32,
        padding: "10px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        // vault control · {vault.status === "PAUSED" ? "PAUSED" : vault.status === "RECOVERY_MODE" ? "RECOVERY" : "ARMED"}
      </div>
      <VaultPauseToggle status={vault.status} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 3. 5-cell status strip
// ──────────────────────────────────────────────────────────────────────

function StatusStrip({
  snap,
}: {
  snap: NonNullable<Awaited<ReturnType<typeof loadCurrentVaultSnapshot>>["snapshot"]>;
}) {
  const { kpis, vault } = snap;
  return (
    <div
      data-testid="vault-status-strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 0,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        marginBottom: 40,
      }}
    >
      <KpiCell
        label="vault principal"
        value={formatMoney(kpis.vaultPrincipal)}
        sub={`across ${snap.envelopes.length} envelopes`}
        tone="cyan"
      />
      <KpiCell
        label="reserved for bills"
        value={formatMoney(kpis.billsCovered)}
        sub={`${kpis.billsScheduledCount} scheduled`}
        tone="ink"
      />
      <KpiCell
        label="yield earned"
        value={formatMoney(kpis.yieldEarned)}
        sub={`${(vault.simulatedApy * 100).toFixed(2)}% est. APY`}
        tone="ok"
      />
      <KpiCell
        label="next execution"
        value={
          kpis.nextExecution
            ? formatMoney(kpis.nextExecution.amount)
            : "—"
        }
        sub={
          kpis.nextExecution
            ? `${userLabel(kpis.nextExecution.status)} · ${formatShortDate(
                kpis.nextExecution.dueDate,
              )}`
            : "no upcoming bills"
        }
        tone="cyan"
      />
      <KpiCell
        label="liquid buffer"
        value={formatMoney(kpis.liquidBuffer)}
        sub="available to redeem"
        tone="ink"
        isLast
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  sub,
  tone,
  isLast,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "cyan" | "ink";
  isLast?: boolean;
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "cyan"
          ? "var(--terminal-cyan)"
          : "var(--ink)";
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: isLast ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          lineHeight: 1,
          color,
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 6,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 4. Bill schedule
// ──────────────────────────────────────────────────────────────────────

function BillSchedule({ bills }: { bills: ScheduledBill[] }) {
  const sorted = [...bills].sort((a, b) => {
    if (a.status === "SETTLED" && b.status !== "SETTLED") return 1;
    if (a.status !== "SETTLED" && b.status === "SETTLED") return -1;
    return (
      new Date(a.executionWindowStart).getTime() -
      new Date(b.executionWindowStart).getTime()
    );
  });
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// bills · scheduled"
        title="Scheduled bills"
        em="the queue your vault is working through."
        accent="cyan"
      />
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.7fr 0.9fr 1fr 0.9fr 0.9fr",
            alignItems: "center",
            padding: "10px 24px",
            background: "var(--vessel-surface)",
            borderBottom: "1px solid var(--line)",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          <div>biller</div>
          <div style={{ textAlign: "right" }}>amount</div>
          <div style={{ textAlign: "right" }}>due</div>
          <div>execution window</div>
          <div>status</div>
          <div style={{ textAlign: "right" }}>provider</div>
        </div>
        {sorted.map((b, i) => (
          <BillRow key={b.id} bill={b} isLast={i === sorted.length - 1} />
        ))}
      </div>
    </section>
  );
}

function BillRow({ bill, isLast }: { bill: ScheduledBill; isLast: boolean }) {
  const label = userLabel(bill.status);
  const billTone = toneForBadge(bill.status);
  return (
    <div
      data-testid={`vault-bill-row-${bill.id}`}
      style={{
        padding: "14px 24px 8px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.7fr 0.9fr 1fr 0.9fr 0.9fr",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {bill.billerName}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              marginTop: 3,
              letterSpacing: "0.04em",
            }}
          >
            {bill.maskedAccountNumber} · {bill.frequency}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 14,
            color: "var(--ink)",
            textAlign: "right",
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            fontWeight: 500,
          }}
        >
          {formatMoney(bill.amount)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12,
            color: "var(--ink-2)",
            textAlign: "right",
          }}
        >
          {formatShortDate(bill.dueDate)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          {formatShortDate(bill.executionWindowStart)} →{" "}
          {formatShortDate(bill.executionWindowEnd)}
        </div>
        <div>
          <StatusBadge label={label} tone={billTone} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            textAlign: "right",
            letterSpacing: "0.04em",
          }}
        >
          {bill.providerPreference ?? "auto"}
        </div>
      </div>
      <BillTransitionMenu billId={bill.id} status={bill.status} />
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: BillTone }) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "cyan"
          ? "var(--terminal-cyan)"
          : "var(--ink-3)";
  const marker =
    tone === "ok"
      ? "[OK]"
      : tone === "warn"
        ? "[WARN]"
        : tone === "cyan"
          ? "[SIGIL]"
          : "[—]";
  return (
    <span
      data-testid="vault-bill-badge"
      data-status-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "3px 7px",
        borderRadius: 2,
      }}
    >
      {marker} {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 5. Yield attribution
// ──────────────────────────────────────────────────────────────────────

function YieldAttribution({
  envelopes,
  totalAccrued,
  totalAttributed,
  apy,
}: {
  envelopes: VaultEnvelope[];
  totalAccrued: number;
  totalAttributed: number;
  apy: number;
}) {
  const sorted = [...envelopes].sort((a, b) => b.accruedYield - a.accruedYield);
  const max = Math.max(1, ...sorted.map((e) => e.accruedYield));
  const residual = totalAccrued - totalAttributed;
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// yield · attribution"
        title="Yield earned by envelope"
        em="attributed by capital share."
        accent="gold"
      />
      <div
        data-testid="vault-yield-attribution"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--gold)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Variable
            estimated APY · {(apy * 100).toFixed(2)}% (not guaranteed)
          </div>
          <div
            data-testid="vault-yield-total"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              color: "var(--gold)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {formatMoney(totalAccrued)}
          </div>
        </div>
        {sorted.map((e) => {
          const share = totalAccrued > 0 ? e.accruedYield / totalAccrued : 0;
          const widthPct = (e.accruedYield / max) * 100;
          return (
            <div
              key={e.id}
              data-testid="vault-yield-row"
              data-yield-envelope={e.name}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr 130px 100px",
                alignItems: "center",
                gap: 16,
                padding: "10px 0",
                borderTop: "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 14,
                  color: "var(--ink)",
                  fontWeight: 500,
                }}
              >
                {e.name}
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-4)",
                    marginLeft: 8,
                    letterSpacing: "0.06em",
                  }}
                >
                  {e.category}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--line-soft)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
                aria-hidden
              >
                <div
                  style={{
                    height: "100%",
                    width: `${widthPct.toFixed(2)}%`,
                    background: "var(--gold)",
                    boxShadow: "0 0 8px rgba(201, 164, 92, 0.4)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 12,
                  color: "var(--ink-2)",
                  textAlign: "right",
                }}
              >
                {formatMoney(e.accruedYield)}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  textAlign: "right",
                }}
              >
                {(share * 100).toFixed(1)}% share
              </div>
            </div>
          );
        })}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          <span>
            Reconciliation: attributed {formatMoney(totalAttributed)} · vault
            total {formatMoney(totalAccrued)} · residual{" "}
            {formatMoneySigned(residual)}
          </span>
          <span>Under $1 auto-compounds · ≥ $1 in ledger, compound default</span>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 6. Yield-routing picker (Phase 2.5) — the user's choice about
//    what happens to accrued yield. 4 strategies, persisted to
//    VaultPreferences.yieldRoutingStrategy, audit-logged on change.
// ──────────────────────────────────────────────────────────────────────

function YieldRoutingSection({
  current,
}: {
  current: import("@/lib/vault/types").YieldRoutingStrategy;
}) {
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// yield · routing"
        title="Yield routing"
        em="where accrued yield goes when the strategy pays out."
        accent="gold"
      />
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          padding: "20px 24px",
        }}
      >
        <YieldRoutingPicker current={current} />
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 7. Off-ramp adapter status
// ──────────────────────────────────────────────────────────────────────

function OffRampPanel({ adapters }: { adapters: OffRampAdapterStatus[] }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// off-ramp · status"
        title="Off-ramp providers"
        em="gateway health, per adapter."
        accent="mercury"
      />
      <div
        data-testid="vault-offramp-panel"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${adapters.length}, 1fr)`,
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        {adapters.map((a, i) => (
          <div
            key={a.name}
            style={{
              padding: "20px 24px",
              borderRight: i < adapters.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> {a.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: a.available ? "var(--ok)" : "var(--warn)",
                marginBottom: 8,
              }}
            >
              <span aria-hidden>{a.available ? "●" : "○"}</span>{" "}
              {a.available ? "Available" : "Unavailable"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.45,
              }}
            >
              {a.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 7. Strategy allocation
// ──────────────────────────────────────────────────────────────────────

function StrategyAllocation({
  deployed,
  reserved,
  liquid,
}: {
  deployed: number;
  reserved: number;
  liquid: number;
}) {
  const yieldReserve = Math.max(0, deployed - reserved);
  const total = reserved + yieldReserve + liquid;
  const slice = (cents: number) =>
    total > 0 ? Math.max(0, Math.min(100, (cents / total) * 100)) : 0;
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// strategy · allocation"
        title="Two-tier capital allocation"
        em="settlement reserve · yield reserve · liquid buffer."
        accent="jupiter"
      />
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          padding: "20px 24px",
        }}
      >
        <div
          aria-hidden
          style={{
            display: "flex",
            height: 14,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid var(--line)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: `${slice(reserved).toFixed(2)}%`,
              background: "var(--terminal-cyan)",
              boxShadow: "0 0 8px rgba(45, 212, 191, 0.4)",
            }}
            title={`Settlement reserve ${formatMoney(reserved)}`}
          />
          <div
            style={{
              width: `${slice(yieldReserve).toFixed(2)}%`,
              background: "var(--gold)",
            }}
            title={`Yield reserve ${formatMoney(yieldReserve)}`}
          />
          <div
            style={{
              width: `${slice(liquid).toFixed(2)}%`,
              background: "var(--ink-3)",
            }}
            title={`Liquid buffer ${formatMoney(liquid)}`}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          <AllocCell
            label="settlement reserve"
            value={formatMoney(reserved)}
            sub="USDC · covers bills in execution window"
            color="var(--terminal-cyan)"
          />
          <AllocCell
            label="yield reserve"
            value={formatMoney(yieldReserve)}
            sub="sUSDS · longer-dated bills earning"
            color="var(--gold)"
          />
          <AllocCell
            label="liquid buffer"
            value={formatMoney(liquid)}
            sub="USDC · immediately redeemable"
            color="var(--ink-3)"
          />
        </div>
      </div>
    </section>
  );
}

function AllocCell({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        <span style={{ color }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 18,
          color: "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 12,
          color: "var(--ink-3)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 8. Audit footer
// ──────────────────────────────────────────────────────────────────────

function AuditFooter({
  source,
  envelopes,
  bills,
  yieldEvents,
}: {
  source: "db" | "empty";
  envelopes: number;
  bills: number;
  yieldEvents: number;
}) {
  const sourceLabel = source === "db" ? "DB-SOURCED" : "EMPTY";
  const sourceColor =
    source === "db" ? "var(--ok)" : "var(--ink-3)";
  return (
    <div
      data-testid="vault-audit-footer"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--line)",
        borderRadius: 2,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10.5,
        color: "var(--ink-3)",
        letterSpacing: "0.04em",
      }}
    >
      <span>
        <span
          style={{
            color: sourceColor,
            fontWeight: 700,
            marginRight: 8,
            letterSpacing: "0.20em",
          }}
        >
          [OK] {sourceLabel}
        </span>
        {envelopes} envelopes · {bills} bills · {yieldEvents} yield events
      </span>
      <span>
        Phase 2.0 · every action writes to the AuditLog
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Section header — consistent eyebrow + title + em tail.
// ──────────────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  em,
  accent,
}: {
  eyebrow: string;
  title: string;
  em: string;
  accent: "cyan" | "gold" | "mercury" | "jupiter";
}) {
  const color =
    accent === "gold"
      ? "var(--gold)"
      : accent === "mercury"
        ? "var(--mercury)"
        : accent === "jupiter"
          ? "var(--jupiter)"
          : "var(--terminal-cyan)";
  const eyebrowParts = eyebrow.match(/^(\/\/)\s*(.*)$/);
  const eyebrowPrefix = eyebrowParts?.[1] ?? "//";
  const eyebrowRest = eyebrowParts?.[2] ?? "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>{eyebrowPrefix}</span>{" "}
          {eyebrowRest}
        </span>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 22,
            margin: 0,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 400,
            fontSize: 14,
            color: "var(--ink-3)",
          }}
        >
          {em}
        </span>
      </div>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 60,
          height: 1,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Vault status chip — small badge next to the page title.
// ──────────────────────────────────────────────────────────────────────

function VaultStatusChip({
  status,
}: {
  status: "ACTIVE" | "PAUSED" | "RECOVERY_MODE";
}) {
  const color =
    status === "ACTIVE"
      ? "var(--ok)"
      : status === "PAUSED"
        ? "var(--warn)"
        : "var(--warn)";
  const marker = status === "ACTIVE" ? "[OK]" : "[WARN]";
  return (
    <span
      data-testid="vault-status-chip"
      data-vault-status={status}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "6px 12px",
        borderRadius: 2,
      }}
    >
      {marker} {status}
    </span>
  );
}

// Source-of-truth chip — shows where the snapshot came from.
function SourceChip({ source }: { source: "db" | "empty" }) {
  const color = source === "db" ? "var(--ok)" : "var(--ink-3)";
  const marker = source === "db" ? "[OK]" : "[—]";
  const label = source === "db" ? "DB" : "EMPTY";
  return (
    <span
      data-testid="vault-source-chip"
      data-source={source}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "6px 12px",
        borderRadius: 2,
      }}
    >
      {marker} {label}
    </span>
  );
}

function toneForBadge(status: ScheduledBill["status"]): BillTone {
  switch (status) {
    case "SETTLED":
      return "ok";
    case "INSUFFICIENT_FUNDS":
    case "MANUAL_ACTION_REQUIRED":
    case "FAILED_RETRYABLE":
    case "FAILED_FINAL":
    case "REQUIRES_REVIEW":
      return "warn";
    case "DRAFT":
    case "FUNDED":
    case "EARNING":
    case "PREPARING_SETTLEMENT":
    case "EXECUTING":
      return "cyan";
    case "PAUSED":
    case "CANCELLED":
    default:
      return "ink";
  }
}
