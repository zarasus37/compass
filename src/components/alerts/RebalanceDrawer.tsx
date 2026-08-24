"use client";

/**
 * RebalanceDrawer — the micro-drawer for fixing an over-limit envelope.
 *
 * Triggered by [ Balance Envelope ] in the alert bay. Slides in from
 * the right. Pre-fills the destination with the over-limit envelope
 * and the amount with the overage. The user picks a source envelope
 * (defaults to the one with the most surplus) and clicks Move to run
 * the existing rebalanceAction.
 *
 * On success: the action revalidates /, /envelopes, /period,
 * /insights, /allocation. The page that opened the drawer gets
 * the fresh envelope state on next render. The bay's banner updates
 * automatically because the page (or layout) passes fresh props.
 *
 * On failure: the engine's reason is shown inline as [WARN] message;
 * the drawer stays open so the user can correct and retry.
 *
 * Component Oracle Terminal treatment: dark cosmos surface, warn
 * left rail (signals "you're fixing something"), mono caps
 * labels with // prefix, square 4px corners, teal-cyan submit
 * with glow, light glass backdrop behind the drawer.
 */

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  rebalanceAction,
  type RebalanceActionState,
} from "@/app/(app)/envelopes/actions";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface RebalanceDrawerEnvelopeOption {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
}

export interface RebalanceDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The over-limit envelope (the broken bucket) — pre-filled as destination. */
  destination: RebalanceDrawerEnvelopeOption;
  /** Every envelope except the destination, available as the source. */
  sources: RebalanceDrawerEnvelopeOption[];
}

const INITIAL_STATE: RebalanceActionState = { ok: false };

