/**
 * Allowlist for transactions the server signer may execute from a user's Safe.
 *
 * The signer is the sole owner (threshold 1) of every Safe, so
 * `executeSafeTransaction` is the choke point where a bug or injected input
 * could move funds anywhere. This guard makes it structurally impossible to
 * send anything except the three calls the product actually needs, and pins
 * every recipient to the Safe itself:
 *
 *   USDC.approve(spender = Aave Pool, any amount)
 *   Pool.supply(asset = USDC, amount, onBehalfOf = this Safe, referral)
 *   Pool.withdraw(asset = USDC, amount, to = this Safe)
 *
 * Anything else (other targets, other selectors, non-zero ETH value, a
 * withdraw to a foreign address) throws before signing.
 */
import { decodeFunctionData, getAddress, parseAbi, type Address, type Hex } from "viem";

const POOL_ABI = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
]);
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

// getAddress() validates + checksums, so this also rejects non-addresses.
// A throw from here is fail-closed: the transaction is never signed.
const same = (a: string, b: string) => getAddress(a) === getAddress(b);

export function assertAllowedSafeCall(args: {
  safeAddress: Address;
  poolAddress: Address;
  usdcAddress: Address;
  to: Address;
  data: Hex;
  value?: bigint;
}): void {
  const { safeAddress, poolAddress, usdcAddress, to, data } = args;
  const refuse = (why: string): never => {
    throw new Error(`[safe-guard] refused to sign: ${why}`);
  };

  if (args.value && args.value !== 0n) refuse("non-zero ETH value");

  if (same(to, usdcAddress)) {
    let d: ReturnType<typeof decodeFunctionData<typeof ERC20_ABI>>;
    try {
      d = decodeFunctionData({ abi: ERC20_ABI, data });
    } catch {
      // Anything that is not approve() on USDC — including
      // transfer()/transferFrom() to an attacker — dies here.
      return refuse("USDC call is not approve()");
    }
    const [spender] = d.args as readonly [Address, bigint];
    if (!same(spender, poolAddress)) refuse("approve spender is not the Aave Pool");
    return;
  }

  if (same(to, poolAddress)) {
    let d: ReturnType<typeof decodeFunctionData<typeof POOL_ABI>>;
    try {
      d = decodeFunctionData({ abi: POOL_ABI, data });
    } catch {
      return refuse("Pool call is not supply()/withdraw()");
    }
    if (d.functionName === "supply") {
      const [asset, , onBehalfOf] = d.args as readonly [Address, bigint, Address, number];
      if (!same(asset, usdcAddress)) refuse("supply asset is not USDC");
      if (!same(onBehalfOf, safeAddress)) refuse("supply onBehalfOf is not the Safe");
      return;
    }
    if (d.functionName === "withdraw") {
      const [asset, , dest] = d.args as readonly [Address, bigint, Address];
      if (!same(asset, usdcAddress)) refuse("withdraw asset is not USDC");
      if (!same(dest, safeAddress)) refuse("withdraw destination is not the Safe");
      return;
    }
  }

  refuse(`target ${to} is not an allowed contract`);
}
