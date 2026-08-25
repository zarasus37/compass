"use client";

/**
 * EnvelopeCadenceChart — the 14-day daily-spend chart on the
 * envelope detail page.
 *
 * Lifted from the AllocationFeed's background sparkline (Cluster 3.2):
 * the row's stacked sparklines were visual noise when many envelopes
 * were visible at once. The cadence story is told on the detail page
 * instead, where the user can match the line against the specific
 * transactions that drove it.
 *
 * Visual:
 *   - Full-width line + area chart in the planet's color
 *   - 14 days on the x-axis, oldest left → today right
 *   - Cents on the y-axis (0 → max + 10% headroom)
 *   - Today dot: rightmost point, vessel-accent, slight glow
 *   - Hover: vertical guide line + a tooltip with the day + amount
 *   - Empty days: line drops to baseline (no special handling — the
 *     gap speaks for itself)
 *
 * Sovereign Monad (v6) treatment: vessel-surface panel + vessel-border,
 * planet color for the line, vessel-accent for the today marker, ink
 * scale for labels, JetBrains Mono for the numeric tooltip.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { formatShortDate } from "@/lib/format";

export interface EnvelopeCadenceChartProps {
  /** 14-element per-day spend, oldest first. Today is the last element. */
  burnCents: number[];
  /** Vessel identifier for the line color. */
  planet: PlanetId;
  /** Display name (for the eyebrow / tooltip). */
  envelopeName: string;
  /** Optional start date (oldest day). Defaults to today - 13d. */
  startDate?: Date;
}

