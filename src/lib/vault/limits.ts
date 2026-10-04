/**
 * Vault spend caps (pure module — no server-only imports, so it is unit-testable).
 *
 * BUGFIX: the previous inline defaults were written `1_000_000_00`, which is
 * 100,000,000 cents = $1,000,000 — 100x the documented $10,000 default. The
 * default below is $10,000 = 1,000,000 cents.
 */
export const DEFAULT_FUND_MAX_CENTS = 10_000_00; // $10,000
export const DEFAULT_DEPOSIT_MAX_CENTS = 10_000_00; // $10,000

function readCents(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

/** Cap for [FUND] (server signer -> Safe). Override with VAULT_FUND_MAX_CENTS. */
export function getFundMaxCents(): number {
  return readCents(process.env.VAULT_FUND_MAX_CENTS, DEFAULT_FUND_MAX_CENTS);
}

/** Cap for [DEPOSIT] (Safe -> Aave). Override with VAULT_DEPOSIT_MAX_CENTS. */
export function getDepositMaxCents(): number {
  return readCents(process.env.VAULT_DEPOSIT_MAX_CENTS, DEFAULT_DEPOSIT_MAX_CENTS);
}
