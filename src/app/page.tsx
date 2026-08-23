import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { EnvelopeBarChart } from "@/components/alchemy/EnvelopeBarChart";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { PaycheckSimulator } from "@/components/dashboard/PaycheckSimulator";
import { PlanMyNextCheck } from "@/components/dashboard/PlanMyNextCheck";

// Force-dynamic so the dashboard re-reads the live store after every
// paycheck simulation. Static rendering would freeze the initial seed.
export const dynamic = "force-dynamic";
import {
  liveEnvelopes,
  liveGoals,
  liveSnapshot,
  liveBills,
  livePlan,
  TODAY,
  PERIOD_START,
  PERIOD_END,
  NEXT_PAY_DATE,
} from "@/lib/mock";
import {
  formatLongDate,
  formatPillDate,
  formatPeriodRange,
  formatShortDate,
  dayOfPeriod,
  periodLength,
  formatRelativeDate,
} from "@/lib/format";
import { formatMoney, formatMoneySigned } from "@/lib/money";

/**
 * Compass dashboard — v7 guiding flow.
 * Per 00-DESIGN.md §0a/§7: the dashboard is a guiding flow, NOT a
 * data dump. It orients the user, surfaces their top priority,
 * invites exploration of the deep pages.
 */
export default async function Dashboard() {
  const user = await requireUser();

  // Live reads: the simulator and other actions mutate the in-memory
  // store, and force-dynamic ensures every render re-runs these reads.
  const ENVELOPES = liveEnvelopes();
  const GOALS = liveGoals();
  const SNAPSHOT = liveSnapshot();
  const BILLS = liveBills();
  const PLAN = livePlan();
  const NEXT_PAYCHECK_CENTS = SNAPSHOT.nextPaycheckCents;

  const topGoal = GOALS.find((g) => g.isPrimary) ?? GOALS[0];
  if (!topGoal) {
    throw new Error("No goals seeded — at least one goal is required for the dashboard.");
  }
  const otherGoals = GOALS.filter((g) => g.id !== topGoal.id);
  const totalDays = periodLength(PERIOD_START, PERIOD_END);
  const day = dayOfPeriod(TODAY, PERIOD_START, PERIOD_END);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <div style={{ padding: "48px 80px 96px", maxWidth: 1480, position: "relative" }}>
        {/* ============== WELCOME ============== */}
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 32,
            alignItems: "flex-end",
            paddingBottom: 24,
            marginBottom: 56,
            borderBottom: "1px solid var(--line)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10,
                color: "var(--ink-3)",
                fontWeight: 500,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              {formatLongDate(TODAY)}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontWeight: 400,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "0.005em",
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Good evening, <em style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", color: "var(--gold-glow)", fontWeight: 500 }}>Mom.</em>
            </h1>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 18,
                lineHeight: 1.5,
                color: "var(--ink-2)",
                maxWidth: 640,
                margin: "6px 0 0",
              }}
            >
              Compass is your guide to where your money is going — and where you want it to go. Set your priorities. Watch them grow.
            </p>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "7px 14px",
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
            }}
          >
            <span style={{ color: "var(--gold)", fontSize: 14, lineHeight: 1 }}>☉</span>
            {formatPeriodRange(PERIOD_START, PERIOD_END)} · {totalDays} days
          </div>
        </header>

        {/* ============== TOP PRIORITY ============== */}
        <section
          style={{
            background:
              "radial-gradient(ellipse at 100% 0%, rgba(154, 122, 192, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(212, 175, 82, 0.06) 0%, transparent 50%), var(--surface)",
            border: "1px solid var(--jupiter)",
            borderRadius: 4,
            padding: "40px 44px 36px",
            marginBottom: 56,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--jupiter)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>✺</span>
              Your top priority
            </div>
            <a
              href="/goals"
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                padding: "6px 12px",
                border: "1px solid var(--line)",
                borderRadius: 2,
                textDecoration: "none",
              }}
            >
              Change priority
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 48, alignItems: "center" }}>
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontWeight: 400,
                  fontSize: 48,
                  lineHeight: 1.05,
                  letterSpacing: "0.005em",
                  margin: "0 0 12px",
                  color: "var(--ink)",
                }}
              >
                {topGoal.name}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: "var(--ink-2)",
                  margin: "0 0 24px",
                  maxWidth: 520,
                }}
              >
                {topGoal.description}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 20 }}>
                <span
                  style={{
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 56,
                    lineHeight: 1,
                    color: "var(--jupiter)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney(topGoal.currentCents)}
                </span>
                <span style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 24, color: "var(--ink-3)" }}>of</span>
                <span
                  style={{
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 32,
                    lineHeight: 1,
                    color: "var(--ink-3)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney(topGoal.targetCents)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    color: "var(--jupiter)",
                    marginLeft: 4,
                    fontWeight: 500,
                  }}
                >
                  {Math.round((topGoal.currentCents / topGoal.targetCents) * 100)}%
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 8,
                  background: "var(--cosmos)",
                  border: "1px solid var(--line-soft)",
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: `${Math.min((topGoal.currentCents / topGoal.targetCents) * 100, 100)}%`,
                    background: "linear-gradient(90deg, var(--jupiter), var(--venus))",
                    boxShadow: "0 0 12px var(--jupiter)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 14,
                  color: "var(--ink-2)",
                }}
              >
                <span>
                  Target reached <b style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{formatShortDate(topGoal.targetDate)}</b> ·{" "}
                  {Math.max(
                    0,
                    Math.ceil((topGoal.targetDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24 * 30)),
                  )}{" "}
                  months away
                </span>
                <span>
                  +{formatMoney(topGoal.perPaycheckCents)} / paycheck
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                paddingLeft: 24,
                borderLeft: "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: 9.5,
                  color: "var(--ink-3)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Saving into
              </div>
              <div style={{ fontSize: 64, lineHeight: 1, color: "var(--jupiter)", filter: "drop-shadow(0 0 16px rgba(154, 122, 192, 0.5))" }}>
                <VesselGlyph planet={topGoal.planet} size={64} />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontSize: 20,
                  color: "var(--ink)",
                }}
              >
                {topGoal.planet === "jupiter" ? "Jupiter · Savings" : topGoal.planet}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "var(--ink-3)",
                  textAlign: "center",
                  lineHeight: 1.4,
                  maxWidth: 280,
                  marginTop: 4,
                }}
              >
                &ldquo;{topGoal.description}&rdquo;
              </div>
            </div>
          </div>
        </section>

        {/* ============== OTHER GOALS ============== */}
        <section style={{ marginBottom: 72 }}>
          <SectionHead
            title="Other Goals"
            em="also on your path."
            meta={
              <>
                Set these as your top priority any time from the <b>Goals</b> page.
              </>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            {otherGoals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </section>

        {/* ============== PAYCHECK SIMULATOR ============== */}
        <PaycheckSimulator />

        {/* ============== PLAN MY NEXT CHECK (Cluster 1.8) ============== */}
        <PlanMyNextCheck
          bills={BILLS}
          plan={PLAN}
          envelopes={ENVELOPES.map((e) => ({ id: e.id, planet: e.planet }))}
          paycheckCents={NEXT_PAYCHECK_CENTS}
          periodStart={PERIOD_START}
          periodEnd={PERIOD_END}
          nextPayDate={NEXT_PAY_DATE}
        />

        {/* ============== ENVELOPES ============== */}
        <section style={{ marginBottom: 72 }}>
          <SectionHead
            title="Envelopes"
            em="at a glance."
            meta={
              <>
                Each envelope has a target. The bar shows how full it is. <b>Over limit</b> means you&apos;ve spent more than the target.
              </>
            }
          />
          <EnvelopeBarChart envelopes={ENVELOPES} pacing={{ day, total: totalDays }} />
        </section>

        {/* ============== SNAPSHOT ============== */}
        <section style={{ marginBottom: 72 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <SnapshotCell
              label={`Net Worth · Day ${day} of ${totalDays}`}
              value={formatMoney(SNAPSHOT.netWorthCents)}
              sub={formatMoneySigned(SNAPSHOT.periodDeltaCents) + " this period"}
            />
            <SnapshotCell
              label="Next Paycheck"
              value={formatMoney(SNAPSHOT.nextPaycheckCents)}
              sub={`${formatRelativeDate(NEXT_PAY_DATE, TODAY)} · ${formatPillDate(NEXT_PAY_DATE)}`}
              accent="gold"
            />
            <SnapshotCell
              label="This Period"
              value={`${day} of ${totalDays}`}
              sub={formatPeriodRange(PERIOD_START, PERIOD_END)}
              accent="pos"
            />
          </div>
        </section>

        {/* ============== EXPLORE ============== */}
        <section style={{ marginBottom: 72 }}>
          <SectionHead
            title="Explore Compass"
            em="each area fully explained."
            meta={
              <>
                Every page in the sidebar is a room of its own. Click any of these to go deeper.
              </>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <ExploreCard href="/period"        glyph="☽" title="This Period"    body="The two weeks between paychecks. The full breakdown, day by day, with what came in and what went out." />
            <ExploreCard href="/envelopes"     glyph="⚱" title="Envelopes"     body="Each envelope has a purpose. Set the target, watch them fill, know what's available before you spend." />
            <ExploreCard href="/allocation"    glyph="⚹" title="Allocation Plan" body="Pick a strategy, set the percentages. Compass runs it on every paycheck. No confirm, no friction." />
            <ExploreCard href="/calendar"      glyph="✦" title="Calendar"      body="Paydays, goal targets, and your spending at a glance. The whole month, on one page." />
            <ExploreCard href="/debts"         glyph="⚸" title="Debts"         body="One line per debt. See the balance, the interest, the path to zero. Avalanche or snowball — your call." />
            <ExploreCard href="/transactions"  glyph="⚜" title="Transactions"  body="Every dollar in and out, organized by day. Search, filter, tag. The full record of your money." />
          </div>
        </section>

        {/* ============== NEXT STEP ============== */}
        <NextStep envelopes={ENVELOPES} />

        {/* ============== COLOPHON ============== */}
        <footer
          style={{
            marginTop: 80,
            paddingTop: 24,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          <span>Compass</span>
          <em style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", color: "var(--gold)", textTransform: "none", letterSpacing: "0.01em" }}>
            Your money, on a path.
          </em>
          <span>2026 · Q3</span>
        </footer>
      </div>
    </div>
  );
}

// ---------- Section subcomponents ----------

function SectionHead({
  title,
  em,
  meta,
}: {
  title: string;
  em?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 32,
        paddingBottom: 16,
        borderBottom: "1px solid var(--line)",
        position: "relative",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 32,
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
              marginLeft: 6,
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

function GoalCard({
  goal,
}: {
  goal: ReturnType<typeof liveGoals>[number];
}) {
  const pct = Math.min((goal.currentCents / goal.targetCents) * 100, 100);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "24px 28px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            background:
              goal.planet === "saturn"
                ? "rgba(106, 112, 138, 0.15)"
                : goal.planet === "venus"
                ? "rgba(212, 165, 120, 0.15)"
                : "rgba(154, 122, 192, 0.15)",
            color:
              goal.planet === "saturn"
                ? "var(--saturn)"
                : goal.planet === "venus"
                ? "var(--venus)"
                : "var(--jupiter)",
          }}
        >
          <VesselGlyph planet={goal.planet} size={18} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
            fontSize: 20,
            color: "var(--ink)",
          }}
        >
          {goal.name}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: 5,
          background: "var(--cosmos)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background:
              goal.planet === "saturn"
                ? "var(--saturn)"
                : goal.planet === "venus"
                ? "var(--venus)"
                : "var(--jupiter)",
            boxShadow:
              goal.planet === "saturn"
                ? "0 0 8px var(--saturn)"
                : goal.planet === "venus"
                ? "0 0 8px var(--venus)"
                : "0 0 8px var(--jupiter)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11.5,
        }}
      >
        <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>
          {formatMoney(goal.currentCents)}
        </span>
        <span style={{ color: "var(--ink-3)" }}>
          of {formatMoney(goal.targetCents)}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-3)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          {goal.targetDate > TODAY ? "Free by" : "Target"}{" "}
          <b
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontStyle: "normal",
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {formatShortDate(goal.targetDate)}
          </b>
        </span>
        <span style={{ color: "var(--ink-2)" }}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function SnapshotCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "gold" | "pos";
}) {
  return (
    <div
      style={{
        padding: "22px 28px",
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
          fontSize: 30,
          lineHeight: 1,
          color:
            accent === "gold" ? "var(--gold)" : accent === "pos" ? "var(--ok)" : "var(--ink)",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          marginTop: 8,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function ExploreCard({
  href,
  glyph,
  title,
  body,
}: {
  href: string;
  glyph: string;
  title: string;
  body: string;
}) {
  return (
    <a
      href={href}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "24px 26px 22px",
        display: "flex",
        flexDirection: "column",
        minHeight: 200,
        position: "relative",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          marginBottom: 16,
          color: "var(--gold)",
        }}
      >
        {glyph}
      </div>
      <h3
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontSize: 22,
          margin: "0 0 6px",
          fontWeight: 400,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 14,
          lineHeight: 1.45,
          color: "var(--ink-2)",
          margin: "0 0 16px",
          flex: 1,
        }}
      >
        {body}
      </p>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 14,
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          Open →
        </span>
      </div>
    </a>
  );
}

