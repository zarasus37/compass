"use client";

/**
 * DebtDetailExpand — per-debt breakdown panel (Cluster 7.45 + 7.46).
 *
 * Shown below a debt card on /debts when that card is expanded.
 * Surfaces that debt's full stats + "What if?" simulator. Cluster
 * 7.46 added tier-colored severity indicators, more cells
 * (institution, days-until-payment, total-cost-at-min, APR tier
 * badge), and clearer copy on the cell labels.
 *
 * Cells (12):
 *   - Balance
 *   - APR (tier-colored)
 *   - Min payment
 *   - Monthly interest cost (tier-colored)
 *   - Days until payment (computed)
 *   - Months to payoff at min (computed)
 *   - Interest at min (computed)
 *   - Total cost at min (computed; balance + interest at min)
 *   - Started at (was "Original")
 *   - Progress to zero (was "Paid down")
 *   - Institution (from linked account)
 *   - APR tier badge (HIGH / MEDIUM / LOW / NO APR, tier-colored)
 *
 * The cluster 7.45 design choice: NO snowball/avalanche method
 * toggle here. That toggle only matters across debts; the per-debt
 * math doesn't care about order. The user picks the debt directly.
 */

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { Debt } from "@/lib/store";
import type { DebtCardAccount } from "./DebtCard";
import { aprTier, aprTierColor, aprTierLabel } from "@/lib/debt-tier";
import {
  monthlyInterestCents,
  totalWastedAtMinCents,
} from "@/lib/debt-interest";
import { payoffProjection } from "@/lib/payoff-projection";
import { applyExtraToDebt } from "@/app/actions/debts";

export interface DebtDetailExpandProps {
  debt: Debt;
  /** Linked account (institution + last-4 + type). Optional. */
  account?: DebtCardAccount | null;
  anchor?: Date;
  /**
   * Cluster 7.50 — viewport-aware layout. When true, the 4-column
   * stats grid collapses to 2 columns (or 1 column on phones
   * <480px). Pass `useMediaQuery("(max-width: 768px)")` from the
   * parent.
   */
  isMobile?: boolean;
}

