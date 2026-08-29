/**
 * Compass Vault — policy summary card (Cluster 7.0).
 *
 * The 4-cell grid at the top of `/vault/preferences` that
 * summarizes the user's vault policy in one place:
 *   - Yield routing strategy
 *   - Risk-disclosure state
 *   - Auto bill-pay schedule (or [—] not configured)
 *   - Vault status (LIVE / PAUSED / RECOVERY_MODE)
 *
 * Server component (no "use client"). Reads from props passed by
 * the page; the page does the Prisma reads.
 *
 * Terminal voice: vessel-surface bg, vessel-border, mono caps
 * labels, vessel-accent numerals. Sora body for the values.
 */

import * as React from "react";
import Link from "next/link";
import {
  YIELD_ROUTING_LABEL,
  type YieldRoutingStrategy,
} from "@/lib/vault/types";

type VaultStatus = "ACTIVE" | "PAUSED" | "RECOVERY_MODE";

export function PolicySummaryCard({
  yieldStrategy,
  riskAcknowledgedAt,
  scheduleExists,
  scheduleNextRunAt,
  scheduleEnabled,
  vaultStatus,
}: {
  yieldStrategy: YieldRoutingStrategy;
  riskAcknowledgedAt: string | null;
  scheduleExists: boolean;
  scheduleNextRunAt: string | null;
  scheduleEnabled: boolean;
  vaultStatus: VaultStatus;
}) {
  const strategyLabel = YIELD_ROUTING_LABEL[yieldStrategy];

  // Risk disclosure
  const riskOk = riskAcknowledgedAt !== null;
  const riskValue = riskOk ? "Acknowledged" : "Not yet";
  const riskSub = riskOk
    ? new Date(riskAcknowledgedAt!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "re-prompted on next visit";

  // Schedule
  let scheduleValue: string;
  let scheduleSub: string;
  if (!scheduleExists) {
    scheduleValue = "Not configured";
    scheduleSub = "no auto bill-pay set";
  } else if (!scheduleEnabled) {
    scheduleValue = "Paused";
    scheduleSub = "schedule exists, currently disabled";
  } else if (scheduleNextRunAt) {
    scheduleValue = relativeFromNow(new Date(scheduleNextRunAt), new Date());
    scheduleSub = new Date(scheduleNextRunAt).toLocaleString();
  } else {
    scheduleValue = "—";
    scheduleSub = "save a schedule to compute";
  }

  // Vault status
  const statusValue =
    vaultStatus === "ACTIVE"
      ? "LIVE"
      : vaultStatus === "PAUSED"
        ? "PAUSED"
        : "RECOVERY";
  const statusSub =
    vaultStatus === "ACTIVE"
      ? "running normally"
      : vaultStatus === "PAUSED"
        ? "scheduled runs suspended"
        : "manual action required";
  const statusTone =
    vaultStatus === "ACTIVE"
      ? "ok"
      : vaultStatus === "PAUSED"
        ? "watch"
        : "neg";

  return (
    <div
      data-testid="vault-policy-summary"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 0,
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <PolicyCell
        label="yield routing"
        value={strategyLabel}
        sub={`// ${yieldStrategy.toLowerCase().replace(/_/g, " · ")}`}
        tone="cyan"
      />
      <PolicyCell
        label="risk disclosure"
        value={riskValue}
        sub={riskSub}
        tone={riskOk ? "ok" : "watch"}
      />
      <PolicyCell
        label="auto bill-pay"
        value={scheduleValue}
        sub={scheduleSub}
        tone={scheduleExists && scheduleEnabled ? "cyan" : "ink"}
        href={scheduleExists ? "/vault/schedule" : "/vault/schedule"}
        hrefLabel={scheduleExists ? "[SCHEDULE] →" : "[CONFIGURE] →"}
      />
      <PolicyCell
        label="vault status"
        value={statusValue}
        sub={statusSub}
        tone={statusTone}
        isLast
      />
    </div>
  );
}

function PolicyCell({
  label,
  value,
  sub,
  tone,
  isLast,
  href,
  hrefLabel,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "watch" | "neg" | "cyan" | "ink";
  isLast?: boolean;
  href?: string;
  hrefLabel?: string;
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "watch"
        ? "var(--vessel-watch)"
        : tone === "neg"
          ? "var(--vessel-over)"
          : tone === "cyan"
            ? "var(--vessel-accent)"
            : "var(--ink)";
  return (
    <div
      data-testid={`vault-policy-cell-${label.replace(/\s+/g, "-")}`}
      style={{
        padding: "16px 18px",
        borderRight: isLast ? "none" : "1px solid var(--vessel-border)",
        color: "var(--ink-2)",
        letterSpacing: "0.10em",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        // {label}
      </div>
      <div
        style={{
          color,
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.2,
          fontFamily: "var(--font-sora)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--ink-3)",
          fontSize: 10,
          marginTop: 6,
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {sub}
      </div>
      {href && hrefLabel ? (
        <div style={{ marginTop: 10 }}>
          <Link
            href={href}
            data-testid={`vault-policy-cell-${label.replace(/\s+/g, "-")}-link`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vessel-accent)",
              textDecoration: "none",
            }}
          >
            {hrefLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function relativeFromNow(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return past ? "just now" : "in <1m";
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}
