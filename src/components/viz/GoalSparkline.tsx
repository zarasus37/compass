/**
 * GoalSparkline — tiny inline SVG showing one goal's projected
 * trajectory from "now" to the target. Sits inside each goal card,
 * directly next to the goal's data (name / progress / target date).
 *
 * Pure SVG (no Recharts) so it's cheap to render 5–10 of them on
 * a single page. The line color is the goal's planet; the dashed
 * line at the top is the 100% target. The y-axis is percent-of-
 * target so the shape is the same regardless of dollar amount.
 *
 * The endpoint is dotted — the user can read at a glance whether
 * the plan reaches the target in the visible horizon. If the line
 * is flat, the plan isn't moving the goal.
 */
import * as React from "react";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface GoalSparklineProps {
  // Cluster 5.2.6 widget switch: planet is PlanetId | null
  // (custom goals can have a null planet). When null, the line
  // uses neutral ink.
  planet: PlanetId | null;
  currentCents: number;
  targetCents: number;
  perPaycheckCents: number;
  /** Anchor date (defaults to today). */
  anchor?: Date;
  /** How many months to project forward. Default 18. */
  horizonMonths?: number;
  /** Paychecks per month (default 2 — biweekly). */
  paychecksPerMonth?: number;
  width?: number;
  height?: number;
}

export function GoalSparkline({
  planet,
  currentCents,
  targetCents,
  perPaycheckCents,
  anchor,
  horizonMonths = 18,
  paychecksPerMonth = 2,
  width = 120,
  height = 36,
}: GoalSparklineProps) {
  const startPct =
    targetCents > 0
      ? Math.max(0, Math.min(100, (currentCents / targetCents) * 100))
      : 0;

  // Build the series of percent-of-target values from 0..horizon.
  const series: number[] = [];
  for (let m = 0; m <= horizonMonths; m += 1) {
    if (targetCents <= 0) {
      series.push(0);
      continue;
    }
    const added = perPaycheckCents * paychecksPerMonth * m;
    const projected = Math.min(targetCents, currentCents + added);
    const pct = (projected / targetCents) * 100;
    series.push(Math.max(0, Math.min(100, pct)));
  }

  // Map (month, pct) to SVG coords. X: month 0 → 0, month horizon → width.
  // Y: pct 0 → height (bottom), pct 100 → 0 (top). Inset by 2px.
  const padX = 2;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const x = (m: number) => padX + (m / horizonMonths) * innerW;
  const y = (pct: number) => padY + (1 - pct / 100) * innerH;

  const path = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
    .join(" ");

  const endX = x(horizonMonths);
  const endY = y(series[horizonMonths] ?? 0);
  const startX = x(0);
  const startY = y(startPct);
  const isFlat = perPaycheckCents <= 0 || currentCents >= targetCents;
  const reached = currentCents >= targetCents;
  const color = reached ? "var(--ok)" : planet ? PLANET_COLORS[planet] : "var(--ink-3)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${reached ? "Goal reached" : isFlat ? "Plan not moving" : `Projection to ${Math.round(series[horizonMonths] ?? 0)}% of target`}`}
      style={{ display: "block" }}
    >
      {/* 100% target reference (top dashed line) */}
      <line
        x1={padX}
        x2={width - padX}
        y1={y(100)}
        y2={y(100)}
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
        opacity={isFlat ? 0.35 : 0.9}
      />
      {/* Start dot (now) */}
      <circle
        cx={startX}
        cy={startY}
        r={2}
        fill={color}
        opacity={0.9}
      />
      {/* End dot (projection at horizon) */}
      <circle
        cx={endX}
        cy={endY}
        r={2.5}
        fill={reached ? "var(--ok)" : "var(--gold)"}
        stroke={color}
        strokeWidth={1}
      />
    </svg>
  );
}
