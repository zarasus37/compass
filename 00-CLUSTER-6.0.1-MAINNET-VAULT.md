# Cluster 6.0.1 — Mainnet Vault (Base mainnet, chainId 8453)

**Date**: 2026-08-29 03:05 CDT
**Status**: 🟡 In progress
**Goal**: Wire the existing vault Safe-deploy + Aave V3 supply/withdraw flow to Base mainnet. No new features — the testnet path already does everything; this is the config switch + verified mainnet addresses + a deploy-readiness smoke.

---

## Why this cluster exists

The HANDOVER "What was NOT done" list calls out: *"Mainnet Vault (chainId 8453) — wiring is in place (just set `VAULT_CHAIN_ID=8453` and the banner auto-hides) but no real protocol-kit deploy path for mainnet yet."* That last clause is now wrong on a literal read — `getChainConfig()` in `src/lib/vault/safe-deploy.ts` *explicitly throws* on any chainId other than `baseSepolia.id`:

```ts
if (chainId !== baseSepolia.id) {
  throw new Error(
    `unsupported chainId ${chainId}; only Base Sepolia (${baseSepolia.id}) is wired`,
  );
}
```

The TestnetBanner auto-hides on `VAULT_CHAIN_ID=8453`, but the moment the user clicks **[DEPLOY]**, the chain config throws. So "wiring in place" was optimistic.

This cluster closes that loop: same `OffRampGateway` flow, same Aave V3 supply/withdraw, but pointed at Base mainnet addresses that the Aave governance + Safe-deployments registries have already canonicalized.

---

## Scope (this cluster)

### 1. Chain config switch (`src/lib/vault/safe-deploy.ts`)

Replace the hardcoded Base-Sepolia check with a small chain table:

```ts
const CHAIN_TABLE: Record<number, {
  chain: Chain;
  defaultSafeSingleton: Address;
  defaultUsdc: Address;
  explorerUrl: string;
}> = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    defaultSafeSingleton: "0xfb1bffC9d739B8D520DaF37dF6669fE5932EF9Aa", // v1.3.0
    defaultUsdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",         // Circle testnet USDC
    explorerUrl: "https://sepolia.basescan.org",
  },
  [base.id]: {
    chain: base,
    defaultSafeSingleton: "0x69f4D1788e39c87893C980c06EdF4b7f686e2938", // v1.3.0 canonical
    defaultUsdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",         // Circle USDC
    explorerUrl: "https://basescan.org",
  },
};
```

`getChainConfig()` looks up the table; throws on unknown chainId. Env vars still override the table defaults. Add a new `explorerUrl` field so the `<SafeDeployedChip />` (or equivalent) can link to the right explorer.

### 2. Aave config switch (`src/lib/vault/aave.ts`)

Same pattern. Verified Aave V3 Base mainnet addresses (cross-referenced against the Aave address book + basescan):

- **Aave V3 Pool on Base mainnet**: `0xa238dd80c259a72e81d7e4664a9801593f98d1c5`
- **aUSDC (aBasUSDC) on Base mainnet**: `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`
- **USDC on Base mainnet**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (same as the safe-deploy default; the Aave Pool only accepts the official Circle USDC, not the testnet faucet USDC)

The `getAUsdcTokenAddress()` cache stays — on mainnet it'll resolve to `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB` on first read and stick.

### 3. Env production example (`.env.production.example`)

```bash
# Cluster 6.0.1 — mainnet configuration
# Set VAULT_CHAIN_ID=8453 for Base mainnet. The defaults below
# are the canonical Aave + Safe addresses for chain 8453. Override
# with caution — wrong addresses silently break supply/withdraw.
VAULT_CHAIN_ID="8453"
VAULT_CHAIN_RPC_URL="https://mainnet.base.org"  # or Alchemy/Infura for production
VAULT_SAFE_SINGLETON_ADDRESS="0x69f4D1788e39c87893C980c06EdF4b7f686e2938"
VAULT_USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
VAULT_AAVE_POOL_ADDRESS="0xa238dd80c259a72e81d7e4664a9801593f98d1c5"

# The signer key is the EOA that owns the deployed Safe. Must hold
# real ETH on Base mainnet to pay for the deploy + supply gas.
# Use a dedicated deployer wallet — never the user's main wallet.
VAULT_SIGNER_KEY="0x..."
```

### 4. Production env validation (`src/lib/env/prod.ts` + `instrumentation.ts`)

