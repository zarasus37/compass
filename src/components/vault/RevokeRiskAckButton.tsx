"use client";

/**
 * Compass Vault — re-acknowledge risk disclosure (Cluster 7.0).
 *
 * The companion to <RiskAckButton />. When the user has previously
 * acknowledged the risk disclosure and now wants to clear the
 * suppression (per the spec's "re-acknowledgment required when
 * the user changes yield-routing strategy or adds a new bill"),
 * this button calls `revokeRiskDisclosureAction`. The audit log
 * records the event as `vault.risk_unacknowledged`; the next
 * page render re-renders the disclosure.
 *
 * Terminal voice: vessel-accent border, void-on-hover fill,
 * mono caps label. Optimistic UI: the click immediately hides
 * the acknowledged banner and shows the disclosure, while the
 * server action runs.
 *
 * The "confirmed" state (acknowledged) is the resting state; the
 * button only appears when `riskAcknowledgedAt` is set. When
 * the user revokes, `router.refresh()` re-renders the page in
 * its unacknowledged state.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeRiskDisclosureAction } from "@/lib/vault/actions";

export function RevokeRiskAckButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    if (pending) return;
    setError(null);
    const ok = window.confirm(
      "Re-prompt the risk disclosure on your next visit? " +
        "This clears the acknowledged timestamp; the warning " +
        "will re-render until you click [OK] I understand again.",
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await revokeRiskDisclosureAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-revoke-risk-ack"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 16,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        data-testid="vault-revoke-risk-ack-button"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "10px 18px",
          background: "var(--vessel-surface)",
          color: "var(--vessel-accent)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.5 : 1,
        }}
      >
        [WARN] Re-acknowledge
      </button>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--ink-3)",
        }}
      >
        {pending
          ? "Clearing acknowledgment…"
          : "Re-prompt the disclosure on your next visit. Use after changing strategy or adding a large bill."}
      </div>
      {error && (
        <div
          role="alert"
          data-testid="vault-revoke-risk-ack-error"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--vessel-over)",
            flexBasis: "100%",
          }}
        >
          [WARN] {error}
        </div>
      )}
    </div>
  );
}
