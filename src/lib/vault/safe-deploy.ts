/**
 * Compass Vault — Safe deploy (Cluster Vault 4.0, M1; Cluster 6.0.1 — mainnet).
 *
 * Wraps viem + @safe-global/protocol-kit v8 behind a small,
 * server-only surface. The page calls this via `deploySafeAction`;
 * the [DEPLOY] button is the only user-facing entry point.
 *
 * Chain: resolves from a small `CHAIN_TABLE` indexed by chainId.
 * Base Sepolia (84532) is the testnet default; Base mainnet (8453)
 * is the production target (Cluster 6.0.1). The RPC URL, Safe
 * singleton address, and Circle USDC address are env-overridable
 * per chain — the table holds the canonical defaults, env wins.
 *
 * Adding a new chain: drop an entry in `CHAIN_TABLE` (chain +
 * Safe singleton + Circle USDC + explorer URL + RPC default).
 * Nothing else in the lib needs to know which chain is active.
 *
 * Protocol Kit v8 API surface (different from v6):
 *   - `SafeProvider` is a constructor (not a static .init).
 *   - `predictSafeAddress({ safeProvider, chainId,
 *     safeAccountConfig, safeDeploymentConfig? })` is a
 *     standalone function that returns the CREATE2 address.
 *   - `Safe.init({ provider, signer, predictedSafe: {
 *     safeAccountConfig, safeDeploymentConfig } })` returns
 *     a `Safe` instance for a not-yet-deployed config.
 *   - `safe.createSafeDeploymentTransaction()` returns
 *     `{ to, value, data }` for the SafeProxyFactory's
 *     `createProxyWithNonce(...)` call. We broadcast this via
 *     viem's `walletClient.sendTransaction` to get a clean
 *     tx hash + receipt.
 *
 * What this lib does NOT do (deferred to M2/M3):
 *   - Fund the Safe (USDC transfer from signer to Safe) — M2
 *   - Deposit the USDC into Aave V3 — M3
 *   - Read the on-chain USDC balance — M2
 *   - Refresh the on-chain APY — M3
 *
 * What it DOES do:
 *   1. Resolve the env-driven chain config + signer.
 *   2. Compute the predicted Safe address (CREATE2) before
 *      broadcasting.
 *   3. Build the deploy tx via the Protocol Kit.
 *   4. Broadcast via viem + wait for the receipt.
 *   5. Sanity-check the predicted address now has bytecode.
 *   6. Return the deployed address + chainId + signer + tx
 *      hash.
 *
 * Security notes (M1 scope is pragmatic, not production):
 *   - The signer is a server-side EOA held in
 *     `VAULT_SAFE_SIGNER_PRIVATE_KEY`. Single owner, threshold 1.
 *     Fine for the closed beta on testnet; not for mainnet.
 *   - The deploy is irreversible (CREATE2 makes the address
 *     deterministic from owners + threshold + saltNonce).
 *     Re-deploys are rejected server-side.
 *   - The private key is only used to derive a viem account
 *     and to pass to the Protocol Kit. It is never logged.
 */

import "server-only";
import Safe, {
  SafeProvider,
  predictSafeAddress,
  type SafeAccountConfig,
  type SafeDeploymentConfig,
} from "@safe-global/protocol-kit";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  isAddress,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type Account } from "viem/accounts";
import { base, baseSepolia, type Chain } from "viem/chains";
import { prisma } from "@/server/db";

/** The literal placeholder address used by the Phase 1/2
 *  seed (`getOrCreateVault`). The [DEPLOY] button is shown
 *  when this is the current `smartAccountAddress`. */
export const MOCK_SAFE_ADDRESS =
  "0xMOCK0000000000000000000000000000000000DEAD";

