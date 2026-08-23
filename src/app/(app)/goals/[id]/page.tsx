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
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts, mono caps labels. Jupiter planet color preserved
 * as the goal semantic. "What if" scenarios in terminal voice
 * with [OK]/[WARN] markers and per-scenario mono numbers.
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
  const monthlyRate = goal.perPaycheckCents * 2;
  const monthsToTarget =
    goal.perPaycheckCents > 0 && remaining > 0
      ? Math.ceil(remaining / (goal.perPaycheckCents * 2))
      : goal.currentCents >= goal.targetCents
      ? 0
      : null;

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
        eyebrow={`// plan · goals · ${goal.name.toLowerCase()}`}
        title={goal.name}
        em="one goal, in full."
        accent="jupiter"
        actions={
          <Link
            href="/goals"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
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
            <b style={{ color: `var(--${goal.planet ?? "jupiter"})`, fontWeight: 600 }}>
              {goal.planet === "jupiter" ? "Jupiter · Savings" : `${goal.planet} vessel`}
            </b>{" "}
            envelope — money that lands there goes straight to this balance on every paycheck.
          </>
        }
      />

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
          label="current"
          value={formatMoney(goal.currentCents)}
          sub={`${Math.round(pct)}% of target`}
        />
        <Stat
          label="target"
          value={formatMoney(goal.targetCents)}
          sub={`by ${formatShortDate(goal.targetDate)}`}
        />
        <Stat
          label="per paycheck"
          value={formatMoney(goal.perPaycheckCents)}
          sub={`${formatMoney(monthlyRate)} / month`}
        />
        <Stat
          label={monthsToTarget === 0 ? "status" : "months to 100%"}
          value={
            monthsToTarget === 0
              ? "[OK] Reached"
              : monthsToTarget === null
              ? "—"
              : `${monthsToTarget}mo`
          }
          sub={
            monthsToTarget === 0
              ? "[OK] ✦"
              : monthsToTarget === null
              ? "[WARN] Plan not moving it"
              : `≈ ${formatShortDate(
                  new Date(
                    TODAY.getTime() + monthsToTarget * 30 * 24 * 60 * 60 * 1000,
                  ),
                )}`
          }
          accent={monthsToTarget === null ? "warn" : "ok"}
        />
      </section>

      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="The trajectory"
          em="where it's heading at this pace."
          meta="Hover the line for projected dollar values."
        />
        <GoalTrajectory goals={trajectory} height={320} />
      </section>

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
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: isCurrent ? `var(--${goal.planet ?? "jupiter"})` : "var(--ink-3)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "var(--ink-4)" }}>//</span>{" "}
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
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 22,
                    fontWeight: 600,
                    color: isCurrent ? `var(--${goal.planet ?? "jupiter"})` : "var(--ink)",
                    marginBottom: 4,
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                  }}
                >
                  {formatMoney(s.perPaycheckCents)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10.5,
                    color: "var(--ink-3)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  per check → {s.months === 0 ? "[OK] reached" : `${s.months}mo`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: `2px solid var(--${goal.planet ?? "jupiter"})`,
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
              borderRadius: 2,
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
                fontFamily: "var(--font-sora)",
                fontSize: 15,
                color: "var(--ink-2)",
                margin: 0,
                lineHeight: 1.55,
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
                  fontFamily: "var(--font-jetbrains), monospace",
                  background: "transparent",
                  color: "var(--jupiter)",
                  border: "1px solid var(--jupiter)",
                  borderRadius: 2,
                  padding: "10px 16px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Set as top
              </button>
            )}
            <Link
              href={`/goals/${goal.id}/edit`}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                background: "var(--terminal-cyan)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
              }}
            >
              Edit goal →
            </Link>
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
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1,
          color: accent === "warn" ? "var(--warn)" : accent === "ok" ? "var(--ok)" : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 6,
          letterSpacing: "0.04em",
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--jupiter)",
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
            fontSize: 22,
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
              fontSize: 15,
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
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}
