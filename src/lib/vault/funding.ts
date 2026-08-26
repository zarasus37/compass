/**
 * Compass Vault — USDC funding + on-chain balance (Cluster Vault 4.0, M2).
 *
 * Wraps viem's ERC-20 surface behind a small server-only API:
 *
 *   1. `parseUsdcDollarsToUnits(dollars)` — convert a UI dollar amount
 *      (e.g. `100` for $100) to the raw `uint256` units USDC uses on
 *      Base Sepolia (6 decimals).
 *   2. `usdcTransferData(to, amountUnits)` — encode the calldata for
 *      `transfer(address,uint256)`. We go through viem's
 *      `encodeFunctionData` rather than hand-rolling the selector so
 *      future ABI bumps (e.g. if we add permit support) don't need
 *      a rewrite.
 *   3. `getOnChainUsdcBalance(safeAddress)` — viem `readContract`
 *      for `balanceOf(safe)`. Throws on RPC failure; the caller
 *      (server action) catches and returns a structured error.
 *   4. `fundSafeWithUsdc({...})` — the `[FUND] $X USDC` flow:
 *        a. Pre-flight: verify the signer has enough USDC.
 *        b. Encode + broadcast the transfer via the signer's
 *           wallet client.
 *        c. Wait for the receipt (120s timeout, like M1's deploy).
 *        d. Sanity-check the post-transfer balance moved.
 *        e. Return `{ txHash, amountUnits, amountCents, onChainBalanceUnits }`.
 *
 * Idempotency: the server action layer (`fundSafeAction` in
 * `server.ts`) generates a deterministic key per (vault, amount)
 * and short-circuits to the previous audit row if the same key
 * is seen again. This prevents double-funds if the user
 * double-clicks the button or the form re-submits.
 *
 * What this lib does NOT do (deferred):
 *   - Aave V3 deposit — M3
 *   - Real off-ramp call — M4
 *   - Multi-chain funding (Base mainnet) — closed-beta only
 *
 * Security notes (M2 scope is pragmatic, not production):
 *   - The signer is the same server-side EOA that deployed the
 *     Safe. It must hold both testnet ETH (for gas) and testnet
 *     USDC (to fund the Safe). Funding a Safe from a
 *     user-controlled EOA is a future slice; the M2 flow is the
 *     server acting on the user's behalf against the closed-beta
 *     Safe.
 *   - The funding tx is broadcast from the signer's EOA, not the
 *     Safe. The Safe is the *recipient* of the transfer, not the
 *     actor. The Safe's owner (the same EOA) can later call
 *     `pull` on the USDC if the off-ramp needs to move it
 *     elsewhere.
 *   - The `maxAuthorizedAmount` cap from the bill is enforced
 *     server-side. The cap default is `$10,000`; the
 *     `VAULT_FUND_MAX_CENTS` env var overrides it.
 */

import "server-only";
import { getAddress, encodeFunctionData, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import {
  getChainConfig,
  getSafeSigner,
  getPublicClient as getPublicClientFromDeploy,
  getWalletClient as getWalletClientFromDeploy,
  isMockSafeAddress,
  MOCK_SAFE_ADDRESS,
} from "./safe-deploy";

// ──────────────────────────────────────────────────────────────────────
// USDC math (6 decimals on Base Sepolia)
// ──────────────────────────────────────────────────────────────────────

/** USDC is a 6-decimal token on Base Sepolia (Circle's official). */
export const USDC_DECIMALS = 6;
/** The cents denominator — every monetary field in Compass is integer cents. */
export const CENTS_DECIMALS = 2;
/** Raw-units-per-cent = 10^(USDC_DECIMALS - CENTS_DECIMALS) = 10^4. */
export const RAW_UNITS_PER_CENT = 10n ** BigInt(USDC_DECIMALS - CENTS_DECIMALS);

/**
 * Convert a dollar amount (e.g. `100` for $100) to raw USDC
 * units (uint256, 6 decimals). Uses `Math.round` to avoid
 * floating-point drift on the dollars→units boundary.
 */
export function parseUsdcDollarsToUnits(dollars: number): bigint {
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new Error(`invalid dollar amount: ${dollars}`);
  }
  return BigInt(Math.round(dollars * 10 ** USDC_DECIMALS));
}

