# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete
- **Stage 2 (Creation)**: 🟡 Step 1 of 16 (scaffold) — ✅ done. Steps 2–16 pending.
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-22 (post-scaffold)

---

## Spec (read this first)

The full design spec is at **`00-DESIGN.md` v1.0**. It is the contract for every feature, page, and decision in the app. Read it before you write any code.

Key sections to load into context:
- **Brand** (top): Name = **Compass**; Tagline = *Your money, guided.*
- **Section 0** — Vision
- **Section 2** — Core concepts (Accounts, Envelopes, Transactions, Rules, Views, Widgets, AI Tier, Audit Log, Routing Level)
- **Section 3** — Feature surface by AI tier (0/1/2/3)
- **Section 4** — Layout customization (widget registry, slots, drag-drop, saveable views)
- **Section 5** — L1 routing + rules engine
- **Section 5a** — Plugin architecture
- **Section 6** — Data model
- **Section 7** — Pages & routes
- **Section 8** — Tech stack
- **Section 9** — Implementation order (16 steps)
- **Section 13** — Stage 2 starting point

---

## Locked decisions (D1–D10 from the spec)

- **D1** Primary user: xKryptic's mom, world-class bar
- **D2** AI: per-user tier (0/1/2/3), user picks
- **D3** Layout: modular widget system + drag-drop + saveable views, **structural from day one**
- **D4** Routing in v1: **L1** (planned routing with rules engine)
- **D5** AI provider: **Mavis internal primary + Ollama local fallback**, swappable via plugin abstraction
- **D6** Name: **Compass**
- **D7** Auth: email + password (hashed), single-user, simple
- **D8** Design vibe: **Airtable-meets-treasury** — dense, data-first, every column/section configurable
- **D9** Mobile: PWA-ready, native deferred
- **D10** Stack: **Next.js 16 monolith + plugin architecture + API routes for external integrations**

Do not re-litigate these in the next session. If you discover a real conflict, surface it in this file as a "Decision revision" entry rather than silently changing course.

---

## Stage 2 — Start here

Begin with **scaffold** (per Section 9, step 1) and work the 16 steps in order. Each step is a milestone; ship each one before moving on.

1. **Scaffold** — Next.js 16, Tailwind v4, shadcn/ui, Prisma + SQLite, TanStack Query, dnd-kit, Recharts, plugin registry skeleton.
2. **Auth** — email + password (argon2id), single-user, session-based.
3. **Core data model + migrations** — User, Account, Envelope, Transaction, Rule, View, AuditLog, ImportBatch.
4. **Plugin registry** — AI provider, import format, widget plugin interfaces. Wire Mavis internal + Ollama adapters via config.
5. **Manual transaction entry** + accounts + envelopes CRUD.
6. **Dashboard with 3 starter widgets** (no drag-drop yet): NetWorth, RecentTransactions, QuickAdd.
7. **Layout customization system** — widget registry, slot system, drag-drop, save views. *Structural milestone — gets its own QA pass.*
8. **CSV import** + recurring detection.
9. **Allocation rules engine** (L1 routing) — DSL-light, dry-run, audit log, conflict resolution.
10. **AI Tier 1** — chat, smart categorize, natural-language search.
11. **AI Tier 2** — insights, anomaly, forecast, what-if, monthly narrative.
12. **AI Tier 3** — autonomous actions + audit log.
13. **Reports & charts** (deeper than the dashboard widgets).
14. **Mobile PWA polish** — install prompt, offline-first basics.
15. **Plaid (L2 routing)** — future.
16. **Hardening + tests** — Stage 3 prep.

### Acceptance for "Stage 2 step 1 (scaffold) done"

- [x] `create-next-app` runs with the right flags (TS, App Router, Tailwind, src/).
- [x] `package.json` name is `compass`.
- [x] Tailwind v4 configured (no v3 leftovers).
- [x] shadcn/ui initialized; base theme applied.
- [x] Prisma + SQLite initialized; `prisma migrate dev` runs.
- [x] TanStack Query provider wired at the root.
- [x] dnd-kit installed (not yet used in UI).
- [x] Recharts installed (not yet used in UI).
- [x] Plugin registry directory + base interface files exist (`src/plugins/ai/types.ts`, etc.).
- [x] `pnpm dev` (or `npm run dev`) starts on localhost; default route renders a clean "Compass" landing placeholder.
- [x] `pnpm build` succeeds with no TypeScript errors.
- [x] Lint passes.
- [x] Git initialized; initial commit with the design + coordination files committed first.

