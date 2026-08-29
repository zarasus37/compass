# Compass — Fresh-Session Handoff

**Date**: 2026-08-29 15:55 CDT
**Last commit**: `589634f` — *Cluster 7.3 — Off-ramp picker + MOCK adapter + Spritz sandbox-ready wiring (visible UI).*
**Predecessor commit**: `29bc14f` (Cluster 7.2 docs) → `d71c224` (Cluster 7.1 — ⌘K command palette) → `f3332d7` (Cluster 7.0 docs) → `38eb7e8` (Cluster 7.0 — Vault preferences hub) → `a23031c` (Cluster 6.0 fix-up docs) → `8ef4f8f` (Cluster 6.0 fix-up — VaultSchedule in Prisma schema) → `8c97dbf` (Cluster 6.0.1 docs) → `37dc04b` (Cluster 7.0 — Vault preferences hub) → `6393645` (spec) → `2f06d0b` (Cluster 6.0 docs) → `62b8528` (Cluster 6.0 — Vault scheduler) → `e23503c` (smoke:all wiring)

---

## TL;DR

Compass is at a clean natural breakpoint. The most recent work was **Cluster 7.3 — Off-ramp picker (visible UI) + MOCK adapter + Spritz sandbox-ready wiring** (commit `589634f`): the user now picks a primary off-ramp provider (MOCK / Spritz / Monto) in `/vault/preferences`, the gateway builds its chain with that provider first, and the Spritz adapter is plumbed through `@spritz-finance/api-client` — env-gated so missing credentials cleanly fall back to MOCK (the smoke exercises that path). The `/vault` PageHead shows a `[PROVIDER] <name>` chip; the OffRampPanel has 4 rows (Mock / Spritz / Monto / Manual Push) and highlights the active provider. PolicySummaryCard grew to 5 cells. New `VaultPreferences.offRampProvider` field, new `MockOffRampAdapter` + `SpritzClientAdapter`, new `setOffRampProviderAction` server action, new `OffRampProviderPicker` client component. New `tests/smoke-off-ramp-picker.mjs` (35 checks). `tests/integration-vault.mjs` updated to set the preference to SPRITZ in the M4 happy-path block (the old default of "Spritz" is now an explicit choice). **All 29 smokes green via `pnpm smoke:all`** (~1,470 checks; smoke-vault-prefs grew to 66 with the new 5th-cell check), `tsc` clean, dev server live on testnet default.

The previous cluster was **7.2 — Recent items in ⌘K palette** (commit `29bc14f`): a small follow-on to Cluster 7.1. The ⌘K palette now shows a `// RECENT · N items` section above the result list when the query is empty and the user has navigated via the palette before. The RECENT list is local (localStorage, key `compass-palette-recent`), capped at 8 items, dedups by id, persists across sessions. New `recent-items.ts` module with three exports (getRecent, pushRecent, clearRecent), SSR-safe. The `CommandPalette` now reads the recent list on open via useEffect, renders the section header, and calls pushRecent(item) before closing. The /api/command-palette endpoint adds `recentCount: 0` to the wire format. The smoke (13 new checks) verifies the API field, the source-file shape of recent-items.ts, and the CommandPalette integration.

If you're a fresh session picking this up: read the spec, read `COORDINATION.md` end-to-end, then go. Nothing about the mainnet wiring is half-done — but **no real mainnet deploy was performed** in this cluster (no funded deployer EOA). The wiring is verified; a real deploy remains a manual gate xKryptic holds.

---

## Recent change worth knowing about (Cluster 7.3)