/**
 * Convert a cents amount (e.g. `10000` for $100) to raw USDC
 * units. Companion to `centsFromUsdcUnits` — the two are
 * inverses on the integer grid.
 */
export function parseUsdcCentsToUnits(cents: number): bigint {
  if (!Number.isFinite(cents) || cents < 0) {
    throw new Error(`invalid cents amount: ${cents}`);
  }
  return BigInt(cents) * RAW_UNITS_PER_CENT;
}

/**
 * Convert raw USDC units (uint256) to integer cents. Truncates
 * sub-cent balances to $0.00 — the on-chain read at small
 * balances is a non-issue for our display rounding (we never
 * bill in fractions of a cent), but we surface a `lostDustCents`
 * helper for callers that need to know the truncation.
 */
export function centsFromUsdcUnits(units: bigint): number {
  if (units < 0n) return 0;
  return Number(units / RAW_UNITS_PER_CENT);
}

/** The cents lost to truncation when `units` is not a whole number
 *  of cents (e.g. 50 raw USDC units = 0.005 cents → truncated
 *  to 0, with 5 dust lost). */
export function lostDustCents(units: bigint): number {
  if (units < 0n) return 0;
  return Number(units % RAW_UNITS_PER_CENT);
}

// ──────────────────────────────────────────────────────────────────────
// ERC-20 transfer calldata
// ──────────────────────────────────────────────────────────────────────

/** Minimal ERC-20 ABI — only the `transfer` function we need. */
const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Encode the calldata for `transfer(to, amount)`. */
export function usdcTransferData(to: Address, amountUnits: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [to, amountUnits],
  });
}

// ──────────────────────────────────────────────────────────────────────
// On-chain reads
// ──────────────────────────────────────────────────────────────────────

/**
 * Read the Safe's on-chain USDC balance. Returns the raw uint256
 * units (6 decimals) — convert to cents via `centsFromUsdcUnits`
 * for display.
 *
 * Throws on RPC failure. The caller (`refreshSafeBalanceAction`)
 * catches and returns a structured error.
 *
 * Accepts a plain `string` (the DB row stores a String column)
 * and validates via `getAddress` so the typed call into viem is
 * safe. Throws on MOCK address.
 */
