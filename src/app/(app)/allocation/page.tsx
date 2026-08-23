import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { SankeyFlow, type SankeyLink, type SankeyNode } from "@/components/viz/SankeyFlow";
import { liveEnvelopes, liveSnapshot } from "@/lib/mock";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Allocation Plan — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora titles, JetBrains Mono
 * for amounts, mono caps headers with // prefix. The active strategy
 * card highlighted with teal left rail + glow. Sankey (re-skinned
 * in 2.0.3b) sits below as the Automation Map.
 */
export default function AllocationPage() {
  const ENVELOPES = liveEnvelopes();
  const SNAPSHOT = liveSnapshot();
  const total = ENVELOPES.reduce((s, e) => s + e.target, 0);
  const strategy = "envelope" as const;
  const isArmed = true;

  return (
    <div>
      <PageHead
        eyebrow="// plan · allocation"
        title="The Allocation Plan"
        em="how each paycheck is divided."
        accent="cyan"
        actions={
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 700,
                color: isArmed ? "var(--ok)" : "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {isArmed ? "[OK] ● Auto-distillation armed" : "○ Paused"}
            </div>
            <button
              type="button"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                background: isArmed ? "var(--surface)" : "var(--terminal-cyan)",
                color: isArmed ? "var(--ok)" : "var(--void)",
                border: isArmed ? "1px solid var(--ok)" : 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {isArmed ? "Pause" : "Arm auto-distillation"}
            </button>
          </div>
        }
        explanation={
          <>
            An allocation plan decides how each paycheck is split across the envelopes. Pick a strategy — Envelope, Zero-based, 50/30/20, or Pay-yourself-first — then customize the percentages. Once armed, every paycheck transaction is distributed automatically. No confirm. No friction. You only change the plan when you want to change the plan.
          </>
        }
      />

      {/* Strategy picker */}
      <section style={{ marginBottom: 56 }}>
        <SectionHeader
          title="Pick a strategy"
          em="start with a shape, customize later."
          accent="cyan"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {STRATEGIES.map((s) => {
            const isActive = s.id === strategy;
            return (
              <div
                key={s.id}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isActive ? "var(--terminal-cyan)" : "var(--line)"}`,
                  borderLeft: isActive ? "2px solid var(--terminal-cyan)" : undefined,
                  borderRadius: 4,
                  padding: "24px 28px",
                  position: "relative",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 0 24px rgba(45, 212, 191, 0.18)" : "none",
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--terminal-cyan)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    ● Active
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 22,
                    fontWeight: 600,
                    margin: "0 0 4px",
                    color: "var(--ink)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {s.name}
                </h3>
                <div
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 14,
                    color: "var(--ink-3)",
                    marginBottom: 16,
                    lineHeight: 1.4,
                  }}
                >
                  {s.tagline}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {s.description}
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 8,
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10.5,
                    color: "var(--ink-3)",
                    borderTop: "1px solid var(--line-soft)",
                    paddingTop: 12,
                    letterSpacing: "0.04em",
                    flexWrap: "wrap",
                  }}
                >
                  {s.shape.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "2px 8px",
                        border: "1px solid var(--line)",
                        borderRadius: 2,
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The active distribution */}
      <section style={{ marginBottom: 56 }}>
        <SectionHeader
          title="The active distribution"
          em={`${ENVELOPES.length} vessels · ${formatMoneyCompact(SNAPSHOT.nextPaycheckCents)} per paycheck`}
          meta="Drag to adjust. Sum to 100%."
          accent="cyan"
        />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 4,
          }}
        >
          {ENVELOPES.map((e, i) => {
            const pct = total > 0 ? Math.round((e.target / total) * 100) : 0;
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 80px 2fr 100px",
                  alignItems: "center",
                  gap: 24,
                  padding: "16px 24px",
                  borderBottom: i < ENVELOPES.length - 1 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <VesselGlyph planet={e.planet} size={22} inCircle />
                <div
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                    textAlign: "center",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                  }}
                >
                  {pct}%
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    background: "var(--cosmos)",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${pct}%`,
                      background: "var(--gold)",
                      boxShadow: "0 0 8px var(--gold)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    color: "var(--ink-2)",
                    textAlign: "right",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                  }}
                >
                  {formatMoney((SNAPSHOT.nextPaycheckCents * pct) / 100)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Automation Map */}
      <section style={{ marginBottom: 56 }}>
        <SectionHeader
          title="The Automation Map"
          em="a paycheck, fanning out to its vessels."
          meta={`Plan preview · ${formatMoneyCompact(SNAPSHOT.nextPaycheckCents)} paycheck`}
          accent="gold"
        />
        <SankeyFlow
          nodes={ENVELOPES.map(
            (e): SankeyNode => ({ id: e.id, label: e.name }),
          )}
          links={ENVELOPES.map((e): SankeyLink => {
            const pct = total > 0 ? (e.target / total) * 100 : 0;
            const cents = Math.round((SNAPSHOT.nextPaycheckCents * pct) / 100);
            return {
              source: e.id,
              target: e.id,
              value: cents,
            };
          })}
          totalCents={SNAPSHOT.nextPaycheckCents}
          sourceLabel={`Paycheck · ${formatMoney(SNAPSHOT.nextPaycheckCents)}`}
          height={380}
        />
      </section>

      {/* Auto-allocate explainer */}
      <section>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--mercury)",
            borderRadius: 4,
            padding: "32px 36px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--mercury)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> How auto-distillation works
          </div>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              margin: "0 0 16px",
            }}
          >
            When the plan is armed, every paycheck transaction triggers the rules immediately and silently. The paycheck is recorded. The seven ledger transfers are created. The vessel balances update. The audit log records the action. You see a post-hoc summary in your dashboard — not a confirmation modal. The plan is policy, not intent.
          </p>
          <p
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--ink-3)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            To stop: edit the plan, pause the plan, or delete a rule. The change takes effect on the next paycheck, not retroactively.
          </p>
        </div>
      </section>
    </div>
  );
}

