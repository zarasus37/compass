import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { loadCurrentVaultSnapshot } from "@/lib/vault/server";
import { userLabel } from "@/lib/vault/state-machine";
import type {
  VaultAlertState,
  VaultEnvelope,
  YieldEvent,
  OffRampAdapterStatus,
  VaultAccount,
} from "@/lib/vault/types";
import { formatShortDate } from "@/lib/format";
import { SyncButton } from "@/components/vault/SyncButton";
import { YieldRoutingPicker } from "@/components/vault/YieldRoutingPicker";
import { BillScheduleClient } from "@/components/vault/BillScheduleClient";
import { canExecute as canExecuteGate } from "@/lib/vault/gateway";
import { RiskAckButton } from "@/components/vault/RiskAckButton";
import { RefreshApyButton } from "@/components/vault/RefreshApyButton";
import { VaultPauseToggle } from "@/components/vault/VaultPauseToggle";
import { DeploySafeButton } from "@/components/vault/DeploySafeButton";
import { FundSafeButton } from "@/components/vault/FundSafeButton";
import { RefreshBalanceButton } from "@/components/vault/RefreshBalanceButton";
import { DepositButton } from "@/components/vault/DepositButton";
import { WithdrawButton } from "@/components/vault/WithdrawButton";
import { SchedulerIndicator } from "@/components/vault/SchedulerIndicator";
import { isMockSafeAddress } from "@/lib/vault/safe-deploy";

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
  // Cluster: Production deploy prep (2026-08-28) — testnet disclosure.
  // The vault deploys to Base Sepolia (chainId 84532) in dev / pre-
  // mainnet. When the active chain is a testnet, surface a clearly
  // visible banner at the top of the page so the user (and anyone
  // they're screen-sharing with) knows the funds are on testnet,
  // not real USDC. Hides automatically once the chain moves to
  // mainnet (8453).
  const envChainId = process.env.VAULT_CHAIN_ID
    ? parseInt(process.env.VAULT_CHAIN_ID, 10)
    : null;
  const isTestnet =
    (envChainId !== null && envChainId !== 8453) ||
    snap.vault.chainId === 84532;
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

      {isTestnet && <TestnetBanner chainId={snap.vault.chainId} />}

      <RiskDisclosure acknowledged={snap.preferences.riskAcknowledgedAt !== null} />

      <div
        data-testid="vault-prefs-link-row"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: -16,
          marginBottom: 24,
        }}
      >
        <Link
          href="/vault/preferences"
          data-testid="vault-prefs-link"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--vessel-accent)",
            textDecoration: "none",
          }}
        >
          [PREFS] See all your vault preferences →
        </Link>
      </div>

      <AlertBanner state={snap.alert} />

      <VaultPauseRow
        vault={snap.vault}
        kpis={{
          onChainUsdcBalanceCents: snap.kpis.onChainUsdcBalanceCents,
          onChainBalanceRefreshedAt: snap.kpis.onChainBalanceRefreshedAt,
          onChainAUsdcBalanceCents: snap.kpis.onChainAUsdcBalanceCents,
          aUsdcBalanceRefreshedAt: snap.kpis.aUsdcBalanceRefreshedAt,
        }}
      />

      <StatusStrip snap={snap} />

      <SchedulerIndicator />

      <BillScheduleClient
        bills={snap.bills}
        envelopes={snap.envelopes}
        gateByBillId={await computeGateByBillId(snap.bills, snap.vault)}
      />

      <YieldAttribution
        envelopes={snap.envelopes}
        totalAccrued={snap.vault.accruedYield}
        totalAttributed={snap.totalAttributedYield}
        apy={snap.vault.simulatedApy}
        adapter={snap.yieldAdapter}
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

