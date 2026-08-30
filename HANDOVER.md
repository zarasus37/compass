# Compass — Fresh-Session Handoff

**Date**: 2026-08-30 00:55 CDT
**Last commit**: Cluster 7.5 (Per-bill audit drill-down) — committed on top of `ed4129b` (handoff + COORDINATION reflect Cluster 7.4) → `ee405f8` (Cluster 7.4)
**Predecessor commit**: `ed4129b` (handoff + COORDINATION reflect Cluster 7.4) → `ee405f8` (Cluster 7.4) → `717e8e0` (handoff + COORDINATION reflect Cluster 7.3) → `589634f` (Cluster 7.3)
**🎯 NEXT CLUSTER (TBD — pick from candidates below)**: see "Next cluster" for the menu.

---

## TL;DR

Compass is at a clean natural breakpoint. The most recent work was **Cluster 7.5 — Per-bill audit drill-down (visible UI)**: every action the system has taken on a single bill is now surfaceable in one reverse-chronological page. New `/vault/bills/[id]/history` route (force-dynamic, server-rendered) with BillHeader (bill name, vessel, amount, state badge), BillSummaryStrip (4-cell headline with growth-oriented suggestion chips per the 2026-08-24 directive), BillTimeline (visual-first state stepper — 5 happy-path states with transition counts, plus 4 alternate-state badges shown when visited), and BillEventTable (newest first, default 50, `?take=200`, payload `<details>` per row). New `vault.bill_history_viewed` meta event — every visit to the page records a row. 404 panel (not a hard 404) for unknown bill ids. Two deep-link wirings: the `/vault/audit` table row's `// when` cell becomes a link to the bill's history when `payload.billId` is set; the `/vault` bill list's bill name becomes a link. New data layer: `src/lib/vault/audit-log.ts` adds `getBillByIdForUser`, `getBillAuditLog`, `getBillAuditSummary`, `recordBillHistoryViewed`, `parseBillHistoryFilter`, `billHistoryFilterToQuery`, `billHistoryHrefForAuditRow`. New `vault.bill_history_viewed` event type added to the `recordVaultAudit` actionType union. New smoke `tests/smoke-bill-history.mjs` (46 checks, self-contained — writes a sentinel Envelope + VaultEnvelope + ScheduledBill + 3 sentinel audit events via shared Prisma). `package.json` smoke script includes `smoke-bill-history.mjs`. New "Phase 4.0 M5 — Bill audit drill-down" section in `tests/integration-vault.mjs` (8 new checks, integration total now 170). **All 31 smokes green via `pnpm smoke:all`** (~1,494 checks across 31 suites). tsc clean. Dev server live on testnet default.

**Note for the next session**: during Cluster 7.4 the .env.local file was overwritten (accidentally truncated by a PowerShell edit, then restored from the .env.local.example template). The DATABASE_URL is back to the correct Postgres value, but the user's Mavis API key (MAVIS_API_KEY) was lost in the truncation. The smokes run with LLM_PROVIDER="mock" by default so the suite is unaffected, but if the next session wants to use the production-grade Mavis provider for the onboarding agent, the key needs to be re-pasted into .env.local. The integration-vault smoke that previously verified the Mavis endpoint still passes (it uses the mock provider via `LLM_PROVIDER="mock"`). See "Recovery" at the bottom for what to put in .env.local.

---

## Recent change worth knowing about (Cluster 7.5)

