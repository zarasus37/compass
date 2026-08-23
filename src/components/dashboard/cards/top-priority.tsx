/**
 * TopPriorityCard — the "Your top priority" goal hero, card-sized.
 *
 * Condensed version of the full hero on the previous dashboard
 * (Cluster 1): the headline + the bar + the **GoalSparkline** (NEW)
 * showing the goal's projected trajectory to 100% target. The
 * sparkline reuses the existing /goals GoalSparkline component, so
 * the visual language stays consistent across the deep page and
 * the dashboard.
 *
 * The vessel glyph, description, and target-date copy are dropped —
 * the deep-dive on /goals/[id] has all of that with the full chart.
 *
 * Tap-through → /goals/[id].
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { TODAY } from "@/lib/mock";
import { GoalSparkline } from "@/components/viz/GoalSparkline";

export interface TopPriorityCardData {
  id: string;
  name: string;
  planet: string;
  currentCents: number;
  targetCents: number;
  targetDate: Date;
  perPaycheckCents: number;
}

export function TopPriorityCard({ data }: { data: TopPriorityCardData | null }) {
  if (!data) {
    return (
      <div
        style={{
          padding: "24px 22px",
          color: "var(--ink-3)",
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 14,
        }}
      >
        No goal set. Tap &ldquo;+ New goal&rdquo; on the Goals page to set one.
      </div>
    );
  }
  const pct = Math.min((data.currentCents / data.targetCents) * 100, 100);
  const monthsAway = Math.max(
    0,
    Math.ceil((data.targetDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Row 1: numbers + bar + caption (full width) */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 32,
              lineHeight: 1,
              color: "var(--jupiter)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(data.currentCents)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 16,
              color: "var(--ink-3)",
            }}
          >
            of
          </span>
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 20,
              lineHeight: 1,
              color: "var(--ink-3)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(data.targetCents)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              color: "var(--jupiter)",
              fontWeight: 500,
            }}
          >
            {Math.round(pct)}%
          </span>
        </div>
        <div
          style={{
            position: "relative",
            height: 5,
            background: "var(--cosmos)",
            border: "1px solid var(--line-soft)",
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--jupiter), var(--venus))",
              boxShadow: "0 0 8px var(--jupiter)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 8,
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          <span>
            {data.targetDate > TODAY ? "Free by" : "Target"}{" "}
            <b
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              {formatShortDate(data.targetDate)}
            </b>
            {monthsAway > 0 ? ` · ${monthsAway}mo` : ""}
          </span>
          <span>
            <b
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                color: "var(--jupiter)",
                fontWeight: 500,
              }}
            >
              +{formatMoney(data.perPaycheckCents)}
            </b>{" "}
            / check
          </span>
        </div>
      </div>

      {/* Row 2: trajectory sparkline (NEW) — shows the projected
          path from "now" to 100% target over the next 18 months.
          End dot is the projection at the horizon. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 6,
          padding: "10px 16px 12px",
          background: "rgba(154, 122, 192, 0.06)",
          border: "1px solid var(--line-soft)",
          borderRadius: 3,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span>18-month projection</span>
          <span
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 12,
              color: "var(--ink-2)",
              textTransform: "none",
              letterSpacing: "0.01em",
            }}
          >
            {data.perPaycheckCents <= 0
              ? "Plan isn't moving this goal"
              : data.currentCents >= data.targetCents
              ? "Goal reached"
              : `+${formatMoney(data.perPaycheckCents)}/check`}
          </span>
        </div>
        <div style={{ width: "100%" }}>
          <GoalSparkline
            planet={data.planet as Parameters<typeof GoalSparkline>[0]["planet"]}
            currentCents={data.currentCents}
            targetCents={data.targetCents}
            perPaycheckCents={data.perPaycheckCents}
            anchor={TODAY}
            horizonMonths={18}
            paychecksPerMonth={2}
            width={400}
            height={48}
          />
        </div>
      </div>
    </div>
  );
}
