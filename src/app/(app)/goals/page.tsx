import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { GoalTrajectory, type GoalTrajectoryInput } from "@/components/viz/GoalTrajectory";
import { GoalSparkline } from "@/components/viz/GoalSparkline";
import { liveGoals, liveGoalsFromDb, TODAY } from "@/lib/mock";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * Goals — articulated deep page.
 *
 * Cluster 4.2: deep-link filtering by goal type. The /goals page
 * accepts `?kind=emergency` or `?kind=invest` to narrow the list
 * to one of the canonical goal categories. The old standalone
 * pages (`/emergency`, `/invest`) 308-redirect to these filtered
 * views, so a user landing from a bookmark sees the same content
 * they'd see if the dedicated page still existed.
 *
 * The kind filter applies to the goal list below; the trajectory
 * chart at the top always shows ALL goals (it's the read of "where
 * are you relative to every target" — narrowing it would lose the
 * comparison).
 *
 * Each goal card also gets a kind badge in the header (next to
 * "Top priority"), so the category is visible without scrolling
 * to a separate page.
 */
type KindFilter = "all" | "emergency" | "invest";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const kind: KindFilter =
    params.kind === "emergency" || params.kind === "invest"
      ? (params.kind as KindFilter)
      : "all";

  // Cluster 5.2.6 widget switch: GOALS now come from the Prisma
  // `Goal` table (via liveGoalsFromDb). The first call lazily
  // seeds the 4 canonical GOALS_SEED rows (ensureUserGoalsSeeded).
  const user = await requireUser();
  const GOALS = await liveGoalsFromDb(user.id);
  // The trajectory chart always reads ALL goals (the comparison
  // is the point of the chart — narrowing it would lose the
  // "this goal is moving, that one isn't" signal).
  // Filter to goals with non-null planet + targetDate (the chart
  // needs both to render). The canonical 4 GOALS_SEED rows all
  // have both; custom goals may not.
  const goalTrajectories: GoalTrajectoryInput[] = GOALS
    .filter((g) => g.planet !== null && g.targetDate !== null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      planet: g.planet as PlanetId,
      currentCents: g.currentCents,
      targetCents: g.targetCents,
      perPaycheckCents: g.perPaycheckCents,
      targetDate: (g.targetDate as Date).toISOString(),
      anchorDate: TODAY,
    }));

  // The goal list below filters by the kind param.
  const filtered = GOALS.filter((g) => {
    if (kind === "all") return true;
    return g.goalType === kind.toUpperCase();
  });

  // Counts for the tab chips.
  const counts = {
    all: GOALS.length,
    emergency: GOALS.filter((g) => g.goalType === "EMERGENCY").length,
    invest: GOALS.filter((g) => g.goalType === "INVEST").length,
  };

  return (
    <div>
      <PageHead
        eyebrow={`// aims · goals${kind !== "all" ? " · " + kind : ""}`}
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
          kind === "all" ? (
            <>
              Goals are the destinations you're working toward. One of them is your top priority — it gets the hero slot on your dashboard. The rest are on your path, but they take a back seat until you change the priority. Each goal can be linked to a vessel so the money automatically flows to it on every paycheck.
            </>
          ) : kind === "emergency" ? (
            <>
              The Emergency Fund goal — your safety net. Three to six months of essential expenses, set aside and not touched. The Jupiter vessel feeds this fund automatically.
            </>
          ) : (
            <>
              The Investment goal — the long-horizon money. Compounding does most of the work; your job is to keep feeding it and not panic when the market dips.
            </>
          )
        }
      />

      {/* Kind filter tabs — matches the two-tab pattern from
          /obligations. Persists via the URL so back/forward and
          shared links work as expected. */}
      <KindTabs current={kind} counts={counts} />

      {/* Trajectory chart — always shows ALL goals, not the
          filtered set. The chart's job is to compare across
          goals; narrowing it loses the signal. */}
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

      {/* Goal list — filtered by `?kind=...` */}
      <section>
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--terminal-cyan)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> The list
            </div>
            <h3
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--ink)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {kind === "all" ? "Every goal" : kind === "emergency" ? "Emergency Fund" : "Investment goal"}
            </h3>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            showing {filtered.length} of {GOALS.length}
          </div>
        </header>

        {filtered.length === 0 ? (
          <EmptyState kind={kind} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {filtered.map((g) => {
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {g.isPrimary && (
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains), monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--jupiter)",
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            border: "1px solid var(--jupiter)",
                            borderRadius: 2,
                            padding: "2px 7px",
                          }}
                        >
                          <span style={{ color: "var(--jupiter)" }}>●</span> Top priority
                        </span>
                      )}
                      {g.goalType && <KindBadge kind={g.goalType} />}
                      {g.kind === "TRANSFER" && (
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains), monospace",
                            fontSize: 9,
                            fontWeight: 600,
                            color: "var(--ok)",
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            border: "1px solid var(--ok)",
                            borderRadius: 2,
                            padding: "2px 7px",
                          }}
                        >
                          [OK] Auto-sweep
                        </span>
                      )}
                    </div>
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
                      {g.targetDate ? formatShortDate(g.targetDate) : "—"}
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
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// KindTabs — the two-tab (plus ALL) switcher at the top of the page.
// Same pattern as /obligations: tab links via ?kind=..., active
// state is the cyan top border + filled background.
// ──────────────────────────────────────────────────────────────────────

