"use client";

/**
 * PaymentHistorySparkline — Cluster 7.15.
 *
 * Per-bill payment-history rhythm visual. One dot per audit event
 * the bill has ever seen, positioned by `createdAtIso` on a linear
 * time scale, colored by `tone` (using the 7.11.1 `TONE_FOR` map
 * + `TONE_COLOR` CSS-var map). Below the strip, a tone-distribution
 * legend (`[5 good] [2 watch] [1 bad] [12 neutral]`).
 *
 * Hover: small tooltip with the humanized summary (reuses
 * `humanizeVaultAction` from 7.11.1 — client-safe, no
 * `server-only` import) + relative time.
 *
 * Click: smooth-scrolls to the matching row in the
 * `LiveBillEventTable` and adds a 1.5s `.flash` class for visual
 * feedback (cyan border + soft vessel-accent-soft background).
 *
 * Empty state: a single line "no events yet — the sparkline
 * appears here as events arrive".
 *
 * Long-bill binning (events > 80): one dot per day, colored by
 * the worst tone in that day. Source-level: source checks verify
 * the threshold + binning strategy in the smoke.
 *
 * Pairing with 7.11.1: tone colors are CSS vars only; no new
 * color literals. The component is a thin presentation layer over
 * `TONE_FOR` + `TONE_COLOR` + `humanizeVaultAction`.
 */
import * as React from "react";
import {
  TONE_COLOR,
  humanizeVaultAction,
  type HumanizeTone,
} from "@/lib/vault/audit-log-shared";

export interface SparklineEvent {
  id: string;
  actionType: string;
  atMs: number;
  payload: Record<string, unknown>;
}

interface SparklineDot {
  /** Unique id within the strip (event.id + stack-offset). */
  dotId: string;
  /** Event id (for click-jump). */
  eventId: string;
  /** X position in percent (0-100). */
  xPct: number;
  /** Vertical stack offset in px (0, 8, 16, ...) for same-x collisions. */
  stackY: number;
  /** Semantic tone. */
  tone: HumanizeTone;
  /** Humanized summary text. */
  humanText: string;
  /** Tooltip label (humanText + relative time). */
  ariaLabel: string;
}

const LONG_BILL_THRESHOLD = 80;
const SAME_X_STACK_PX = 8;
const FLASH_DURATION_MS = 1500;

