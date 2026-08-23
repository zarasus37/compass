"use client";

/**
 * GoalTrajectory — Cumulative line graph (Recharts).
 *
 * One line per goal, climbing from "now" toward the target. The Y-axis
 * is **percent-of-target (0–100%)** so every goal is on the same scale:
 * a small goal like "Visits" ($180) and a big goal like "Emergency
 * Fund" ($20k) both show their real progress at a glance. If a line is
 * flat, the plan isn't moving it. Tooltip carries the dollar amount.
 *
 * The dashed horizontal line at 100% marks each goal's target. A
 * targets footnote below the chart shows where each goal lands (which
 * month it reaches 100%), so we don't overlap the in-chart labels.
 *
 * Recharts 3.10. Themed to the alchemical system.
 */

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface GoalTrajectoryInput {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
  perPaycheckCents: number;
  /** ISO date string for the target date. */
  targetDate: string;
  /** Anchor date for the chart (defaults to today). */
  anchorDate?: Date;
  /** Paychecks per month (defaults to 2 — biweekly). */
  paychecksPerMonth?: number;
}

interface Point {
  month: number;
  label: string;
  [goalId: string]: number | string | null;
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(
    0,
    Math.round(
      ((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    ),
  );
}

/**
 * Build the percent-of-target series for each goal. Each point is the
 * goal's projected value at month M, divided by its target, clamped to
 * [0, 100] so a goal that overshoots stays at 100%.
 */
function buildSeries(goals: GoalTrajectoryInput[], months: number): Point[] {
  const out: Point[] = [];
  for (let m = 0; m <= months; m += 1) {
    const point: Point = {
      month: m,
      label: m === 0 ? "now" : m === 1 ? "+1mo" : `+${m}mo`,
    };
    for (const g of goals) {
      if (g.targetCents <= 0) {
        point[g.id] = 0;
        continue;
      }
      const paychecksPerMonth = g.paychecksPerMonth ?? 2;
      const added = g.perPaycheckCents * paychecksPerMonth * m;
      const projected = Math.min(
        g.targetCents,
        g.currentCents + added,
      );
      const pct = Math.max(0, Math.min(100, (projected / g.targetCents) * 100));
      // Store as a 0-100 number; Recharts wants numeric.
      point[g.id] = Math.round(pct * 10) / 10;
    }
    out.push(point);
  }
  return out;
}

/**
 * Months until a goal reaches 100% under the current per-paycheck rate.
 * Returns null if the rate is 0 (flat line) or the target is unreachable
 * within the chart horizon.
 */
function monthsToTarget(g: GoalTrajectoryInput, anchor: Date): number | null {
  if (g.perPaycheckCents <= 0) return null;
  if (g.targetCents <= g.currentCents) return 0;
  const paychecksPerMonth = g.paychecksPerMonth ?? 2;
  const neededCents = g.targetCents - g.currentCents;
  const paychecksNeeded = Math.ceil(neededCents / g.perPaycheckCents);
  return Math.round(paychecksNeeded / paychecksPerMonth);
}

export function GoalTrajectory({ goals, height = 360 }: { goals: GoalTrajectoryInput[]; height?: number }) {
  const anchor = goals.find((g) => g.anchorDate)?.anchorDate ?? new Date();

  // X-axis range: from 0 to the max months until the farthest target
  // (or until the slowest-moving goal reaches 100%, whichever is bigger).
  const farthestTargetMonths = goals.reduce((max, g) => {
    const months = monthsBetween(anchor, new Date(g.targetDate));
    return Math.max(max, months);
  }, 12);
  const slowestGoalMonths = goals.reduce((max, g) => {
    const m = monthsToTarget(g, anchor);
    return Math.max(max, m ?? 0);
  }, 0);
  const maxMonths = Math.max(farthestTargetMonths, slowestGoalMonths, 12);

  const data = buildSeries(goals, maxMonths);

  return (
    <div
      style={{
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "16px 12px 12px",
        height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 16, right: 24, left: 8, bottom: 24 }}
          >
            <CartesianGrid
              stroke="var(--line-soft)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: "var(--ink-3)",
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 12,
              }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={{ stroke: "var(--line)" }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{
                fill: "var(--ink-3)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
              }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={{ stroke: "var(--line)" }}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: "var(--gold-soft)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--gold-soft)",
                      borderRadius: 2,
                      padding: "10px 14px",
                      boxShadow: "0 0 16px rgba(0,0,0,0.4)",
                      fontFamily: "var(--font-cormorant), serif",
                      color: "var(--ink)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-cinzel), serif",
                        fontSize: 10.5,
                        color: "var(--ink-3)",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {String(label)}
                    </div>
                    {payload.map((p) => {
                      const goal = goals.find((g) => g.id === p.dataKey);
                      if (!goal) return null;
                      const pct = p.value as number;
                      const projectedDollars =
                        goal.targetCents * (pct / 100);
                      return (
                        <div
                          key={p.dataKey as string}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            marginTop: 2,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              background: PLANET_COLORS[goal.planet],
                              borderRadius: "50%",
                            }}
                          />
                          <span style={{ color: "var(--ink-2)" }}>{goal.name}</span>
                          <span
                            style={{
                              fontFamily: "var(--font-jetbrains), monospace",
                              color: "var(--ink)",
                              marginLeft: "auto",
                            }}
                          >
                            {formatMoney(projectedDollars)}
                            <span
                              style={{
                                color: "var(--gold)",
                                fontWeight: 500,
                                marginLeft: 6,
                              }}
                            >
                              {pct.toFixed(0)}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {/* 100% reference line — every goal's target */}
            <ReferenceLine
              y={100}
              stroke="var(--gold-deep)"
              strokeDasharray="3 6"
              strokeWidth={1}
              opacity={0.55}
            />
            {goals.map((g) => (
              <Line
                key={g.id}
                type="monotone"
                dataKey={g.id}
                name={g.name}
                stroke={PLANET_COLORS[g.planet]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: PLANET_COLORS[g.planet], strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--gold)", stroke: PLANET_COLORS[g.planet], strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Targets footnote — replaces the cut-off in-chart labels.
          For each goal, shows the name + the month it reaches 100%
          under the current rate, or "—" if the plan isn't moving it. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          paddingTop: 8,
          paddingLeft: 8,
          paddingRight: 8,
          borderTop: "1px solid var(--line-soft)",
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--gold)",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 14,
              height: 0,
              borderTop: "1px dashed var(--gold-deep)",
            }}
          />
          100% target
        </span>
        {goals.map((g) => {
          const m = monthsToTarget(g, anchor);
          const flat = m === null;
          return (
            <span
              key={g.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: flat ? "var(--neg)" : "var(--ink-2)",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: PLANET_COLORS[g.planet],
                }}
              />
              {g.name}
              <span
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  textTransform: "none",
                  letterSpacing: "0.01em",
                  color: flat ? "var(--neg)" : "var(--ink-3)",
                }}
              >
                {flat
                  ? "· not moving"
                  : m === 0
                  ? "· reached"
                  : `· ${m}mo to 100%`}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
