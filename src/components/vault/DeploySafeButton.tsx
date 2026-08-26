"use client";

/**
 * Compass Vault — Safe deploy CTA (Cluster Vault 4.0, M1).
 *
 * The [DEPLOY] button on /vault. Calls `deploySafeFromPage` which
 * broadcasts a CREATE2 Safe deploy tx on the configured chain
 * (Base Sepolia by default) and persists the deployed address on
 * the vault row. Once deployed, the button is replaced with a
 * small terminal-style address chip showing the real address.
 *
 * State machine:
 *   - isMock = true  → button is enabled, clickable
 *   - isMock = false → chip with the address + signer info
 *   - error          → inline [WARN] line under the button
 *   - pending        → button is "DEPLOYING…" + disabled
 *
 * Server action contract: returns `{ ok, safeAddress, chainId,
 * signerAddress, txHash }` on success or `{ ok: false, error }`
 * on failure. The failure path surfaces the error inline; the
 * audit log gets a `vault.safe_deploy_failed` entry.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deploySafeFromPage } from "@/lib/vault/actions";

export function DeploySafeButton({
  smartAccountAddress,
  signerAddress,
  chainId,
}: {
  smartAccountAddress: string;
  signerAddress?: string | null;
  chainId: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isMock =
    !smartAccountAddress ||
    smartAccountAddress.toLowerCase() ===
      "0xmock0000000000000000000000000000000000dead";

  if (!isMock) {
    return (
      <div
        data-testid="vault-safe-deployed-chip"
        data-safe-address={smartAccountAddress}
        data-signer-address={signerAddress ?? ""}
        data-chain-id={String(chainId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ok)",
          border: "1px solid var(--ok)",
          padding: "6px 10px",
          borderRadius: 2,
        }}
        title={`Safe: ${smartAccountAddress}\nSigner: ${signerAddress ?? "—"}\nChain: ${chainId}`}
      >
        [OK] Safe {shortAddr(smartAccountAddress)}
      </div>
    );
  }

  function onClick() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await deploySafeFromPage();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-deploy-safe-wrap"
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        data-testid="vault-deploy-safe-button"
        title="Deploy a Safe smart-account to the configured chain (Base Sepolia by default)"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 16px",
          background: "var(--vessel-accent)",
          color: "var(--void)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
          boxShadow: "var(--vessel-neon-glow)",
        }}
      >
        {pending ? "Deploying…" : "[DEPLOY] Safe"}
      </button>
      {error && (
        <div
          role="alert"
          data-testid="vault-deploy-safe-error"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--vessel-over)",
            maxWidth: 360,
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

function shortAddr(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
