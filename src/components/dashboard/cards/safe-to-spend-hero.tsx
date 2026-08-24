/**
 * SafeToSpendHero — the daily-telemetry anchor.
 *
 * Lifted ABOVE the spend ring (per the Front-End Architecture Layout
 * Rules) on 2026-08-23 so the cents-remaining-this-period number
 * is the very first thing the user sees. The companion card
 * `DailyTrackingCard` still lives in the dashboard grid for users
 * who want the compact 3-cell variant.
 *
 * Pushed further on 2026-08-23: the visual is now a single rich
 * SVG "burn curve" — the actual cumulative spend trajectory over
 * the period, overlaid with the expected linear pace (dashed gold),
 * the today marker, and a quantified gap annotation. The user can
 * see at a glance: "I've spent $X so far, expected was $Y, I'm
 * $Z under pace." That's the actionable insight — better than
 * any single number.
 *
 * Layout (top-to-bottom):
 *   1. Eyebrow row (`// DAILY TELEMETRY · SAFE TO SPEND`) + pace pill
 *   2. Headline: huge number + sub (left) | days-left & per-day (right)
 *   3. The burn curve — full-width SVG, 160px tall
 *   4. Bottom metrics row: today / 7-day avg / vs. pace gap
 *
 * Component Oracle Terminal treatment: mono caps eyebrows with //
 * prefix, big numbers in JetBrains Mono, body in Sora, status
 * markers [OK]/[WARN] in mono caps.
 */

import * as React from "react";
import { formatMoney, formatMoneySigned, formatMoneyCompact } from "@/lib/money";
import type { PaycheckBreakdown } from "@/lib/store";

export interface SafeToSpendHeroData {
  safeToSpendCents: number;
  todaySpentCents: number;
  weeklyAvgPerDayCents: number;
  /** 7-element array of cents per day, oldest first. */
  dailySpendCents: number[];
  last7Days: Date[];
  periodStart: Date;
  periodEnd: Date;
  /** 1-based day-of-period. 1 = first day, totalDays = last day. */
  day: number;
  totalDays: number;
  breakdown: PaycheckBreakdown;
}

