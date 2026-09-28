import * as React from "react";
import { formatMoney } from "@/lib/money";
import type { Debt } from "@/lib/store";
import { aprTier, aprTierColor } from "@/lib/debt-tier";
import { monthlyInterestCents, yearlyInterestCents } from "@/lib/debt-interest";

/**
 * Lightweight view of the linked Account — only the fields the
 * card actually needs. Defined here (not imported from store.ts)
 * because the liveAccountsFromDb reader returns nullable fields
 * (`mask: string | null`) while the in-memory Account type uses
 * non-null fields. This structural shape accepts both.
 */
export interface DebtCardAccount {
  name: string;
  mask: string | null;
  institution: string | null;
  type: string;
}

/**
 * DebtCard — collapsed per-debt card on /debts (Cluster 7.45 + 7.46).
 *
 * Pure display component. Renders the satellite view of a single
 * debt: circular progress (paid down vs original), balance, APR,
 * min payment, due day, monthly interest hint, institution + last-4
 * if linked to an account. The card itself is tappable — click
 * handling lives in the parent (DebtListInteractive).
 *
 * Terminal-flavored: saturn left rail (debt family identity) +
 * tier-colored right rail + tier-colored donut (severity). The
 * two-rail pattern lets each card stand apart (right rail color
 * reflects APR tier — red/amber/green) without losing the shared
 * "this is a debt" look on the left.
 */
export interface DebtCardProps {
  debt: Debt;
  /** Linked account (for institution + last-4 display). Optional. */
  account?: DebtCardAccount | null;
  /** Visual state for the expansion indicator. */
  isExpanded?: boolean;
}

export function DebtCard({ debt, account, isExpanded = false }: DebtCardProps) {
  const isPaidOff = debt.balanceCents === 0;
  const paidPct =
    debt.originalBalanceCents > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((debt.originalBalanceCents - debt.balanceCents) /
              debt.originalBalanceCents) *
              100,
          ),
        )
      : 100;
  const overpaid =
    !isPaidOff &&
    debt.originalBalanceCents > 0 &&
    debt.balanceCents > debt.originalBalanceCents;

  // APR tier drives the right-rail accent + donut stroke color
  // + APR pill + monthly interest hint color. One source of truth
  // for "how urgent is this debt".
  const tier = aprTier(debt.aprBps);
  const tierColor = aprTierColor(tier);

  // Interest costs (cents). Cluster 7.47: yearly primary, monthly
  // secondary — the yearly figure is the "wasted" shock value that
  // reframes "interest" as a real cost, not just an abstract APR%.
  const monthlyInterest = isPaidOff ? 0 : monthlyInterestCents(debt);
  const yearlyInterest = isPaidOff ? 0 : yearlyInterestCents(debt);

  // The institution + last-4 line only renders when the debt
  // links to a real account.
  const hasAccount = !!account;
  const institutionLabel = account
    ? `${account.institution ?? account.name} · ··${account.mask ?? "—"}`
    : null;
  const accountTypeLabel = account
    ? account.type === "credit"
      ? "Credit"
      : account.type === "savings"
      ? "Savings"
      : "Checking"
    : null;

  return (
    <div
      data-testid={`debt-card-${debt.id}`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--saturn)",
        borderRight: `3px solid ${
          isPaidOff ? "var(--ok)" : overpaid ? "var(--neg)" : tierColor
        }`,
        borderRadius: 4,
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "120px minmax(0, 1.2fr) 140px",
        gap: 24,
        alignItems: "center",
        cursor: "pointer",
        transition: "border-color 120ms, box-shadow 120ms",
        boxShadow: isExpanded ? "0 0 24px rgba(168, 176, 200, 0.18)" : "none",
      }}
    >
      {/* Donut chart — tier-colored stroke */}
      <DonutProgress
        pct={paidPct}
        isPaidOff={isPaidOff}
        overpaid={overpaid}
        strokeColor={isPaidOff ? "var(--ok)" : overpaid ? "var(--neg)" : tierColor}
      />

      {/* Middle column: name + meta + progress bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {debt.name}
          </div>
          {/* APR pill — tier-colored. The pill is the prominent
              piece of info; the rest of the meta line is mono. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: tierColor,
                fontSize: 11.5,
                padding: "2px 8px",
                border: `1px solid ${tierColor}`,
                borderRadius: 2,
                background: "transparent",
                letterSpacing: "0.12em",
              }}
            >
              {(debt.aprBps / 100).toFixed(2)}% APR
            </span>
            {debt.dueDay > 0 && (
              <span style={{ color: "var(--ink-3)" }}>
                <span style={{ color: "var(--ink-4)" }}>·</span> Due day {debt.dueDay}
              </span>
            )}
          </div>
        </div>

        {/* Institution + account type (when linked) — small mono
            line that tells mom WHICH card/debt at a glance. */}
        {hasAccount && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              flexWrap: "wrap",
            }}
          >
            <AccountTypeIcon type={accountTypeLabel ?? "Checking"} />
            <span>{institutionLabel}</span>
            {accountTypeLabel && (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9,
                  color: "var(--ink-4)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 2,
                }}
              >
                {accountTypeLabel}
              </span>
            )}
          </div>
        )}

        {/* Progress bar — paid down vs original */}
        <div>
          <div
            style={{
              position: "relative",
              height: 6,
              background: "var(--cosmos)",
              border: "1px solid var(--line-soft)",
              overflow: "hidden",
              borderRadius: 1,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: `${paidPct}%`,
                background: isPaidOff
                  ? "var(--ok)"
                  : overpaid
                  ? "var(--neg)"
                  : "var(--saturn)",
                boxShadow: isPaidOff
                  ? "0 0 8px var(--ok)"
                  : overpaid
                  ? "0 0 8px var(--neg)"
                  : "0 0 8px var(--saturn)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              marginTop: 4,
              letterSpacing: "0.06em",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {isPaidOff
              ? `[OK] Paid off`
              : overpaid
              ? `[WARN] Over original`
              : `${formatMoney(debt.originalBalanceCents - debt.balanceCents)} of ${formatMoney(debt.originalBalanceCents)} paid down`}
          </div>
        </div>
      </div>

      {/* Right column: balance + min + monthly interest hint */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
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
          }}
        >
          // Balance
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 26,
            fontWeight: 600,
            color: isPaidOff ? "var(--ok)" : "var(--ink)",
            lineHeight: 1.05,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
          }}
        >
          {formatMoney(debt.balanceCents)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> Min {debt.minPaymentCents > 0 ? formatMoney(debt.minPaymentCents) : "—"}
        </div>
        {/* Interest cost hint — YEARLY primary, monthly secondary.
            Cluster 7.47: the yearly figure is the "wasted" shock
            value that reframes interest as a real cost. The
            secondary monthly line gives the "what's leaving my
            wallet" reality. Both tier-colored so severity stays
            visible at a glance. */}
        {!isPaidOff && yearlyInterest > 0 && (
          <>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 700,
                color: tierColor,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              ~{formatMoney(yearlyInterest)}/yr interest
            </div>
            {monthlyInterest > 0 && (
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 8.5,
                  fontWeight: 500,
                  color: "var(--ink-3)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginTop: 1,
                }}
              >
                ({formatMoney(monthlyInterest)}/mo)
              </div>
            )}
          </>
        )}
        {/* Tap-to-expand indicator */}
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            color: isExpanded ? "var(--saturn)" : "var(--ink-4)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isExpanded ? "▴ Collapse" : "▾ Expand"}
        </div>
      </div>
    </div>
  );
}

