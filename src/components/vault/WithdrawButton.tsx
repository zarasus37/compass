"use client";

/**
 * Compass Vault — Aave V3 withdraw CTA (Cluster Vault 4.0, M3).
 *
 * The [WITHDRAW] $X USDC button on /vault. Burns the Safe's
 * aUSDC via the Aave V3 Pool's `withdraw(asset, amount, to)`
 * and sends the underlying USDC back to the Safe.
 *
 * UX: preset chips ($50, $100, $500, $1,000) + custom input,
 * pending / error / success states, useTransition +
 * router.refresh() on success. Mirrors the [DEPOSIT] +
 * [FUND] button patterns.
 *
 * Pre-flight: the Safe must hold aUSDC (i.e. a prior
 * [DEPOSIT] call succeeded). The onAaveUsdc check below
 * is a soft check — the server action re-verifies with the
 * authoritative on-chain aUSDC balance.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawSafeUsdcFromPage } from "@/lib/vault/actions";

const PRESET_AMOUNTS_CENTS: { label: string; cents: number }[] = [
  { label: "$50", cents: 50_00 },
  { label: "$100", cents: 100_00 },
  { label: "$500", cents: 500_00 },
  { label: "$1,000", cents: 1_000_00 },
];

const MIN_DOLLARS = 1;
const MAX_DOLLARS = 10_000;

function formatNonce(): string {
  return `aave-withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

export function WithdrawButton({
  safeAddress,
  hasAUsdc,
}: {
  safeAddress: string;
  /** Whether the Safe currently holds aUSDC (cached from the
   *  vault row). */
  hasAUsdc?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    txHash: string;
    amountCents: number;
    postUsdcBalanceCents: number;
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
      const res = await withdrawSafeUsdcFromPage(activeCents, nonce);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({
        txHash: res.txHash,
        amountCents: res.amountCents,
        postUsdcBalanceCents: res.postAUsdcBalanceCents,
      });
      setSelectedCents(null);
      setCustomInput("");
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-withdraw-aave-wrap"
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
          color: hasAUsdc ? "var(--ok)" : "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
        title={
          hasAUsdc
            ? "Safe holds aUSDC — ready to withdraw"
            : "Safe has 0 aUSDC. Deposit first via [DEPOSIT] $X USDC."
        }
      >
        // aave-ausdc: {hasAUsdc ? "ready" : "none yet"}
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
              data-testid={`vault-withdraw-preset-${p.cents}`}
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
          data-testid="vault-withdraw-custom-input"
          aria-label="Custom withdraw amount in dollars"
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
        data-testid="vault-withdraw-button"
        title={`Withdraw ${
          activeCents !== null ? (activeCents / 100).toFixed(2) : "—"
        } Aave-USDC from the Safe's aUSDC position back to the Safe`}
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
          ? "Withdrawing…"
          : `[WITHDRAW] ${
              activeCents !== null ? (activeCents / 100).toFixed(2) : "0.00"
            } ← AAVE`}
      </button>
      {error && (
        <div
          role="alert"
          data-testid="vault-withdraw-error"
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
          data-testid="vault-withdraw-success"
          style={{
            fontSize: 10,
            color: "var(--ok)",
            maxWidth: 460,
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          [OK] withdrew{" "}
          <span style={{ fontWeight: 700 }}>
            ${(success.amountCents / 100).toFixed(2)}
          </span>{" "}
          · USDC now ${(success.postUsdcBalanceCents / 100).toFixed(2)} · tx{" "}
          {success.txHash.slice(0, 6)}…{success.txHash.slice(-4)}
        </div>
      )}
    </div>
  );
}
