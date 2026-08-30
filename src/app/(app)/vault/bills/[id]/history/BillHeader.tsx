/**
 * BillHeader — Cluster 7.5.
 *
 * The header block of /vault/bills/[id]/history. Surfaces
 * everything the user needs to identify the bill at a glance:
 *   - Bill name (large, Sora)
 *   - Vessel affiliation chip (per the 7-vessel mapping, via
 *     envelope.category)
 *   - Amount (USD, mono)
 *   - Frequency (WEEKLY | MONTHLY | …)
 *   - Current state badge (uses `tone()` + `userLabel()` from
 *     the state machine)
 *   - Next execution window (start → end, mono)
 *   - Last attempt timestamp (if any)
 *   - Source chip (seed | user)
 *   - Back links to /vault and /vault/audit
 *
 * Server component. No interactivity.
 */
import * as React from "react";
import Link from "next/link";
import { tone, userLabel } from "@/lib/vault/state-machine";
import type { ScheduledBill, EnvelopeCategory } from "@/lib/vault/types";

const VESSEL_FOR_CATEGORY: Record<EnvelopeCategory, string> = {
  RENT: "Sol",
  UTILITIES: "Mercury",
  INSURANCE: "Saturn",
  DEBT: "Saturn",
  SUBSCRIPTION: "Venus",
  OTHER: "—",
};

const TONE_TO_COLOR: Record<"ok" | "warn" | "cyan" | "ink", string> = {
  ok: "var(--ok)",
  warn: "var(--vessel-watch)",
  cyan: "var(--vessel-accent)",
  ink: "var(--ink-2)",
};

export function BillHeader({
  bill,
  envelopeName,
  envelopeCategory,
}: {
  bill: ScheduledBill;
  envelopeName: string | null;
  envelopeCategory: EnvelopeCategory | null;
}) {
  const t = tone(bill.status);
  const color = TONE_TO_COLOR[t];
  const vessel = envelopeCategory ? VESSEL_FOR_CATEGORY[envelopeCategory] : "—";
  return (
    <div
      data-testid="vault-bill-history-header"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 24,
        padding: "24px 24px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        marginBottom: 24,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 9.5,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 8,
          }}
        >
          // {envelopeName ?? "no envelope"} · vessel {vessel}
          {bill.source === "user" ? " · added by you" : " · seeded"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--ink-1)",
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {bill.billerName}
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: 12,
            color: "var(--ink-2)",
            letterSpacing: "0.05em",
          }}
        >
          <span
            data-testid="vault-bill-history-amount"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--ink-1)",
            }}
          >
            {formatUsd(bill.amount)}
          </span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>{bill.frequency.toLowerCase()}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>due {new Date(bill.dueDate).toLocaleDateString()}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>
            window {formatDate(bill.executionWindowStart)} → {formatDate(bill.executionWindowEnd)}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <div
          data-testid="vault-bill-history-state-badge"
          style={{
            padding: "6px 12px",
            background: color,
            color: "var(--vessel-dark)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          {userLabel(bill.status)}
        </div>
        {bill.lastAttemptAt ? (
          <div
            data-testid="vault-bill-history-last-attempt"
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            // last attempt: {new Date(bill.lastAttemptAt).toLocaleString()}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginTop: 4,
          }}
        >
          <Link
            href="/vault"
            data-testid="vault-bill-history-back-vault"
            style={{
              color: "var(--vessel-accent)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            // ← /vault
          </Link>
          <Link
            href="/vault/audit?type=vault.bill_state_changed"
            data-testid="vault-bill-history-back-audit"
            style={{
              color: "var(--vessel-accent)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            // all state changes → /vault/audit
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}