/**
 * DonutProgress — circular progress arc. SVG with two arcs:
 *   - Track (faint cosmos bg)
 *   - Progress (tier-colored, fills clockwise from 12 o'clock)
 *
 * For a paid-off debt, the arc fills fully + a [OK] badge sits in
 * the center. For an overpaid debt, the arc fills fully + [WARN].
 */
function DonutProgress({
  pct,
  isPaidOff,
  overpaid,
  strokeColor,
}: {
  pct: number;
  isPaidOff: boolean;
  overpaid: boolean;
  strokeColor: string;
}) {
  const size = 96;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (pct / 100) * circumference;
  const glowColor = isPaidOff
    ? "rgba(106, 176, 136, 0.5)"
    : overpaid
    ? "rgba(196, 90, 58, 0.5)"
    : strokeColor === "var(--neg)"
    ? "rgba(196, 90, 58, 0.5)"
    : strokeColor === "var(--warn)"
    ? "rgba(232, 168, 64, 0.5)"
    : "rgba(168, 176, 200, 0.5)";
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cosmos)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${glowColor})`,
            transition: "stroke-dasharray 200ms",
          }}
        />
      </svg>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          color: strokeColor,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {isPaidOff ? "[OK]" : overpaid ? "[WARN]" : `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

/**
 * Small inline SVG icon for the account type (credit card,
 * checking, savings). 14px square, mono-stroke matches the
 * terminal aesthetic.
 */
function AccountTypeIcon({
  type,
}: {
  type: string;
}) {
  // Each icon is a 14×14 SVG with a 1.4px stroke.
  const stroke = "var(--ink-3)";
  if (type === "credit") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="1.5" y="3" width="11" height="8" rx="1" />
        <line x1="1.5" y1="6" x2="12.5" y2="6" />
        <line x1="3.5" y1="9" x2="6.5" y2="9" />
      </svg>
    );
  }
  if (type === "savings") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 10 L7 3 L12 10 Z" />
        <line x1="3" y1="12" x2="11" y2="12" />
      </svg>
    );
  }
  // checking
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke={stroke}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 4 L7 8 L12 4" />
      <rect x="1.5" y="3" width="11" height="8" rx="1" />
    </svg>
  );
}