const STRATEGIES = [
  {
    id: "envelope" as const,
    name: "Envelope",
    tagline: "The Compass default. Every dollar a job.",
    description: "Give every dollar a job before the month begins. Strong defaults; easy to customize. Best for most people.",
    shape: ["Sol 40%", "Luna 20%", "Jupiter 18%", "Mercury 8%", "Mars 6%", "Venus 4%", "Saturn 4%"],
  },
  {
    id: "zero_based" as const,
    name: "Zero-based",
    tagline: "Income minus allocated equals zero. No slack.",
    description: "Every dollar is accounted for. Forces a 'misc' catch-all envelope capped at 5–10%. Best for power users who want zero slack.",
    shape: ["100% allocated", "0% slack", "Misc cap 5–10%"],
  },
  {
    id: "fifty_thirty_twenty" as const,
    name: "50 / 30 / 20",
    tagline: "Half for needs, a third for wants, a fifth for the future.",
    description: "A recognizable starting point. Half goes to needs, a third to wants, a fifth to savings. Best for new users.",
    shape: ["Needs 50%", "Wants 30%", "Savings 20%"],
  },
  {
    id: "pay_yourself_first" as const,
    name: "Pay yourself first",
    tagline: "Savings comes off the top, before anything else.",
    description: "Savings and debt payoff come first (15–25% of income), then distribute the rest normally. Best for aggressive savers.",
    shape: ["Savings 15–25%", "Then needs", "Then wants"],
  },
];

function SectionHeader({
  title,
  em,
  meta,
  accent = "cyan",
}: {
  title: string;
  em?: string;
  meta?: string;
  accent?: "cyan" | "gold" | "neg";
}) {
  const accentColor =
    accent === "gold"
      ? "var(--gold)"
      : accent === "neg"
      ? "var(--neg)"
      : "var(--terminal-cyan)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: "1px solid var(--line)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: accentColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span>
        </span>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.01em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {em && (
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontWeight: 400,
              fontSize: 16,
              color: "var(--ink-3)",
            }}
          >
            {em}
          </span>
        )}
      </div>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            maxWidth: 380,
            textAlign: "right",
          }}
        >
          {meta}
        </div>
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          width: 80,
          height: 1,
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
}
