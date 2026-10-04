/**
 * Single source of truth for the "sandbox" / dev-route gates.
 *
 * Why this exists: the smoke runner starts `next start` (NODE_ENV=production),
 * so the dev-only routes (/api/dev*, /api/dev-agent/*, /api/vault/execute-bill)
 * were gated by `COMPASS_SANDBOX=1` alone. That left one stray env var between
 * a real deploy and unauthenticated routes. Now the flag is inert on any Vercel
 * deployment (Vercel always sets `VERCEL`), so it can only ever take effect on
 * a developer machine or in CI.
 */

/** True only when COMPASS_SANDBOX=1 AND we are not running on Vercel. */
export function isSandbox(): boolean {
  return process.env.COMPASS_SANDBOX === "1" && !process.env.VERCEL;
}

/** True when dev-only routes may respond (local dev server or local sandbox). */
export function devRoutesEnabled(): boolean {
  return process.env.NODE_ENV === "development" || isSandbox();
}
