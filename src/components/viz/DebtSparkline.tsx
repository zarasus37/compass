/**
 * DebtSparkline — tiny inline SVG showing one debt's projected
 * balance over time. Goes in each debt row on /debts so the
 * per-debt visual sits directly next to the per-debt data.
 *
 * Pure SVG (no Recharts) so it's cheap to render 3+ on a page.
 * The line falls from the starting balance toward $0. If the
 * debt can't pay off (min < interest), the line stays flat
 * with iron-red color.
 *
 * The y-axis is the balance in cents (linear scale based on
 * the starting balance — every row is its own scale, but each
 * row's "0" is the same horizontal line).
 */
import * as React from "react";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface DebtSparklineProps {
  planet: PlanetId;
  balanceCents: number;
  originalBalanceCents: number;
  aprBps: number;
  minPaymentCents: number;
  /** Anchor date (defaults to today). */
  anchor?: Date;
  /** Months to project. Default 24. */
  horizonMonths?: number;
  /** Paychecks per month (default 2 — biweekly). */
  paychecksPerMonth?: number;
  width?: number;
  height?: number;
}

export function DebtSparkline({
  planet,
  balanceCents,
  originalBalanceCents,
  aprBps,
  minPaymentCents,
  anchor,
  horizonMonths = 24,
  paychecksPerMonth = 2,
  width = 120,
  height = 32,
}: DebtSparklineProps) {
  const startBal = originalBalanceCents > 0 ? originalBalanceCents : balanceCents;
  if (startBal <= 0) {
    return null; // already paid off — show nothing
  }

  // Simulate balance month-by-month. Cascade excluded (this is the
  // single-debt "if I only paid the minimum, where would I be?"
  // view). For the portfolio view, see DebtPayoffSimulator.
  const monthlyRate = aprBps / 120000;
  const series: number[] = [balanceCents];
  let bal = balanceCents;
  for (let m = 1; m <= horizonMonths; m += 1) {
    const interest = Math.round(bal * monthlyRate);
    bal = bal + interest;
    if (minPaymentCents > 0) {
      bal = Math.max(0, bal - minPaymentCents);
    }
    series.push(bal);
    if (bal <= 0) break;
  }
  const isUnpayable =
    aprBps > 0 &&
    minPaymentCents > 0 &&
    minPaymentCents <= balanceCents * monthlyRate;
  const color = isUnpayable
    ? "var(--neg)"
    : PLANET_COLORS[planet];

  // Map (month, balance) → SVG. X: month 0..horizon. Y: 0 at
  // bottom, startBal at top. Pad 3px.
  const padX = 2;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const x = (m: number) =>
    padX + (m / horizonMonths) * innerW;
  const y = (b: number) => padY + (b / startBal) * innerH;

  const path = series
    .map((b, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(b).toFixed(1)}`)
    .join(" ");
  const endX = x(series.length - 1);
  const endY = y(series[series.length - 1] ?? 0);
  const startX = x(0);
  const startY = y(series[0] ?? 0);
  const reachedZero = (series[series.length - 1] ?? 0) <= 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        reachedZero
          ? `Pays off in ${series.length - 1} months at minimum`
          : isUnpayable
          ? "Minimum payment does not cover interest"
          : `Balance projection over ${horizonMonths} months`
      }
      style={{ display: "block" }}
    >
      {/* $0 reference (bottom line) */}
      <line
        x1={padX}
        x2={width - padX}
        y1={height - padY}
        y2={height - padY}
        stroke="var(--gold-deep)"
        strokeWidth={0.5}
        strokeDasharray="2 3"
        opacity={0.5}
      />
      {/* The trajectory line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isUnpayable ? 0.4 : 0.9}
      />
      {/* Start dot (now) */}
      <circle
        cx={startX}
        cy={startY}
        r={2}
        fill={color}
        opacity={0.95}
      />
      {/* End dot (projection at horizon) */}
      <circle
        cx={endX}
        cy={endY}
        r={reachedZero ? 2.5 : 2}
        fill={reachedZero ? "var(--ok)" : color}
        stroke={reachedZero ? "var(--ok)" : "none"}
        strokeWidth={reachedZero ? 1 : 0}
      />
    </svg>
  );
}
