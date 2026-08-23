"use client";

/**
 * BudgetVsActual — Clustered bars (Recharts).
 *
 * For each envelope, two side-by-side bars:
 *   - gold "Plan"  = what the allocation plan said the per-paycheck
 *                    amount should be
 *   - planetary    = what the system actually allocated across all
 *                    paychecks in the period
 *
 * The point isn't to show perfect alignment (it always does, because
 * the engine auto-allocates) — it's to surface the "where did the
 * money go vs where it was supposed to go" comparison as a single
 * glanceable visual. Helpful for the monthly review state.
 *
 * Recharts 3.10 is in the bundle. We theme it to the alchemical
 * design system (cosmic dark canvas, gold leaf, planetary metals).
 */

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyCompact, formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface BudgetVsActualRow {
  id: string;
  name: string;
  planet: PlanetId | null;
  /** The plan's per-paycheck allocation target, in cents. */
  planCents: number;
  /** What actually got allocated (cumulative), in cents. */
  actualCents: number;
}

export interface BudgetVsActualProps {
  rows: BudgetVsActualRow[];
  height?: number;
}

export function BudgetVsActual({ rows, height = 320 }: BudgetVsActualProps) {
  // Reshape for Recharts: array of { name, plan, actual, planet }
  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    planet: r.planet,
    plan: Math.round(r.planCents / 100), // dollars for chart readability
    actual: Math.round(r.actualCents / 100),
  }));

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
        <BarChart
          data={data}
          margin={{ top: 16, right: 24, left: 8, bottom: 32 }}
          barCategoryGap="22%"
          barGap={6}
        >
          <CartesianGrid
            stroke="var(--line-soft)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{
              fill: "var(--ink-2)",
              fontFamily: "var(--font-sora)",
              fontSize: 13,
              fontWeight: 500,
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
            cursor={{ fill: "rgba(212, 175, 82, 0.06)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const plan = payload.find((p) => p.dataKey === "plan")?.value as number | undefined;
              const actual = payload.find((p) => p.dataKey === "actual")?.value as number | undefined;
              const row = data.find((d) => d.name === label);
              return (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--gold-soft)",
                    borderRadius: 2,
                    padding: "10px 14px",
                    boxShadow: "0 0 16px rgba(0,0,0,0.4)",
                    fontFamily: "var(--font-sora)",
                    color: "var(--ink)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 16,
                      marginBottom: 6,
                      color: row?.planet ? PLANET_COLORS[row.planet] : "var(--gold)",
                    }}
                  >
                    {label}
                  </div>
                  {plan !== undefined && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--gold)" }}>●</span> Plan · {formatMoney(plan * 100)}
                    </div>
                  )}
                  {actual !== undefined && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: row?.planet ? PLANET_COLORS[row.planet] : "var(--ink-2)" }}>●</span> Actual · {formatMoney(actual * 100)}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Bar
            dataKey="plan"
            fill="var(--gold)"
            name="Plan"
            radius={[1, 1, 0, 0]}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            radius={[1, 1, 0, 0]}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.planet ? PLANET_COLORS[d.planet] : "var(--ink-2)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          paddingTop: 4,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 10,
              height: 8,
              background: "var(--terminal-cyan)",
              borderRadius: 1,
              boxShadow: "0 0 6px var(--gold)",
            }}
          />
          Plan
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {/* Each envelope's Actual bar uses its own planet color, so the
              legend dot is a neutral pair of bars — one per row's color. */}
          <span aria-hidden style={{ display: "inline-flex", gap: 2 }}>
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 8,
                background: PLANET_COLORS.sol,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 8,
                background: PLANET_COLORS.jupiter,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 8,
                background: PLANET_COLORS.venus,
                borderRadius: 1,
              }}
            />
          </span>
          Actual · per envelope
        </span>
      </div>
    </div>
  );
}
