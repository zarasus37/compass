"use client";

/**
 * DebtListInteractive — interactive debt list (Cluster 7.45 + 7.46).
 *
 * Wraps a server-rendered list of `<DebtCard>` components in a
 * client component that owns the expansion state. Clicking a card
 * expands a `<DebtDetailExpand>` panel inline below it. Clicking
 * the same card again (or a different one) collapses the previous
 * and (if applicable) expands the new one.
 *
 * Cluster 7.46 — accepts an `accountsByDebtId` map so each card
 * can show institution + last-4 + account type when the debt
 * links to a real account. Pure render — no new state.
 *
 * The terminal-flavored visual: each card is saturn-rimmed on the
 * left (debt family identity) and tier-colored on the right
 * (severity: red/amber/green by APR). The two-rail pattern lets
 * cards stand apart without losing the shared "debt" identity.
 */

import * as React from "react";
import { useState } from "react";
import type { Debt } from "@/lib/store";
import type { DebtCardAccount } from "./DebtCard";
import { DebtCard } from "./DebtCard";
import { DebtDetailExpand } from "./DebtDetailExpand";

export interface DebtListInteractiveProps {
  debts: Debt[];
  /**
   * Map of debtId → linked account (institution + last-4 + type).
   * The server (/debts/page.tsx) builds this from
   * `liveAccountsFromDb(user.id)`. Optional — when missing, cards
   * render without the institution line.
   */
  accountsByDebtId?: Map<string, DebtCardAccount>;
  anchor?: Date;
}

export function DebtListInteractive({
  debts,
  accountsByDebtId,
  anchor,
}: DebtListInteractiveProps) {
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
        const account = accountsByDebtId?.get(debt.id) ?? null;
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
              <DebtCard debt={debt} account={account} isExpanded={isExpanded} />
            </div>
            {isExpanded && (
              <div id={`debt-detail-${debt.id}`}>
                <DebtDetailExpand debt={debt} account={account} anchor={anchor} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}