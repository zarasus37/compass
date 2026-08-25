/**
 * PaceLine — the small actual-vs-ideal pace visual on the
 * SafeToSpendHero (Cluster 3.2.5).
 *
 * Replaces the larger BurnCurve that previously lived on the hero.
 * The curve was a history view; the user said it didn't help them
 * grow the number. The new pace line is a small status indicator
 * (Copilot's pattern) that answers the single question: "are you
 * on track, or not?"
 *
 * Visual:
 *   - Two lines on the same axes
 *     - Dotted: ideal cumulative spend (straight from 0 to expectedTotal)
 *     - Solid:  actual cumulative spend (the user's path)
 *   - Color shifts: vessel-accent (under pace, calm), vessel-watch
 *     (slightly over), vessel-over (well over)
 *   - Today dot: vessel-accent, marks the rightmost actual point
 *   - Compact: 60px tall, fits below the opportunities card
 *
 * Cluster 3.2.5
 */

import * as React from "react";

export interface PaceLineProps {
  /** Cumulative cents per day, oldest first. Today is the last element. */
  actualCents: number[];
  /** Expected total spend for the window (e.g. 7 days). */
  expectedTotalCents: number;
  /** Optional label override (e.g. "Last 7 days"). */
  label?: string;
}

export function PaceLine({
  actualCents,
  expectedTotalCents,
  label = "PACE · LAST 7 DAYS",
}: PaceLineProps) {
  const VBW = 600;
  const VBH = 60;
  const padL = 12;
  const padR = 12;
  const padT = 8;
  const padB = 18;
  const innerW = VBW - padL - padR;
  const innerH = VBH - padT - padB;

  // Cumulative spend.
  let cum = 0;
  const cumulative = actualCents.map((v) => {
    cum += v;
    return cum;
  });
  const actualToday = cumulative[cumulative.length - 1] ?? 0;

  // Ideal: straight line from 0 at day 0 to expectedTotal at day N-1.
  const n = Math.max(1, actualCents.length);
  const yMax = Math.max(expectedTotalCents, actualToday, 1) * 1.1;
  const xScale = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW;
  const yScale = (v: number) => VBH - padB - (v / yMax) * innerH;

  // Build the actual line path.
  const actualPath =
    cumulative.length >= 2
      ? "M" +
        cumulative
          .map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`)
          .join(" L")
      : "";

  // Build the ideal (dotted) line — from (0, 0) to (n-1, expectedTotal).
  const idealPath = `M${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(n - 1).toFixed(1)},${yScale(expectedTotalCents).toFixed(1)}`;

  // Color by pace ratio: actual/expected today. <1 = under (good), >1 = over.
  const ratio = expectedTotalCents > 0 ? actualToday / expectedTotalCents : 0;
  const lineColor =
    ratio <= 1.0
      ? "var(--vessel-accent)"
      : ratio <= 1.3
        ? "var(--vessel-watch)"
        : "var(--vessel-over)";
  const statusText =
    ratio <= 0.95
      ? "UNDER PACE"
      : ratio <= 1.05
        ? "ON PACE"
        : ratio <= 1.3
          ? "ABOVE PACE"
          : "WELL OVER";

  const todayIdx = cumulative.length - 1;
  const todayX = xScale(todayIdx);
  const todayY = yScale(actualToday);
  const idealTodayY = yScale(expectedTotalCents);

  return (
    <section
      aria-label={`Pace line: ${statusText} (${Math.round(ratio * 100)}% of expected)`}
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        padding: "12px 18px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--ink-4)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-5)", marginRight: 6 }}>//</span>
          {label}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: lineColor,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: lineColor,
              boxShadow: `0 0 6px ${lineColor}`,
            }}
          />
          {statusText} · {Math.round(ratio * 100)}%
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${VBW} / ${VBH}`,
        }}
      >
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Pace: actual ${Math.round(ratio * 100)}% of expected over the last 7 days`}
          style={{ display: "block" }}
        >
          {/* Ideal line (dotted) */}
          <path
            d={idealPath}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />
          {/* Actual line (solid) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Today dot — rightmost actual point */}
          {cumulative.length > 0 && (
            <circle
              cx={todayX}
              cy={todayY}
              r={3.5}
              fill={lineColor}
              stroke="var(--vessel-surface)"
              strokeWidth={1.5}
            />
          )}
          {/* Ideal end-marker (open circle) at the right edge */}
          <circle
            cx={xScale(n - 1)}
            cy={idealTodayY}
            r={3}
            fill="var(--vessel-surface)"
            stroke="var(--gold)"
            strokeWidth={1.2}
          />
        </svg>
      </div>
    </section>
  );
}
