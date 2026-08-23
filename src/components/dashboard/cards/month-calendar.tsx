/**
 * MonthCalendar — full-month calendar view for the Critical Timeline card.
 *
 * Replaces the 14-day strip with a richer month view (per xKryptic
 * directive 2026-08-23 — visual > list). Design borrowed from the
 * reference mockup:
 *
 *   ┌─────────────────────────────────────────┐
 *   │  ☉   ☽   ♂   ☿   ♃   ♀   ♄             │  ← planetary day-of-week
 *   │ ┌──┬──┬──┬──┬──┬──┬──┐                 │
 *   │ │ 1│ 2│ 3│PAY│ 5│ 6│ 7│                 │  ← PAY = bill due today
 *   │ │  │  │  │ 4│  │  │  │                 │
 *   │ │ 8│ 9│10│11│12│13│14│                 │
 *   │ │  │  │ ●│  │  │  │  │                 │  ← ● = transactions today
 *   │ │15│16│17│PAY│19│20│21│                 │  ← GOAL = goal target date
 *   │ │  │  │  │18│  │  │  │                 │
 *   │ │22│23│24│25│26│GOAL│28│               │  ← 22 = today (highlighted)
 *   │ │  │  │  │  │26│  │  │                 │
 *   │ │29│30│  │  │  │  │  │                 │
 *   │ └──┴──┴──┴──┴──┴──┘                 │
 *   └─────────────────────────────────────────┘
 *
 * Hover on a day with a bill → tooltip with bill name(s) + amount(s).
 * The native `title` attribute gives a simple, accessible baseline.
 *
 * Component Oracle Terminal treatment: day numbers in JetBrains Mono
 * (data), planetary glyphs in gold (the planet system is preserved as
 * a semantic mapping), cell borders in teal-gray with today in gold,
 * badges in mono uppercase.
 */

import * as React from "react";

const DAY = 1000 * 60 * 60 * 24;

