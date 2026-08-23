/**
 * NetTrajectoryCard — Growth Trend Curve (historical line graph).
 *
 * Plots projected net worth at the current pace, month-by-month over
 * the next 12 months. Shaded area beneath the curve highlights the
 * compounding. A dashed reference line at the user's emergency-fund
 * target.
 *
 * Per the must-have visualizations list:
 *   "A clean line graph comparing variable time horizons. Shaded
 *    areas beneath the curve highlight positive net worth compounding
 *    over time."
 *
 * Component Oracle Terminal treatment: cyan gradient line, gold
 * reference line, mono big number for current value, mono caption.
 */

import * as React from "react";
import { formatMoneyCompact } from "@/lib/money";

export interface NetTrajectoryCardData {
  /** Net worth today (cents). */
  currentCents: number;
  /** Per-month net (cents), excluding one-time anomalies. */
  monthlyDeltaCents: number;
  /** Emergency fund target (cents) — shown as the reference line. */
  emergencyTargetCents: number;
  /** Month labels for the 12 months projected (oldest first). */
  monthLabels: string[];
}

export function NetTrajectoryCard({ data }: { data: NetTrajectoryCardData }) {
  const months = 12;
  // Project month by month. Use a stable sim: each month adds monthlyDelta.
  const points: number[] = [];
  for (let i = 0; i < months; i += 1) {
    points.push(data.currentCents + data.monthlyDeltaCents * i);
  }
  const max = Math.max(...points, data.emergencyTargetCents);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 380;
  const h = 140;
  const padX = 4;
  const padY = 8;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const toX = (i: number) => padX + (i / (months - 1)) * innerW;
  const toY = (v: number) => padY + (1 - (v - min) / range) * innerH;

  const linePath = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
    .join(" ");
  const areaPath = `${linePath} L ${toX(months - 1)} ${padY + innerH} L ${toX(0)} ${padY + innerH} Z`;

  const emergencyY = toY(data.emergencyTargetCents);
  const lastPoint = points[points.length - 1] ?? data.currentCents;
  const currentX = toX(0);
  const currentY = toY(data.currentCents);
  const futureX = toX(months - 1);
  const futureY = toY(lastPoint);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> now
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              color: "var(--terminal-cyan)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {formatMoneyCompact(data.currentCents)}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          <span style={{ color: "var(--ok)" }}>↗</span> +{formatMoneyCompact(data.monthlyDeltaCents)}/mo
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> 12mo
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              color: "var(--jupiter)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {formatMoneyCompact(lastPoint)}
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <defs>
          <linearGradient id="nt-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--terminal-cyan)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--terminal-cyan)" />
          </linearGradient>
          <linearGradient id="nt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--terminal-cyan)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--terminal-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={w - padX}
            y1={padY + innerH * p}
            y2={padY + innerH * p}
            stroke="var(--line-soft)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
        ))}
        {/* emergency fund reference line */}
        <line
          x1={padX}
          x2={w - padX}
          y1={emergencyY}
          y2={emergencyY}
          stroke="var(--gold)"
          strokeWidth="0.6"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text
          x={w - padX - 2}
          y={emergencyY - 3}
          textAnchor="end"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize="6.5"
          fill="var(--gold)"
          letterSpacing="1"
          fontWeight={600}
        >
          EMERGENCY · {formatMoneyCompact(data.emergencyTargetCents)}
        </text>
        {/* area fill */}
        <path d={areaPath} fill="url(#nt-fill)" />
        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#nt-grad)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* now dot */}
        <circle cx={currentX} cy={currentY} r="3" fill="var(--terminal-cyan)" />
        <circle cx={currentX} cy={currentY} r="5" fill="none" stroke="var(--terminal-cyan)" strokeWidth="0.5" opacity="0.5" />
        {/* 12mo dot */}
        <circle cx={futureX} cy={futureY} r="3" fill="var(--jupiter)" />
        <circle cx={futureX} cy={futureY} r="5" fill="none" stroke="var(--jupiter)" strokeWidth="0.5" opacity="0.5" />
        {/* month labels (sparse) */}
        {[0, 3, 6, 9, 11].map((i) => (
          <text
            key={i}
            x={toX(i)}
            y={h - 1}
            textAnchor={i === 11 ? "end" : i === 0 ? "start" : "middle"}
            fontFamily="var(--font-jetbrains), monospace"
            fontSize="6"
            fill="var(--ink-4)"
            letterSpacing="0.5"
          >
            {data.monthLabels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
}
