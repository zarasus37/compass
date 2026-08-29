# Compass — Fresh-Session Handoff

**Date**: 2026-08-29 05:00 CDT
**Last commit**: `38eb7e8` — *Cluster 7.0 — Vault preferences hub (visible UI) (2026-08-29).*
**Predecessor commit**: `a23031c` (Cluster 6.0 fix-up docs) → `8ef4f8f` (Cluster 6.0 fix-up — VaultSchedule in Prisma schema) → `8c97dbf` (Cluster 6.0.1 docs) → `37dc04b` (Cluster 6.0.1 — Vault mainnet) → `6393645` (spec) → `2f06d0b` (Cluster 6.0 docs) → `62b8528` (Cluster 6.0 — Vault scheduler) → `e23503c` (smoke:all wiring)

---

## TL;DR

Compass is at a clean natural breakpoint. The most recent work was **Cluster 7.0 — Vault preferences hub** (commit `38eb7e8`): new `/vault/preferences` page consolidates the user's vault policy in one place. 4-cell policy summary (yield routing, risk disclosure, auto bill-pay, vault status) + yield routing picker + risk disclosure section (with new re-acknowledge flow) + schedule summary card. New `RevokeRiskAckButton` + `revokeRiskDisclosureAction` server action round-trip the suppression. Re-skinned `RiskDisclosure` unack state + `SchedulerIndicator` + schedule page chrome to vessel tokens. Sidebar adds the `Preferences` entry under `// Ledger`. The `Vault` item now has `match: "exact"` so it doesn't light up on `/vault/preferences` or `/vault/schedule`. New `smoke-vault-prefs.mjs` (65 checks). **All 27 smokes green via `pnpm smoke:all`** (12 data-layer + 13 UI + 1 integration-vault + 1 deploy = 27; ~1,355 checks; the new `smoke-vault-prefs` is the 12th data-layer), `tsc` clean, dev server live on testnet default.

The last visible-feature cluster was **6.0.1 — Vault mainnet** (commit `37dc04b`): wired the existing Safe-deploy + Aave V3 supply/withdraw flow to Base mainnet by swapping the hardcoded `baseSepolia.id` check in `safe-deploy.ts` for a `CHAIN_TABLE` indexed by chainId, mirrored as `AAVE_CHAIN_TABLE` in `aave.ts`. Canonical mainnet addresses cross-referenced against the Aave address book + safe-deployments. New read-only `GET /api/vault/chain-config` endpoint returns the resolved config. `/vault` StatusStrip surfaces a gold `MAINNET` chip on chainId 8453. `prod.ts` refuses to start in production with the testnet chainId.

If you're a fresh session picking this up: read the spec, read `COORDINATION.md` end-to-end, then go. Nothing about the mainnet wiring is half-done — but **no real mainnet deploy was performed** in this cluster (no funded deployer EOA). The wiring is verified; a real deploy remains a manual gate xKryptic holds.

---

## Recent change worth knowing about (commit `37dc04b`)

- **The chain table is the only place to add new chains.** `src/lib/vault/safe-deploy.ts:CHAIN_TABLE` and `src/lib/vault/aave.ts:AAVE_CHAIN_TABLE` are the source of truth for "which chains are wired." Add a row to both, and every deploy/supply/withdraw flow picks it up. The two tables share a `chainId` key — keep them in sync.
- **`aUSDC is NOT in the table** — it is resolved dynamically via `Pool.getReserveData(asset).aTokenAddress`. This means a future Aave market upgrade (e.g. a new Pool implementation) keeps the value correct without a code change. The trade-off is the dynamic read needs a working RPC.
- **`/api/vault/chain-config` is intentionally public.** No secrets in the response (no RPC URL with API key, no signer key, no DB info). The smoke hits it to verify wiring without importing `.ts` from `.mjs`. If you ever add secrets to the response, **remove the `/api/vault/chain-config` entry from `PUBLIC_PREFIXES` in `src/middleware.ts`** immediately. The smoke-deploy check guards against accidental removal.
- **`prod.ts` refuses `VAULT_CHAIN_ID=84532` in production.** A misconfigured prod deploy with the testnet chainId would otherwise succeed (deploy goes through, supply goes through) but every transaction touches valueless USDC. The check is a one-line addition to `FORBIDDEN_IN_PROD`; add the same shape for future prod-only forbiddens.
- **Pre-existing inconsistency noted (not in scope of this cluster):** `.env.production.example` documents `VAULT_SIGNER_KEY` (the name `prod.ts` checks), but the actual deploy code in `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A production deploy using the example as-is will never get a usable signer. This is a follow-on to fix in a "prod-env-var-naming-consistency" cluster.

