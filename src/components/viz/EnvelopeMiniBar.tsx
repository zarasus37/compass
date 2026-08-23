/**
 * EnvelopeMiniBar — tiny inline bar showing one envelope's
 * current-to-target fill. Sits inside the "Every envelope" row
 * on /envelopes, directly next to the data it visualizes.
 *
 * Pure SVG (no Recharts) so it's cheap to render 7+ of them on
 * a single page. Color follows the planet; the fill turns to
 * iron-red striped when the envelope is over target.
 */
import * as React from "react";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface EnvelopeMiniBarProps {
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
  width?: number;
  height?: number;
}

export function EnvelopeMiniBar({
  planet,
  currentCents,
  targetCents,
  width = 120,
  height = 10,
}: EnvelopeMiniBarProps) {
  const hasTarget = targetCents > 0;
  const pct = hasTarget ? Math.max(0, (currentCents / targetCents) * 100) : 0;
  const isOver = hasTarget && currentCents > targetCents;
  const fillColor = isOver
    ? "var(--neg)"
    : pct >= 85
    ? "var(--warn)"
    : PLANET_COLORS[planet];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        hasTarget
          ? `${Math.round(pct)}% of target${isOver ? " (over limit)" : ""}`
          : "no target"
      }
      style={{ display: "block" }}
    >
      {/* Track */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="var(--cosmos)"
        stroke="var(--line-soft)"
        strokeWidth={0.5}
      />
      {/* 100% target line */}
      {hasTarget && (
        <line
          x1={width - 0.5}
          x2={width - 0.5}
          y1={0}
          y2={height}
          stroke="var(--gold-deep)"
          strokeWidth={1}
          strokeDasharray="1.5 1.5"
          opacity={0.5}
        />
      )}
      {/* Fill */}
      {hasTarget && pct > 0 && (
        <rect
          x={0.5}
          y={0.5}
          width={Math.max(0.5, Math.min(width - 1, (pct / 100) * (width - 1)))}
          height={height - 1}
          fill={fillColor}
          opacity={isOver ? 0.65 : 0.95}
        />
      )}
      {/* Over-limit hatching */}
      {isOver && (
        <>
          <pattern
            id={`hatch-${planet}-${width}`}
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="var(--neg)"
              strokeWidth="1.2"
            />
          </pattern>
          <rect
            x={0.5}
            y={0.5}
            width={width - 1}
            height={height - 1}
            fill={`url(#hatch-${planet}-${width})`}
            opacity={0.5}
          />
        </>
      )}
    </svg>
  );
}
