/**
 * sink-math.ts — pure functions for sinking-fund math (Cluster 7.28).
 *
 * No Prisma imports, no server-only flag. Safe to import from
 * client components (the per-row SinkList needs to compute the
 * monthly fill rate to render "X/mo to fund by November").
 *
 * Why separate file: the seed-sinks.ts module is server-only
 * (imports prisma), and the build can't bundle pg → dns/net/fs
 * into the browser. Keeping the math here means client components
 * can compute the same formula without dragging in the Prisma
 * client.
 */

/**
 * Convert target + cadence to a per-month fill rate (cents).
 *   weekly     (0.25mo) → targetCents * 4  (48/12, rounded)
 *   monthly    (1mo)    → targetCents
 *   quarterly  (3mo)    → round(targetCents / 3)
 *   annual     (12mo)   → round(targetCents / 12)
 *
 * Unknown cadences default to "monthly" for safety.
 */
export function monthlyFillCents(
  targetCents: number,
  cadence: string,
): number {
  switch (cadence) {
    case "weekly":
      // 52 weeks/year / 12 months = 4.33 → multiply by 48 / 12
      return Math.round(targetCents * 48 / 12);
    case "monthly":
      return targetCents;
    case "quarterly":
      return Math.round(targetCents / 3);
    case "annual":
      return Math.round(targetCents / 12);
    default:
      return targetCents;
  }
}

/**
 * Human-friendly cadence label for UI.
 */
export function cadenceLabel(cadence: string): string {
  switch (cadence) {
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "annual":
      return "annual";
    default:
      return cadence;
  }
}
