# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete
- **Stage 2 (Creation)**: 🟡 Step 2 of 16 (auth) — ✅ done. Steps 3–16 pending.
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-22 (post-auth)

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

### 2026-08-22 — DB file lives at project root (`./dev.db`), not `prisma/dev.db`

- **What I expected**: SQLite URL `file:./dev.db` resolves schema-relative → `prisma/dev.db`. That matches the historical Prisma convention and how `prisma migrate dev` worked in Prisma 5/6.
- **What actually happens in Prisma 7**: with the URL passed via `prisma.config.ts` (not the schema), the path resolves *cwd-relative* — i.e. `dev.db` at the project root. The first integration test caught this when the CLI and the app opened different files.
- **What we shipped**: the app hardcodes `path.resolve(process.cwd(), "dev.db")` for the better-sqlite3 adapter. The Prisma CLI uses the same path because both run from the project root. `.gitignore` updated to match.
- **Apply**: any new Prisma tooling (seed scripts, scripts that open the DB directly) must use the same project-root `dev.db` path. The `prisma/dev.db` location is now historical — don't put anything there.

### 2026-08-22 — argon2 via `@node-rs/argon2`, not the npm `argon2` package

- **Spec said**: "Hashed with argon2id or bcrypt."
- **What we shipped**: `@node-rs/argon2` (Rust binding, N-API). The npm `argon2` package is the older native binding; `@node-rs` is the actively-maintained, faster, better-Windows-friendly successor. Same algorithm (Argon2id), same defaults (memoryCost 19 MiB, timeCost 2, parallelism 1).
- **Why this over bcrypt**: argon2id is the OWASP recommendation; bcrypt is acceptable but older. Both are fine. The win on a single-user app is that the same library handles all our hash needs going forward (e.g. envelope "lock" passphrases if we add them).
- **Library detail**: the library exports `Algorithm` as a const enum, which `isolatedModules` forbids. We don't import it — the default is already Argon2id. If we ever need a different algorithm, pass it as a numeric (the enum values are stable).

### 2026-08-22 — Server-side sessions, cookie holds a random token (not the session id)

- **Why not JWT**: JWTs can't be revoked. A leaked JWT is valid until expiry. For a personal-finance app where session compromise means read/write to your money, server-side sessions are the right call.
- **Why not the raw session id in the cookie**: if the DB leaks, session ids leak too. We store `sha256(token)` in `Session.tokenHash` and the raw token only in the cookie. DB compromise ≠ session hijack.
- **Cookie attributes**: `httpOnly`, `sameSite=lax`, `secure` (in prod), 30-day fixed TTL. No sliding window in v1; "log out everywhere" is a single `deleteMany` per user.
- **Apply**: any new code that touches auth (e.g. CSRF tokens, OAuth callbacks) goes through `createSession` / `resolveSession` / `destroySession` in `src/server/auth/session.ts`. Don't roll your own cookie logic.

### 2026-08-22 — Middleware checks cookie presence only, never the DB

- **Why**: Next.js 16 middleware runs on the Edge runtime. Prisma + the better-sqlite3 adapter don't run there. So middleware can only check for the cookie's presence; the actual session validity is re-checked by `requireUser()` in every page.
- **Trade-off**: a stale (expired, revoked) cookie makes it past the middleware. The page then redirects to /login. That's the correct behavior — middleware is a fast pre-filter, not a security boundary.
- **Defense in depth**: if you ever need real-time session revocation (e.g. a "log out everywhere" button that takes effect before the next request), the cookie presence check is fine — the page redirect happens within the same request.

### 2026-08-22 — Single-user: signup is gated to "no users exist"

- **What we shipped**: `/welcome` (create account) only shows when `countUsers() === 0`. After the first user, `/welcome` always redirects to `/login`. There's no "Sign up" link anywhere once an account exists.
- **Why**: this is a personal app on a personal device. The mom-grade UX is: set it up once, log in forever. No "create account" button to worry about. The schema is multi-user ready (`user_id` everywhere, sessions scoped per user) but the UI doesn't expose it.
- **Apply**: when we add household multi-user (future), the gate becomes "logged-in user with role=admin can create new users." Don't reopen public signup.

