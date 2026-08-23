import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { GoalTrajectory, type GoalTrajectoryInput } from "@/components/viz/GoalTrajectory";
import { liveGoals, TODAY } from "@/lib/mock";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Goal detail — Cluster 1.10.
 *
 * The drill-down view for a single goal. The full GoalTrajectory chart
 * is right next to the goal's data (current / target / per-paycheck /
 * months-to-target) per the chart-next-to-data principle. The page
 * also shows:
 *   - the same data inline as stat cells
 *   - a "what if" section: change per-paycheck and see the new target date
 *   - a contribution history (the per-paycheck plan; the live store
 *     doesn't track per-contribution history yet, so this is the plan
 *     forward rather than a log)
 *
 * The page reuses the trajectory pattern from /goals, but only for the
 * one goal so it's a single line, focused, and easy to read.
 */
export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const GOALS = liveGoals();
  const goal = GOALS.find((g) => g.id === id);

  if (!goal) {
    notFound();
  }

  const pct = Math.min((goal.currentCents / goal.targetCents) * 100, 100);
  const remaining = Math.max(0, goal.targetCents - goal.currentCents);
  const monthlyRate = goal.perPaycheckCents * 2; // biweekly → monthly
  const monthsToTarget =
    goal.perPaycheckCents > 0 && remaining > 0
      ? Math.ceil(remaining / (goal.perPaycheckCents * 2))
      : goal.currentCents >= goal.targetCents
      ? 0
      : null;

  // For the "what if" — show three scenarios stacked
  const scenarios = [0.5, 1, 1.5, 2].map((mult) => {
    const per = Math.round(goal.perPaycheckCents * mult);
    const mo =
      per > 0 && remaining > 0
        ? Math.ceil(remaining / (per * 2))
        : 0;
    return { mult, perPaycheckCents: per, months: mo };
  });

  const trajectory: GoalTrajectoryInput[] = [
    {
      id: goal.id,
      name: goal.name,
      planet: goal.planet,
      currentCents: goal.currentCents,
      targetCents: goal.targetCents,
      perPaycheckCents: goal.perPaycheckCents,
      targetDate: goal.targetDate.toISOString(),
      anchorDate: TODAY,
    },
  ];

  return (
    <div>
      <PageHead
        eyebrow={`Plan · Goals · ${goal.name}`}
        title={goal.name}
        em="one goal, in full."
        accent="jupiter"
        actions={
          <Link
            href="/goals"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All goals
          </Link>
        }
        explanation={
          <>
            The single trajectory for this goal — where it is, where it's heading, and what changes the arrival time. The vessel for this goal is the{" "}
            <b style={{ color: `var(--${goal.planet ?? "jupiter"})` }}>
              {goal.planet === "jupiter" ? "Jupiter · Savings" : `${goal.planet} vessel`}
            </b>{" "}
            envelope — money that lands there goes straight to this balance on every paycheck.
          </>
        }
      />

      {/* Stat strip — current / target / per-paycheck / months to 100% */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 48,
        }}
      >
        <Stat
          label="Current"
          value={formatMoney(goal.currentCents)}
          sub={`${Math.round(pct)}% of target`}
        />
        <Stat
          label="Target"
          value={formatMoney(goal.targetCents)}
          sub={`by ${formatShortDate(goal.targetDate)}`}
        />
        <Stat
          label="Per paycheck"
          value={formatMoney(goal.perPaycheckCents)}
          sub={`${formatMoney(monthlyRate)} / month`}
        />
        <Stat
          label={monthsToTarget === 0 ? "Status" : "Months to 100%"}
          value={
            monthsToTarget === 0
              ? "Reached"
              : monthsToTarget === null
              ? "—"
              : `${monthsToTarget}mo`
          }
          sub={
            monthsToTarget === 0
              ? "✦"
              : monthsToTarget === null
              ? "Plan not moving it"
              : `≈ ${formatShortDate(
                  new Date(
                    TODAY.getTime() + monthsToTarget * 30 * 24 * 60 * 60 * 1000,
                  ),
                )}`
          }
          accent={monthsToTarget === null ? "warn" : "ok"}
        />
      </section>

      {/* The trajectory chart — directly next to the goal's data. */}
      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="The trajectory"
          em="where it's heading at this pace."
          meta="Hover the line for projected dollar values."
        />
        <GoalTrajectory goals={trajectory} height={320} />
      </section>

      {/* What if — change the per-paycheck amount and see the new arrival */}
      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="What if I add more?"
          em="each paycheck."
          meta="Change the contribution and the arrival time moves with it."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          {scenarios.map((s, i) => {
            const isCurrent = s.mult === 1;
            return (
              <div
                key={s.mult}
                style={{
                  padding: "20px 22px",
                  borderRight: i < 3 ? "1px solid var(--line-soft)" : "none",
                  background: isCurrent ? "var(--cosmos)" : "transparent",
                  position: "relative",
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: `var(--${goal.planet ?? "jupiter"})`,
                      boxShadow: `0 0 8px var(--${goal.planet ?? "jupiter"})`,
                    }}
                  />
                )}
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
                  {s.mult === 1
                    ? "Current"
                    : s.mult === 0.5
                    ? "Half"
                    : s.mult === 1.5
                    ? "1.5×"
                    : "Double"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 22,
                    color: isCurrent ? `var(--${goal.planet ?? "jupiter"})` : "var(--ink)",
                    marginBottom: 4,
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney(s.perPaycheckCents)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-3)",
                  }}
                >
                  per paycheck → {s.months === 0 ? "reached" : `${s.months}mo`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goal description + actions */}
      <section>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "28px 32px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "var(--cosmos)",
              border: `1px solid var(--${goal.planet ?? "jupiter"})`,
              boxShadow: `0 0 12px var(--${goal.planet ?? "jupiter"})`,
            }}
          >
            <VesselGlyph planet={goal.planet} size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {goal.description}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {!goal.isPrimary && (
              <button
                type="button"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  background: "transparent",
                  color: "var(--gold)",
                  border: "1px solid var(--gold-soft)",
                  borderRadius: 2,
                  padding: "10px 16px",
                  fontSize: 10,
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
                background: "var(--gold)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Edit goal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok" | "warn";
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontSize: 24,
          lineHeight: 1,
          color: accent === "warn" ? "var(--warn)" : "var(--ink)",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-3)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

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
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 26,
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
            fontFamily: "var(--font-cormorant), serif",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-3)",
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}
