import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DailyTrackingCard } from "@/components/dashboard/cards/daily-tracking";
import { CriticalTimelineCard } from "@/components/dashboard/cards/critical-timeline";
import { EnvelopeStatusCard } from "@/components/dashboard/cards/envelope-status";
import { TopPriorityCard } from "@/components/dashboard/cards/top-priority";
import { NextStepCard } from "@/components/dashboard/cards/next-step";
import { SnapshotCard } from "@/components/dashboard/cards/snapshot";
import { CARD_META, type CardId } from "@/components/dashboard/catalog";
import {
  liveEnvelopes,
  liveGoals,
  liveSnapshot,
  liveBills,
  livePlan,
  liveTransactions,
  TODAY,
  PERIOD_START,
  PERIOD_END,
  NEXT_PAY_DATE,
} from "@/lib/mock";
import {
  paycheckBreakdown,
  billsDueInPeriod,
  safeToSpend,
} from "@/lib/store";
import {
  formatLongDate,
  formatPeriodRange,
  dayOfPeriod,
  periodLength,
} from "@/lib/format";

// Force-dynamic so the dashboard re-reads the live store after every
// paycheck simulation. Static rendering would freeze the initial seed.
export const dynamic = "force-dynamic";

/**
 * Compass dashboard — v8 card-based, customizable.
 *
 * Per Cluster 2.0 (Dashboard Refactor, 2026-08-23): the dashboard
 * is a scrollable, tap-through card grid. Each card carries a
 * single number or short list and routes the user to the
 * deep-dive tab where the full data lives. The user can add,
 * remove, and reorder cards; the layout persists to localStorage.
 *
 * The page is a server component. It computes every card's data
 * from the live store, builds a `cardNodes` map, and hands it to
 * the client `<DashboardGrid>` which manages order / visibility
 * / edit mode + dnd-kit drag-and-drop.
 */