- **Bill history is now an end-user surface.** Every bill-scoped setter in the vault (state changes, payment attempts, scheduler runs per-bill rows, yield credits) writes an `AuditLog` row. `src/lib/vault/audit-log.ts` extends the 7.4 data layer with `getBillAuditLog` + `getBillAuditSummary` + `getBillByIdForUser` + `recordBillHistoryViewed`; the per-bill query narrows the DB to the 12 actionTypes that can carry a `billId`, then post-filters in JS over the parsed payload (also checks `billsCredited` for `vault.yield_routed` rows).
- **`vault.bill_history_viewed` is a meta event.** Every render of `/vault/bills/[id]/history` writes one row with `{ billId, billerName, filter, at }`. The write happens AFTER the read (fire-and-forget) so the just-written row doesn't show in the same visit's table — the next visit will. The bill's history is auditable itself.
- **The 404 panel preserves the chrome.** A bill id that doesn't exist for this user (deleted, or another user's bill) renders a 404 panel inside the page rather than a hard Next.js 404, so the PageHead + back-links stay visible. The audit log's empty-state pattern is the model.
- **Deep-links wired in two places.** The `/vault/audit` table row's `// when` cell becomes a `<Link>` to the bill's history when `payload.billId` is set, with the `?type=` filter preserved for state-change + payment outcome rows. The `/vault` bill list's bill name becomes a link. The `billHistoryHrefForAuditRow` helper in `audit-log.ts` is the single source of truth for the deep-link shape.
- **The 4-cell summary has growth-oriented suggestion chips.** Per the xKryptic 2026-08-24 directive, every cell has a clickable suggestion: `[OPEN EVENT →]`, `[TIMELINE →]`, `[FILTER →]`. These deep-link to other parts of the same page (anchor links) or filter the table.
- **The state stepper is visual-first.** Per the xKryptic 2026-08-23 directive, the 5 happy-path states (EARNING → FUNDED → PREPARING → EXECUTING → SETTLED) are connected nodes with transition counts; the 4 alternate states (ACTION REQUIRED / PAY MANUALLY / PAUSED / CANCELLED) are shown as a row of branch badges only if visited. Current state pulses.
- **The per-bill audit log query is bounded.** A bill accumulates ~10s of events over its lifetime. The query narrows the DB to the 12 actionTypes that can carry a `billId`, then post-filters in JS. Cheap and robust. (Future optimization if a bill ever has 1000+ events: index the `payload` column or switch to Postgres JSONB.)
- **The smoke is self-contained.** `tests/smoke-bill-history.mjs` writes a sentinel Envelope + VaultEnvelope + ScheduledBill + 3 sentinel audit events directly via the shared Prisma client so the page is guaranteed to have data to render. Idempotent across re-runs (the sentinel Envelope is upserted by a stable id, and the sentinel events are deleted-then-recreated at the start of each run).
- **The `payload` column is `String`, not JSON.** Prisma's `payload: { path: ['billId'], equals: billId }` JSON filter only works for `Json` columns; our column is `String`. We post-filter in JS over the parsed payload. The bill's audit set is bounded (~10s of rows per bill) so the JS cost is negligible.
- **Per-bill auth scoping is enforced via `vault: { userId }`.** The bill lookup is `prisma.scheduledBill.findFirst({ where: { id: billId, vault: { userId } } })`, NOT `findUnique` (which would 500 on a bill that exists for another user). A bill id from another user's vault returns null and the page renders a 404 panel.

## Recent change worth knowing about (Cluster 7.4)

