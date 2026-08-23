/**
 * DailyTrackingCard — the top-fold "Safe-Spend" + today's pace card.
 *
 * Surfaces the three numbers a user wants to see first thing:
 *  - SAFE TO SPEND: the unallocated cents from Plan My Next Check —
 *    how much discretionary money is left in this period after bills,
 *    spending envelopes, debt, and savings are funded.
 *  - TODAY'S SPEND: cents logged today (sum of negative transactions
 *    whose date == TODAY). Calm green if under 1/14 of the week's
 *    average; warn yellow if over.
 *  - WEEKLY HEALTH: the 7-day rolling average spend, as a sentence
 *    in the corner. "Spending $42/day on average" — orienting.
 *
 * Tap-through → /transactions, where the full record lives.
 */

import * as React from "react";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { TODAY } from "@/lib/mock";
import type { PaycheckBreakdown } from "@/lib/store";

export interface DailyTrackingCardData {
  safeToSpendCents: number;
  todaySpentCents: number;
  weeklyAvgPerDayCents: number;
  periodStart: Date;
  periodEnd: Date;
  breakdown: PaycheckBreakdown;
}

export function DailyTrackingCard({ data }: { data: DailyTrackingCardData }) {
  const {
    safeToSpendCents,
    todaySpentCents,
    weeklyAvgPerDayCents,
    breakdown,
  } = data;

  // Spend pressure: today's spend vs. expected daily budget.
  // Expected daily = (envelope spending + unallocated) / period length.
  const periodLen = Math.max(
    1,
    Math.round(
      (data.periodEnd.getTime() - data.periodStart.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  const expectedDailyCents = Math.round(
    (breakdown.spendingCents + breakdown.unallocatedCents) / periodLen,
  );
  const pace = expectedDailyCents > 0 ? todaySpentCents / expectedDailyCents : 0;
  const pacePct = Math.round(pace * 100);
  const paceLabel =
    pace === 0
      ? "calm"
      : pace < 0.5
      ? "well under"
      : pace < 1
      ? "under"
      : pace < 1.5
      ? "on pace"
      : pace < 2
      ? "above"
      : "well above";
  const paceAccent =
    pace < 1
      ? "var(--ok)"
      : pace < 1.5
      ? "var(--warn)"
      : "var(--neg)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr",
        gap: 0,
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        overflow: "hidden",
        background: "var(--cosmos-2)",
      }}
    >
      {/* SAFE TO SPEND — the headline */}
      <Cell
        eyebrow="Safe to spend"
        align="left"
        accent={safeToSpendCents < 0 ? "var(--neg)" : "var(--ink)"}
        main={
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 40,
              lineHeight: 1,
              color: safeToSpendCents < 0 ? "var(--neg)" : "var(--gold-glow)",
              fontFeatureSettings: '"tnum" 1',
              letterSpacing: "0.005em",
            }}
          >
            {formatMoney(safeToSpendCents)}
          </span>
        }
        sub={
          <span style={{ color: "var(--ink-3)" }}>
            {safeToSpendCents < 0
              ? "over the line — pull back"
              : "after bills, debt, savings"}
          </span>
        }
      />

      {/* TODAY'S PACE */}
      <Cell
        eyebrow="Today"
        borderLeft
        align="left"
        accent="var(--ink)"
        main={
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 22,
                lineHeight: 1,
                color: "var(--ink)",
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {formatMoneySigned(todaySpentCents)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 13,
                color: paceAccent,
              }}
            >
              {paceLabel}
            </span>
          </div>
        }
        sub={
          <span style={{ color: "var(--ink-3)" }}>
            {expectedDailyCents > 0
              ? `of ~${formatMoney(expectedDailyCents)} expected`
              : "no daily target set"}
          </span>
        }
      />

      {/* WEEKLY HEALTH */}
      <Cell
        eyebrow="Weekly health"
        borderLeft
        align="left"
        accent="var(--ink)"
        main={
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 18,
              lineHeight: 1,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(weeklyAvgPerDayCents)}
            <span
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
                marginLeft: 4,
              }}
            >
              / day
            </span>
          </span>
        }
        sub={
          <span style={{ color: "var(--ink-3)" }}>
            7-day rolling average
          </span>
        }
      />
    </div>
  );

  function paceHintFor(percent: number): string {
    if (percent < 50) return "Well under";
    if (percent < 100) return "Under";
    if (percent < 150) return "On pace";
    if (percent < 200) return "Above";
    return "Well above";
  }
}

function Cell({
  eyebrow,
  main,
  sub,
  borderLeft,
  align,
  accent,
}: {
  eyebrow: string;
  main: React.ReactNode;
  sub: React.ReactNode;
  borderLeft?: boolean;
  align?: "left" | "right";
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        borderLeft: borderLeft ? "1px solid var(--line-soft)" : undefined,
        textAlign: align ?? "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          fontWeight: 600,
          color: accent ?? "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ minWidth: 0 }}>{main}</div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 12.5,
          color: "var(--ink-3)",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