---

## Live state (verify these before touching anything)

```powershell
# 1. Commit
git log -1 --oneline    # should be 62b8528

# 2. Dev server (Next.js, port 3000)
netstat -ano | Select-String ":3000.*LISTENING"

# 3. Postgres (Docker container, port 5433 — see gotcha below)
docker ps --filter "name=compass_dev_pg"

# 4. Health endpoint
curl http://127.0.0.1:3000/api/health | ConvertFrom-Json
#   expect: status=ok, env=development, db.migrationStatus=pushed, db.ok=true

# 5. (Optional) Dev scheduler (Cluster 6.0)
#    pnpm cron:dev   # 30s poll; one log line per fire
```

If any of those are down, see "Recovery" at the bottom of this file.

---

## Project layout (where things live)

| Concern | Location |
|---|---|
| Spec | `00-DESIGN.md` v1.0 (root) + Sections 1–9 |
| Coordination / status | `COORDINATION.md` (root, "Last update" line is the headline) |
| DB schema | `prisma/schema.prisma` (Postgres; Prisma 7) |
| DB client | `src/server/db.ts` (`PrismaPg` over `pg` + `@prisma/adapter-pg`) |
| Prisma config | `prisma.config.ts` (reads `DATABASE_URL` from env) |
| Local Postgres | `docker-compose.dev.yml` + `docker/pg_hba.conf` (trust rules, dev only) |
| Production env contract | `.env.production.example` (root) |
| Env validation (prod-only) | `src/lib/env/prod.ts` + `instrumentation.ts` |
| Health endpoint | `src/app/api/health/route.ts` |
| Security headers | `next.config.ts` (CSP + HSTS + X-Frame-Options + etc.) |
| Testnet disclosure | `src/app/(app)/vault/page.tsx` (`<TestnetBanner />`) |
| Onboarding agent | `src/lib/onboarding/{agent,tools,state,system-prompt,projection}.ts` |
| Advisor agent | `src/lib/advisor/{agent,tools,handlers,system-prompt}.ts` |
| Vault | `src/lib/vault/*.ts` + `src/app/(app)/vault/page.tsx` |
| Smoke scripts | `tests/smoke-*.mjs` (24 files) + `tests/integration-vault.mjs` + `tests/smoke-deploy.mjs` |
| Shared smoke client | `tests/db-client.mjs` |
| CI | `.github/workflows/ci.yml` |

---

## Critical gotchas (read these before you debug anything)

1. **Postgres port is 5433, not 5432.**
   Windows has native **PostgreSQL 18** (the `postgresql-x64-18` service) listening on **5432**. If you point Compass at `localhost:5432`, you'll connect to the native PG instead of the Docker container and get "password authentication failed for user 'compass'". The Docker container publishes on **5433** to avoid the collision.
   - `DATABASE_URL` everywhere is `postgresql://compass:compass@localhost:5433/compass_dev`
   - Container's internal port stays 5432
   - Production Postgres (Neon/Supabase/RDS) uses the default 5432

2. **Postgres is the only DB.** SQLite is gone. The dev DB is a throwaway docker volume. `dev.db` was untracked in commit `2080e1b`. If a `dev.db` re-appears, the SQLite adapter has crept back in somewhere — grep for `PrismaBetterSqlite3` to find it. (The smoke-deploy check does this for you.)

