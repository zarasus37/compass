/**
 * Compass Vault — yield adapters (Phase 3.0).
 *
 * Three stub adapters + a factory that picks the active one from
 * the `VAULT_YIELD_ADAPTER` env var. The adapters are stubs —
 * they read their APY from env vars (not from a real provider
 * API). Phase 4 swaps in real Sky/Aave API integrations behind
 * the same `IYieldAdapter` interface.
 *
 * Adapter selection:
 *   - `VAULT_YIELD_ADAPTER=mock`  (default) — `MockYieldAdapter`,
 *     deterministic 0.0352. The Phase 1/2 simulation; the only
 *     adapter that has zero external dependencies.
 *   - `VAULT_YIELD_ADAPTER=sky`   — `SkyAdapter`. Reads
 *     `VAULT_SKY_APY` (decimal, default 0.0352). The Sky Savings
 *     Rate example from the spec.
 *   - `VAULT_YIELD_ADAPTER=aave`  — `AaveAdapter`. Reads
 *     `VAULT_AAVE_APY` (decimal, default 0.0425). The Aave USDC
 *     supply rate example.
 *
 * Why stubs in 3.0: the spec says "Mock or testnet yield-strategy
 * adapter" in Phase 3 and "Replace hardcoded mocked APY with
 * provider-fed 'variable estimated APY'" in Phase 4. The env-var
 * approach lets us switch adapters without code changes AND
 * gives the test suite a way to inject a known APY.
 *
 * All adapters return a Promise so the interface matches the
 * future real-provider shape (a fetch is async). The stubs are
 * trivially resolvable but the async signature is the contract.
 */

import "server-only";
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
 * Aave USDC supply rate stub. In production this would fetch
 * the current Aave USDC liquidity rate from Aave's subgraph or
 * the Aave protocol contracts. Phase 3.0 reads from
 * `VAULT_AAVE_APY`.
 */
export class AaveAdapter implements IYieldAdapter {
  readonly name = "Aave";
  readonly source: YieldSource = "AAVE";
  private readonly apy: number;
  constructor(apy?: number) {
    this.apy = parseApyEnv(
      process.env.VAULT_AAVE_APY,
      apy ?? DEFAULT_AAVE_APY,
    );
  }
  async getCurrentApy(): Promise<number> {
    return this.apy;
  }
  describe(): string {
    return `Aave USDC supply — ${(this.apy * 100).toFixed(2)}% (env-configured, on-chain in production)`;
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
