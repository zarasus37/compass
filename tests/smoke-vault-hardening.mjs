// Behavior tests for the vault hardening patch (no server / DB needed).
// Run: tsx tests/smoke-vault-hardening.mjs
import { encodeFunctionData, parseAbi } from "viem";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertAllowedSafeCall } from "../src/lib/vault/safe-guard.ts";
import {
  getFundMaxCents,
  getDepositMaxCents,
  getBillMaxCents,
  DEFAULT_FUND_MAX_CENTS,
  DEFAULT_BILL_MAX_CENTS,
} from "../src/lib/vault/limits.ts";

const ROOT = process.cwd();

let pass = 0,
  fail = 0;
const ok = (name, cond) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  <-- FAILED"}`);
};
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

const SAFE = "0x1111111111111111111111111111111111111111";
const POOL = "0x2222222222222222222222222222222222222222";
const USDC = "0x3333333333333333333333333333333333333333";
const EVIL = "0x4444444444444444444444444444444444444444";
const base = { safeAddress: SAFE, poolAddress: POOL, usdcAddress: USDC };

const poolAbi = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
]);
// The guard's ERC20_ABI only knows approve() — transfer() must not decode.
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);
const AMOUNT = 1_000_000n;

const call = (to, abi, functionName, args, value) => ({
  ...base,
  to,
  data: encodeFunctionData({ abi, functionName, args }),
  value,
});

// ── spend caps ────────────────────────────────────────────────────────────
// The old inline default was 1_000_000_00 (= 100,000,000 cents = $1,000,000),
// 100x the documented $10,000. $10,000 = 1,000,000 cents.
delete process.env.VAULT_FUND_MAX_CENTS;
delete process.env.VAULT_DEPOSIT_MAX_CENTS;
delete process.env.VAULT_BILL_MAX_CENTS;
ok(
  "default fund cap is $10,000 (1_000_000 cents, was 100_000_000)",
  getFundMaxCents() === 1_000_000 && DEFAULT_FUND_MAX_CENTS === 1_000_000,
);
ok("default deposit cap is $10,000 (1_000_000 cents)", getDepositMaxCents() === 1_000_000);
process.env.VAULT_FUND_MAX_CENTS = "50000";
ok("env override honored", getFundMaxCents() === 50_000);
process.env.VAULT_FUND_MAX_CENTS = "abc";
ok("garbage override falls back to default", getFundMaxCents() === 1_000_000);
delete process.env.VAULT_FUND_MAX_CENTS;

// ── bill ceiling — the THIRD 1_000_000_00, missed by the first sweep ─────────
// The original fix diagnosed `1_000_000_00` as a 100x-too-large literal and
// corrected FUND and DEPOSIT, but `validateBillForm` in server.ts kept its
// own inline copy. Nothing exercised the bill path, so a bill could be
// created at $1,000,000 — 100x the intended ceiling. Asserted here so the
// third instance cannot survive a fourth sweep unnoticed.
ok(
  "default bill ceiling is $10,000 (1_000_000 cents, was 100_000_000)",
  getBillMaxCents() === 1_000_000 && DEFAULT_BILL_MAX_CENTS === 1_000_000,
);
process.env.VAULT_BILL_MAX_CENTS = "250000";
ok("bill env override honored", getBillMaxCents() === 250_000);
process.env.VAULT_BILL_MAX_CENTS = "0";
ok("bill garbage/zero override falls back to default", getBillMaxCents() === 1_000_000);
delete process.env.VAULT_BILL_MAX_CENTS;

// Source guard: the bill validator must read the shared cap, not carry its
// own literal again. This is the assertion that would have caught the miss.
const serverSrc = readFileSync(join(ROOT, "src/lib/vault/server.ts"), "utf8");
ok(
  "server.ts validateBillForm reads getBillMaxCents()",
  /getBillMaxCents\(\)/.test(serverSrc),
);
ok(
  "server.ts contains no inline 1_000_000_00 bill ceiling",
  !/amountCents\s*>\s*1_000_000_00/.test(serverSrc),
  "the third 100x literal is back in validateBillForm",
);

// ── guard: the three legitimate calls are allowed ──────────────────────────
ok(
  "approve(Aave Pool) allowed",
  !throws(() =>
    assertAllowedSafeCall(call(USDC, erc20Abi, "approve", [POOL, AMOUNT])),
  ),
);
ok(
  "supply(onBehalfOf = Safe) allowed",
  !throws(() =>
    assertAllowedSafeCall(
      call(POOL, poolAbi, "supply", [USDC, AMOUNT, SAFE, 0]),
    ),
  ),
);
ok(
  "withdraw(to = Safe) allowed",
  !throws(() =>
    assertAllowedSafeCall(call(POOL, poolAbi, "withdraw", [USDC, AMOUNT, SAFE])),
  ),
);

// ── guard: everything else is refused ──────────────────────────────────────
ok(
  "withdraw to ATTACKER address REFUSED",
  throws(() =>
    assertAllowedSafeCall(call(POOL, poolAbi, "withdraw", [USDC, AMOUNT, EVIL])),
  ),
);
ok(
  "supply onBehalfOf = ATTACKER REFUSED",
  throws(() =>
    assertAllowedSafeCall(call(POOL, poolAbi, "supply", [USDC, AMOUNT, EVIL, 0])),
  ),
);
ok(
  "approve with ATTACKER as spender REFUSED",
  throws(() =>
    assertAllowedSafeCall(call(USDC, erc20Abi, "approve", [EVIL, AMOUNT])),
  ),
);
ok(
  "withdraw of a non-USDC asset REFUSED",
  throws(() =>
    assertAllowedSafeCall(call(POOL, poolAbi, "withdraw", [EVIL, AMOUNT, SAFE])),
  ),
);
ok(
  "unknown target contract REFUSED",
  throws(() => assertAllowedSafeCall({ ...base, to: EVIL, data: "0x12345678" })),
);
ok(
  "USDC transfer() REFUSED (only approve is allowed)",
  throws(() =>
    assertAllowedSafeCall(call(USDC, erc20Abi, "transfer", [EVIL, AMOUNT])),
  ),
);
ok(
  "non-zero ETH value REFUSED",
  throws(() =>
    assertAllowedSafeCall(
      call(POOL, poolAbi, "withdraw", [USDC, AMOUNT, SAFE], 1n),
    ),
  ),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
