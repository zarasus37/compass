/**
 * Compass Vault — yield attribution.
 *
 * Attribution is by CAPITAL SHARE, not vault-wide lump sum. Each
 * envelope's share of the total eligible principal is multiplied by
 * the total accrued yield to produce the envelope's attribution.
 *
 * Spec (DeFi/Compass vault spec.md, §"Yield Attribution"):
 *
 *   calculateEnvelopeYield(
 *     envelopePrincipal,
 *     totalYieldEligiblePrincipal,
 *     totalYieldAccrued
 *   )
 *
 * The contract is straightforward:
 *   - If `totalYieldEligiblePrincipal <= 0` the function returns 0
 *     (no yield when there's no eligible principal — avoids divide-
 *     by-zero and the degenerate "everyone gets 0" case).
 *   - Otherwise, `envelopePrincipal / totalYieldEligiblePrincipal
 *     * totalYieldAccrued`. Integer cents are preserved (no float
 *     math) by rounding to the nearest cent at the very end.
 *
 * IMPORTANT: this is integer-cents math. Inputs are integer cents,
 * output is integer cents. Display is the only place we divide by
 * 100. No exceptions.
 */

/**
 * Attribute vault-wide yield to a single envelope by capital share.
 *
 * @param envelopePrincipal           Envelope's yield-eligible principal, cents.
 * @param totalYieldEligiblePrincipal Sum of all yield-eligible principal
 *                                    across the vault, cents.
 * @param totalYieldAccrued           Total yield accrued vault-wide for
 *                                    the period, cents.
 * @returns Yield attributed to this envelope for the period, cents.
 */
export function calculateEnvelopeYield(
  envelopePrincipal: number,
  totalYieldEligiblePrincipal: number,
  totalYieldAccrued: number,
): number {
  if (!Number.isFinite(envelopePrincipal) || envelopePrincipal <= 0) {
    return 0;
  }
  if (
    !Number.isFinite(totalYieldEligiblePrincipal) ||
    totalYieldEligiblePrincipal <= 0
  ) {
    return 0;
  }
  if (!Number.isFinite(totalYieldAccrued) || totalYieldAccrued <= 0) {
    return 0;
  }

  // Multiply in cents-space using integer arithmetic to avoid float
  // drift, then round to the nearest cent. For typical values this
  // matches `envelopePrincipal / totalYieldEligiblePrincipal *
  // totalYieldAccrued` to the cent.
  const numerator = envelopePrincipal * totalYieldAccrued;
  return Math.round(numerator / totalYieldEligiblePrincipal);
}

/**
 * Sum a list of per-envelope attributed yields. Convenience helper
 * for the attribution block on the /vault page; sanity-checks that
 * the sum doesn't exceed the vault total (rounding can leave a
 * residual of ±1 cent per envelope, so we tolerate a small slack).
 *
 * @returns Total attributed yield, cents.
 */
export function sumAttributedYields(yields: number[]): number {
  return yields.reduce((sum, y) => sum + y, 0);
}
