/**
 * SafeToSpendHero — the daily-telemetry anchor (Cluster 3.2.5 redesign).
 *
 * Lifted ABOVE the spend ring (per the Front-End Architecture Layout
 * Rules) on 2026-08-23 so the cents-remaining-this-period number
 * is the very first thing the user sees.
 *
 * Cluster 3.2.5 redesign (per xKryptic directive 2026-08-24):
 *   The previous design showed the number + a burn curve + a 3-cell
 *   row (today / 7-day avg / vs pace). The user said: "all the
 *   other visual displays within the safe to spend does not provide
 *   the user with anything they can actually use to learn from /
 *   how to increase this amount." The research backing this is in
 *   COORDINATION.md / Cluster 3.2.5 — PocketGuard's daily figure,
 *   Copilot's actual-vs-ideal pace, YNAB's per-envelope Available
 *   + global Ready-to-Assign, and the r/budget "permission slip"
 *   consensus.
 *
 *   The new design:
 *     1. The big number (unchanged) — the headline.
 *     2. The DAILY figure (NEW) — "$X/day for the next N days." This
 *        is the most actionable form. It's literally the answer to
 *        "can I afford this $15 lunch?"
 *     3. <OpportunitiesToGrow> (NEW) — 3 clickable suggestions that
 *        would make the big number bigger. E.g. "Move $30 from
 *        Mars · Buffer surplus → +$30." Each links to the relevant
 *        page (envelopes, subscriptions, or envelope detail).
 *     4. <PaceLine> (NEW, small) — Copilot-style actual-vs-ideal
 *        pace over the last 7 days. Status pill color-codes the
 *        result (vessel-accent / vessel-watch / vessel-over).
 *
 *   Removed:
 *     - The BurnCurve (was a history view; user said it didn't help)
 *     - The 3-cell row (today / 7-day avg / vs pace) — same reason
 *
 * Sovereign Monad (v6) treatment: mono caps eyebrows with //
 * prefix, big numbers in JetBrains Mono, body in Sora, status
 * markers [OK]/[WARN] in mono caps. All sub-components
 * (OpportunitiesToGrow, PaceLine) consume vessel tokens directly.
 */

import * as React from "react";
import { formatMoney, formatMoneyCompact, formatMoneySigned } from "@/lib/money";
import type { PaycheckBreakdown } from "@/lib/store";
import { OpportunitiesToGrow } from "@/components/dashboard/OpportunitiesToGrow";
import { PaceLine } from "@/components/dashboard/PaceLine";
import type { Opportunity } from "@/lib/opportunities";

export interface SafeToSpendHeroData {
  safeToSpendCents: number;
  todaySpentCents: number;
  weeklyAvgPerDayCents: number;
  /** 7-element array of cents per day, oldest first. */
  dailySpendCents: number[];
  last7Days: Date[];
  periodStart: Date;
  periodEnd: Date;
  /** 1-based day-of-period. 1 = first day, totalDays = last day. */
  day: number;
  totalDays: number;
  breakdown: PaycheckBreakdown;
  /** Top opportunities to grow the safe-to-spend (from topOpportunities). */
  opportunities: Opportunity[];
}

