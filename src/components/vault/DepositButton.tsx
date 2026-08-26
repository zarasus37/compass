"use client";

/**
 * Compass Vault — Aave V3 deposit CTA (Cluster Vault 4.0, M3).
 *
 * The [DEPOSIT] $X USDC button on /vault. Calls
 * `depositSafeUsdcFromPage` which:
 *   1. issues an unlimited USDC approval to the Aave Pool
 *      (on the first deposit; subsequent deposits skip this)
 *   2. sends a Safe-side supply tx via the Aave V3 Pool
 *   3. mints aUSDC to the Safe
 *   4. persists the aUSDC balance cache + writes a
 *      `vault.aave_supply` audit entry
 *
 * UX: preset chips ($50, $100, $500, $1,000) + custom input,
 * pending / error / success states, useTransition +
 * router.refresh() on success (same pattern as the M2
 * [FUND] button).
 *
 * Pre-flight: the user must first acquire Aave-USDC on the
 * Safe (via Aave's faucet at app.aave.com/faucet/) — this is
 * a separate setup step the COORDINATION.md handoff calls out.
 * The M2 [FUND] button funds with Circle's USDC, which is a
 * different token; the M3 [DEPOSIT] button uses Aave's USDC.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { depositSafeUsdcFromPage } from "@/lib/vault/actions";

const PRESET_AMOUNTS_CENTS: { label: string; cents: number }[] = [
  { label: "$50", cents: 50_00 },
  { label: "$100", cents: 100_00 },
  { label: "$500", cents: 500_00 },
  { label: "$1,000", cents: 1_000_00 },
];

const MIN_DOLLARS = 1;
const MAX_DOLLARS = 10_000;

function formatNonce(): string {
  return `aave-supply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function dollarsInputToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (!trimmed) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  const cents = Math.round(dollars * 100);
  if (cents < MIN_DOLLARS * 100) return null;
  if (cents > MAX_DOLLARS * 100) return null;
  return cents;
}

export function DepositButton({
  safeAddress,
  onAaveUsdc,
}: {
  safeAddress: string;
  /** Whether the Safe holds Aave-USDC (M3's deposit asset). */
  onAaveUsdc?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    txHash: string;
    amountCents: number;
    postBalanceCents: number;
  } | null>(null);
  const [selectedCents, setSelectedCents] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState<string>("");

  const activeCents =
    selectedCents ?? dollarsInputToCents(customInput) ?? null;

  function pick(cents: number) {
    setSelectedCents(cents);
    setCustomInput("");
    setError(null);
    setSuccess(null);
  }
  function onCustomChange(v: string) {
    setCustomInput(v);
    setSelectedCents(null);
    setError(null);
    setSuccess(null);
  }
  function fire() {
    if (pending) return;
    if (activeCents === null) {
      setError(
        `Enter an amount between $${MIN_DOLLARS} and $${MAX_DOLLARS.toLocaleString()}`,
      );
      return;
    }
    setError(null);
    const nonce = formatNonce();
    startTransition(async () => {
      const res = await depositSafeUsdcFromPage(activeCents, nonce);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({
        txHash: res.txHash,
        amountCents: res.amountCents,
        postBalanceCents: res.postBalanceCents,
      });
      setSelectedCents(null);
      setCustomInput("");
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-deposit-aave-wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          color: onAaveUsdc ? "var(--ok)" : "var(--vessel-watch)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
        title={
          onAaveUsdc
            ? "Safe holds Aave-USDC — ready to deposit"
            : "Safe has 0 Aave-USDC. Mint from Aave's faucet first (app.aave.com/faucet, select Base Sepolia, mint to the Safe address)."
        }
      >
        // aave-usdc: {onAaveUsdc ? "ready" : "needs faucet"}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {PRESET_AMOUNTS_CENTS.map((p) => {
          const isActive = selectedCents === p.cents;
          return (
            <button
              key={p.cents}
              type="button"
              onClick={() => pick(p.cents)}
              disabled={pending}
              data-testid={`vault-deposit-preset-${p.cents}`}
              data-active={isActive ? "true" : "false"}
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "6px 10px",
                background: isActive
                  ? "var(--vessel-accent)"
                  : "var(--vessel-surface)",
                color: isActive ? "var(--void)" : "var(--ink-2)",
                border: `1px solid ${
                  isActive ? "var(--vessel-accent)" : "var(--vessel-border)"
                }`,
                borderRadius: 2,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
        <input
          type="text"
          inputMode="decimal"
          placeholder="custom $"
          value={customInput}
          onChange={(e) => onCustomChange(e.target.value)}
          disabled={pending}
          data-testid="vault-deposit-custom-input"
          aria-label="Custom deposit amount in dollars"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink)",
            background: "var(--vessel-surface)",
            border: `1px solid ${
              customInput && activeCents !== null
                ? "var(--vessel-accent)"
                : "var(--vessel-border)"
            }`,
            borderRadius: 2,
            padding: "6px 8px",
            width: 92,
            textAlign: "right",
          }}
        />
      </div>
      <button
        type="button"
        onClick={fire}
        disabled={pending || activeCents === null}
        data-testid="vault-deposit-button"
        title={`Deposit ${
          activeCents !== null ? (activeCents / 100).toFixed(2) : "—"
        } Aave-USDC from the Safe to Aave V3 (Safe ${safeAddress})`}
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 16px",
          background: "var(--vessel-accent)",
          color: "var(--void)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending
            ? "wait"
            : activeCents === null
              ? "not-allowed"
              : "pointer",
          boxShadow: "var(--vessel-neon-glow)",
          opacity: activeCents === null ? 0.5 : 1,
        }}
      >
        {pending
          ? "Depositing…"
          : `[DEPOSIT] ${
              activeCents !== null ? (activeCents / 100).toFixed(2) : "0.00"
            } → AAVE`}
      </button>
      {error && (
        <div
          role="alert"
          data-testid="vault-deposit-error"
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
      {success && !error && (
        <div
          data-testid="vault-deposit-success"
          style={{
            fontSize: 10,
            color: "var(--ok)",
            maxWidth: 460,
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          [OK] deposited{" "}
          <span style={{ fontWeight: 700 }}>
            ${(success.amountCents / 100).toFixed(2)}
          </span>{" "}
          · aUSDC now ${(success.postBalanceCents / 100).toFixed(2)} · tx{" "}
          {success.txHash.slice(0, 6)}…{success.txHash.slice(-4)}
        </div>
      )}
    </div>
  );
}
