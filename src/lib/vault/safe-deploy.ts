/**
 * Compass Vault — Safe deploy (Cluster Vault 4.0, M1).
 *
 * Wraps viem + @safe-global/protocol-kit v8 behind a small,
 * server-only surface. The page calls this via `deploySafeAction`;
 * the [DEPLOY] button is the only user-facing entry point.
 *
 * Chain: Base Sepolia (chainId 84532) by default. The RPC URL
 * + the Safe singleton address are env-configurable so the
 * same code path can target other testnets (or mainnet)
 * without touching the lib.
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
import { baseSepolia, type Chain } from "viem/chains";
import { prisma } from "@/server/db";

/** The literal placeholder address used by the Phase 1/2
 *  seed (`getOrCreateVault`). The [DEPLOY] button is shown
 *  when this is the current `smartAccountAddress`. */
export const MOCK_SAFE_ADDRESS =
  "0xMOCK0000000000000000000000000000000000DEAD";

/** Safe singleton address on Base Sepolia (v1.3.0). */
const DEFAULT_SAFE_SINGLETON_BASE_SEPOLIA =
  "0xfb1bffC9d739B8D520DaF37dF6669fE5932EF9Aa" as const;

/** USDC contract on Base Sepolia (Circle's official
 *  testnet USDC, 6 decimals). Defined here so M2 doesn't
 *  redeploy. */
const DEFAULT_USDC_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

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
};

/** Read the chain config from env. Throws on missing or
 *  invalid values. */
export function getChainConfig(): ChainConfig {
  const rpcUrl =
    process.env.VAULT_CHAIN_RPC_URL || "https://sepolia.base.org";
  const rawChainId = process.env.VAULT_CHAIN_ID || "84532";
  const chainId = parseInt(rawChainId, 10);
  if (!Number.isFinite(chainId)) {
    throw new Error(`VAULT_CHAIN_ID is not a number: ${rawChainId}`);
  }
  if (chainId !== baseSepolia.id) {
    throw new Error(
      `unsupported chainId ${chainId}; only Base Sepolia (${baseSepolia.id}) is wired`,
    );
  }
  const safeSingletonAddress = getAddress(
    process.env.VAULT_SAFE_SINGLETON_ADDRESS ||
      DEFAULT_SAFE_SINGLETON_BASE_SEPOLIA,
  );
  if (!isAddress(safeSingletonAddress)) {
    throw new Error("VAULT_SAFE_SINGLETON_ADDRESS is not a valid address");
  }
  const usdcAddress = getAddress(
    process.env.VAULT_USDC_ADDRESS || DEFAULT_USDC_BASE_SEPOLIA,
  );
  if (!isAddress(usdcAddress)) {
    throw new Error("VAULT_USDC_ADDRESS is not a valid address");
  }
  return {
    chain: baseSepolia,
    rpcUrl,
    chainId,
    safeSingletonAddress,
    usdcAddress,
  };
}

/** Read the signer private key from env (no `0x` prefix;
 *  both the Protocol Kit and viem accept either form). */
function getSafeSignerKey(): Hex {
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