export function SafeToSpendHero({
  data,
  embedded = false,
}: {
  data: SafeToSpendHeroData;
  /** True when the hero is rendered inside a parent that already supplies
   *  its own spacing (e.g. the swipeable dashboard header). Drops the
   *  outer `marginBottom` so the carousel page packs flush. */
  embedded?: boolean;
}) {
  const {
    safeToSpendCents,
    todaySpentCents,
    weeklyAvgPerDayCents,
    dailySpendCents,
    day,
    totalDays,
    breakdown,
    opportunities,
  } = data;

  const daysLeft = Math.max(0, totalDays - day);
  // The headline daily figure — PocketGuard's signature form.
  // "You can spend $X/day for the next N days." Floor at 1 to avoid
  // divide-by-zero on the very last day of a period.
  const perDayCents =
    daysLeft > 0 ? Math.round(safeToSpendCents / daysLeft) : 0;

  // Expected daily budget for the WHOLE period (incl. already-spent).
  // Used for the pace line's ideal reference.
  const expectedDailyCents = Math.max(
    1,
    Math.round(
      (breakdown.spendingCents + breakdown.unallocatedCents) /
        Math.max(1, totalDays),
    ),
  );
  const expectedTotalCents = expectedDailyCents * 7; // 7-day window for the pace line

  // Cumulative 7-day spend (oldest → today) for the pace line.
  let cum = 0;
  const actualCum: number[] = dailySpendCents.map((c) => {
    cum += c;
    return cum;
  });

  // Headline color logic.
  const safeAccent =
    safeToSpendCents < 0 ? "var(--vessel-over)" : "var(--vessel-accent)";

  // Sub-line under the headline: "tight" flag when per-day < 70% of
  // expected daily — same threshold the old bar used.
  const tight = perDayCents < expectedDailyCents * 0.7;
  const dailyAccent = tight ? "var(--vessel-watch)" : "var(--ink)";

  return (
    <section
      aria-label="Daily telemetry — safe to spend"
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderLeft: `2px solid ${safeAccent}`,
        borderRadius: 4,
        padding: "24px 28px 22px",
        marginBottom: embedded ? 0 : 28,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Eyebrow row — mono caps left, status pill right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--vessel-accent)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--ok)",
              boxShadow: "0 0 6px var(--ok)",
            }}
          />
          // DAILY TELEMETRY · SAFE TO SPEND
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: safeToSpendCents < 0 ? "var(--vessel-over)" : "var(--ok)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {safeToSpendCents < 0 ? "[WARN] OVER" : "[OK] GREEN"}
        </div>
      </div>

      {/* Headline row: big number (left) | daily figure (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        {/* Big number — the headline */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 60,
              lineHeight: 0.95,
              color: safeAccent,
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 700,
              letterSpacing: "-0.025em",
              marginBottom: 8,
            }}
          >
            {formatMoney(safeToSpendCents)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.45,
            }}
          >
            {safeToSpendCents < 0
              ? "Over the line — pull back."
              : "After bills, debt, and savings."}
          </div>
        </div>

        {/* Daily figure — PocketGuard's signature secondary headline */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 16,
            paddingLeft: 20,
            borderLeft: "1px solid var(--vessel-border)",
          }}
        >
          <Metric
            label="days left"
            value={`${daysLeft}`}
            sub={daysLeft === 1 ? "day" : "days"}
          />
          <Metric
            label="per day"
            value={
              <span
                style={{
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                  fontSize: 26,
                  fontWeight: 700,
                  color: dailyAccent,
                  letterSpacing: "-0.02em",
                }}
              >
                {formatMoneyCompact(perDayCents)}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--ink-3)",
                    marginLeft: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  / day
                </span>
              </span>
            }
            sub={`to last ${daysLeft === 1 ? "1 day" : `${daysLeft} days`}`}
            accent={tight ? "var(--vessel-watch)" : "var(--ok)"}
          />
        </div>
      </div>

      {/* Opportunities — the new "how do I grow this" surface */}
      <div style={{ marginBottom: 12 }}>
        <OpportunitiesToGrow opportunities={opportunities} />
      </div>

      {/* Pace line — small, secondary status visual */}
      <PaceLine
        actualCents={actualCum}
        expectedTotalCents={expectedTotalCents}
      />

      {/* Tiny audit row — today spent, 7-day avg, total cash.
          Kept as a one-line dim summary so the numbers are still
          findable for the user who wants them, but no longer the
          main act. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--vessel-border)",
        }}
      >
        <Metric
          label="today"
          value={formatMoneySigned(todaySpentCents)}
          sub={`of ~${formatMoneyCompact(expectedDailyCents)}`}
        />
        <Metric
          label="7-day avg"
          value={formatMoneyCompact(weeklyAvgPerDayCents)}
          sub="per day"
          borderLeft
        />
        <Metric
          label="unallocated"
          value={formatMoneyCompact(breakdown.unallocatedCents)}
          sub="not yet assigned"
          borderLeft
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
  borderLeft,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: borderLeft ? "0 0 0 18px" : 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        // {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 20,
            fontWeight: 700,
            color: accent ?? "var(--ink)",
            lineHeight: 1,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            letterSpacing: "-0.005em",
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
