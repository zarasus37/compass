"use client";

/**
 * Compass Vault — M4 "Execute now" button.
 *
 * The user-facing affordance for triggering the off-ramp gateway
 * on a bill in FUNDED / EARNING status. The button is disabled
 * (with a tooltip explaining why) when the 7-condition canExecute
 * gate refuses — the gate is computed on the server during the
 * initial render, so the client already has the reason string
 * at hand.
 *
 * Why server-side gate evaluation?
 *   - The reserve check is a live DB read (vault.settlementReserve)
 *   - The pending-attempt check is a 5-min PaymentAttempt query
 *   - Doing these on the client would mean a parallel fetch on
 *     every page render, plus a stale-cache problem when the
 *     user just funded their vault and the reserve flipped
 *
 * So the page passes `gateReason` down (null when canExecute
 * passed; a string when it failed). The button re-runs the
 * action on click and surfaces the new gate's reason if the
 * state changed between page-load and click-time.
 */

import { useState, useTransition } from "react";
import { executeBillPaymentServerAction } from "@/lib/vault/actions";

export function ExecuteBillButton({
  billId,
  disabled,
  disabledReason,
}: {
  billId: string;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  function onClick() {
    setLastError(null);
    setLastResult(null);
    startTransition(async () => {
      const res = await executeBillPaymentServerAction(billId);
      if (!res.ok) {
        setLastError(res.error);
        return;
      }
      if (res.requiresManualAction) {
        setLastResult(
          `Provider fell back to manual — ${res.providerName}. Bill is in MANUAL_ACTION_REQUIRED; mark it paid once you've paid out-of-band.`,
        );
      } else {
        setLastResult(
          `Settled via ${res.providerName} (tx ${res.transactionId ?? "n/a"}).`,
        );
      }
    });
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        data-testid={`vault-execute-bill-${billId}`}
        title={disabled ? (disabledReason ?? "Cannot execute now.") : "Run the off-ramp gateway for this bill."}
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "6px 12px",
          background: disabled || pending ? "var(--line-soft)" : "var(--vessel-accent)",
          color: disabled || pending ? "var(--ink-3)" : "var(--void)",
          border: `1px solid ${disabled || pending ? "var(--line-soft)" : "var(--vessel-accent)"}`,
          borderRadius: 2,
          cursor: disabled || pending ? "not-allowed" : "pointer",
          boxShadow: disabled || pending ? "none" : "var(--vessel-neon-glow)",
        }}
      >
        {pending ? "[…] executing" : "[EXECUTE]"}
      </button>
      {lastError && (
        <span
          data-testid={`vault-execute-error-${billId}`}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--warn)",
            letterSpacing: "0.04em",
          }}
        >
          {lastError}
        </span>
      )}
      {lastResult && (
        <span
          data-testid={`vault-execute-result-${billId}`}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ok)",
            letterSpacing: "0.04em",
          }}
        >
          {lastResult}
        </span>
      )}
    </div>
  );
}