// Planetary day-of-week mapping (Sunday = Sol, Monday = Luna, etc.).
// Sunday-first to match US locale.
const PLANET_GLYPHS = ["☉", "☽", "♂", "☿", "♃", "♀", "♄"] as const;
const PLANET_NAMES = ["Sol", "Luna", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export interface MonthCalendarBill {
  id: string;
  name: string;
  amountCents: number;
  /** Day of month, 1-31, that the bill recurs on. */
  dueDay: number;
  autopay: boolean;
}

export interface MonthCalendarGoal {
  id: string;
  name: string;
  /** The exact date the goal target is hit. */
  targetDate: Date;
  /** Planet for the badge tint. */
  planet: string;
}

export interface MonthCalendarDay {
  date: Date;
  /** Day number, 1-31. */
  dayOfMonth: number;
  /** True if this date is the user's "today" anchor. */
  isToday: boolean;
  /** True if this date falls in the current month (vs. spillover from prev/next). */
  isCurrentMonth: boolean;
  /** True if this date is before today. */
  isPast: boolean;
  /** Bills due on this day (matched by dayOfMonth). */
  bills: MonthCalendarBill[];
  /** Goal target dates on this day. */
  goals: MonthCalendarGoal[];
  /** True if any transaction landed on this day. */
  hasTransactions: boolean;
}

export interface MonthCalendarProps {
  /** The "today" anchor (so the calendar can show the right month). */
  today: Date;
  /** Bills — only the recurring ones with a `dueDay` are used. */
  bills: Array<{
    id: string;
    name: string;
    amountCents: number;
    dueDay: number;
    autopay: boolean;
  }>;
  /** Goals with target dates. */
  goals: Array<{
    id: string;
    name: string;
    targetDate: Date;
    planet: string;
  }>;
  /** Set of date timestamps (start-of-day) that have any transaction. */
  transactionDays: Set<number>;
}

export function MonthCalendar({ today, bills, goals, transactionDays }: MonthCalendarProps) {
  // Build the calendar grid: start with the Sunday on or before
  // monthStart, end with the Saturday on or after monthEnd.
  // Always render 6 rows × 7 cols = 42 cells for layout consistency.
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // last day of month

  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - monthStart.getDay()); // back to Sunday

  // Build 42 day cells.
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days: MonthCalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dom = d.getDate();
    days.push({
      date: d,
      dayOfMonth: dom,
      isToday: dayStart === todayMidnight,
      isCurrentMonth: d.getMonth() === month,
      isPast: dayStart < todayMidnight,
      bills: bills.filter((b) => b.dueDay === dom),
      goals: goals.filter(
        (g) =>
          g.targetDate.getFullYear() === d.getFullYear() &&
          g.targetDate.getMonth() === d.getMonth() &&
          g.targetDate.getDate() === dom,
      ),
      hasTransactions: transactionDays.has(dayStart),
    });
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    monthStart,
  );

  return (
    <div
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "14px 14px 12px",
      }}
    >
      {/* Month label — terminal mono caps with teal prefix */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--terminal-cyan)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 12,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span>
        <span style={{ color: "var(--ink)" }}>{monthLabel}</span>
      </div>

      {/* Planetary day-of-week headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 6,
        }}
      >
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            title={`${PLANET_NAMES[i]}'s day`}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              fontWeight: 500,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              aria-hidden
              style={{
                fontSize: 13,
                lineHeight: 1,
                color: "var(--gold)",
                fontFamily: "var(--font-sora)",
                fontWeight: 400,
              }}
            >
              {PLANET_GLYPHS[i]}
            </span>
            <span>{d}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {days.map((day) => (
          <DayCell key={day.date.getTime()} day={day} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day cell — the atomic calendar square.
// Shows: day number, PAY badge (gold), GOAL badge (jupiter), transaction dot,
// today highlight, past dimming, current-month tint.
// Hover: native browser tooltip via `title` for bill details.
// ---------------------------------------------------------------------------

function DayCell({ day }: { day: MonthCalendarDay }) {
  const dim = !day.isCurrentMonth;
  const hasPay = day.bills.length > 0;
  const hasGoal = day.goals.length > 0;
  const hasAny = hasPay || hasGoal || day.hasTransactions;
  const isToday = day.isToday;
  const past = day.isPast;

  // Tooltip content for the native title attribute.
  const tooltipParts: string[] = [];
  if (hasPay) {
    const billLines = day.bills
      .map(
        (b) =>
          `${b.name} — $${(b.amountCents / 100).toFixed(2)}${b.autopay ? " (autopay)" : ""}`,
      )
      .join("\n");
    tooltipParts.push(`PAY:\n${billLines}`);
  }
  if (hasGoal) {
    tooltipParts.push(`GOAL:\n${day.goals.map((g) => g.name).join("\n")}`);
  }
  if (day.hasTransactions && !hasAny) {
    tooltipParts.push("Transactions on this day");
  }
  const tooltip = tooltipParts.length > 0 ? tooltipParts.join("\n\n") : undefined;

  return (
    <div
      title={tooltip}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        minHeight: 32,
        border: isToday
          ? "1.5px solid var(--gold)"
          : "1px solid var(--line-soft)",
        borderRadius: 2,
        background: isToday
          ? "rgba(201, 164, 92, 0.10)"
          : hasPay
          ? "rgba(201, 164, 92, 0.04)"
          : "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        opacity: dim ? 0.3 : past ? 0.55 : 1,
        cursor: tooltip ? "help" : "default",
        transition: "transform 120ms, background 120ms",
      }}
      className="month-calendar-day"
    >
      {/* PAY / GOAL badges (top, stacked) */}
      {hasPay && (
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 6.5,
            fontWeight: 700,
            letterSpacing: "0.10em",
            color: "var(--gold)",
            border: "0.5px solid var(--gold)",
            borderRadius: 1,
            padding: "0 3px",
            lineHeight: 1.3,
            opacity: 0.95,
          }}
        >
          PAY
        </span>
      )}
      {hasGoal && (
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 6.5,
            fontWeight: 700,
            letterSpacing: "0.10em",
            color: "var(--jupiter)",
            border: "0.5px solid var(--jupiter)",
            borderRadius: 1,
            padding: "0 3px",
            lineHeight: 1.3,
            opacity: 0.95,
          }}
        >
          GOAL
        </span>
      )}

      {/* Day number — JetBrains Mono, the canonical data font */}
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 13,
          lineHeight: 1,
          color: isToday
            ? "var(--gold-glow)"
            : dim
            ? "var(--ink-4)"
            : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: isToday ? 600 : 500,
        }}
      >
        {day.dayOfMonth}
      </span>

      {/* Transactions dot (bottom) */}
      {day.hasTransactions && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: 3,
            left: "50%",
            transform: "translateX(-50%)",
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "var(--gold)",
            opacity: 0.85,
          }}
        />
      )}
    </div>
  );
}
