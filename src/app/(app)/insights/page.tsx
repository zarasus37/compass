import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { liveEnvelopesFromDb, liveGoalsFromDb, liveSnapshot, liveTransactions, TODAY } from "@/lib/mock";
import { formatMoney, formatMoneyCompact, formatMoneySigned } from "@/lib/money";
import { NetTrajectoryCard } from "@/components/dashboard/cards/net-trajectory";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * Insights — overview / patterns page.
 *
 * Two visualizations up top:
 *   1. **Ouroboros** — the per-paycheck allocation donut, computed
 *      live from envelope targets. Center shows the next paycheck
 *      amount.
 *   2. **Trajectory** — 12-month net-worth projection at the
 *      current period pace, rendered with <NetTrajectoryCard>.
 *      The emergency-fund target is the dashed reference line.
 *
 * Below: 4 dynamic stat cells — net worth, period delta, on-track
 * count, and weekly pace — all computed from the live store, no
 * hardcoded placeholders.
 *
 * Component Oracle Terminal treatment: Sora titles, JetBrains Mono
 * for amounts and labels, mono caps headers with // prefix, planet
 * accent colors. Same visual language as the dashboard.
 *
 * Cluster 5.2.6 widget switch: the envelope + goal reads now come
 * from Prisma (liveEnvelopesFromDb + liveGoalsFromDb). The
 * Transaction read + Snapshot are still in-memory — the
 * Transaction table isn't migrated in this cluster (out of scope
 * per the handoff), and the in-memory snapshot depends on it. A
 * future cluster can flip the snapshot's account + transactions
 * sources to Prisma and migrate this page's remaining reads.
 */
export default async function InsightsPage() {
  const user = await requireUser();
  const [ENVELOPES, GOALS] = await Promise.all([
    liveEnvelopesFromDb(user.id),
    liveGoalsFromDb(user.id),
  ]);
  const SNAPSHOT = liveSnapshot();
  const TRANSACTIONS = liveTransactions();
  const total = ENVELOPES.reduce((s, e) => s + e.target, 0);

  // --- NetTrajectoryCard data (mirrors the dashboard's data prep) ---
  const monthlyDeltaCents = Math.max(0, SNAPSHOT.periodDeltaCents) * 2;
  const emergencyGoal =
    GOALS.find((g) => /emergency/i.test(g.name)) ?? GOALS[0] ?? null;
  const emergencyTargetCents = emergencyGoal?.targetCents ?? 2_000_000;
  const monthLabels: string[] = [];
  {
    const d = new Date(TODAY);
    for (let i = 0; i < 12; i += 1) {
      monthLabels.push(
        d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      );
      d.setMonth(d.getMonth() + 1);
    }
  }

  // --- Summary stats (dynamic) ---
  // Envelopes within target vs. envelopes with a target at all.
  const envelopesWithTarget = ENVELOPES.filter((e) => e.target > 0);
  const envelopesOnTrack = envelopesWithTarget.filter(
    (e) => e.current <= e.target,
  );
  const onTrackValue = `${envelopesOnTrack.length} / ${envelopesWithTarget.length}`;

  // Transaction counts in the current period — for the "this period" sub.
  // (We use the full transactions list; period filtering happens implicitly
  // because the mock seed only populates the current period for v1.)
  const incomeCount = TRANSACTIONS.filter((t) => t.isIncome).length;
  const expenseCount = TRANSACTIONS.filter((t) => !t.isIncome).length;

  // Weekly pace — period is biweekly, so divide by 2.
  const weeklyDeltaCents = Math.round(SNAPSHOT.periodDeltaCents / 2);
  const weeklyPct =
    SNAPSHOT.netWorthCents > 0
      ? (weeklyDeltaCents / SNAPSHOT.netWorthCents) * 100
      : 0;

  return (
    <div>
      <PageHead
        eyebrow="// overview · insights"
        title="The Patterns"
        em="what your money is telling you."
        accent="cyan"
        explanation={
          <>
            The patterns in your money, at a glance. The Ouroboros shows where each paycheck goes by vessel; the Trajectory shows the next 12 months of net worth projected at this pace. The four cells below are the headline numbers — net worth, period delta, on-track count, and weekly pace. All values are live from the store.
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 32,
          marginBottom: 32,
        }}
      >
        {/* OUROBOROS — allocation donut, dynamic */}
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
                  const color = e.planet
                    ? PLANET_COLORS[e.planet as PlanetId]
                    : "var(--ink-3)";
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
                        background: e.planet
                          ? PLANET_COLORS[e.planet as PlanetId]
                          : "var(--ink-3)",
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

        {/* TRAJECTORY — 12-month net-worth projection (dynamic) */}
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
            Projected at current pace, with paychecks, allocations, and debt payoff. Emergency-fund target shown as the gold reference line.
          </p>
          <NetTrajectoryCard
            data={{
              currentCents: SNAPSHOT.netWorthCents,
              monthlyDeltaCents,
              emergencyTargetCents,
              monthLabels,
            }}
          />
        </section>
      </div>

      {/* Summary stats — all values dynamic */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <SummaryStat
          label="net worth"
          value={formatMoney(SNAPSHOT.netWorthCents)}
          sub={`${formatMoneySigned(SNAPSHOT.periodDeltaCents)} this period`}
          accent={SNAPSHOT.periodDeltaCents >= 0 ? "ok" : "neg"}
        />
        <SummaryStat
          label="this period"
          value={formatMoneySigned(SNAPSHOT.periodDeltaCents)}
          sub={`${incomeCount} income · ${expenseCount} expenses`}
          borderLeft
          accent={SNAPSHOT.periodDeltaCents >= 0 ? "ok" : "neg"}
        />
        <SummaryStat
          label="on track"
          value={onTrackValue}
          sub="envelopes within target"
          borderLeft
          accent={
            envelopesOnTrack.length === envelopesWithTarget.length ? "ok" : "warn"
          }
        />
        <SummaryStat
          label="pace"
          value={
            weeklyDeltaCents >= 0
              ? `+${formatMoneyCompact(weeklyDeltaCents)} / wk`
              : `${formatMoneyCompact(weeklyDeltaCents)} / wk`
          }
          sub={`${weeklyPct >= 0 ? "+" : ""}${weeklyPct.toFixed(1)}% net worth / wk`}
          borderLeft
          accent={weeklyDeltaCents >= 0 ? "ok" : "neg"}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryStat — a single cell in the 4-cell grid.
// Mirrors the visual language of the other stat cells in the app
// (mono caps label, big mono number, mono sub) but with an explicit
// accent prop so positive values can read teal/green.
// ---------------------------------------------------------------------------

function SummaryStat({
  label,
  value,
  sub,
  accent,
  borderLeft,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok" | "neg" | "warn";
  borderLeft?: boolean;
}) {
  const valueColor =
    accent === "neg"
      ? "var(--neg)"
      : accent === "warn"
        ? "var(--warn)"
        : accent === "ok"
          ? "var(--ok)"
          : "var(--ink)";
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: borderLeft ? "1px solid var(--line-soft)" : "none",
        borderLeft: borderLeft ? "1px solid var(--line-soft)" : undefined,
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
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 24,
          fontWeight: 600,
          color: valueColor,
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          letterSpacing: "-0.005em",
        }}
      >
        {value}
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
        {sub}
      </div>
    </div>
  );
}
