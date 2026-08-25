"use client";

/**
 * AllocationFeed — the Middle 40% of the dashboard (Cluster 3.x
 * Component 4 — "Scrollable Vessel Feed").
 *
 * Vertical scrolling list, one row per envelope. Each row is a
 * self-contained functional unit with four distinct visual layers:
 *
 *   1. Background sparkline (low-opacity, 14-day cadence)
 *      A thin SVG line chart spans the full row width behind the
 *      foreground content. It charts this envelope's daily spend
 *      across the past 14 days, with the rightmost point (today)
 *      slightly emphasized. Opacity 0.10 keeps it as context, not
 *      noise.
 *
 *   2. Foreground: title (left) + numeric ledger (right)
 *      Left: vessel glyph + name + last payee + status pill
 *      Right: "$X.XX / $Y.YY" — the used-vs-maximum tracking pair
 *
 *   3. Linear gauge bar
 *      Thick (12px), fills left-to-right. Color/state:
 *        - CALM  (0-79%):  planet color (jupiter-violet by default;
 *          reads as "deep purple" per the spec)
 *        - WATCH (80-99%): var(--vessel-watch) — solid warning orange
 *        - OVER  (100%+):  var(--vessel-over) with vesselOverBlink keyframe
 *          (1.4s opacity 1.0 ↔ 0.55). Brightness pulses, color stays.
 *
 *   4. Sub-line: last transaction payee + days left
 *
 * Sovereign Monad (v6) treatment: 1px vessel-border, planet-color
 * left rail, mono caps status pill, Sora envelope name, JetBrains
 * Mono for the numeric ledger, square 4px corners, hover lifts the
 * row forward 2px (existing pattern).
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
  /**
   * 14-element per-day spend, oldest first. Today is the last element.
   * The row's background sparkline uses this; an empty array renders
   * a flat zero line.
   */
  burnCents: number[];
  /** Days left in the current pay period. */
  daysLeft: number;
}

type RowStatus = "over" | "watch" | "calm";

function getStatus(targetCents: number, currentCents: number): RowStatus {
  if (targetCents <= 0) return "calm";
  if (currentCents > targetCents) return "over";
  if (currentCents / targetCents >= 0.8) return "watch";
  return "calm";
}

/**
 * Bar color per the spec.
 *   CALM  → planet color (each row's vessel hue; jupiter reads as
 *           "deep purple" for any vessel without an explicit color).
 *   WATCH → var(--vessel-watch) (warning orange, the second-priority state).
 *   OVER  → var(--vessel-over) (neon red — the only state that blinks).
 */
function getBarColor(status: RowStatus, planet: PlanetId | null): string {
  if (status === "over") return "var(--vessel-over)";
  if (status === "watch") return "var(--vessel-watch)";
  if (planet) return PLANET_COLORS[planet];
  return "var(--jupiter)";
}

