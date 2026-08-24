"use client";

/**
 * ResetSeedButton — calls POST /api/reset-seed to wipe envelope
 * balances + audit log for the current user and re-insert the seed
 * envelopes. Used to clear test drift without restarting the dev
 * server.
 *
 * Component Oracle Terminal treatment: warn-bordered panel, [WARN]
 * prefix, mono caps label, gold confirmation modal-style confirmation
 * before firing. The button shows "RESETTING..." while in flight and
 * "RESET TO SEED ✓" on success.
 */

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetSeedButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/reset-seed", { method: "POST" });
      const json = (await r.json()) as { ok: boolean; error?: string; message?: string };
      if (!json.ok) {
        setError(json.error ?? "Reset failed.");
        return;
      }
      setDoneAt(Date.now());
      // Re-read every page (the API already revalidates the root
      // layout, but a soft refresh keeps the UI's local component
      // state in sync with the new server state).
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 32,
        padding: "20px 24px",
        background: "rgba(245, 158, 11, 0.04)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderLeft: "3px solid var(--warn)",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--warn)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            marginBottom: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          [WARN] system reset
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          Wipe every envelope balance + the audit log for the current
          user, then re-insert the 7 seed envelopes. Use this to clear
          test drift after running smokes — your custom envelopes,
          goals, and transactions are not affected.
        </div>
        {error && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--neg)",
              letterSpacing: "0.04em",
            }}
          >
            [WARN] {error}
          </div>
        )}
        {doneAt && (
          <div
            role="status"
            style={{
              marginTop: 10,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ok)",
              letterSpacing: "0.04em",
            }}
          >
            [OK] reset to seed
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-2)",
              padding: "10px 18px",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              borderRadius: 2,
              cursor: pending ? "default" : "pointer",
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          style={{
            background: confirming ? "var(--neg)" : "var(--cosmos-2)",
            color: confirming ? "var(--void)" : "var(--warn)",
            border: `1px solid ${confirming ? "var(--neg)" : "var(--warn)"}`,
            borderRadius: 2,
            padding: "10px 18px",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: pending ? "default" : "pointer",
            fontFamily: "var(--font-jetbrains), monospace",
            boxShadow: confirming ? "0 0 16px rgba(239, 68, 68, 0.4)" : "none",
            transition: "all 160ms",
            whiteSpace: "nowrap",
          }}
        >
          {pending
            ? "[...] resetting"
            : confirming
              ? "Confirm reset"
              : "Reset to seed"}
        </button>
      </div>
    </div>
  );
}
