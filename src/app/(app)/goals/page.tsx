import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { GoalTrajectory, type GoalTrajectoryInput } from "@/components/viz/GoalTrajectory";
import { liveGoals, TODAY } from "@/lib/mock";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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
        eyebrow="Plan · Goals"
        title="Your Goals"
        em="where your money is heading."
        accent="jupiter"
        actions={
          <button
            type="button"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--gold)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + New goal
          </button>
        }
        explanation={
          <>
            Goals are the destinations you're working toward. One of them is your top priority — it gets the hero slot on your dashboard. The rest are on your path, but they take a back seat until you change the priority. Each goal can be linked to a vessel so the money automatically flows to it on every paycheck.
          </>
        }
      />

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
                  borderRadius: 4,
                  padding: "28px 32px",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 220px 200px",
                  gap: 32,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
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
                        fontFamily: "var(--font-cinzel), serif",
                        fontSize: 9,
                        color: "var(--jupiter)",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      ● Top priority
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 24,
                      color: "var(--ink)",
                      marginBottom: 4,
                    }}
                  >
                    {g.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: "var(--ink-3)",
                    }}
                  >
                    {g.description}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9.5,
                      color: "var(--ink-3)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Progress
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--jetbrains), monospace, sans-serif".replace("var(--jetbrains), monospace, sans-serif", "var(--font-jetbrains), monospace"),
                      fontSize: 22,
                      color: "var(--ink)",
                      marginBottom: 6,
                    }}
                  >
                    {formatMoney(g.currentCents)} / {formatMoney(g.targetCents)}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9.5,
                      color: "var(--ink-3)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                    }}
                  >
                    Target date
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 18,
                      color: "var(--ink)",
                    }}
                  >
                    {formatShortDate(g.targetDate)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!g.isPrimary && (
                      <button
                        type="button"
                        style={{
                          fontFamily: "var(--font-cinzel), serif",
                          background: "transparent",
                          color: "var(--gold)",
                          border: "1px solid var(--gold-soft)",
                          borderRadius: 2,
                          padding: "6px 12px",
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
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
                        fontFamily: "var(--font-cinzel), serif",
                        background: "transparent",
                        color: "var(--ink-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 2,
                        padding: "6px 12px",
                        fontSize: 9.5,
                        fontWeight: 500,
                        letterSpacing: "0.18em",
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

      {/* Trajectory — Cluster 1.7 */}
      <section style={{ marginTop: 56 }}>
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
            fontSize: 28,
            fontWeight: 400,
            margin: "0 0 12px",
            color: "var(--ink)",
          }}
        >
          Each goal, climbing <em style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", color: "var(--ink-3)" }}>at this pace.</em>
        </h3>
        <p
          style={{
            fontFamily: "var(--font-cormorant), serif",
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
    </div>
  );
}