export function AllocationFeed({ rows }: { rows: AllocationRow[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.length === 0 && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            background: "var(--vessel-surface)",
            border: "1px solid var(--vessel-border)",
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
        <AllocationRowItem key={r.id} row={r} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AllocationRowItem — one row, four visual layers.
// ---------------------------------------------------------------------------

function AllocationRowItem({ row }: { row: AllocationRow }) {
  const status = getStatus(row.targetCents, row.currentCents);
  const statusLabel = status === "over" ? "OVER" : status === "watch" ? "WATCH" : "CALM";
  const statusColor =
    status === "over" ? "var(--vessel-over)" : status === "watch" ? "var(--vessel-watch)" : "var(--jupiter)";
  const barColor = getBarColor(status, row.planet);
  const planetColor = row.planet ? PLANET_COLORS[row.planet] : "var(--ink-3)";

  // Fill width: clamped to 100% so the bar never overflows the track
  // visually. The numeric ledger below shows the true ratio (so an
  // envelope at 200% shows the bar full + "$800 / $400" + 200%).
  const fillPct =
    row.targetCents > 0
      ? Math.min(100, (row.currentCents / row.targetCents) * 100)
      : 0;

  // True ratio for the numeric ledger (can exceed 100% — that's the
  // whole point of the OVER state).
  const ratio =
    row.targetCents > 0 ? row.currentCents / row.targetCents : 0;
  const ratioDisplay = Math.round(ratio * 100);

  return (
    <Link
      href={`/envelopes/${row.id}`}
      className="allocation-row"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 18px 14px 22px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderLeft: `3px solid ${planetColor}`,
        borderRadius: 3,
        textDecoration: "none",
        color: "inherit",
        overflow: "hidden",
        transition: "transform 120ms, background 120ms, border-color 120ms",
      }}
    >
      {/* ── LAYER 1: BACKGROUND SPARKLINE ──────────────────────────────
          Full-width 14-day cadence chart at low opacity. Drawn behind
          everything else via position: absolute. */}
      <BackgroundSparkline burnCents={row.burnCents} barColor={barColor} />

      {/* ── LAYER 2: FOREGROUND HEADER ROW (title + ledger) ──────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Vessel glyph */}
        <div
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--vessel-dark)",
            border: `1px solid ${planetColor}`,
            color: planetColor,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: `0 0 6px ${planetColor}`,
            flexShrink: 0,
          }}
        >
          {planetGlyph(row.planet)}
        </div>

        {/* Title (name + status pill on the same line; last payee below) */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 15,
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
                padding: "2px 7px",
                border: `1px solid ${statusColor}`,
                borderRadius: 2,
                flexShrink: 0,
                textTransform: "uppercase",
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

        {/* Numeric ledger — the "$X.XX / $Y.YY" tracking pair */}
        <div
          style={{
            textAlign: "right",
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 15,
              fontWeight: 700,
              color: status === "over" ? "var(--vessel-over)" : "var(--ink)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              letterSpacing: "-0.005em",
              lineHeight: 1.1,
            }}
          >
            {formatMoney(row.currentCents)}
            <span
              style={{
                color: "var(--ink-4)",
                fontWeight: 500,
                margin: "0 6px",
              }}
            >
              /
            </span>
            <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>
              {row.targetCents > 0 ? formatMoney(row.targetCents) : "—"}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: status === "over" ? "var(--vessel-over)" : status === "watch" ? "var(--vessel-watch)" : "var(--ink-3)",
              letterSpacing: "0.14em",
              fontWeight: 600,
              marginTop: 3,
            }}
          >
            {row.targetCents > 0 ? `${ratioDisplay}%` : "—"}
            <span style={{ color: "var(--ink-5)", margin: "0 6px" }}>·</span>
            {row.daysLeft > 0 ? `${row.daysLeft}d left` : "—"}
          </div>
        </div>
      </div>

      {/* ── LAYER 3: LINEAR GAUGE BAR ──────────────────────────────────
          Thick (12px), fills left-to-right, with state colors. OVER
          state adds the .vessel-feed-bar--over class for the blink
          keyframe (defined in globals.css). */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: 12,
          background: "var(--vessel-dark)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 3,
          overflow: "hidden",
        }}
        aria-label={`${row.name} ${ratioDisplay}% of target`}
      >
        <div
          className={
            status === "over" ? "vessel-feed-bar--over" : undefined
          }
          style={{
            height: "100%",
            width: `${fillPct}%`,
            background: barColor,
            transition: "width 240ms",
            ...(status === "watch"
              ? { boxShadow: "0 0 8px var(--vessel-watch)" }
              : status === "calm"
                ? { boxShadow: `0 0 6px ${barColor}` }
                : {}),
          }}
        />
        {/* Pacing tick — where the user "should" be on day N of the
            period (gold, fixed at the 50% mark of the bar's lifecycle
            when half the period has elapsed). Skipped for now to keep
            the row visually focused on the state color story; can be
            wired back via a row prop in a future pass. */}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// BackgroundSparkline — the low-opacity 14-day cadence chart embedded
// behind the row. Uses the row's bar color so the OVER state's red
// sparkline visually reads as "the bar is on fire".
// ---------------------------------------------------------------------------

function BackgroundSparkline({
  burnCents,
  barColor,
}: {
  burnCents: number[];
  barColor: string;
}) {
  // Render a full-width sparkline that scales to the row's actual
  // width (viewBox 0 0 1000 60, width 100%, height 100%). The
  // `preserveAspectRatio="none"` lets it stretch.
  const VBW = 1000;
  const VBH = 60;
  const padX = 4;
  const padTop = 8;
  const padBottom = 8;
  const innerW = VBW - padX * 2;
  const innerH = VBH - padTop - padBottom;

  const n = Math.max(1, burnCents.length);
  const max = Math.max(1, ...burnCents);
  const stepX = innerW / (n - 1 || 1);
  const points = burnCents.map((v, i) => {
    const x = padX + i * stepX;
    const y = VBH - padBottom - (v / max) * innerH;
    return [x, y] as [number, number];
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath =
    points.length > 0
      ? `${linePath} L${last![0].toFixed(1)},${VBH - padBottom} L${first![0].toFixed(1)},${VBH - padBottom} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {areaPath && <path d={areaPath} fill={barColor} opacity="0.08" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={barColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.32"
        />
      )}
      {/* Today dot — rightmost point, slightly stronger so the eye
          can pick it out from the row. */}
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r="3"
          fill={barColor}
          opacity="0.55"
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function planetGlyph(p: PlanetId | null): string {
  switch (p) {
    case "sol":     return "☉";
    case "luna":    return "☽";
    case "mars":    return "♂";
    case "mercury": return "☿";
    case "jupiter": return "♃";
    case "venus":   return "♀";
    case "saturn":  return "♄";
    default:        return "·";
  }
}
