/**
 * TopAppBar — the persistent header pinned to the top of every signed-in
 * screen (Cluster 3.x).
 *
 * Three elements, left-to-right:
 *   - BRAND: small ☉ glyph + "COMPASS" wordmark → links to /.
 *   - PAY PERIOD WINDOW: eyebrow + bracketed date range + day-of-period
 *     + a thin progress bar showing where we are in the period. Centered.
 *   - ENGINE TOGGLE: pill showing the current engine state (L1 rules
 *     engine) + a settings cog. Single click → /settings.
 *
 * Style: Component Oracle Terminal. Cosmos canvas, line border, square
 * 4px corners, JetBrains Mono for data/labels, Sora for the wordmark.
 *
 * Position: sticky so it never scrolls out of view. Background cosmos
 * with a 1px line border and a soft drop shadow so the bar visually
 * lifts off the content as the user scrolls.
 *
 * Server component. No client interactivity — the only interactive
 * surface is the two <Link>s. This keeps the bar cheap and lets the
 * SSR output always be correct (no hydration mismatch on the date
 * range if a long-running session is open across midnight).
 */

import * as React from "react";
import Link from "next/link";
import {
  PERIOD_START,
  PERIOD_END,
  TODAY,
} from "@/lib/mock";
import {
  dayOfPeriod,
  periodLength,
} from "@/lib/format";

/**
 * The current engine state. In a future build this would come from
 * a store-backed preference (the L1/L2 toggle in /settings). For now
 * the L1 rules engine is the canonical state — every derivation in
 * lib/store.ts uses it. The right-side pill surfaces the state so
 * the user always knows which engine produced the numbers they see.
 */
const ENGINE_STATE = "L1";
const ENGINE_LABEL = "RULES ENGINE";

export function TopAppBar() {
  // --- Pay period metrics ---
  // dayOfPeriod returns 0 when TODAY is outside [PERIOD_START, PERIOD_END).
  // The clamp keeps the bar usable in the edge case (e.g. dev sandbox
  // where TODAY is mock-frozen before the period).
  const totalDays = periodLength(PERIOD_START, PERIOD_END);
  const rawDay = dayOfPeriod(TODAY, PERIOD_START, PERIOD_END);
  const day = Math.max(1, Math.min(rawDay || 1, totalDays));
  const pct = totalDays > 0 ? Math.min(100, (day / totalDays) * 100) : 0;

  // Bracketed date range. "Aug 15 – Aug 29" inside terminal-style
  // square brackets — the brackets are muted (ink-4) so the dates
  // themselves carry the weight.
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const range = `${fmt(PERIOD_START)} — ${fmt(PERIOD_END)}`;

  // Pad the dates so "Aug 1" and "Aug 15" line up vertically. (mono
  // tnum feature aligns digits; the em-dash stays centered.)
  const rangePadded = range.replace(/(\w+ \d+) — (\w+ \d+)/, (_m, a, b) => {
    return `${a.padEnd(7, " ")}  —  ${b.padStart(7, " ")}`;
  });

  return (
    <header
      aria-label="App header"
      className="top-app-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--cosmos)",
        borderBottom: "1px solid var(--line)",
        height: 60,
        padding: "0 28px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 28,
        // Subtle drop shadow so the bar visually lifts off the
        // content as the user scrolls past the top fold.
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* ─────────── LEFT: BRAND ─────────── */}
      <Link
        href="/"
        aria-label="Compass — home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          justifySelf: "start",
          textDecoration: "none",
          color: "var(--ink)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 26,
            height: 26,
            borderRadius: 2,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--terminal-cyan)",
            fontSize: 14,
            lineHeight: 1,
            fontWeight: 700,
            fontFamily: "var(--font-jetbrains), monospace",
            boxShadow: "0 0 8px rgba(45, 212, 191, 0.18)",
          }}
        >
          ☉
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "var(--ink)",
          }}
        >
          COMPASS
        </span>
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            marginLeft: 2,
          }}
        >
          v8
        </span>
      </Link>

      {/* ─────────── CENTER: PAY PERIOD ─────────── */}
      <div
        role="group"
        aria-label={`Active pay period ${range}, day ${day} of ${totalDays}`}
        style={{
          justifySelf: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "0.06em",
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            whiteSpace: "nowrap",
          }}
        >
          <span
            aria-hidden
            style={{ color: "var(--ink-4)", fontSize: 14, lineHeight: 1 }}
          >
            [
          </span>
          <span style={{ color: "var(--terminal-cyan)" }}>
            {rangePadded}
          </span>
          <span
            aria-hidden
            style={{ color: "var(--ink-4)", fontSize: 14, lineHeight: 1 }}
          >
            ]
          </span>
        </div>

        {/* Sub-row: day count + mini progress bar */}
        <div
          className="top-app-bar-sub"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span>
            DAY {day} <span style={{ color: "var(--ink-5)" }}>/</span> {totalDays}
          </span>
          {/* Mini progress bar — same cosmos palette as the rest
              of the bar. 60px wide, 2px tall. */}
          <span
            aria-hidden
            style={{
              position: "relative",
              display: "inline-block",
              width: 60,
              height: 2,
              background: "var(--cosmos-3)",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: `${pct}%`,
                background:
                  pct >= 90
                    ? "var(--warn)"
                    : pct >= 100
                    ? "var(--neg)"
                    : "var(--terminal-cyan)",
                boxShadow: "0 0 4px currentColor",
                transition: "width 200ms",
              }}
            />
          </span>
        </div>
      </div>

      {/* ─────────── RIGHT: ENGINE TOGGLE ─────────── */}
      <Link
        href="/settings"
        aria-label={`Open settings — current engine: ${ENGINE_LABEL}`}
        className="top-app-bar-engine"
        style={{
          justifySelf: "end",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 12px 7px 14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          textDecoration: "none",
          color: "var(--ink)",
          transition: "border-color 160ms, background 160ms",
        }}
      >
        {/* State pill — small dot + engine state */}
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--terminal-cyan)",
              boxShadow: "0 0 6px var(--terminal-cyan)",
            }}
          />
          {ENGINE_STATE}
        </span>

        {/* Divider */}
        <span
          aria-hidden
          style={{
            width: 1,
            height: 14,
            background: "var(--line)",
          }}
        />

        {/* Label */}
        <span
          className="top-app-bar-engine-label"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--ink-2)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {ENGINE_LABEL}
        </span>

        {/* Settings cog */}
        <span
          aria-hidden
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 18,
            height: 18,
            marginLeft: 2,
            color: "var(--ink-3)",
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          ⚙
        </span>
      </Link>
    </header>
  );
}