> All scaffold acceptance items green as of 2026-08-22.

---

## Decision revisions (cumulative)

### 2026-08-22 — shadcn/ui: Base UI primitives instead of Radix UI

- **Spec said**: "Tailwind v4 + shadcn/ui + **Radix UI primitives**" (D8 / Section 8).
- **What we shipped**: shadcn's *new* preset (`base-nova`), which uses **Base UI** (the new Radix successor from the same team) instead of classic Radix UI primitives.
- **Why**: shadcn (the project) has migrated to Base UI as of 2025–2026. The new shadcn ships with a Base UI–based Button, Card, etc. The component API, theming, and accessibility behavior are equivalent; Base UI is the actively-maintained successor. The visual output is the same shadcn/ui.
- **Risk**: if you wanted *classic* shadcn/ui (the older Radix variant), the components use a different import (`@radix-ui/react-slot` → `asChild`) and a different state-management layer. Switching now would mean re-running `shadcn add` for every component we add, on a `--base radix` registry.
- **Decision (xKryptic, 2026-08-22)**: **keep Base UI shadcn for v1.** No Radix swap. The composition idiom is `className={cn(buttonVariants({ variant, size }))}` on a Link / native element, not `<Button asChild>`. Documented in `AGENTS.md` for the next session.

### 2026-08-22 — Prisma 7 driver adapter + generated client at `src/generated/prisma`

- **Why the spec didn't mention this**: the spec was written against Prisma 5/6 patterns. Prisma 7 made two structural changes:
  1. `new PrismaClient({ datasourceUrl })` no longer works — a **driver adapter** is now required.
  2. The generated client must be emitted to an explicit path in your project tree (default lives in pnpm's virtual store, which TypeScript can't resolve through `@/...`).
- **What we shipped**:
  - Driver adapter: `@prisma/adapter-better-sqlite3` (file-based, fast, native Node module).
  - Schema: `generator client { output = "../src/generated/prisma" }`. Client imported as `import { PrismaClient } from "@/generated/prisma/client"`.
  - The `tsconfig.json` adds `"@/generated/*": ["./src/generated/*"]` to the path map.
- **Postgres migration later**: swap to `@prisma/adapter-pg`. That's the only change to the wiring.
- **JSON fields**: Prisma 7's `Json` type emits `JSONB` SQL, which SQLite rejects. We use `String` columns with a JSON-stringify/parse layer (`src/lib/json.ts`). The contract is identical for app code; a Postgres migration is `String` → `Json` and remove the parse helper. Flagged here so the next session doesn't waste time debugging a phantom `Json` issue.

### 2026-08-22 — Stricter tsconfig than create-next-app default

- Added: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, target bumped `ES2017` → `ES2022`.
- **Why**: spec calls for "Type safety end-to-end." The default `strict: true` is the floor, not the ceiling.
- **Impact**: any code indexing into an array gets `T | undefined`. Step 2 (auth) and onward will need to be aware of this; the scaffold already compiles clean.

---

## Scaffold state — what's on disk