The existing prod-env validators should already pass for mainnet (`VAULT_CHAIN_ID` is just an integer; the MOCK signer / mock LLM / dev DATABASE_URL checks don't care about chain). Add one new check: in `NODE_ENV=production`, the resolved `getChainConfig()` must return a `chainId` that is **not** 84532 (testnet) — refuse to start with a testnet config in prod. The chain table lookup itself is the validation; a missing chainId throws a `ConfigError`.

### 5. UI

The existing `TestnetBanner` already auto-hides on mainnet. Verify the banner logic is correct (chainId === 8453 OR `vault.chainId === 8453` ⇒ hide). Add a small "mainnet" indicator to the vault status strip when `chainId === 8453` so the user has an explicit "this is real USDC" signal in the chrome. The change is one extra line in `<StatusStrip />`.

### 6. Smoke (extend `tests/smoke-deploy.mjs`)

Add a "mainnet config" check that:
- Sets `VAULT_CHAIN_ID=8453` and `VAULT_CHAIN_RPC_URL=https://mainnet.base.org` in the smoke's env
- Re-imports the chain config (or queries a `/api/vault/chain-config` introspection endpoint — see "Files" below)
- Verifies the resolved chainId === 8453
- Verifies the mainnet USDC + aUSDC + Safe singleton + Aave Pool addresses are the verified constants
- Verifies `getChainConfig()` no longer throws for chainId 8453

The smoke does **not** do a real deploy. Real deploys cost real ETH and need a real signer with funded wallet — that's a manual gate the user holds.

### 7. Files

**Edit**:
- `src/lib/vault/safe-deploy.ts` — add the chain table, swap the hardcoded `baseSepolia.id` check for a table lookup, expose `explorerUrl` on `ChainConfig`
- `src/lib/vault/aave.ts` — same chain table for the Aave config
- `.env.production.example` — add the mainnet block; keep the testnet block documented
- `src/lib/env/prod.ts` — add the "testnet chainId is forbidden in prod" check
- `src/app/(app)/vault/page.tsx` — add the "mainnet" chip to `<StatusStrip />` (1 extra condition in the `tone`/`badge` logic)
- `src/app/api/vault/chain-config/route.ts` — **new** tiny endpoint that returns the resolved `ChainConfig` for the current env (read-only, no secrets). The smoke hits this instead of trying to import the `.ts` from `.mjs`.
- `tests/smoke-deploy.mjs` — add 8–10 mainnet-config checks

**New**:
- This spec file

### 8. Dependencies

**None.** `viem/chains` already exports `base`. `@safe-global/protocol-kit` is chain-agnostic. The Aave calls are direct contract reads + writes, not SDK calls. No `package.json` changes.

---

## Out of scope (deferred)

- **Real mainnet Safe deploy test against forked mainnet** — would need `anvil --fork-base` or Tenderly. A real test against forked mainnet is the strongest signal the deploy path works end-to-end. Lands in a follow-on (Cluster 6.0.2 "Forked-mainnet deploy test") once a CI step is wired.
- **Multi-sig / threshold changes** — current spec is a 1-of-1 Safe. Multi-sig is a future cluster.
- **Other chains** (Optimism, Arbitrum, Polygon) — the chain table is a clean place to add more. Deferred to a "Multi-chain vault" cluster.
- **Signer key management UX** — the env-var approach works for the deployer flow but is hostile to end users. A real user-facing wallet (MetaMask, WalletConnect) lands in a much later cluster; this is a developer-only deploy path.
- **`/api/cron/vault` auth + production CRON_SECRET setup** — orthogonal. (The cron route is already shipped in Cluster 6.0; this cluster just enables it for mainnet too.)
- **Real off-ramp adapters (Spritz/Monto)** — the gateway is provider-agnostic but the adapters are stubbed. Lands in a separate cluster.

---

## Acceptance criteria

1. `pnpm tsc` clean.
2. `pnpm smoke:all` green (all 27 suites, ~1,260 checks — one new suite OR a few new checks in `smoke-deploy`).
3. With `VAULT_CHAIN_ID=8453` and the canonical mainnet env vars set, `getChainConfig()` returns:
   - `chainId: 8453`
   - `chain: base` (the viem `Chain` object)
   - `safeSingletonAddress: 0x69f4D1788e39c87893C980c06EdF4b7f686e2938`
   - `usdcAddress: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - `explorerUrl: "https://basescan.org"`
4. With `VAULT_CHAIN_ID=84532` (the default), `getChainConfig()` continues to return the Base Sepolia config (no regression).
5. With `VAULT_CHAIN_ID=1` (Ethereum mainnet — not supported), `getChainConfig()` throws a clear error.
6. In `NODE_ENV=production`, the prod-env validator refuses to start with `VAULT_CHAIN_ID=84532`.
7. The vault page shows a `MAINNET` chip in the status strip when chainId is 8453, and the testnet banner is hidden.
8. COORDINATION.md + HANDOVER.md updated to point at the new commit.

---

## Risk + rollback

- **Risk: wrong mainnet address** — all addresses are cross-referenced against the Aave address book + Safe-deployments repository + basescan. If a value drifts (Aave upgrades its Pool implementation), the smoke that re-resolves via the PoolAddressesProvider would catch it. For now we hardcode; the next cluster (6.0.2) should resolve dynamically.
- **Risk: real USDC, real ETH, real loss if a bug ships** — the Safe is self-custodial, but a misconfigured Safe singleton or a wrong reserve could lose the principal. The cluster is small (config switch only); the existing `canExecute` 7-condition gate and the off-ramp gateway's adapter chain (MOCK + Spritz + Monto) are unchanged. No new code path that touches user funds.
- **Rollback**: revert the commit. The chain table's `baseSepolia` entry preserves the existing behavior. The prod-env check is additive.

---

## Open questions for xKryptic

- **RPC provider**: `https://mainnet.base.org` is the public Base RPC — rate-limited. For a real deploy, an Alchemy/Infura key is strongly recommended. Decision deferred to when xKryptic sets up the prod env.
- **Signer key**: the deployer EOA needs real ETH on Base mainnet (deploy costs ~$0.10; supply to Aave costs ~$0.05). xKryptic creates the deployer wallet + funds it manually. Documented in the spec, not coded.
- **Initial deposit amount**: the existing `[FUND]` button takes a preset ($100/$500/$1000). No change needed; xKryptic picks the size at deploy time.

---

## Commit shape

Single cluster commit + a follow-on docs commit. e.g.:
- `e3f4a5b Cluster 6.0.1 — Vault mainnet (Base 8453)`
- `a4b5c6d docs: HANDOVER + COORDINATION reflect Cluster 6.0.1`
