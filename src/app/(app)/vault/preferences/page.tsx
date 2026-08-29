/**
 * /vault/preferences — Cluster 7.0.
 *
 * The vault preferences hub. A single-page summary of the
 * user's vault policy:
 *   - Yield-routing strategy (with the picker)
 *   - Risk-disclosure state (with acknowledge / re-acknowledge)
 *   - Auto bill-pay schedule (compact summary + link)
 *   - Vault status (LIVE / PAUSED / RECOVERY_MODE)
 *
 * Server component, force-dynamic so the values reflect the
 * latest DB state. No client islands except the picker,
 * RiskAckButton, and RevokeRiskAckButton (which need the
 * server actions).
 */
import * as React from "react";

import { PageHead } from "@/components/alchemy/PageHead";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/user";
import {
  YIELD_ROUTING_LABEL,
  OFFRAMP_PROVIDER_LABEL,
  type YieldRoutingStrategy,
  type OffRampProvider,
} from "@/lib/vault/types";
import { loadCurrentVaultSnapshot } from "@/lib/vault/server";
import { PolicySummaryCard } from "@/components/vault/PolicySummaryCard";
import { ScheduleSummaryCard } from "@/components/vault/ScheduleSummaryCard";
import { YieldRoutingPicker } from "@/components/vault/YieldRoutingPicker";
import { OffRampProviderPicker } from "@/components/vault/OffRampProviderPicker";
import { RiskAckButton } from "@/components/vault/RiskAckButton";
import { RevokeRiskAckButton } from "@/components/vault/RevokeRiskAckButton";

export const dynamic = "force-dynamic";

const VALID_STRATEGIES: YieldRoutingStrategy[] = [
  "COMPOUND",
  "APPLY_TO_NEXT_BILL",
  "MOVE_TO_AVAILABLE",
  "SPLIT_BY_ENVELOPE",
];

const VALID_OFFRAMP_PROVIDERS: OffRampProvider[] = [
  "MOCK",
  "SPRITZ",
  "MONTO",
];

function asStrategy(s: string | null | undefined): YieldRoutingStrategy {
  if (s && (VALID_STRATEGIES as string[]).includes(s)) {
    return s as YieldRoutingStrategy;
  }
  return "COMPOUND";
}

function asProvider(s: string | null | undefined): OffRampProvider {
  if (s && (VALID_OFFRAMP_PROVIDERS as string[]).includes(s)) {
    return s as OffRampProvider;
  }
  return "MOCK";
}

