/**
 * TopAppBar — the persistent header pinned to the top of every signed-in
 * page (Sovereign Monad design system).
 *
 * Three flex columns, left-to-right on desktop, wrapping on phone:
 *   1. BRAND — small pulsing accent dot + "SOVEREIGN MONAD" wordmark.
 *   2. CYCLE — bracketed chip showing the active pay-period range
 *      (e.g. "CYCLE: AUG 15 ↔ AUG 29"). Centered.
 *   3. ENGINE — L1 / L2 toggle pill + a settings cog link.
 *
 * Style: Vessel (Sovereign Monad). Dark slate-purple canvas
 * (#16121e), neon purple accent (#a855f7), JetBrains Mono for data,
 * Sora for the wordmark. Sticky at the top, drops a soft shadow so
 * the bar visually lifts off the content as the user scrolls.
 *
 * Server component. The toggle pill is a server-action <form> for
 * SSR-fallback + accessibility + testability (the engine-toggle smoke
 * POSTs the form). The button inside the form is a tiny client
 * component (`EnginePillButton`) that uses `useFormStatus` for the
 * "isPending" visual feedback the spec wants during the round-trip.
 */

import * as React from "react";
import Link from "next/link";
import {
  toggleEngineAction,
  type EngineLevel,
} from "@/app/(app)/settings/engine-actions";
import { EnginePillButton } from "./EnginePillButton";
import { SearchButton } from "./SearchButton";
import { QuickAddTransaction, type QuickAddEnvelopeOption } from "./QuickAddTransaction";

export interface TopAppBarProps {
  /** Active engine level read from SystemSettings (L1 = rules, L2 = AI). */
  engineLevel: EngineLevel;
  /** The active pay period (from Prisma PayPeriod, or constants fallback). */
  payPeriod: { startDate: Date; endDate: Date };
  /** Envelopes for the quick-add transaction dropdown (Cluster 7.27). */
  quickAddEnvelopes?: QuickAddEnvelopeOption[];
}

export function TopAppBar({ engineLevel, payPeriod, quickAddEnvelopes = [] }: TopAppBarProps) {
  // Pay-period metrics.
  const start = payPeriod.startDate;
  const end = payPeriod.endDate;
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const today = new Date();
  const rawDay = Math.max(
    1,
    Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const day = Math.max(1, Math.min(rawDay, totalDays));
  const pct = Math.min(100, (day / totalDays) * 100);

  // "AUG 15 ↔ AUG 29" format. The arrow is the Sovereign Monad
  // operator — terminal log marker, like in the spec.
  const fmt = (d: Date) =>
    d
      .toLocaleString("en-US", { month: "short", day: "numeric" })
      .toUpperCase();
  const range = `${fmt(start)} ↔ ${fmt(end)}`;

  // Engine pill label.
  const engineLabel =
    engineLevel === "L2" ? "⚡ L2 AI ENGINE" : "⚙ L1 RULES ENGINE";
  const isL2 = engineLevel === "L2";

  return (
    <header
      aria-label="Sovereign Monad — top bar"
      className="top-app-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--vessel-dark)",
        borderBottom: "1px solid var(--vessel-border)",
        padding: "12px 16px",
        // Sticky, wraps cleanly on phone (flex-wrap below).
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* ─────────── LEFT: SYSTEM METRIC SIGNATURE ───────────
          Pulsing accent dot + Sora wordmark. The dot uses
          vessel-accent + a soft neon-glow halo. */}
      <Link
        href="/"
        aria-label="Sovereign Monad — home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          color: "#FFFFFF",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--vessel-accent)",
            boxShadow: "var(--vessel-neon-glow)",
            animation: "vessel-pulse 1.6s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "#FFFFFF",
          }}
        >
          Sovereign Monad
        </span>
      </Link>

      {/* ─────────── CENTER: ACTIVE RUNTIME DURATION RANGE ───────────
          "CYCLE: AUG 15 ↔ AUG 29" chip. Hidden on narrow phones
          (the bar's flex-wrap drops it under the brand). */}
      <div
        role="group"
        aria-label={`Active cycle ${range}, day ${day} of ${totalDays}`}
        className="top-app-bar-cycle"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 12px",
          borderRadius: 6,
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.10em",
          color: "var(--vessel-accent)",
        }}
      >
        <span style={{ opacity: 0.6, marginRight: 8 }}>CYCLE:</span>
        <span>{range}</span>
        <span
          aria-hidden
          style={{
            marginLeft: 10,
            position: "relative",
            display: "inline-block",
            width: 60,
            height: 2,
            background: "rgba(168, 85, 247, 0.15)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: `${pct}%`,
              background: "var(--vessel-accent)",
              boxShadow: "0 0 4px var(--vessel-accent)",
              transition: "width 200ms",
            }}
          />
        </span>
      </div>

      {/* ─────────── RIGHT: DYNAMIC STATE TOGGLE + COG ───────────
          The toggle is a <form action={toggleEngineAction}> so it's
          testable via the form wire format and degrades gracefully
          with JS off. The button uses useFormStatus for the
          "isPending" visual. The cog is a separate link to /settings. */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <SearchButton />
        <QuickAddTransaction envelopes={quickAddEnvelopes} />
        <form
          action={toggleEngineAction}
          style={{ margin: 0, padding: 0, display: "inline-flex" }}
        >
          <EnginePillButton isL2={isL2} label={engineLabel} />
        </form>
        <Link
          href="/settings"
          aria-label="Open settings"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 32,
            height: 32,
            color: "var(--vessel-accent)",
            fontSize: 14,
            textDecoration: "none",
            border: "1px solid var(--vessel-border)",
            borderRadius: 6,
            background: "var(--vessel-surface)",
          }}
        >
          ⚙
        </Link>
      </div>
    </header>
  );
}