- **The chain table is the only place to add new chains.** `src/lib/vault/safe-deploy.ts:CHAIN_TABLE` and `src/lib/vault/aave.ts:AAVE_CHAIN_TABLE` are the source of truth for "which chains are wired." Add a row to both, and every deploy/supply/withdraw flow picks it up. The two tables share a `chainId` key — keep them in sync.
- **`aUSDC is NOT in the table** — it is resolved dynamically via `Pool.getReserveData(asset).aTokenAddress`. This means a future Aave market upgrade (e.g. a new Pool implementation) keeps the value correct without a code change. The trade-off is the dynamic read needs a working RPC.
- **`/api/vault/chain-config` is intentionally public.** No secrets in the response (no RPC URL with API key, no signer key, no DB info). The smoke hits it to verify wiring without importing `.ts` from `.mjs`. If you ever add secrets to the response, **remove the `/api/vault/chain-config` entry from `PUBLIC_PREFIXES` in `src/middleware.ts`** immediately. The smoke-deploy check guards against accidental removal.
- **`prod.ts` refuses `VAULT_CHAIN_ID=84532` in production.** A misconfigured prod deploy with the testnet chainId would otherwise succeed (deploy goes through, supply goes through) but every transaction touches valueless USDC. The check is a one-line addition to `FORBIDDEN_IN_PROD`; add the same shape for future prod-only forbiddens.
- **Cluster 7.3 — Off-ramp provider preference lives in `VaultPreferences.offRampProvider`.** The string column is the source of truth (default `MOCK`). The gateway reads it via `buildGatewayForUser(userId)` in `src/lib/vault/server.ts` — that helper is the only place that should read the preference and build the gateway. The MOCK adapter (`MockOffRampAdapter` in `adapters.ts`) is the safe default and the Spritz env-missing fallback.
- **Cluster 7.3 — `SpritzClientAdapter` is the real path; `MockOffRampAdapter("Spritz")` is the fallback.** The factory in `src/lib/vault/spritz-client.ts` checks `SPRITZ_INTEGRATION_KEY` + `SPRITZ_SANDBOX=true`; missing env → returns the MOCK adapter named "Spritz" so the gateway chain still has a Spritz entry. The actual SDK call is plumbed but not exercised by automated tests (xKryptic's sandbox creds aren't set). The smoke covers the MOCK fallback path; flipping to live is a one-line `.env.local` change.
- **Pre-existing inconsistency noted (not in scope of this cluster):** `.env.production.example` documents `VAULT_SIGNER_KEY` (the name `prod.ts` checks), but the actual deploy code in `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A production deploy using the example as-is will never get a usable signer. This is a follow-on to fix in a "prod-env-var-naming-consistency" cluster.

---

## Live state (verify these before touching anything)

