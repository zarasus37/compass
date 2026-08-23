"use client";

/**
 * Edit target form (Cluster 1.10).
 *
 * Focused quick edit — just the target field. Shows the current
 * target and current balance side-by-side so the user can see
 * what they're changing and what stays.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  updateEnvelopeTarget,
  type UpdateEnvelopeResult,
} from "@/app/actions/envelopes";
import { formatMoney } from "@/lib/money";

interface EnvelopeInput {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
}

export function EditTargetForm({ envelope }: { envelope: EnvelopeInput }) {
  const [state, formAction] = useActionState<UpdateEnvelopeResult | null, FormData>(
    updateEnvelopeTarget,
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
            paddingBottom: 20,
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <Cell label="Vessel" value={envelope.name} />
          <Cell label="Current" value={formatMoney(envelope.currentCents)} accent="ok" />
          <Cell
            label="Current target"
            value={formatMoney(envelope.targetCents)}
            muted
          />
        </div>

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
            New target
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              alignItems: "baseline",
              gap: 8,
              background: "var(--cosmos)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "20px 24px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 48,
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
              defaultValue={(envelope.targetCents / 100).toFixed(2)}
              required
              autoFocus
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 48,
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
          <div
            style={{
              fontFamily: "var(--font-sora)",
                            fontSize: 12,
              color: "var(--ink-3)",
              marginTop: 6,
            }}
          >
            In dollars. The vessel's name and planet don't change.
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
          href={`/envelopes/${envelope.id}`}
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
          ✓ Target updated. The bar will refresh.
        </div>
      )}
    </form>
  );
}

function Cell({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: "ok";
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
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 24,
          color: muted
            ? "var(--ink-3)"
            : accent === "ok"
            ? "var(--ok)"
            : "var(--ink)",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
    </div>
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
      {pending ? "Saving…" : "Save new target →"}
    </button>
  );
}