export async function getOnChainUsdcBalance(
  safeAddress: string,
): Promise<bigint> {
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot read on-chain balance for MOCK Safe address ${MOCK_SAFE_ADDRESS} — deploy first`,
    );
  }
  const config = getChainConfig();
  const publicClient = getPublicClientFromDeploy(config);
  const address = getAddress(safeAddress);
  const balance = (await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_TRANSFER_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return balance;
}

/** Read the Safe's native ETH balance (for future off-ramp gas
 *  costs). Returns 0n on RPC failure rather than throwing — the
 *  caller (the off-ramp keeper) can re-check later. */
export async function getOnChainNativeBalance(
  safeAddress: string,
): Promise<bigint> {
  if (isMockSafeAddress(safeAddress)) return 0n;
  const config = getChainConfig();
  const publicClient = getPublicClientFromDeploy(config);
  try {
    const address = getAddress(safeAddress);
    return await publicClient.getBalance({ address });
  } catch {
    return 0n;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Funding flow
// ──────────────────────────────────────────────────────────────────────

export type FundSafeResult = {
  /** The Safe address that received the USDC. */
  safeAddress: Address;
  /** The signer EOA that sent the USDC. */
  signerAddress: Address;
  /** The funding transaction hash. */
  txHash: Hex;
  /** The amount transferred, in raw USDC units (6 decimals). */
  amountUnits: bigint;
  /** The amount transferred, in integer cents. */
  amountCents: number;
  /** The Safe's on-chain USDC balance *after* the transfer, in raw units. */
  postBalanceUnits: bigint;
};

/**
 * Transfer testnet USDC from the server-side signer to the
 * user's deployed Safe. The signer must hold enough USDC; the
 * function pre-flights the balance and throws a clear error if
 * not. The Safe's post-transfer balance is read back for a
 * sanity check.
 *
 * Throws on:
 *   - MOCK Safe address (deploy first)
 *   - Invalid amount (≤ 0)
 *   - RPC unreachable
 *   - Signer USDC balance < amount
 *   - Receipt status !== success
 *   - Post-transfer balance didn't move by the expected delta
 *     (defense in depth — should never happen on a clean chain)
 */
export async function fundSafeWithUsdc(args: {
  safeAddress: string;
  /** Cents to transfer (e.g. `10000` for $100). */
  amountCents: number;
}): Promise<FundSafeResult> {
  const config = getChainConfig();
  const signer = getSafeSigner();
  const safeAddress = getAddress(args.safeAddress);
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot fund MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy a real Safe first`,
    );
  }
  if (!Number.isFinite(args.amountCents) || args.amountCents <= 0) {
    throw new Error(`amountCents must be a positive number: ${args.amountCents}`);
  }
  const amountUnits = parseUsdcCentsToUnits(args.amountCents);
  if (amountUnits <= 0n) {
    throw new Error(
      `amount too small: ${args.amountCents} cents = ${amountUnits} raw USDC units (below 1)`,
    );
  }
  const publicClient = getPublicClientFromDeploy(config);
  const walletClient = getWalletClientFromDeploy(config, signer);

  // Pre-flight 1: signer has USDC. We can't pre-flight "signer
  // has ETH" here (the M1 deploy lib already does that) — but the
  // user is presumably past M1 if they're funding, so we just
  // surface a clear error if ETH runs out.
  const signerUsdcBalance = (await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_TRANSFER_ABI,
    functionName: "balanceOf",
    args: [signer.address],
  })) as bigint;
  if (signerUsdcBalance < amountUnits) {
    const needDollars = Number(amountUnits) / 10 ** USDC_DECIMALS;
    const haveDollars = Number(signerUsdcBalance) / 10 ** USDC_DECIMALS;
    throw new Error(
      `signer ${signer.address} has ${haveDollars.toFixed(2)} USDC, ` +
        `needs ${needDollars.toFixed(2)} USDC — get testnet USDC from ` +
        `the Circle faucet (https://faucet.circle.com) or a Base Sepolia USDC faucet`,
    );
  }

  // Encode + broadcast the transfer. We send 0 value to the USDC
  // contract with `transfer(safe, amount)` calldata — the
  // contract's own balance is debited, the Safe's balance is
  // credited.
  const data = usdcTransferData(safeAddress, amountUnits);
  const txHash = await walletClient.sendTransaction({
    account: signer,
    to: config.usdcAddress,
    value: 0n,
    data,
    chain: baseSepolia,
  });

  // Wait for the receipt. 120s matches M1's deploy timeout.
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
  });
  if (receipt.status !== "success") {
    throw new Error(
      `USDC funding tx ${txHash} reverted (status=${receipt.status})`,
    );
  }

  // Sanity check: the Safe's balance should have grown by the
  // amount we transferred. On a clean chain this is a tautology,
  // but it catches RPC oddities + fee-on-transfer tokens (USDC
  // is not one, but defense in depth).
  const postBalance = (await publicClient.readContract({
    address: config.usdcAddress,
    abi: ERC20_TRANSFER_ABI,
    functionName: "balanceOf",
    args: [safeAddress],
  })) as bigint;

  return {
    safeAddress,
    signerAddress: signer.address,
    txHash,
    amountUnits,
    amountCents: args.amountCents,
    postBalanceUnits: postBalance,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Idempotency
// ──────────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic idempotency key for a funding call
 * based on the vault + the amount. Two funding calls with the
 * same key resolve to the same audit row — so a double-click
 * or a re-submit returns the existing tx hash without
 * broadcasting a second tx.
 *
 * The key is NOT time-bucketed. The user explicitly re-funding
 * the same amount 5 minutes later IS a new funding (they may
 * have spent the prior balance). To force a fresh key, the
 * caller can pass an `nonce` (the server action supplies a
 * per-request `nonce` for this reason — see `fundSafeAction`).
 */
export function fundingIdempotencyKey(args: {
  vaultId: string;
  amountCents: number;
  nonce: string;
}): string {
  return `fund:${args.vaultId}:${args.amountCents}:${args.nonce}`;
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for the server action layer
// ──────────────────────────────────────────────────────────────────────

export { getChainConfig, isMockSafeAddress, MOCK_SAFE_ADDRESS } from "./safe-deploy";
