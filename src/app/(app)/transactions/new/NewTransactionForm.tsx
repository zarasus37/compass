"use client";

/**
 * New transaction form (Cluster 1.10).
 *
 * Mom-grade: clear envelope picker, big amount field, instant
 * feedback on success/error. The form sends dollars (the human-
 * readable unit); the server action converts to cents.
 *
 * Placed at /transactions/new. The envelope detail page and the
 * /transactions page both link to it.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { logTransaction, type AddTransactionResult } from "@/app/actions/transactions";
import type { PlanetId } from "@/components/alchemy/VesselGlyph";

export interface EnvelopeOption {
  id: string;
  name: string;
  planet: PlanetId | null;
  currentCents: number;
}

export function NewTransactionForm({
  envelopes,
  defaultEnvelopeId,
}: {
  envelopes: EnvelopeOption[];
  defaultEnvelopeId?: string;
}) {
  const [state, formAction] = useActionState<AddTransactionResult | null, FormData>(
    logTransaction,
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
          <Field label="Amount" hint="Dollars. Form sends cents to the engine.">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                alignItems: "baseline",
                gap: 8,
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "16px 20px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-italiana), serif",
                  fontSize: 40,
                  color: "var(--gold-glow)",
                  lineHeight: 1,
                }}
              >
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                name="amount"
                placeholder="0.00"
                required
                autoFocus
                style={{
                  fontFamily: "var(--font-italiana), serif",
                  fontSize: 40,
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

          <Field label="What for" hint="The payee — H-E-B, the electric bill, a refund, etc.">
            <input
              type="text"
              name="payee"
              placeholder="H-E-B Groceries"
              required
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 18,
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

          <Field label="Date" hint="Defaults to today.">
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 14,
                color: "var(--ink)",
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "12px 18px",
                width: "100%",
                outline: 0,
                fontFeatureSettings: '"tnum" 1',
              }}
            />
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 14,
              color: "var(--ink-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="isIncome"
              style={{
                accentColor: "var(--gold)",
                width: 16,
                height: 16,
              }}
            />
            <span>This is money coming in (income, refund, transfer in)</span>
          </label>
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Land in this vessel
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {envelopes.map((e) => (
              <label
                key={e.id}
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
                  name="envelopeId"
                  value={e.id}
                  defaultChecked={e.id === defaultEnvelopeId}
                  style={{
                    accentColor: `var(--${e.planet ?? "ink-2"})`,
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
                  <VesselGlyph planet={e.planet} size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), serif",
                      fontSize: 14,
                      color: "var(--ink)",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.name}
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
          href="/transactions"
          style={{
            fontFamily: "var(--font-cinzel), serif",
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
            fontFamily: "var(--font-cormorant), serif",
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
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          ✓ Logged. The vessel's bar just updated.
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
        fontFamily: "var(--font-cinzel), serif",
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
      {pending ? "Logging…" : "Log this transaction →"}
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
          fontFamily: "var(--font-cinzel), serif",
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
            fontFamily: "var(--font-cormorant), serif",
            fontStyle: "italic",
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
