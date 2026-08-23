import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { GoalTrajectory, type GoalTrajectoryInput } from "@/components/viz/GoalTrajectory";
import { GoalSparkline } from "@/components/viz/GoalSparkline";
import { liveGoals, TODAY } from "@/lib/mock";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Goals — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora section titles, JetBrains
 * Mono for amounts and labels, mono caps headers with // prefix.
 * Top-priority ring in jupiter (planet color, semantic), primary
 * CTA in terminal-cyan. GoalTrajectory and GoalSparkline unchanged
 * (pure SVG, no text styling).
 */
export default function GoalsPage() {
  const GOALS = liveGoals();
  const goalTrajectories: GoalTrajectoryInput[] = GOALS.map((g) => ({
    id: g.id,
    name: g.name,
    planet: g.planet,
    currentCents: g.currentCents,
    targetCents: g.targetCents,
    perPaycheckCents: g.perPaycheckCents,
    targetDate: g.targetDate.toISOString(),
    anchorDate: TODAY,
  }));
  return (
    <div>
      <PageHead
        eyebrow="// plan · goals"
        title="Your Goals"
        em="where your money is heading."
        accent="jupiter"
        actions={
          <Link
            href="/goals/new"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--terminal-cyan)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
            }}
          >
            + New goal
          </Link>
        }
        explanation={
          <>
            Goals are the destinations you're working toward. One of them is your top priority — it gets the hero slot on your dashboard. The rest are on your path, but they take a back seat until you change the priority. Each goal can be linked to a vessel so the money automatically flows to it on every paycheck.
          </>
        }
      />

      {/* Trajectory — Cluster 1.7. Moved to the TOP so the chart sits
          right next to the goal data below it (mom-grade principle:
          charts belong next to the information they visualize). */}
      <section style={{ marginBottom: 56 }}>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--jupiter)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span>
          <span>The Trajectory</span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 26,
            fontWeight: 600,
            margin: "0 0 12px",
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Each goal, climbing <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>at this pace.</span>
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            margin: "0 0 24px",
            maxWidth: 720,
          }}
        >
          The lines below show your goals projected forward at the rate your current paychecks are contributing. The dashed line is each goal's target. A flat line means the plan isn't moving it.
        </p>
        <GoalTrajectory goals={goalTrajectories} />
      </section>

      <section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {GOALS.map((g) => {
            const pct = Math.min((g.currentCents / g.targetCents) * 100, 100);
            return (
              <div
                key={g.id}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${g.isPrimary ? "var(--jupiter)" : "var(--line)"}`,
                  borderLeft: g.isPrimary ? "2px solid var(--jupiter)" : undefined,
                  borderRadius: 4,
                  padding: "28px 32px",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 220px 160px 180px",
                  gap: 28,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--cosmos)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <VesselGlyph planet={g.planet} size={28} />
                </div>
                <div>
                  {g.isPrimary && (
                    <div
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--jupiter)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: "var(--jupiter)" }}>●</span> Top priority
                    </div>
                  )}
                  <Link
                    href={`/goals/${g.id}`}
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: 4,
                      textDecoration: "none",
                      display: "inline-block",
                      letterSpacing: "-0.005em",
                    }}
                    className="goal-name-link"
                  >
                    {g.name} →
                  </Link>
                  <div
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 13.5,
                      color: "var(--ink-3)",
                      lineHeight: 1.45,
                    }}
                  >
                    {g.description}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: "var(--ink-4)" }}>//</span> Progress
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: 6,
                      fontFeatureSettings: '"tnum" 1, "zero" 1',
                    }}
                  >
                    {formatMoney(g.currentCents)} <span style={{ color: "var(--ink-4)" }}>/</span> {formatMoney(g.targetCents)}
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
                        background: "var(--jupiter)",
                        boxShadow: "0 0 8px var(--jupiter)",
                      }}
                    />
                  </div>
                </div>
                {/* Per-goal mini trajectory — the chart sits directly
                    next to the goal's progress data so the visual and
                    the source are associated. */}
                <div>
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
                    <span style={{ color: "var(--ink-4)" }}>//</span> Trajectory
                  </div>
                  <div
                    style={{
                      background: "var(--cosmos)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 2,
                      padding: "8px 10px",
                    }}
                  >
                    <GoalSparkline
                      planet={g.planet}
                      currentCents={g.currentCents}
                      targetCents={g.targetCents}
                      perPaycheckCents={g.perPaycheckCents}
                      anchor={TODAY}
                      width={140}
                      height={42}
                    />
                    <div
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 9.5,
                        color: "var(--ink-3)",
                        marginTop: 4,
                        textAlign: "right",
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    >
                      {g.currentCents >= g.targetCents
                        ? "[OK] Reached"
                        : g.perPaycheckCents <= 0
                        ? "[WARN] Not moving"
                        : (() => {
                            const need = g.targetCents - g.currentCents;
                            const checks = Math.ceil(need / g.perPaycheckCents);
                            const mo = Math.round(checks / 2);
                            return `+${mo}mo → 100%`;
                          })()}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ color: "var(--ink-4)" }}>//</span> Target
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 16,
                      color: "var(--ink)",
                      fontFeatureSettings: '"tnum" 1',
                      fontWeight: 500,
                    }}
                  >
                    {formatShortDate(g.targetDate)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!g.isPrimary && (
                      <button
                        type="button"
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                          background: "transparent",
                          color: "var(--jupiter)",
                          border: "1px solid var(--jupiter)",
                          borderRadius: 2,
                          padding: "6px 12px",
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        Set as top
                      </button>
                    )}
                    <button
                      type="button"
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        background: "transparent",
                        color: "var(--ink-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 2,
                        padding: "6px 12px",
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