/** Per-chain canonical config (Cluster 6.0.1 — mainnet).
 *
 *  Each entry is the *defaults* — env vars override at lookup
 *  time. The table is the source of truth for "which chains
 *  are wired" and the order/format is mirrored in
 *  `getAaveChainConfig()` in `aave.ts` so the two stay in sync.
 *
 *  Addresses are cross-referenced against:
 *    - Safe v1.3.0 singleton: safe-deployments (safe-global/
 *      safe-deployments) per-chain file + basescan
 *    - USDC: Circle's official per-chain USDC contract address
 *      (USDC.e is a different token; we deliberately use native
 *      USDC for Aave's main market)
 *
 *  `explorerUrl` is the per-chain block explorer (no API key
 *  needed for the read-only Safe-deployed chip on /vault). */
const CHAIN_TABLE: Record<
  number,
  {
    chain: Chain;
    rpcUrlDefault: string;
    safeSingletonAddress: Address;
    usdcAddress: Address;
    explorerUrl: string;
  }
> = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    rpcUrlDefault: "https://sepolia.base.org",
    // Safe singleton v1.3.0 (canonical for Base Sepolia).
    safeSingletonAddress: "0xfb1bffC9d739B8D520DaF37dF6669fE5932EF9Aa",
    // Circle testnet USDC (faucet, 6 decimals).
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl: "https://sepolia.basescan.org",
  },
  [base.id]: {
    chain: base,
    rpcUrlDefault: "https://mainnet.base.org",
    // Safe singleton v1.3.0 (canonical for Base mainnet, from
    // safe-deployments/src/assets/v1.3.0/safe_singleton_addresses.json).
    safeSingletonAddress: "0x69f4D1788e39c87893C980c06EdF4b7f686e2938",
    // Circle USDC on Base mainnet (NOT USDC.e — Aave V3's USDC
    // market on Base uses this asset, not the bridged variant).
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerUrl: "https://basescan.org",
  },
};

/** Resolve the chain id from env, defaulting to testnet. */
function resolveChainId(): number {
  const raw = process.env.VAULT_CHAIN_ID || "84532";
  const chainId = parseInt(raw, 10);
  if (!Number.isFinite(chainId)) {
    throw new Error(`VAULT_CHAIN_ID is not a number: ${raw}`);
  }
  return chainId;
}

/** The Safe version we deploy against. v1.3.0 is the
 *  canonical default for Base Sepolia (matches the env
 *  default for `VAULT_SAFE_SINGLETON_ADDRESS`). */
const SAFE_VERSION = "1.3.0" as const;

/** Shape of the deploy-tx object returned by the Protocol
 *  Kit's `safe.createSafeDeploymentTransaction()`. Matches
 *  the `@safe-global/types-kit` `MetaTransactionData`
 *  interface; we keep the local definition so we don't
 *  need a direct dep on `types-kit` (pnpm hoists the
 *  Protocol Kit but not its type-only peer). */
type DeployTx = {
  to: string;
  value: string;
  data: string;
};

export type ChainConfig = {
  chain: Chain;
  rpcUrl: string;
  chainId: number;
  safeSingletonAddress: Address;
  usdcAddress: Address;
  /** Block explorer base URL (no API key). Used by the
   *  Safe-deployed chip on /vault to link to the Safe's address
   *  page. */
  explorerUrl: string;
};

/** Read the chain config from env. Throws on:
 *  - missing/invalid `VAULT_CHAIN_ID`
 *  - chainId not in `CHAIN_TABLE` (only Base Sepolia + Base
 *    mainnet are wired)
 *  - malformed `VAULT_SAFE_SINGLETON_ADDRESS` /
 *    `VAULT_USDC_ADDRESS` overrides
 *
 *  Env vars (optional) override the per-chain table defaults:
 *    - `VAULT_CHAIN_RPC_URL`         (e.g. Alchemy/Infura endpoint)
 *    - `VAULT_SAFE_SINGLETON_ADDRESS` (the Safe singleton to deploy against)
 *    - `VAULT_USDC_ADDRESS`           (the Circle USDC contract)
 */
