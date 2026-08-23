import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { liveEnvelopes, liveSnapshot } from "@/lib/mock";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Insights — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora titles, JetBrains Mono
 * for amounts and labels, mono caps headers with // prefix. The
 * Ouroboros donut and Trajectory chart preserved as-is (pure SVG);
 * the summary stats grid restyled in terminal voice.
 */
export default function InsightsPage() {
  const ENVELOPES = liveEnvelopes();
  const SNAPSHOT = liveSnapshot();
  const total = ENVELOPES.reduce((s, e) => s + e.target, 0);

  return (
    <div>
      <PageHead
        eyebrow="// overview · insights"
        title="The Patterns"
        em="what your money is telling you."
        accent="cyan"
        explanation={
          <>
            The patterns in your money, at a glance. The Ouroboros shows where each paycheck goes by vessel; the Trajectory shows the next 12 months of net worth projected at this pace. For per-envelope and per-goal detail, see the corresponding pages — those charts now live next to the data they visualize.
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
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--gold)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> The Ouroboros
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 22,
              fontWeight: 600,
              margin: "0 0 8px",
              color: "var(--ink)",
              letterSpacing: "-0.005em",
            }}
          >
            Allocation, by envelope
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13.5,
              color: "var(--ink-3)",
              marginBottom: 20,
              lineHeight: 1.5,
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
                    <text
                      x="100"
                      y="92"
                      textAnchor="middle"
                      fontFamily="var(--font-jetbrains), monospace"
                      fontSize={6.5}
                      fill="var(--gold)"
                      letterSpacing={1.5}
                      fontWeight={700}
                    >
                      TOTAL
                    </text>
                    <text
                      x="100"
                      y="108"
                      textAnchor="middle"
                      fontFamily="var(--font-jetbrains), monospace"
                      fontSize={14}
                      fill="var(--gold-glow)"
                      fontWeight={600}
                    >
                      {formatMoneyCompact(SNAPSHOT.nextPaycheckCents)}
                    </text>
                    <text
                      x="100"
                      y="120"
                      textAnchor="middle"
                      fontFamily="var(--font-jetbrains), monospace"
                      fontSize={5.5}
                      fill="var(--ink-3)"
                      letterSpacing={1}
                    >
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
                    <span
                      style={{
                        fontFamily: "var(--font-sora)",
                        color: "var(--ink-2)",
                        fontSize: 13,
                      }}
                    >
                      {e.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 12,
                        color: "var(--ink)",
                        fontFeatureSettings: '"tnum" 1, "zero" 1',
                        fontWeight: 600,
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
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--jupiter)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> The Trajectory
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 22,
              fontWeight: 600,
              margin: "0 0 8px",
              color: "var(--ink)",
              letterSpacing: "-0.005em",
            }}
          >
            Net worth, 12 months
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13.5,
              color: "var(--ink-3)",
              marginBottom: 20,
              lineHeight: 1.5,
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
            <text
              x="280"
              y="155"
              textAnchor="middle"
              fontFamily="var(--font-jetbrains), monospace"
              fontSize={6}
              fill="var(--jupiter)"
              letterSpacing={0.5}
              fontWeight={700}
            >
              $20K EMERGENCY
            </text>
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            <span>
              <b style={{ color: "var(--gold)", fontWeight: 700 }}>Now</b> · {formatMoneyCompact(SNAPSHOT.netWorthCents)}
            </span>
            <span style={{ color: "var(--ink-3)" }}>Debt payoff · May '26</span>
            <span>
              <b style={{ color: "var(--jupiter)", fontWeight: 700 }}>$20K</b> · Feb '26
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
          { label: "net worth", value: formatMoney(SNAPSHOT.netWorthCents), sub: "+$1,612 this period" },
          { label: "this period", value: "$+2,400", sub: "1 income · 6 expenses" },
          { label: "on track", value: "5 / 7", sub: "envelopes within target" },
          { label: "pace", value: "+1.9% / wk", sub: "net worth growth" },
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
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--ink)",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color: "var(--ink-3)",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PLANET_COLOR: Record<string, string> = {
  sol: "#FCD34D",
  luna: "#CBD5E1",
  mars: "#FB923C",
  mercury: "#67E8F9",
  jupiter: "#C4B5FD",
  venus: "#FCA5A5",
  saturn: "#94A3B8",
};
