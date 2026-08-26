"use client";

/**
 * Compass Vault — risk-disclosure "I understand" button (Phase 2.5).
 *
 * Renders the prominent CTA inside the RiskDisclosure aside on
 * the /vault page. Calls `acknowledgeRiskDisclosureAction` and
 * `router.refresh()` on success so the disclosure re-renders
 * suppressed on the next pass.
 *
 * Terminal voice: vessel-accent background, void text, mono caps
 * label. A small subtitle line clarifies the action.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeRiskDisclosureAction } from "@/lib/vault/actions";

export function RiskAckButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ack() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await acknowledgeRiskDisclosureAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-risk-ack"
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
        onClick={ack}
        disabled={pending}
        data-testid="vault-risk-ack-button"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "10px 18px",
          background: "var(--vessel-accent)",
          color: "var(--void)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
          boxShadow: "var(--vessel-neon-glow)",
          opacity: pending ? 0.5 : 1,
        }}
      >
        [OK] I understand
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
          ? "Recording acknowledgment…"
          : "Acknowledging hides this notice on future visits. You can re-acknowledge any time."}
      </div>
      {error && (
        <div
          role="alert"
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
