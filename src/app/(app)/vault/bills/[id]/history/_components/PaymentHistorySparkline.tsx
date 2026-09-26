/**
 * PaymentHistorySparkline — Cluster 7.15.
 *
 * A compact "rhythm at a glance" visual for
 * /vault/bills/[id]/history. Every audit event the bill has
 * seen becomes a dot, positioned by time, colored by tone
 * (good=green, watch=orange, bad=red, neutral=dim ink-3).
 *
 * **Layout**: section wrapper with eyebrow `// rhythm`, a dot
 * strip (relative-positioned, 40px tall, full container width),
 * and a tone-distribution legend beneath. Dots are absolutely
 * positioned; x = linear time scale (first→last event), y =
 * stack offset for same-timestamp collisions (0/8/16px).
 *
 * **Binning**: when the bill has more than 80 events the strip
 * bins by day (one dot per day, color = worst tone in that
 * day). The "long strip" view is the default for short bills;
 * the "binned" view is the fallback for long. Source-file
 * checks verify both the threshold and the strategy.
 *
 * **Interaction**: hovering a dot shows a small tooltip with
 * the actionType + humanized summary + relative time. Clicking
 * a dot smooth-scrolls to the matching `<tr id={dot.id}>` in
 * the LiveBillEventTable and gives the row a 1.5s flash. The
 * tooltip + click are optional — the dots render as a static
 * colored strip without JS; the `aria-label` per dot carries
 * the summary for screen readers / touch.
 *
 * **Empty state**: 0 events renders the section header + a
 * single line `// no events yet — the sparkline appears here as
 * events arrive`. The LiveBillEventTable below has its own
 * empty footer; the sparkline's empty state is parallel.
 *
 * **Server-side data shaping**: the page computes the dot array
 * (mapping `AuditLogRow[]` → `SparklineDot[]` via the existing
 * `humanizeVaultAction` + `TONE_FOR` from 7.11.1) and passes
 * it in. The client component is purely presentational + the
 * hover/click layer.
 *
 * Cluster 7.15 — first surface of the bill history page to
 * render the chart-first view of audit history (per xKryptic's
 * 2026-08-23 directive: "build the chart first; add a list only
 * if exact values can't live in the chart").
 */
"use client";

import * as React from "react";
import {
  TONE_COLOR,
  formatRelativeTime,
  type HumanizeTone,
} from "@/lib/vault/audit-log-shared";

export type SparklineDot = {
  /** Matches the row id in BillEventTableView so click-to-jump
   *  anchors work. Server-supplied — never client-generated. */
  id: string;
  /** UTC ISO timestamp; x = linear time scale. */
  at: string;
  /** The action type (e.g. "vault.payment_settled"). */
  actionType: string;
  /** Semantic tone; drives the dot color via TONE_COLOR. */
  tone: HumanizeTone;
  /** Humanized 1-liner (server-computed via humanizeVaultAction).
   *  Used in the hover tooltip + per-dot aria-label. */
  summary: string;
};

const BIN_THRESHOLD = 80;
const STACK_OFFSET_PX = 8;
const STRIP_HEIGHT_PX = 40;
const DOT_SIZE_PX = 8;
const FLASH_DURATION_MS = 1500;

const TONE_ORDER: ReadonlyArray<HumanizeTone> = [
  "good",
  "watch",
  "bad",
  "neutral",
];

/**
 * Worst-tone ordering for day bins. `bad` dominates (any day
 * with a failure shows red); then `watch`; then `good`; then
 * `neutral`. Stable across renders.
 */
const TONE_RANK: Record<HumanizeTone, number> = {
  bad: 3,
  watch: 2,
  good: 1,
  neutral: 0,
};

function pickWorstTone(tones: HumanizeTone[]): HumanizeTone {
  let best: HumanizeTone = "neutral";
  let bestRank = -1;
  for (const t of tones) {
    const r = TONE_RANK[t];
    if (r > bestRank) {
      best = t;
      bestRank = r;
    }
  }
  return best;
}

/** A bin (one dot per day for bills with >80 events). */
type SparklineBin = {
  /** YYYY-MM-DD in UTC. */
  date: string;
  /** Worst tone across the dots in this bin (color). */
  tone: HumanizeTone;
  /** Number of dots binned into this day (tooltip). */
  count: number;
  /** Humanized summary: e.g. "5 events · Rent · payment settled · $1,820.00". */
  summary: string;
  /** Representative actionType (highest-rank tone). */
  actionType: string;
  /** Midpoint ISO timestamp for x positioning. */
  midAt: string;
};

/**
 * Bin dots by day. Returns one bin per day, color = worst tone,
 * position = day midpoint. Same-timestamp stacks within a day
 * are not preserved (the bin is the dot; the user sees "N events
 * on this day" via the tooltip).
 */
