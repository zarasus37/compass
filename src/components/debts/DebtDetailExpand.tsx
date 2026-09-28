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
import { DebtSparkline } from "@/components/viz/DebtSparkline";

export interface DebtDetailExpandProps {
  debt: Debt;
  /** Linked account (institution + last-4 + type). Optional. */
  account?: DebtCardAccount | null;
  anchor?: Date;
}

export function DebtDetailExpand({ debt, account, anchor }: DebtDetailExpandProps) {
  const a = anchor ?? new Date();
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
          gridTemplateColumns: "repeat(4, 1fr)",
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

      {/* Payoff sparkline */}
      <div
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
              color: isUnpayableAtMin ? "var(--neg)" : "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "none",
              fontSize: 10,
            }}
          >
            {isPaidOff
              ? "[OK] Paid off"
              : isUnpayableAtMin
              ? "[WARN] Min payment doesn't cover interest"
              : `~${monthsAtMin}mo at min`}
          </span>
        </div>
        {isPaidOff ? (
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ok)",
              padding: "12px 0",
            }}
          >
            ☉ Paid off — nothing left to project.
          </div>
        ) : (
          <DebtSparkline
            planet="saturn"
            balanceCents={debt.balanceCents}
            originalBalanceCents={debt.originalBalanceCents}
            aprBps={debt.aprBps}
            minPaymentCents={debt.minPaymentCents}
            anchor={a}
            width={320}
            height={42}
          />
        )}
      </div>

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