```powershell
# 1. Commit
git log -1 --oneline    # should be 589634f

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
| Off-ramp picker (C7.3) | `src/components/vault/OffRampProviderPicker.tsx` + `src/lib/vault/spritz-client.ts` |
| Smoke scripts | `tests/smoke-*.mjs` (29 files) + `tests/integration-vault.mjs` + `tests/smoke-deploy.mjs` |
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

8. **pnpm 11 strictness on ignored build scripts.** pnpm 11+ refuses to run scripts for unapproved packages. The repo's `pnpm-workspace.yaml` has an `allowBuilds` list (Cluster 7.3 set `bufferutil: true` and `utf-8-validate: true`). New packages that need post-install scripts must be added there, or `pnpm tsc` / `pnpm dev` will fail with `ERR_PNPM_IGNORED_BUILDS`. The pre-Cluster-7.3 workspace.yaml had `set this to true or false` placeholders; they're now flipped on.

9. **Bash watchdog kills the dev server wrapper at 30 min.** Per the previous session: the underlying Next.js process usually keeps running — check `netstat -ano | Select-String ":3000.*LISTENING"` before restarting. If a PID is listening, the dev server is fine, the bash wrapper just exited. (In Cluster 7.3 the process did NOT outlive the watchdog; restart cleanly.)

---

## Smoke status (the green baseline)

All 29 smokes must be green before any new cluster ships. Run them via `pnpm`:

```bash
pnpm smoke              # data-layer smokes (12 incl. auth + the new off-ramp-picker)
pnpm smoke:ui           # UI / page-render smokes (13)
pnpm smoke:integration  # integration-vault (163 checks)
pnpm smoke:deploy       # 95 deploy-readiness checks (file + live)
pnpm smoke:all          # all of the above (single command, since commit e23503c)
pnpm tsc                # type check
```

Baseline numbers (verified 2026-08-29 15:55 CDT on commit `589634f`):
- 12 data-layer smokes: auth, accounts-db 53, allocation-db 36, bills-db 29, envelopes-db 28, goals-db 23, vault-scheduler 55, vault 77, vault-prefs 66 (was 65, +1 for 5th cell), **off-ramp-picker 35 (NEW)**, command-palette 77, onboarding-agent 108, advisor 78
- 13 UI smokes: 22, 70, 7, 32, 36, 14, 46, 5, 8, 63, 102, 7, 20 checks
- integration-vault: **163** checks (now sets `offRampProvider=SPRITZ` in the M4 happy-path block)
- smoke-deploy: **95** checks
- tsc: clean

Total: **~1,470 checks** across 29 suites. CI runs them in ~3-5 min on a Linux runner with a Postgres service container.

### Dev scheduler (Cluster 6.0)

A long-running Node process polls `POST /api/cron/vault` every 30s and logs one line per fire. Start it with `pnpm cron:dev`. It auto-skips when no schedules are due, and gracefully summarizes on SIGINT. In production, the same `/api/cron/vault` endpoint is hit by Vercel cron (or any external scheduler); set `CRON_SECRET` to require bearer auth on the route.

## Next cluster (recommended for the next session)

xKryptic's call at the end of session 2026-08-29 (Cluster 7.3) was the visible-UI half of the off-ramp story. The natural next cluster is the **audit-log viewer (visible UI)**. The audit log table has been growing since Cluster 2.0 (the `vault.synced` event), and Cluster 7.3 added another event type (`vault.off_ramp_provider_changed`) — but the user has no way to see it. The cluster's scope should be:

- New `/vault/audit` page (linked from the `/vault/preferences` summary card) that shows the user's audit log in a reverse-chronological table.
- Server-rendered (force-dynamic) so the latest events are always fresh. No client islands.
- Filterable by `actionType` (server-side filter via query string, e.g. `?type=vault.off_ramp_provider_changed`).
- Per-row: timestamp, actionType, payload (pretty-printed JSON in a `<pre>` or similar — no fancy UI for v1).
- Visible-UI half: the page, the table, the filter pills, the link from the prefs page.
- New smoke `smoke-audit-log.mjs` that verifies the page renders, the rows appear, the filter works, and the new `vault.off_ramp_provider_changed` event shows up after a setter call.
- A `vault.audit_log_viewed` event gets written whenever the user opens the page (so the audit log is auditable itself — meta, but useful).

This is the natural next cluster because it surfaces the work the user has been doing (every setter writes an audit row, but they have no way to see it). It also closes a small loop: the user can now click "see history" on a policy cell and see the change.

**Out of scope (deferred):**
- Real-time updates (the page is force-dynamic, no SSE/WebSocket).
- Audit log retention / archival (the table grows forever; a future cluster can add `vault.audit_log_pruned` + a cron).
- Per-action filtering (only the existing `actionType` filter; future clusters can add date-range, payload-key search).
- Audit log export (CSV / JSON download) — a future cluster.
- Cross-user audit log (for admin / household views) — a future cluster.

### Recent change worth knowing about (Cluster 6.0.1 / 7.0.1)

- **The chain table is the only place to add new chains.** Already covered in the "Recent change worth knowing about" section above (Cluster 7.3 inherited this from 7.0.1).
- **`aUSDC is NOT in the table** — dynamic via `Pool.getReserveData(asset).aTokenAddress`. Same as above.
- **`/api/vault/chain-config` is intentionally public.** Same as above.
- **`prod.ts` refuses `VAULT_CHAIN_ID=84532` in production.** Same as above.
- **Cluster 6.0 — auto bill-pay scheduler.** The off-ramp gateway from Cluster Vault 4.0 M4 now runs on a per-user cron. Key gotchas:
  - **`/api/reset-seed` does not create the `VaultAccount` row** — it's lazily created on first `/vault` visit via `getOrCreateVault`. Tests that exercise the cap check (`minReserveCents > 2× reserve`) must ensure a vault exists; otherwise the cap check sees `vault=null` and silently passes.
  - **The engine writes one `vault.scheduler_run` summary audit row per run** (status + billsAffected + error). The run history table reads these. Per-bill entries (skipped/error) are separate rows in the same actionType with a `billId` in the payload.
  - **`executionIdempotencyKey` was previously a local function in `server.ts`**; it's now exported and used by both the server action (`executeBillPaymentAction`) and the scheduler. The minute-precision key rotates fast enough that a real retry later in the day gets a fresh `PaymentAttempt` row.
  - **`toScheduledBillLocal` and `toVaultAccountLocal` in `server.ts` are now exported** — the scheduler uses them to map Prisma rows to the gateway's branded types. Single source of truth.

---

## Recovery (if the dev server or DB is down)

