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
import { formatMoney } from "@/lib/money";
import type { Debt } from "@/lib/store";
import type { DebtCardAccount } from "./DebtCard";
import { DebtCard } from "./DebtCard";
import { DebtDetailExpand } from "./DebtDetailExpand";
import {
  aggregateYearlyInterestCents,
  activeDebtCount,
  worstTierAcrossDebts,
} from "@/lib/debt-interest";
import { aprTierColor } from "@/lib/debt-tier";
import { useMediaQuery } from "@/lib/use-media-query";
import { CrossDebtExtraPanel } from "./CrossDebtExtraPanel";

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
  // Cluster 7.50 — viewport-aware layout. The hook is SSR-safe
  // (returns false until mount); the first client render flips
  // the value if the viewport is actually narrow.
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Page-level waste aggregate (Cluster 7.47). Computed once per
  // render — these are O(n) over the debt list and run alongside the
  // existing render loop, so the cost is negligible (<1ms for any
  // realistic debt count).
  const yearlyWasteCents = aggregateYearlyInterestCents(debts);
  const activeCount = activeDebtCount(debts);
  const worstTier = worstTierAcrossDebts(debts);

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
      {/* Cross-debt "where to put extra" panel — Cluster 7.51.
          Method toggle (SNOWBALL vs AVALANCHE) + extra slider +
          outcome (savings + debt-free total + payoff order).
          Sits ABOVE the 7.47 wasted-interest banner. Renders
          nothing when there are fewer than 2 active debts
          (single-debt math is trivial; cross-debt view only
          makes sense with 2+). */}
      <CrossDebtExtraPanel debts={debts} anchor={anchor} />

      {/* Page-level "wasted in interest" banner — Cluster 7.47.
          Terminal-style headline that frames the entire page with
          the aggregate yearly waste. Tier-color matches the worst
          single debt so the severity is global, not a per-card value. */}
      {activeCount === 0 ? (
        <div
          data-testid="debt-list-banner-clear"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--ok)",
            borderRadius: 4,
            padding: "14px 20px",
            marginBottom: 12,
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ok)",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
            }}
          >
            [OK]
          </span>
          <span>
            No interest being paid — all debts are clear.
          </span>
        </div>
      ) : (
        <div
          data-testid="debt-list-banner"
          style={{
            background: "var(--cosmos)",
            border: "1px solid var(--warn)",
            borderRadius: 4,
            padding: "14px 20px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--warn)",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
            }}
          >
            [WARN]
          </span>
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13.5,
              color: "var(--ink)",
            }}
          >
            You're wasting{" "}
            <b
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 14,
                color: aprTierColor(worstTier),
                letterSpacing: "0.02em",
              }}
            >
              ~{formatMoney(yearlyWasteCents)}/year
            </b>{" "}
            in interest across{" "}
            <b style={{ color: "var(--ink-2)" }}>{activeCount}</b>{" "}
            {activeCount === 1 ? "debt" : "debts"}.
          </span>
        </div>
      )}
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
              <DebtCard
                debt={debt}
                account={account}
                isExpanded={isExpanded}
                isMobile={isMobile}
              />
            </div>
            {isExpanded && (
              <div id={`debt-detail-${debt.id}`}>
                <DebtDetailExpand
                  debt={debt}
                  account={account}
                  anchor={anchor}
                  isMobile={isMobile}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}