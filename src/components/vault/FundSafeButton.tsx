"use client";

/**
 * Compass Vault — USDC funding CTA (Cluster Vault 4.0, M2).
 *
 * The [FUND] $X USDC button on /vault. Transfers testnet USDC
 * from the server-side signer to the user's deployed Safe.
 *
 * UX:
 *   - Preset chips ($50, $100, $500, $1000) for one-tap funding
 *   - Custom input (dollars → cents conversion on submit)
 *   - Single [FUND] CTA that calls `fundSafeFromPage` with a
 *     per-click nonce (so a re-submit short-circuits to the
 *     prior audit row, no double-broadcast)
 *   - Pending / error states surfaced inline
 *
 * Caller contract: the parent only renders this component when
 * the vault has a non-MOCK `smartAccountAddress`. The button is
 * hidden in MOCK state — the [DEPLOY] Safe CTA goes first.
 *
 * Server action contract (`fundSafeFromPage`):
 *   { ok: true, txHash, amountCents, postBalanceCents, nonce }
 *   | { ok: false, error }
 *
 * The error path surfaces the server's structured message
 * inline (e.g. "signer has 0.00 USDC — get testnet USDC from
 * the Circle faucet"). The success path triggers
 * `router.refresh()` so the new on-chain balance + audit-log
 * count appear on the next render.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fundSafeFromPage } from "@/lib/vault/actions";

/** Preset chip amounts in cents. One tap = one funding. */
const PRESET_AMOUNTS_CENTS: { label: string; cents: number }[] = [
  { label: "$50", cents: 50_00 },
  { label: "$100", cents: 100_00 },
  { label: "$500", cents: 500_00 },
  { label: "$1,000", cents: 1_000_00 },
];

const MIN_DOLLARS = 1;
const MAX_DOLLARS = 10_000;

function formatNonce(): string {
  return `fund-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

export function FundSafeButton({
  safeAddress,
  signerAddress,
}: {
  safeAddress: string;
  signerAddress?: string | null;
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
      const res = await fundSafeFromPage(activeCents, nonce);
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
      data-testid="vault-fund-safe-wrap"
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
              data-testid={`vault-fund-preset-${p.cents}`}
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
          data-testid="vault-fund-custom-input"
          aria-label="Custom USDC amount in dollars"
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {signerAddress && (
          <span
            title={`Funding signer: ${signerAddress}\nSafe recipient: ${safeAddress}`}
            style={{
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            // signer {shortAddr(signerAddress)} → safe {shortAddr(safeAddress)}
          </span>
        )}
        <button
          type="button"
          onClick={fire}
          disabled={pending || activeCents === null}
          data-testid="vault-fund-safe-button"
          title={`Transfer ${
            activeCents !== null ? (activeCents / 100).toFixed(2) : "—"
          } USDC from the signer to the Safe`}
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
            ? "Funding…"
            : `[FUND] ${
                activeCents !== null ? (activeCents / 100).toFixed(2) : "0.00"
              } USDC`}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          data-testid="vault-fund-safe-error"
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
          data-testid="vault-fund-safe-success"
          style={{
            fontSize: 10,
            color: "var(--ok)",
            maxWidth: 460,
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          [OK] funded{" "}
          <span style={{ fontWeight: 700 }}>
            ${(success.amountCents / 100).toFixed(2)} USDC
          </span>{" "}
          · safe now ${(success.postBalanceCents / 100).toFixed(2)} · tx{" "}
          {shortAddr(success.txHash)}
        </div>
      )}
    </div>
  );
}

function shortAddr(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
