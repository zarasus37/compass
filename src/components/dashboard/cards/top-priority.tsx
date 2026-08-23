/**
 * TopPriorityCard — the "Your top priority" goal hero, card-sized.
 *
 * Condensed version of the full hero on the previous dashboard
 * (Cluster 1): just the headline + the bar + the per-paycheck
 * contribution. The vessel glyph, description, and target-date
 * copy are dropped — the deep-dive on /goals/[id] has all of that
 * with the full chart.
 *
 * Tap-through → /goals/[id].
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { TODAY } from "@/lib/mock";

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 34,
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
              fontSize: 18,
              color: "var(--ink-3)",
            }}
          >
            of
          </span>
          <span
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 22,
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
              fontSize: 13,
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
            height: 6,
            background: "var(--cosmos)",
            border: "1px solid var(--line-soft)",
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--jupiter), var(--venus))",
              boxShadow: "0 0 10px var(--jupiter)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 13.5,
            color: "var(--ink-2)",
          }}
        >
          <span>
            {data.targetDate > TODAY ? "Free by" : "Target"}{" "}
            <b
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12.5,
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
                fontSize: 12.5,
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
      <div
        style={{
          textAlign: "right",
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {data.name}
      </div>
    </div>
  );
}
