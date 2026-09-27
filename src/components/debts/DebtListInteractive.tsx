"use client";

/**
 * DebtListInteractive — interactive debt list (Cluster 7.45).
 *
 * Wraps a server-rendered list of `<DebtCard>` components in a
 * client component that owns the expansion state. Clicking a card
 * expands a `<DebtDetailExpand>` panel inline below it. Clicking
 * the same card again (or a different one) collapses the previous
 * and (if applicable) expands the new one.
 *
 * The terminal-flavored visual: each card is saturn-rimmed with a
 * donut chart for paid-down progress + balance + APR + min. The
 * expanded panel surfaces the per-debt snowball math (stats grid +
 * payoff sparkline + What if? slider + apply button).
 *
 * The cluster 7.45 design choice: NO top-level snowball/avalanche
 * method toggle. Cross-debt ordering is a separate concern; the
 * per-debt view is about THIS debt's payoff math.
 */

import * as React from "react";
import { useState } from "react";
import type { Debt } from "@/lib/store";
import { DebtCard } from "./DebtCard";
import { DebtDetailExpand } from "./DebtDetailExpand";

export interface DebtListInteractiveProps {
  debts: Debt[];
  anchor?: Date;
}

export function DebtListInteractive({ debts, anchor }: DebtListInteractiveProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (debts.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "32px 24px",
          textAlign: "center",
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-3)",
        }}
      >
        No debts tracked. Add one to see the payoff math.
      </div>
    );
  }

  return (
    <div
      data-testid="debt-list-interactive"
      style={{ display: "flex", flexDirection: "column", gap: 4 }}
    >
      {debts.map((debt) => {
        const isExpanded = expandedId === debt.id;
        return (
          <div key={debt.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setExpandedId((prev) => (prev === debt.id ? null : debt.id))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpandedId((prev) =>
                    prev === debt.id ? null : debt.id,
                  );
                }
              }}
              aria-expanded={isExpanded}
              aria-controls={`debt-detail-${debt.id}`}
              style={{ outline: "none" }}
            >
              <DebtCard debt={debt} isExpanded={isExpanded} />
            </div>
            {isExpanded && (
              <div id={`debt-detail-${debt.id}`}>
                <DebtDetailExpand debt={debt} anchor={anchor} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}