"use client";

/**
 * Compass Vault — pause/resume toggle (Phase 2.5).
 *
 * Small client component shown next to the alert banner. When
 * the vault is ACTIVE, it shows a "PAUSE VAULT" button (caution
 * amber border). When the vault is PAUSED, it shows a "RESUME
 * VAULT" button (vessel-accent active state). Both call the
 * appropriate server action and `router.refresh()`.
 *
 * The button copy explicitly states the consequence — pausing
 * stops all keeper-driven bill execution; resuming re-arms it.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pauseVaultFromPage,
  resumeVaultFromPage,
} from "@/lib/vault/actions";

export function VaultPauseToggle({
  status,
}: {
  status: "ACTIVE" | "PAUSED" | "RECOVERY_MODE";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function fire() {
    if (pending) return;
    setError(null);
    const nextAction =
      status === "PAUSED" ? resumeVaultFromPage : pauseVaultFromPage;
    const isPause = nextAction === pauseVaultFromPage;
    if (isPause) {
      const ok = window.confirm(
        "Pause the vault? New bill execution is suspended until you resume. Existing bills in EARNING keep accruing yield; bills in EXECUTING complete.",
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await nextAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const isPaused = status === "PAUSED";
  const isRecovery = status === "RECOVERY_MODE";
  const label = isPaused ? "RESUME VAULT" : "PAUSE VAULT";
  const sub = isPaused
    ? "Vault is paused. Resume to allow new bill execution."
    : "Stop new bill execution. Bills in flight complete.";

  return (
    <div
      data-testid="vault-pause-toggle"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={fire}
        disabled={pending || isRecovery}
        data-testid="vault-pause-toggle-button"
        title={isRecovery ? "Recovery mode requires manual re-arm (Phase 3)" : sub}
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 14px",
          background: isPaused ? "var(--vessel-accent)" : "transparent",
          color: isPaused ? "var(--void)" : "var(--vessel-watch)",
          border: `1px solid ${
            isPaused ? "var(--vessel-accent)" : "var(--vessel-watch)"
          }`,
          borderRadius: 2,
          cursor: pending ? "wait" : isRecovery ? "not-allowed" : "pointer",
          boxShadow: isPaused ? "var(--vessel-neon-glow)" : "none",
          opacity: pending || isRecovery ? 0.5 : 1,
        }}
      >
        {pending ? "..." : label}
      </button>
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
