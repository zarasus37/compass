"use client";

/**
 * Compass Vault — per-bill action menu (Phase 2.5).
 *
 * Renders the legal-next-event buttons for a single bill. The
 * buttons are filtered to the bill's `legalNextStates(...)` set
 * so an illegal transition is impossible from the UI. A
 * "SIMULATE →" button is also shown (the dev affordance from
 * COORDINATION.md line 1401) that picks the first legal event.
 *
 * The component is intentionally compact: a horizontal row of
 * small mono-caps buttons below the bill row. Terminal voice,
 * vessel-accent for legal next moves, vessel-border for the
 * container.
 *
 * Server actions are called via useTransition; the page
 * revalidates with `router.refresh()` on success so the table
 * re-renders the new state.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  transitionBillFromPage,
  simulateNextBillStateFromPage,
} from "@/lib/vault/actions";
import type { BillEvent, BillStatus } from "@/lib/vault/types";
import { legalNextStates } from "@/lib/vault/state-machine";

// Events that need a confirmation step before firing. CANCEL is
// terminal — the user should mean it. INSUFFICIENT_FUNDS /
// FAIL_FINAL are user assertions about an external condition.
const CONFIRM_FIRST: ReadonlySet<string> = new Set([
  "CANCEL",
  "INSUFFICIENT_FUNDS",
  "FAIL_FINAL",
]);

// Human-readable label for each event in the UI.
const EVENT_LABEL: Record<BillEvent["type"], string> = {
  FUND: "Fund",
  ENTER_EARN: "Enter earn",
  BEGIN_SETTLEMENT: "Begin settlement",
  EXECUTE: "Execute",
  CONFIRM_SETTLED: "Mark settled",
  INSUFFICIENT_FUNDS: "Insufficient funds",
  PAUSE: "Pause",
  RESUME: "Resume",
  REQUIRES_REVIEW: "Review required",
  MANUAL_ACTION_REQUIRED: "Manual action",
  RETRY: "Retry",
  FAIL_FINAL: "Fail final",
  CANCEL: "Cancel",
};

export function BillTransitionMenu({
  billId,
  status,
}: {
  billId: string;
  status: BillStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);
  const legal = legalNextStates(status);

  function fire(eventType: BillEvent["type"]) {
    if (pending) return;
    if (CONFIRM_FIRST.has(eventType)) {
      const ok = window.confirm(
        `${EVENT_LABEL[eventType]} this bill? This is ${
          eventType === "CANCEL" ? "terminal (the bill cannot be re-armed)" : "user-driven"
        }.`,
      );
      if (!ok) return;
    }
    setError(null);
    setPendingEvent(eventType);
    startTransition(async () => {
      const res = await transitionBillFromPage(billId, eventType);
      setPendingEvent(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function simulate() {
    if (pending) return;
    setError(null);
    setPendingEvent("SIMULATE");
    startTransition(async () => {
      const res = await simulateNextBillStateFromPage(billId);
      setPendingEvent(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (legal.length === 0) {
    return (
      <div
        data-testid={`bill-transitions-${billId}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          [terminal]
        </div>
        {error && (
          <div
            role="alert"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--vessel-over)",
            }}
          >
            [WARN] {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid={`bill-transitions-${billId}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 0",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        // transitions:
      </div>
      {legal.map((eventType) => {
        const isPending = pending && pendingEvent === eventType;
        return (
          <button
            key={eventType}
            type="button"
            onClick={() => fire(eventType)}
            disabled={pending}
            data-testid={`bill-transition-${billId}-${eventType}`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "4px 8px",
              background: "transparent",
              color: isPending ? "var(--ink-3)" : "var(--vessel-accent)",
              border: `1px solid ${
                isPending ? "var(--vessel-border)" : "var(--vessel-accent)"
              }`,
              borderRadius: 2,
              cursor: pending ? "wait" : "pointer",
              opacity: pending && !isPending ? 0.4 : 1,
            }}
          >
            {EVENT_LABEL[eventType]}
          </button>
        );
      })}
      <button
        type="button"
        onClick={simulate}
        disabled={pending}
        data-testid={`bill-transition-${billId}-SIMULATE`}
        title="Run the first legal next event (dev affordance)"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: "4px 10px",
          background: "var(--vessel-accent)",
          color: "var(--void)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
          boxShadow: "var(--vessel-neon-glow)",
          marginLeft: 4,
          opacity: pending && pendingEvent !== "SIMULATE" ? 0.4 : 1,
        }}
      >
        SIMULATE →
      </button>
      {error && (
        <div
          role="alert"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--vessel-over)",
            flexBasis: "100%",
            marginTop: 2,
          }}
        >
          [WARN] {error}
        </div>
      )}
    </div>
  );
}