---

## Auth state — what's on disk (Stage 2 step 2)

- **Auth module** at `src/server/auth/`:
  - `password.ts` — argon2id hash/verify (`@node-rs/argon2`, 19 MiB / timeCost 2 / parallelism 1)
  - `session.ts` — DB-backed sessions, cookie holds random 32-byte token, DB stores `sha256(token)`. 30-day fixed TTL. httpOnly + sameSite=lax + secure-in-prod. CSRF-safe via server actions.
  - `user.ts` — `getCurrentUser`, `requireUser`, `countUsers`, `findUserByEmail`, `createFirstUser`. `getCurrentUser` is `cache()`-wrapped so multiple server components in a single render only hit the DB once.
- **Server actions** at `src/app/(auth)/actions.ts` — `signupAction`, `loginAction`, `logoutAction`. All inputs Zod-validated. Login runs a dummy `verifyPassword` when the user doesn't exist to equalize timing (defense against account enumeration).
- **Auth pages** at `src/app/(auth)/`:
  - `layout.tsx` — shared shell; redirects to / if already signed in
  - `welcome/page.tsx` — only shown when `countUsers() === 0`; else redirects to /login
  - `login/page.tsx` — only shown when ≥ 1 user exists; else redirects to /welcome
  - Both use the shared `AuthForm` client component (`src/components/auth/auth-shell.tsx`) with `useActionState` for inline error rendering