function relativeTime(ms: number, nowMs: number): string {
  const delta = nowMs - ms;
  if (delta < 0) return "in the future";
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

function worstTone(tones: HumanizeTone[]): HumanizeTone {
  if (tones.some((t) => t === "bad")) return "bad";
  if (tones.some((t) => t === "watch")) return "watch";
  if (tones.some((t) => t === "good")) return "good";
  return "neutral";
}

export function PaymentHistorySparkline({
  events,
  totalEventCount,
}: {
  events: SparklineEvent[];
  /** All bill events (unfiltered, for the "X more events hidden by filter" hint). */
  totalEventCount: number;
}) {
  const [now, setNow] = React.useState<number>(() => Date.now());

  // The audit log rows come in descending createdAt (newest first).
  // Reverse to ascending for the time scale.
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => a.atMs - b.atMs),
    [events],
  );

  const dots: SparklineDot[] = React.useMemo(() => {
    if (sorted.length === 0) return [];
    if (sorted.length === 1) {
      const e: SparklineEvent = sorted[0]!;
      const h = humanizeVaultAction(
        e.actionType as Parameters<typeof humanizeVaultAction>[0],
        e.payload,
      );
      return [
        {
          dotId: `${e.id}-0`,
          eventId: e.id,
          xPct: 50,
          stackY: 0,
          tone: h?.tone ?? "neutral",
          humanText: h?.text ?? e.actionType,
          ariaLabel: `${h?.text ?? e.actionType} · ${relativeTime(e.atMs, now)}`,
        },
      ];
    }

    const first: SparklineEvent = sorted[0]!;
    const last: SparklineEvent = sorted[sorted.length - 1]!;
    const firstMs = first.atMs;
    const lastMs = last.atMs;
    const span = lastMs - firstMs || 1;

    // Group by exact xPct (rounded to integer) for stacking.
    const byX = new Map<number, SparklineDot[]>();
    for (const e of sorted) {
      const xPct = Math.round(((e.atMs - firstMs) / span) * 100);
      const h = humanizeVaultAction(
        e.actionType as Parameters<typeof humanizeVaultAction>[0],
        e.payload,
      );
      const dot: SparklineDot = {
        dotId: `${e.id}-${(byX.get(xPct)?.length ?? 0)}`,
        eventId: e.id,
        xPct,
        stackY: 0, // assigned below
        tone: h?.tone ?? "neutral",
        humanText: h?.text ?? e.actionType,
        ariaLabel: `${h?.text ?? e.actionType} · ${relativeTime(e.atMs, now)}`,
      };
      const list = byX.get(xPct) ?? [];
      list.push(dot);
      byX.set(xPct, list);
    }
    // Assign stack offsets.
    for (const list of byX.values()) {
      list.forEach((d, i) => {
        d.stackY = i * SAME_X_STACK_PX;
      });
    }
    return [...byX.values()].flat();
  }, [sorted, now]);

  // Long-bill binning: if events > LONG_BILL_THRESHOLD, collapse
  // to one dot per day, colored by the worst tone in that day.
  const binnedDots: SparklineDot[] = React.useMemo(() => {
    if (dots.length <= LONG_BILL_THRESHOLD) return dots;
    const byDay = new Map<string, SparklineDot[]>();
    for (const d of dots) {
      const event = sorted.find((e) => e.id === d.eventId);
      if (!event) continue;
      const dayKey = new Date(event.atMs).toISOString().slice(0, 10);
      const list = byDay.get(dayKey) ?? [];
      list.push(d);
      byDay.set(dayKey, list);
    }
    const out: SparklineDot[] = [];
    for (const [dayKey, dayDots] of byDay) {
      const tones = dayDots.map((d) => d.tone);
      const worst = worstTone(tones);
      const firstDot: SparklineDot | undefined = dayDots[0];
      const firstEvent = sorted.find(
        (e) => new Date(e.atMs).toISOString().slice(0, 10) === dayKey,
      );
      if (!firstDot) continue;
      out.push({
        dotId: `day-${dayKey}`,
        eventId: firstEvent?.id ?? firstDot.eventId,
        xPct: firstDot.xPct,
        stackY: 0,
        tone: worst,
        humanText: `${dayDots.length} events on ${dayKey}`,
        ariaLabel: `${dayKey}: ${dayDots.length} events (${tones.join(", ")})`,
      });
    }
    out.sort((a, b) => a.xPct - b.xPct);
    return out;
  }, [dots, sorted]);

  // Refresh "X ago" tooltip text once a minute so the relative time
  // doesn't go stale while the user is on the page.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const onDotClick = React.useCallback((eventId: string) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(eventId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    window.setTimeout(() => el.classList.remove("flash"), FLASH_DURATION_MS);
  }, []);

  // Tone legend counts (computed from the raw dots, not binned —
  // the legend should reflect what's in the table).
  const counts: Record<HumanizeTone, number> = React.useMemo(() => {
    const c: Record<HumanizeTone, number> = {
      good: 0,
      watch: 0,
      bad: 0,
      neutral: 0,
    };
    for (const d of dots) c[d.tone] += 1;
    return c;
  }, [dots]);

  // Empty state — single line, parallel to the LiveBillEventTable
  // empty footer below.
  if (dots.length === 0) {
    return (
      <div
        data-testid="vault-bill-sparkline-empty"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 32,
          padding: "16px 18px",
          border: "1px dashed var(--vessel-border)",
          background: "var(--vessel-surface)",
          textAlign: "center",
        }}
      >
        // no events yet — the sparkline appears here as events arrive
      </div>
    );
  }

  const isBinned = dots.length > LONG_BILL_THRESHOLD;
  const displayDots = isBinned ? binnedDots : dots;

  return (
    <div
      data-testid="vault-bill-sparkline"
      aria-label="Payment history at a glance"
      style={{
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        padding: "20px 22px 18px",
        marginBottom: 32,
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span>{displayDots.length} dots · {dots.length} events</span>
        {totalEventCount > dots.length && (
          <span style={{ color: "var(--vessel-watch)" }}>
            // {totalEventCount - dots.length} more events hidden by current filter
          </span>
        )}
        {isBinned && (
          <span style={{ color: "var(--vessel-accent)" }}>
            // binned by day (worst-tone per day)
          </span>
        )}
      </div>

      {/* The dot strip — relative-positioned, full width */}
      <div
        data-testid="vault-bill-sparkline-strip"
        style={{
          position: "relative",
          height: 28,
          marginBottom: 14,
          borderBottom: "1px solid var(--vessel-border)",
        }}
      >
        {displayDots.map((d) => (
          <button
            key={d.dotId}
            type="button"
            data-testid="vault-bill-sparkline-dot"
            data-tone={d.tone}
            aria-label={d.ariaLabel}
            title={d.humanText}
            onClick={() => onDotClick(d.eventId)}
            style={{
              position: "absolute",
              left: `${d.xPct}%`,
              bottom: 4 + d.stackY,
              transform: "translateX(-50%)",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: TONE_COLOR[d.tone],
              border: "none",
              padding: 0,
              cursor: "pointer",
              boxShadow: "0 0 0 0 transparent",
              transition: "box-shadow 120ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 0 0 3px ${TONE_COLOR[d.tone]}`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 0 0 transparent";
            }}
          />
        ))}
      </div>

      {/* Tone legend — one count per tone */}
      <div
        data-testid="vault-bill-sparkline-legend"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-2)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
        }}
      >
        {(["good", "watch", "bad", "neutral"] as HumanizeTone[]).map((t) => {
          const n = counts[t];
          if (n === 0) return null;
          return (
            <span
              key={t}
              data-testid={`vault-bill-sparkline-legend-${t}`}
              data-tone-count={n}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: TONE_COLOR[t],
                }}
                aria-hidden
              />
              {n} {t}
            </span>
          );
        })}
      </div>
    </div>
  );
}
