import * as React from "react";
import { formatMoney } from "@/lib/money";
import type { Debt } from "@/lib/store";

/**
 * DebtCard — collapsed per-debt card on /debts (Cluster 7.45).
 *
 * Pure display component. Renders the satellite view of a single
 * debt: circular progress (paid down vs original), balance, min
 * payment, APR, due day. The card itself is tappable — click
 * handling lives in the parent (DebtListInteractive) so the
 * `useState` for expansion can stay at the list level.
 *
 * Terminal-flavored: saturn left rail (2px, glow), cosmos surface,
 * Sora name + mono numbers, [OK] paid-off badge, // prefix on
 * secondary labels.
 */
export interface DebtCardProps {
  debt: Debt;
  /** Visual state for the expansion indicator. */
  isExpanded?: boolean;
}

export function DebtCard({ debt, isExpanded = false }: DebtCardProps) {
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

  return (
    <div
      data-testid={`debt-card-${debt.id}`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--saturn)",
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
      {/* Donut chart */}
      <DonutProgress
        pct={paidPct}
        isPaidOff={isPaidOff}
        overpaid={overpaid}
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
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span>{" "}
            {(debt.aprBps / 100).toFixed(2)}% APR
            {debt.dueDay > 0 && (
              <>
                <span style={{ color: "var(--ink-5)", margin: "0 6px" }}>·</span>
                Due day {debt.dueDay}
              </>
            )}
          </div>
        </div>

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

      {/* Right column: balance + min */}
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
 *   - Progress (saturn glow, fills clockwise from 12 o'clock)
 *
 * For a paid-off debt, the arc fills fully + a [OK] badge sits in
 * the center. For an overpaid debt, the arc fills fully + [WARN].
 */
function DonutProgress({
  pct,
  isPaidOff,
  overpaid,
}: {
  pct: number;
  isPaidOff: boolean;
  overpaid: boolean;
}) {
  const size = 96;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (pct / 100) * circumference;
  const strokeColor = isPaidOff
    ? "var(--ok)"
    : overpaid
    ? "var(--neg)"
    : "var(--saturn)";
  const glowColor = isPaidOff
    ? "rgba(106, 176, 136, 0.5)"
    : overpaid
    ? "rgba(196, 90, 58, 0.5)"
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