/**
 * CriticalTimelineCard — the mid-fold "what's coming up" card.
 *
 * Two-tier surface (visual-first, per xKryptic directive 2026-08-23):
 *  1. **Month calendar** (top) — full-month grid with planetary
 *     day-of-week headers (Sun ☉, Mon ☽, …, Sat ♄). Each day cell
 *     shows PAY badges for bills due that day, GOAL badges for goal
 *     target dates, a small gold dot for days with transactions.
 *     Today is highlighted with a gold border. Hover any day with
 *     a bill to see the bill name + amount in a native tooltip.
 *  2. **Scheduled bills list** (bottom) — every bill due this month
 *     with name, day-of-month, amount, and an autopay marker. The
 *     list answers "what's due, and when" with precise cents.
 *
 * Tap-through → /obligations?tab=bills, where the full timeline strip + paid
 * toggles + add-bill form live.
 *
 * Component Oracle Terminal treatment: section header with //
 * prefix, planet-colored dots, day badge in mono gold, amounts in
 * JetBrains Mono. Paid bills get a line-through at 50% opacity.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { NEXT_PAY_DATE } from "@/lib/mock";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { MonthCalendar, type MonthCalendarBill, type MonthCalendarGoal } from "./month-calendar";

export interface CriticalTimelineListRow {
  id: string;
  name: string;
  amountCents: number;
  /** Day of month, 1-31. */
  dayOfMonth: number;
  isPaid: boolean;
  autopay: boolean;
  envelopeName: string | null;
  planet: PlanetId | null;
}

export interface CriticalTimelineCardData {
  /** All bills due in the current month (paid or unpaid, for the list). */
  listRows: CriticalTimelineListRow[];
  /** Bills for the calendar — just the recurring ones with a dueDay. */
  calendarBills: MonthCalendarBill[];
  /** Goals with targetDate in the current month. */
  calendarGoals: MonthCalendarGoal[];
  /** Day-timestamps (start-of-day) with any transaction. */
  transactionDays: Set<number>;
  today: Date;
}

export function CriticalTimelineCard({ data }: { data: CriticalTimelineCardData }) {
  const { listRows, calendarBills, calendarGoals, transactionDays, today } = data;
  const calm = listRows.length === 0 && calendarBills.length === 0;

  if (calm) {
    return (
      <div
        style={{
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "26px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontFamily: "var(--font-jetbrains), monospace",
              fontWeight: 700,
              color: "var(--ok)",
              background: "rgba(74, 222, 128, 0.10)",
              border: "1px solid var(--ok)",
              flexShrink: 0,
              letterSpacing: "0.04em",
            }}
          >
            [OK]
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              No bills this month.
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                color: "var(--ink-2)",
              }}
            >
              Next paycheck on the {formatShortDate(NEXT_PAY_DATE)}.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MonthCalendar
        today={today}
        bills={calendarBills}
        goals={calendarGoals}
        transactionDays={transactionDays}
      />
      {listRows.length > 0 && <ScheduledBillsList rows={listRows} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scheduled bills list — the data behind the calendar.
// Compact rows: planet dot, name, day-of-month, amount, autopay marker.
// ---------------------------------------------------------------------------

function ScheduledBillsList({ rows }: { rows: CriticalTimelineListRow[] }) {
  // Sort by day-of-month, then by name. Paid bills get a subtle treatment.
  const sorted = [...rows].sort((a, b) => {
    if (a.dayOfMonth !== b.dayOfMonth) return a.dayOfMonth - b.dayOfMonth;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--terminal-cyan)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "10px 18px 8px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span>
        <span>scheduled bills</span>
        <span style={{ color: "var(--ink-4)" }}>·</span>
        <span style={{ color: "var(--ink-3)" }}>this month · {sorted.length}</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "0 6px 6px" }}>
        {sorted.map((row, i) => {
          const planetColor = row.planet ? PLANET_COLORS[row.planet] : "var(--ink-3)";
          return (
            <li
              key={row.id}
              style={{
                padding: "9px 12px",
                borderTop: i === 0 ? "0" : "1px solid var(--line-soft)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                alignItems: "center",
                gap: 12,
                opacity: row.isPaid ? 0.5 : 1,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: planetColor,
                  boxShadow: `0 0 6px ${planetColor}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 14,
                  color: "var(--ink)",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {row.name}
                {row.autopay && (
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "var(--terminal-cyan)",
                      letterSpacing: "0.10em",
                      marginLeft: 8,
                      padding: "1px 4px",
                      border: "0.5px solid var(--terminal-cyan-dim)",
                      borderRadius: 1,
                    }}
                  >
                    AP
                  </span>
                )}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--gold)",
                  letterSpacing: "0.16em",
                  background: "rgba(201, 164, 92, 0.08)",
                  border: "0.5px solid var(--gold)",
                  borderRadius: 1,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                }}
              >
                DAY {String(row.dayOfMonth).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13,
                  color: row.isPaid ? "var(--ink-3)" : "var(--ink)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                  textDecoration: row.isPaid ? "line-through" : "none",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {formatMoney(row.amountCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
