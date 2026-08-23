"use client";

/**
 * New envelope (vessel) form (Cluster 1.10).
 *
 * Same pattern as the new goal form: name + planet + target.
 * The new vessel starts at $0 — its balance fills in as
 * paychecks land.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { logEnvelope, type UpdateEnvelopeResult } from "@/app/actions/envelopes";

const PLANET_OPTIONS: { id: PlanetId; name: string; role: string }[] = [
  { id: "sol", name: "Sol", role: "rent" },
  { id: "luna", name: "Luna", role: "groceries" },
  { id: "mercury", name: "Mercury", role: "utilities" },
  { id: "venus", name: "Venus", role: "joy" },
  { id: "mars", name: "Mars", role: "buffer" },
  { id: "jupiter", name: "Jupiter", role: "growth" },
  { id: "saturn", name: "Saturn", role: "debt" },
];

export function NewEnvelopeForm() {
  const [state, formAction] = useActionState<UpdateEnvelopeResult | null, FormData>(
    logEnvelope,
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
          <Field
            label="Vessel name"
            hint="The label — Groceries, Magic Money, etc."
          >
            <input
              type="text"
              name="name"
              placeholder="Groceries"
              required
              autoFocus
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 22,
                color: "var(--ink)",
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "14px 18px",
                width: "100%",
                outline: 0,
              }}
            />
          </Field>

          <Field
            label="Target"
            hint="How much should this vessel hold? Starts at $0."
          >
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
                name="target"
                placeholder="400.00"
                required
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
          </Field>
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
                  defaultChecked={p.id === "luna"}
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
          href="/envelopes"
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
          ✓ Vessel added. The next paycheck can start filling it.
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
      {pending ? "Saving…" : "Add this vessel →"}
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
