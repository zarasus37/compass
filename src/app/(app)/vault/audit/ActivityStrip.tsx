/**
 * ActivityStrip — 30-day audit-log activity bar chart.
 *
 * Visual-first (per xKryptic User Memory 2026-08-23): the strip
 * shows the user the SHAPE of their system activity before they
 * read a single row. One bar per day, oldest left → today right.
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
 */
import * as React from "react";
import type { AuditLogActivityDay } from "@/lib/vault/audit-log";

const WIDTH = 720;
const HEIGHT = 84;
const COLS = 30;
const BAR_WIDTH = 18;
const COL_GAP = (WIDTH - BAR_WIDTH * COLS) / (COLS - 1);
const MAX_BAR_HEIGHT = 60;
const BAR_SCALE = 4; // sqrt(count) * 4
const TOP_PAD = 16;
const BOTTOM_PAD = 8;

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
  if (days.length !== COLS) {
    // Defensive: the data layer always returns 30. If a future
    // caller passes a different length, pad/truncate so the
    // strip still renders without breaking the layout.
    if (days.length < COLS) {
      const padded = [...days];
      while (padded.length < COLS) {
        padded.push({ dateKey: "", count: 0, failedCount: 0 });
      }
      days = padded;
    } else {
      days = days.slice(-COLS);
    }
  }

  const totalInPeriod = days.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const todayKey = dateKeyLocal(now);
  const isEmpty = totalInPeriod === 0;
  const firstKey = days[0]?.dateKey;
  const lastKey = days[days.length - 1]?.dateKey;
  // Cluster 7.7 — `rangeActive` is true when at least one of
  // rangeFrom/rangeTo is set. We use it to render a small
  // "range active" label in the strip's header.
  const rangeActive = Boolean(rangeFrom || rangeTo);

  return (
    <div
      data-testid="vault-audit-activity-strip"
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
          {rangeActive ? "// 30-day shape (range active)" : "// 30-day shape"}
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
            ? "// quiet — no activity in 30d"
            : `// ${totalInPeriod} events · peak ${maxCount}/d`}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={`Audit log activity over the last 30 days. ${totalInPeriod} events total.`}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      >
        {/* Faint horizontal grid at max height for reference */}
        <line
          x1={0}
          y1={TOP_PAD + MAX_BAR_HEIGHT + 0.5}
          x2={WIDTH}
          y2={TOP_PAD + MAX_BAR_HEIGHT + 0.5}
          stroke="var(--vessel-border)"
          strokeWidth={1}
        />
        {days.map((d, i) => {
          const x = i * (BAR_WIDTH + COL_GAP);
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
                  x2={x + BAR_WIDTH}
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
                  width={BAR_WIDTH}
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
              {/* Day-of-month label (every 5th + today) */}
              {(i % 5 === 0 || isToday) && d.dateKey ? (
                <text
                  x={x + BAR_WIDTH / 2}
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
            x={WIDTH}
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
        {days.map((d, i) =>
          d.dateKey === todayKey ? (
            <text
              key={`today-label-${i}`}
              x={i * (BAR_WIDTH + COL_GAP) + BAR_WIDTH / 2 - 1}
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

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
