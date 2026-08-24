"use client";

/**
 * EnginePillButton — the submit button inside the TopAppBar's
 * engine-toggle <form>. It's a small client component so it can
 * call `useFormStatus` to read the form's pending state, giving
 * the user visual feedback (opacity 50%, "cursor-wait") while the
 * toggle round-trip is in flight.
 *
 * The form action is `toggleEngineAction` (a server action in
 * app/(app)/settings/engine-actions.ts). When the form submits,
 * the action:
 *   1. Flips the SystemSettings row L1 ↔ L2
 *   2. Calls revalidatePath('/', 'layout')
 *   3. Returns { success, newLevel } or { success: false, error }
 *
 * The TopAppBar re-renders with the new pill on the next render.
 */

import * as React from "react";
import { useFormStatus } from "react-dom";

export interface EnginePillButtonProps {
  /** True when the current state is L2 (drives the gold-vs-purple visual). */
  isL2: boolean;
  /** The label to render (e.g. "⚡ L2 AI ENGINE" or "⚙ L1 RULES ENGINE"). */
  label: string;
}

export function EnginePillButton({ isL2, label }: EnginePillButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-label={`Current engine: ${label}. Click to toggle.`}
      className="top-app-bar-engine"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 999, // full pill (rounded-full)
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: pending ? "wait" : "pointer",
        transition: "all 280ms ease",
        opacity: pending ? 0.5 : 1,
        border: `1px solid ${
          isL2 ? "var(--vessel-accent)" : "var(--vessel-border)"
        }`,
        background: isL2
          ? "var(--vessel-accent-soft)"
          : "var(--vessel-surface)",
        color: isL2 ? "var(--vessel-accent)" : "rgba(255,255,255,0.55)",
        boxShadow: isL2 ? "var(--vessel-neon-glow)" : "none",
      }}
    >
      {label}
    </button>
  );
}
