# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete
- **Stage 2 (Creation)**: 🟢 Unblocked — start here
- **Stage 3 (Test & bug-fix)**: pending Stage 2

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

- [ ] `create-next-app` runs with the right flags (TS, App Router, Tailwind, src/).
- [ ] `package.json` name is `compass`.
- [ ] Tailwind v4 configured (no v3 leftovers).
- [ ] shadcn/ui initialized; base theme applied.
- [ ] Prisma + SQLite initialized; `prisma migrate dev` runs.
- [ ] TanStack Query provider wired at the root.
- [ ] dnd-kit installed (not yet used in UI).
- [ ] Recharts installed (not yet used in UI).
- [ ] Plugin registry directory + base interface files exist (`src/plugins/ai/types.ts`, etc.).
- [ ] `pnpm dev` (or `npm run dev`) starts on localhost; default route renders a clean "Compass" landing placeholder.
- [ ] `pnpm build` succeeds with no TypeScript errors.
- [ ] Lint passes.
- [ ] Git initialized; initial commit with the design + coordination files committed first.

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

- **Workspace is in OneDrive** (`C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`). Path separators, file watchers, and dev tooling should account for that.
- **Host is Windows.** All build artifacts must be Windows-native. If using Codex (Linux sandbox) for any code, recreate artifacts on Windows after — Codex's Linux paths and binary names won't run natively on the Windows host.
- **Mavis internal endpoint for AI** — same pattern as Ice Depot. Add an adapter in the plugin registry; do not hardcode HTTP calls in features.
- **Single-user assumption** for now. Auth, data isolation, and account scoping can assume one user. Schema should support multi-user later without rewrite (the `user_id` foreign keys are already in the data model).
- **Mom is the test audience.** If you can't explain a feature in one sentence a non-technical person would understand, redesign the feature.
- **Fresh-session discipline** per xKryptic's preference: this handoff is the contract. Update this file with any state change, versioned, so the next handoff is clean.

---

## File index (current)

- `00-DESIGN.md` — design spec v1.0 (the contract)
- `COORDINATION.md` — this file (state + handoff)
- *(more files added as Stage 2 progresses; track them here)*

---

## How to start (suggested prompt for the new session)

> Read `00-DESIGN.md` and `COORDINATION.md` in `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app\`. Those are the locked contract for **Compass**, a personal-finance app. Stage 1 (design) is done. Start Stage 2 (creation) at the scaffold step per `COORDINATION.md`. Load skills: `app-builder`, `ckm:ui-styling`, `fullstack-dev`. Quality bar is world-class, no shortcuts.

---

## Sign-off

- **Design locked**: 2026-08-21
- **Handed off**: 2026-08-21
- **From session**: `mvs_77706038b3dc41f0818e43d1aca029bd`
- **Handed to**: next session (TBD)
