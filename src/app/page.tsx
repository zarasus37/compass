import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { MustHaveToolsStrip } from "@/components/dashboard/MustHaveToolsStrip";
import { SwipeableDashboardHeader } from "@/components/dashboard/SwipeableDashboardHeader";
import { type HorizonStripDay, type HorizonStripData } from "@/components/dashboard/cards/horizon-strip";
import { DailyTrackingCard } from "@/components/dashboard/cards/daily-tracking";
import { CriticalTimelineCard } from "@/components/dashboard/cards/critical-timeline"; // (legacy — used by deprecated critical-timeline card on the dashboard grid)
import { EnvelopeStatusCard } from "@/components/dashboard/cards/envelope-status";
import { TopPriorityCard } from "@/components/dashboard/cards/top-priority";
import { NextStepCard } from "@/components/dashboard/cards/next-step";
import { SnapshotCard } from "@/components/dashboard/cards/snapshot";
import { SpendRingCard } from "@/components/dashboard/cards/spend-ring";
import { NetTrajectoryCard } from "@/components/dashboard/cards/net-trajectory";
import { PayDistributionCard } from "@/components/dashboard/cards/pay-distribution";
import { AllocationFeed, type AllocationRow } from "@/components/dashboard/AllocationFeed";
import { BottomNav } from "@/components/shell/BottomNav";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { RebalanceAlertBay } from "@/components/alerts/RebalanceAlertBay";
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

  // 14-day window for the Scrollable Vessel Feed's background sparkline
  // (Cluster 3.x Component 4). Oldest first, today last. Kept separate
  // from the 7-day window above so the Daily Tracking card's compact
  // 7-day shape doesn't change.
  const last14Days: Date[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(TODAY);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    last14Days.push(d);
  }
  const spendByEnvelope14: Record<string, number[]> = {};
  for (const e of ENVELOPES) {
    spendByEnvelope14[e.id] = last14Days.map((day) => {
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

  // --- CRITICAL TIMELINE (month calendar + scheduled bills list) ---
  // The calendar shows the current month (Aug 2026). Every recurring
  // bill with a `dueDay` lands on that day each month; goal target
  // dates are matched by exact date; transactions on a day add a
  // small gold dot. Hover any day with a bill to see name + amount.
  const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const monthEnd = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1);

  // Bills for the calendar (every recurring bill is shown every month).
  const calendarBills = BILLS.map((b) => ({
    id: b.id,
    name: b.name,
    amountCents: b.amountCents,
    dueDay: b.dueDay,
    autopay: b.autopay,
  }));

  // Goals whose targetDate falls within the current month.
  const calendarGoals = GOALS.filter(
    (g) =>
      g.targetDate.getTime() >= monthStart.getTime() &&
      g.targetDate.getTime() < monthEnd.getTime(),
  ).map((g) => ({
    id: g.id,
    name: g.name,
    targetDate: g.targetDate,
    planet: g.planet,
  }));

  // Days (start-of-day timestamps) with any transaction in the current month.
  const transactionDays = new Set<number>();
  for (const t of TRANSACTIONS) {
    const ts = t.date.getTime();
    if (ts >= monthStart.getTime() && ts < monthEnd.getTime()) {
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      transactionDays.add(d.getTime());
    }
  }

  // Scheduled bills list — every bill due this month with its actual
  // day-of-month. We re-derive the actual due date for the current
  // month (the recurring `dueDay` is a day-of-month, not a date).
  // The `isPaid` flag checks the live store for whether this bill
  // was marked paid in the current pay period.
  const due = billsDueInPeriod(BILLS, PERIOD_START, PERIOD_END);
  const lastDayOfMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  const monthListRows = BILLS.map((b) => {
    const env = b.envelopeId
      ? ENVELOPES.find((e) => e.id === b.envelopeId)
      : null;
    const dayOfMonth = b.dueDay;
    const actualDate = new Date(
      TODAY.getFullYear(),
      TODAY.getMonth(),
      Math.min(dayOfMonth, lastDayOfMonth),
    );
    const inPeriod =
      actualDate.getTime() >= PERIOD_START.getTime() &&
      actualDate.getTime() < PERIOD_END.getTime();
    const isPaid = inPeriod
      ? Boolean(due.find((d) => d.bill.id === b.id)?.paidThisPeriod)
      : false;
    return {
      id: b.id,
      name: b.name,
      amountCents: b.amountCents,
      dayOfMonth,
      dueDate: actualDate,
      isPaid,
      autopay: b.autopay,
      envelopeName: env?.name ?? null,
      planet: env?.planet ?? null,
    };
  }).sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  // --- HORIZON STRIP (Page 1 of the swipeable header) ---
  // One row per day of the current pay period. For each day we match
  // bills (by day-of-month against the day's calendar date) and goals
  // (by exact targetDate). "Transfer" goals — emergency-fund sweeps and
  // the like — are flagged so they read as automatic movements, not
  // discretionary ones.
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Reuse `due` from the critical-timeline block above; it already
  // carries the paidThisPeriod flag for each bill.
  const paidBillIds = new Set(due.filter((d) => d.paidThisPeriod).map((d) => d.bill.id));

  const horizonDays: HorizonStripDay[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(PERIOD_START);
    date.setDate(date.getDate() + i);
    const dayOfMonth = date.getDate();

    const events: HorizonStripDay["events"] = [];

    // Bills — match by day-of-month against the period-day's calendar date.
    for (const b of BILLS) {
      if (b.dueDay === dayOfMonth) {
        const env = b.envelopeId
          ? ENVELOPES.find((e) => e.id === b.envelopeId)
          : null;
        events.push({
          id: `bill-${b.id}-d${i + 1}`,
          kind: "bill",
          name: b.name,
          amountCents: b.amountCents,
          autopay: b.autopay,
          isPaid: paidBillIds.has(b.id),
          planet: env?.planet ?? null,
        });
      }
    }

    // Goals — match by exact targetDate.
    for (const g of GOALS) {
      if (isSameDay(g.targetDate, date)) {
        const isTransfer = /emergency|transfer|sweep|fund/i.test(g.name);
        events.push({
          id: `goal-${g.id}-d${i + 1}`,
          kind: "goal",
          name: g.name,
          amountCents: g.targetCents,
          isTransfer,
          planet: g.planet,
        });
      }
    }

    horizonDays.push({
      day: i + 1,
      date,
      isToday: isSameDay(date, TODAY),
      events,
    });
  }

  const horizonStripData: HorizonStripData = {
    days: horizonDays,
    hasAnyEvent: horizonDays.some((d) => d.events.length > 0),
  };

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
  // Shared over-limit list used by both the NextStepCard (dashboard
  // grid) and the RebalanceAlertBay (contextual alert banner). The
  // shape is the alert-bay's: includes the planet for the vessel
  // glyph + planet-color ring.
  const overLimit = ENVELOPES.filter(
    (e) => e.target > 0 && e.current > e.target,
  ).map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    current: e.current,
    target: e.target,
  }));

  // -------------------------------------------------------------------------
  // VIZ CARDS — must-have visualizations (Cluster 2.x)
  // -------------------------------------------------------------------------

  // --- SPEND RING ---
  // The sum of all envelope targets is the "monthly funds" baseline. The
  // current spend (cumulative outflows this period) fills the ring. The
  // remaining cents are the headline number in the center.
  const totalTargetCents = ENVELOPES.reduce((s, e) => s + e.target, 0);
  // The current `e.current` IS the spend against the target for the
  // pay period — every cent above the target is over-limit, every cent
  // of the target was spent. To make the math more honest: use
  // min(current, target) for under-target envelopes, plus full
  // current for over-target envelopes (the overage counts).
  const burnSpent = ENVELOPES.reduce((s, e) => {
    if (e.target <= 0) return s;
    return s + e.current;
  }, 0);

  // --- NET TRAJECTORY ---
  // 12-month projection at the current period-delta pace. Period is
  // biweekly (D17), so monthly = period * 2.
  const monthlyDeltaCents = Math.max(0, SNAPSHOT.periodDeltaCents) * 2;
  const emergencyGoal = GOALS.find((g) => /emergency/i.test(g.name)) ?? GOALS[0];
  const emergencyTargetCents = emergencyGoal?.targetCents ?? 2_000_000;
  const monthLabels: string[] = [];
  {
    const d = new Date(TODAY);
    for (let i = 0; i < 12; i += 1) {
      monthLabels.push(d.toLocaleString("en-US", { month: "short" }).toUpperCase());
      d.setMonth(d.getMonth() + 1);
    }
  }

  // --- PAY DISTRIBUTION ---
  // The paycheck fans out by per-envelope target as % of total target.
  // Same algorithm the /allocation page uses for its Sankey preview.
  const payAllocations = ENVELOPES.map((e) => {
    const pct = totalTargetCents > 0 ? (e.target / totalTargetCents) : 0;
    const cents = Math.round((NEXT_PAYCHECK_CENTS * pct) / 100);
    return {
      envelopeId: e.id,
      name: e.name,
      planet: e.planet,
      cents,
    };
  }).filter((a) => a.cents > 0);

  // --- ALLOCATION FEED (Middle 40%) ---
  // One row per envelope. Last-payee lookup is O(transactions) per
  // envelope — fine for the 7-vessel scale; if we ever support
  // custom envelopes, swap for an indexed Map.
  const daysLeft = Math.max(0, periodLength(PERIOD_START, PERIOD_END) - day);
  const allocationRows: AllocationRow[] = ENVELOPES.map((e) => {
    const lastTx = TRANSACTIONS.find((t) => t.envelopeId === e.id);
    return {
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.current,
      targetCents: e.target,
      lastPayee: lastTx ? lastTx.payee : null,
      // 14-day burn (Cluster 3.x Component 4 — the row's background
      // sparkline). Falls back to a 14-zero array if no transactions
      // exist for this envelope.
      burnCents: spendByEnvelope14[e.id] ?? new Array(14).fill(0),
      daysLeft,
    };
  }).sort((a, b) => {
    // Over first, then watch, then by amount desc.
    const statusA = a.targetCents > 0 && a.currentCents > a.targetCents
      ? 0
      : a.targetCents > 0 && a.currentCents / a.targetCents >= 0.8
      ? 1
      : 2;
    const statusB = b.targetCents > 0 && b.currentCents > b.targetCents
      ? 0
      : b.targetCents > 0 && b.currentCents / b.targetCents >= 0.8
      ? 1
      : 2;
    if (statusA !== statusB) return statusA - statusB;
    return b.currentCents - a.currentCents;
  });

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
            listRows: monthListRows,
            calendarBills,
            calendarGoals,
            transactionDays,
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
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: overLimit.length === 0 ? "var(--ok)" : "var(--neg)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {overLimit.length === 0 ? "[OK] ALL CALM" : `[WARN] ${overLimit.length} ATTENTION`}
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
    "spend-ring": (
      <DashboardCard
        cardId="spend-ring"
        href={CARD_META["spend-ring"].href}
        eyebrow={CARD_META["spend-ring"].eyebrow}
        title={CARD_META["spend-ring"].title}
        em={CARD_META["spend-ring"].em}
        accent={CARD_META["spend-ring"].accent}
      >
        <SpendRingCard
          data={{
            perEnvelope: ENVELOPES.map((e) => ({
              id: e.id,
              name: e.name,
              planet: e.planet,
              currentCents: e.current,
              targetCents: e.target,
            })),
            totalSpentCents: burnSpent,
            totalTargetCents,
          }}
        />
      </DashboardCard>
    ),
    "net-trajectory": (
      <DashboardCard
        cardId="net-trajectory"
        href={CARD_META["net-trajectory"].href}
        eyebrow={CARD_META["net-trajectory"].eyebrow}
        title={CARD_META["net-trajectory"].title}
        em={CARD_META["net-trajectory"].em}
        accent={CARD_META["net-trajectory"].accent}
      >
        <NetTrajectoryCard
          data={{
            currentCents: SNAPSHOT.netWorthCents,
            monthlyDeltaCents,
            emergencyTargetCents,
            monthLabels,
          }}
        />
      </DashboardCard>
    ),
    "pay-distribution": (
      <DashboardCard
        cardId="pay-distribution"
        href={CARD_META["pay-distribution"].href}
        eyebrow={CARD_META["pay-distribution"].eyebrow}
        title={CARD_META["pay-distribution"].title}
        em={CARD_META["pay-distribution"].em}
        accent={CARD_META["pay-distribution"].accent}
      >
        <PayDistributionCard
          data={{
            paycheckCents: NEXT_PAYCHECK_CENTS,
            allocations: payAllocations,
          }}
        />
      </DashboardCard>
    ),
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Persistent top bar — branding, pay period, engine toggle. */}
        <TopAppBar />
        <div style={{ padding: "32px 80px 112px", maxWidth: 1480, position: "relative", flex: 1 }}>
        {/* Contextual rebalance alert bay — only renders when an envelope
            is over its target. Surfaces the worst overage with a
            [ Balance Envelope ] button that opens a slide-in drawer. */}
        <RebalanceAlertBay
          envelopes={ENVELOPES.map((e) => ({
            id: e.id,
            name: e.name,
            planet: e.planet,
            currentCents: e.current,
            targetCents: e.target,
          }))}
          overLimit={overLimit.map((e) => ({
            id: e.id,
            name: e.name,
            planet: e.planet,
            currentCents: e.current,
            targetCents: e.target,
          }))}
        />
        {/* ============== HERO (compact) ============== */}
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 32,
            alignItems: "flex-end",
            paddingBottom: 18,
            marginBottom: 24,
            borderBottom: "1px solid var(--line)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color: "var(--terminal-cyan)",
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span aria-hidden style={{ color: "var(--ok)" }}>●</span>
              <span>SESSION · {formatLongDate(TODAY)}</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sora)",
                fontWeight: 600,
                fontSize: 30,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Welcome back, <span style={{ color: "var(--terminal-cyan)" }}>Mom.</span>
            </h1>
            <p
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "var(--ink-3)",
                maxWidth: 640,
                margin: 0,
                fontWeight: 400,
              }}
            >
              {day <= totalDays
                ? `Day ${day} of ${totalDays} in this pay period — ${daysLeft} day${daysLeft === 1 ? "" : "s"} to the next paycheck.`
                : "Period closed. Run the next paycheck to start a new arc."}
            </p>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "8px 14px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
            }}
          >
            <span style={{ color: "var(--gold)", fontSize: 14, lineHeight: 1 }}>☉</span>
            <span>
              PERIOD · {formatPeriodRange(PERIOD_START, PERIOD_END)} · {totalDays}D
            </span>
          </div>
        </header>

        {/* ============== SWIPEABLE TOP FOLD ==============
            A 2-page carousel: Page 0 = Safe to Spend hero (burn
            curve, today's spend, days-left, per-day, vs. pace);
            Page 1 = Spend Ring + Critical Timeline side-by-side.
            Swipe, click ‹/›, or press ←/→ when the container has
            focus. Page-indicator dots below the scroll container
            show which page is active. Replaces the two static
            sections that used to live here. */}
        <SwipeableDashboardHeader
          safeToSpendData={{
            safeToSpendCents: safeCents,
            todaySpentCents,
            weeklyAvgPerDayCents,
            dailySpendCents,
            last7Days,
            periodStart: PERIOD_START,
            periodEnd: PERIOD_END,
            day,
            totalDays,
            breakdown,
          }}
          spendRingData={{
            perEnvelope: ENVELOPES.map((e) => ({
              id: e.id,
              name: e.name,
              planet: e.planet,
              currentCents: e.current,
              targetCents: e.target,
            })),
            totalSpentCents: burnSpent,
            totalTargetCents,
          }}
          horizonStripData={horizonStripData}
        />

        {/* ============== MUST-HAVE TOOLS INDEX ============== */}
        <MustHaveToolsStrip />

        {/* ============== MIDDLE 40% — ALLOCATION FEED ============== */}
        <section
          aria-label="Allocation feed"
          style={{
            marginBottom: 28,
            padding: "20px 0 28px",
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
              gap: 12,
              flexWrap: "wrap",
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span aria-hidden style={{ color: "var(--ok)" }}>●</span>
                FEED · 7 VESSELS · {allocationRows.length} ALLOCATIONS
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 22,
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--ink)",
                  letterSpacing: "-0.005em",
                }}
              >
                The Allocation Feed
                <em
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontStyle: "normal",
                    color: "var(--ink-3)",
                    fontWeight: 400,
                    marginLeft: 8,
                    fontSize: 16,
                  }}
                >
                  what each vessel is doing right now.
                </em>
              </h2>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                color: "var(--ink-4)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              tap a row to go deeper
            </div>
          </div>
          <AllocationFeed rows={allocationRows} />
        </section>

        {/* ============== BOTTOM 30% — CUSTOMIZE + COLOPHON ============== */}
        <section aria-label="Customization">
          <DashboardGrid cardNodes={cardNodes} />

          <footer
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--terminal-cyan)" }}>● COMPASS_ORACLE</span>
          <span style={{ color: "var(--gold)" }}>A oracle for your money.</span>
          <span>v0.1 · 2026 · Q3</span>
        </footer>
        </section>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
