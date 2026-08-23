import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { liveEnvelopes, liveSnapshot, liveTransactions, liveGoals, TODAY } from "@/lib/mock";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Insights — articulated deep page.
 * Charts. The Ouroboros (allocation), the Trajectory (projection),
 * and a couple of summary stats. In Cluster 2 this gets Recharts
 * for interactive tooling; for v1, SVG charts ship in.
 */
export default function InsightsPage() {
  const ENVELOPES = liveEnvelopes();
  const SNAPSHOT = liveSnapshot();
  const total = ENVELOPES.reduce((s, e) => s + e.target, 0);

  return (
    <div>
      <PageHead
        eyebrow="Overview · Insights"
        title="The Patterns"
        em="what your money is telling you."
        accent="gold"
        explanation={
          <>
            The charts on this page summarize your money across envelopes, goals, and time. Use them to spot where the rhythm is holding — and where it isn't. Every chart links back to the underlying data, so you can dig into anything that catches your eye.
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, marginBottom: 32 }}>
        {/* Ouroboros (allocation donut) */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10.5,
              color: "var(--gold)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            The Ouroboros
          </div>
          <h3
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 24,
              fontWeight: 400,
              margin: "0 0 8px",
            }}
          >
            Allocation, by envelope
          </h3>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 14,
              color: "var(--ink-3)",
              marginBottom: 20,
            }}
          >
            Where each paycheck goes, by percentage of the total envelope target.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <svg viewBox="0 0 200 200" width="220" height="220">
              {(() => {
                let cumulative = 0;
                const arcs = ENVELOPES.map((e) => {
                  const pct = total > 0 ? (e.target / total) * 100 : 0;
                  const angle = (pct / 100) * 360;
                  const startAngle = cumulative;
                  cumulative += angle;
                  const startRad = ((startAngle - 90) * Math.PI) / 180;
                  const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
                  const r = 80;
                  const cx = 100;
                  const cy = 100;
                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);
                  const largeArc = angle > 180 ? 1 : 0;
                  const color = PLANET_COLOR[e.planet ?? "sol"];
                  return (
                    <path
                      key={e.id}
                      d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={color}
                      opacity={0.85}
                    />
                  );
                });
                return (
                  <>
                    {arcs}
                    <circle cx="100" cy="100" r="38" fill="var(--cosmos)" stroke="var(--gold-soft)" strokeWidth="0.5" />
                    <text x="100" y="92" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="6.5" fill="var(--gold)" letterSpacing="1.5" fontWeight="600">
                      TOTAL
                    </text>
                    <text x="100" y="108" textAnchor="middle" fontFamily="Italiana, serif" fontSize="16" fill="var(--gold-glow)">
                      {formatMoneyCompact(SNAPSHOT.nextPaycheckCents)}
                    </text>
                    <text x="100" y="120" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="5.5" fill="var(--ink-3)" letterSpacing="1">
                      PER PAYCHECK
                    </text>
                  </>
                );
              })()}
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {ENVELOPES.map((e) => {
                const pct = total > 0 ? Math.round((e.target / total) * 100) : 0;
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "12px 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      padding: "4px 0",
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background: PLANET_COLOR[e.planet ?? "sol"],
                        borderRadius: 2,
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-cormorant), serif", color: "var(--ink-2)" }}>
                      {e.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 12,
                        color: "var(--ink)",
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trajectory (projection) */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10.5,
              color: "var(--jupiter)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            The Trajectory
          </div>
          <h3
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 24,
              fontWeight: 400,
              margin: "0 0 8px",
            }}
          >
            Net worth, 12 months
          </h3>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 14,
              color: "var(--ink-3)",
              marginBottom: 20,
            }}
          >
            Projected at current pace, with paychecks, allocations, and debt payoff.
          </p>
          <svg viewBox="0 0 360 160" width="100%" height="160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tr-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--gold-glow)" />
              </linearGradient>
              <linearGradient id="tr-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g fill="var(--gold)" opacity="0.4">
              <circle cx="40" cy="30" r="0.8" />
              <circle cx="100" cy="50" r="0.6" />
              <circle cx="160" cy="20" r="0.7" />
              <circle cx="220" cy="40" r="0.5" />
              <circle cx="300" cy="28" r="0.8" />
            </g>
            <path
              d="M 0 130 L 30 124 L 60 116 L 100 102 L 140 88 L 180 74 L 220 60 L 260 48 L 300 36 L 340 26 L 360 22"
              fill="none"
              stroke="url(#tr-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 0 130 L 30 124 L 60 116 L 100 102 L 140 88 L 180 74 L 220 60 L 260 48 L 300 36 L 340 26 L 360 22 L 360 160 L 0 160 Z"
              fill="url(#tr-fill)"
            />
            <line x1="30" y1="0" x2="30" y2="160" stroke="var(--gold)" strokeWidth="0.4" strokeDasharray="2 3" opacity="0.6" />
            <circle cx="30" cy="124" r="3" fill="var(--gold-glow)" />
            <circle cx="30" cy="124" r="6" fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.5" />
            <circle cx="280" cy="40" r="4" fill="none" stroke="var(--jupiter)" strokeWidth="0.6" />
            <circle cx="280" cy="40" r="1.5" fill="var(--jupiter)" />
            <text x="280" y="155" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="6" fill="var(--jupiter)" letterSpacing="0.5">
              $20k EMERGENCY
            </text>
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 12.5,
              color: "var(--ink-3)",
            }}
          >
            <span>
              <b style={{ fontFamily: "var(--font-jetbrains), monospace", fontStyle: "normal", color: "var(--gold)", fontWeight: 500 }}>
                Now
              </b>{" "}
              · {formatMoneyCompact(SNAPSHOT.netWorthCents)}
            </span>
            <span>Debt payoff · May '26</span>
            <span>
              <b style={{ fontFamily: "var(--font-jetbrains), monospace", fontStyle: "normal", color: "var(--jupiter)", fontWeight: 500 }}>
                $20k
              </b>{" "}
              · Feb '26
            </span>
          </div>
        </section>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        {[
          { label: "Net worth", value: formatMoney(SNAPSHOT.netWorthCents), sub: "+$1,612 this period" },
          { label: "This period", value: "$+2,400", sub: "1 income, 6 expenses" },
          { label: "On track", value: "5/7", sub: "envelopes within target" },
          { label: "Pace", value: "+1.9%/wk", sub: "net worth growth" },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: "20px 24px",
              borderRight: i < 3 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 26,
                color: "var(--ink)",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--ink-3)",
                marginTop: 4,
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Budget vs Actual — Cluster 1.7. MOVED to /envelopes
          (next to the per-envelope data it visualizes). Removed
          here per the chart-next-to-data principle. */}
      {/* Goal Trajectory — Cluster 1.7. MOVED to /goals (next to the
          per-goal data it visualizes). Removed here per the
          chart-next-to-data principle. */}
    </div>
  );
}

const PLANET_COLOR: Record<string, string> = {
  sol: "#f0c14a",
  luna: "#b8c8e0",
  mars: "#c45a3a",
  mercury: "#8ac0b8",
  jupiter: "#9a7ac0",
  venus: "#d4a578",
  saturn: "#a8b0c8",
};
