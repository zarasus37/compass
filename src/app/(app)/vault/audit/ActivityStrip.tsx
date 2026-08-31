/**
 * ActivityStrip — audit-log activity bar chart.
 *
 * Visual-first (per xKryptic User Memory 2026-08-23): the strip
 * shows the user the SHAPE of their system activity before they
 * read a single row. One bar per day (or one per ~4 days for the
 * year view), oldest left → today right.
 *
 * Pure SVG, server component. No client islands.
 *
 * Bar height = sqrt(count) * 4 (squash so quiet days still show),
 * max 60px. Bar color: cyan (terminal) by default, vessel-over if
 * any failures that day, vessel-gold for today. Empty days are
 * rendered as a dashed neutral column.
 *
 * Hover any bar: native <title> tooltip with date + count +
 * failure count.
 *
 * Cluster 7.7 — when `rangeFrom` / `rangeTo` are set (the page
 * has a date-range filter active), bars OUTSIDE the range are
 * dimmed to ~30% opacity. The user can still see the 30-day
 * shape but the in-range window is highlighted. Bars on the
 * boundary are still full-opacity so the visual cutoff is
 * obvious.
 *
 * Cluster 7.8 — dynamic column count. The strip is capped at
 * 90 columns (the retention horizon) and downsamples wider
 * windows into 90 buckets. So `days=30` renders 30 daily
 * bars (the original look); `days=90` renders 90 daily bars
 * at 7px each; `days=365` renders 90 bars where each bar
 * covers ~4 days. The total events + peak count come from
 * the downsampled buckets, so the header reflects what the
 * strip shows.
 */
import * as React from "react";
import type { AuditLogActivityDay } from "@/lib/vault/audit-log";

const WIDTH = 720;
const HEIGHT = 84;
const MAX_COLS = 90;
const DEFAULT_BAR_WIDTH = 18;
const DEFAULT_COL_GAP = 6;
const MAX_BAR_HEIGHT = 60;
const BAR_SCALE = 4; // sqrt(count) * 4
const TOP_PAD = 16;
const BOTTOM_PAD = 8;

/** Compute the strip's geometry for a given data length.
 *  Returns { cols, barWidth, colGap, width }. */
function geometryFor(n: number): {
  cols: number;
  barWidth: number;
  colGap: number;
  width: number;
} {
  const cols = Math.max(1, Math.min(MAX_COLS, n));
  if (n <= 30) {
    // Original look: 30 wide daily bars.
    return {
      cols,
      barWidth: DEFAULT_BAR_WIDTH,
      colGap: DEFAULT_COL_GAP,
      width: WIDTH,
    };
  }
  // Wider windows: thinner bars, 1px gap. WIDTH grows with
  // cols so each bar has the same visual weight; the parent
  // has `overflowX: auto` so anything wider than the viewport
  // becomes scrollable.
  const barWidth = 7;
  const colGap = 1;
  return { cols, barWidth, colGap, width: cols * (barWidth + colGap) };
}

/** Downsample N daily entries into `target` buckets by summing
 *  counts within each bucket. The first bucket is the
 *  oldest days; the last bucket is the most recent. Used to
 *  collapse a 365-day strip into 90 columns without losing
 *  the per-day total in the header. */
function downsample(
  days: AuditLogActivityDay[],
  target: number,
): AuditLogActivityDay[] {
  if (days.length <= target) return days;
  const out: AuditLogActivityDay[] = [];
  const groupSize = days.length / target;
  for (let i = 0; i < target; i += 1) {
    const start = Math.floor(i * groupSize);
    const end = Math.min(days.length, Math.floor((i + 1) * groupSize));
    const slice = days.slice(start, end);
    const first = slice[0];
    const count = slice.reduce((s, d) => s + d.count, 0);
    const failedCount = slice.reduce((s, d) => s + d.failedCount, 0);
    out.push({
      dateKey: first?.dateKey ?? "",
      count,
      failedCount,
    });
  }
  return out;
}

