/**
 * Cadence → monthly multiplier. Used by the identity summary
 * (to compute total monthly income) and by the projection (to
 * normalize income onto a monthly basis for the Account record).
 *
 * "irregular" is treated as 0 — no predictable monthly amount
 * means it doesn't inflate the displayed total. The user can
 * refine in a future turn.
 */
export function cadenceMonthlyFactor(cadence: string | null): number {
  switch (cadence) {
    case "weekly":
      return 52 / 12;
    case "biweekly":
      return 26 / 12;
    case "semi_monthly":
      return 24 / 12;
    case "monthly":
      return 1;
    case "irregular":
      return 0;
    default:
      return 0;
  }
}
