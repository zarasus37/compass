/**
 * Compass Vault — Aave V3 on Base Sepolia / Base mainnet
 * (Cluster Vault 4.0, M3; Cluster 6.0.1 — mainnet).
 *
 * The yield strategy. The Safe deposits USDC into Aave V3's USDC
 * reserve on the active chain and receives interest-bearing aUSDC.
 * The M3 surface is:
 *
 *   1. `getReserveApy()` — read the on-chain currentLiquidityRate
 *      from the Aave V3 Pool's `getReserveData(asset)` and convert
 *      to a decimal APY. Replaces the Phase 3.0 stub that read
 *      `VAULT_AAVE_APY` from env.
 *
 *   2. `getAUsdcTokenAddress()` — read the Aave V3 Pool's
 *      `getReserveData(asset).aTokenAddress` so the page knows
 *      which ERC-20 to query for the Safe's earning balance.
 *      Cached on `VaultAccount.aUsdcTokenAddress` after the
 *      first deposit.
 *
 *   3. `getAaveUsdcBalance()` — read the Safe's raw Aave-USDC
 *      balance (the asset the Aave Pool accepts). This is a
 *      different token from M2's Circle USDC; the Aave market
 *      uses Aave's own faucet USDC.
 *
 *   4. `getAUsdcBalance()` — read the Safe's aUSDC balance (the
 *      interest-bearing receipt).
 *
 *   5. `getCurrentAllowance()` — read the Safe's current
 *      Aave-USDC allowance to the Aave Pool. The deposit flow
 *      issues an unlimited approval on the first deposit; later
 *      deposits skip the approval step.
 *
 *   6. `supplySafeUsdc()` — the deposit flow. Approve (if needed)
 *      + supply via the Protocol Kit's Safe transaction flow. The
 *      Safe is the actor; the server-side signer EOA is the
 *      relayer that pays gas and signs the meta-tx.
 *
 *   7. `withdrawSafeUsdc()` — the withdrawal flow. Burns the
 *      Safe's aUSDC via the Aave Pool's `withdraw(asset, amount,
 *      to)` and sends the underlying USDC back to the Safe.
 *
 * Decimal conventions:
 *   - USDC: 6 decimals (Aave's faucet USDC on Base Sepolia).
 *   - aUSDC: 6 decimals (aTokens follow the underlying's
 *     decimals; aUSDC scales 1:1 with USDC at supply, then
 *     appreciates as yield accrues via the liquidity index).
 *   - Compass money: integer cents. The lib's entry points
 *     accept `amountCents` and convert internally; the
 *     `*Raw` helpers expose the bigint units for tests.
 *
 * On-chain rates:
 *   - Aave's `currentLiquidityRate` is in ray (1e27), expressed
 *     as the per-second supply rate. APY ≈
 *     (currentLiquidityRate / 1e27) × seconds_per_year
 *     (= 31_536_000). The conversion is implemented in
 *     `getReserveApy` below.
 *
 * Out of scope (deferred to future clusters):
 *   - Variable-rate accounting (Aave's `liquidityIndex` accrual
 *     over time; the Safe's aUSDC balance grows). M3 reads the
 *     current aUSDC balance directly via `balanceOf`; the
 *     index-based accounting is a future yield-attribution pass.
 *   - Aave reward tokens (the Aave V3 Safety Module's stkAAVE
 *     claims; not relevant on the testnet).
 *   - Withdraw-to-a-different-recipient. M3 always returns
 *     USDC to the Safe.
 */

import "server-only";
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type Account } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import Safe, { SafeProvider } from "@safe-global/protocol-kit";
import { prisma } from "@/server/db";
import {
  getChainConfig,
  getSafeSigner,
  getSafeSignerKey,
  getPublicClient as getPublicClientFromDeploy,
  getWalletClient as getWalletClientFromDeploy,
  isMockSafeAddress,
  MOCK_SAFE_ADDRESS,
} from "./safe-deploy";
import {
  USDC_DECIMALS,
  RAW_UNITS_PER_CENT,
  parseUsdcCentsToUnits,
  centsFromUsdcUnits,
} from "./funding";