export function SafeToSpendHero({ data }: { data: SafeToSpendHeroData }) {
  const {
    safeToSpendCents,
    todaySpentCents,
    weeklyAvgPerDayCents,
    dailySpendCents,
    periodStart,
    periodEnd,
    day,
    totalDays,
    breakdown,
  } = data;

  const daysLeft = Math.max(0, totalDays - day);
  const perDayCents =
    daysLeft > 0 ? Math.round(safeToSpendCents / daysLeft) : 0;

  // Expected daily budget for the WHOLE period (incl. already-spent).
  const expectedDailyCents = Math.max(
    1,
    Math.round(
      (breakdown.spendingCents + breakdown.unallocatedCents) /
        Math.max(1, totalDays),
    ),
  );
  const expectedTotalCents = expectedDailyCents * totalDays;

  // Actual cumulative spend over the last 7 days. The "x" is the day-of-period.
  // The "y" is the cumulative cents. Today is the rightmost point.
  let actualCum = 0;
  const actualPoints = dailySpendCents.map((c, i) => {
    const d = day - (dailySpendCents.length - 1 - i);
    actualCum += c;
    return { x: d, y: actualCum };
  });
  const actualYToday = actualCum;
  const expectedYToday = expectedDailyCents * day;
  // Positive = under pace (good), negative = over pace (warn).
  const gapCents = expectedYToday - actualYToday;
  const underPace = gapCents >= 0;

  // Pace label (legacy, kept for the eyebrow pill — distinct from "vs. pace").
  const pace = expectedDailyCents > 0 ? todaySpentCents / expectedDailyCents : 0;
  const paceLabel =
    pace === 0
      ? "[OK] calm"
      : pace < 0.5
        ? "[OK] well under"
        : pace < 1
          ? "[OK] under"
          : pace < 1.5
            ? "[OK] on pace"
            : pace < 2
              ? "[WARN] above"
              : "[WARN] well above";
  const paceAccent = pace < 1.5 ? "var(--ok)" : "var(--warn)";

  // Safe-to-spend accent: cyan when positive, neg when over the line.
  const safeAccent =
    safeToSpendCents < 0 ? "var(--neg)" : "var(--terminal-cyan)";

  // Tight threshold: when per-day budget < 70% of expected daily.
  const tight = perDayCents < expectedDailyCents * 0.7;
  const barAccent = tight ? "var(--warn)" : "var(--terminal-cyan)";

  return (
    <section
      aria-label="Daily telemetry — safe to spend"
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderLeft: `2px solid ${barAccent}`,
        borderRadius: 4,
        padding: "24px 28px 22px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Eyebrow row — mono caps left, status pill right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--ok)",
              boxShadow: "0 0 6px var(--ok)",
            }}
          />
          // DAILY TELEMETRY · SAFE TO SPEND
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: paceAccent,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {paceLabel}
        </div>
      </div>

      {/* Headline row: number + sub (left) | days-left & per-day (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 60,
              lineHeight: 0.95,
              color: safeAccent,
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 700,
              letterSpacing: "-0.025em",
              marginBottom: 8,
            }}
          >
            {formatMoney(safeToSpendCents)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.45,
            }}
          >
            {safeToSpendCents < 0
              ? "Over the line — pull back."
              : "After bills, debt, and savings."}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            paddingLeft: 20,
            borderLeft: "1px solid var(--line-soft)",
          }}
        >
          <Metric
            label="days left"
            value={`${daysLeft}`}
            sub={daysLeft === 1 ? "day" : "days"}
          />
          <Metric
            label="per day"
            value={formatMoneyCompact(perDayCents)}
            sub="to last"
            accent={tight ? "var(--warn)" : "var(--ok)"}
          />
        </div>
      </div>

      {/* The burn curve — full-width SVG, the visual centerpiece */}
      <BurnCurve
        actualPoints={actualPoints}
        day={day}
        totalDays={totalDays}
        actualYToday={actualYToday}
        expectedYToday={expectedYToday}
        expectedYTotal={expectedTotalCents}
        gapCents={gapCents}
        underPace={underPace}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />

      {/* Bottom metrics row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <Metric
          label="today"
          value={formatMoneySigned(todaySpentCents)}
          sub={`of ~${formatMoneyCompact(expectedDailyCents)}`}
        />
        <Metric
          label="7-day avg"
          value={formatMoneyCompact(weeklyAvgPerDayCents)}
          sub="per day"
          borderLeft
        />
        <Metric
          label="vs. pace"
          value={
            underPace
              ? `−${formatMoneyCompact(gapCents)}`
              : `+${formatMoneyCompact(-gapCents)}`
          }
          sub={underPace ? "under" : "over"}
          accent={underPace ? "var(--ok)" : "var(--warn)"}
          borderLeft
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// BurnCurve — the centerpiece SVG.
//
// X-axis: days of the period (0 = start, totalDays = EOP)
// Y-axis: cumulative cents spent (0 to expectedTotal * 1.1)
//
// Two lines:
//   - Dashed gold: expected linear pace (0,0) → (totalDays, expectedTotal)
//   - Solid teal-cyan (or warn-amber when over pace): actual cumulative
//     spend, drawn from day (day-6) through today with a glow filter
//
// Today: vertical gold dashed line + two markers:
//   - Hollow gold circle: expected cumulative by today
//   - Solid teal/warn circle: actual cumulative by today
// A short connector line between them, with the gap labeled.
//
// The filled area under the actual line is a vertical gradient
// (teal/warn at top → transparent at bottom).
// ---------------------------------------------------------------------------

function BurnCurve({
  actualPoints,
  day,
  totalDays,
  actualYToday,
  expectedYToday,
  expectedYTotal,
  gapCents,
  underPace,
  periodStart,
  periodEnd,
}: {
  actualPoints: { x: number; y: number }[];
  day: number;
  totalDays: number;
  actualYToday: number;
  expectedYToday: number;
  expectedYTotal: number;
  gapCents: number;
  underPace: boolean;
  periodStart: Date;
  periodEnd: Date;
}) {
  // ViewBox dimensions — viewBox + width 100% so the curve scales
  // to fit the panel.
  const VBW = 800;
  const VBH = 180;
  const padL = 32;
  const padR = 80; // extra right space for the gap label
  const padT = 28;
  const padB = 30;
  const innerW = VBW - padL - padR;
  const innerH = VBH - padT - padB;

  // Y-scale: max of expectedTotal and actualToday * 1.1, with a
  // small headroom. Floor at 1 to avoid divide-by-zero.
  const yDomainMax = Math.max(expectedYTotal, actualYToday, 1) * 1.15;

  const xScale = (x: number) =>
    padL + (x / Math.max(1, totalDays)) * innerW;
  const yScale = (y: number) => VBH - padB - (y / yDomainMax) * innerH;

  // Build the actual line path. If we have only 1 point (e.g. day 1),
  // just plot the dot — no line.
  const actualPath =
    actualPoints.length >= 2
      ? "M" +
        actualPoints
          .map((p) => `${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`)
          .join(" L")
      : "";
  const firstPt = actualPoints.length >= 2 ? actualPoints[0]! : null;
  const lastPt =
    actualPoints.length >= 2 ? actualPoints[actualPoints.length - 1]! : null;
  const baseY = VBH - padB;
  const areaPath =
    firstPt && lastPt
      ? `${actualPath} L${xScale(lastPt.x).toFixed(1)},${baseY.toFixed(1)} L${xScale(firstPt.x).toFixed(1)},${baseY.toFixed(1)} Z`
      : "";

  // Expected line (full period, from 0 to totalDays).
  const expectedPath = `M${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(totalDays).toFixed(1)},${yScale(expectedYTotal).toFixed(1)}`;

  // Today geometry
  const todayX = xScale(day);
  const todayYActual = yScale(actualYToday);
  const todayYExpected = yScale(expectedYToday);

  // Color the actual line + dots based on pace
  const lineColor = underPace ? "var(--terminal-cyan)" : "var(--warn)";
  const dotColor = underPace ? "var(--terminal-cyan)" : "var(--warn)";

  // Gap label
  const gapAbs = Math.abs(gapCents);
  const gapLabel = (underPace ? "−" : "+") + formatMoneyCompact(gapAbs);
  const gapColor = underPace ? "var(--ok)" : "var(--warn)";

  // Position the gap label to the right of the today markers, mid-gap.
  const gapMidY = (todayYActual + todayYExpected) / 2;
  const gapLabelX = todayX + 14;
  const gapLabelY = gapMidY + 4; // small visual nudge for text baseline

  // Connector between expected and actual markers (vertical hairline)
  const connX = todayX + 8;

  // Filter ids (need to be unique if multiple instances on the page)
  const idSuffix = "burnCurve";
  const glowId = `burnCurveGlow-${idSuffix}`;
  const areaGradId = `burnAreaGrad-${idSuffix}`;

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      width="100%"
      height={VBH}
      preserveAspectRatio="none"
      role="img"
      aria-label="Cumulative spend vs. expected pace"
      style={{ display: "block" }}
    >
      <defs>
        <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle horizontal grid line at expectedTotal — the "full pace" line */}
      <line
        x1={padL}
        x2={VBW - padR}
        y1={yScale(expectedYTotal)}
        y2={yScale(expectedYTotal)}
        stroke="var(--ink-5)"
        strokeWidth={0.5}
        strokeDasharray="2 4"
        opacity={0.4}
      />
      <text
        x={VBW - padR}
        y={yScale(expectedYTotal) - 4}
        fontSize={8.5}
        fontWeight={600}
        fill="var(--ink-4)"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.18em"
        textAnchor="end"
      >
        EXPECTED · EOP
      </text>

      {/* Filled area under actual line */}
      {areaPath && <path d={areaPath} fill={`url(#${areaGradId})`} />}

      {/* Expected line (dashed gold) — the "should-be" trajectory */}
      <path
        d={expectedPath}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.75}
      />

      {/* Actual line (solid, with glow) — the "is" trajectory */}
      {actualPath && (
        <path
          d={actualPath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
      )}

      {/* Today vertical line (gold dashed) */}
      <line
        x1={todayX}
        x2={todayX}
        y1={padT - 4}
        y2={baseY}
        stroke="var(--gold)"
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.55}
      />

      {/* Today label — above the curve */}
      <text
        x={todayX}
        y={padT - 8}
        fontSize={9}
        fontWeight={700}
        fill="var(--gold)"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.18em"
        textAnchor="middle"
      >
        ↑ TODAY · DAY {day}/{totalDays}
      </text>

      {/* Expected dot at today (hollow gold) */}
      <circle
        cx={todayX}
        cy={todayYExpected}
        r={5}
        fill="var(--cosmos-2)"
        stroke="var(--gold)"
        strokeWidth={1.5}
      />

      {/* Actual dot at today (solid teal/warn) */}
      <circle
        cx={todayX}
        cy={todayYActual}
        r={5}
        fill={dotColor}
        stroke="var(--cosmos-2)"
        strokeWidth={2}
      />

      {/* Gap connector (short vertical hairline between the two today dots) */}
      <line
        x1={connX}
        x2={connX}
        y1={Math.min(todayYExpected, todayYActual)}
        y2={Math.max(todayYExpected, todayYActual)}
        stroke={gapColor}
        strokeWidth={1.5}
        opacity={0.7}
      />

      {/* Gap label — the actionable insight */}
      <text
        x={gapLabelX}
        y={gapLabelY}
        fontSize={11}
        fontWeight={700}
        fill={gapColor}
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.10em"
      >
        {gapLabel}
      </text>
      <text
        x={gapLabelX}
        y={gapLabelY + 11}
        fontSize={8.5}
        fontWeight={600}
        fill="var(--ink-3)"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.18em"
      >
        {underPace ? "UNDER PACE" : "OVER PACE"}
      </text>

      {/* Start date label (bottom-left) */}
      <text
        x={padL}
        y={VBH - 10}
        fontSize={9}
        fontWeight={600}
        fill="var(--ink-3)"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.18em"
      >
        {formatShortDate(periodStart)}
      </text>

      {/* EOP date label (bottom-right) */}
      <text
        x={VBW - padR}
        y={VBH - 10}
        fontSize={9}
        fontWeight={600}
        fill="var(--ink-3)"
        fontFamily="var(--font-jetbrains), monospace"
        letterSpacing="0.18em"
        textAnchor="end"
      >
        {formatShortDate(periodEnd)}
      </text>

      {/* Legend (top-left) */}
      <g transform={`translate(${padL}, 4)`}>
        <line
          x1={0}
          x2={14}
          y1={6}
          y2={6}
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <text
          x={18}
          y={9}
          fontSize={8.5}
          fontWeight={600}
          fill="var(--ink-3)"
          fontFamily="var(--font-jetbrains), monospace"
          letterSpacing="0.18em"
        >
          ACTUAL
        </text>
        <line
          x1={70}
          x2={84}
          y1={6}
          y2={6}
          stroke="var(--gold)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text
          x={88}
          y={9}
          fontSize={8.5}
          fontWeight={600}
          fill="var(--ink-3)"
          fontFamily="var(--font-jetbrains), monospace"
          letterSpacing="0.18em"
        >
          EXPECTED
        </text>
      </g>
    </svg>
  );
}

function formatShortDate(d: Date): string {
  return d
    .toLocaleString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function Metric({
  label,
  value,
  sub,
  accent,
  borderLeft,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: borderLeft ? "0 0 0 18px" : 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        // {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 20,
            fontWeight: 700,
            color: accent ?? "var(--ink)",
            lineHeight: 1,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            letterSpacing: "-0.005em",
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
