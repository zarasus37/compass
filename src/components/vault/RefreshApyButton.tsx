"use client";

/**
 * Compass Vault — refresh APY button (Phase 3.0).
 *
 * The "manual cron" affordance for the yield adapter. The
 * button calls `refreshVaultApyFromPage`, which fetches the
 * active adapter's current APY, updates the VaultAccount, and
 * writes an audit-log entry. On success, the page revalidates
 * with `router.refresh()` and the live APY display updates.
 *
 * Terminal voice: vessel-accent button, mono caps label,
 * `[OK]` / `[WARN]` / `[SYNC]` markers. The source label
 * ("Sky", "Aave", "Mock") is shown next to the button so the
 * user knows which adapter is active.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshVaultApyFromPage } from "@/lib/vault/actions";

export function RefreshApyButton({
  currentApy,
  source,
  lastRefreshedAt,
}: {
  currentApy: number;
  source: string;
  lastRefreshedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(lastRefreshedAt);

  function fire() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await refreshVaultApyFromPage();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastOk(res.apyRefreshedAt);
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-refresh-apy"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={fire}
        disabled={pending}
        data-testid="vault-refresh-apy-button"
        title={`Refresh APY from the active yield adapter (${source})`}
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 14px",
          background: "var(--vessel-accent)",
          color: "var(--void)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
          boxShadow: "var(--vessel-neon-glow)",
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? "[SYNC] refreshing…" : "[SYNC] REFRESH APY"}
      </button>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.10em",
        }}
      >
        // adapter: {source.toLowerCase()} · apy: {(currentApy * 100).toFixed(2)}%
        {lastOk && (
          <>
            {" "}
            · refreshed{" "}
            {new Date(lastOk).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </>
        )}
      </div>
      {error && (
        <div
          role="alert"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
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