export function getChainConfig(): ChainConfig {
  const chainId = resolveChainId();
  const entry = CHAIN_TABLE[chainId];
  if (!entry) {
    const supported = Object.keys(CHAIN_TABLE).join(", ");
    throw new Error(
      `unsupported chainId ${chainId}; wired chains: [${supported}]. ` +
        `Add an entry to CHAIN_TABLE in src/lib/vault/safe-deploy.ts to enable.`,
    );
  }
  const rpcUrl = process.env.VAULT_CHAIN_RPC_URL || entry.rpcUrlDefault;
  const safeSingletonAddress = getAddress(
    process.env.VAULT_SAFE_SINGLETON_ADDRESS || entry.safeSingletonAddress,
  );
  if (!isAddress(safeSingletonAddress)) {
    throw new Error("VAULT_SAFE_SINGLETON_ADDRESS is not a valid address");
  }
  const usdcAddress = getAddress(
    process.env.VAULT_USDC_ADDRESS || entry.usdcAddress,
  );
  if (!isAddress(usdcAddress)) {
    throw new Error("VAULT_USDC_ADDRESS is not a valid address");
  }
  return {
    chain: entry.chain,
    rpcUrl,
    chainId,
    safeSingletonAddress,
    usdcAddress,
    explorerUrl: entry.explorerUrl,
  };
}

/** Read the signer private key from env (no `0x` prefix;
 *  both the Protocol Kit and viem accept either form). */
export function getSafeSignerKey(): Hex {
  const raw = process.env.VAULT_SAFE_SIGNER_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "VAULT_SAFE_SIGNER_PRIVATE_KEY is not set — set it in .env.local to enable Safe deploys",
    );
  }
  return raw.startsWith("0x") ? (raw as Hex) : (`0x${raw}` as Hex);
}

/** Returns the deploy signer as a viem Account (so we can
 *  build a WalletClient for the broadcast). Throws if the
 *  env var is unset. */
export function getSafeSigner(): Account {
  return privateKeyToAccount(getSafeSignerKey());
}

/** Convenience: signer address only, no signing capability. */
export function getSafeSignerAddress(): Address {
  return getSafeSigner().address;
}

