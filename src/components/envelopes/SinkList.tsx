"use client";

/**
 * SinkList — Cluster 7.28.
 *
 * Per-row rendering of a sink on /envelopes/[id]. Each row has a
 * delete button that submits the deleteSink server action. Server-
 * action state is local to the form per row (no shared parent
 * state) so deletes are isolated.
 */

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteSink, type SinkActionResult } from "@/app/actions/sinks";
import { formatMoney } from "@/lib/money";
import { monthlyFillCents } from "@/lib/forecast/sink-math";

export interface SinkRow {
  id: string;
  name: string;
  targetCents: number;
  cadence: string;
}

export function SinkList({
  envelopeId,
  sinks,
}: {
  envelopeId: string;
  sinks: SinkRow[];
}) {
  if (sinks.length === 0) {
    return (
      <p
        data-testid="sinks-empty"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          padding: 16,
        }}
      >
        No sinking funds yet — add one below to start saving for a
        known-but-irregular expense inside this envelope.
      </p>
    );
  }
  return (
    <ul
      data-testid="sinks-list"
      style={{ margin: 0, padding: 0, listStyle: "none" }}
    >
      {sinks.map((s) => (
        <SinkItem key={s.id} envelopeId={envelopeId} sink={s} />
      ))}
    </ul>
  );
}

function SinkItem({
  envelopeId,
  sink,
}: {
  envelopeId: string;
  sink: SinkRow;
}) {
  const [state, formAction] = useActionState<SinkActionResult | null, FormData>(
    deleteSink,
    null,
  );
  const monthly = monthlyFillCents(sink.targetCents, sink.cadence);
  return (
    <li
      data-testid={`sink-row-${sink.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 120px 140px 80px",
        gap: 16,
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink)",
          fontWeight: 500,
        }}
      >
        {sink.name}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "var(--ink)",
          textAlign: "right",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {formatMoney(sink.targetCents)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          textAlign: "right",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {sink.cadence} · {formatMoney(monthly)}/mo
      </span>
      <form action={formAction} style={{ margin: 0, padding: 0 }}>
        <input type="hidden" name="sinkId" value={sink.id} />
        <input type="hidden" name="envelopeId" value={envelopeId} />
        <DeleteButton sinkId={sink.id} />
      </form>
      {state && !state.ok && (
        <div
          role="alert"
          style={{
            gridColumn: "1 / -1",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--vessel-watch)",
          }}
        >
          {state.reason ?? "Could not delete the sink."}
        </div>
      )}
    </li>
  );
}

function DeleteButton({ sinkId }: { sinkId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid={`sink-delete-${sinkId}`}
      style={{
        padding: "4px 10px",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--vessel-watch)",
        background: "transparent",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