export function DebtDetailExpand({
  debt,
  account,
  anchor,
  isMobile = false,
}: DebtDetailExpandProps) {
  // `anchor` is optional; when it is omitted we fall back to "now".
  // Wrapping the fallback in its own memo keeps `a` referentially
  // stable across renders — otherwise `new Date()` on every render
  // would invalidate the projection memos below on every render.
  const a = React.useMemo(() => anchor ?? new Date(), [anchor]);
  const isPaidOff = debt.balanceCents === 0;
  const monthlyInterest = monthlyInterestCents(debt);
  const tier = aprTier(debt.aprBps);
  const tierColor = aprTierColor(tier);

  // Months to payoff at min payment (closed-form). Mirrors the math
  // in DebtPayoffSimulator / DebtSparkline.
  const monthsAtMin = (() => {
    if (isPaidOff) return 0;
    if (debt.minPaymentCents <= 0) return 0;
    const r = debt.aprBps / 120000;
    if (r === 0) return Math.ceil(debt.balanceCents / debt.minPaymentCents);
    if (debt.minPaymentCents <= monthlyInterest) return -1; // unpayable at min
    const N =
      -Math.log(1 - monthlyInterest / debt.minPaymentCents) /
      Math.log(1 + r);
    return Math.ceil(N);
  })();
  const isUnpayableAtMin = monthsAtMin === -1;

  // Total interest at min = sum of monthly interest over the payoff
  // lifetime. Cluster 7.47: pulled into the shared helper so the
  // per-debt cell + the (future) page-level "saved by extra" stat
  // agree on the same math. -1 = unpayable at min.
  const totalInterestAtMinCents = totalWastedAtMinCents(debt, a);

  // Total cost to clear = current balance + total interest at min.
  // The "true cost" of the debt to mom's wallet if she pays only
  // the minimum every month. Cluster 7.46 — surfaces the math
  // behind the often-unseen interest accumulation.
  const totalCostAtMinCents = isPaidOff
    ? 0
    : isUnpayableAtMin
    ? -1
    : debt.balanceCents + totalInterestAtMinCents;

  // Days until next payment. Mirrors the helper used in /bills.
  const daysUntilDue = (() => {
    if (debt.dueDay <= 0) return null;
    const today = a;
    const todayDay = today.getDate();
    let nextDue = new Date(
      today.getFullYear(),
      today.getMonth(),
      debt.dueDay,
    );
    if (todayDay >= debt.dueDay) {
      nextDue = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        debt.dueDay,
      );
    }
    const ms = nextDue.getTime() - today.getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  })();
  const dueLabel = (() => {
    if (daysUntilDue === null) return "—";
    if (daysUntilDue === 0) return "Today";
    if (daysUntilDue === 1) return "Tomorrow";
    if (daysUntilDue < 7) return `In ${daysUntilDue} days`;
    if (daysUntilDue < 30) return `In ${daysUntilDue} days`;
    return `In ${Math.floor(daysUntilDue / 7)}w ${daysUntilDue % 7}d`;
  })();
  const dueAccent =
    daysUntilDue === null
      ? "ink-3"
      : daysUntilDue <= 3
      ? "warn"
      : daysUntilDue <= 7
      ? "ink-2"
      : "ink-2";

  const [extraDollars, setExtraDollars] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paidOff, setPaidOff] = useState(false);

  // Per-debt projection with the chosen extra. Pass [debt] so the
  // existing payoffProjection engine handles the math.
  const projection = React.useMemo(
    () => payoffProjection([debt], "snowball", Math.max(0, Math.round(extraDollars * 100)), a),
    [debt, extraDollars, a],
  );
  const baseline = React.useMemo(
    () => payoffProjection([debt], "snowball", 0, a),
    [debt, a],
  );
  const savedMonths = isPaidOff
    ? 0
    : baseline.totalMonths - projection.totalMonths;
  const savedInterest = isPaidOff
    ? 0
    : baseline.totalInterestCents - projection.totalInterestCents;
  const projectionHeadDebt = projection.perDebt[0];
  const monthsWithExtra = projectionHeadDebt?.monthsToPayoff ?? 0;

  const onApply = () => {
    if (extraDollars <= 0 || isPaidOff) return;
    setError(null);
    setPaidOff(false);
    const fd = new FormData();
    fd.set("debtId", debt.id);
    fd.set("amount", String(extraDollars));
    fd.set("source", "debt-detail-expand");
    startTransition(async () => {
      const result = await applyExtraToDebt(null, fd);
      if (!result.ok) {
        setError(result.reason ?? "Could not apply payment.");
        return;
      }
      if (result.debt && result.debt.balanceCents === 0) {
        setPaidOff(true);
      }
    });
  };

  return (
    <div
      data-testid={`debt-detail-expand-${debt.id}`}
      style={{
        position: "relative",
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--saturn)",
        borderRight: `3px solid ${
          isPaidOff ? "var(--ok)" : tierColor
        }`,
        borderRadius: 4,
        padding: "24px 28px 28px",
        marginTop: 8,
        marginBottom: 16,
        boxShadow: "0 0 32px rgba(168, 176, 200, 0.10)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--saturn)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Debt breakdown
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.005em",
            }}
          >
            {debt.name}
          </div>
          {account && (
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color: "var(--ink-3)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {account.institution ?? account.name} ·{" "}
              <span style={{ color: "var(--ink-2)" }}>
                ··{account.mask ?? "—"}
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          {formatMoney(debt.balanceCents)} of{" "}
          <span style={{ color: "var(--ink-2)" }}>
            {formatMoney(debt.originalBalanceCents)}
          </span>{" "}
          remaining
        </div>
      </div>

      {/* 12-cell stats grid — clear labels + tier coloring on
          severity-bearing cells (APR, Monthly Interest, Total Cost). */}
      <div
        style={{
          display: "grid",
          // Cluster 7.50 — responsive stats grid. Desktop: 4 cols.
          // Tablet (<768px): 2 cols. Phone (<480px): 1 col.
          gridTemplateColumns: isMobile
            ? "repeat(1, minmax(0, 1fr))"
            : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCell label="Balance" value={formatMoney(debt.balanceCents)} accent="ink" />
        <StatCell
          label="APR"
          value={`${(debt.aprBps / 100).toFixed(2)}%`}
          accent={isPaidOff ? "ok" : tier === "high" ? "neg" : tier === "medium" ? "warn" : tier === "low" ? "ok" : "ink-2"}
        />
        <StatCell
          label="Min payment"
          value={debt.minPaymentCents > 0 ? formatMoney(debt.minPaymentCents) : "—"}
          accent="ink-2"
        />
        <StatCell
          label="Monthly interest"
          value={
            isPaidOff
              ? "—"
              : isUnpayableAtMin
              ? "[WARN] > min"
              : formatMoney(monthlyInterest)
          }
          accent={isUnpayableAtMin ? "neg" : isPaidOff ? "ink-3" : tier === "high" ? "neg" : tier === "medium" ? "warn" : "ink"}
        />
        <StatCell
          label="Days until payment"
          value={dueLabel}
          accent={dueAccent}
        />
        <StatCell
          label="Months to payoff at min"
          value={
            isPaidOff
              ? "[OK] Paid off"
              : isUnpayableAtMin
              ? "Never"
              : `${monthsAtMin}mo`
          }
          accent={isPaidOff ? "ok" : isUnpayableAtMin ? "neg" : "saturn"}
        />
        <StatCell
          label="Wasted to interest"
          value={
            isPaidOff
              ? "—"
              : isUnpayableAtMin
              ? "[WARN] Grows forever"
              : formatMoney(totalInterestAtMinCents)
          }
          accent={isUnpayableAtMin ? "neg" : isPaidOff ? "ink-3" : tier === "high" ? "neg" : tier === "medium" ? "warn" : tier === "low" ? "ok" : "ink-2"}
        />
        <StatCell
          label="Total cost to zero"
          value={
            isPaidOff
              ? "—"
              : isUnpayableAtMin
              ? "[WARN] Infinite"
              : formatMoney(totalCostAtMinCents)
          }
          accent={isUnpayableAtMin ? "neg" : isPaidOff ? "ink-3" : tier === "high" ? "neg" : tier === "medium" ? "warn" : "ink"}
        />
        <StatCell
          label="Started at"
          value={formatMoney(debt.originalBalanceCents)}
          accent="ink-3"
        />
        <StatCell
          label="Progress to zero"
          value={
            isPaidOff
              ? "[OK] 100%"
              : `${Math.round(
                  ((debt.originalBalanceCents - debt.balanceCents) /
                    Math.max(1, debt.originalBalanceCents)) *
                    100,
                )}%`
          }
          accent="ok"
        />
        <StatCell
          label="Institution"
          value={
            account
              ? `${account.institution ?? account.name}`
              : "—"
          }
          accent="ink-2"
        />
        <StatCell
          label="APR tier"
          value={aprTierLabel(tier)}
          accent={
            isPaidOff
              ? "ok"
              : tier === "high"
              ? "neg"
              : tier === "medium"
              ? "warn"
              : tier === "low"
              ? "ok"
              : "ink-3"
          }
          highlight
        />
      </div>

      {/* Utilization visualization (Cluster 7.48 — rainbow
          gradient refined in 7.49). Shows credit limit + current
          utilization gauge for credit-card debts. */}
      {debt.creditLimitCents && debt.creditLimitCents > 0 && (
        <UtilizationPanel
          balanceCents={debt.balanceCents}
          creditLimitCents={debt.creditLimitCents}
        />
      )}

      {/* Payoff trajectory (Cluster 7.49 — restored with real
          curve). Replaces the prior flat sparkline (removed in
          7.48) which was uninformative. The new `<PayoffCurve>`
          draws the actual declining balance over time as an SVG
          line chart with Y-axis balance labels + X-axis month
          labels. Reacts to the slider's extra-payment state so
          mom sees the curve flatten when she adds more. */}
      {!isPaidOff && (
        <PayoffCurve
          debt={debt}
          extraMonthlyCents={Math.max(0, Math.round(extraDollars * 100))}
          anchor={a}
          tierColor={tierColor}
        />
      )}

      {/* What if? slider */}
      {!isPaidOff && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 3,
            padding: "18px 22px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <label
              htmlFor={`debt-extra-${debt.id}`}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              What if I add
            </label>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 24,
                color: "var(--gold-glow)",
                lineHeight: 1,
              }}
            >
              {formatMoney(Math.round(extraDollars * 100))}
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 13,
                  color: "var(--ink-3)",
                  marginLeft: 8,
                }}
              >
                per paycheck
              </span>
            </div>
          </div>
          <input
            id={`debt-extra-${debt.id}`}
            type="range"
            min={0}
            max={500}
            step={5}
            value={extraDollars}
            onChange={(e) => setExtraDollars(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "var(--gold)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-4)",
              marginTop: 6,
            }}
          >
            <span>$0</span>
            <span>$500</span>
          </div>

          {/* Headline answer */}
          {extraDollars > 0 && monthsWithExtra > 0 && (
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              Add{" "}
              <b style={{ color: "var(--gold-glow)" }}>
                {formatMoney(Math.round(extraDollars * 100))}
              </b>{" "}
              per paycheck to{" "}
              <b style={{ color: "var(--ink)" }}>{debt.name}</b> — it pays off in{" "}
              <b style={{ color: "var(--saturn)" }}>{monthsWithExtra}mo</b>.
              {savedMonths > 0 && (
                <>
                  {" "}You save{" "}
                  <b style={{ color: "var(--ok)" }}>
                    {savedMonths}mo + {formatMoney(Math.max(0, savedInterest))}
                  </b>
                  .
                </>
              )}
            </div>
          )}

          {/* Apply button + error */}
          <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={onApply}
              disabled={isPending || extraDollars <= 0}
              data-testid={`apply-extra-${debt.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-jetbrains), monospace",
                background:
                  isPending || extraDollars <= 0 ? "var(--ink-3)" : "var(--saturn)",
                color: "var(--ink)",
                border: 0,
                borderRadius: 2,
                padding: "12px 22px",
                fontSize: 11,
                fontWeight: 600,
                cursor: isPending || extraDollars <= 0 ? "not-allowed" : "pointer",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                boxShadow:
                  isPending || extraDollars <= 0
                    ? "none"
                    : "0 0 16px rgba(168, 176, 200, 0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {isPending ? "Applying…" : "Apply extra →"}
            </button>
            {error && (
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 13,
                  color: "var(--neg)",
                }}
              >
                {error}
              </span>
            )}
            {paidOff && (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--ok)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                [OK] Paid off
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          gap: 20,
          paddingTop: 16,
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <Link
          href={`/debts/${debt.id}/edit`}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          // Edit
        </Link>
        <span
          aria-hidden
          style={{
            color: "var(--ink-5)",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          ·
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          // Delete (from settings)
        </span>
      </div>
    </div>
  );
}

/**
 * UtilizationPanel — replaces the payoff trajectory sparkline for
 * credit-card debts (Cluster 7.48). Shows the credit-limit gauge
 * that visualizes "how much of your available credit are you
 * using" — a credit-health metric distinct from paid-down.
 *
 * Color thresholds (credit-score convention):
 *   < 30%      → ok    (good)
 *   30 – 80%   → warn  (caution)
 *   ≥ 80%      → neg   (high — hurts credit score)
 *
 * Layout: a big "% used" headline + a 3-zone gauge bar + the
 * balance / limit / available triple underneath. No flat line —
 * the gauge carries the visual weight.
 */
function UtilizationPanel({
  balanceCents,
  creditLimitCents,
}: {
  balanceCents: number;
  creditLimitCents: number;
}) {
  const utilPct = Math.min(
    100,
    Math.max(0, (balanceCents / creditLimitCents) * 100),
  );
  const utilColor =
    utilPct < 30 ? "var(--ok)" : utilPct < 80 ? "var(--warn)" : "var(--neg)";
  const availableCents = Math.max(0, creditLimitCents - balanceCents);

  return (
    <div
      data-testid="debt-utilization-panel"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        padding: "18px 22px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> Utilization
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 32,
            fontWeight: 700,
            color: utilColor,
            lineHeight: 1,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
          }}
        >
          {Math.round(utilPct)}%
        </div>
      </div>

      {/* Rainbow gauge bar (Cluster 7.49) — green/yellow/red
          gradient background with a vertical marker at the current
          utilization position. Replaces 7.48's zone-based fill +
          threshold markers; the gradient itself communicates
          severity, so only one marker is needed. */}
      <div
        style={{
          position: "relative",
          height: 12,
          border: "1px solid var(--line-soft)",
          borderRadius: 2,
          overflow: "visible",
          background:
            "linear-gradient(90deg, var(--ok) 0%, var(--ok) 30%, var(--warn) 50%, var(--neg) 80%, var(--neg) 100%)",
        }}
      >
        {/* Vertical marker at current utilization position. */}
        <div
          style={{
            position: "absolute",
            top: -4,
            bottom: -4,
            left: `${utilPct}%`,
            width: 2,
            background: "var(--ink)",
            boxShadow: "0 0 6px var(--ink)",
            transform: "translateX(-1px)",
          }}
        />
      </div>

      {/* Triple: balance / limit / available */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink-4)" }}>//</span> Balance{" "}
          <b style={{ color: "var(--ink)" }}>{formatMoney(balanceCents)}</b>
        </div>
        <div style={{ color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink-4)" }}>//</span> Limit{" "}
          <b style={{ color: "var(--ink)" }}>{formatMoney(creditLimitCents)}</b>
        </div>
        <div style={{ color: utilColor }}>
          <span style={{ color: "var(--ink-4)" }}>//</span> Available{" "}
          <b>{formatMoney(availableCents)}</b>
        </div>
      </div>
    </div>
  );
}

/**
 * PayoffCurve — real declining balance trajectory (Cluster 7.49).
 *
 * Replaces the prior flat `<DebtSparkline>` (removed in 7.48).
 * Renders an SVG line chart that actually draws the projected
 * balance over time, with Y-axis labels for balance values and
 * X-axis labels for month milestones. Reacts to slider state
 * via the `extraMonthlyCents` prop so mom sees the curve flatten
 * when she adds more.
 *
 * The trajectory is computed locally — same math as
 * `payoffProjection` (monthly interest accrual + min + extra →
 * balance shrinks), but exposes the per-month balance points so
 * the SVG can plot them.
 */
function PayoffCurve({
  debt,
  extraMonthlyCents,
  anchor,
  tierColor,
}: {
  debt: Debt;
  extraMonthlyCents: number;
  anchor: Date;
  tierColor: string;
}) {
  const W = 360;
  const H = 110;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;

  // Cluster 7.50 — the SVG uses viewBox + 100% so it scales down
  // on narrow viewports without overflow. Max width caps the
  // desktop size at 360px.
  const svgStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    maxWidth: 360,
    height: "auto",
  };

  // Compute balance at each month (Cluster 7.49). Cap at 360
  // months (30 years) to avoid infinite loops on unpayable.
  const trajectory = React.useMemo(() => {
    const r = debt.aprBps / 120000;
    const payment = debt.minPaymentCents + extraMonthlyCents;
    const points: Array<{ month: number; balanceCents: number }> = [];
    let balance = debt.balanceCents;
    points.push({ month: 0, balanceCents: balance });
    if (payment <= 0) return points;
    for (let m = 1; m <= 360; m++) {
      if (balance <= 0) break;
      const interest = balance * r;
      const principal = payment - interest;
      if (principal <= 0) {
        // Payment doesn't cover interest — unpayable. Stop the
        // trajectory here; the curve will be flat at the top.
        break;
      }
      balance = Math.max(0, balance - principal);
      points.push({ month: m, balanceCents: balance });
      if (balance <= 0) break;
    }
    return points;
  }, [debt, extraMonthlyCents]);

  const maxMonth = trajectory[trajectory.length - 1]?.month ?? 1;
  const maxBalance = trajectory[0]?.balanceCents ?? 1;
  const finalBalance = trajectory[trajectory.length - 1]?.balanceCents ?? 0;

  // Map (month, balance) to SVG coordinates
  const xOf = (m: number) =>
    PAD_L + (m / Math.max(1, maxMonth)) * (W - PAD_L - PAD_R);
  const yOf = (b: number) =>
    PAD_T + (b / Math.max(1, maxBalance)) * (H - PAD_T - PAD_B);

  // Build the path string
  const pathData = trajectory
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.month).toFixed(1)} ${yOf(p.balanceCents).toFixed(1)}`)
    .join(" ");

  // Y-axis tick values (4 evenly-spaced balance labels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    pct: p,
    cents: maxBalance * p,
    y: yOf(maxBalance * p),
  }));
  // X-axis tick values (start, quarter, halfway, three-quarter, end)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    pct: p,
    month: Math.round(maxMonth * p),
    x: xOf(maxMonth * p),
  }));

  const isUnpayable =
    finalBalance > 0 && maxMonth >= 360 && extraMonthlyCents === 0;

  return (
    <div
      data-testid="debt-payoff-curve"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        padding: "16px 20px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          <span style={{ color: "var(--ink-4)" }}>//</span> Payoff trajectory
        </span>
        <span
          style={{
            color: isUnpayable ? "var(--neg)" : "var(--ink-2)",
            letterSpacing: "0.04em",
            textTransform: "none",
            fontSize: 10,
          }}
        >
          {isUnpayable
            ? "[WARN] Min payment doesn't cover interest"
            : extraMonthlyCents > 0
            ? `~${maxMonth}mo with $${(extraMonthlyCents / 100).toFixed(0)}/mo extra`
            : `~${maxMonth}mo at min`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
        data-testid="payoff-curve-svg"
      >
        {/* Y-axis grid lines + tick labels */}
        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={t.y}
              y2={t.y}
              stroke="var(--line-soft)"
              strokeWidth={0.5}
              strokeDasharray={i === 0 ? "0" : "2 3"}
            />
            <text
              x={PAD_L - 6}
              y={t.y + 3}
              fontFamily="var(--font-jetbrains), monospace"
              fontSize={8}
              fill="var(--ink-3)"
              textAnchor="end"
            >
              {t.cents === 0 ? "$0" : formatMoney(Math.round(t.cents))}
            </text>
          </g>
        ))}

        {/* X-axis tick labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x-${i}`}
            x={t.x}
            y={H - 6}
            fontFamily="var(--font-jetbrains), monospace"
            fontSize={8}
            fill="var(--ink-3)"
            textAnchor="middle"
          >
            {t.month === 0 ? "now" : `${t.month}mo`}
          </text>
        ))}

        {/* The actual declining curve */}
        <path
          d={pathData}
          stroke={tierColor}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 4px ${tierColor})`,
          }}
        />

        {/* Endpoint marker — a dot at (maxMonth, finalBalance) */}
        {trajectory.length > 1 && (
          <circle
            cx={xOf(maxMonth)}
            cy={yOf(finalBalance)}
            r={3}
            fill={tierColor}
            style={{
              filter: `drop-shadow(0 0 4px ${tierColor})`,
            }}
          />
        )}
      </svg>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  accent: "ink" | "ink-2" | "ink-3" | "saturn" | "ok" | "neg" | "warn";
  highlight?: boolean;
}) {
  const color =
    accent === "saturn"
      ? "var(--saturn)"
      : accent === "ok"
      ? "var(--ok)"
      : accent === "neg"
      ? "var(--neg)"
      : accent === "warn"
      ? "var(--warn)"
      : accent === "ink-2"
      ? "var(--ink-2)"
      : accent === "ink-3"
      ? "var(--ink-3)"
      : "var(--ink)";
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${
          highlight ? color : "var(--line-soft)"
        }`,
        borderRadius: 3,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 18,
          fontWeight: 600,
          color,
          lineHeight: 1.05,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
    </div>
  );
}