/** A viem PublicClient bound to the configured chain + RPC. */
export function getPublicClient(config: ChainConfig): PublicClient {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

/** A viem WalletClient bound to the signer. */
export function getWalletClient(
  config: ChainConfig,
  signer: Account,
): WalletClient {
  return createWalletClient({
    account: signer,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

/** True if the current `smartAccountAddress` is the MOCK
 *  literal — i.e. the user has not yet deployed a real Safe. */
export function isMockSafeAddress(
  addr: string | null | undefined,
): boolean {
  if (!addr) return true;
  return addr.toLowerCase() === MOCK_SAFE_ADDRESS.toLowerCase();
}

export type DeploySafeResult = {
  /** The deployed Safe address (CREATE2-deterministic;
   *  equals the predicted address). */
  safeAddress: Address;
  /** The chain id the Safe was deployed on. */
  chainId: number;
  /** The address that owns the Safe. */
  signerAddress: Address;
  /** The deploy transaction hash. */
  txHash: Hex;
};

/** Deploy a new Safe to the configured chain. The Safe is
 *  single-owner (the server signer), threshold 1. The
 *  predicted Safe address is verified to have bytecode
 *  before returning (defense in depth).
 *
 *  Caller contract: the caller MUST have already verified
 *  the vault is in MOCK state. The deploy is irreversible
 *  and burns gas; re-runs return an error from the server
 *  action.
 *
 *  Throws on:
 *   - Missing env vars
 *   - RPC unreachable
 *   - Signer has no ETH for gas
 *   - Protocol Kit / viem errors
 */
export async function deploySafe(): Promise<DeploySafeResult> {
  const config = getChainConfig();
  const signerKey = getSafeSignerKey();
  const signer = privateKeyToAccount(signerKey);
  const signerAddress = getAddress(signer.address);
  const publicClient = getPublicClient(config);
  const walletClient = getWalletClient(config, signer);

  // Pre-flight: verify the signer has at least some testnet
  // ETH for gas. Failing here gives a much clearer error
  // than letting the broadcast throw.
  const balance = await publicClient.getBalance({ address: signerAddress });
  if (balance === 0n) {
    throw new Error(
      `signer ${signerAddress} has 0 ETH on chainId ${config.chainId} — ` +
        `get testnet ETH from a Base Sepolia faucet first`,
    );
  }

  // Build the Protocol Kit's SafeProvider + the predicted
  // Safe config. The signer is passed as the raw private key
  // (the protocol-kit accepts it as a string; the 0x prefix
  // is optional).
  const safeProvider = new SafeProvider({
    provider: config.rpcUrl,
    signer: signerKey,
  });
  const safeAccountConfig: SafeAccountConfig = {
    owners: [signerAddress],
    threshold: 1,
  };
  const safeDeploymentConfig: SafeDeploymentConfig = {
    safeVersion: SAFE_VERSION,
  };

  // 1) Predict the address. CREATE2 makes this deterministic.
  const predicted = getAddress(
    await predictSafeAddress({
      safeProvider,
      chainId: BigInt(config.chainId),
      safeAccountConfig,
      safeDeploymentConfig,
    }),
  );

  // 2) Initialize a Safe instance for the predicted config.
  // The Protocol Kit builds the deploy tx from this.
  const safeSdk = await Safe.init({
    provider: config.rpcUrl,
    signer: signerKey,
    predictedSafe: { safeAccountConfig, safeDeploymentConfig },
  });

  // 3) Build the proxy-creation tx (calldata, to-address,
  // value). The `to` is the SafeProxyFactory's address,
  // known to the Protocol Kit's contract config.
  const deployTx: DeployTx =
    await safeSdk.createSafeDeploymentTransaction();

  // 4) Broadcast via viem. This gives us a real tx hash +
  // a real receipt; the Protocol Kit's `SafeProvider` would
  // do the same internally, but going through viem keeps
  // the rest of the stack uniform and gets us a proper
  // typed `Hex` hash.
  const txHash = await walletClient.sendTransaction({
    account: signer,
    to: getAddress(deployTx.to),
    value: BigInt(deployTx.value),
    data: deployTx.data as Hex,
    chain: config.chain,
  });

  // 5) Wait for the receipt so we know the deploy is mined
  // before persisting. Bumped to 120s to be safe on testnet.
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
  });
  if (receipt.status !== "success") {
    throw new Error(
      `Safe deploy tx ${txHash} reverted (status=${receipt.status})`,
    );
  }

  // 6) Sanity: verify the predicted address has bytecode now.
  const code = await publicClient.getBytecode({ address: predicted });
  if (!code || code === "0x") {
    throw new Error(
      `predicted Safe ${predicted} has no bytecode after tx ${txHash} — ` +
        `something is off in the Protocol Kit config`,
    );
  }

  return {
    safeAddress: predicted,
    chainId: config.chainId,
    signerAddress,
    txHash,
  };
}

/** Read whether a Safe is already deployed at `address` by
 *  checking the bytecode. Returns false on RPC error (so
 *  the caller can fail open to the deploy path). */
export async function isSafeDeployedAt(
  address: Address,
): Promise<boolean> {
  const config = getChainConfig();
  const publicClient = getPublicClient(config);
  try {
    const code = await publicClient.getBytecode({ address });
    return !!code && code !== "0x";
  } catch {
    return false;
  }
}

/** Load the current `signerAddress` for the user. Returns
 *  null if no deploy has happened yet. Used by the post-
 *  deploy address chip on /vault. */
export async function getVaultSignerAddress(
  vaultId: string,
): Promise<Address | null> {
  const v = await prisma.vaultAccount.findUnique({
    where: { id: vaultId },
  });
  if (!v?.signerAddress) return null;
  try {
    return getAddress(v.signerAddress);
  } catch {
    return null;
  }
}
