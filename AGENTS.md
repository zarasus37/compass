<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Compass (project-local guidance for coding agents)

> Read this before touching any code. Then read `00-DESIGN.md` and `COORDINATION.md` at the repo root. They are the contract.

## What this app is

**Compass** — a personal-finance / treasury app built *for* xKryptic's mom but *to* a world-class standard. Airtable-meets-treasury vibe. AI tiered (0/1/2/3), per-user. Layout is a modular widget system (structural from day one). Routing is L1 in v1 (planned rules, not actual ACH). See `00-DESIGN.md` for the full spec.

## The 16-step build order (Stage 2)

`COORDINATION.md` lists these in order. **Do them in order.** Each step is a milestone; ship each before moving on.

1. Scaffold — **done**
2. Auth (email + password, argon2id, single-user, session-based)
3. Core data model (Account, Envelope, Transaction, Rule, View, AuditLog, ImportBatch)
4. Plugin registry — **done at scaffold**; concrete CSV/Widget impls land with their steps
5. Manual transaction entry + accounts/envelopes CRUD
6. Dashboard with 3 starter widgets (no drag-drop yet)
7. Layout system — widget registry, slot system, drag-drop, saveable views
8. CSV import + recurring detection
9. Allocation rules engine (L1 routing)
10–12. AI Tier 1 / 2 / 3
13. Reports & charts
14. Mobile PWA polish
15. Plaid (future)
16. Hardening + tests

## Architecture rules — these are non-negotiable

- **Plugin-first.** AI, import formats, widgets go through `src/plugins/*`. No inline vendor calls in features. The registry is the only thing that knows which provider is active.
- **Money math in integer cents.** Never floats. `Int` in Prisma, integer math in app code, format at the edge (`Intl.NumberFormat`).
- **Type safety end-to-end.** `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Zod at every API boundary. No untracked `any`.
- **Audit log for L1+ actions.** Any time a rule, allocation, or Tier 3 action runs, write an `AuditLog` row.
- **Layout system is sacred.** When you add a widget, the widget goes through the registry. When the user changes the layout, it persists. Don't fork the UI.
- **No drift from spec.** If you find an ambiguity, update `00-DESIGN.md` and `COORDINATION.md` (with a "Decision revision" entry) — don't pick silently.
- **Pragmatic about mom.** If a feature can't be explained in one sentence a non-technical person understands, redesign it.

## Tech stack (locked)

- Next.js 16 (App Router) + React 19 + TypeScript 5.9
- Tailwind v4 + shadcn (Base UI preset) + Radix-equivalent accessibility via Base UI
- Prisma 7 + better-sqlite3 + SQLite (Postgres-ready schema; one-line adapter swap)
- TanStack Query (client cache), Zustand (client state), dnd-kit (drag-drop), Recharts (charts), Zod (validation)
- pnpm as package manager
- Plugin layer: `src/plugins/{ai,import,widget}/`

## Conventions

- File structure: `src/app/` (routes), `src/components/ui/` (shadcn primitives), `src/lib/` (cross-cutting utilities), `src/server/` (server-only — db, auth, services), `src/plugins/` (the plugin layer), `src/generated/` (generated Prisma client — don't edit).
- Path alias: `@/*` → `src/*`, `@/generated/*` → `src/generated/*`.
- Server components by default; mark `"use client"` only when you need browser APIs, hooks, or event handlers.
- Server actions over API routes for internal mutations; API routes for external integrations (Plaid webhooks, CSV import, etc.).
- Never import Prisma client from `@prisma/client` — use `@/generated/prisma/client`. The Prisma 7 default output path doesn't work with pnpm + TS path mapping.

## Commands

```bash
pnpm dev          # Turbopack dev server on http://localhost:3000
pnpm build        # Production build
pnpm start        # Run the production build
pnpm lint         # ESLint
pnpm exec tsc --noEmit  # TypeScript check

# Prisma
npx prisma generate            # Regenerate client after schema change
npx prisma migrate dev --name <name>   # Create + apply a migration
npx prisma migrate status      # Check migration state
npx prisma studio              # Local DB GUI
```

## Quality bar

World-class. Mom-grade. No "good enough for MVP." Every screen, every state, every error path is something a serious personal-finance user would judge. Accessibility from day one. Keyboard nav, focus states, color contrast, ARIA where it matters.

## Session discipline

xKryptic's preference: at natural breakpoints, propose a fresh-session handoff. The handoff is `COORDINATION.md` — keep it current, keep it specific, keep it versioned.
