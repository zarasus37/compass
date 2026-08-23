"use client";

/**
 * New goal form (Cluster 1.10).
 *
 * Mom-grade: clear planet picker, target + per-paycheck + date.
 * Sets up the goal so the next paycheck (or the next time the
 * plan runs) starts funding it.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { logGoal, type AddGoalResult } from "@/app/actions/goals";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { type PlanetId } from "@/components/alchemy/VesselGlyph";

// Inline the planet list with display metadata so the form can
// render planet + name + role labels without depending on a
// not-yet-exported PLANET_OPTIONS constant.
const PLANET_OPTIONS: { id: PlanetId; name: string; role: string }[] = [
  { id: "sol", name: "Sol", role: "stability" },
  { id: "luna", name: "Luna", role: "daily needs" },
  { id: "mercury", name: "Mercury", role: "operations" },
  { id: "venus", name: "Venus", role: "joy" },
  { id: "mars", name: "Mars", role: "buffer" },
  { id: "jupiter", name: "Jupiter", role: "growth" },
  { id: "saturn", name: "Saturn", role: "debt" },
];

export interface EnvelopeOption {
  id: string;
  name: string;
}

export function NewGoalForm({
  envelopes,
  defaultPlanet = "jupiter",
}: {
  envelopes: EnvelopeOption[];
  defaultPlanet?: PlanetId;
}) {
  const [state, formAction] = useActionState<AddGoalResult | null, FormData>(
    logGoal,
    null,
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "32px 36px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}
      >
        <div style={{ display: "grid", gap: 22 }}>
          <Field label="Name" hint="The destination — Emergency Fund, Visit Family, New Roof.">
            <input
              type="text"
              name="name"
              placeholder="Emergency Fund"
              required
              autoFocus
              style={inputStyle(18, "var(--font-sora)")}
            />
          </Field>

          <Field label="Description" hint="Optional — why does this goal matter?">
            <textarea
              name="description"
              placeholder="Three months of expenses, ready when life surprises you."
              rows={3}
              style={{
                ...inputStyle(14, "var(--font-sora)"),
                                resize: "vertical",
                minHeight: 80,
              }}
            />
          </Field>

          <Field label="Target" hint="How much do you need? In dollars.">
            <MoneyInput name="target" placeholder="5000.00" required />
          </Field>

          <Field label="Per paycheck" hint="How much to set aside every payday.">
            <MoneyInput name="perPaycheck" placeholder="200.00" required />
          </Field>

          <Field label="Target date" hint="When do you want to reach it?">
            <input
              type="date"
              name="targetDate"
              required
              style={inputStyle(14, "var(--font-jetbrains), monospace", "100%")}
            />
          </Field>

          <Field
            label="Linked vessel"
            hint="The envelope that will hold this goal's money. Pick one — usually the one that matches the planet."
          >
            <select
              name="envelopeId"
              defaultValue=""
              style={inputStyle(14, "var(--font-sora)", "100%")}
            >
              <option value="">No vessel (general savings)</option>
              {envelopes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="isPrimary"
              style={{
                accentColor: "var(--gold)",
                width: 16,
                height: 16,
              }}
            />
            <span>Make this the top priority (the hero on the dashboard)</span>
          </label>
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Which planet?
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {PLANET_OPTIONS.map((p) => (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--cosmos)",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="planet"
                  value={p.id}
                  defaultChecked={p.id === defaultPlanet}
                  style={{
                    accentColor: `var(--${p.id})`,
                    width: 16,
                    height: 16,
                    margin: 0,
                  }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    flexShrink: 0,
                  }}
                >
                  <VesselGlyph planet={p.id} size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 14,
                      color: "var(--ink)",
                      lineHeight: 1.1,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sora)",
                                            fontSize: 11,
                      color: "var(--ink-3)",
                    }}
                  >
                    {p.role}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/goals"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            background: "transparent",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "12px 22px",
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>

      {state?.reason && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(196, 90, 58, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--neg)",
            borderRadius: 2,
            padding: "12px 18px",
            color: "var(--ink)",
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {state.reason}
        </div>
      )}
      {state?.ok && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(106, 176, 136, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--ok)",
            borderRadius: 2,
            padding: "12px 18px",
            color: "var(--ink)",
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          ✓ Goal added. The next paycheck will start funding it.
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        background: pending ? "var(--ink-3)" : "var(--gold)",
        color: "var(--void)",
        border: 0,
        borderRadius: 2,
        padding: "14px 28px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        cursor: pending ? "wait" : "pointer",
        boxShadow: pending ? "none" : "0 0 18px rgba(212, 175, 82, 0.35)",
      }}
    >
      {pending ? "Saving…" : "Save this goal →"}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontFamily: "var(--font-sora)",
                        fontSize: 12,
            color: "var(--ink-3)",
            marginTop: 6,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  name,
  placeholder,
  required,
}: {
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "baseline",
        gap: 8,
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 2,
        padding: "12px 16px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 24,
          color: "var(--gold-glow)",
          lineHeight: 1,
        }}
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        name={name}
        placeholder={placeholder}
        required={required}
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 24,
          color: "var(--ink)",
          background: "transparent",
          border: 0,
          outline: 0,
          width: "100%",
          lineHeight: 1,
          fontFeatureSettings: '"tnum" 1',
        }}
      />
    </div>
  );
}

function inputStyle(
  fontSize: number,
  fontFamily: string,
  width: string = "100%",
): React.CSSProperties {
  return {
    fontFamily,
    fontSize,
    color: "var(--ink)",
    background: "var(--cosmos)",
    border: "1px solid var(--line)",
    borderRadius: 2,
    padding: "12px 16px",
    width,
    outline: 0,
  };
}
