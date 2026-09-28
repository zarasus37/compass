/**
 * debt-interest.ts — pure helpers for the "wasted in interest" framing
 * (Cluster 7.47).
 *
 * All values are in cents. All helpers are pure functions on the Debt
 * type — no React, no DB, no side effects. Safe to import from both
 * server and client components.
 *
 * The math is the standard amortizing-loan interest formula:
 *   monthly_interest = balance × APR% / 12 months
 *   yearly_interest  ≈ monthly × 12 (approximation; see spec)
 *
 * The yearly figure is an OVER-estimate when the balance is being
 * paid down (actual interest paid through the year is slightly less)
 * and an UNDER-estimate when interest is being capitalized (e.g. if
 * min payment doesn't cover interest). For the "how much am I
 * wasting on interest?" question, it's the right ballpark.
 */
import type { Debt } from "@/lib/store";
import { aprTier } from "@/lib/debt-tier";

/**
 * Monthly interest cost on the current balance (cents).
 * Rounded to the nearest cent for display consistency.
 */
export function monthlyInterestCents(debt: Debt): number {
  if (debt.balanceCents === 0) return 0;
  return Math.round((debt.balanceCents * debt.aprBps) / 120000);
}

/**
 * Annualized interest cost (cents). = monthlyInterestCents × 12.
 * See file header for the approximation caveat.
 */
export function yearlyInterestCents(debt: Debt): number {
  return monthlyInterestCents(debt) * 12;
}

/**
 * Total interest paid over the life of the debt if mom pays only the
 * minimum every month (cents). Returns -1 if the minimum doesn't cover
 * interest (debt is unpayable at min); returns 0 if paid off.
 *
 * Mirrors the existing math in `<DebtDetailExpand>` (Cluster 7.46) —
 * pulled out so the page-level aggregate and the per-debt cell agree
 * on the same computation.
 */
export function totalWastedAtMinCents(
  debt: Debt,
  anchor?: Date,
): number {
  if (debt.balanceCents === 0) return 0;
  if (debt.minPaymentCents <= 0) return -1;

  const monthly = monthlyInterestCents(debt);
  if (debt.minPaymentCents <= monthly) return -1; // unpayable at min

  const r = debt.aprBps / 120000;
  let months: number;
  if (r === 0) {
    months = Math.ceil(debt.balanceCents / debt.minPaymentCents);
  } else {
    const N =
      -Math.log(1 - monthly / debt.minPaymentCents) / Math.log(1 + r);
    months = Math.ceil(N);
  }
  return Math.round(monthly * Math.max(1, months));
}

/**
 * Aggregate yearly interest across all non-paid-off debts in the
 * list (cents). Returns 0 if every debt is paid off.
 */
export function aggregateYearlyInterestCents(debts: Debt[]): number {
  let total = 0;
  for (const d of debts) {
    if (d.balanceCents > 0) total += yearlyInterestCents(d);
  }
  return total;
}

/**
 * Count of debts that are still being paid off (balance > 0).
 * Used in the page-level headline ("across N debts").
 */
export function activeDebtCount(debts: Debt[]): number {
  let n = 0;
  for (const d of debts) {
    if (d.balanceCents > 0) n++;
  }
  return n;
}

/**
 * The "worst" APR tier across the debts — drives the headline
 * color in the page-level banner. Returns 'none' when no active
 * debts exist (the banner shows [OK] in that case).
 */
export function worstTierAcrossDebts(debts: Debt[]): ReturnType<typeof aprTier> {
  let worst: ReturnType<typeof aprTier> = "none";
  const rank: Record<ReturnType<typeof aprTier>, number> = {
    high: 4,
    medium: 3,
    low: 2,
    none: 1,
  };
  for (const d of debts) {
    if (d.balanceCents <= 0) continue;
    const t = aprTier(d.aprBps);
    if (rank[t] > rank[worst]) worst = t;
  }
  return worst;
}