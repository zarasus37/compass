"use client";

/**
 * Compass Vault — on-chain USDC balance refresh CTA (Cluster
 * Vault 4.0, M2).
 *
 * The [REFRESH] BALANCE button on /vault. Reads the deployed
 * Safe's on-chain USDC balance via viem + persists it to the
 * denormalized cache on `VaultAccount.onChainUsdcBalanceCents`.
 * The status strip + the audit footer pick up the new value on
 * the next render (server action calls `revalidatePath`).
 *
 * UX:
 *   - Single [REFRESH] button with a "refreshed HH:MM:SS" line
 *     next to it (the parent's `lastRefreshedAt` prop drives
 *     the label; the success response updates it locally so
 *     the new timestamp is visible without a network round-trip)
 *   - Pending / error states surfaced inline
 *
 * Caller contract: the parent only renders this component when
 * the vault has a non-MOCK `smartAccountAddress`. The button
 * is hidden in MOCK state — the [DEPLOY] Safe CTA goes first.
 *
 * Server action contract (`refreshSafeBalanceFromPage`):
 *   { ok: true, onChainUsdcBalanceCents, refreshedAt }
 *   | { ok: false, error }
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSafeBalanceFromPage } from "@/lib/vault/actions";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function RefreshBalanceButton({
  lastRefreshedAt,
  onChainBalanceCents,
  safeAddress,
}: {
  lastRefreshedAt: string | null;
  onChainBalanceCents: number;
  safeAddress: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(lastRefreshedAt);
  const [lastBalance, setLastBalance] = useState<number | null>(null);

  function fire() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await refreshSafeBalanceFromPage();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastOk(res.refreshedAt);
      setLastBalance(res.onChainUsdcBalanceCents);
      router.refresh();
    });
  }

  const displayBalance =
    lastBalance !== null ? lastBalance : onChainBalanceCents;

  return (
    <div
      data-testid="vault-refresh-balance-wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          // on-chain: ${(displayBalance / 100).toFixed(2)} USDC
          {lastOk && (
            <>
              {" · refreshed "}
              {formatTime(lastOk)}
            </>
          )}
        </span>
        <button
          type="button"
          onClick={fire}
          disabled={pending}
          data-testid="vault-refresh-balance-button"
          title={`Read on-chain USDC balance for Safe ${safeAddress}`}
          style={{
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
          {pending ? "[SYNC] reading…" : "[REFRESH] BALANCE"}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          data-testid="vault-refresh-balance-error"
          style={{
            fontSize: 10,
            color: "var(--vessel-over)",
            maxWidth: 460,
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          [WARN] {error}
        </div>
      )}
    </div>
  );
}
