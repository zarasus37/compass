/**
 * SpendRingCard — Total Spend Progress Ring (donut).
 *
 * A single concentric ring showing the total of all envelope targets
 * (the "monthly funds") with the inner arc filled by current spend.
 * Center text shows the remaining budget in big mono numerics.
 *
 * Per the must-have visualizations list:
 *   "A single concentric circle representing total monthly funds.
 *    Displays the total remaining cash available to spend directly in
 *    the center in a bold, large font."
 *
 * Component Oracle Terminal treatment: cyan ring fill, gold target
 * marker, mono caps center label, mono big number, mono sub.
 */

import * as React from "react";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export interface SpendRingCardData {
  /** Per-envelope target (cents). */
  perEnvelope: { id: string; name: string; planet: PlanetId | null; currentCents: number; targetCents: number }[];
  /** Total cents spent across all envelopes this period. */
  totalSpentCents: number;
  /** Sum of all envelope targets (the monthly funds baseline). */
  totalTargetCents: number;
}

export function SpendRingCard({ data }: { data: SpendRingCardData }) {
  const remaining = Math.max(0, data.totalTargetCents - data.totalSpentCents);
  const pct =
    data.totalTargetCents > 0
      ? Math.min(1, data.totalSpentCents / data.totalTargetCents)
      : 0;
  // Sectors for the legend
  const sectorData = data.perEnvelope
    .filter((e) => e.targetCents > 0)
    .map((e) => ({
      id: e.id,
      name: e.name,
      planet: e.planet,
      target: e.targetCents,
      current: e.currentCents,
      pct: e.targetCents > 0 ? Math.min(1, e.currentCents / e.targetCents) : 0,
    }));

  // Donut geometry
  const size = 200;
  const cx = 100;
  const cy = 100;
  const r = 78;
  const innerR = 56;
  const startAngle = -90; // top
  const totalAngle = 360 * pct;

  // Build the filled arc as a single path (outer + inner)
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + totalAngle) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const ix1 = cx + innerR * Math.cos(endRad);
  const iy1 = cy + innerR * Math.sin(endRad);
  const ix2 = cx + innerR * Math.cos(startRad);
  const iy2 = cy + innerR * Math.sin(startRad);
  const largeArc = totalAngle > 180 ? 1 : 0;
  const arcPath =
    pct > 0
      ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
      : "";

  // The ring color goes from ok → warn → neg based on fill ratio
  const ringColor =
    pct < 0.5 ? "var(--terminal-cyan)" : pct < 0.9 ? "var(--warn)" : "var(--neg)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={(r + innerR) / 2}
          fill="none"
          stroke="var(--line-soft)"
          strokeWidth={r - innerR}
        />
        {/* filled arc */}
        {arcPath && <path d={arcPath} fill={ringColor} opacity={0.92} />}
        {/* center label */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize={7}
          fill="var(--ink-3)"
          letterSpacing={1.5}
          fontWeight={600}
        >
          REMAINING
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize={18}
          fill={remaining === 0 ? "var(--neg)" : "var(--ink)"}
          fontWeight={700}
          style={{ fontFeatureSettings: '"tnum" 1, "zero" 1' }}
        >
          {formatMoneyCompact(remaining)}
        </text>
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize={7}
          fill="var(--ink-4)"
          letterSpacing={1}
        >
          OF {formatMoneyCompact(data.totalTargetCents)}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
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
          // vessel mix
        </div>
        {sectorData.slice(0, 5).map((s) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "10px 1fr auto",
              gap: 8,
              alignItems: "center",
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 1,
                background: s.planet ? PLANET_COLORS[s.planet] : "var(--ink-3)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sora)",
                color: "var(--ink-2)",
                fontSize: 11.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color:
                  s.pct >= 1
                    ? "var(--neg)"
                    : s.pct >= 0.8
                    ? "var(--warn)"
                    : "var(--ok)",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
                fontWeight: 600,
              }}
            >
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
        {sectorData.length > 5 && (
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.04em",
              marginTop: 2,
            }}
          >
            +{sectorData.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}