// ──────────────────────────────────────────────────────────────────────
// Aave V3 chain config
// ──────────────────────────────────────────────────────────────────────

/** Per-chain Aave V3 addresses (Cluster 6.0.1 — mainnet).
 *
 *  The Pool address is *per chain* and comes from
 *  bgd-labs/aave-address-book. The USDC address on mainnet is
 *  the same Circle USDC that `safe-deploy.ts` defaults to
 *  (Aave V3's main market on Base uses the native Circle USDC,
 *  not USDC.e).
 *
 *  On Base Sepolia, the Aave market historically used Aave's
 *  faucet USDC (a separate mint from Circle's testnet USDC).
 *  Testers mint from https://app.aave.com/faucet/.
 *
 *  The aUSDC address is **NOT** in this table — it is resolved
 *  dynamically via `Pool.getReserveData(usdc).aTokenAddress`
 *  so the value stays correct if Aave ever migrates the market
 *  to a new implementation. */
const AAVE_CHAIN_TABLE: Record<
  number,
  {
    poolAddress: Address;
    usdcAddress: Address;
  }
> = {
  [baseSepolia.id]: {
    // Aave V3 Pool on Base Sepolia (chain 84532).
    poolAddress: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
    // Aave's faucet USDC on Base Sepolia (distinct from Circle's
    // testnet USDC at VAULT_USDC_ADDRESS; the Aave Pool only
    // accepts this asset on testnet).
    usdcAddress: "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f",
  },
  [base.id]: {
    // Aave V3 Pool on Base mainnet (chain 8453). Cross-checked
    // against the bgd-labs/aave-address-book
    // (src/ts/AaveV3Base.ts) and basescan.
    poolAddress: "0xa238dd80c259a72e81d7e4664a9801593f98d1c5",
    // Circle USDC on Base mainnet (same asset safe-deploy.ts
    // defaults to).
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

export type AaveChainConfig = {
  chainId: number;
  poolAddress: Address;
  usdcAddress: Address;
};

/** Read the Aave chain config. Throws on:
 *  - chainId not in `AAVE_CHAIN_TABLE` (the parent
 *    `getChainConfig()` already validates this, so the only
 *    way to hit this branch is if the two tables drift — a
 *    good fail-loud signal)
 *  - malformed `VAULT_AAVE_POOL_ADDRESS` / `VAULT_AAVE_USDC_ADDRESS`
 *    env overrides
 *
 *  The `rpcUrl` lives on the parent `ChainConfig` (read via
 *  `getChainConfig()`); the Aave config is just the Aave-specific
 *  contract addresses.
 */
export function getAaveChainConfig(): AaveChainConfig {
  const base = getChainConfig();
  const entry = AAVE_CHAIN_TABLE[base.chainId];
  if (!entry) {
    const supported = Object.keys(AAVE_CHAIN_TABLE).join(", ");
    throw new Error(
      `AAVE_CHAIN_TABLE has no entry for chainId ${base.chainId}; ` +
        `supported: [${supported}]. Add a row to keep AAVE_CHAIN_TABLE in sync with CHAIN_TABLE in safe-deploy.ts.`,
    );
  }
  const poolAddress = getAddress(
    process.env.VAULT_AAVE_POOL_ADDRESS || entry.poolAddress,
  );
  if (!isAddress(poolAddress)) {
    throw new Error("VAULT_AAVE_POOL_ADDRESS is not a valid address");
  }
  const usdcAddress = getAddress(
    process.env.VAULT_AAVE_USDC_ADDRESS || entry.usdcAddress,
  );
  if (!isAddress(usdcAddress)) {
    throw new Error("VAULT_AAVE_USDC_ADDRESS is not a valid address");
  }
  return {
    chainId: base.chainId,
    poolAddress,
    usdcAddress,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Aave V3 Pool ABI
// ──────────────────────────────────────────────────────────────────────

/** Minimal Aave V3 Pool ABI — only the entry points we need
 *  for the M3 deposit / withdraw / APY read flows. The
 *  ReserveData struct mirrors the spec at
 *  https://aave.com/docs/aave-v3/smart-contracts/pool. */
const AAVE_POOL_ABI = [
  // supply(asset, amount, onBehalfOf, referralCode) — deposit
  // `amount` of `asset` on behalf of `onBehalfOf`. M3 always
  // passes the Safe as `onBehalfOf` so the aUSDC lands back
  // on the Safe.
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  // withdraw(asset, amount, to) — burn `amount` of the caller's
  // aUSDC and send the underlying USDC to `to`. M3 always
  // passes the Safe as `to` so the USDC returns to the Safe.
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getReserveData(asset) → ReserveData struct. M3 only reads
  // `currentLiquidityRate` + `aTokenAddress` from the return
  // value (the rest is omitted from the ABI surface; the
  // return struct is large but we only need two fields).
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "configuration", type: "uint256" },
          { name: "liquidityIndex", type: "uint128" },
          { name: "currentLiquidityRate", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "currentVariableBorrowRate", type: "uint128" },
          { name: "__deprecatedStableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "id", type: "uint16" },
          { name: "liquidationGracePeriodUntil", type: "uint40" },
          { name: "aTokenAddress", type: "address" },
          { name: "__deprecatedStableDebtTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "accruedToTreasury", type: "uint128" },
          { name: "unbacked", type: "uint128" },
          { name: "isolationModeTotalDebt", type: "uint128" },
        ],
      },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ──────────────────────────────────────────────────────────────────────
// On-chain reads
// ──────────────────────────────────────────────────────────────────────

/** Read the on-chain Aave USDC supply APY. Returns the rate
 *  as a decimal (e.g. 0.0425 = 4.25% per year). The conversion
 *  is `currentLiquidityRate / 1e27 × seconds_per_year`.
 *
 *  Throws on RPC failure or if the reserve's liquidity rate is
 *  0 (which would indicate an unlisted / paused reserve — the
 *  user should know that). */
export async function getReserveApy(): Promise<number> {
  const aave = getAaveChainConfig();
  const publicClient = getPublicClientFromDeploy(getChainConfig());
  const data = (await publicClient.readContract({
    address: aave.poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: "getReserveData",
    args: [aave.usdcAddress],
  })) as {
    currentLiquidityRate: bigint;
    aTokenAddress: Address;
  };
  const rateRay = data.currentLiquidityRate;
  if (rateRay === 0n) {
    // Aave returns 0 for an unlisted / paused reserve. Surface
    // a clear error rather than silently returning 0% APY.
    throw new Error(
      `Aave V3 reserve for ${aave.usdcAddress} returned currentLiquidityRate=0 — ` +
        `reserve is unlisted or paused on chainId ${aave.chainId}`,
    );
  }
  // rateRay is the per-second rate scaled by 1e27. To get the
  // annualized rate: divide by 1e27, then multiply by the
  // number of seconds in a year.
  const SECONDS_PER_YEAR = 31_536_000n;
  const RAY = 1_000_000_000_000_000_000_000_000_000n; // 1e27
  // APY as a decimal, computed in bigint math to avoid
  // floating-point drift on the boundary cases.
  // APY = (rateRay × SECONDS_PER_YEAR) / RAY, then divide by
  // 1e18 to get a number suitable for UI ("0.0425").
  const apyRay = (rateRay * SECONDS_PER_YEAR) / RAY; // bigint
  // Convert to a JS number. For the realistic range (0-100%
  // APY), the bigint fits in a number safely (53-bit mantissa
  // gives us 9 quadrillion as the integer max).
  return Number(apyRay) / 1e18;
}

/** Read the aToken (aUSDC) address for the Aave USDC reserve.
 *  Cached on `VaultAccount.aUsdcTokenAddress` after the first
 *  successful read so subsequent balance reads skip this hop. */
export async function getAUsdcTokenAddress(): Promise<Address> {
  const aave = getAaveChainConfig();
  const publicClient = getPublicClientFromDeploy(getChainConfig());
  const data = (await publicClient.readContract({
    address: aave.poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: "getReserveData",
    args: [aave.usdcAddress],
  })) as { aTokenAddress: Address };
  return getAddress(data.aTokenAddress);
}

/** Read the Safe's raw Aave-USDC balance (the asset the Aave
 *  Pool accepts). Throws on RPC failure. */
export async function getAaveUsdcBalance(
  safeAddress: Address,
): Promise<bigint> {
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot read Aave-USDC balance for MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy first`,
    );
  }
  const aave = getAaveChainConfig();
  const publicClient = getPublicClientFromDeploy(getChainConfig());
  return (await publicClient.readContract({
    address: aave.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [safeAddress],
  })) as bigint;
}

/** Read the Safe's aUSDC balance (the interest-bearing receipt).
 *  Pass `aUsdcAddress` explicitly so the caller can use the
 *  cached value on the vault row. */
export async function getAUsdcBalance(
  safeAddress: Address,
  aUsdcAddress: Address,
): Promise<bigint> {
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot read aUSDC balance for MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy first`,
    );
  }
  const publicClient = getPublicClientFromDeploy(getChainConfig());
  return (await publicClient.readContract({
    address: aUsdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [safeAddress],
  })) as bigint;
}

/** Read the Safe's current Aave-USDC allowance to the Aave Pool.
 *  Returns 0n if no approval has been granted. */
export async function getCurrentAllowance(
  safeAddress: Address,
): Promise<bigint> {
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot read allowance for MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy first`,
    );
  }
  const aave = getAaveChainConfig();
  const publicClient = getPublicClientFromDeploy(getChainConfig());
  return (await publicClient.readContract({
    address: aave.usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [safeAddress, aave.poolAddress],
  })) as bigint;
}

// ──────────────────────────────────────────────────────────────────────
// Calldata builders
// ──────────────────────────────────────────────────────────────────────

/** Encode the calldata for Aave's `supply(asset, amount, onBehalfOf,
 *  referralCode)`. */
export function buildSupplyCalldata(args: {
  asset: Address;
  amountUnits: bigint;
  onBehalfOf: Address;
  referralCode?: number;
}): Hex {
  return encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "supply",
    args: [args.asset, args.amountUnits, args.onBehalfOf, args.referralCode ?? 0],
  });
}

/** Encode the calldata for Aave's `withdraw(asset, amount, to)`.
 *  Pass `amountUnits = 2n ** 256n - 1n` (max uint256) to withdraw
 *  the entire aUSDC balance. */
export function buildWithdrawCalldata(args: {
  asset: Address;
  amountUnits: bigint;
  to: Address;
}): Hex {
  return encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: "withdraw",
    args: [args.asset, args.amountUnits, args.to],
  });
}

/** Encode the calldata for ERC-20 `approve(spender, amount)`. */
export function buildApproveCalldata(args: {
  spender: Address;
  amountUnits: bigint;
}): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [args.spender, args.amountUnits],
  });
}

// ──────────────────────────────────────────────────────────────────────
// Safe-side flows (the deposit / withdraw transactions)
// ──────────────────────────────────────────────────────────────────────

export type SafeTxResult = {
  txHash: Hex;
  /** The block the Safe tx was mined in (null if the read
   *  failed; the caller can still report success on the
   *  txHash). */
  blockNumber: bigint | null;
};

async function executeSafeTransaction(args: {
  safeAddress: Address;
  signerKey: Hex;
  rpcUrl: string;
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
}): Promise<SafeTxResult> {
  // Initialize the Protocol Kit against the already-deployed
  // Safe. The protocol kit accepts the raw signer private key
  // string (0x-prefixed) — not a viem Account object — so the
  // `Safe.init({ signer })` arg is the same shape the M1
  // deploy lib uses. The `safeAddress` tells the kit to
  // connect to an existing Safe (vs predicting a new one).
  const safeSdk = await Safe.init({
    provider: args.rpcUrl,
    signer: args.signerKey,
    safeAddress: args.safeAddress,
  });
  // Build the inner Safe transaction. The Safe is the actor
  // for the inner call; the protocol kit wraps it in a
  // meta-tx for the owner EOA to sign + broadcast.
  const safeTx = await safeSdk.createTransaction({
    transactions: [
      {
        to: args.to,
        data: args.data,
        value: args.value ? `0x${args.value.toString(16)}` : "0x0",
      },
    ],
  });
  // Execute via the owner EOA. The protocol kit:
  //   1. signs the Safe tx with the owner key
  //   2. calls Safe.execTransaction(...)
  //   3. waits for the receipt
  //   4. returns the tx hash + receipt
  const result = await safeSdk.executeTransaction(safeTx);
  const txHash = (result as unknown as { hash: Hex }).hash;
  const blockNumber = (result as unknown as { blockNumber?: bigint })
    .blockNumber
    ? BigInt((result as unknown as { blockNumber: number | bigint }).blockNumber)
    : null;
  return { txHash, blockNumber };
}

export type SupplyResult = {
  safeAddress: Address;
  poolAddress: Address;
  signerAddress: Address;
  amountCents: number;
  amountUnits: bigint;
  approveTxHash: Hex | null;
  supplyTxHash: Hex;
  aUsdcAddress: Address;
  postBalanceUnits: bigint;
};

/** Supply Aave-USDC from the Safe into Aave V3. Issues an
 *  unlimited approval (type(uint256).max) on the first
 *  deposit; later deposits skip the approval tx.
 *
 *  Throws on:
 *   - MOCK Safe address
 *   - Invalid amount
 *   - Insufficient Aave-USDC balance on the Safe
 *   - RPC unreachable
 *   - Receipt status !== success
 */
export async function supplySafeUsdc(args: {
  safeAddress: string;
  amountCents: number;
}): Promise<SupplyResult> {
  const chainConfig = getChainConfig();
  const aave = getAaveChainConfig();
  const signer = getSafeSigner();
  const signerKey = getSafeSignerKey();
  const safeAddress = getAddress(args.safeAddress);
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot supply from MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy a real Safe first`,
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

  // Pre-flight 1: the Safe has enough Aave-USDC.
  const safeBalance = await getAaveUsdcBalance(safeAddress);
  if (safeBalance < amountUnits) {
    const haveDollars = Number(safeBalance) / 10 ** USDC_DECIMALS;
    const needDollars = Number(amountUnits) / 10 ** USDC_DECIMALS;
    throw new Error(
      `Safe ${safeAddress} has ${haveDollars.toFixed(2)} Aave-USDC, ` +
        `needs ${needDollars.toFixed(2)} — mint from Aave's faucet ` +
        `(https://app.aave.com/faucet/, select Base Sepolia, mint to the Safe address)`,
    );
  }

  // Resolve the aToken address once. We use the dynamic
  // resolution (Pool.getReserveData) so the value stays
  // correct even if Aave upgrades the pool.
  const aUsdcAddress = await getAUsdcTokenAddress();

  // Pre-flight 2: current allowance. If < amount, do the
  // approval first (unlimited). Subsequent deposits skip this
  // step because max-uint256 is effectively forever.
  const currentAllowance = await getCurrentAllowance(safeAddress);
  let approveTxHash: Hex | null = null;
  if (currentAllowance < amountUnits) {
    const MAX_UINT256 = 2n ** 256n - 1n;
    const approveData = buildApproveCalldata({
      spender: aave.poolAddress,
      amountUnits: MAX_UINT256,
    });
    const approveResult = await executeSafeTransaction({
      safeAddress,
      signerKey,
      rpcUrl: chainConfig.rpcUrl,
      chainId: chainConfig.chainId,
      to: aave.usdcAddress,
      data: approveData,
    });
    approveTxHash = approveResult.txHash;
  }

  // Now do the supply.
  const supplyData = buildSupplyCalldata({
    asset: aave.usdcAddress,
    amountUnits,
    onBehalfOf: safeAddress,
  });
  const supplyResult = await executeSafeTransaction({
    safeAddress,
    signerKey,
    rpcUrl: chainConfig.rpcUrl,
    chainId: chainConfig.chainId,
    to: aave.poolAddress,
    data: supplyData,
  });

  // Read the post-supply aUSDC balance for the cache.
  const postBalanceUnits = await getAUsdcBalance(safeAddress, aUsdcAddress);

  return {
    safeAddress,
    poolAddress: aave.poolAddress,
    signerAddress: signer.address,
    amountCents: args.amountCents,
    amountUnits,
    approveTxHash,
    supplyTxHash: supplyResult.txHash,
    aUsdcAddress,
    postBalanceUnits,
  };
}

export type WithdrawResult = {
  safeAddress: Address;
  poolAddress: Address;
  signerAddress: Address;
  amountCents: number;
  amountUnits: bigint;
  withdrawTxHash: Hex;
  postUsdcBalanceUnits: bigint;
  postAUsdcBalanceUnits: bigint;
};

/** Withdraw Aave-USDC from the Safe's aUSDC position back to
 *  the Safe. Burns the aUSDC via the Aave Pool's
 *  `withdraw(asset, amount, to)` and sends the underlying
 *  USDC back to the Safe.
 *
 *  Throws on:
 *   - MOCK Safe address
 *   - Invalid amount
 *   - Insufficient aUSDC balance on the Safe
 *   - RPC unreachable
 *   - Receipt status !== success
 */
export async function withdrawSafeUsdc(args: {
  safeAddress: string;
  amountCents: number;
}): Promise<WithdrawResult> {
  const chainConfig = getChainConfig();
  const aave = getAaveChainConfig();
  const signer = getSafeSigner();
  const signerKey = getSafeSignerKey();
  const safeAddress = getAddress(args.safeAddress);
  if (isMockSafeAddress(safeAddress)) {
    throw new Error(
      `cannot withdraw to MOCK Safe ${MOCK_SAFE_ADDRESS} — deploy a real Safe first`,
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

  // Resolve the aToken address (cached on the vault row in
  // future; dynamic for the MVP).
  const aUsdcAddress = await getAUsdcTokenAddress();

  // Pre-flight: the Safe has enough aUSDC.
  const aUsdcBalance = await getAUsdcBalance(safeAddress, aUsdcAddress);
  if (aUsdcBalance < amountUnits) {
    const haveDollars = Number(aUsdcBalance) / 10 ** USDC_DECIMALS;
    const needDollars = Number(amountUnits) / 10 ** USDC_DECIMALS;
    throw new Error(
      `Safe ${safeAddress} has ${haveDollars.toFixed(2)} aUSDC, ` +
        `needs ${needDollars.toFixed(2)} — deposit first via [DEPOSIT] $X USDC`,
    );
  }

  // Burn aUSDC and send the underlying USDC back to the Safe.
  const withdrawData = buildWithdrawCalldata({
    asset: aave.usdcAddress,
    amountUnits,
    to: safeAddress,
  });
  const result = await executeSafeTransaction({
    safeAddress,
    signerKey,
    rpcUrl: chainConfig.rpcUrl,
    chainId: chainConfig.chainId,
    to: aave.poolAddress,
    data: withdrawData,
  });

  // Read the post-withdraw balances for the cache.
  const postUsdcBalanceUnits = await getAaveUsdcBalance(safeAddress);
  const postAUsdcBalanceUnits = await getAUsdcBalance(safeAddress, aUsdcAddress);

  return {
    safeAddress,
    poolAddress: aave.poolAddress,
    signerAddress: signer.address,
    amountCents: args.amountCents,
    amountUnits,
    withdrawTxHash: result.txHash,
    postUsdcBalanceUnits,
    postAUsdcBalanceUnits,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports
// ──────────────────────────────────────────────────────────────────────

export { getChainConfig } from "./safe-deploy";
