# Compass

> Your money, guided.

A modular, AI-aware personal-finance / treasury app. Built **for** a real person (a non-technical user) but **to** a world-class standard that any serious budgeter would want.

**Status**: shipped and running in production for a single real user. 51 spec'd clusters are in [`docs/archive/clusters/`](./docs/archive/clusters/); the working handoff is [`HANDOVER-TEST-INTEGRITY.md`](./HANDOVER-TEST-INTEGRITY.md), the build order is [`COORDINATION.md`](./COORDINATION.md), and the locked design is [`00-DESIGN.md`](./00-DESIGN.md).

## Stack

- **Next.js 16.3** (App Router) + **React 19.2** + **TypeScript 5** (`strict` + `noUncheckedIndexedAccess`)
- **Tailwind v4** + **Base UI / shadcn-style** primitives
- **PostgreSQL** via **Prisma 7** — dev in Docker, production on Neon
- **viem** + **@safe-global/protocol-kit** — on-chain vault (Safe multisig → Aave v3)
- **TanStack Query** (client cache), **Zustand** (client state), **Zod** (validation)
- **@node-rs/argon2** for password hashing; Postgres-backed login throttling
- **Plugin architecture** (`src/plugins/`) for swappable AI providers, import formats, and widgets

> A SQLite adapter (`@prisma/adapter-better-sqlite3`) is still present in the dependency tree, but the schema datasource is `postgresql` and every deployed environment is Postgres. Treat SQLite as vestigial.

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env contract
cp .env.example .env
cp .env.local.example .env.local
# .env.local is git-ignored and holds your machine-local overrides.

# 3. Database (Docker Postgres)
pnpm db:up
pnpm db:migrate:deploy

# 4. Dev
pnpm dev            # → http://localhost:3000
```

### ⚠️ `.env` and `.env.local` point at different databases

This trips up every new session, so it is worth stating plainly:

| File | Points at | Use |
|---|---|---|
| `.env` | `localhost:5433` — the Docker container `compass_dev_pg` | read by the **Prisma CLI** |
| `.env.local` | `localhost:5432` — native PostgreSQL 18 | read by **Next.js at runtime** |

Port 5433 is used by the container because native Postgres already binds 5432 on this host.

Consequence: a bare `pnpm db:migrate:deploy` migrates the **container**, while the app and the smoke suite talk to **5432**. If the two ever drift, migrations land where nothing reads them. Set `DATABASE_URL` explicitly to the 5432 URL before running any migration you actually want applied:

```powershell
$env:DATABASE_URL = "postgresql://compass:compass@localhost:5432/compass_dev"
pnpm db:migrate:deploy
```

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | `prisma generate` + `next build` |
| `pnpm start` | serve the prod build |
| `pnpm tsc` / `pnpm lint` | typecheck / lint |
| `pnpm db:up` / `db:down` | Docker Postgres lifecycle |
| `pnpm db:migrate` / `db:migrate:deploy` | dev / deploy migrations |
| `pnpm db:generate` | regenerate the Prisma client (output is **git-ignored**) |
| `pnpm db:reset` | destroy the DB volume and rebuild from migrations |
| `pnpm seed:admin` | create the admin account |
| `pnpm smoke` | data-layer smokes (57 scripts) |
| `pnpm smoke:ui` | page-render smokes (13) |
| `pnpm smoke:integration` | cross-layer vault integration (368 checks) |
| `pnpm smoke:deploy` | deploy-readiness assertions (146 checks) |
| `pnpm smoke:all` | all four, in order |
| `pnpm smoke:all:server` | build + `next start` + full suite (see caveats below) |
| `pnpm cron:dev` | local cron poller |

### Smoke-suite caveats (learned the hard way)

- The smokes need a **running server**. Either start one yourself, or set `SMOKE_REQUIRE_SERVER=1` and provide it.
- The suite reads **`COMPASS_SANDBOX` from its own environment** as well as the server's. `tests/smoke-advisor.mjs` asserts a 307 *or* a 200 depending on that flag, so run it with the same env the server has, or it will fail spuriously.
- On Windows, `pnpm smoke:all:server` is broken: it reports `build failed (exit=null)`. `scripts/smoke-server.mjs` also always rebuilds (`void needBuild;` discards the reuse branch), and `spawnSync("pnpm", …)` returns `status: null` because pnpm is a `.cmd`/`.ps1` shim.
- Under the full `&&` chain, long runs can drop a socket (`ECONNRESET`) even though the server is healthy. Re-run the single script before believing it.

## Project layout

```
src/
  app/                # App Router routes + API endpoints
  components/ui/      # UI primitives
  lib/                # Cross-cutting utilities (config, json, cn)
    env/              # env contract + validateProdEnv
    vault/            # Safe/Aave vault (limits, safe-guard, scheduler)
  server/             # Server-only (Prisma client, auth, services)
    auth/             # rate-limit (DB-backed login throttling)
  plugins/            # Plugin layer (AI / import / widget registries)
  generated/prisma/   # GENERATED — git-ignored, run `pnpm db:generate`

