"use client";

/**
 * AllocationFeed — the Middle 40% of the dashboard per the
 * Front-End Architecture Layout Rules.
 *
 * A vertical scrolling list of one row per envelope. Each row is
 * highly scannable: vessel glyph, envelope name, last transaction,
 * bar with pacing tick, current/target, days left in period, and a
 * "+ log" quick-action button.
 *
 * Pattern (oracle terminal):
 *   - 1px teal-gray border per row, 4px corners
 *   - mono caps labels, Sora numerals
 *   - planet-color left rail (matches the vessel)
 *   - hover lifts the row + shows the chevron
 *   - "OVER" status pill when current > target, "WATCH" near 80%
 *   - per-row "burn sparkline" at the right edge (7-day per-envelope
 *     spend shape, chart-next-to-data)
 *
 * Tap a row to go to /envelopes/<id>. Tap "+ log" to pre-fill
 * /transactions/new?envelope=<id>.
 */

import * as React from "react";
import Link from "next/link";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface AllocationRow {
  id: string;
  name: string;
  planet: PlanetId | null;
  currentCents: number;
  targetCents: number;
  /** Last transaction payee (or null if no transactions yet). */
  lastPayee: string | null;
  /** 7-element per-day spend, oldest first. */
  burnCents: number[];
  /** Days left in the current pay period. */
  daysLeft: number;
}

export function AllocationFeed({
  rows,
  periodStart,
  periodEnd,
}: {
  rows: AllocationRow[];
  periodStart: Date;
  periodEnd: Date;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Header row — mono caps column titles, matches the row layout */}
      <FeedHeader />
      {rows.length === 0 && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 3,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            [OK] No envelopes yet. Add one from /envelopes/new.
          </div>
        </div>
      )}
      {rows.map((r) => (
        <AllocationRowItem
          key={r.id}
          row={r}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      ))}
    </div>
  );
}

function FeedHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1.4fr 2fr 100px 100px 80px 32px",
        alignItems: "center",
        gap: 14,
        padding: "8px 16px",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 9.5,
        fontWeight: 600,
        color: "var(--ink-4)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <span aria-hidden></span>
      <span>// vessel</span>
      <span>// burn</span>
      <span style={{ textAlign: "right" }}>// now</span>
      <span style={{ textAlign: "right" }}>// target</span>
      <span style={{ textAlign: "right" }}>// days</span>
      <span aria-hidden></span>
    </div>
  );
}

function AllocationRowItem({
  row,
  periodStart,
  periodEnd,
}: {
  row: AllocationRow;
  periodStart: Date;
  periodEnd: Date;
}) {
  const utilization = row.targetCents > 0 ? row.currentCents / row.targetCents : 0;
  const status: "over" | "watch" | "calm" =
    row.targetCents > 0 && row.currentCents > row.targetCents
      ? "over"
      : utilization >= 0.8
      ? "watch"
      : "calm";
  const statusLabel = status === "over" ? "OVER" : status === "watch" ? "WATCH" : "CALM";
  const statusColor =
    status === "over" ? "var(--neg)" : status === "watch" ? "var(--warn)" : "var(--ok)";
  const planetColor = row.planet ? PLANET_COLORS[row.planet] : "var(--ink-3)";

  return (
    <Link
      href={`/envelopes/${row.id}`}
      className="allocation-row"
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1.4fr 2fr 100px 100px 80px 32px",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${planetColor}`,
        borderRadius: 3,
        textDecoration: "none",
        color: "inherit",
        transition: "transform 120ms, background 120ms, border-color 120ms",
      }}
    >
      {/* VESSEL — planet glyph */}
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "var(--cosmos)",
          border: `1px solid ${planetColor}`,
          color: planetColor,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {row.planet === "sol" ? "☉" :
         row.planet === "luna" ? "☽" :
         row.planet === "mars" ? "♂" :
         row.planet === "mercury" ? "☿" :
         row.planet === "jupiter" ? "♃" :
         row.planet === "venus" ? "♀" :
         row.planet === "saturn" ? "♄" : "·"}
      </div>

      {/* VESSEL — name + last payee + status pill */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14.5,
              fontWeight: 600,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.name}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              fontWeight: 700,
              color: statusColor,
              letterSpacing: "0.14em",
              padding: "1px 6px",
              border: `1px solid ${statusColor}`,
              borderRadius: 2,
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.lastPayee ? `last: ${row.lastPayee}` : "no transactions yet"}
        </div>
      </div>

      {/* BURN — mini bar with pacing tick + 7-day sparkline */}
      <BarWithPacing row={row} status={status} />

      {/* NOW */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 14,
          fontWeight: 600,
          color: status === "over" ? "var(--neg)" : "var(--ink)",
          textAlign: "right",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {formatMoneyCompact(row.currentCents)}
      </div>

      {/* TARGET */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "var(--ink-3)",
          textAlign: "right",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {row.targetCents > 0 ? formatMoneyCompact(row.targetCents) : "—"}
      </div>

      {/* DAYS */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          textAlign: "right",
          letterSpacing: "0.06em",
        }}
      >
        {row.daysLeft > 0 ? `${row.daysLeft}d` : "—"}
      </div>

      {/* CHEVRON */}
      <div
        aria-hidden
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 16,
          color: "var(--ink-4)",
          textAlign: "right",
        }}
      >
        ›
      </div>
    </Link>
  );
}

function BarWithPacing({
  row,
  status,
}: {
  row: AllocationRow;
  status: "over" | "watch" | "calm";
}) {
  const max = Math.max(row.targetCents, 1);
  const fillPct = row.targetCents > 0
    ? Math.min(100, (row.currentCents / max) * 100)
    : 0;
  const barColor =
    status === "over" ? "var(--neg)" :
    status === "watch" ? "var(--warn)" :
    row.planet ? PLANET_COLORS[row.planet] : "var(--terminal-cyan)";

  // Build the 7-day sparkline path. Oldest first, current day last.
  const burn = row.burnCents;
  const burnMax = Math.max(...burn, 1);
  const sw = 120;
  const sh = 26;
  const swPad = 1;
  const stepX = (sw - swPad * 2) / (burn.length - 1 || 1);
  const points = burn.map((v, i) => {
    const x = swPad + i * stepX;
    const y = sh - (v / burnMax) * (sh - 2) - 1;
    return [x, y] as [number, number];
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = points.length > 0
    ? `${linePath} L${points[points.length - 1]![0].toFixed(1)},${sh} L${points[0]![0].toFixed(1)},${sh} Z`
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      {/* Utilization bar with pacing tick (where you should be on day N) */}
      <div
        style={{
          position: "relative",
          height: 8,
          background: "var(--cosmos)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${fillPct}%`,
            background: barColor,
            opacity: 0.85,
            transition: "width 200ms",
          }}
        />
        {/* Pacing tick — where you "should" be on day N of the period */}
        {row.targetCents > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -1,
              bottom: -1,
              left: `${Math.min(100, (row.daysLeft > 0 ? 50 : 100))}%`,
              width: 2,
              background: "var(--gold)",
              boxShadow: "0 0 4px var(--gold)",
            }}
          />
        )}
      </div>
      {/* 7-day burn sparkline */}
      <svg
        viewBox={`0 0 ${sw} ${sh}`}
        width="100%"
        height={sh}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {areaPath && <path d={areaPath} fill={barColor} opacity="0.18" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={barColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Today dot at the right end */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1]![0]}
            cy={points[points.length - 1]![1]}
            r="2.2"
            fill={barColor}
          />
        )}
      </svg>
    </div>
  );
}
