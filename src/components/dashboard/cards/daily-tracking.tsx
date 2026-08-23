/**
 * DailyTrackingCard — the top-fold "Safe-Spend" + today's pace card.
 *
 * Surfaces the three numbers a user wants to see first thing:
 *  - SAFE TO SPEND: the unallocated cents from Plan My Next Check.
 *  - TODAY: cents logged today with the pace label (under / on / above).
 *  - WEEKLY HEALTH: the 7-day rolling average + a 7-day sparkline
 *    showing the daily shape. The line tells the story the average
 *    hides — a flat line = steady, a midweek spike = one big charge,
 *    a falling line = slowing down.
 *
 * Tap-through → /transactions, where the full record lives.
 */

import * as React from "react";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { TODAY } from "@/lib/mock";
import type { PaycheckBreakdown } from "@/lib/store";

export interface DailyTrackingCardData {
  safeToSpendCents: number;
  todaySpentCents: number;
  weeklyAvgPerDayCents: number;
  /** 7-element array of cents per day, oldest first. */
  dailySpendCents: number[];
  last7Days: Date[];
  periodStart: Date;
  periodEnd: Date;
  breakdown: PaycheckBreakdown;
}

export function DailyTrackingCard({ data }: { data: DailyTrackingCardData }) {
  const {
    safeToSpendCents,
    todaySpentCents,
    weeklyAvgPerDayCents,
    dailySpendCents,
    breakdown,
  } = data;

  // Spend pressure: today's spend vs. expected daily budget.
  const periodLen = Math.max(
    1,
    Math.round(
      (data.periodEnd.getTime() - data.periodStart.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const expectedDailyCents = Math.round(
    (breakdown.spendingCents + breakdown.unallocatedCents) / periodLen,
  );
  const pace = expectedDailyCents > 0 ? todaySpentCents / expectedDailyCents : 0;
  const paceLabel =
    pace === 0
      ? "calm"
      : pace < 0.5
      ? "well under"
      : pace < 1
      ? "under"
      : pace < 1.5
      ? "on pace"
      : pace < 2
      ? "above"
      : "well above";
  const paceAccent =
    pace < 1
      ? "var(--ok)"
      : pace < 1.5
      ? "var(--warn)"
      : "var(--neg)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr",
        gap: 0,
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        overflow: "hidden",
        background: "var(--cosmos-2)",
      }}
    >
      {/* SAFE TO SPEND — the headline */}
      <Cell
        eyebrow="Safe to spend"
        align="left"
        accent={safeToSpendCents < 0 ? "var(--neg)" : "var(--ink)"}
        main={
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 40,
              lineHeight: 1,
              color: safeToSpendCents < 0 ? "var(--neg)" : "var(--gold-glow)",
              fontFeatureSettings: '"tnum" 1',
              letterSpacing: "0.005em",
            }}
          >
            {formatMoney(safeToSpendCents)}
          </span>
        }
        sub={
          <span style={{ color: "var(--ink-3)" }}>
            {safeToSpendCents < 0
              ? "over the line — pull back"
              : "after bills, debt, savings"}
          </span>
        }
      />

      {/* TODAY'S PACE — number, pace label moves to the sub line */}
      <Cell
        eyebrow="Today"
        borderLeft
        align="left"
        accent="var(--ink)"
        main={
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              lineHeight: 1,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoneySigned(todaySpentCents)}
          </span>
        }
        sub={
          <span style={{ color: paceAccent }}>
            {paceLabel}
            {expectedDailyCents > 0 ? (
              <span style={{ color: "var(--ink-3)" }}>
                {" "}
                · of ~{formatMoney(expectedDailyCents)}
              </span>
            ) : null}
          </span>
        }
      />

      {/* WEEKLY HEALTH — number + 7-day sparkline */}
      <Cell
        eyebrow="Weekly health"
        borderLeft
        align="left"
        accent="var(--ink)"
        main={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ flex: "0 0 auto", minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 18,
                  lineHeight: 1,
                  color: "var(--ink)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                {formatMoney(weeklyAvgPerDayCents)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginLeft: 3,
                }}
              >
                / day
              </span>
            </div>
            <div
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <WeekSparkline
                dailyCents={dailySpendCents}
                averageCents={weeklyAvgPerDayCents}
                todayIdx={dailySpendCents.length - 1}
                todayAccent={paceAccent}
              />
            </div>
          </div>
        }
        sub={
          <span style={{ color: "var(--ink-3)" }}>7-day shape</span>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7-day sparkline — pure SVG, fits inside the Weekly Health cell.
// Y axis: cents. Today is the rightmost column, with a gold dot +
// the pace-accent line through it. Dashed horizontal line = average.
// ---------------------------------------------------------------------------

function WeekSparkline({
  dailyCents,
  averageCents,
  todayIdx,
  todayAccent,
}: {
  dailyCents: number[];
  averageCents: number;
  todayIdx: number;
  todayAccent: string;
}) {
  const W = 110;
  const H = 28;
  const padX = 3;
  const padY = 4;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const max = Math.max(1, ...dailyCents, averageCents);
  const yMax = max * 1.15; // small headroom

  const x = (i: number) => padX + (i / Math.max(1, dailyCents.length - 1)) * innerW;
  const y = (v: number) => padY + (1 - v / yMax) * innerH;

  const path = dailyCents
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  // Spike detection: any day ≥ 2× the average gets a small gold ring
  const spikes = dailyCents
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v >= averageCents * 2 && v > 0);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="7-day spending shape"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Average dashed line */}
      <line
        x1={padX}
        x2={W - padX}
        y1={y(averageCents)}
        y2={y(averageCents)}
        stroke="var(--ink-4)"
        strokeWidth={0.5}
        strokeDasharray="2 2"
        opacity={0.7}
      />
      {/* The line */}
      <path
        d={path}
        fill="none"
        stroke="var(--ink-2)"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* Today dot — colored by pace */}
      <circle
        cx={x(todayIdx)}
        cy={y(dailyCents[todayIdx] ?? 0)}
        r={2.5}
        fill={todayAccent}
        stroke="var(--cosmos-2)"
        strokeWidth={1}
      />
      {/* Spike rings */}
      {spikes.map(({ i }) => (
        <circle
          key={`s${i}`}
          cx={x(i)}
          cy={y(dailyCents[i] ?? 0)}
          r={3.5}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={0.8}
          opacity={0.7}
        />
      ))}
    </svg>
  );
}

function Cell({
  eyebrow,
  main,
  sub,
  borderLeft,
  align,
  accent,
}: {
  eyebrow: string;
  main: React.ReactNode;
  sub: React.ReactNode;
  borderLeft?: boolean;
  align?: "left" | "right";
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        borderLeft: borderLeft ? "1px solid var(--line-soft)" : undefined,
        textAlign: align ?? "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          fontWeight: 600,
          color: accent ?? "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ minWidth: 0 }}>{main}</div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 12.5,
          color: "var(--ink-3)",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