prisma/
  schema.prisma       # Data model (source of truth)
  migrations/         # Versioned SQL migrations

docs/
  compass-vision.md   # Vision + design language
  archive/
    clusters/         # 45 per-cluster specs (historical)
    handovers/        # superseded handoffs and briefs (historical)

tests/                # smoke suite (~70 scripts)
scripts/              # dev tooling (seed, cron, encoding scanner)
```

## Security model

Deliberate, load-bearing choices — please don't undo them casually.

**Dev/test routes are gated, never public.** `/api/dev*` and `/api/dev-agent` are reachable only when `src/lib/env/sandbox.ts` reports dev routes enabled: `NODE_ENV=development`, or `COMPASS_SANDBOX=1` **and not on Vercel**. The middleware does not treat them as public prefixes. `validateProdEnv()` hard-fails a production boot that has `COMPASS_SANDBOX=1` on Vercel.

**Cron routes fail closed.** `/api/cron/{vault,paychecks,audit-log-prune}` require a bearer token compared in constant time. If `CRON_SECRET` is unset in production the route returns **503 rather than running** — these move money and prune data for every user. Set `CRON_SECRET` in the Vercel project or the bill scheduler will not fire.

**Login is throttled, DB-backed.** 10 failures / 15 min per account, 20 per client IP, stored in Postgres so it survives serverless cold starts. Unknown emails are counted too, so responses never reveal which accounts exist. It fails *open* on a database error, so apply the migration before relying on it.

**The vault signs through an allowlist.** The server EOA is sole owner of every Safe, so `executeSafeTransaction` is the single choke point and `src/lib/vault/safe-guard.ts` refuses anything except USDC.approve to the Aave Pool, `Pool.supply`, and `Pool.withdraw` — with every recipient pinned to that user's own Safe, and no ETH value.

**Spend caps are enforced in code.** Default $10,000 for both fund and deposit, overridable via `VAULT_FUND_MAX_CENTS` / `VAULT_DEPOSIT_MAX_CENTS`.

**The signer variable is `VAULT_SAFE_SIGNER_PRIVATE_KEY`.** The legacy `VAULT_SIGNER_KEY` is *not* read by the signing code. There is deliberately no fallback: honouring the old name would silently enable a signer in any environment that still has it set.

## Health check

```bash
curl http://localhost:3000/api/health
# 200 = all good
# 503 = degraded; inspect `checks` — a local box without network or a real
#       AI key reports ai.ok=false, which is expected and harmless
```

## Docs

- [`00-DESIGN.md`](./00-DESIGN.md) — the locked design spec
- [`00-VISION.md`](./00-VISION.md) — vision, design language, visual-first directive
- [`COORDINATION.md`](./COORDINATION.md) — build order + decision log
- [`HANDOVER-TEST-INTEGRITY.md`](./HANDOVER-TEST-INTEGRITY.md) — current working handover
- [`00-MOM-LAUNCH-RUNBOOK.md`](./00-MOM-LAUNCH-RUNBOOK.md) — external-account launch runbook
- [`AGENTS.md`](./AGENTS.md) — project-local guidance for AI coding agents
- [`docs/archive/`](./docs/archive/) — historical specs and handoffs
- [`compass-landing/`](./compass-landing/) — public marketing site (static, no build)
