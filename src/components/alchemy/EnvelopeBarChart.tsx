/**
 * EnvelopeBarChart — the main "Envelopes at a glance" visualization.
 * Per v7, this is the primary data display on the dashboard. The
 * mandala is too abstract; a horizontal bar chart is immediately
 * legible. Each row shows the envelope's name, current/target, the
 * filled bar, and a percentage.
 *
 * The PacingLine (Cluster 1.7) is a gold tick inside each bar at the
 * position the envelope "should be" at based on how far through the
 * pay period we are. If the fill is past the tick, the user is
 * on-track (or ahead). If before, they're behind.
 */

import * as React from "react";
import { VesselGlyph, PLANET_COLORS, type PlanetId } from "./VesselGlyph";

export interface EnvelopeBar {
  id: string;
  name: string;
  planet: PlanetId | null;
  /** Current balance, in cents. */
  current: number;
  /** Target balance, in cents. */
  target: number;
  /** Optional accent color override (for custom envelopes). */
  color?: string;
}

export interface EnvelopeBarChartProps {
  envelopes: EnvelopeBar[];
  /**
   * Day-of-period the user is on (e.g. 9 of 14). When provided, a
   * gold pacing tick is drawn on each bar at the position the envelope
   * "should be" at this point in the pay period.
   */
  pacing?: { day: number; total: number } | null;
  className?: string;
}

type Status = "ok" | "warn" | "neg";

function statusOf(b: EnvelopeBar): Status {
  if (b.target <= 0) return "ok";
  if (b.current > b.target) return "neg";
  if (b.current >= b.target * 0.9) return "warn";
  return "ok";
}

function fillColorFor(status: Status, planet: PlanetId | null): string {
  switch (status) {
    case "neg":
      return "var(--neg)";
    case "warn":
      return "var(--warn)";
    default:
      return planet ? PLANET_COLORS[planet] : "var(--ok)";
  }
}

function percentString(b: EnvelopeBar): string {
  if (b.target <= 0) return "—";
  return `${Math.round((b.current / b.target) * 100)}%`;
}

function formatCents(c: number): string {
  return `$${(c / 100).toFixed(0)}`;
}

export function EnvelopeBarChart({ envelopes, pacing, className }: EnvelopeBarChartProps) {
  const pacingPct =
    pacing && pacing.total > 0
      ? Math.max(0, Math.min(100, (pacing.day / pacing.total) * 100))
      : null;

  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "8px 0",
        position: "relative",
      }}
    >
      {envelopes.map((b) => {
        const status = statusOf(b);
        const pct = b.target > 0 ? Math.min((b.current / b.target) * 100, 100) : 0;
        const isOver = b.current > b.target && b.target > 0;
        return (
          <div
            key={b.id}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 1.2fr 1fr 2.4fr 110px",
              alignItems: "center",
              gap: 24,
              padding: "16px 36px",
              borderBottom: "1px solid var(--line-soft)",
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 22, lineHeight: 1, textAlign: "center" }}>
              <VesselGlyph planet={b.planet} size={22} />
            </div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              {b.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12.5,
                color: "var(--ink-3)",
              }}
            >
              <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13.5 }}>
                {formatCents(b.current)}
              </span>{" "}
              / {formatCents(b.target)}
            </div>
            <div
              style={{
                position: "relative",
                height: 8,
                background: "var(--cosmos)",
                border: "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  width: `${pct}%`,
                  background: fillColorFor(status, b.planet),
                  boxShadow: status === "ok" && b.planet ? `0 0 8px ${PLANET_COLORS[b.planet]}` : "none",
                }}
              />
              {pacingPct !== null && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -4,
                    bottom: -4,
                    left: `calc(${pacingPct}% - 1px)`,
                    width: 2,
                    background: "var(--gold)",
                    boxShadow: "0 0 6px var(--gold)",
                    zIndex: 2,
                    pointerEvents: "none",
                  }}
                />
              )}
              {isOver && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(6,8,15,0.3) 4px, rgba(6,8,15,0.3) 8px)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                textAlign: "right",
                color:
                  status === "neg"
                    ? "var(--neg)"
                    : status === "warn"
                    ? "var(--warn)"
                    : "var(--ok)",
              }}
            >
              {percentString(b)}
            </div>
          </div>
        );
      })}
      {pacing && pacingPct !== null && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 36px 6px",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 9.5,
            color: "var(--gold)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span>◢ Pacing · day {pacing.day} of {pacing.total}</span>
          <span style={{ fontStyle: "italic", color: "var(--ink-3)", letterSpacing: "0.01em", textTransform: "none", fontFamily: "var(--font-cormorant), serif" }}>
            gold tick = where you should be
          </span>
        </div>
      )}
    </div>
  );
}
