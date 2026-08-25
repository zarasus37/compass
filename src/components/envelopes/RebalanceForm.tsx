"use client";

/**
 * RebalanceForm — the "Move $X from Y → Z" surface on /envelopes.
 *
 * A 3-field form wired to the rebalanceAction server action:
 *   - source envelope (dropdown, name + current balance)
 *   - destination envelope (dropdown, name + current balance)
 *   - amount (dollars, converted to cents on submit)
 *
 * Uses React 19's useActionState so the form re-renders with the
 * action result inline. On success, shows a status line that
 * confirms the move (with the post-state balances). On failure,
 * shows the engine's reason. The form auto-resets the amount
 * field after a successful move so the next move is one click away.
 *
 * Sovereign Monad (v6) treatment: mono caps labels, gold
 * [OK]/[WARN] markers, square 4px corners, neon-purple submit.
 */

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { rebalanceAction, type RebalanceActionState } from "@/app/(app)/envelopes/actions";
import { VesselGlyph, type PlanetId, PLANET_COLORS } from "@/components/alchemy/VesselGlyph";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export interface EnvelopeOption {
  id: string;
  name: string;
  planet: PlanetId;
  currentCents: number;
  targetCents: number;
}

const INITIAL_STATE: RebalanceActionState = { ok: false };

export function RebalanceForm({ envelopes }: { envelopes: EnvelopeOption[] }) {
  const [state, formAction, pending] = useActionState(rebalanceAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Auto-reset the amount field after a successful move so the
  // next transfer is one keystroke away.
  useEffect(() => {
    if (state.ok && amountRef.current) {
      amountRef.current.value = "";
    }
  }, [state.ok, state.transferCents]);

  // Re-derive the source/destination summaries from the post-state
  // balances returned by the action. If the user re-submits, the
  // freshest numbers win.
  const sourceSummary = state.sourceEnvelopeId
    ? envelopes.find((e) => e.id === state.sourceEnvelopeId)
    : null;
  const destSummary = state.destinationEnvelopeId
    ? envelopes.find((e) => e.id === state.destinationEnvelopeId)
    : null;

  return (
    <div
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        padding: "24px 28px 22px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--gold)",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span aria-hidden style={{ color: "var(--ok)", marginRight: 6 }}>●</span>
        // MOVE BETWEEN VESSELS
      </div>
      <h2
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 22,
          fontWeight: 600,
          margin: "0 0 6px",
          color: "var(--ink)",
          letterSpacing: "-0.005em",
        }}
      >
        Rebalance funds
      </h2>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 13.5,
          color: "var(--ink-3)",
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        Move money from one envelope to another without touching the
        paycheck cycle. The move is atomic — both balances update
        together or not at all, and the audit log records the
        transfer.
      </p>

      <form
        ref={formRef}
        action={formAction}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: 12,
          alignItems: "end",
        }}
      >
        {/* FROM */}
        <Field label="from" sub="source envelope">
          <select
            name="sourceEnvelopeId"
            required
            defaultValue=""
            style={selectStyle}
          >
            <option value="" disabled>
              pick a vessel
            </option>
            {envelopes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {formatMoneyCompact(e.currentCents)}
              </option>
            ))}
          </select>
        </Field>

        {/* TO */}
        <Field label="to" sub="destination envelope">
          <select
            name="destinationEnvelopeId"
            required
            defaultValue=""
            style={selectStyle}
          >
            <option value="" disabled>
              pick a vessel
            </option>
            {envelopes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {formatMoneyCompact(e.currentCents)}
              </option>
            ))}
          </select>
        </Field>

        {/* AMOUNT */}
        <Field label="amount" sub="USD (e.g. 50 or 50.50)">
          <input
            ref={amountRef}
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            required
            placeholder="50"
            style={inputStyle}
          />
        </Field>

        <button
          type="submit"
          disabled={pending}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            background: pending ? "var(--vessel-dark)" : "var(--vessel-accent)",
            color: pending ? "var(--ink-3)" : "#FFFFFF",
            border: 0,
            borderRadius: 2,
            padding: "10px 22px",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: pending ? "default" : "pointer",
            height: 38,
            boxShadow: pending ? "none" : "0 0 16px rgba(168, 85, 247, 0.4)",
            transition: "all 160ms",
            whiteSpace: "nowrap",
          }}
        >
          {pending ? "[...] moving" : "Move"}
        </button>
      </form>

      {/* Status line — success or failure */}
      {state.reason && !state.ok && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid var(--vessel-over)",
            borderLeft: "2px solid var(--vessel-over)",
            borderRadius: 3,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--vessel-over)",
            letterSpacing: "0.04em",
          }}
        >
          <span style={{ fontWeight: 700, marginRight: 8 }}>[WARN]</span>
          {state.reason}
        </div>
      )}

      {state.ok && state.transferCents !== undefined && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "rgba(74, 222, 128, 0.06)",
            border: "1px solid var(--ok)",
            borderLeft: "2px solid var(--ok)",
            borderRadius: 3,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ok)",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700 }}>[OK] moved</span>
          <span style={{ color: "var(--ink-2)" }}>
            {sourceSummary && (
              <>
                <GlyphFor planet={sourceSummary.planet} />{" "}
                <span style={{ color: "var(--ink)" }}>
                  {sourceSummary.name}
                </span>{" "}
                <span style={{ color: "var(--ink-3)" }}>→</span>{" "}
                {formatMoney(state.sourceBalanceAfterCents ?? 0)}
              </>
            )}
            <span style={{ color: "var(--ink-4)", margin: "0 8px" }}>·</span>
            <GlyphFor planet={destSummary?.planet ?? "sol"} />{" "}
            <span style={{ color: "var(--ink)" }}>
              {destSummary?.name ?? "?"}
            </span>{" "}
            <span style={{ color: "var(--ink-3)" }}>→</span>{" "}
            {formatMoney(state.destinationBalanceAfterCents ?? 0)}
          </span>
        </div>
      )}
    </div>
  );
}

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
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
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

function GlyphFor({ planet }: { planet: PlanetId }) {
  const color = PLANET_COLORS[planet];
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "var(--vessel-dark)",
        border: `1px solid ${color}`,
        color: color,
        fontSize: 10,
        lineHeight: "14px",
        textAlign: "center",
        fontWeight: 700,
        fontFamily: "var(--font-jetbrains), monospace",
        verticalAlign: "middle",
      }}
    >
      {planet === "sol" ? "☉" : planet === "luna" ? "☽" : planet === "mars" ? "♂" : planet === "mercury" ? "☿" : planet === "jupiter" ? "♃" : planet === "venus" ? "♀" : planet === "saturn" ? "♄" : "·"}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--vessel-surface)",
  border: "1px solid var(--vessel-border)",
  borderRadius: 3,
  padding: "8px 10px",
  height: 38,
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  fontSize: 14,
  fontFeatureSettings: '"tnum" 1, "zero" 1',
};
