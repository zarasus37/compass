"use client";

/**
 * AddSinkForm — Cluster 7.28.
 *
 * Inline form on /envelopes/[id] for adding a new sinking fund to
 * the envelope. Three fields: name, target (dollars), cadence.
 * Submits via the addSink server action. Errors render inline;
 * success closes the form (server redirects via revalidatePath).
 */

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addSink, type SinkActionResult } from "@/app/actions/sinks";

export function AddSinkForm({ envelopeId }: { envelopeId: string }) {
  const [state, formAction] = useActionState<SinkActionResult | null, FormData>(
    addSink,
    null,
  );

  return (
    <form
      action={formAction}
      data-testid="add-sink-form"
      style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 0.8fr 0.8fr auto",
        gap: 12,
        alignItems: "end",
        padding: 16,
        background: "var(--vessel-surface)",
        border: "1px dashed var(--vessel-border)",
        borderRadius: 4,
        marginTop: 16,
      }}
    >
      <input type="hidden" name="envelopeId" value={envelopeId} />
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Name
        <input
          type="text"
          name="name"
          placeholder="Holiday food"
          required
          data-testid="add-sink-name"
          style={{
            padding: "8px 10px",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--vessel-dark)",
            border: "1px solid var(--vessel-border)",
            borderRadius: 4,
            outline: "none",
          }}
        />
      </label>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Target ($)
        <input
          type="text"
          inputMode="decimal"
          name="target"
          placeholder="300"
          required
          data-testid="add-sink-target"
          style={{
            padding: "8px 10px",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--vessel-dark)",
            border: "1px solid var(--vessel-border)",
            borderRadius: 4,
            outline: "none",
          }}
        />
      </label>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Cadence
        <select
          name="cadence"
          defaultValue="annual"
          required
          data-testid="add-sink-cadence"
          style={{
            padding: "8px 10px",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--vessel-dark)",
            border: "1px solid var(--vessel-border)",
            borderRadius: 4,
            outline: "none",
          }}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
      </label>
      <SubmitButton />
      {state && !state.ok && (
        <div
          role="alert"
          data-testid="add-sink-error"
          style={{
            gridColumn: "1 / -1",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--vessel-watch)",
            padding: "6px 8px",
            background: "rgba(249, 115, 22, 0.08)",
            border: "1px solid var(--vessel-watch)",
            borderRadius: 3,
          }}
        >
          {state.reason ?? "Could not add the sink."}
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
      data-testid="add-sink-submit"
      style={{
        padding: "8px 16px",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--vessel-dark)",
        background: pending ? "var(--vessel-surface)" : "var(--vessel-accent)",
        border: "none",
        borderRadius: 4,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        height: 36,
      }}
    >
      {pending ? "Adding…" : "+ Add sink"}
    </button>
  );
}
