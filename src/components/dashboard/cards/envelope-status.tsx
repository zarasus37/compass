/**
 * EnvelopeStatusCard — the below-the-fold "watch closely" card.
 *
 * Surfaces the top 3 envelopes ranked by attention needed:
 *   1. Over-limit envelopes first, sorted by overage
 *   2. Then highest utilization (current / target) for the rest
 *
 * Each row surfaces the envelope's name, the ratio bar, and a
 * status badge (Over / Watch / Calm). The badge color tracks the
 * badge text — iron-red for Over (with the ink text rule from the
 * locked lessons: red on the badge bg, ink text inside the bar).
 *
 * If everything is calm, the card shows the jade "All within target"
 * summary so the user can scroll past it confidently.
 *
 * Tap-through → /envelopes, where the per-envelope detail page has
 * the full bar chart, transaction list, and the pacing tick.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import type { PlanetId } from "@/lib/store";

export interface EnvelopeStatusRow {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
  /** "over" = over target; "watch" = 80%+; "calm" = under 80%. */
  status: "over" | "watch" | "calm";
}

export interface EnvelopeStatusCardData {
  rows: EnvelopeStatusRow[];
  totalOver: number;
}

const PLANET_VAR: Record<PlanetId, string> = {
  sol: "var(--sol)",
  luna: "var(--luna)",
  mars: "var(--mars)",
  mercury: "var(--mercury)",
  jupiter: "var(--jupiter)",
  venus: "var(--venus)",
  saturn: "var(--saturn)",
};

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
            const planetColor = PLANET_VAR[row.planet];
            return (
              <li
                key={row.id}
                style={{
                  padding: "16px 22px",
                  borderTop: i === 0 ? "0" : "1px solid var(--line-soft)",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center",
                  gap: 16,
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
                {/* Name + ratio bar */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                        fontSize: 17,
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
                        fontSize: 12,
                        color: "var(--ink-3)",
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    >
                      {formatMoney(row.currentCents)}
                      <span style={{ color: "var(--ink-4)" }}> / </span>
                      {formatMoney(row.targetCents)}
                    </span>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 4,
                      background: "var(--cosmos)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: `${ratio * 100}%`,
                        background: meta.ratioColor,
                        boxShadow: row.status === "over" ? "none" : `0 0 4px ${meta.ratioColor}`,
                      }}
                    />
                    {row.status === "over" && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: "0 auto 0 100%",
                          width: `${overflowRatio * 100}%`,
                          background: "repeating-linear-gradient(45deg, var(--neg), var(--neg) 4px, rgba(196, 90, 58, 0.3) 4px, rgba(196, 90, 58, 0.3) 8px)",
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Pct */}
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 12,
                    color: "var(--ink-2)",
                    fontFeatureSettings: '"tnum" 1',
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {Math.round(ratio * 100)}%
                </span>
                {/* Status badge */}
                <span
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    fontSize: 9.5,
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
                    padding: "5px 10px",
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
