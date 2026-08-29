"use client";

/**
 * Compass Vault — off-ramp provider picker (Cluster 7.3).
 *
 * Three single-select chips (MOCK / Spritz / Monto) that pick the
 * user's first-choice off-ramp provider. The gateway builds its
 * adapter chain with the chosen provider first, falls through to
 * the other real adapters, and ends at the Manual Push safety
 * path.
 *
 * Pattern mirrors `YieldRoutingPicker` exactly: optimistic UI,
 * terminal-voice chips, vessel-accent active border, [OK] CURRENT
 * chip on the active one, server action round-trip,
 * `router.refresh()` on success.
 *
 * The note under the picker warns the user that picking Spritz /
 * Monto without env-var credentials auto-falls-back to MOCK at
 * runtime — so the picker is honest about what the click does.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOffRampProviderActionClient } from "@/lib/vault/actions";
import {
  OFFRAMP_PROVIDER_LABEL,
  OFFRAMP_PROVIDER_DESC,
  type OffRampProvider,
} from "@/lib/vault/types";

const ALL_PROVIDERS: OffRampProvider[] = ["MOCK", "SPRITZ", "MONTO"];

export function OffRampProviderPicker({
  current,
}: {
  current: OffRampProvider;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<OffRampProvider>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(provider: OffRampProvider) {
    if (provider === optimistic || pending) return;
    const prev = optimistic;
    setOptimistic(provider);
    setError(null);
    startTransition(async () => {
      const res = await setOffRampProviderActionClient(provider);
      if (!res.ok) {
        setOptimistic(prev);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="vault-offramp-picker"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {ALL_PROVIDERS.map((provider) => {
        const isCurrent = provider === optimistic;
        const label = OFFRAMP_PROVIDER_LABEL[provider];
        const desc = OFFRAMP_PROVIDER_DESC[provider];
        return (
          <button
            key={provider}
            type="button"
            onClick={() => pick(provider)}
            disabled={pending}
            aria-pressed={isCurrent}
            data-testid={`offramp-picker-${provider}`}
            data-current={isCurrent ? "true" : "false"}
            style={{
              fontFamily: "var(--font-sora)",
              textAlign: "left",
              cursor: pending ? "wait" : isCurrent ? "default" : "pointer",
              padding: "14px 16px",
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
                marginBottom: 6,
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
                // {provider.toLowerCase()}
              </div>
              {isCurrent && (
                <div
                  data-testid="offramp-picker-current-chip"
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
                  [OK] Current
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.25,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--ink-2)",
              }}
            >
              {desc}
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
    </div>
  );
}
