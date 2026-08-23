/**
 * CriticalTimelineCard — the mid-fold "what's coming up" card.
 *
 * Two-tier surface (visual-first, per xKryptic directive 2026-08-23):
 *  1. **14-day calendar strip** (top) — a horizontal timeline of the
 *     pay period. Each day is a column. Bills are dots positioned at
 *     their due day. Color = planet. Opacity = paid? (35% vs 100%).
 *     Overdue bills get an iron-red border ring. Today is a gold
 *     vertical tick with a "TODAY" label. The strip answers "when?"
 *     at a glance — no text parsing required.
 *  2. **3-row list** (bottom) — the 3 most-imminent unpaid bills with
 *     name + amount + color-coded time-remaining badge. The list
 *     answers "what?" with the precise name and cents.
 *
 * Tap-through → /recurring, where the full timeline strip + paid
 * toggles + add-bill form live.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { NEXT_PAY_DATE } from "@/lib/mock";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface CriticalTimelineListRow {
  id: string;
  name: string;
  amountCents: number;
  dueDate: Date;
  isPaid: boolean;
  autopay: boolean;
  envelopeName: string | null;
  planet: PlanetId | null;
}

export interface CriticalTimelineStripRow extends CriticalTimelineListRow {
  /** 0-13 day-of-period index for strip placement. */
  dayIndex: number;
}

export interface CriticalTimelineCardData {
  listRows: CriticalTimelineListRow[];
  stripRows: CriticalTimelineStripRow[];
  periodStart: Date;
  periodEnd: Date;
  today: Date;
}

const DAY = 1000 * 60 * 60 * 24;

function diffDays(target: Date, now: Date): number {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - t0.getTime()) / DAY);
}

