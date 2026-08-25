"use client";

/**
 * RebalanceAlertBay — the contextual alert banner + drawer for fixing
 * over-limit envelopes (Component 3 of the new shell layer).
 *
 * Renders nothing when there are no over-limit envelopes. When there
 * is at least one, it surfaces the WORST over-limit (largest overage
 * in cents) as a warn-bordered banner. Tapping [ Balance Envelope ]
 * opens the micro-drawer pre-filled for that envelope.
 *
 * Dismissable per session via the X button — the dismissal is held
 * in component state (not localStorage) so a fresh session / page
 * refresh brings the alert back if the overage is still real.
 *
 * Sovereign Monad (v6) treatment: warn-bordered banner (orange,
 * left rail 2px), light watch-tinted background, [WARN] mono prefix,
 * envelope name in Sora, overage in JetBrains Mono, square 4px
 * corners, neon-purple action button.
 */

import * as React from "react";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import {
  RebalanceDrawer,
  type RebalanceDrawerEnvelopeOption,
} from "./RebalanceDrawer";

export interface RebalanceAlertBayEnvelope {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
}

export interface RebalanceAlertBayProps {
  /** All envelopes — bay uses these for the drawer's source picker. */
  envelopes: RebalanceAlertBayEnvelope[];
  /** Envelopes over their target. The bay shows the worst first. */
  overLimit: RebalanceAlertBayEnvelope[];
}

export function RebalanceAlertBay({ envelopes, overLimit }: RebalanceAlertBayProps) {
  const [dismissed, setDismissed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (overLimit.length === 0 || dismissed) return null;

  // Worst overage (largest positive delta).
  const worst = [...overLimit].sort(
    (a, b) => (b.currentCents - b.targetCents) - (a.currentCents - a.targetCents),
  )[0];
  if (!worst) return null;

  const overageCents = Math.max(0, worst.currentCents - worst.targetCents);
  const additionalCount = overLimit.length - 1;

  // Drawer data: the worst envelope is the destination, every other
  // envelope is a source option.
  const destination: RebalanceDrawerEnvelopeOption = worst;
  const sources: RebalanceDrawerEnvelopeOption[] = envelopes
    .filter((e) => e.id !== worst.id)
    .map((e) => ({
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.currentCents,
      targetCents: e.targetCents,
    }));

  return (
    <>
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(249, 115, 22, 0.06)",
          border: "1px solid rgba(249, 115, 22, 0.45)",
          borderLeft: "3px solid var(--vessel-watch)",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 24,
          boxShadow: "0 0 16px rgba(249, 115, 22, 0.10)",
        }}
      >
        {/* Vessel glyph */}
        <span
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            borderRadius: 2,
            background: "var(--vessel-surface)",
            border: `1px solid ${PLANET_COLORS[worst.planet]}`,
            color: PLANET_COLORS[worst.planet],
            fontSize: 18,
            fontFamily: "var(--font-jetbrains), monospace",
            fontWeight: 700,
            boxShadow: `0 0 6px ${PLANET_COLORS[worst.planet]}`,
            flexShrink: 0,
          }}
        >
          {planetGlyph(worst.planet)}
        </span>

        {/* Warning text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--vessel-watch)",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              marginBottom: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            [WARN] systemic overflow
            {additionalCount > 0 && (
              <span
                style={{
                  color: "var(--ink-3)",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                }}
              >
                + {additionalCount} more
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.4,
            }}
          >
            <b style={{ color: "var(--ink)", fontWeight: 700 }}>{worst.name}</b> has
            exceeded its limit by{" "}
            <b
              style={{
                color: "var(--vessel-watch)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
                fontWeight: 700,
              }}
            >
              {formatMoney(overageCents)}
            </b>
            . Pull from a stable container to balance it.
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--vessel-accent)",
              color: "#FFFFFF",
              border: 0,
              borderRadius: 2,
              padding: "10px 18px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(168, 85, 247, 0.40)",
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 22px rgba(168, 85, 247, 0.60)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 16px rgba(168, 85, 247, 0.40)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            [ Balance Envelope ]
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss alert"
            title="Dismiss (per session)"
            style={{
              width: 30,
              height: 30,
              borderRadius: 2,
              background: "transparent",
              border: "1px solid var(--vessel-border)",
              color: "var(--ink-3)",
              fontSize: 14,
              lineHeight: 1,
              cursor: "pointer",
              fontFamily: "var(--font-jetbrains), monospace",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>

      <RebalanceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destination={destination}
        sources={sources}
      />
    </>
  );
}

function planetGlyph(p: PlanetId): string {
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