function binByDay(dots: SparklineDot[]): SparklineBin[] {
  const byDay = new Map<
    string,
    { dots: SparklineDot[]; midSum: number; midCount: number }
  >();
  for (const d of dots) {
    const day = d.at.slice(0, 10);
    const entry = byDay.get(day);
    if (entry) {
      entry.dots.push(d);
      entry.midSum += Date.parse(d.at);
      entry.midCount += 1;
    } else {
      byDay.set(day, { dots: [d], midSum: Date.parse(d.at), midCount: 1 });
    }
  }
  const bins: SparklineBin[] = [];
  for (const [date, { dots: dayDots, midSum, midCount }] of byDay) {
    const tones = dayDots.map((d) => d.tone);
    const worst = pickWorstTone(tones);
    const worstDot = dayDots.find((d) => d.tone === worst) ?? dayDots[0]!;
    bins.push({
      date,
      tone: worst,
      count: dayDots.length,
      summary: `${dayDots.length} event${dayDots.length === 1 ? "" : "s"} · worst ${worst}`,
      actionType: worstDot.actionType,
      midAt: new Date(midSum / midCount).toISOString(),
    });
  }
  bins.sort((a, b) => a.midAt.localeCompare(b.midAt));
  return bins;
}

export function PaymentHistorySparkline({
  dots,
}: {
  dots: SparklineDot[];
}) {
  // ── State for hover + click-flash ────────────────────────────
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // ── Empty state ──────────────────────────────────────────────
  if (dots.length === 0) {
    return (
      <div
        data-testid="vault-bill-history-sparkline"
        aria-label="Payment history at a glance"
        style={{
          padding: "24px 18px",
          border: "1px dashed var(--vessel-border)",
          background: "var(--vessel-surface)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 32,
        }}
      >
        // no events yet — the sparkline appears here as events
        arrive
      </div>
    );
  }

  // ── Tone distribution (computed once, used in legend) ──────
  const toneCounts: Record<HumanizeTone, number> = {
    good: 0,
    watch: 0,
    bad: 0,
    neutral: 0,
  };
  for (const d of dots) toneCounts[d.tone] += 1;

  // ── Binning decision ─────────────────────────────────────────
  const useBins = dots.length > BIN_THRESHOLD;
  const bins = useBins ? binByDay(dots) : null;

  // x-axis range — first to last event (in ms). When we bin,
  // the bins themselves carry the time anchors.
  const firstMs = useBins
    ? Date.parse(bins![0]!.midAt)
    : Date.parse(dots[0]!.at);
  const lastMs = useBins
    ? Date.parse(bins![bins!.length - 1]!.midAt)
    : Date.parse(dots[dots.length - 1]!.at);
  const range = Math.max(1, lastMs - firstMs);

  // Single-event case: range === 0 forces division by zero; clamp.
  const xPct = (iso: string) => {
    if (lastMs === firstMs) return 50;
    return ((Date.parse(iso) - firstMs) / range) * 100;
  };

  // Stack same-timestamp dots horizontally (within the strip,
  // not within a day-bin). Group by exact ms.
  const stackByMs = new Map<number, number>();
  const stackIndex = (ms: number) => {
    const v = stackByMs.get(ms) ?? 0;
    stackByMs.set(ms, v + 1);
    return v;
  };

  const handleClick = (id: string) => {
    const target = typeof document !== "undefined"
      ? document.getElementById(id)
      : null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashId(null);
      flashTimer.current = null;
    }, FLASH_DURATION_MS);
  };

  return (
    <div
      data-testid="vault-bill-history-sparkline"
      aria-label="Payment history at a glance"
      style={{
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        padding: "18px 20px 16px",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          // rhythm · {dots.length} event{dots.length === 1 ? "" : "s"}
          {useBins ? ` (binned by day · ${bins!.length} day${bins!.length === 1 ? "" : "s"})` : ""}
        </div>
        <div
          style={{
            fontSize: 9.5,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          hover for details · click to jump
        </div>
      </div>

      {/* Dot strip */}
      <div
        data-testid="vault-bill-history-sparkline-strip"
        style={{
          position: "relative",
          height: STRIP_HEIGHT_PX,
          background:
            "linear-gradient(to right, transparent, var(--vessel-dark) 8%, var(--vessel-dark) 92%, transparent)",
          borderRadius: 2,
        }}
      >
        {useBins
          ? bins!.map((b) => {
              const left = `${xPct(b.midAt)}%`;
              const tooltipId = `vault-bill-history-sparkline-bin-${b.date}`;
              const isHovered = hoveredId === tooltipId;
              return (
                <button
                  key={b.date}
                  type="button"
                  data-testid="vault-bill-history-sparkline-bin"
                  data-tone={b.tone}
                  aria-label={`${b.date} · ${b.summary}`}
                  onMouseEnter={() => setHoveredId(tooltipId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(tooltipId)}
                  onBlur={() => setHoveredId(null)}
                  style={{
                    position: "absolute",
                    left,
                    top: "50%",
                    width: DOT_SIZE_PX + 2,
                    height: DOT_SIZE_PX + 2,
                    marginLeft: -(DOT_SIZE_PX + 2) / 2,
                    marginTop: -(DOT_SIZE_PX + 2) / 2,
                    borderRadius: "50%",
                    background: TONE_COLOR[b.tone],
                    border: "none",
                    padding: 0,
                    cursor: "default",
                    boxShadow: isHovered
                      ? `0 0 0 2px var(--vessel-accent-soft), 0 0 0 4px ${TONE_COLOR[b.tone]}`
                      : "none",
                  }}
                >
                  {isHovered ? (
                    <Tooltip
                      actionType={b.actionType}
                      summary={b.summary}
                      at={b.midAt}
                    />
                  ) : null}
                </button>
              );
            })
          : dots.map((d) => {
              const ms = Date.parse(d.at);
              const stackIdx = stackIndex(ms);
              const left = `${xPct(d.at)}%`;
              const top = `calc(50% + ${(stackIdx - (stackByMs.get(ms)! - 1) / 2) * STACK_OFFSET_PX}px)`;
              const isHovered = hoveredId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  data-testid="vault-bill-history-sparkline-dot"
                  data-tone={d.tone}
                  aria-label={`${d.actionType} · ${d.summary} · ${formatRelativeTime(d.at)}`}
                  title={`${d.actionType} · ${d.summary} · ${formatRelativeTime(d.at)}`}
                  onMouseEnter={() => setHoveredId(d.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(d.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => handleClick(d.id)}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: DOT_SIZE_PX,
                    height: DOT_SIZE_PX,
                    marginLeft: -DOT_SIZE_PX / 2,
                    marginTop: -DOT_SIZE_PX / 2,
                    borderRadius: "50%",
                    background: TONE_COLOR[d.tone],
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    boxShadow:
                      flashId === d.id
                        ? `0 0 0 3px var(--vessel-accent)`
                        : isHovered
                          ? `0 0 0 2px var(--vessel-accent-soft)`
                          : "none",
                    transition: "box-shadow 200ms ease-out",
                  }}
                >
                  {isHovered ? (
                    <Tooltip
                      actionType={d.actionType}
                      summary={d.summary}
                      at={d.at}
                    />
                  ) : null}
                </button>
              );
            })}
      </div>

      {/* Tone legend */}
      <div
        data-testid="vault-bill-history-sparkline-legend"
        style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          flexWrap: "wrap",
        }}
      >
        {TONE_ORDER.map((t) => {
          const count = toneCounts[t];
          if (count === 0) return null;
          return (
            <span
              key={t}
              data-testid={`vault-bill-history-sparkline-legend-${t}`}
              data-tone={t}
              data-count={count}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: DOT_SIZE_PX,
                  height: DOT_SIZE_PX,
                  borderRadius: "50%",
                  background: TONE_COLOR[t],
                }}
              />
              {count} {t}
            </span>
          );
        })}
      </div>

      {/* CSS-in-JS keyframes for the flash — kept here so the
          component is self-contained. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes vault-bill-history-sparkline-flash {
            0% { box-shadow: 0 0 0 0 var(--vessel-accent); }
            50% { box-shadow: 0 0 0 4px var(--vessel-accent); }
            100% { box-shadow: 0 0 0 0 var(--vessel-accent); }
          }`,
        }}
      />
    </div>
  );
}

function Tooltip({
  actionType,
  summary,
  at,
}: {
  actionType: string;
  summary: string;
  at: string;
}) {
  return (
    <div
      data-testid="vault-bill-history-sparkline-tooltip"
      role="tooltip"
      style={{
        position: "absolute",
        bottom: `calc(100% + 8px)`,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--vessel-dark)",
        border: "1px solid var(--vessel-border)",
        color: "var(--ink-1)",
        padding: "8px 10px",
        borderRadius: 2,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10.5,
        lineHeight: 1.45,
        letterSpacing: "0.05em",
        textTransform: "none",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          color: "var(--ink-3)",
          textTransform: "uppercase",
          fontSize: 9.5,
          letterSpacing: "0.18em",
          marginBottom: 4,
        }}
      >
        {actionType}
      </div>
      <div>{summary}</div>
      <div
        style={{
          color: "var(--ink-3)",
          fontSize: 9.5,
          marginTop: 4,
        }}
      >
        {formatRelativeTime(at)}
      </div>
    </div>
  );
}