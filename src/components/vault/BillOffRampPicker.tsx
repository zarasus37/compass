"use client";

/**
 * Compass Vault — per-bill off-ramp provider picker (Cluster 7.14).
 *
 * Mirrors `OffRampProviderPicker` (Cluster 7.3) but for the
 * per-bill scope. 4 chips: [USE MY DEFAULT · <userDefault>] (writes
 * `null` to clear the override) + [MOCK] + [Spritz] + [Monto]
 * (writes the enum form).
 *
 * The "inherit" state is a first-class chip — a bill that says
 * "follow the account" is a real intent, not a "no choice" edge
 * case.
 *
 * Below the chips, the **resolved chain** is rendered from the
 * server-passed `chain` prop. The resolved chain makes the
 * fallback visible and surfaces the consequence of the choice:
 * "if this bill's payment fails at <first>, the gateway tries
 * <second>, then <third>, then Manual Push." This is the user's
 * "what happens if this fails?" question, given a literal
 * visual answer.
 *
 * Pattern: optimistic UI + `useTransition` + `pending` (chips
 * disable during the action — no double-fire), `router.refresh()`
 * on success so every server-rendered surface picks up the new
 * override. The 7.11 ticker shows the audit row in real-time.
 *
 * "The picker's value is answering 'what happens if this fails?'"
 * (Polar 7.14 review).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBillProviderPreferenceActionClient } from "@/lib/vault/actions";
import {
  OFFRAMP_PROVIDER_LABEL,
  OFFRAMP_PROVIDER_DESC,
  OFFRAMP_PROVIDER_ADAPTER_NAME,
  type OffRampProvider,
} from "@/lib/vault/types";

const ALL_PROVIDERS: OffRampProvider[] = ["MOCK", "SPRITZ", "MONTO"];

export interface BillOffRampPickerProps {
  billId: string;
  /** The bill's current override (enum form or null). null = "use my default". */
  current: OffRampProvider | null;
  /** The user's default provider (display form, e.g. "Spritz"). */
  userDefaultLabel: string;
  /** The resolved chain the gateway will try for this bill right now. */
  chain: string[];
  /**
   * Where the bill's chain is coming from right now. Drives the
   * "currently routes via" line under the chips.
   */
  source: "per-bill override" | "user default";
}

export function BillOffRampPicker({
  billId,
  current,
  userDefaultLabel,
  chain,
  source,
}: BillOffRampPickerProps) {
  const router = useRouter();
  // Optimistic state: the chip the user just clicked. We track
  // this as the union-with-null to also support the "inherit"
  // chip (null = "USE MY DEFAULT").
  const [optimistic, setOptimistic] = useState<OffRampProvider | null>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(provider: OffRampProvider | null) {
    if (provider === optimistic || pending) return;
    const prev = optimistic;
    setOptimistic(provider);
    setError(null);
    startTransition(async () => {
      // Empty string = "clear" (write null); otherwise write the
      // enum form. The server action handles both.
      const res = await setBillProviderPreferenceActionClient(
        billId,
        provider ?? "",
      );
      if (!res.ok) {
        setOptimistic(prev);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  // 4 chips: inherit (null) + 3 provider enum values.
  const chips: { value: OffRampProvider | null; label: string; desc: string; tag: string }[] = [
    {
      value: null,
      label: `USE MY DEFAULT · ${userDefaultLabel}`,
      desc: "Follow the account. The user-level provider wins.",
      tag: "inherit",
    },
    ...ALL_PROVIDERS.map((p) => ({
      value: p,
      label: OFFRAMP_PROVIDER_LABEL[p],
      desc: OFFRAMP_PROVIDER_DESC[p],
      tag: p,
    })),
  ];

  // Display form for the "currently routes via" line. The resolved
  // chain's first entry is the actual adapter (display form), so
  // we surface that — it's what the gateway will try first.
  const chainHead = chain[0] ?? "Mock";

  return (
    <div
      data-testid="vault-bill-offramp-picker"
      aria-label="Per-bill off-ramp provider"
      data-source={source}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {chips.map((chip) => {
        const isCurrent = chip.value === optimistic;
        return (
          <button
            key={chip.tag}
            type="button"
            onClick={() => pick(chip.value)}
            disabled={pending}
            aria-pressed={isCurrent}
            data-testid={
              chip.value === null
                ? "bill-offramp-picker-inherit"
                : `bill-offramp-picker-${chip.value}`
            }
            data-current={isCurrent ? "true" : "false"}
            style={{
              fontFamily: "var(--font-sora)",
              textAlign: "left",
              cursor: pending ? "wait" : isCurrent ? "default" : "pointer",
              padding: "12px 14px",
              background: isCurrent
                ? "var(--vessel-accent-soft)"
                : "var(--vessel-surface)",
              border: `1px solid ${
                isCurrent ? "var(--vessel-accent)" : "var(--vessel-border)"
              }`,
              borderRadius: 2,
              boxShadow: isCurrent ? "var(--vessel-neon-glow)" : "none",
              transition:
                "background 120ms, border-color 120ms, box-shadow 120ms",
              opacity: pending && !isCurrent ? 0.5 : 1,
              color: "var(--ink)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isCurrent ? "var(--vessel-accent)" : "var(--ink-3)",
                }}
              >
                // {chip.tag === "inherit" ? "inherit" : chip.tag.toLowerCase()}
              </div>
              {isCurrent && (
                <div
                  data-testid="bill-offramp-picker-current-chip"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.20em",
                    textTransform: "uppercase",
                    color: "var(--ok)",
                    border: "1px solid var(--ok)",
                    padding: "2px 6px",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  [OK] Active
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.25,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              {chip.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 11.5,
                lineHeight: 1.45,
                color: "var(--ink-2)",
              }}
            >
              {chip.desc}
            </div>
          </button>
        );
      })}

      {error && (
        <div
          role="alert"
          style={{
            gridColumn: "1 / -1",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--vessel-over)",
            padding: "8px 0",
          }}
        >
          [WARN] {error}
        </div>
      )}

      {/* Resolved chain display — the "what happens if this fails?" answer */}
      <div
        data-testid="vault-bill-offramp-resolved-chain"
        data-chain={chain.join(" → ")}
        style={{
          gridColumn: "1 / -1",
          marginTop: 4,
          padding: "12px 14px",
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          // resolved chain
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          {chain.join(" → ")}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.45,
          }}
        >
          Currently routes via <strong style={{ color: "var(--vessel-accent)" }}>{chainHead}</strong>
          {" "}({source}).{" "}
          {optimistic === null
            ? "Following your user default."
            : "Per-bill override; this bill ignores the user default."}
        </div>
      </div>
    </div>
  );
}