export default async function Dashboard() {
  const user = await requireUser();

  // Live reads
  const ENVELOPES = liveEnvelopes();
  const GOALS = liveGoals();
  const SNAPSHOT = liveSnapshot();
  const BILLS = liveBills();
  const PLAN = livePlan();
  const TRANSACTIONS = liveTransactions();
  const NEXT_PAYCHECK_CENTS = SNAPSHOT.nextPaycheckCents;

  const totalDays = periodLength(PERIOD_START, PERIOD_END);
  const day = dayOfPeriod(TODAY, PERIOD_START, PERIOD_END);
  const topGoal = GOALS.find((g) => g.isPrimary) ?? GOALS[0] ?? null;

  // -------------------------------------------------------------------------
  // Compute the data payload for every card. The client grid decides
  // which ones to render; the server pre-renders the bodies so SSR
  // works.
  // -------------------------------------------------------------------------

  // --- DAILY TRACKING ---
  const breakdown = paycheckBreakdown(
    NEXT_PAYCHECK_CENTS,
    BILLS,
    PLAN,
    ENVELOPES.map((e) => ({ id: e.id, planet: e.planet })),
    PERIOD_START,
    PERIOD_END,
  );
  const safeCents = safeToSpend(breakdown);
  // 7-day window: oldest first, today last.
  // Used by the Weekly Health sparkline (Daily Tracking card).
  const last7Days: Date[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(TODAY);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    last7Days.push(d);
  }
  const dailySpendCents: number[] = last7Days.map((day) => {
    const start = day.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return TRANSACTIONS.filter(
      (t) => !t.isIncome && t.date.getTime() >= start && t.date.getTime() < end,
    ).reduce((s, t) => s + Math.abs(t.amountCents), 0);
  });
  const todaySpentCents = dailySpendCents[6] ?? 0;
  const weeklyAvgPerDayCents = Math.round(
    dailySpendCents.reduce((s, v) => s + v, 0) / 7,
  );

  // --- CRITICAL TIMELINE ---
  const due = billsDueInPeriod(BILLS, PERIOD_START, PERIOD_END);
  const unpaid = due.filter((d) => !d.paidThisPeriod);
  // For the list: 3 most-imminent unpaid bills.
  const allUpcomingUnpaid = unpaid
    .map((d) => {
      const env = d.bill.envelopeId
        ? ENVELOPES.find((e) => e.id === d.bill.envelopeId)
        : null;
      return {
        id: d.bill.id,
        name: d.bill.name,
        amountCents: d.bill.amountCents,
        dueDate: d.dueDate,
        isPaid: d.paidThisPeriod,
        autopay: d.bill.autopay,
        envelopeName: env?.name ?? null,
        planet: env?.planet ?? null,
      };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3);
  // For the strip: every bill due in the period (paid + unpaid),
  // with the day-of-period index so the strip can place dots.
  const allDueThisPeriod = due
    .map((d) => {
      const env = d.bill.envelopeId
        ? ENVELOPES.find((e) => e.id === d.bill.envelopeId)
        : null;
      const dayIndex = Math.max(
        0,
        Math.min(
          13,
          Math.floor(
            (d.dueDate.getTime() - PERIOD_START.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
      );
      return {
        id: d.bill.id,
        name: d.bill.name,
        amountCents: d.bill.amountCents,
        dueDate: d.dueDate,
        isPaid: d.paidThisPeriod,
        autopay: d.bill.autopay,
        envelopeName: env?.name ?? null,
        planet: env?.planet ?? "mercury",
        dayIndex,
      };
    })
    .sort((a, b) => a.dayIndex - b.dayIndex);

  // --- ENVELOPE STATUS ---
  type EnvelopeStatusKind = "over" | "watch" | "calm";
  // Per-envelope per-day spend for the last 7 days (oldest first).
  // Drives the per-row burn sparkline.
  const spendByEnvelope: Record<string, number[]> = {};
  for (const e of ENVELOPES) {
    spendByEnvelope[e.id] = last7Days.map((day) => {
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return TRANSACTIONS.filter(
        (t) =>
          t.envelopeId === e.id &&
          !t.isIncome &&
          t.date.getTime() >= start &&
          t.date.getTime() < end,
      ).reduce((s, t) => s + Math.abs(t.amountCents), 0);
    });
  }
  const envelopesRanked = ENVELOPES.map((e): {
    id: string;
    name: string;
    planet: typeof e.planet;
    currentCents: number;
    targetCents: number;
    status: EnvelopeStatusKind;
    burnCents: number[]; // 7-element per-day spend for the sparkline
  } => {
    const status: EnvelopeStatusKind =
      e.target > 0 && e.current > e.target
        ? "over"
        : e.target > 0 && e.current / e.target >= 0.8
        ? "watch"
        : "calm";
    return {
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.current,
      targetCents: e.target,
      status,
      burnCents: spendByEnvelope[e.id] ?? new Array(7).fill(0),
    };
  })
    .sort((a, b) => {
      // Over first (by overage desc), then watch (by ratio desc), then calm.
      const order: Record<EnvelopeStatusKind, number> = { over: 0, watch: 1, calm: 2 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      const ratioA = a.currentCents / Math.max(a.targetCents, 1);
      const ratioB = b.currentCents / Math.max(b.targetCents, 1);
      return ratioB - ratioA;
    })
    .slice(0, 3);

  // --- NEXT STEP ---
  const overLimit = ENVELOPES.filter(
    (e) => e.target > 0 && e.current > e.target,
  ).map((e) => ({
    id: e.id,
    name: e.name,
    current: e.current,
    target: e.target,
  }));

  // -------------------------------------------------------------------------
  // Build the cardNodes map. Each entry is a pre-rendered <DashboardCard>
  // ready for the grid to slot in.
  // -------------------------------------------------------------------------

  const dt = CARD_META["daily-tracking"];
  const ct = CARD_META["critical-timeline"];
  const es = CARD_META["envelope-status"];
  const tp = CARD_META["top-priority"];
  const nx = CARD_META["next-step"];
  const sn = CARD_META["snapshot"];

  const cardNodes: Record<CardId, React.ReactNode> = {
    "daily-tracking": (
      <DashboardCard
        cardId="daily-tracking"
        href={dt.href}
        eyebrow={dt.eyebrow}
        title={dt.title}
        em={dt.em}
        accent={dt.accent}
      >
        <DailyTrackingCard
          data={{
            safeToSpendCents: safeCents,
            todaySpentCents,
            weeklyAvgPerDayCents,
            dailySpendCents,
            last7Days,
            periodStart: PERIOD_START,
            periodEnd: PERIOD_END,
            breakdown,
          }}
        />
      </DashboardCard>
    ),
    "critical-timeline": (
      <DashboardCard
        cardId="critical-timeline"
        href={ct.href}
        eyebrow={ct.eyebrow}
        title={ct.title}
        em={ct.em}
        accent={ct.accent}
      >
        <CriticalTimelineCard
          data={{
            listRows: allUpcomingUnpaid,
            stripRows: allDueThisPeriod,
            periodStart: PERIOD_START,
            periodEnd: PERIOD_END,
            today: TODAY,
          }}
        />
      </DashboardCard>
    ),
    "envelope-status": (
      <DashboardCard
        cardId="envelope-status"
        href={es.href}
        eyebrow={es.eyebrow}
        title={es.title}
        em={es.em}
        accent={es.accent}
      >
        <EnvelopeStatusCard data={{ rows: envelopesRanked, totalOver: overLimit.length }} />
      </DashboardCard>
    ),
    "next-step": (
      <DashboardCard
        cardId="next-step"
        href={nx.href}
        eyebrow={nx.eyebrow}
        title={nx.title}
        em={nx.em}
        accent={nx.accent}
        rightMeta={
          <span
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {overLimit.length === 0 ? "All calm" : `${overLimit.length} need attention`}
          </span>
        }
      >
        <NextStepCard data={{ overLimit }} />
      </DashboardCard>
    ),
    "top-priority": (
      <DashboardCard
        cardId="top-priority"
        href={tp.href}
        eyebrow={tp.eyebrow}
        title={tp.title}
        em={tp.em}
        accent={tp.accent}
      >
        <TopPriorityCard
          data={
            topGoal
              ? {
                  id: topGoal.id,
                  name: topGoal.name,
                  planet: topGoal.planet,
                  currentCents: topGoal.currentCents,
                  targetCents: topGoal.targetCents,
                  targetDate: topGoal.targetDate,
                  perPaycheckCents: topGoal.perPaycheckCents,
                }
              : null
          }
        />
      </DashboardCard>
    ),
    "snapshot": (
      <DashboardCard
        cardId="snapshot"
        href={sn.href}
        eyebrow={sn.eyebrow}
        title={sn.title}
        em={sn.em}
        accent={sn.accent}
      >
        <SnapshotCard
          data={{
            netWorthCents: SNAPSHOT.netWorthCents,
            periodDeltaCents: SNAPSHOT.periodDeltaCents,
            nextPaycheckCents: NEXT_PAYCHECK_CENTS,
            nextPayDate: NEXT_PAY_DATE,
            periodStart: PERIOD_START,
            periodEnd: PERIOD_END,
            day,
            totalDays,
          }}
        />
      </DashboardCard>
    ),
  };

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
            marginBottom: 40,
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
              Your dashboard, your way. Tap any card to go deeper — and tap the pencil to make it yours.
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

        {/* ============== CARD GRID ============== */}
        <DashboardGrid cardNodes={cardNodes} />

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
