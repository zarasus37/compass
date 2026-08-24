/**
 * HorizonStrip — the right half of the Consumption Ring & Timeline card
 * (Page 1 of the swipeable dashboard header, Cluster 3.x).
 *
 * A compact VERTICAL 14-day chronological strip — one row per day of the
 * current pay period. Each row carries:
 *   - day-of-week (3-letter, mono caps)
 *   - day-of-month (big mono number)
 *   - TODAY badge when applicable
 *   - any events on that day: bills (with planet color), goals
 *     ("investment target dates" + "emergency fund transfers" — every
 *     goal in the period shows, with a special marker for emergency
 *     goals so the user can spot them at a glance)
 *
 * Why a strip and not a month grid: this is the top 30% view. The
 * user is looking at "what's coming up in the next two weeks" — the
 * exact next-14-days. A grid hides that intent behind columns; a
 * strip makes the chronological order the primary signal.
 *
 * Component Oracle Terminal treatment: mono caps day-of-week in
 * ink-3, big mono day-of-month in ink (gold for today), planet-color
 * dots for bill events, gold/cyan badges for goal types, 1px line
 * dividers between days. Today is marked with a gold left rail.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface HorizonStripEvent {
  id: string;
  /** "bill" | "goal" — determines icon + color treatment. */
  kind: "bill" | "goal";
  name: string;
  /** Cents — for bills the bill amount; for goals the target amount. */
  amountCents: number;
  /** True if this is a "transfer" goal (e.g. emergency fund sweep). */
  isTransfer?: boolean;
  autopay?: boolean;
  isPaid?: boolean;
  planet?: PlanetId | null;
}

export interface HorizonStripDay {
  /** 1-based day-of-period. */
  day: number;
  /** Date for label rendering. */
  date: Date;
  /** Whether this day is today. */
  isToday: boolean;
  events: HorizonStripEvent[];
}

export interface HorizonStripData {
  /** 14 days (or however many in the period), chronological. */
  days: HorizonStripDay[];
  /** True when at least one day has events (used for the empty state). */
  hasAnyEvent: boolean;
}

export function HorizonStrip({ data }: { data: HorizonStripData }) {
  const { days, hasAnyEvent } = data;

  if (!hasAnyEvent) {
    return (
      <div
        style={{
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 32,
            height: 32,
            borderRadius: 2,
            fontSize: 12,
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
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 2,
            }}
          >
            Quiet period.
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 12.5,
              color: "var(--ink-2)",
            }}
          >
            No bills or goal dates in the next 14 days.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Period horizon — 14 days"
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
          padding: "10px 18px 9px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span>
        <span>period horizon</span>
        <span style={{ color: "var(--ink-4)" }}>·</span>
        <span style={{ color: "var(--ink-3)" }}>{days.length} days</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {days.map((d, i) => (
          <DayRow key={d.day} day={d} isFirst={i === 0} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayRow — one row per day. Left rail: day-of-week + day-of-month + today
// badge. Right rail: events (bills + goals) with planet color dots.
// ---------------------------------------------------------------------------

function DayRow({ day, isFirst }: { day: HorizonStripDay; isFirst: boolean }) {
  const dow = day.date
    .toLocaleString("en-US", { weekday: "short" })
    .toUpperCase();
  const dom = day.date.getDate();
  const isEmpty = day.events.length === 0;

  return (
    <li
      role="listitem"
      style={{
        display: "grid",
        gridTemplateColumns: "82px 1fr",
        alignItems: "center",
        gap: 12,
        padding: "8px 18px",
        borderTop: isFirst ? "0" : "1px solid var(--line-soft)",
        background: day.isToday ? "rgba(201, 164, 92, 0.06)" : "transparent",
        borderLeft: day.isToday ? "2px solid var(--gold)" : "2px solid transparent",
        paddingLeft: day.isToday ? 16 : 18,
        minHeight: 36,
        opacity: isEmpty ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 8.5,
            fontWeight: 700,
            color: day.isToday ? "var(--gold)" : "var(--ink-3)",
            letterSpacing: "0.14em",
            width: 22,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {dow}
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            fontWeight: 600,
            color: day.isToday ? "var(--gold)" : "var(--ink)",
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            flexShrink: 0,
          }}
        >
          {String(dom).padStart(2, "0")}
        </span>
        {day.isToday && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 7.5,
              fontWeight: 700,
              color: "var(--gold)",
              background: "rgba(201, 164, 92, 0.10)",
              border: "0.5px solid var(--gold)",
              borderRadius: 1,
              padding: "1px 4px",
              letterSpacing: "0.10em",
              flexShrink: 0,
            }}
          >
            TODAY
          </span>
        )}
      </div>

      {/* Events on this day */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          minWidth: 0,
        }}
      >
        {isEmpty ? (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-5)",
              letterSpacing: "0.10em",
            }}
          >
            —
          </span>
        ) : (
          day.events.map((ev) => <EventLine key={ev.id} ev={ev} />)
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// EventLine — one event in a day. Planet dot + name + amount + tags.
// ---------------------------------------------------------------------------

function EventLine({ ev }: { ev: HorizonStripEvent }) {
  const planetColor = ev.planet ? PLANET_COLORS[ev.planet] : "var(--ink-3)";
  const tag = ev.kind === "bill" ? (ev.autopay ? "AUTO" : "BILL")
            : ev.isTransfer ? "TRANSFER"
            : "GOAL";
  const tagColor =
    ev.kind === "bill"
      ? "var(--terminal-cyan)"
      : ev.isTransfer
        ? "var(--warn)"
        : "var(--gold)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "8px auto 1fr auto auto",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: planetColor,
          boxShadow: `0 0 4px ${planetColor}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 8,
          fontWeight: 700,
          color: tagColor,
          letterSpacing: "0.14em",
          padding: "1px 4px",
          border: `0.5px solid ${tagColor}`,
          borderRadius: 1,
          background:
            tagColor === "var(--gold)"
              ? "rgba(201, 164, 92, 0.06)"
              : tagColor === "var(--warn)"
                ? "rgba(245, 158, 11, 0.06)"
                : "rgba(45, 212, 191, 0.06)",
          flexShrink: 0,
        }}
      >
        {tag}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 12,
          color: ev.isPaid ? "var(--ink-3)" : "var(--ink)",
          textDecoration: ev.isPaid ? "line-through" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {ev.name}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: ev.isPaid ? "var(--ink-3)" : "var(--ink-2)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          whiteSpace: "nowrap",
        }}
      >
        {formatMoney(ev.amountCents)}
      </span>
    </div>
  );
}