function KindTabs({
  current,
  counts,
}: {
  current: KindFilter;
  counts: { all: number; emergency: number; invest: number };
}) {
  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: "12px 18px",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.20em",
    textTransform: "uppercase",
    transition: "all 140ms",
    cursor: "pointer",
  };
  const tabs: { kind: KindFilter; label: string; count: number }[] = [
    { kind: "all", label: "// All", count: counts.all },
    { kind: "emergency", label: "// Emergency", count: counts.emergency },
    { kind: "invest", label: "// Invest", count: counts.invest },
  ];
  return (
    <nav
      aria-label="Filter goals by type"
      style={{
        display: "flex",
        gap: 0,
        border: "1px solid var(--line)",
        borderRadius: 2,
        background: "var(--surface)",
        marginBottom: 32,
        overflow: "hidden",
      }}
    >
      {tabs.map((t, i) => {
        const active = t.kind === current;
        return (
          <Link
            key={t.kind}
            href={t.kind === "all" ? "/goals" : `/goals?kind=${t.kind}`}
            aria-current={active ? "page" : undefined}
            style={{
              ...tabBase,
              background: active ? "var(--cosmos-2)" : "transparent",
              color: active ? "var(--terminal-cyan)" : "var(--ink-3)",
              borderRight: i < tabs.length - 1 ? "1px solid var(--line)" : "none",
              borderTop: active ? "2px solid var(--terminal-cyan)" : "2px solid transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{t.label}</span>
            <span
              style={{
                fontSize: 9,
                color: active ? "var(--terminal-cyan)" : "var(--ink-4)",
                letterSpacing: "0.10em",
              }}
            >
              [{t.count}]
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────
// KindBadge — the per-goal "EMERGENCY" / "INVEST" pill in the card
// header. Color-coded by category (jupiter for emergency, mercury
// for invest — these are the planet colors that match the vessel
// mapping; the badge text is mono caps with the category word).
// ──────────────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: "EMERGENCY" | "INVEST" }) {
  const color = kind === "EMERGENCY" ? "var(--jupiter)" : "var(--mercury)";
  return (
    <span
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 9,
        fontWeight: 700,
        color,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        border: `1px solid ${color}`,
        borderRadius: 2,
        padding: "2px 7px",
      }}
    >
      {kind === "EMERGENCY" ? "🛟 Emergency" : "📈 Invest"}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// EmptyState — when the kind filter has no matches. Calm, not
// alarming. The user can click "All" to see the rest.
// ──────────────────────────────────────────────────────────────────────

function EmptyState({ kind }: { kind: KindFilter }) {
  return (
    <div
      style={{
        padding: "48px 32px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "2px solid var(--ink-4)",
        borderRadius: 4,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        // no goals in this category yet
      </div>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 15,
          color: "var(--ink-3)",
          margin: "0 0 18px",
          maxWidth: 480,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.5,
        }}
      >
        {kind === "emergency"
          ? "No Emergency Fund goal yet. Create one and tag it as Emergency — it'll show up here, and the deep-link from the old /emergency page will land on it."
          : "No Investment goal yet. Create one and tag it as Invest — it'll show up here, and the deep-link from the old /invest page will land on it."}
      </p>
      <Link
        href="/goals"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--terminal-cyan)",
          textDecoration: "none",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        ← Back to all goals
      </Link>
    </div>
  );
}