- **Audit log is now an end-user surface.** Every setter in the vault (and earlier: the auto-allocate engine, onboarding agent, plan editor) writes an `AuditLog` row. `src/lib/vault/audit-log.ts` is the new data layer for reads; `recordVaultAudit` in `src/lib/vault/db.ts` is the only writer (the `actionType` union there is TS-only — Prisma's column is `String`).
- **`vault.audit_log_viewed` is a meta event.** Every render of `/vault/audit` writes one row with `{ filter, at }`. The write happens AFTER the read (fire-and-forget) so the just-written row doesn't show in the same visit's table — the next visit will. This is the audit-the-audited pattern; a user can see "I opened the audit log at 2:14pm" in the stream.
- **Per-type color is stable across renders.** `colorForActionType` (djb2 hash → 10-color vessel palette) maps any actionType to one of `var(--vessel-accent)`, `var(--ok)`, `var(--vessel-gold)`, `var(--vessel-watch)`, `var(--vessel-over)`, `var(--terminal-cyan)`, `var(--ink-2)`, `var(--ink-3)`, `var(--jupiter)`, `var(--mars)`. The same color shows up in the type distribution segment AND the table chip — so the user builds a "type signature" by color over time. The same palette is reused on the bill history page's `BillEventTable` chips (Cluster 7.5) — the same actionType shows the same color across both surfaces.
- **The URL is the source of truth for filtering.** `?type=`, `?prefix=`, `?q=`, `?take=` (default 50, max 200). All filter pills + segments are `<Link>` elements that change the URL. The 4-cell headline strip always shows the UNFILTERED total + this-week (so the user always sees the full picture); the activity strip + type distribution + table all respect the filter. Combinations are AND.
- **The smoke is self-contained.** `tests/smoke-audit-log.mjs` writes a `smoke.test_audit_event` sentinel row directly via the shared Prisma client so the page is guaranteed to have 3 rows to render regardless of what prior smokes left in the user's audit log. This avoids the timing issue we hit during dev where the page rendered the empty state because mom@compass.local's audit log had been wiped by a prior test path.
- **Pre-existing inconsistency noted (not in scope of this cluster):** `.env.production.example` documents `VAULT_SIGNER_KEY` (the name `prod.ts` checks), but the actual deploy code in `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A production deploy using the example as-is will never get a usable signer. This is a follow-on to fix in a "prod-env-var-naming-consistency" cluster.

---

## Live state (verify these before touching anything)

```powershell
# 1. Commit
git log -1 --oneline    # should be the new Cluster 7.5 commit (on top of ed4129b)

# 2. Dev server (Next.js, port 3000)
netstat -ano | Select-String ":3000.*LISTENING"

# 3. Postgres (Docker container, port 5433 — see gotcha below)
docker ps --filter "name=compass_dev_pg"

# 4. Health endpoint
curl http://127.0.0.1:3000/api/health | ConvertFrom-Json
#   expect: status=ok, env=development, db.migrationStatus=pushed, db.ok=true

# 5. (Optional) Dev scheduler (Cluster 6.0)
#    pnpm cron:dev   # 30s poll; one log line per fire

# 6. (Optional) /vault/audit
#    Visit http://127.0.0.1:3000/vault/audit (signed in) — should
#    render 4-cell headline + 30-day strip + type distribution +
#    filter pills + table (newest first). The // when cell on any
#    row with a payload.billId is a deep-link to that bill's
#    /vault/bills/<id>/history.

# 7. (Optional) /vault/bills/<id>/history
#    Visit http://127.0.0.1:3000/vault/bills/<id>/history (signed in) —
#    should render the 4 sections: BillHeader (name + amount + state
#    badge), BillSummaryStrip (4 cells with suggestion chips),
#    BillTimeline (5 happy-path state nodes with transition counts +
#    4 alternate-state badges if visited), BillEventTable (newest
#    first, payload <details> per row).
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
| **Audit log viewer (C7.4)** | `src/app/(app)/vault/audit/{page,ActivityStrip,AuditTable,AuditHeadlineStrip,TypeDistribution,TypeFilterPills}.tsx` + `src/lib/vault/audit-log.ts` |
| **Audit log smoke (C7.4)** | `tests/smoke-audit-log.mjs` (35 checks) |
| **Per-bill audit drill-down (C7.5)** | `src/app/(app)/vault/bills/[id]/history/{page,BillHeader,BillSummaryStrip,BillTimeline,BillEventTable}.tsx` + data layer in `src/lib/vault/audit-log.ts` (`getBillByIdForUser`, `getBillAuditLog`, `getBillAuditSummary`, `recordBillHistoryViewed`, `billHistoryHrefForAuditRow`) |
| **Bill history smoke (C7.5)** | `tests/smoke-bill-history.mjs` (46 checks) |
| Off-ramp picker (C7.3) | `src/components/vault/OffRampProviderPicker.tsx` + `src/lib/vault/spritz-client.ts` |
| Smoke scripts | `tests/smoke-*.mjs` (31 files) + `tests/integration-vault.mjs` (now includes M5 phase) + `tests/smoke-deploy.mjs` |
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

10. **.env.local was restored from .env.local.example during Cluster 7.4.** The Mavis API key (MAVIS_API_KEY) was lost. The DATABASE_URL is back to the correct Postgres value, but the Mavis key needs to be re-pasted. All smokes run with LLM_PROVIDER="mock" so the suite passes either way. See "Recovery" for the full .env.local block.

---

## Smoke status (the green baseline)

All 31 smokes must be green before any new cluster ships. Run them via `pnpm`:

```bash
pnpm smoke              # data-layer smokes (16 incl. auth + audit-log + bill-history)
pnpm smoke:ui           # UI / page-render smokes (13)
pnpm smoke:integration  # integration-vault (170 checks, +8 from M5)
pnpm smoke:all          # all of the above (single command, since commit e23503c)
pnpm smoke:deploy       # 95 deploy-readiness checks (file + live)
pnpm tsc                # type check
```

Baseline numbers (verified 2026-08-30 00:55 CDT on Cluster 7.5):
- 16 data-layer smokes: auth, accounts-db 53, allocation-db 36, bills-db 36, envelopes-db 29, goals-db 28, insights-db 23, vault-scheduler 55, vault 77, vault-prefs 66, off-ramp-picker 35, command-palette 77, onboarding-agent 108, advisor 78, audit-log 35, **bill-history 46 (NEW)**
- 13 UI smokes: 22, 70, 7, 32, 36, 14, 46, 5, 8, 63, 102, 7, 20 checks
- integration-vault: **170** checks (was 163, +8 from M5)
- smoke-deploy: **95** checks
- tsc: clean

Total: **~1,494 checks** across 31 suites. CI runs them in ~3-5 min on a Linux runner with a Postgres service container.

### Dev scheduler (Cluster 6.0)

A long-running Node process polls `POST /api/cron/vault` every 30s and logs one line per fire. Start it with `pnpm cron:dev`. It auto-skips when no schedules are due, and gracefully summarizes on SIGINT. In production, the same `/api/cron/vault` endpoint is hit by Vercel cron (or any external scheduler); set `CRON_SECRET` to require bearer auth on the route.

## Next cluster (TBD — pick from candidates below)

Cluster 7.5 (per-bill audit drill-down) shipped 2026-08-30. The handoff is open-ended; pick from the candidates below based on what the user asks for or what's highest-value next.

### Recommended: Real-time audit log updates (SSE) — visible UI, no schema change

**Cluster 7.6 candidate — Real-time audit log updates (SSE/WebSocket).** Add `/api/vault/audit/stream` that pushes new rows as they're written. The `/vault/audit` page subscribes via `EventSource` and prepends new rows to the table. The `/vault/bills/[id]/history` page can subscribe to the same stream filtered by `payload.billId`. The bill schedule, the dashboard's "last 24h" KPI, and the vault's "last activity" chip can all subscribe to the same source.

- **Visible-UI; no schema change, but new infra.** Per the "visible UI matters more than invisible architecture" preference (xKryptic, 2026-08-22), this is the highest visible-UI payoff for the next cluster.
- The `EventSource` API is built into Next.js's route handlers (response streaming). The smoke is straightforward: trigger a write via the shared Prisma client, then verify the event shows up in the SSE response within ~1s.
- The audit log has 20+ event types accumulated since Cluster 2.0; users will see live updates as they happen.
- The same SSE stream can power a future "live activity ticker" in the sidebar.

### Other candidates (still good, lower priority)

**Cluster 7.6 candidate B — Audit log retention / archival.** A "vault.audit_log_pruned" cron that rolls up old events into daily summary rows. The activity strip would show aggregated counts per day. **More infrastructure; less visible-UI.** A pre-cluster: add a date range filter to `/vault/audit` (e.g. `?from=YYYY-MM-DD&to=YYYY-MM-DD`) so the user can scope to the last week / month / year. Visible-UI; small surface area.

**Cluster 7.6 candidate C — Prod-env var naming consistency.** `.env.production.example` uses `VAULT_SIGNER_KEY` (the name `prod.ts` checks) but `safe-deploy.ts` actually reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. A prod deploy using the example as-is will never get a usable signer. Trivial fix (alias or rename), but it changes every smoke + every deploy script. **Invisible infra; 30 min of work + smoke updates.**

**Cluster 7.6 candidate D — Real Spritz sandbox creds.** xKryptic signs up at sdk.spritz.finance, gets a sandbox key, adds `SPRITZ_INTEGRATION_KEY=...` and `SPRITZ_SANDBOX=true` to `.env.local`. The chain auto-flips to live. **No code change.** Not really a "cluster" — just a config gate. Might be combined with a real-mainnet-deploy cluster.

**Cluster 7.6 candidate E — Real mainnet deploy.** Cluster 6.0.1 wired mainnet; the chain table, the addresses, the env block, the prod check, the API endpoint, the smoke are all green. But no real mainnet deploy was performed. The deployer EOA needs real ETH on Base; xKryptic creates + funds it. Cluster 6.0.2 ("Forked-mainnet deploy test") would add a `anvil --fork-base` or Tenderly integration so the full deploy + supply + withdraw flow can be exercised end-to-end without spending real ETH.

**Cluster 7.6 candidate F — Per-bill off-ramp provider override UI.** The data shape exists (`ScheduledBill.providerPreference`); the picker in `/vault/preferences` is a single user-level value. Per-bill overrides stay in the bill editor for a future cluster.

**Cluster 7.6 candidate G — Refund / dispute flow.** The existing `Manual Push` adapter's error path is the contract; a real adapter just maps the same error states.

**Cluster 7.6 candidate H — Multi-sig / threshold changes.** Current spec is a 1-of-1 Safe. Multi-sig is a future cluster.

**Cluster 7.6 candidate I — Other chains (Optimism, Arbitrum, Polygon).** The chain table is a clean place to add more. Deferred to a "Multi-chain vault" cluster.

**Cluster 7.6 candidate J — Real Monto adapter.** Cluster 7.3 wired Spritz; Monto stays a stub. The gateway is provider-agnostic; the swap is a 1-file change in `src/lib/vault/spritz-client.ts` (rename to `off-ramp-client.ts`, add the Monto SDK).

**Cluster 7.6 candidate K — Real fiat bank-account linking.** The off-ramp delivers USDC to the wallet; the user is responsible for off-ramping to a bank themselves in v1. A future cluster can integrate Plaid + the Spritz bank-account-link flow.

**Cluster 7.6 candidate L — Dynamic Pool address resolution.** Currently the Aave V3 Pool address is hardcoded per chain. Cluster 6.0.2 (forked-mainnet) should resolve dynamically via `PoolAddressesProvider.getPool()` so an Aave upgrade doesn't need a code change.

**Cluster 7.6 candidate M — Prisma migration history.** Currently the schema is pushed via `prisma db push`. Production should run `prisma migrate dev` once to seed `_prisma_migrations` so the health endpoint can report `migrationStatus: current` instead of `pushed`.

### Recent change worth knowing about (Cluster 7.0.1 / 7.1)

- **The chain table is the only place to add new chains.** `src/lib/vault/safe-deploy.ts:CHAIN_TABLE` and `src/lib/vault/aave.ts:AAVE_CHAIN_TABLE` are the source of truth for "which chains are wired." Add a row to both, and every deploy/supply/withdraw flow picks it up. The two tables share a `chainId` key — keep them in sync.
- **`aUSDC is NOT in the table** — it is resolved dynamically via `Pool.getReserveData(asset).aTokenAddress`. This means a future Aave market upgrade (e.g. a new Pool implementation) keeps the value correct without a code change. The trade-off is the dynamic read needs a working RPC.
- **`/api/vault/chain-config` is intentionally public.** No secrets in the response (no RPC URL with API key, no signer key, no DB info). The smoke hits it to verify wiring without importing `.ts` from `.mjs`. If you ever add secrets to the response, **remove the `/api/vault/chain-config` entry from `PUBLIC_PREFIXES` in `src/middleware.ts`** immediately. The smoke-deploy check guards against accidental removal.
- **`prod.ts` refuses `VAULT_CHAIN_ID=84532` in production.** A misconfigured prod deploy with the testnet chainId would otherwise succeed (deploy goes through, supply goes through) but every transaction touches valueless USDC. The check is a one-line addition to `FORBIDDEN_IN_PROD`; add the same shape for future prod-only forbiddens.

### Recent change worth knowing about (Cluster 6.0)

- **The chain table is the only place to add new chains.** Already covered in the "Recent change worth knowing about" section above (Cluster 7.0.1 inherited this from 7.0.1).
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

### Restoring .env.local (Mavis key was lost in Cluster 7.4)

If the user wants to use the production-grade Mavis provider for onboarding, the Mavis API key needs to be re-pasted into `.env.local`. The minimum required values for local dev (with `LLM_PROVIDER="mock"`, which is what the smokes use):

```env
# Core (REQUIRED for the dev server to even start)
DATABASE_URL="postgresql://compass:compass@localhost:5433/compass_dev"
LLM_PROVIDER="mock"
LLM_PROVIDER_ADVISOR="ollama"

# Compass AI provider (the plugin registry reads these; defaults
# match .env if you don't override)
COMPASS_AI_PROVIDER="mavis-internal"
COMPASS_AI_MAVIS_BASE_URL="http://127.0.0.1:52100"
COMPASS_AI_MAVIS_API_KEY="sk-replace-me"
COMPASS_AI_OLLAMA_BASE_URL="http://127.0.0.1:11434"
COMPASS_AI_OLLAMA_MODEL="llama3.1"

# Vault testnet (default)
VAULT_CHAIN_ID="84532"

# For Mavis production-grade onboarding, paste the Mavis key here:
# MAVIS_API_KEY="sk-paste-the-real-key-here"
# MAVIS_API_BASE="https://api.MiniMax.com/v1"
# MAVIS_MODEL="MiniMax-M3"
# LLM_PROVIDER="mavis"
```

The `.env.local.example` file is the canonical contract. `Copy-Item .env.local.example .env.local` gives you the full template with all commented options; uncomment + fill what you need.

---

## What was NOT done (intentionally)

These are follow-on clusters the user might want next:

- **Real-time audit log updates** — see Option A in the candidates above. The `AuditLog` table has 20+ event types accumulated since Cluster 2.0; users want live updates. The `/vault/bills/[id]/history` page (7.5) can subscribe to the same SSE stream filtered by `payload.billId`.
- ~~**Per-bill audit drill-down** — see Option B above. A click on a `vault.payment_settled` row should deep-link to `/vault/bills/[id]/history`.~~ **SHIPPED 2026-08-30 (Cluster 7.5).**
- **Audit log retention / archival** — see Option C in the candidates above. A `vault.audit_log_pruned` cron that rolls up old events into daily summary rows.
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
- **Refund / dispute flow** — the existing `Manual Push` adapter's error path is the contract; a real adapter just maps the same error states. Future cluster.

---

## How to start the next cluster (recommended)

1. Read `COORDINATION.md` end-to-end (especially the "Last update" line — that's the current headline).
2. Read this file.
3. Run `pnpm smoke:all` to confirm the baseline is green before you start.
4. Pick a cluster from the spec / from the user's request.
5. Write the spec for the cluster into a `00-CLUSTER-X.Y.md` file (or update an existing one) so the new session has a written contract.
6. Build, smoke, commit, update COORDINATION.md "Last update".

**Don't** pick up the work in this session — start a new one. The context here is heavy (this whole session is the Postgres-everywhere + off-ramp-picker + Spritz-wiring + audit-log-viewer cluster chain), and the user has a "fresh session, clean handoff" preference (see agent memory). The next session will read this file + COORDINATION.md and have what it needs.
