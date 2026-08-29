"use client";

/**
 * RunNowButton — manual override on the /vault/schedule page.
 *
 * Calls POST /api/vault/schedule/run-now. On success, reloads
 * the page so the status cells + run history reflect the run.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

export function RunNowButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/schedule/run-now", { method: "POST" });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        data-testid="vault-schedule-run-now-button"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "6px 12px",
          background: busy ? "var(--line-soft)" : "var(--ok)",
          color: busy ? "var(--ink-3)" : "var(--void)",
          border: `1px solid ${busy ? "var(--line)" : "var(--ok)"}`,
          borderRadius: 2,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "[…] RUNNING" : "[RUN] NOW"}
      </button>
      {error ? (
        <span
          style={{
            fontSize: 9.5,
            color: "var(--over)",
            letterSpacing: "0.10em",
          }}
        >
          [ERR] {error}
        </span>
      ) : null}
    </div>
  );
}