// Cluster: Production deploy prep (2026-08-28) — testnet disclosure.
// Renders a single-line banner that surfaces the active chain and
// its mainnet/testnet classification. Hidden when the chain is
// mainnet. The chain id is taken from the env-var (default for
// new vaults) so the banner is correct even before the user has
// deployed a Safe.
function TestnetBanner({ chainId }: { chainId: number }) {
  const known = (
    [
      [1, "Ethereum mainnet"],
      [8453, "Base mainnet"],
      [84532, "Base Sepolia (testnet)"],
      [11155111, "Ethereum Sepolia (testnet)"],
    ] as Array<[number, string]>
  ).find(([id]) => id === chainId);
  const label = known ? known[1] : `chainId ${chainId}`;
  const isTest = known ? label.includes("testnet") : true;
  if (!isTest) return null;
  return (
    <div
      data-testid="vault-testnet-banner"
      role="status"
      style={{
        background: "color-mix(in srgb, var(--terminal-amber, #C9A45C) 12%, var(--surface))",
        border: "1px solid var(--terminal-amber, #C9A45C)",
        borderLeft: "4px solid var(--terminal-amber, #C9A45C)",
        borderRadius: 2,
        padding: "10px 14px",
        marginBottom: 24,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 12,
        color: "var(--ink)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "var(--terminal-amber, #C9A45C)",
          border: "1px solid var(--terminal-amber, #C9A45C)",
          padding: "2px 6px",
          borderRadius: 2,
        }}
      >
        [WARN] Testnet
      </span>
      <span>
        Vault deploys to <strong>{label}</strong>. Funds on this chain have no real-world value; switch VAULT_CHAIN_ID=8453 to target Base mainnet.
      </span>
    </div>
  );
}

function EmptyState() {
  // Testnet disclosure for the empty state — same logic as the
  // populated page, but we don't have a vault.chainId yet, so we
  // fall back to VAULT_CHAIN_ID env (which drives the default for
  // new vaults).
  const envChainId = process.env.VAULT_CHAIN_ID
    ? parseInt(process.env.VAULT_CHAIN_ID, 10)
    : null;
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
      {envChainId !== null && envChainId !== 8453 && (
        <TestnetBanner chainId={envChainId} />
      )}
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
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-watch)",
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
            color: "var(--vessel-watch)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            border: "1px solid var(--vessel-watch)",
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

function VaultPauseRow({
  vault,
  kpis,
}: {
  vault: VaultAccount;
  kpis: {
    onChainUsdcBalanceCents: number;
    onChainBalanceRefreshedAt: string | null;
    onChainAUsdcBalanceCents: number;
    aUsdcBalanceRefreshedAt: string | null;
  };
}) {
  const deployed = !isMockSafeAddress(vault.smartAccountAddress);
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
        flexWrap: "wrap",
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
        {deployed && (
          <span
            data-testid="vault-safe-deployed-status"
            style={{ color: "var(--ok)", marginLeft: 12 }}
          >
            · [OK] SAFE DEPLOYED
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <DeploySafeButton
          smartAccountAddress={vault.smartAccountAddress}
          signerAddress={vault.signerAddress}
          chainId={vault.chainId}
        />
        {deployed && (
          <>
            <FundSafeButton
              safeAddress={vault.smartAccountAddress}
              signerAddress={vault.signerAddress}
            />
            <RefreshBalanceButton
              lastRefreshedAt={kpis.onChainBalanceRefreshedAt}
              onChainBalanceCents={kpis.onChainUsdcBalanceCents}
              safeAddress={vault.smartAccountAddress}
            />
            <DepositButton
              safeAddress={vault.smartAccountAddress}
              onAaveUsdc={vault.aUsdcTokenAddress != null}
            />
            <WithdrawButton
              safeAddress={vault.smartAccountAddress}
              hasAUsdc={kpis.onChainAUsdcBalanceCents > 0}
            />
          </>
        )}
        <VaultPauseToggle status={vault.status} />
      </div>
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
  const deployed = !isMockSafeAddress(vault.smartAccountAddress);
  // Cluster 6.0.1 — mainnet. When the active chain is Base mainnet
  // (chainId 8453), surface a "MAINNET" badge on the principal
  // cell so the user has an explicit "this is real USDC" signal
  // in the chrome. Color = gold (warning-adjacent) because real
  // money deserves a different visual weight than testnet.
  const isMainnet = vault.chainId === 8453;
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
        sub={
          deployed
            ? `on-chain ${formatMoney(kpis.onChainUsdcBalanceCents)}${
                kpis.onChainAUsdcBalanceCents > 0
                  ? ` · aUSDC ${formatMoney(kpis.onChainAUsdcBalanceCents)} earning`
                  : ""
              } · ${snap.envelopes.length} envelopes`
            : `across ${snap.envelopes.length} envelopes`
        }
        tone="cyan"
        // MAINNET (gold) takes priority over LIVE (green) when both
        // apply so the mainnet signal is the louder one — real USDC
        // is the more important fact than "on-chain." When on
        // testnet the existing LIVE chip stays.
        badge={isMainnet ? "MAINNET" : deployed ? "LIVE" : null}
        badgeTone={isMainnet ? "gold" : "ok"}
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
  badge,
  badgeTone = "ok",
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "cyan" | "ink";
  isLast?: boolean;
  /** Optional small chip rendered after the value (e.g. "LIVE" for
   *  the on-chain vault principal, "MAINNET" for chain 8453).
   *  Terminal voice, mono caps. */
  badge?: string | null;
  /** Badge color: `ok` (green, default — testnet/LIVE) or `gold`
   *  (warning-adjacent — mainnet, where real USDC lives). */
  badgeTone?: "ok" | "gold";
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "cyan"
          ? "var(--terminal-cyan)"
          : "var(--ink)";
  const badgeColor = badgeTone === "gold" ? "var(--gold)" : "var(--ok)";
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span>
          <span style={{ color: "var(--ink-4)" }}>//</span> {label}
        </span>
        {badge && (
          <span
            data-testid="kpi-cell-badge"
            data-badge-tone={badgeTone}
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: badgeColor,
              border: `1px solid ${badgeColor}`,
              padding: "2px 6px",
              borderRadius: 2,
              letterSpacing: "0.18em",
            }}
          >
            [OK] {badge}
          </span>
        )}
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
// 4. Bill schedule — moved to <BillScheduleClient> in Phase 3.5
//    (client island; the Add/Edit/Delete affordances need shared
//    state across the rows and the editor modal, which only a
//    client component can give us).
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────
// 5. Yield attribution
// ──────────────────────────────────────────────────────────────────────

function YieldAttribution({
  envelopes,
  totalAccrued,
  totalAttributed,
  apy,
  adapter,
}: {
  envelopes: VaultEnvelope[];
  totalAccrued: number;
  totalAttributed: number;
  apy: number;
  adapter: {
    name: string;
    source: import("@/lib/vault/types").YieldSource;
    lastRefreshedAt: string | null;
  };
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
            flexWrap: "wrap",
            gap: 12,
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
        <div
          style={{
            marginBottom: 20,
            paddingTop: 12,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <RefreshApyButton
            currentApy={apy}
            source={adapter.name}
            lastRefreshedAt={adapter.lastRefreshedAt}
          />
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
      <div
        data-testid="vault-gateway-chain"
        style={{
          marginTop: 14,
          padding: "12px 16px",
          border: "1px solid var(--line-soft)",
          background: "var(--vessel-surface)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            marginBottom: 6,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> gateway chain
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12,
            color: "var(--ink)",
            letterSpacing: "0.04em",
          }}
        >
          preference → {"Spritz"} → {"Monto"} → {"Manual Push"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12,
            color: "var(--ink-2)",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          Each bill&apos;s provider preference is tried first. If it
          rejects, the gateway falls through to the next adapter in
          the chain.{"Manual Push"} is the non-negotiable safety
          path — when the bill lands in MANUAL_ACTION_REQUIRED, the
          user pays out-of-band and marks it settled from the
          recovery panel.
        </div>
      </div>
    </section>
  );
}

/**
 * Compute the canExecute gate for every bill in the snapshot,
 * keyed by billId. Used by BillScheduleClient to decide whether
 * to enable the [EXECUTE] button + show the reason in a tooltip.
 */
async function computeGateByBillId(
  bills: ReadonlyArray<import("@/lib/vault/types").ScheduledBill>,
  vault: import("@/lib/vault/types").VaultAccount,
): Promise<Record<string, { canExecute: boolean; reason: string | null }>> {
  const out: Record<string, { canExecute: boolean; reason: string | null }> = {};
  for (const b of bills) {
    if (b.status !== "FUNDED" && b.status !== "EARNING") {
      out[b.id] = { canExecute: false, reason: null };
      continue;
    }
    const gate = await canExecuteGate(b, vault);
    out[b.id] = {
      canExecute: gate.ok,
      reason: gate.ok ? null : gate.reason,
    };
  }
  return out;
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
// Section header — moved to <SectionHeader> in
// src/components/alchemy/SectionHeader.tsx in Phase 3.5. The
// page now imports it from there (one source of truth, used by
// the new client islands too).
// ──────────────────────────────────────────────────────────────────────

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

// (Local `toneForBadge` removed in Phase 3.5; the client island
// (<BillScheduleClient>) imports the same `tone` function from
// the state machine directly.)