- **Middleware** at `src/middleware.ts` — Edge-runtime route guard. Checks only for cookie presence (Prisma can't run on Edge); pages re-validate with `requireUser()`. Public routes: `/login`, `/welcome`, `/api/health`, plus Next internals.
- **Home page** at `src/app/page.tsx` — now requires auth (`requireUser()`), greets the user, shows a "Sign out" form, and explains the next step.
- **Schema additions**: `Session` model (id, userId, tokenHash unique, userAgent, ip, lastSeenAt, createdAt, expiresAt, FK→User cascade delete). Indexed on `userId` and `expiresAt`. Migration `20260822051506_add_session_model`.
- **shadcn additions**: `Input` and `Label` (Base UI variants).
- **Smoke test** at `tests/smoke-auth.mjs` — 18 end-to-end checks covering: redirect chains, signup, DB user/session rows, /welcome auth-gating, /login auth-gating, logout (cookie + DB row), wrong password rejection, login success. Resets the DB before each run. Run with `node tests/smoke-auth.mjs` while the dev server is up.
- **DB file path**: now at `./dev.db` (project root), not `prisma/dev.db`. See Decision revision above. `.gitignore` updated.
- **No new env vars needed.** Sessions are self-describing (the cookie token is the secret).

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
- **Step 2 (auth) is done.** All 18 smoke checks pass. The first user is created at `/welcome` (only available when the DB is empty). Login is at `/login`. Logout is a server-action form on the home page. Sessions are DB-backed, 30-day fixed TTL, httpOnly + sameSite=lax cookies.
- **First-run setup**: when the next session wants to test from scratch, the smoke test (`node tests/smoke-auth.mjs`) resets the DB to empty and re-creates the mom user (`mom@compass.local` / `correct-horse-battery-staple`). That's the canonical "first user" for now. The first time a real human sets up the app, they go to `/welcome` and create the real account.
- **Don't reinstall `@prisma/client` from npm directly.** The generated client lives at `src/generated/prisma`; you import from there. Re-generating (after schema changes) is `npx prisma generate`. The `prisma` CLI handles the rest.

---

## File index (current)

- `00-DESIGN.md` — design spec v1.0 (the contract)
- `COORDINATION.md` — this file (state + handoff)
- `package.json` / `pnpm-lock.yaml` — Node deps (Next 16, React 19, Prisma 7, TanStack Query, Zustand, dnd-kit, Recharts, Zod, shadcn, base-ui, better-sqlite3, @node-rs/argon2, etc.)
- `tsconfig.json` — strict TS, path aliases (`@/*`, `@/generated/*`), excludes `tests/**`
- `next.config.ts` — Next config (Turbopack default)
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `eslint.config.mjs` — flat config, ignores `src/generated/**`, `tests/**`, `.next/**`
- `middleware.ts` — Edge-runtime route guard (cookie presence only)
- `components.json` — shadcn registry config (Base UI preset, neutral base color)
- `prisma/schema.prisma` — User + Session models; full data model lands in Step 3
- `prisma.config.ts` — Prisma 7 config (schema path, migrations path, datasource URL)
- `prisma/migrations/20260822044950_scaffold_initial_user/` — first migration (User)
- `prisma/migrations/20260822051506_add_session_model/` — second migration (Session)
- `dev.db` — SQLite file (gitignored, project root)
- `.env` / `.env.example` — env contract
- `src/app/layout.tsx` — root layout (font, metadata, viewport, providers)
- `src/app/page.tsx` — authed home page (greets user + sign-out)
- `src/app/providers.tsx` — TanStack Query client provider
- `src/app/globals.css` — Tailwind v4 base + shadcn theme tokens (oklch)
- `src/app/api/health/route.ts` — health endpoint (DB + AI probe)
- `src/app/(auth)/layout.tsx` — auth shell
- `src/app/(auth)/actions.ts` — signup, login, logout server actions (Zod-validated)
- `src/app/(auth)/welcome/page.tsx` — create-account (only when zero users)
- `src/app/(auth)/login/page.tsx` — sign-in (only when ≥1 user)
- `src/components/ui/{button,card,separator,input,label}.tsx` — shadcn primitives
- `src/components/auth/auth-shell.tsx` — shared client form (useActionState + inline errors)
- `src/lib/utils.ts` — `cn()` helper
- `src/lib/config.ts` — typed env config (fail-fast on missing required vars)
- `src/lib/json.ts` — safe JSON parse/stringify for SQLite TEXT-as-JSON
- `src/server/db.ts` — Prisma client singleton (better-sqlite3 adapter, hardcoded `./dev.db`)
- `src/server/auth/password.ts` — argon2id hash/verify
- `src/server/auth/session.ts` — session create/resolve/destroy, cookie helpers
- `src/server/auth/user.ts` — getCurrentUser, requireUser, countUsers, findUserByEmail, createFirstUser
- `src/plugins/{ai,import,widget}/` — plugin layers (unchanged from scaffold)
- `src/generated/prisma/` — generated Prisma client (committed)
- `tests/smoke-auth.mjs` — 18 end-to-end auth smoke checks

---

## How to start (suggested prompt for the new session)

> Read `00-DESIGN.md` and `COORDINATION.md` in `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app\`. Those are the locked contract for **Compass**, a personal-finance app. Stage 1 (design) and Stage 2 steps 1 (scaffold) and 2 (auth) are done. Start at Stage 2 step 3 (data model) per `COORDINATION.md`. Load skills: `app-builder`, `ckm:ui-styling`, `fullstack-dev`. Quality bar is world-class, no shortcuts.

---

## Sign-off

- **Design locked**: 2026-08-21
- **Stage 2 step 1 (scaffold)**: ✅ 2026-08-22
- **Stage 2 step 2 (auth)**: ✅ 2026-08-22
- **Handed off (design)**: 2026-08-21
- **Handed off (scaffold)**: 2026-08-22
- **Handed off (auth)**: 2026-08-22
- **From session**: `mvs_77706038b3dc41f0818e43d1aca029bd` (design)
- **From session**: `mvs_0ca37adfb53b4de188d584afc12df309` (scaffold + auth)
- **Handed to**: next session (TBD) — start at Step 3 (data model)