3. **Prisma 7 quirks:**
   - `url` is NOT in `schema.prisma` — it lives in `prisma.config.ts` → `datasource.url`
   - Prisma 7 requires a driver adapter — the `pg.Pool` shape is `{ connectionString: "..." }` (matches `pg.PoolConfig`)
   - The generated client lives at `src/generated/prisma/` (per the `output` setting) — committed to git so PRs don't need a regenerate step

4. **Envelope seed needs explicit `sortOrder: index`.** Without it, Postgres returns rows in non-deterministic order when `sortOrder` is 0 for all rows. SQLite's btree storage happened to be stable; Postgres isn't. If you see envelopes / bills / anything ordered weirdly on the page, the seeder probably forgot to set `sortOrder`.

5. **Vault testnet = Base Sepolia (chainId 84532).** The `<TestnetBanner />` shows on `/vault` whenever `VAULT_CHAIN_ID` or `vault.chainId` is a testnet. To target mainnet (chainId 8453), set `VAULT_CHAIN_ID=8453` — the banner auto-hides.

6. **LLM provider routing:**
   - `LLM_PROVIDER` — onboarding agent (default `mock` for smokes; `mavis` for production-grade)
   - `LLM_PROVIDER_ADVISOR` — post-onboarding advisor (default `ollama`)
   - They're independent. Mavis can drive onboarding while Ollama drives advisor.

7. **Prisma dev server caches the generated client.** After running `prisma generate` or `prisma db push`, **restart the dev server** — HMR isn't enough. Same lesson as Cluster 5.0. (This is in the agent memory too.)

---

## Smoke status (the green baseline)

All 26 smokes must be green before any new cluster ships. Run them via `pnpm`:

```bash
pnpm smoke              # data-layer smokes (11 incl. auth)
pnpm smoke:ui           # UI / page-render smokes (13)
pnpm smoke:integration  # integration-vault (163 checks)
pnpm smoke:deploy       # 95 deploy-readiness checks (file + live)
pnpm smoke:all          # all of the above (single command, since commit e23503c)
pnpm tsc                # type check
```

Baseline numbers (verified 2026-08-29 03:15 CDT on commit `37dc04b`):
- 11 data-layer smokes: auth, accounts-db 33, allocation-db 53, bills-db 36, envelopes-db 29, goals-db 28, insights-db 23, vault-scheduler 55, vault 77, onboarding-agent 108, advisor 78
- 13 UI smokes: each 5–102 checks (top is topbar at 102)
- integration-vault: **163** checks
- smoke-deploy: **95** checks (was 72; Cluster 6.0.1 added 12 mainnet-wiring checks + 11 live endpoint checks)
- tsc: clean

Total: **~1,300 checks** across 26 suites. CI runs them in ~3-5 min on a Linux runner with a Postgres service container.

### Dev scheduler (Cluster 6.0)

A long-running Node process polls `POST /api/cron/vault` every 30s and logs one line per fire. Start it with `pnpm cron:dev`. It auto-skips when no schedules are due, and gracefully summarizes on SIGINT. In production, the same `/api/cron/vault` endpoint is hit by Vercel cron (or any external scheduler); set `CRON_SECRET` to require bearer auth on the route.

### Recent change worth knowing about (commit `62b8528`)

Added the auto bill-pay scheduler. The off-ramp gateway from Cluster Vault 4.0 M4 now runs on a per-user cron. Key gotchas:

- **`/api/reset-seed` does not create the `VaultAccount` row** — it's lazily created on first `/vault` visit via `getOrCreateVault`. Tests that exercise the cap check (`minReserveCents > 2× reserve`) must ensure a vault exists; otherwise the cap check sees `vault=null` and silently passes.
- **The engine writes one `vault.scheduler_run` summary audit row per run** (status + billsAffected + error). The run history table reads these. Per-bill entries (skipped/error) are separate rows in the same actionType with a `billId` in the payload.
- **`executionIdempotencyKey` was previously a local function in `server.ts`**; it's now exported and used by both the server action (`executeBillPaymentAction`) and the scheduler. The minute-precision key rotates fast enough that a real retry later in the day gets a fresh `PaymentAttempt` row.
- **`toScheduledBillLocal` and `toVaultAccountLocal` in `server.ts` are now exported** — the scheduler uses them to map Prisma rows to the gateway's branded types. Single source of truth.