/**
 * NextStep — the live attention rail at the bottom of the dashboard.
 *
 * Reads the live envelope state and surfaces the urgent thing in plain
 * English. Two states:
 *  - overLimit.length > 0 → "N envelopes are over limit" with a per-envelope
 *    breakdown (name, current of target, $over). Coral wash on the surface
 *    to set the urgency without sacrificing contrast — body text is full
 *    ink (--ink on --surface passes WCAG AA at 7.4:1), over-limit names
 *    are iron-red bold, the icon stays a clean iron-red ring.
 *  - overLimit.length === 0 → "All envelopes within target" in a calm
 *    jade accent, so the rail is always present, always meaningful.
 *
 * Per v1 locked contract (D16): envelopes enforce, not just display.
 * This is the enforcement surfaced as a sentence, not a warning icon.
 */
function NextStep({
  envelopes,
}: {
  envelopes: ReturnType<typeof liveEnvelopes>;
}) {
  const overLimit = envelopes
    .filter((e) => e.target > 0 && e.current > e.target)
    .sort((a, b) => b.current - b.current - (b.target - a.target));

  const count = overLimit.length;
  const allCalm = count === 0;

  return (
    <section style={{ marginBottom: 0 }}>
      <div
        style={{
          background: allCalm
            ? "radial-gradient(ellipse at 0% 50%, rgba(106, 176, 136, 0.10) 0%, transparent 60%), var(--surface)"
            : "radial-gradient(ellipse at 0% 50%, rgba(196, 90, 58, 0.16) 0%, transparent 60%), var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: `3px solid ${allCalm ? "var(--ok)" : "var(--neg)"}`,
          borderRadius: 4,
          padding: "28px 36px",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            background: allCalm ? "rgba(106, 176, 136, 0.12)" : "rgba(196, 90, 58, 0.14)",
            color: allCalm ? "var(--ok)" : "var(--neg)",
            border: `1px solid ${allCalm ? "var(--ok)" : "var(--neg)"}`,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {allCalm ? "✓" : "!"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: allCalm ? "var(--ok)" : "var(--neg)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Your next step
          </div>
          {allCalm ? (
            <>
              <h3
                style={{
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontSize: 22,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                All envelopes are within target.
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 15,
                  color: "var(--ink-2)",
                  margin: 0,
                }}
              >
                Nice pace. Keep going, and the next paycheck will top up the ones that need it.
              </p>
            </>
          ) : (
            <>
              <h3
                style={{
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontSize: 22,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                {count === 1
                  ? "One envelope is over limit — see what happened."
                  : `${count} envelopes are over limit — see what happened.`}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 15,
                  color: "var(--ink)",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {overLimit.map((e, i) => {
                  const overage = e.current - e.target;
                  const sep =
                    i === 0
                      ? ""
                      : i === overLimit.length - 1
                      ? " and "
                      : ", ";
                  return (
                    <span key={e.id}>
                      {sep}
                      <b style={{ color: "var(--neg)", fontWeight: 600 }}>{e.name}</b>{" "}
                      is at{" "}
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                          color: "var(--ink)",
                          fontWeight: 500,
                        }}
                      >
                        {formatMoney(e.current)}
                      </span>{" "}
                      of {formatMoney(e.target)}{" "}
                      <span
                        style={{
                          fontStyle: "italic",
                          color: "var(--ink-3)",
                        }}
                      >
                        (+{formatMoney(overage)})
                      </span>
                    </span>
                  );
                })}
                . Open Envelopes to see where the overage came from.
              </p>
            </>
          )}
        </div>
        {!allCalm && (
          <a
            href="/envelopes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--ink)",
              color: "var(--cosmos)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              flexShrink: 0,
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(236, 230, 211, 0.12)",
            }}
          >
            Review →
          </a>
        )}
      </div>
    </section>
  );
}
