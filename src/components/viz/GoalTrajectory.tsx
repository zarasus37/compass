"use client";

/**
 * GoalTrajectory — Cumulative line graph (Recharts).
 *
 * One line per goal, climbing from "now" to the target date. Solid
 * segment is the projected path at the current per-paycheck rate;
 * dashed segment is the gap to the actual target. A horizontal
 * reference line marks the target.
 *
 * Motivates the user: "if you keep doing what you're doing, you'll
 * hit the goal in N months." For goals with no per-paycheck
 * contribution (Debt Free in the seed), the line is flat — a
 * gentle nudge to either raise the contribution or adjust the
 * target date.
 *
 * Recharts 3.10. Themed to the alchemical system.
 */

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyCompact, formatMoney } from "@/lib/money";
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
  [goalId: string]: number | string;
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(
    0,
    Math.round(
      ((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    ),
  );
}

function buildSeries(goals: GoalTrajectoryInput[], months: number): Point[] {
  const out: Point[] = [];
  for (let m = 0; m <= months; m += 1) {
    const point: Point = {
      month: m,
      label: m === 0 ? "now" : m === 1 ? "+1mo" : `+${m}mo`,
    };
    for (const g of goals) {
      // Linear projection at the per-paycheck rate
      const paychecksPerMonth = g.paychecksPerMonth ?? 2;
      const added = g.perPaycheckCents * paychecksPerMonth * m;
      const projected = Math.min(
        g.targetCents,
        g.currentCents + added,
      );
      point[g.id] = Math.round(projected / 100); // dollars
    }
    out.push(point);
  }
  return out;
}

export function GoalTrajectory({ goals, height = 360 }: { goals: GoalTrajectoryInput[]; height?: number }) {
  const anchor = goals.find((g) => g.anchorDate)?.anchorDate ?? new Date();

  // X-axis range: from 0 to the max months until the farthest target
  const maxMonths = goals.reduce((max, g) => {
    const months = monthsBetween(anchor, new Date(g.targetDate));
    return Math.max(max, months);
  }, 12);

  const data = buildSeries(goals, maxMonths);

  return (
    <div
      style={{
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "16px 12px 8px",
        height,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 32, left: 8, bottom: 32 }}
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
            tick={{
              fill: "var(--ink-3)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
            }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={{ stroke: "var(--line)" }}
            tickFormatter={(v) => `$${v}`}
            width={56}
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
                          {formatMoney((p.value as number) * 100)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
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
            />
          ))}
          {/* Reference line at $20k for Emergency Fund (the most prominent target) */}
          {goals
            .filter((g) => g.perPaycheckCents > 0)
            .map((g) => (
              <ReferenceLine
                key={`ref-${g.id}`}
                y={Math.round(g.targetCents / 100)}
                stroke={PLANET_COLORS[g.planet]}
                strokeDasharray="3 6"
                strokeWidth={1}
                opacity={0.45}
                label={{
                  value: `${g.name} target · ${formatMoneyCompact(g.targetCents)}`,
                  position: "right",
                  fill: "var(--ink-3)",
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 11,
                  fontStyle: "italic",
                }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