export default async function VaultPreferencesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHead
          eyebrow="// ledger · vault · preferences"
          title="Vault preferences"
          em="sign in first."
          accent="cyan"
          explanation={<>You need to be signed in to view your vault preferences.</>}
        />
      </div>
    );
  }

  // Read the preferences row, the schedule row, and the vault
  // status in one round-trip each. The snapshot is also read so
  // the yield-routing section can show the resolved strategy
  // (the same source the main /vault page reads from).
  const [prefs, schedule, vaultAccount, snapshot] = await Promise.all([
    prisma.vaultPreferences.findUnique({ where: { userId: user.id } }),
    prisma.vaultSchedule.findUnique({ where: { userId: user.id } }),
    prisma.vaultAccount.findUnique({
      where: { userId: user.id },
      select: { status: true, updatedAt: true },
    }),
    loadCurrentVaultSnapshot(),
  ]);

  // Default strategy if the user has no row yet: COMPOUND
  // (matches the schema default and the spec).
  const currentStrategy = asStrategy(prefs?.yieldRoutingStrategy);
  // Cluster 7.3 — default provider if the user has no row yet: MOCK
  // (matches the schema default; the safe path).
  const currentProvider = asProvider(
    (prefs as { offRampProvider?: string | null } | null)?.offRampProvider,
  );
  const riskAcknowledgedAt = prefs?.riskAcknowledgedAt
    ? prefs.riskAcknowledgedAt.toISOString()
    : null;
  const lastUpdated = prefs?.updatedAt ? prefs.updatedAt : null;

  // Snapshot-level strategy wins if the page's snapshot says
  // something different — that's the canonical "what the engine
  // is using" value. Fall back to the DB value.
  const snapshotStrategy =
    snapshot && snapshot.snapshot
      ? snapshot.snapshot.preferences.yieldRoutingStrategy
      : null;
  const effectiveStrategy: YieldRoutingStrategy =
    snapshotStrategy !== null
      ? asStrategy(snapshotStrategy)
      : currentStrategy;
  // Cluster 7.3 — same snapshot-wins rule for the off-ramp
  // provider, so the picker + the summary card always agree with
  // what the gateway is using.
  const snapshotProvider =
    snapshot && snapshot.snapshot
      ? (snapshot.snapshot.preferences as { offRampProvider?: string | null })
          .offRampProvider
      : null;
  const effectiveProvider: OffRampProvider =
    snapshotProvider !== null && snapshotProvider !== undefined
      ? asProvider(snapshotProvider)
      : currentProvider;

  return (
    <div>
      <PageHead
        eyebrow="// ledger · vault · preferences"
        title="Vault preferences"
        em="your policy, in one place."
        accent="cyan"
        explanation={
          <>
            Everything you can tune about how your vault runs, consolidated in one
            view. The yield-routing strategy controls where accrued yield goes at
            settlement. The risk disclosure is a one-time read; you can re-prompt
            it any time. The auto bill-pay schedule is what the cron actually
            fires. Pause the vault to suspend every scheduled run without
            deleting the schedule.
          </>
        }
      />

      <SectionHeader
        eyebrow="// policy"
        title="Your vault policy"
        em="the current state of every knob."
        accent="cyan"
      />

      <PolicySummaryCard
        yieldStrategy={effectiveStrategy}
        offRampProvider={effectiveProvider}
        riskAcknowledgedAt={riskAcknowledgedAt}
        scheduleExists={schedule !== null}
        scheduleNextRunAt={
          schedule?.nextRunAt ? schedule.nextRunAt.toISOString() : null
        }
        scheduleEnabled={schedule?.enabled ?? false}
        vaultStatus={(vaultAccount?.status as "ACTIVE" | "PAUSED" | "RECOVERY_MODE" | undefined) ?? "ACTIVE"}
      />

      <SectionHeader
        eyebrow="// yield"
        title="Yield routing"
        em="where accrued yield goes when the strategy pays out."
        accent="cyan"
      />

      <div
        data-testid="vault-prefs-yield"
        style={{ marginBottom: 32 }}
      >
        <YieldRoutingPicker current={effectiveStrategy} />
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
          Switching strategy re-routes future yield only. Already-deployed
          principal is unaffected; in-flight yield follows the strategy
          that was active when it accrued. Settled yield is not retroactive.
        </div>
      </div>

      <SectionHeader
        eyebrow="// off-ramp"
        title="Off-ramp provider"
        em="which rail the gateway tries first when a bill settles."
        accent="cyan"
      />

      <div
        data-testid="vault-prefs-offramp"
        style={{ marginBottom: 32 }}
      >
        <OffRampProviderPicker current={effectiveProvider} />
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
          {`MOCK is the safe default — no external call, no real money. Picking Spritz or Monto uses the real provider; missing credentials auto-fall-back to MOCK at runtime, so the gateway stays end-to-end functional either way. The chain is ${OFFRAMP_PROVIDER_LABEL[effectiveProvider]} → other providers → Manual Push (safety).`}
        </div>
      </div>

      <SectionHeader
        eyebrow="// risk"
        title="Risk disclosure"
        em="yield is variable, settlement can fail, principal is at risk."
        accent="cyan"
      />

      <div data-testid="vault-prefs-risk" style={{ marginBottom: 32 }}>
        {riskAcknowledgedAt === null ? (
          <div
            role="alert"
            aria-label="Vault risk disclosure"
            data-testid="vault-prefs-risk-disclosure"
            style={{
              background: "var(--vessel-surface)",
              border: "1px solid var(--vessel-watch)",
              borderRadius: 2,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <div
              aria-hidden
              style={{
                display: "inline-block",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--vessel-watch)",
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                border: "1px solid var(--vessel-watch)",
                padding: "4px 8px",
                borderRadius: 2,
                marginBottom: 12,
              }}
            >
              [WARN] Risk
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--ink-2)",
                marginBottom: 8,
              }}
            >
              Compass is a self-custodial digital-asset vault. Yield is variable
              and not guaranteed. The system uses a 7-condition
              <code> canExecute </code> gate on every bill settlement, but
              funding, protocol, provider, or settlement conditions can still
              fail. Compass cannot guarantee a bill will be paid if any of
              these fail.
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--ink-3)",
              }}
            >
              Acknowledging records a timestamp and writes a
              <code> vault.risk_acknowledged </code>
              audit entry. The disclosure is suppressed on future visits
              until you re-prompt it below.
            </div>
            <RiskAckButton />
          </div>
        ) : (
          <div
            data-testid="vault-prefs-risk-acknowledged"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "var(--vessel-surface)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              marginBottom: 16,
            }}
          >
            <div
              aria-hidden
              style={{
                display: "inline-block",
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
                flex: 1,
              }}
            >
              Risk disclosure acknowledged on{" "}
              <strong style={{ color: "var(--ink)" }}>
                {new Date(riskAcknowledgedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
              . Yield is variable and not guaranteed; Compass cannot guarantee
              a bill will be paid if funding, protocol, provider, or
              settlement conditions fail.
            </div>
            <RevokeRiskAckButton />
          </div>
        )}
      </div>

      <SectionHeader
        eyebrow="// schedule"
        title="Auto bill-pay"
        em="the cron that fires the off-ramp gateway."
        accent="cyan"
      />

      <ScheduleSummaryCard
        scheduleExists={schedule !== null}
        enabled={schedule?.enabled ?? false}
        cronExpression={schedule?.cronExpression ?? null}
        timezone={schedule?.timezone ?? null}
        nextRunAt={
          schedule?.nextRunAt ? schedule.nextRunAt.toISOString() : null
        }
        lastRunAt={
          schedule?.lastRunAt ? schedule.lastRunAt.toISOString() : null
        }
        lastRunStatus={schedule?.lastRunStatus ?? null}
        lastRunBillsAffected={schedule?.lastRunBillsAffected ?? 0}
      />

      <div
        data-testid="vault-prefs-footer"
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
        // last updated:{" "}
        {lastUpdated
          ? new Date(lastUpdated).toLocaleString()
          : "no changes yet"}
      </div>

      <div
        data-testid="vault-prefs-strategy-label"
        style={{ display: "none" }}
        aria-hidden
      >
        {YIELD_ROUTING_LABEL[effectiveStrategy]}
      </div>
    </div>
  );
}
