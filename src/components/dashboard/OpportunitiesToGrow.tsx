/**
 * OpportunitiesToGrow — the 3-row "ways to grow this number" card
 * on the SafeToSpendHero (Cluster 3.2.5).
 *
 * Renders the top opportunities from `topOpportunities()`. Each row
 * is a clickable link to the relevant page (envelopes / subscriptions
 * / a specific envelope detail) so the user can act on the suggestion.
 *
 * Empty state: a single calm line — "your plan is tight, no surplus
 * to move right now." This is important; the user shouldn't see an
 * empty card and wonder if it's broken.
 *
 * Sovereign Monad (v6) treatment: vessel-surface panel + vessel-border,
 * planet-color icon for the leading glyph, vessel-accent for the +$X
 * amount on the right (the "this is what you gain" signal). Sora for
 * the title, JetBrains Mono for the delta and detail.
 */

import * as React from "react";
import Link from "next/link";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { PLANET_COLORS } from "@/components/alchemy/VesselGlyph";
import type { Opportunity } from "@/lib/opportunities";

export interface OpportunitiesToGrowProps {
  opportunities: Opportunity[];
}

export function OpportunitiesToGrow({ opportunities }: OpportunitiesToGrowProps) {
  const hasAny = opportunities.length > 0;

  return (
    <section
      aria-label="Ways to grow safe-to-spend"
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        padding: "18px 22px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-4)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-5)", marginRight: 6 }}>//</span>
          WAYS TO GROW THIS
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--ink-5)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {hasAny
            ? `${opportunities.length} AVAILABLE`
            : "PLAN TIGHT"}
        </div>
      </div>

      {!hasAny ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "6px 0",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "grid",
              placeItems: "center",
              width: 28,
              height: 28,
              borderRadius: 2,
              background: "var(--vessel-dark)",
              border: "1px solid var(--vessel-border)",
              color: "var(--ok)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            [OK]
          </span>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13,
              color: "var(--ink-2)",
              lineHeight: 1.4,
            }}
          >
            Your plan is tight — no surplus to move right now. The number above is what you have.
          </div>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {opportunities.map((o) => {
            const planetColor = o.planetHint ? PLANET_COLORS[o.planetHint] : "var(--vessel-accent)";
            return (
              <li key={o.id}>
                <Link
                  href={o.href}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 12px",
                    background: "var(--vessel-dark)",
                    border: "1px solid var(--vessel-border)",
                    borderRadius: 3,
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 120ms, background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--vessel-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--vessel-border)";
                  }}
                >
                  {/* Leading planet-tinted icon */}
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      minWidth: 32,
                      height: 24,
                      padding: "0 6px",
                      borderRadius: 2,
                      background: "var(--vessel-surface)",
                      border: `1px solid ${planetColor}`,
                      color: planetColor,
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      boxShadow: `0 0 4px ${planetColor}`,
                      flexShrink: 0,
                    }}
                  >
                    {o.icon}
                  </span>
                  {/* Title + detail */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-sora)",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--ink)",
                        lineHeight: 1.3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {o.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 10,
                        color: "var(--ink-4)",
                        letterSpacing: "0.04em",
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {o.detail}
                    </div>
                  </div>
                  {/* The +$X amount — the "this is what you gain" signal */}
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--vessel-accent)",
                      letterSpacing: "0.02em",
                      fontFeatureSettings: '"tnum" 1, "zero" 1',
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                    aria-label={`Would add ${formatMoney(o.deltaCents)} to safe to spend`}
                  >
                    +{formatMoneyCompact(o.deltaCents)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