export function CriticalTimelineCard({ data }: { data: CriticalTimelineCardData }) {
  const { listRows, stripRows, periodStart, periodEnd, today } = data;
  const listCalm = listRows.length === 0 && stripRows.length === 0;

  if (listCalm) {
    return (
      <div
        style={{
          background: "var(--cosmos-2)",
          border: "1px solid var(--line-soft)",
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
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              color: "var(--ok)",
              background: "rgba(106, 176, 136, 0.10)",
              border: "1px solid var(--ok)",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              Nothing due in this period.
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              Next paycheck {formatShortDate(NEXT_PAY_DATE)} — you&apos;re clear.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <CalendarStrip
        periodStart={periodStart}
        periodEnd={periodEnd}
        today={today}
        rows={stripRows}
      />
      {listRows.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {listRows.slice(0, 3).map((row, i) => {
            const diff = diffDays(row.dueDate, today);
            const badge = timeBadge(diff, row.isPaid);
            const planetColor = row.planet ? PLANET_COLORS[row.planet] : "var(--ink-3)";
            return (
              <li
                key={row.id}
                style={{
                  padding: "12px 18px",
                  borderTop: i === 0 ? "1px solid var(--line-soft)" : "1px solid var(--line-soft)",
                  background: "var(--cosmos-2)",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: planetColor,
                    boxShadow: `0 0 6px ${planetColor}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 16,
                      color: "var(--ink)",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      marginTop: 3,
                    }}
                  >
                    due {formatShortDate(row.dueDate)}
                    {row.autopay ? " · autopay" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    color: "var(--ink)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney(row.amountCents)}
                </div>
                <TimeBadge {...badge} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14-day calendar strip
// ---------------------------------------------------------------------------

function CalendarStrip({
  periodStart,
  periodEnd,
  today,
  rows,
}: {
  periodStart: Date;
  periodEnd: Date;
  today: Date;
  rows: CriticalTimelineStripRow[];
}) {
  const periodLen = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY),
  );
  const todayIdx = Math.max(
    0,
    Math.min(periodLen - 1, Math.floor((today.getTime() - periodStart.getTime()) / DAY)),
  );

  // SVG geometry
  const padX = 8;
  const padTop = 22; // for day-of-month labels
  const padBottom = 16; // for "TODAY" / period label
  const dotR = 4;
  const dotGap = 3;
  const innerH = 44; // space for stacked dots

  // Width is responsive: use 100% via viewBox; render via width="100%".
  // We use a fixed viewBox of 1000×100 and let the SVG scale.
  const W = 1000;
  const H = padTop + innerH + padBottom;
  const innerW = W - padX * 2;
  const colW = innerW / periodLen;
  const colX = (i: number) => padX + colW * (i + 0.5);

  // Bucket bills by dayIndex so we can stack multiple dots.
  const byDay: CriticalTimelineStripRow[][] = Array.from(
    { length: periodLen },
    () => [],
  );
  for (const r of rows) {
    const idx = Math.max(0, Math.min(periodLen - 1, r.dayIndex));
    (byDay[idx] ??= []).push(r);
  }

  // Y position for each dot in a stack
  const dotY = (stackIdx: number) =>
    padTop + innerH - 6 - (stackIdx * (dotR * 2 + dotGap));

  // First day + last day labels (e.g. "AUG 22" / "SEP 5")
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const fmt = (d: Date) => `${monthFmt.format(d).toUpperCase()} ${d.getDate()}`;

  return (
    <div
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        padding: "12px 4px 8px",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: "block" }}
        role="img"
        aria-label={`14-day bill timeline. ${rows.length} bill${rows.length === 1 ? "" : "s"} due this period.`}
      >
        {/* Day-of-month labels along the bottom edge */}
        {Array.from({ length: periodLen }, (_, i) => {
          const day = new Date(periodStart);
          day.setDate(day.getDate() + i);
          const x = colX(i);
          const isToday = i === todayIdx;
          return (
            <text
              key={`d${i}`}
              x={x}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill={isToday ? "var(--gold)" : "var(--ink-3)"}
              fontFamily="var(--font-jetbrains), monospace"
              fontWeight={isToday ? 600 : 400}
              opacity={isToday ? 1 : 0.7}
            >
              {day.getDate()}
            </text>
          );
        })}

        {/* Subtle grid: vertical line at each day boundary */}
        {Array.from({ length: periodLen + 1 }, (_, i) => {
          const x = padX + colW * i;
          return (
            <line
              key={`g${i}`}
              x1={x}
              x2={x}
              y1={padTop}
              y2={padTop + innerH}
              stroke="var(--line-soft)"
              strokeWidth={0.5}
              opacity={i === 0 || i === periodLen ? 0.3 : 0.6}
            />
          );
        })}

        {/* Today column highlight + vertical gold tick */}
        {todayIdx >= 0 && todayIdx < periodLen && (
          <>
            <rect
              x={padX + colW * todayIdx}
              y={padTop - 4}
              width={colW}
              height={innerH + 8}
              fill="rgba(212, 175, 82, 0.10)"
            />
            <line
              x1={colX(todayIdx)}
              x2={colX(todayIdx)}
              y1={padTop - 6}
              y2={padTop + innerH + 4}
              stroke="var(--gold)"
              strokeWidth={1.5}
              opacity={0.9}
            />
            <text
              x={colX(todayIdx)}
              y={padTop - 10}
              textAnchor="middle"
              fontSize={8}
              letterSpacing="0.18em"
              fill="var(--gold)"
              fontFamily="var(--font-cinzel), serif"
              fontWeight={600}
            >
              TODAY
            </text>
          </>
        )}

        {/* Bill dots — stacked when multiple bills on the same day */}
        {byDay.map((stack, dayIdx) => {
          if (stack.length === 0) return null;
          return stack.map((bill, stackIdx) => {
            const isOverdue = !bill.isPaid && bill.dueDate < today;
            const isPaid = bill.isPaid;
            const color = bill.planet
              ? PLANET_COLORS[bill.planet]
              : "var(--ink-3)";
            const cy = dotY(stackIdx);
            return (
              <g key={bill.id}>
                {/* Outer iron-red ring for overdue */}
                {isOverdue && (
                  <circle
                    cx={colX(dayIdx)}
                    cy={cy}
                    r={dotR + 1.5}
                    fill="none"
                    stroke="var(--neg)"
                    strokeWidth={1.2}
                    opacity={0.85}
                  />
                )}
                <circle
                  cx={colX(dayIdx)}
                  cy={cy}
                  r={dotR}
                  fill={color}
                  opacity={isPaid ? 0.35 : 1}
                  stroke={isPaid ? color : "transparent"}
                  strokeWidth={0.5}
                />
              </g>
            );
          });
        })}
      </svg>

      {/* Range labels above the strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          padding: "0 12px 4px",
        }}
      >
        <span>{fmt(periodStart)}</span>
        <span>{fmt(periodEnd)}</span>
      </div>
    </div>
  );
}

function TimeBadge({
  label,
  accent,
  outline,
}: {
  label: string;
  accent: string;
  outline: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-cinzel), serif",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color: accent,
        background: outline ? "transparent" : hexA(accent, 0.12),
        border: `1px solid ${accent}`,
        borderRadius: 2,
        padding: "4px 8px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function timeBadge(
  diff: number,
  isPaid: boolean,
): { label: string; accent: string; outline: boolean } {
  if (isPaid) return { label: "Paid", accent: "var(--ok)", outline: false };
  if (diff < 0) return { label: "Overdue", accent: "var(--neg)", outline: false };
  if (diff === 0) return { label: "Today", accent: "var(--gold)", outline: false };
  if (diff === 1) return { label: "Tomorrow", accent: "var(--warn)", outline: true };
  if (diff <= 7) return { label: `In ${diff} days`, accent: "var(--ink)", outline: true };
  if (diff <= 14) return { label: `In ${diff} days`, accent: "var(--ink-2)", outline: true };
  return { label: "Next period", accent: "var(--ink-3)", outline: true };
}

function hexA(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return "transparent";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
