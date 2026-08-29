/**
 * GET /api/vault/chain-config — return the resolved chain config.
 *
 * Cluster 6.0.1 — mainnet.
 *
 * Read-only introspection endpoint. Returns the ChainConfig the
 * server would use right now (Base Sepolia or Base mainnet,
 * per `VAULT_CHAIN_ID`) with the canonical Aave + Safe addresses
 * for that chain.
 *
 * Intentionally PUBLIC — the response contains NO secrets
 * (no RPC URL with API key, no signer private key, no DB info).
 * Just the resolved addresses the current env would target.
 *
 * Two consumers:
 *   1. The smoke suite (`tests/smoke-deploy.mjs`) — verifies
 *      chainId + address wiring without needing to spin up a
 *      dev server + import a `.ts` file from a `.mjs` file.
 *   2. The /vault page's Safe-deployed chip — links the deployed
 *      Safe to the right block explorer (handled server-side
 *      via `getChainConfig().explorerUrl`, not this endpoint).
 *
 * Throws (via Next.js's default 500) if `VAULT_CHAIN_ID` is
 * missing or unsupported — same surface as `getChainConfig()`.
 */
import { NextResponse } from "next/server";
import { getChainConfig } from "@/lib/vault/safe-deploy";
import { getAaveChainConfig } from "@/lib/vault/aave";
import { baseSepolia, base } from "viem/chains";

export const dynamic = "force-dynamic";

export async function GET() {
  // getChainConfig() throws on missing / unsupported chainId.
  // Let that surface as a 500 (Next's default) — the smoke wants
  // to see the message verbatim when verifying the throw.
  const cfg = getChainConfig();
  const aave = getAaveChainConfig();
  return NextResponse.json({
    // The chain id the server is currently configured for
    // (parsed from VAULT_CHAIN_ID, default 84532).
    chainId: cfg.chainId,
    // Friendly name of the chain (so the smoke + ops dashboards
    // can show "Base mainnet" without needing the chain table).
    chainName:
      cfg.chainId === base.id
        ? "Base mainnet"
        : cfg.chainId === baseSepolia.id
          ? "Base Sepolia (testnet)"
          : `chainId ${cfg.chainId}`,
    // The RPC URL the server would dial (no API key expected in
    // env at this layer; the canonical default is the public RPC
    // unless VAULT_CHAIN_RPC_URL overrides).
    rpcUrl: cfg.rpcUrl,
    // Whether the active chain is a testnet (used by the smoke
    // + the chain-table sanity check).
    isTestnet: cfg.chainId === baseSepolia.id,
    // The block explorer base URL (no API key needed for read-only).
    explorerUrl: cfg.explorerUrl,
    // Canonical addresses for the active chain. These are the
    // values the deploy / supply / withdraw flows will target.
    addresses: {
      safeSingleton: cfg.safeSingletonAddress,
      usdc: cfg.usdcAddress,
      aavePool: aave.poolAddress,
      aaveUsdcAsset: aave.usdcAddress,
      // aUSDC is resolved dynamically via Pool.getReserveData, not
      // stored here. The smoke calls getAUsdcTokenAddress()
      // separately to verify the live read.
    },
  });
}
