import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { liveEnvelopes, liveSnapshot } from "@/lib/mock";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Allocation Plan — articulated deep page.
 * The user picks a strategy, sees the active distribution, and arms
 * auto-allocate. Once armed, every paycheck transaction is silently
 * distributed (D12 — no confirm modal).
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
        eyebrow="Plan · Allocation"
        title="The Allocation Plan"
        em="how each paycheck is divided."
        accent="gold"
        actions={
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 9.5,
                color: isArmed ? "var(--mercury)" : "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              {isArmed ? "● Auto-distillation armed" : "○ Paused"}
            </div>
            <button
              type="button"
              style={{
                fontFamily: "var(--font-cinzel), serif",
                background: isArmed ? "var(--surface)" : "var(--gold)",
                color: isArmed ? "var(--mercury)" : "var(--void)",
                border: isArmed ? "1px solid var(--mercury)" : 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10.5,
                fontWeight: 600,
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
        <SectionHeader title="Pick a strategy" em="start with a shape, customize later." />
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
                  border: `1px solid ${isActive ? "var(--gold)" : "var(--line)"}`,
                  borderRadius: 4,
                  padding: "24px 28px",
                  position: "relative",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 0 24px rgba(212, 175, 82, 0.15)" : "none",
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9,
                      color: "var(--gold)",
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                    }}
                  >
                    ● Active
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 24,
                    margin: "0 0 4px",
                    color: "var(--ink)",
                  }}
                >
                  {s.name}
                </h3>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "var(--ink-3)",
                    marginBottom: 16,
                  }}
                >
                  {s.tagline}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
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
                    gap: 12,
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                    color: "var(--ink-3)",
                    borderTop: "1px solid var(--line-soft)",
                    paddingTop: 12,
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
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 18,
                    color: "var(--ink)",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    color: "var(--ink)",
                    textAlign: "center",
                    fontFeatureSettings: '"tnum" 1',
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
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney((SNAPSHOT.nextPaycheckCents * pct) / 100)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto-allocate explainer */}
      <section>
        <div
          style={{
            background:
              "radial-gradient(ellipse at 100% 50%, rgba(138, 192, 184, 0.08) 0%, transparent 60%), var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: "3px solid var(--mercury)",
            borderRadius: 4,
            padding: "32px 36px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--mercury)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            How auto-distillation works
          </div>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              margin: "0 0 16px",
            }}
          >
            When the plan is armed, every paycheck transaction triggers the rules immediately and silently. The paycheck is recorded. The seven ledger transfers are created. The vessel balances update. The audit log records the action. You see a post-hoc summary in your dashboard — not a confirmation modal. The plan is policy, not intent.
          </p>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--ink-3)",
              margin: 0,
              fontStyle: "italic",
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
}: {
  title: string;
  em?: string;
  meta?: string;
}) {
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
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: "0.005em",
          margin: 0,
          color: "var(--ink)",
        }}
      >
        {title}
        {em && (
          <em
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              color: "var(--ink-3)",
              fontWeight: 500,
              marginLeft: 8,
            }}
          >
            {em}
          </em>
        )}
      </h2>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
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
          background: "var(--gold)",
          boxShadow: "0 0 8px var(--gold)",
        }}
      />
    </div>
  );
}
