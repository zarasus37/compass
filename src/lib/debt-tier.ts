/**
 * Debt APR tier helpers — Cluster 7.46.
 *
 * Buckets an APR into one of three semantic tiers and maps each tier
 * to a CSS variable + a display label. Used across the debt card
 * and the expanded detail panel so the same severity color
 * appears wherever a debt is shown. Pure: no DB, no React, no
 * async; safe to import from both server and client components.
 *
 * Tiers:
 *   high   → APR ≥ 20%   → var(--neg)        → "HIGH APR"   (urgent)
 *   medium → APR 10-20%  → var(--warn)      → "MEDIUM APR" (watch)
 *   low    → APR < 10%   → var(--ok)        → "LOW APR"    (comfortable)
 *   none   → APR == 0    → var(--ink-3)     → "NO APR"     (paid off or 0% loan)
 *
 * The 20% threshold is the canonical "high APR" boundary in US
 * consumer-finance guidance (anything over the prime rate + 12%
 * is "usury-adjacent" territory — Credit Karma / NerdWallet
 * territory). 10% is the "comfortable" boundary (most
 * mortgage rates sit there or lower).
 */

export type AprTier = "high" | "medium" | "low" | "none";

export function aprTier(aprBps: number): AprTier {
  const pct = aprBps / 100;
  if (pct >= 20) return "high";
  if (pct >= 10) return "medium";
  if (pct > 0) return "low";
  return "none";
}

/**
 * Map an AprTier to a CSS variable name from the design system.
 * Use as `style={{ color: aprTierColor(tier) }}` or
 * `style={{ background: aprTierColor(tier) }}`.
 */
export function aprTierColor(tier: AprTier): string {
  switch (tier) {
    case "high":
      return "var(--neg)";
    case "medium":
      return "var(--warn)";
    case "low":
      return "var(--ok)";
    case "none":
      return "var(--ink-3)";
  }
}

/**
 * Short uppercase tier label for badges.
 */
export function aprTierLabel(tier: AprTier): string {
  switch (tier) {
    case "high":
      return "HIGH APR";
    case "medium":
      return "MEDIUM APR";
    case "low":
      return "LOW APR";
    case "none":
      return "NO APR";
  }
}