export function EnvelopeCadenceChart({
  burnCents,
  planet,
  envelopeName,
  startDate,
}: EnvelopeCadenceChartProps) {
  const VBW = 800;
  const VBH = 220;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = VBW - padL - padR;
  const innerH = VBH - padT - padB;

  // Build the 14 dates (oldest first, today last).
  const days = React.useMemo(() => {
    const start = startDate ?? new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    return Array.from({ length: burnCents.length }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [burnCents.length, startDate]);

  const max = Math.max(1, ...burnCents);
  const yDomainMax = max * 1.15;
  const n = Math.max(1, burnCents.length);

  const xScale = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW;
  const yScale = (v: number) => VBH - padB - (v / yDomainMax) * innerH;

  // Build the line path. If we have only 1 point, just plot the dot.
  const linePath =
    burnCents.length >= 2
      ? "M" +
        burnCents
          .map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`)
          .join(" L")
      : "";
  const lastIdx = burnCents.length - 1;
  const baseY = VBH - padB;
  const areaPath =
    linePath
      ? `${linePath} L${xScale(lastIdx).toFixed(1)},${baseY.toFixed(1)} L${xScale(0).toFixed(1)},${baseY.toFixed(1)} Z`
      : "";

  // Y-axis reference line at max
  const maxLineY = yScale(max);
  // Y-axis reference at 50% of max (a tick)
  const halfLineY = yScale(max / 2);

  // Hover state
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VBW;
    // Find the nearest data point
    if (x < padL || x > VBW - padR) {
      setHoverIdx(null);
      return;
    }
    const ratio = (x - padL) / innerW;
    const idx = Math.round(ratio * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  }
  function onPointerLeave() {
    setHoverIdx(null);
  }

  const planetColor = PLANET_COLORS[planet] ?? PLANET_COLORS.jupiter;
  const todayVal = burnCents[lastIdx] ?? 0;
  const totalCents = burnCents.reduce((s, v) => s + v, 0);
  const avgCents = Math.round(totalCents / n);
  const peakCents = max;
  const peakDay = burnCents.indexOf(max);

  return (
    <section
      ref={containerRef}
      aria-label={`Daily spend cadence for ${envelopeName}, last 14 days`}
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderLeft: `2px solid ${planetColor}`,
        borderRadius: 4,
        padding: "20px 24px 18px",
        position: "relative",
      }}
    >
      {/* Header row: eyebrow + summary stats */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-4)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            // cadence · 14 days
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            Daily spend
          </h3>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          <span>
            <span style={{ color: "var(--ink-4)" }}>PEAK · </span>
            <b style={{ color: "var(--ink)", fontWeight: 700 }}>
              {formatMoney(peakCents)}
            </b>
            {peakCents > 0 && peakDay >= 0 && (
              <span style={{ color: "var(--ink-4)" }}>
                {" "}
                on {formatShortDate(days[peakDay] ?? new Date())}
              </span>
            )}
          </span>
          <span>
            <span style={{ color: "var(--ink-4)" }}>AVG · </span>
            <b style={{ color: "var(--ink)", fontWeight: 700 }}>
              {formatMoney(avgCents)}
            </b>
            <span style={{ color: "var(--ink-4)" }}> / day</span>
          </span>
        </div>
      </div>

      {/* The chart */}
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${VBW} / ${VBH}`,
          cursor: "crosshair",
        }}
      >
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label={`14-day spend: peak ${formatMoney(peakCents)}, average ${formatMoney(avgCents)} per day, today ${formatMoney(todayVal)}`}
          style={{ display: "block" }}
        >
          {/* Subtle horizontal grid lines (max + 50%) */}
          <line
            x1={padL}
            x2={VBW - padR}
            y1={maxLineY}
            y2={maxLineY}
            stroke="var(--vessel-border)"
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.5}
          />
          <line
            x1={padL}
            x2={VBW - padR}
            y1={halfLineY}
            y2={halfLineY}
            stroke="var(--vessel-border)"
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.25}
          />

          {/* Y-axis max label */}
          <text
            x={padL - 6}
            y={maxLineY + 3}
            fontSize={8.5}
            fontWeight={600}
            fill="var(--ink-4)"
            fontFamily="var(--font-jetbrains), monospace"
            letterSpacing="0.10em"
            textAnchor="end"
          >
            MAX
          </text>

          {/* Filled area under the line */}
          {areaPath && <path d={areaPath} fill={planetColor} opacity="0.12" />}

          {/* The line itself */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={planetColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Each data point — a small dot */}
          {burnCents.map((v, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(v)}
              r={2.5}
              fill={planetColor}
              opacity={0.8}
            />
          ))}

          {/* Today marker — rightmost point, larger + vessel-accent */}
          {burnCents.length > 0 && (
            <>
              <line
                x1={xScale(lastIdx)}
                x2={xScale(lastIdx)}
                y1={padT}
                y2={VBH - padB}
                stroke="var(--vessel-accent)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.4}
              />
              <circle
                cx={xScale(lastIdx)}
                cy={yScale(todayVal)}
                r={5}
                fill="var(--vessel-accent)"
                stroke="var(--vessel-surface)"
                strokeWidth={2}
              />
              <text
                x={xScale(lastIdx)}
                y={padT - 4}
                fontSize={8.5}
                fontWeight={700}
                fill="var(--vessel-accent)"
                fontFamily="var(--font-jetbrains), monospace"
                letterSpacing="0.18em"
                textAnchor="middle"
              >
                TODAY
              </text>
            </>
          )}

          {/* Hover overlay */}
          {hoverIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={xScale(hoverIdx)}
                x2={xScale(hoverIdx)}
                y1={padT}
                y2={VBH - padB}
                stroke="var(--vessel-accent)"
                strokeWidth={1}
                opacity={0.55}
              />
              <circle
                cx={xScale(hoverIdx)}
                cy={yScale(burnCents[hoverIdx] ?? 0)}
                r={4.5}
                fill="var(--vessel-surface)"
                stroke="var(--vessel-accent)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* X-axis day labels — first, mid, last to keep it sparse */}
          {burnCents.length > 0 && (
            <>
              <text
                x={xScale(0)}
                y={VBH - 14}
                fontSize={9}
                fontWeight={600}
                fill="var(--ink-4)"
                fontFamily="var(--font-jetbrains), monospace"
                letterSpacing="0.10em"
                textAnchor="start"
              >
                {formatShortDate(days[0] ?? new Date()).toUpperCase()}
              </text>
              <text
                x={xScale(Math.floor((n - 1) / 2))}
                y={VBH - 14}
                fontSize={9}
                fontWeight={600}
                fill="var(--ink-4)"
                fontFamily="var(--font-jetbrains), monospace"
                letterSpacing="0.10em"
                textAnchor="middle"
              >
                {formatShortDate(days[Math.floor((n - 1) / 2)] ?? new Date()).toUpperCase()}
              </text>
              <text
                x={xScale(n - 1)}
                y={VBH - 14}
                fontSize={9}
                fontWeight={600}
                fill="var(--ink-4)"
                fontFamily="var(--font-jetbrains), monospace"
                letterSpacing="0.10em"
                textAnchor="end"
              >
                {formatShortDate(days[n - 1] ?? new Date()).toUpperCase()}
              </text>
            </>
          )}
        </svg>

        {/* Tooltip — rendered outside the SVG so it doesn't get squished */}
        {hoverIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: `min(calc(${(xScale(hoverIdx) / VBW) * 100}% + 14px), calc(100% - 180px))`,
              background: "var(--vessel-dark)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 3,
              padding: "8px 12px",
              pointerEvents: "none",
              minWidth: 140,
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--vessel-accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {formatShortDate(days[hoverIdx] ?? new Date()).toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 15,
                fontWeight: 700,
                color: burnCents[hoverIdx] === 0 ? "var(--ink-3)" : "var(--ink)",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
              }}
            >
              {burnCents[hoverIdx] === 0 ? "—" : formatMoney(burnCents[hoverIdx] ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--vessel-border)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-4)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 10,
              height: 2,
              background: planetColor,
              borderRadius: 1,
            }}
          />
          SPEND
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--vessel-accent)",
              boxShadow: "0 0 4px var(--vessel-accent)",
            }}
          />
          TODAY
        </span>
        <span style={{ marginLeft: "auto", color: "var(--ink-5)" }}>
          {envelopeName.toUpperCase()} · LAST 14 DAYS
        </span>
      </div>
    </section>
  );
}