- **Next.js 16.3.2** + **React 19.2.8** + **TypeScript 5.9.3** (strict + the four extra checks above).
- **Tailwind v4.3.3** via `@tailwindcss/postcss` (no `tailwind.config.ts`; v4 uses `@theme` in CSS).
- **shadcn (Base UI preset)**: Button, Card, Separator installed at `src/components/ui/`. `components.json` is the registry config.
- **Prisma 7.9.1** with `@prisma/adapter-better-sqlite3` + `better-sqlite3`. Schema at `prisma/schema.prisma`, config at `prisma.config.ts`. Generated client at `src/generated/prisma`. First migration `20260822044950_scaffold_initial_user` applied — `User` table only (Step 3 expands the data model).
- **TanStack Query 5.101** provider at `src/app/providers.tsx`, wired in the root layout.
- **Zustand 5.0** installed (not yet used; will be for client-only state like draft transactions and active view).
- **Zod 4.4** installed (used in `lib/json.ts`, plugin contracts; will be at every API boundary going forward).
- **dnd-kit** (`@dnd-kit/core` 6.3, `@dnd-kit/sortable` 10, `@dnd-kit/utilities` 3.2) installed. Not yet used in UI; lands with Step 7 (layout system).
- **Recharts 3.10** installed. Not yet used; first chart lands with the dashboard widgets (Step 6).
- **Plugin layer** under `src/plugins/`:
  - `ai/` — `types.ts` (contract), `registry.ts` (config-driven loader), `providers/mavis-internal.ts`, `providers/ollama.ts`, `index.ts` (public surface). Concrete providers are fully implemented; AI Tier 1 features consume `getAiProvider()`.
  - `import/` — `types.ts` (contract), `registry.ts` (empty; CSV lands in Step 8), `index.ts` (public surface).
  - `widget/` — `types.ts` (full widget contract: id, slot, page, component, defaultConfig, configSchema, minSize), `registry.ts` (empty; widgets land with their features), `index.ts` (public surface).
- **Landing page** at `src/app/page.tsx` — on-brand Compass placeholder. Uses the shadcn theme. A "Check API health" button points to `/api/health`.
- **Health endpoint** at `src/app/api/health/route.ts` — pings DB + AI provider, returns 200/503. Right now returns 503 with `db.ok=true, ai.ok=false` because the Mavis internal endpoint isn't running locally; that's the expected shape. Once Mavis is reachable (or you switch to Ollama), the endpoint goes green.
- **`.env`** holds the contract values (placeholder Mavis key, Ollama on 11434, SQLite path). **`.env.example`** is the safe-to-commit version.

---

## Quality bar

- **World-class / mom-grade.** No "good enough for MVP." Treat every screen, every interaction, every error state as something a serious personal-finance user would judge.
- **Accessibility from day one.** Keyboard navigation, focus states, color contrast, ARIA where it matters.
- **Type safety end-to-end.** TypeScript strict mode, Zod at API boundaries, no untracked `any`.
- **Data integrity.** Audit log for anything L1+ touches. Money math in **integer cents**, never floats.
- **Plugin-first.** AI calls, import parsers, and widget logic must go through the plugin interface. No inline vendor code in features.
- **Layout system is sacred.** The widget/slot/view system is what makes Compass different. Get it right; get it tested; don't shortcut.
- **No drift from the spec.** The spec is the contract. If you find ambiguity, update `00-DESIGN.md` AND this file, don't pick silently.

---

## Skills to load at session start

- `app-builder` — full-stack scaffolding, project detection, planning
- `ckm:ui-styling` — shadcn/ui + Tailwind patterns, theming, accessibility
- `fullstack-dev` — three-layer architecture, error handling, API design

---

## Notes for the next session

