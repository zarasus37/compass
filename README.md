# Compass

Canonical workspace: `C:\dev\compass` (WSL: `/mnt/c/dev/compass`). Do not work in the OneDrive copy.

Your money, guided. Personal financial planning and automation built for a nontechnical daily user.

Start at [COORDINATION.md](COORDINATION.md) for current status, task assignments, verification and gaps. Collaborating desktop apps must read [AGENTS.md](AGENTS.md) and [team protocol](docs/team/PROTOCOL.md). Product intent lives in [00-VISION.md](00-VISION.md); requirements in [00-DESIGN.md](00-DESIGN.md).

## Runtime and setup

Next.js App Router, React, strict TypeScript, Tailwind v4/Base UI and Prisma with PostgreSQL via PrismaPg. Exact versions: package.json and pnpm-lock.yaml. Local and hosted environments use PostgreSQL.

```bash
pnpm install --frozen-lockfile
# Create a private .env with DATABASE_URL for your local PostgreSQL.
# Use .env.local.example for the app-provider/environment contract.
pnpm db:up
pnpm db:generate
pnpm db:migrate:deploy
pnpm dev
```

Run `pnpm project:env-check` before migrations or runtime smokes. The Prisma CLI reads .env while Next can override it with .env.local; an older local setup used Docker port 5433 for the former and native PostgreSQL port 5432 for the latter. The check detects different targets without printing credentials or changing either file. Choose an explicit local DATABASE_URL for the command when they differ.

Inspect docker-compose.dev.yml for local database settings; never reuse a production database for smoke fixtures. Existing installations must review migration status before applying migrations. The app's DATABASE_URL and CLI environment must point to the same intended local database. Provider credentials are optional for basic manual budgeting; simulated/degraded modes must remain visible.

## Checks

```bash
pnpm project:check
pnpm project:test
pnpm tsc
pnpm lint
pnpm build
# HTTP checks require a healthy local server and an isolated test database.
pnpm smoke:strict
```

Do not report historical CI as current validation. See [deployment runbook](00-MOM-LAUNCH-RUNBOOK.md) and [deployment reference](VERCEL-DEPLOYMENTS.md). The [archive](docs/archive/2026-10-08/README.md) contains prior specs and handoffs. Local screenshots, video, scratch and secrets remain excluded from Git.

Code: src/app (routes/actions), src/components, src/lib, src/server, src/plugins; schema/migrations: prisma; generated client: src/generated/prisma (do not edit). Marketing site: compass-landing.

## Security and health checks

User-scoped database queries, authenticated actions and database-backed signup/login throttles protect the multi-user boundary. Cron authentication must fail closed. Safe transaction allowlists, vault spending caps and signer checks remain required. Preserve those controls when changing deployment configuration. See the implementation files and current evidence in COORDINATION.md for their limits.

`/api/health` separates process liveness from dependency readiness; a running process does not prove database or provider health. Confirm the reported target/commit and inspect dependency results when verifying a deployment. Keep the two Vercel environments separate unless explicitly assigned otherwise.

## Script reference and smoke limitations

`pnpm db:verify` verifies migrations in a disposable database; `pnpm db:verify:tenant` checks tenant migration behavior. `pnpm db:preflight` supplies the deployment preflight procedure. Read their required environment contract before running them. `pnpm smoke:strict` exists and runs scripts/smoke-strict.mjs. `pnpm smoke:server` starts the local smoke harness; `pnpm smoke:all:server` selects its full suite. These runtime checks are distinct from the coordination-only `project:test` suite.

Smoke fixtures can create/delete test rows and some legacy fixtures sweep smoke users or use fixed identifiers. Use an isolated disposable local database, never production or a database containing personal financial data. A skipped test is incomplete evidence. Source checks and simulated provider results cannot establish real payment settlement. Detailed earlier launch procedures remain in the linked dated archive and must be revalidated before use.
