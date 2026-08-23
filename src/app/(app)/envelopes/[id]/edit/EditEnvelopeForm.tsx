"use client";

/**
 * Edit envelope form (Cluster 1.10).
 *
 * Pre-filled with the envelope's current name and target. The
 * hidden envelopeId field routes the updateEnvelopeFull action
 * to the right record.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { updateEnvelopeFull, type UpdateEnvelopeResult } from "@/app/actions/envelopes";

interface EnvelopeInput {
  id: string;
  name: string;
  targetCents: number;
}

export function EditEnvelopeForm({ envelope }: { envelope: EnvelopeInput }) {
  const [state, formAction] = useActionState<UpdateEnvelopeResult | null, FormData>(
    updateEnvelopeFull,
    null,
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: 24 }}>
      <input type="hidden" name="envelopeId" value={envelope.id} />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "32px 36px",
          display: "grid",
          gap: 22,
        }}
      >
        <Field label="Vessel name" hint="The label for this envelope.">
          <input
            type="text"
            name="name"
            defaultValue={envelope.name}
            required
            autoFocus
            style={{
              fontFamily: "var(--font-italiana), serif",
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
          hint="How much should this vessel hold? The current balance is kept."
        >
          <MoneyInput
            name="target"
            defaultValue={(envelope.targetCents / 100).toFixed(2)}
            required
          />
        </Field>
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
          href={`/envelopes/${envelope.id}`}
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
          ✓ Vessel updated. The bar above will refresh on the next render.
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
      {pending ? "Saving…" : "Save changes →"}
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

function MoneyInput({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string;
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
          fontFamily: "var(--font-italiana), serif",
          fontSize: 32,
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
        defaultValue={defaultValue}
        required={required}
        style={{
          fontFamily: "var(--font-italiana), serif",
          fontSize: 32,
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