- **Workspace is in OneDrive** (`C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`). Path separators, file watchers, and dev tooling should account for that. **Cold dev-server start takes ~15s on OneDrive** (Turbopack's first scan is slow on network filesystems). Subsequent HMR is fine.
- **Host is Windows.** All build artifacts must be Windows-native. If using Codex (Linux sandbox) for any code, recreate artifacts on Windows after — Codex's Linux paths and binary names won't run natively on the Windows host.
- **Mavis internal endpoint for AI** — same pattern as Ice Depot. The adapter is already wired at `src/plugins/ai/providers/mavis-internal.ts`. Do not hardcode HTTP calls in features — go through `getAiProvider()`.
- **Single-user assumption** for now. Auth, data isolation, and account scoping can assume one user. Schema should support multi-user later without rewrite (the `user_id` foreign keys are already in the data model).
- **Mom is the test audience.** If you can't explain a feature in one sentence a non-technical person would understand, redesign the feature.
- **Fresh-session discipline** per xKryptic's preference: this handoff is the contract. Update this file with any state change, versioned, so the next handoff is clean.
- **Step 2 (auth) starting point**: the `User` model exists in `prisma/schema.prisma` and the migration is applied. Auth = add argon2id hashing, a `POST /api/auth/signup` + `POST /api/auth/login` route, a session cookie, and a `/login` page. The first user (mom) is the seed. Keep it single-user.
- **Step 3 (data model) starting point**: extend `prisma/schema.prisma` with the full spec — Account, Envelope, Transaction, Rule, View, AuditLog, ImportBatch. Money fields = `Int` (cents). Then `prisma migrate dev --name full_data_model`. The AI provider registry shouldn't need changes.
- **Don't reinstall `@prisma/client` from npm directly.** The generated client lives at `src/generated/prisma`; you import from there. Re-generating (after schema changes) is `npx prisma generate`. The `prisma` CLI handles the rest.

---

## File index (current)

- `00-DESIGN.md` — design spec v1.0 (the contract)
- `COORDINATION.md` — this file (state + handoff)
- `package.json` / `pnpm-lock.yaml` — Node deps (Next 16, React 19, Prisma 7, TanStack Query, Zustand, dnd-kit, Recharts, Zod, shadcn, base-ui, better-sqlite3, etc.)
- `tsconfig.json` — strict TS, path aliases (`@/*`, `@/generated/*`)
- `next.config.ts` — Next config (placeholder; Turbopack default)
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `eslint.config.mjs` — flat config, ignores `src/generated/**` and `.next/**`
- `components.json` — shadcn registry config (Base UI preset, neutral base color)
- `prisma/schema.prisma` — User model only; full data model lands in Step 3
- `prisma.config.ts` — Prisma 7 config (schema path, migrations path, datasource URL)
- `prisma/migrations/20260822044950_scaffold_initial_user/` — first migration
- `prisma/dev.db` — SQLite file (gitignored)
- `.env` / `.env.example` — env contract (DATABASE_URL, COMPASS_AI_*)
- `src/app/layout.tsx` — root layout (font, metadata, viewport, providers)
- `src/app/page.tsx` — Compass landing placeholder
- `src/app/providers.tsx` — TanStack Query client provider
- `src/app/globals.css` — Tailwind v4 base + shadcn theme tokens (oklch)
- `src/app/api/health/route.ts` — health endpoint (DB + AI probe)
- `src/components/ui/button.tsx`, `card.tsx`, `separator.tsx` — shadcn components
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/lib/config.ts` — typed env config (fail-fast on missing required vars)
- `src/lib/json.ts` — safe JSON parse/stringify for SQLite TEXT-as-JSON
- `src/server/db.ts` — Prisma client singleton (better-sqlite3 adapter)
- `src/plugins/ai/{types,registry,index}.ts` — AI plugin contract, config-driven registry, public surface
- `src/plugins/ai/providers/{mavis-internal,ollama}.ts` — AI adapter implementations
- `src/plugins/import/{types,registry,index}.ts` — import format plugin layer (empty registry; CSV lands in Step 8)
- `src/plugins/widget/{types,registry,index}.ts` — widget plugin layer (empty registry; widgets land in Step 7)
- `src/plugins/index.ts` — plugin barrel
- `src/generated/prisma/` — generated Prisma client (gitignored? — currently committed; revisit if it bloats the repo)

---

## How to start (suggested prompt for the new session)

> Read `00-DESIGN.md` and `COORDINATION.md` in `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app\`. Those are the locked contract for **Compass**, a personal-finance app. Stage 1 (design) is done; Stage 2 step 1 (scaffold) is done. Start at Stage 2 step 2 (auth) per `COORDINATION.md`. Load skills: `app-builder`, `ckm:ui-styling`, `fullstack-dev`. Quality bar is world-class, no shortcuts.

---

## Sign-off

- **Design locked**: 2026-08-21
- **Stage 2 step 1 (scaffold)**: ✅ 2026-08-22
- **Handed off (design)**: 2026-08-21
- **Handed off (scaffold)**: 2026-08-22
- **From session**: `mvs_77706038b3dc41f0818e43d1aca029bd` (design)
- **From session**: `mvs_0ca37adfb53b4de188d584afc12df309` (scaffold)
- **Handed to**: next session (TBD) — start at Step 2 (auth)
