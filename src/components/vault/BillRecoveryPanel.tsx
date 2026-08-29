"use client";

/**
 * Compass Vault — M4 bill recovery panel.
 *
 * Rendered inside the bill row when status ∈
 * {INSUFFICIENT_FUNDS, REQUIRES_REVIEW, MANUAL_ACTION_REQUIRED,
 * FAILED_RETRYABLE, FAILED_FINAL}. The panel shows the gateway's
 * last known reason + a contextual button:
 *
 *   INSUFFICIENT_FUNDS      → [RETRY] (re-runs the gateway)
 *   REQUIRES_REVIEW         → [RETRY] (the gateway may now succeed)
 *   MANUAL_ACTION_REQUIRED  → [RETRY] + [MARK MANUALLY PAID] (the
 *                              user can either let the gateway try
 *                              again, or pay out-of-band and confirm
 *                              here)
 *   FAILED_RETRYABLE        → [RETRY] (re-runs the gateway)
 *   FAILED_FINAL            → [MARK MANUALLY PAID] (the gateway has
 *                              exhausted the chain; user must pay
 *                              out-of-band)
 *
 * The "Mark manually paid" flow is two-step: click the button to
 * reveal a tiny inline form (settlementRef input + confirm), then
 * submit. The form prevents accidental settlements.
 *
 * Why inline (not a modal)?
 *   - The recovery context is right next to the bill row it
 *     applies to. A modal would hide which bill the user is
 *     confirming — high error potential. The inline form keeps
 *     the bill visible.
 *   - The form is <100 lines of state + 4 input fields. A modal
 *     would be overkill.
 */

import { useState, useTransition } from "react";
import {
  retryBillPaymentServerAction,
  confirmManualPaymentServerAction,
} from "@/lib/vault/actions";
import type { ScheduledBill } from "@/lib/vault/types";

export function BillRecoveryPanel({ bill }: { bill: ScheduledBill }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [settlementRef, setSettlementRef] = useState("");

  const status = bill.status;
  const showRetry =
    status === "INSUFFICIENT_FUNDS" ||
    status === "REQUIRES_REVIEW" ||
    status === "MANUAL_ACTION_REQUIRED" ||
    status === "FAILED_RETRYABLE";
  const showManualConfirm =
    status === "MANUAL_ACTION_REQUIRED" ||
    status === "FAILED_FINAL" ||
    status === "REQUIRES_REVIEW";

  function onRetry() {
    setFeedback(null);
    startTransition(async () => {
      const res = await retryBillPaymentServerAction(bill.id);
      if (!res.ok) {
        setFeedback({ kind: "warn", text: res.error });
        return;
      }
      if (res.requiresManualAction) {
        setFeedback({
          kind: "warn",
          text: `Gateway fell back again (${res.providerName}). Try manual confirm below.`,
        });
      } else {
        setFeedback({
          kind: "ok",
          text: `Settled via ${res.providerName} (tx ${res.transactionId ?? "n/a"}).`,
        });
      }
    });
  }

  function onConfirmManual() {
    if (!settlementRef.trim()) {
      setFeedback({ kind: "warn", text: "Enter a settlement reference first." });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await confirmManualPaymentServerAction(
        bill.id,
        settlementRef.trim(),
      );
      if (!res.ok) {
        setFeedback({ kind: "warn", text: res.error });
        return;
      }
      setFeedback({
        kind: "ok",
        text: `Manually confirmed (ref ${res.settlementRef}).`,
      });
      setSettlementRef("");
      setShowConfirmForm(false);
    });
  }

  return (
    <div
      data-testid={`vault-recovery-panel-${bill.id}`}
      style={{
        marginTop: 8,
        padding: "10px 14px",
        border: "1px dashed var(--warn)",
        borderRadius: 2,
        background: "rgba(249, 115, 22, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--warn)",
          }}
        >
          [WARN] {status.replace(/_/g, " ")}
        </span>
        {bill.settlementReference && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
            }}
          >
            last ref: {bill.settlementReference}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending}
            data-testid={`vault-retry-bill-${bill.id}`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "5px 10px",
              background: "var(--vessel-accent)",
              color: "var(--void)",
              border: "1px solid var(--vessel-accent)",
              borderRadius: 2,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "[…] retrying" : "[RETRY]"}
          </button>
        )}
        {showManualConfirm && !showConfirmForm && (
          <button
            type="button"
            onClick={() => setShowConfirmForm(true)}
            disabled={pending}
            data-testid={`vault-mark-manual-${bill.id}`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "5px 10px",
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--ink-3)",
              borderRadius: 2,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            [MARK MANUALLY PAID]
          </button>
        )}
      </div>
      {showConfirmForm && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            Settlement ref:
            <input
              type="text"
              value={settlementRef}
              onChange={(e) => setSettlementRef(e.target.value)}
              placeholder="e.g. PAYPAL-7Q3X2"
              data-testid={`vault-manual-ref-${bill.id}`}
              style={{
                marginLeft: 8,
                padding: "4px 8px",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--ink)",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                minWidth: 180,
              }}
            />
          </label>
          <button
            type="button"
            onClick={onConfirmManual}
            disabled={pending}
            data-testid={`vault-manual-confirm-${bill.id}`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "5px 10px",
              background: "var(--vessel-accent)",
              color: "var(--void)",
              border: "1px solid var(--vessel-accent)",
              borderRadius: 2,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "[…] confirming" : "[CONFIRM]"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirmForm(false);
              setSettlementRef("");
            }}
            disabled={pending}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            cancel
          </button>
        </div>
      )}
      {feedback && (
        <div
          data-testid={`vault-recovery-feedback-${bill.id}`}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: feedback.kind === "ok" ? "var(--ok)" : "var(--warn)",
            letterSpacing: "0.04em",
          }}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
