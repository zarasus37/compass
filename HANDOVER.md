# Compass — Fresh-Session Handoff

**Date**: 2026-08-28 23:45 CDT
**Last commit**: `2080e1b` — *Cluster: Production deploy prep (2026-08-28) — Postgres-everywhere + deploy hardening.*
**Predecessor commit**: `a14f19c` (tech debt cleanup) → `509505c` (Vault 4.0 M4 off-ramp gateway)

---

## TL;DR

Compass is at a clean natural breakpoint. The latest cluster (Production deploy prep) shipped Postgres-everywhere + security headers + CI + a 68-check deploy smoke. **All 25 smokes green**, `tsc` clean, dev server live.

If you're a fresh session picking this up: read the spec, read `COORDINATION.md` end-to-end, then go. Nothing about the deploy prep is half-done.

---

## Live state (verify these before touching anything)

```powershell
# 1. Commit
git log -1 --oneline    # should be 2080e1b

# 2. Dev server (Next.js, port 3000)
netstat -ano | Select-String ":3000.*LISTENING"

# 3. Postgres (Docker container, port 5433 — see gotcha below)
docker ps --filter "name=compass_dev_pg"

# 4. Health endpoint
curl http://127.0.0.1:3000/api/health | ConvertFrom-Json
#   expect: status=ok, env=development, db.migrationStatus=pushed, db.ok=true
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

All 25 smokes must be green before any new cluster ships. Run them via `pnpm`:

```bash
pnpm smoke              # data-layer smokes (9)
pnpm smoke:ui           # UI / page-render smokes (13)
pnpm smoke:integration  # integration-vault (163 checks)
pnpm smoke:deploy       # 68 deploy-readiness checks (file + live)
pnpm smoke:all          # all of the above
pnpm tsc                # type check
```

Baseline numbers:
- 9 data-layer smokes: 6 include checks; advisor 78, onboarding-agent 108, vault 77
- 13 UI smokes: each ~30-50 checks
- integration-vault: **163** checks
- smoke-deploy: **68** checks
- tsc: clean

Total: ~700 checks. CI runs them in ~3-5 min on a Linux runner with a Postgres service container.

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

- **Cron/automation for vault bill-pay** — the gateway is in place (commit `509505c` + this cluster's off-ramp), but there's no scheduler yet. `OffRampGateway` is invoked manually via "Execute now" buttons on `/vault`.
- **Mainnet Vault (chainId 8453)** — wiring is in place (just set `VAULT_CHAIN_ID=8453` and the banner auto-hides) but no real protocol-kit deploy path for mainnet yet.
- **Prisma migration history** — currently the schema is pushed via `prisma db push`. Production should run `prisma migrate dev` once to seed `_prisma_migrations` so the health endpoint can report `migrationStatus: current` instead of `pushed`.
- **Real off-ramp adapters** (Spritz, Monto) — currently stubbed. The gateway is provider-agnostic; the swap is a 1-file change in `src/lib/vault/adapters.ts`.
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
