# Compass

> Your money, guided.

A modular, AI-aware personal-finance / treasury app. Built **for** a real person (a non-technical user — xKryptic's mom) but **to** a world-class standard that any serious budgeter would want.

> **Status**: Stage 2 of 16 in progress. Scaffold complete; auth is next. See [`COORDINATION.md`](./COORDINATION.md) for the build order and `00-DESIGN.md` for the locked spec.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.9** (strict + extras)
- **Tailwind v4** + **shadcn/ui** (Base UI preset)
- **Prisma 7** + **SQLite** (via `better-sqlite3` driver adapter — Postgres-ready)
- **TanStack Query** (client cache) + **Zustand** (client state)
- **dnd-kit** (drag-and-drop) + **Recharts** (charts) + **Zod** (validation)
- **Plugin architecture** (`src/plugins/`) for swappable AI providers, import formats, and widgets

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Copy env contract
cp .env.example .env
# Edit .env to point COMPASS_AI_MAVIS_BASE_URL / COMPASS_AI_OLLAMA_BASE_URL
# at a real AI provider, or leave as-is for the scaffold (AI will show as degraded
# in /api/health — that's fine for early dev).

# 3. Run the database
# (The first migration is already applied at scaffold time. After schema changes:)
npx prisma migrate dev

# 4. Start dev
pnpm dev
# → http://localhost:3000
```

## Project layout

```
src/
  app/                # App Router routes + API endpoints
  components/ui/      # shadcn primitives (Button, Card, Separator, ...)
  lib/                # Cross-cutting utilities (config, json, cn)
  server/             # Server-only (Prisma client, auth, services)
  plugins/            # The plugin layer (see below)
  generated/prisma/   # Generated Prisma client (don't edit)

prisma/
  schema.prisma       # Data model (User only at scaffold; expands in Step 3)
  migrations/         # Versioned SQL migrations
```

## The plugin layer

Three plugin registries, all under `src/plugins/`:

- **`ai/`** — AI providers (Mavis internal, Ollama). Config-driven via `COMPASS_AI_PROVIDER` in `.env`. Feature code calls `getAiProvider()`, never a vendor URL directly.
- **`import/`** — Import format plugins (CSV in v1; OFX/QIF/PDF future). Empty registry at scaffold; CSV lands in Step 8.
- **`widget/`** — Dashboard widgets (QuickAdd, NetWorth, etc.). Empty registry at scaffold; widgets land with their features.

## Health check

```bash
curl http://localhost:3000/api/health
# 200 = all systems go
# 503 = degraded (db.ok=true but ai.ok=false means the AI provider isn't reachable)
```

## Docs

- [`00-DESIGN.md`](./00-DESIGN.md) — the locked design spec (vision, data model, features, stack)
- [`COORDINATION.md`](./COORDINATION.md) — handoff contract between sessions, build order, decision revisions
- [`AGENTS.md`](./AGENTS.md) — project-local guidance for AI coding agents
