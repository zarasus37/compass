/**
 * EnvelopeStatusCard — the below-the-fold "watch closely" card.
 *
 * Surfaces the top 3 envelopes ranked by attention needed:
 *   1. Over-limit envelopes first, sorted by overage
 *   2. Then highest utilization (current / target) for the rest
 *
 * Each row surfaces:
 *   - planet dot
 *   - envelope name + ratio bar
 *   - **7-day burn sparkline** (NEW) — the shape of the last week's
 *     spend on this envelope, sitting directly above the ratio bar.
 *     A flat line = steady. A spike midweek = one big charge. A
 *     rising line = accelerating toward the cap.
 *   - percentage of target
 *   - status badge (Over / Watch / Calm)
 *
 * If everything is calm, the card shows the jade "All within target"
 * summary so the user can scroll past it confidently.
 *
 * Tap-through → /envelopes, where the per-envelope detail page has
 * the full bar chart, transaction list, and the pacing tick.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface EnvelopeStatusRow {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
  /** "over" = over target; "watch" = 80%+; "calm" = under 80%. */
  status: "over" | "watch" | "calm";
  /** 7-element per-day spend, oldest first. Drives the burn sparkline. */
  burnCents: number[];
}

export interface EnvelopeStatusCardData {
  rows: EnvelopeStatusRow[];
  totalOver: number;
}

const STATUS_META: Record<
  EnvelopeStatusRow["status"],
  { label: string; accent: string; ratioColor: string }
> = {
  over: { label: "Over", accent: "var(--neg)", ratioColor: "var(--neg)" },
  watch: { label: "Watch", accent: "var(--warn)", ratioColor: "var(--warn)" },
  calm: { label: "Calm", accent: "var(--ok)", ratioColor: "var(--ok)" },
};

export function EnvelopeStatusCard({ data }: { data: EnvelopeStatusCardData }) {
  const { rows } = data;
  const calm = rows.length === 0 || rows.every((r) => r.status === "calm");

  return (
    <div
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {calm ? (
        <div
          style={{
            padding: "26px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              color: "var(--ok)",
              background: "rgba(106, 176, 136, 0.10)",
              border: "1px solid var(--ok)",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              All envelopes within target.
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              No action needed. Tap to see the full bar chart.
            </div>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.slice(0, 3).map((row, i) => {
            const meta = STATUS_META[row.status];
            const ratio =
              row.targetCents > 0
                ? Math.min(row.currentCents / row.targetCents, 1)
                : 0;
            const overflowRatio =
              row.targetCents > 0 && row.currentCents > row.targetCents
                ? Math.min(
                    (row.currentCents - row.targetCents) / row.targetCents,
                    0.5,
                  )
                : 0;
            const planetColor = PLANET_COLORS[row.planet];
            return (
              <li
                key={row.id}
                style={{
                  padding: "14px 22px",
                  borderTop: i === 0 ? "0" : "1px solid var(--line-soft)",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {/* Planet dot — the visual identifier */}
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: planetColor,
                    boxShadow: `0 0 8px ${planetColor}`,
                    flexShrink: 0,
                  }}
                />
                {/* Name + sparkline + ratio bar */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                        fontSize: 16,
                        color: "var(--ink)",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 11,
                        color: "var(--ink-3)",
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    >
                      {formatMoney(row.currentCents)}
                      <span style={{ color: "var(--ink-4)" }}> / </span>
                      {formatMoney(row.targetCents)}
                    </span>
                  </div>
                  {/* Burn sparkline — 7-day shape, sits directly above the bar */}
                  <BurnSparkline
                    cents={row.burnCents}
                    accent={meta.ratioColor}
                    planetColor={planetColor}
                  />
                  {/* Ratio bar */}
                  <div
                    style={{
                      position: "relative",
                      height: 3,
                      background: "var(--cosmos)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 1,
                      overflow: "hidden",
                      marginTop: 4,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: `${ratio * 100}%`,
                        background: meta.ratioColor,
                      }}
                    />
                    {row.status === "over" && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: "0 auto 0 100%",
                          width: `${overflowRatio * 100}%`,
                          background:
                            "repeating-linear-gradient(45deg, var(--neg), var(--neg) 3px, rgba(196, 90, 58, 0.3) 3px, rgba(196, 90, 58, 0.3) 6px)",
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Pct */}
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                    color: "var(--ink-2)",
                    fontFeatureSettings: '"tnum" 1',
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {Math.round(ratio * 100)}%
                </span>
                {/* Status badge */}
                <span
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: meta.accent,
                    background:
                      row.status === "over"
                        ? "rgba(196, 90, 58, 0.18)"
                        : "transparent",
                    border: `1px solid ${meta.accent}`,
                    borderRadius: 2,
                    padding: "4px 8px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Burn sparkline — 7-day per-envelope spend, sitting directly above
// the ratio bar. The shape tells the user the trajectory:
//   - flat line = steady pace
//   - spike = one big charge midweek
//   - rising = accelerating toward the cap
// Today is the rightmost column, marked with a small filled dot.
// ---------------------------------------------------------------------------

function BurnSparkline({
  cents,
  accent,
  planetColor,
}: {
  cents: number[];
  accent: string;
  planetColor: string;
}) {
  const W = 160;
  const H = 16;
  const padX = 1;
  const padY = 2;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const max = Math.max(1, ...cents);
  const yMax = max * 1.1;
  const todayIdx = cents.length - 1;
  const x = (i: number) => padX + (i / Math.max(1, cents.length - 1)) * innerW;
  const y = (v: number) => padY + (1 - v / yMax) * innerH;

  const path = cents
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const hasSpend = cents.some((v) => v > 0);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="7-day burn rate"
      style={{ display: "block", width: "100%", maxWidth: 200, height: 14 }}
    >
      {!hasSpend ? (
        <line
          x1={padX}
          x2={W - padX}
          y1={H - padY}
          y2={H - padY}
          stroke="var(--ink-5)"
          strokeWidth={0.5}
          strokeDasharray="1 2"
          opacity={0.6}
        />
      ) : (
        <>
          <path
            d={path}
            fill="none"
            stroke={planetColor}
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.75}
          />
          {/* Area fill below the line, very subtle */}
          <path
            d={`${path} L${x(todayIdx).toFixed(1)},${(H - padY).toFixed(1)} L${x(0).toFixed(1)},${(H - padY).toFixed(1)} Z`}
            fill={planetColor}
            opacity={0.08}
          />
          {/* Today dot, accent-colored by status */}
          <circle
            cx={x(todayIdx)}
            cy={y(cents[todayIdx] ?? 0)}
            r={1.8}
            fill={accent}
            stroke="var(--cosmos-2)"
            strokeWidth={0.6}
          />
        </>
      )}
    </svg>
  );
}