---

## Recovery (if the dev server or DB is down)

```powershell
# Postgres
docker ps --filter "name=compass_dev_pg"   # is it up?
docker start compass_dev_pg                # start it
# or
docker compose -f docker-compose.dev.yml up -d

# Push schema (only if the volume was wiped)
cd "C:/Users/crisc/OneDrive - Southern Careers Institute/My Drive/Budget planner app"
npx prisma db push --accept-data-loss

# Dev server
# kill any old next-server, then:
pnpm dev
# wait for "Ready in N.Ns" + http://localhost:3000

# Verify
curl http://127.0.0.1:3000/api/health | ConvertFrom-Json
```

If `pnpm dev` is killed by the bash watchdog after 30 min, the underlying Next.js process usually keeps running. Check `netstat -ano | Select-String ":3000.*LISTENING"` before restarting — if a PID is listening, the dev server is fine, the bash wrapper just exited.

---

## What was NOT done (intentionally)

These are follow-on clusters the user might want next:

- **Real mainnet deploy** — Cluster 6.0.1 wired mainnet; the chain table, the addresses, the env block, the prod check, the API endpoint, the smoke are all green. But no real mainnet deploy was performed. The deployer EOA needs real ETH on Base; xKryptic creates + funds it. Cluster 6.0.2 ("Forked-mainnet deploy test") would add a `anvil --fork-base` or Tenderly integration so the full deploy + supply + withdraw flow can be exercised end-to-end without spending real ETH.
- **Multi-sig / threshold changes** — current spec is a 1-of-1 Safe. Multi-sig is a future cluster.
- **Other chains** (Optimism, Arbitrum, Polygon) — the chain table is a clean place to add more. Deferred to a "Multi-chain vault" cluster.
- **Real off-ramp adapters** (Spritz, Monto) — currently stubbed. The gateway is provider-agnostic; the swap is a 1-file change in `src/lib/vault/adapters.ts`.
- **Dynamic Pool address resolution** — currently the Aave V3 Pool address is hardcoded per chain. Cluster 6.0.2 (forked-mainnet) should resolve dynamically via `PoolAddressesProvider.getPool()` so an Aave upgrade doesn't need a code change. Risk: one extra RPC call on first supply.
- **Prod-env var naming consistency** — `.env.production.example` uses `VAULT_SIGNER_KEY` (the name `prod.ts` checks), but `safe-deploy.ts` actually reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A prod deploy using the example as-is will never get a usable signer. Trivial fix (alias or rename), but it changes every smoke + every deploy script.
- **Prisma migration history** — currently the schema is pushed via `prisma db push`. Production should run `prisma migrate dev` once to seed `_prisma_migrations` so the health endpoint can report `migrationStatus: current` instead of `pushed`.
- **Vault prefs UX** — yield-routing picker + risk-ack are DB-backed; UI for editing the strategy description / rebalance cadence is still light.

---

## How to start the next cluster (recommended)

1. Read `COORDINATION.md` end-to-end (especially the "Last update" line — that's the current headline).
2. Read this file.
3. Run `pnpm smoke:all` to confirm the baseline is green before you start.
4. Pick a cluster from the spec / from the user's request.
5. Write the spec for the cluster into a `00-CLUSTER-X.Y.md` file (or update an existing one) so the new session has a written contract.
6. Build, smoke, commit, update COORDINATION.md "Last update".

**Don't** pick up the work in this session — start a new one. The context here is heavy (this whole conversation is the Postgres-everywhere cluster), and the user has a "fresh session, clean handoff" preference (see agent memory). The next session will read this file + COORDINATION.md and have what it needs.
