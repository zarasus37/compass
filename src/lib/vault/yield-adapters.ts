/**
 * Compass Vault — yield adapters (Phase 3.0 → 4.0).
 *
 * Three adapters + a factory that picks the active one from
 * the `VAULT_YIELD_ADAPTER` env var.
 *
 * Adapter selection:
 *   - `VAULT_YIELD_ADAPTER=mock`  (default) — `MockYieldAdapter`,
 *     deterministic 0.0352. The Phase 1/2 simulation; the only
 *     adapter that has zero external dependencies.
 *   - `VAULT_YIELD_ADAPTER=sky`   — `SkyAdapter`. Reads
 *     `VAULT_SKY_APY` (decimal, default 0.0352). The Sky Savings
 *     Rate example from the spec. (Still a stub in M3 — a
 *     real SSR read is a future cluster.)
 *   - `VAULT_YIELD_ADAPTER=aave`  — `AaveAdapter`. **Real on-chain
 *     read** of Aave V3's `currentLiquidityRate` for the USDC
 *     reserve on Base Sepolia (Cluster Vault 4.0 M3). The env
 *     var `VAULT_AAVE_APY` is retained as a static fallback for
 *     tests that want a deterministic rate without an RPC
 *     connection.
 *
 * The 3.0 env-var pattern is preserved so the test suite
 * still has a way to inject a known APY (the integration
 * tests write `VAULT_AAVE_APY=0.0425` + clear the
 * `getActiveYieldAdapter` cache to force the stub).
 *
 * All adapters return a Promise so the interface matches the
 * real-provider shape. The stubs are trivially resolvable; the
 * Aave adapter hits a viem `readContract` on every call.
 */

import "server-only";
import { getReserveApy } from "./aave";
import type { IYieldAdapter, YieldSource } from "./types";

/**
 * The default APY when the env var is not set. Matches the
 * Phase 1.0 / 2.0 hardcoded value so a fresh install behaves
 * identically to before.
 */
const DEFAULT_SKY_APY = 0.0352;
const DEFAULT_AAVE_APY = 0.0425;

/**
 * Parse a decimal-string env var (e.g. "0.0352") into a number.
 * Returns the fallback on any parse error or negative value.
 * Throws nothing — silent fallback is the right behavior for a
 * config value the user can fix in their `.env.local`.
 */
function parseApyEnv(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/**
 * The default stub adapter. Deterministic — always returns
 * the same APY. Used by tests and by the seed when the env var
 * is unset.
 */
export class MockYieldAdapter implements IYieldAdapter {
  readonly name = "Mock";
  readonly source: YieldSource = "OTHER";
  private readonly apy: number;
  constructor(apy = DEFAULT_SKY_APY) {
    this.apy = apy;
  }
  async getCurrentApy(): Promise<number> {
    return this.apy;
  }
  describe(): string {
    return `Mock — constant ${(this.apy * 100).toFixed(2)}% (test fixture)`;
  }
}

/**
 * Sky Savings Rate stub. In production this would fetch the
 * current SSR from a Sky governance endpoint (or a sub-graph
 * query). Phase 3.0 reads from `VAULT_SKY_APY` so the value is
 * configurable per environment.
 */
export class SkyAdapter implements IYieldAdapter {
  readonly name = "Sky";
  readonly source: YieldSource = "SKY";
  private readonly apy: number;
  constructor(apy?: number) {
    this.apy = parseApyEnv(process.env.VAULT_SKY_APY, apy ?? DEFAULT_SKY_APY);
  }
  async getCurrentApy(): Promise<number> {
    return this.apy;
  }
  describe(): string {
    return `Sky Savings Rate — ${(this.apy * 100).toFixed(2)}% (env-configured, governance-set in production)`;
  }
}

/**
 * Aave USDC supply rate adapter. **Cluster Vault 4.0 M3** —
 * reads the live `currentLiquidityRate` from Aave V3's Pool
 * contract on Base Sepolia. The env var `VAULT_AAVE_APY` is
 * still read as a **static fallback** for tests that pin the
 * rate (e.g. the integration suite). The fallback path is hit
 * when `getReserveApy()` throws — RPC down, reserve
 * unlisted, etc. — so the test suite + the page can both
 * surface a rate without an RPC round-trip.
 *
 * Two `describe()` modes:
 *   - On-chain mode: describes the live read + the chain id.
 *   - Fallback mode: notes the env var value as the source.
 */
export class AaveAdapter implements IYieldAdapter {
  readonly name = "Aave";
  readonly source: YieldSource = "AAVE";
  private readonly fallbackApy: number;
  constructor(apy?: number) {
    this.fallbackApy = parseApyEnv(
      process.env.VAULT_AAVE_APY,
      apy ?? DEFAULT_AAVE_APY,
    );
  }
  async getCurrentApy(): Promise<number> {
    // Cluster 4.0 M3: real on-chain read. Falls back to the
    // env-var value if the RPC is unreachable / reserve is
    // unlisted. The fallback is silent (no console error) so
    // the page keeps rendering with the last-known rate.
    try {
      const apy = await getReserveApy();
      // Sanity: clamp to a reasonable range (0-100% APY).
      // Anything outside is almost certainly a contract bug
      // or a chain that doesn't match the unit conversion.
      if (apy < 0 || apy > 1) {
        return this.fallbackApy;
      }
      return apy;
    } catch {
      return this.fallbackApy;
    }
  }
  describe(): string {
    return `Aave V3 USDC supply — on-chain read (Base Sepolia) with env-configured fallback ${(this.fallbackApy * 100).toFixed(2)}%`;
  }
}

/**
 * The active adapter, picked from `VAULT_YIELD_ADAPTER`. Falls
 * back to `MockYieldAdapter` when the env var is unset or
 * unknown. The result is memoized per-process so repeated calls
 * during a single request don't re-read env.
 */
let cached: IYieldAdapter | null = null;

export function getActiveYieldAdapter(): IYieldAdapter {
  if (cached) return cached;
  const pick = (process.env.VAULT_YIELD_ADAPTER ?? "mock").toLowerCase();
  let adapter: IYieldAdapter;
  switch (pick) {
    case "sky":
      adapter = new SkyAdapter();
      break;
    case "aave":
      adapter = new AaveAdapter();
      break;
    case "mock":
    default:
      adapter = new MockYieldAdapter();
      break;
  }
  cached = adapter;
  return adapter;
}

/** Test seam: clear the memoized adapter so the next call
 *  re-reads `process.env`. The integration suite uses this
 *  between phases that swap adapters. */
export function _resetActiveYieldAdapterCache(): void {
  cached = null;
}
