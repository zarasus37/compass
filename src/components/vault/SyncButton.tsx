"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { syncVaultFromEnvelopes } from "@/lib/vault/actions";

/**
 * SyncButton — triggers `seedVaultFromEnvelopes` on the server
 * and refreshes the page so the populated state renders.
 *
 * Phase 2.0 uses a transition + router.refresh() rather than
 * optimistic updates. The seed is sub-second in dev but a
 * production run could take longer; a transition keeps the
 * button responsive.
 */
export function SyncButton({ label }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await syncVaultFromEnvelopes();
            if (r.ok) {
              router.refresh();
            } else {
              setError(r.error ?? "Sync failed");
            }
          });
        }}
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          background: pending ? "var(--cosmos-2)" : "var(--terminal-cyan)",
          color: "var(--void)",
          border: 0,
          borderRadius: 2,
          padding: "12px 22px",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: pending ? "wait" : "pointer",
          boxShadow: pending
            ? "none"
            : "0 0 16px rgba(45, 212, 191, 0.3)",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Syncing…" : label ?? "Sync vault from envelopes"}
      </button>
      {error && (
        <span
          role="alert"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--warn)",
            letterSpacing: "0.04em",
          }}
        >
          [WARN] {error}
        </span>
      )}
    </div>
  );
}