```powershell
# Docker daemon first (the daemon may be down if Docker Desktop is not running)
Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
# If not running, start it (the GUI is what manages the daemon on Windows)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Wait for the daemon
$ready = $false; for ($i = 0; $i -lt 30; $i++) { docker info > $null 2>&1; if ($?) { $ready = $true; break }; Start-Sleep -Seconds 2 }
# Once the daemon is up, the postgres container usually auto-starts (Docker restart policy).
docker ps --filter "name=compass_dev_pg"   # is it up?
docker start compass_dev_pg                # start it explicitly if not
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

The bash watchdog kills `pnpm dev` after 30 min. The underlying Next.js process usually keeps running, but not always (Cluster 7.3 saw it actually die with the wrapper). Check `netstat -ano | Select-String ":3000.*LISTENING"` first; only restart if nothing's listening.

---

## What was NOT done (intentionally)

These are follow-on clusters the user might want next:

- **Real Spritz sandbox creds** — Cluster 7.3 wired the SDK. xKryptic signs up at sdk.spritz.finance, gets a sandbox key, adds `SPRITZ_INTEGRATION_KEY=...` and `SPRITZ_SANDBOX=true` to `.env.local`. The chain auto-flips to live. No code change.
- **Real mainnet deploy** — Cluster 6.0.1 wired mainnet; the chain table, the addresses, the env block, the prod check, the API endpoint, the smoke are all green. But no real mainnet deploy was performed. The deployer EOA needs real ETH on Base; xKryptic creates + funds it. Cluster 6.0.2 ("Forked-mainnet deploy test") would add a `anvil --fork-base` or Tenderly integration so the full deploy + supply + withdraw flow can be exercised end-to-end without spending real ETH.
- **Multi-sig / threshold changes** — current spec is a 1-of-1 Safe. Multi-sig is a future cluster.
- **Other chains** (Optimism, Arbitrum, Polygon) — the chain table is a clean place to add more. Deferred to a "Multi-chain vault" cluster.
- **Real Monto adapter** — Cluster 7.3 wired Spritz; Monto stays a stub. The gateway is provider-agnostic; the swap is a 1-file change in `src/lib/vault/spritz-client.ts` (rename to `off-ramp-client.ts`, add the Monto SDK).
- **Real fiat bank-account linking** — the off-ramp delivers USDC to the wallet; the user is responsible for off-ramping to a bank themselves in v1. A future cluster can integrate Plaid + the Spritz bank-account-link flow.
- **Dynamic Pool address resolution** — currently the Aave V3 Pool address is hardcoded per chain. Cluster 6.0.2 (forked-mainnet) should resolve dynamically via `PoolAddressesProvider.getPool()` so an Aave upgrade doesn't need a code change. Risk: one extra RPC call on first supply.
- **Prod-env var naming consistency** — `.env.production.example` uses `VAULT_SIGNER_KEY` (the name `prod.ts` checks), but `safe-deploy.ts` actually reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A prod deploy using the example as-is will never get a usable signer. Trivial fix (alias or rename), but it changes every smoke + every deploy script.
- **Prisma migration history** — currently the schema is pushed via `prisma db push`. Production should run `prisma migrate dev` once to seed `_prisma_migrations` so the health endpoint can report `migrationStatus: current` instead of `pushed`.
- **Per-bill off-ramp provider override UI** — the data shape exists (`ScheduledBill.providerPreference`); the picker in `/vault/preferences` is a single user-level value. Per-bill overrides stay in the bill editor for a future cluster.
- **Audit-log UI** — see "Next cluster" above. The data is there; the page isn't.
- **Refund / dispute flow** — the existing `Manual Push` adapter's error path is the contract; a real adapter just maps the same error states. Future cluster.

---

## How to start the next cluster (recommended)

1. Read `COORDINATION.md` end-to-end (especially the "Last update" line — that's the current headline).
2. Read this file.
3. Run `pnpm smoke:all` to confirm the baseline is green before you start.
4. Pick a cluster from the spec / from the user's request.
5. Write the spec for the cluster into a `00-CLUSTER-X.Y.md` file (or update an existing one) so the new session has a written contract.
6. Build, smoke, commit, update COORDINATION.md "Last update".

**Don't** pick up the work in this session — start a new one. The context here is heavy (this whole session is the Postgres-everywhere + off-ramp-picker + Spritz-wiring cluster chain), and the user has a "fresh session, clean handoff" preference (see agent memory). The next session will read this file + COORDINATION.md and have what it needs.