export function ActivityStrip({
  days,
  now = new Date(),
  rangeFrom,
  rangeTo,
}: {
  days: AuditLogActivityDay[];
  now?: Date;
  /** Cluster 7.7 — when set, bars before this date (YYYY-MM-DD) are dimmed. */
  rangeFrom?: string;
  /** Cluster 7.7 — when set, bars after this date (YYYY-MM-DD) are dimmed. */
  rangeTo?: string;
}) {
  // Downsample to MAX_COLS first, then compute geometry from
  // the downsampled length. The downsampled data IS what the
  // strip displays; the source data may have more entries.
  const display = downsample(days, MAX_COLS);
  const { cols, barWidth, colGap, width } = geometryFor(display.length);
  // If the geometry wants fewer cols than we have buckets
  // (shouldn't happen — we capped at MAX_COLS — but be safe),
  // take the last `cols` buckets.
  const trimmed =
    display.length > cols ? display.slice(display.length - cols) : display;
  const data = trimmed;

  const totalInPeriod = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const todayKey = dateKeyLocal(now);
  const isEmpty = totalInPeriod === 0;
  const firstKey = data[0]?.dateKey;
  const lastKey = data[data.length - 1]?.dateKey;
  // Cluster 7.7 — `rangeActive` is true when at least one of
  // rangeFrom/rangeTo is set. We use it to render a small
  // "range active" label in the strip's header.
  const rangeActive = Boolean(rangeFrom || rangeTo);
  // Cluster 7.8 — the strip header reflects the actual range
  // size (30/90/365) so the user knows what they're looking at.
  const windowDays = days.length;
  const headerLabel = `${windowDays}-day shape`;

  return (
    <div
      data-testid="vault-audit-activity-strip"
      data-window-days={windowDays}
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        padding: "16px 20px 12px",
        marginBottom: 32,
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          {rangeActive ? `// ${headerLabel} (range active)` : `// ${headerLabel}`}
        </div>
        <div
          data-testid="vault-audit-activity-summary"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          {isEmpty
            ? `// quiet — no activity in ${windowDays}d`
            : `// ${totalInPeriod} events · peak ${maxCount}/d`}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Audit log activity over the last ${windowDays} days. ${totalInPeriod} events total.`}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      >
        {/* Faint horizontal grid at max height for reference */}
        <line
          x1={0}
          y1={TOP_PAD + MAX_BAR_HEIGHT + 0.5}
          x2={width}
          y2={TOP_PAD + MAX_BAR_HEIGHT + 0.5}
          stroke="var(--vessel-border)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const x = i * (barWidth + colGap);
          const isToday = d.dateKey === todayKey;
          const hasFailed = d.failedCount > 0;
          // Cluster 7.7 — is this bar inside the active range?
          // Empty bars + out-of-range bars get dimmed. The
          // opacity attribute is supported on every SVG shape
          // we render (rect, line, text).
          const inRange =
            !rangeActive ||
            ((!rangeFrom || d.dateKey >= rangeFrom) &&
              (!rangeTo || d.dateKey <= rangeTo));
          const dimOpacity = rangeActive && !inRange ? 0.3 : 1;
          const color = isToday
            ? "var(--vessel-gold)"
            : hasFailed
              ? "var(--vessel-over)"
              : d.count > 0
                ? "var(--vessel-accent)"
                : "var(--vessel-border)";
          const h = d.count > 0
            ? Math.min(MAX_BAR_HEIGHT, Math.sqrt(d.count) * BAR_SCALE)
            : 4; // empty day stub
          const y = TOP_PAD + MAX_BAR_HEIGHT - h;
          const labelY = y - 4;
          return (
            <g
              key={d.dateKey || `empty-${i}`}
              data-testid={`vault-audit-activity-bar-${d.dateKey || `empty-${i}`}`}
              data-in-range={inRange ? "true" : "false"}
            >
              {/* Empty-day stub: dashed */}
              {d.count === 0 ? (
                <line
                  x1={x}
                  y1={TOP_PAD + MAX_BAR_HEIGHT - 2}
                  x2={x + barWidth}
                  y2={TOP_PAD + MAX_BAR_HEIGHT - 2}
                  stroke="var(--vessel-border)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={dimOpacity}
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  fill={color}
                  rx={1}
                  opacity={dimOpacity}
                />
              )}
              {/* Today tick (gold) */}
              {isToday ? (
                <line
                  x1={x - 1}
                  y1={TOP_PAD}
                  x2={x - 1}
                  y2={TOP_PAD + MAX_BAR_HEIGHT + BOTTOM_PAD}
                  stroke="var(--vessel-gold)"
                  strokeWidth={1.5}
                  opacity={dimOpacity}
                />
              ) : null}
              {/* Day-of-month label (density-aware) */}
              {(labelEvery(windowDays, i) || isToday) && d.dateKey ? (
                <text
                  x={x + barWidth / 2}
                  y={labelY}
                  textAnchor="middle"
                  fontFamily="var(--font-jetbrains), monospace"
                  fontSize={8}
                  fill={isToday ? "var(--vessel-gold)" : "var(--ink-3)"}
                  opacity={dimOpacity}
                >
                  {d.dateKey.slice(8)}
                </text>
              ) : null}
              {/* Native tooltip */}
              <title>
                {d.dateKey
                  ? `${d.dateKey} · ${d.count} event${d.count === 1 ? "" : "s"}${
                      d.failedCount > 0
                        ? ` · ${d.failedCount} failed`
                        : ""
                    }${!inRange ? " · out of range" : ""}`
                  : "no data"}
              </title>
            </g>
          );
        })}
        {/* Range labels at corners */}
        {firstKey ? (
          <text
            x={0}
            y={HEIGHT - 1}
            fontFamily="var(--font-jetbrains), monospace"
            fontSize={8}
            fill="var(--ink-3)"
          >
            {firstKey.slice(5).replace("-", "/")}
          </text>
        ) : null}
        {lastKey ? (
          <text
            x={width}
            y={HEIGHT - 1}
            textAnchor="end"
            fontFamily="var(--font-jetbrains), monospace"
            fontSize={8}
            fill="var(--ink-3)"
          >
            {lastKey.slice(5).replace("-", "/")}
          </text>
        ) : null}
        {/* TODAY label above the gold tick */}
        {data.map((d, i) =>
          d.dateKey === todayKey ? (
            <text
              key={`today-label-${i}`}
              x={i * (barWidth + colGap) + barWidth / 2 - 1}
              y={TOP_PAD - 4}
              textAnchor="middle"
              fontFamily="var(--font-jetbrains), monospace"
              fontSize={7.5}
              fontWeight={700}
              fill="var(--vessel-gold)"
              letterSpacing="0.15em"
            >
              TODAY
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** Density-aware label cadence. The original 30-day strip
 *  labeled every 5th bar; for 90/365-day windows we space
 *  the labels further so the strip doesn't become a wall of
 *  digits. */
function labelEvery(windowDays: number, i: number): boolean {
  if (windowDays <= 30) return i % 5 === 0;
  if (windowDays <= 90) return i % 10 === 0;
  return i % 10 === 0;
}

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
