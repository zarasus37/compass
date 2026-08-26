"use client";

/**
 * Compass Vault — yield-routing picker (Phase 2.5).
 *
 * A 2x2 grid of strategy cards (4 strategies total). The current
 * selection is highlighted with the [OK] CURRENT chip and the
 * vessel-accent border. Clicking a different card calls
 * `setYieldRoutingStrategyAction` and `router.refresh()` so the
 * page re-fetches the snapshot.
 *
 * The picker is the canonical surface for the user's yield-
 * routing choice. Strategies:
 *   - COMPOUND            (default)
 *   - APPLY_TO_NEXT_BILL
 *   - MOVE_TO_AVAILABLE
 *   - SPLIT_BY_ENVELOPE
 *
 * Terminal-voice styled: Sora body, JetBrains Mono labels, [OK]
 * CURRENT chip, vessel-accent active border. Optimistic UI:
 * the click immediately reflects the new selection while the
 * server action runs, then `router.refresh()` re-syncs.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setYieldRoutingStrategyAction,
} from "@/lib/vault/actions";
import {
  YIELD_ROUTING_LABEL,
  YIELD_ROUTING_DESC,
  type YieldRoutingStrategy,
} from "@/lib/vault/types";

const ALL_STRATEGIES: YieldRoutingStrategy[] = [
  "COMPOUND",
  "APPLY_TO_NEXT_BILL",
  "MOVE_TO_AVAILABLE",
  "SPLIT_BY_ENVELOPE",
];

export function YieldRoutingPicker({
  current,
}: {
  current: YieldRoutingStrategy;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<YieldRoutingStrategy>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(strategy: YieldRoutingStrategy) {
    if (strategy === optimistic || pending) return;
    const prev = optimistic;
    setOptimistic(strategy);
    setError(null);
    startTransition(async () => {
      const res = await setYieldRoutingStrategyAction(strategy);
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
      data-testid="vault-yield-picker"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {ALL_STRATEGIES.map((strategy) => {
        const isCurrent = strategy === optimistic;
        const label = YIELD_ROUTING_LABEL[strategy];
        const desc = YIELD_ROUTING_DESC[strategy];
        return (
          <button
            key={strategy}
            type="button"
            onClick={() => pick(strategy)}
            disabled={pending}
            aria-pressed={isCurrent}
            data-testid={`yield-picker-${strategy}`}
            data-current={isCurrent ? "true" : "false"}
            style={{
              fontFamily: "var(--font-sora)",
              textAlign: "left",
              cursor: pending ? "wait" : isCurrent ? "default" : "pointer",
              padding: "14px 16px",
              background: isCurrent ? "var(--vessel-accent-soft)" : "var(--vessel-surface)",
              border: `1px solid ${
                isCurrent ? "var(--vessel-accent)" : "var(--vessel-border)"
              }`,
              borderRadius: 2,
              boxShadow: isCurrent ? "var(--vessel-neon-glow)" : "none",
              transition: "background 120ms, border-color 120ms, box-shadow 120ms",
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
                // {strategy.toLowerCase().replace(/_/g, " · ")}
              </div>
              {isCurrent && (
                <div
                  data-testid="yield-picker-current-chip"
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
