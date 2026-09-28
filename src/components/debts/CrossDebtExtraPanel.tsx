"use client";

/**
 * CrossDebtExtraPanel — Cluster 7.51.
 *
 * Cross-debt "where to put extra" math, brought from the
 * dashboard's Pay My Next Check card to `/debts`. Renders above
 * the existing 7.47 `[WARN]` page banner.
 *
 * Method toggle: SNOWBALL (smallest balance first) vs
 * AVALANCHE (highest APR first). Default: AVALANCHE.
 *
 * Extra slider: $0–$500/mo. Default: $0.
 *
 * Output:
 *   - Total interest saved vs baseline (slider = 0)
 *   - Total months to debt-free
 *   - Payoff order — debts ranked by monthsToPayoff (ascending)
 *
 * Uses the existing `payoffProjection` helper for both baseline
 * and slider-value projections. React.useMemo caches both calls.
 *
 * Empty state: when `activeCount === 0` (all debts paid off),
 * the panel renders nothing — the existing 7.47 `[OK]` banner
 * handles that case.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { Debt } from "@/lib/store";
import { payoffProjection } from "@/lib/payoff-projection";

type Method = "snowball" | "avalanche";

export interface CrossDebtExtraPanelProps {
  debts: Debt[];
  anchor?: Date;
}

export function CrossDebtExtraPanel({
  debts,
  anchor,
}: CrossDebtExtraPanelProps) {
  const a = anchor ?? new Date();
  const [method, setMethod] = useState<Method>("avalanche");
  const [extraDollars, setExtraDollars] = useState(0);

  // Active = non-paid-off debts. The cross-debt view only makes
  // sense when there are ≥2 active debts (single-debt is just the
  // per-debt simulator). For 0 or 1 active, render nothing.
  const active = useMemo(
    () => debts.filter((d) => d.balanceCents > 0),
    [debts],
  );
  const activeCount = active.length;
  const hasMultiple = activeCount >= 2;

  // Baseline (slider = 0) + with-extra projections. Both run
  // React.useMemo so slider drags don't recompute when method is
  // unchanged.
  const baseline = useMemo(
    () => payoffProjection(active, method, 0, a),
    [active, method, a],
  );
  const withExtra = useMemo(
    () =>
      payoffProjection(
        active,
        method,
        Math.max(0, Math.round(extraDollars * 100)),
        a,
      ),
    [active, method, extraDollars, a],
  );

  // Savings + debt-free totals
  const savedCents = Math.max(0, baseline.totalInterestCents - withExtra.totalInterestCents);
  const totalMonths = withExtra.totalMonths;

  // Payoff order: sort perDebt.perDebt by monthsToPayoff ascending
  const payoffOrder = [...withExtra.perDebt].sort(
    (x, y) => x.monthsToPayoff - y.monthsToPayoff,
  );

  if (!hasMultiple) return null;

  return (
    <div
      data-testid="cross-debt-extra-panel"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "18px 22px",
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--saturn)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> Cross-debt extra
      </div>

      {/* Method toggle */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <MethodPill
          label="SNOWBALL"
          active={method === "snowball"}
          onClick={() => setMethod("snowball")}
          hint="smallest balance first"
        />
        <MethodPill
          label="AVALANCHE"
          active={method === "avalanche"}
          onClick={() => setMethod("avalanche")}
          hint="highest APR first"
        />
      </div>

      {/* Slider */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <label
          htmlFor="cross-debt-extra"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          If you add
        </label>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 22,
            color: "var(--gold-glow)",
            lineHeight: 1,
          }}
        >
          {formatMoney(Math.round(extraDollars * 100))}
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 12,
              color: "var(--ink-3)",
              marginLeft: 8,
            }}
          >
            / month
          </span>
        </div>
      </div>
      <input
        id="cross-debt-extra"
        type="range"
        min={0}
        max={500}
        step={5}
        value={extraDollars}
        onChange={(e) => setExtraDollars(Number(e.target.value))}
        data-testid="cross-debt-extra-slider"
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
          fontSize: 9.5,
          color: "var(--ink-4)",
          marginTop: 4,
        }}
      >
        <span>$0</span>
        <span>$500</span>
      </div>

      {/* Outcome — savings + debt-free total */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 16,
          marginBottom: 16,
          padding: "12px 0",
          borderTop: "1px solid var(--line-soft)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Saves you
          </div>
          <div
            data-testid="cross-debt-savings"
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 22,
              fontWeight: 600,
              color: extraDollars > 0 && savedCents > 0 ? "var(--ok)" : "var(--ink-2)",
              lineHeight: 1.1,
            }}
          >
            {extraDollars > 0
              ? formatMoney(savedCents)
              : "$0.00"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-4)",
              letterSpacing: "0.04em",
              marginTop: 2,
            }}
          >
            {extraDollars > 0 ? "vs pay only minimum" : "— pay only minimums"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Debt-free in
          </div>
          <div
            data-testid="cross-debt-total-months"
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            {totalMonths > 0 ? `${totalMonths}mo` : "—"}
          </div>
        </div>
      </div>

      {/* Payoff order */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> Payoff order
      </div>
      <ol
        data-testid="cross-debt-payoff-order"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {payoffOrder.map((row, idx) => (
          <li
            key={row.debtId}
            data-testid={`cross-debt-row-${row.debtId}`}
            style={{
              display: "grid",
              gridTemplateColumns: "20px minmax(0, 1.4fr) 100px 100px",
              alignItems: "baseline",
              gap: 8,
              padding: "6px 0",
              borderBottom:
                idx < payoffOrder.length - 1
                  ? "1px dashed var(--line-soft)"
                  : "none",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
            }}
          >
            <span style={{ color: "var(--ink-3)" }}>{idx + 1}.</span>
            <span
              style={{
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.debtName}
            </span>
            <span
              style={{
                color: "var(--ink-2)",
                fontFeatureSettings: '"tnum" 1',
                textAlign: "right",
              }}
            >
              {formatMoney(row.startingBalanceCents)}
            </span>
            <span
              style={{
                color: "var(--saturn)",
                fontWeight: 600,
                textAlign: "right",
              }}
            >
              {row.monthsToPayoff > 0
                ? `at month ${row.monthsToPayoff}`
                : "[OK] paid"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MethodPill({
  label,
  active,
  onClick,
  hint,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`cross-debt-method-${label.toLowerCase()}`}
      data-active={active}
      title={hint}
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        padding: "8px 14px",
        background: active ? "var(--saturn)" : "transparent",
        color: active ? "var(--void)" : "var(--ink-2)",
        border: `1px solid ${active ? "var(--saturn)" : "var(--line)"}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "background 120ms, border-color 120ms, color 120ms",
      }}
    >
      {label}
    </button>
  );
}