export function RebalanceDrawer({ open, onClose, destination, sources }: RebalanceDrawerProps) {
  const [state, formAction, pending] = useActionState(rebalanceAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState<string>(
    pickDefaultSourceId(sources, destination),
  );

  // Pre-fill the amount with the overage ($) when the drawer opens.
  // The user can edit it; we just start them with the right number.
  const overageCents = Math.max(0, destination.currentCents - destination.targetCents);
  const overageDollars = (overageCents / 100).toFixed(2);

  // Auto-close the drawer 1.2s after a successful rebalance so the
  // user sees the [OK] moved confirmation flash before the panel
  // disappears.
  useEffect(() => {
    if (state.ok && state.transferCents !== undefined) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state.ok, state.transferCents, onClose]);

  // ESC to close (only when the drawer is open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  const source = sources.find((s) => s.id === sourceId);
  const destSummary = state.destinationEnvelopeId
    ? sources.concat([destination]).find((e) => e.id === state.destinationEnvelopeId) ?? destination
    : destination;
  const sourceSummary = state.sourceEnvelopeId
    ? sources.concat([destination]).find((e) => e.id === state.sourceEnvelopeId) ?? null
    : source ?? null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop — light dim + blur so the user knows the page is suspended. */}
      <div
        aria-hidden
        onClick={() => !pending && onClose()}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 10, 18, 0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 90,
          animation: "rebalanceDrawerIn 180ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      />

      {/* Drawer panel — slides in from the right. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Balance envelope"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 100vw)",
          background: "var(--cosmos-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.6)",
          zIndex: 91,
          display: "flex",
          flexDirection: "column",
          animation: "rebalanceDrawerSlide 240ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 18px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "var(--cosmos)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--warn)",
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                marginBottom: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--warn)",
                  boxShadow: "0 0 6px var(--warn)",
                }}
              />
              [WARN] balance envelope
            </div>
            <h2
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 19,
                fontWeight: 600,
                color: "var(--ink)",
                margin: 0,
                letterSpacing: "-0.005em",
              }}
            >
              Fix the overage
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close drawer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 2,
              background: "var(--cosmos-2)",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              fontSize: 16,
              lineHeight: 1,
              cursor: pending ? "default" : "pointer",
              fontFamily: "var(--font-jetbrains), monospace",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Over-limit context banner */}
        <div
          style={{
            padding: "16px 24px",
            background: "rgba(245, 158, 11, 0.06)",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 2,
              background: "var(--cosmos)",
              border: "1px solid var(--warn)",
              boxShadow: "0 0 6px rgba(245, 158, 11, 0.3)",
              color: PLANET_COLORS[destination.planet],
              fontSize: 18,
              fontFamily: "var(--font-jetbrains), monospace",
              fontWeight: 700,
            }}
          >
            {planetGlyph(destination.planet)}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {destination.name} is over target
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--warn)",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
              }}
            >
              {formatMoney(destination.currentCents)} of {formatMoney(destination.targetCents)} ·{" "}
              <b style={{ fontWeight: 700 }}>+{formatMoney(overageCents)} over</b>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          action={formAction}
          style={{
            padding: "22px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* Hidden destination — pre-filled, immutable. */}
          <input type="hidden" name="destinationEnvelopeId" value={destination.id} />

          {/* Source envelope (the "stable container") */}
          <Field label="from" sub="the stable container">
            <select
              name="sourceEnvelopeId"
              required
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              style={selectStyle}
            >
              {sources.map((s) => {
                const surplus = s.currentCents - s.targetCents;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatMoney(s.currentCents)}
                    {surplus > 0 ? ` (+${formatMoney(surplus)} surplus)` : ""}
                  </option>
                );
              })}
            </select>
          </Field>

          {/* Amount */}
          <Field label="amount" sub={`the overage (${formatMoney(overageCents)})`}>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                background: "var(--cosmos-2)",
                border: "1px solid var(--line)",
                borderRadius: 3,
                height: 44,
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "0 12px",
                  background: "var(--cosmos)",
                  borderRight: "1px solid var(--line)",
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                $
              </span>
              <input
                ref={amountRef}
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                defaultValue={overageDollars}
                placeholder="0.00"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: 0,
                  outline: "none",
                  padding: "0 12px",
                  color: "var(--ink)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              />
            </div>
          </Field>

          {/* Status line — failure */}
          {state.reason && !state.ok && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid var(--neg)",
                borderLeft: "2px solid var(--neg)",
                borderRadius: 3,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--neg)",
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 8 }}>[WARN]</span>
              {state.reason}
            </div>
          )}

          {/* Status line — success */}
          {state.ok && state.transferCents !== undefined && (
            <div
              role="status"
              style={{
                padding: "12px 14px",
                background: "rgba(74, 222, 128, 0.06)",
                border: "1px solid var(--ok)",
                borderLeft: "2px solid var(--ok)",
                borderRadius: 3,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--ok)",
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 8 }}>[OK] moved</span>
              <span style={{ color: "var(--ink-2)" }}>
                {state.transferCents !== undefined && formatMoney(state.transferCents)} — closing…
              </span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingTop: 12,
              borderTop: "1px solid var(--line-soft)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={{
                flex: "0 0 auto",
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--ink-2)",
                padding: "10px 18px",
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderRadius: 2,
                cursor: pending ? "default" : "pointer",
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{
                flex: 1,
                background: pending ? "var(--cosmos-3)" : "var(--terminal-cyan)",
                color: pending ? "var(--ink-3)" : "var(--void)",
                border: 0,
                padding: "12px 22px",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderRadius: 2,
                cursor: pending ? "default" : "pointer",
                fontFamily: "var(--font-jetbrains), monospace",
                boxShadow: pending ? "none" : "0 0 16px rgba(45, 212, 191, 0.3)",
                transition: "all 160ms",
              }}
            >
              {pending ? "[...] moving" : `Move ${formatMoney(overageCents)}`}
            </button>
          </div>
        </form>
      </aside>

      {/* Keyframes for the slide-in + backdrop fade. */}
      <style>{`
        @keyframes rebalanceDrawerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes rebalanceDrawerIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickDefaultSourceId(
  sources: RebalanceDrawerEnvelopeOption[],
  destination: RebalanceDrawerEnvelopeOption,
): string {
  // Prefer the envelope with the largest positive surplus (current > target)
  // that has enough to cover the overage. Falls back to the largest
  // current balance, then to the first available.
  const overage = Math.max(0, destination.currentCents - destination.targetCents);
  const withSurplus = sources
    .filter((s) => s.currentCents > s.targetCents && s.currentCents - s.targetCents >= overage)
    .sort((a, b) => (b.currentCents - b.targetCents) - (a.currentCents - a.targetCents));
  if (withSurplus[0]) return withSurplus[0].id;
  const largest = [...sources].sort((a, b) => b.currentCents - a.currentCents);
  if (largest[0]) return largest[0].id;
  return sources[0]?.id ?? "";
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

// ---------------------------------------------------------------------------
// Field subcomponent — same shape as the /envelopes form's Field, kept
// local so the drawer is self-contained.
// ---------------------------------------------------------------------------

function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        // {label}
      </span>
      {children}
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-5)",
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </span>
    </label>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--cosmos-2)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  padding: "10px 12px",
  height: 44,
  outline: "none",
};
