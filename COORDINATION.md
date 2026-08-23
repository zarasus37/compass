# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete (v1.0) → **v4.0** reframe locked 2026-08-22 (alchemical/celestial visual language, pay-period as unit of truth, auto-allocate, 7 planetary vessels, 3-chapter sidebar, 4 allocation strategies)
- **Stage 2 (Creation)**: 🟢 Cluster 0 (scaffold + auth) — ✅ done. **Cluster 1 (Pay Period 1.0 — alchemical dashboard end-to-end with mock data) — ✅ done, commit `35ccc6e`. Cluster 1.5 (visible interactivity pass: auto-allocate engine + paycheck simulator + live store) — ✅ done. Cluster 1.7 (four data visualizations: Sankey, pacing line, Budget vs Actual, Goal Trajectory) — ✅ done, commit `cda8972`. Cluster 1.7 visual audit — ✅ done, commit `3da5716`. **Cluster 1.8 (Bill organizer + Plan My Next Check + calendar warnings) — ✅ done, commit `999ff37`. Cluster 1.9 (Debt payoff simulator + Saturn vessel + 3-up card + paid-off celebration) — ✅ done, commits `feb50e3` + `801525c` (math-bug fix) + `0ffb439` (per-debt sparkline).** Biweekly period locked as the canonical pay schedule (D17); period-close renamed to match (D18). **Chart-next-to-data principle applied across /goals, /envelopes, /recurring, /debts, /insights — commit `843375c`.** Next: Cluster 1.6 (form actions + onboarding), then 2.x (bill reminders, variable income, period close).
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-23 (post-Cluster-1.9 + chart-next-to-data)

---

## Spec (read this first)

The full design spec is at **`00-DESIGN.md` v4.0** (was v1.0; v4.0 reframe locked 2026-08-22). It is the contract for every feature, page, and decision in the app. Read it before you write any code.

Key sections to load into context:
- **Brand** (top): Name = **Compass**; Tagline = *Your money, guided.*
- **Decisions Log (D1–D16)** — D11–D16 are the v4 product reframe (pay period, auto-allocate, sidebar, planetary vessels, alchemical vocabulary, enforcement)
- **Section 0** — Vision (reframed around pay period)
- **Section 0a** — **Visual Design Language (v4 — Alchemical / Celestial)** — cosmic canvas, gold leaf, planetary palette, typography stack, the Mandala, the 7 planetary vessel mapping, the alchemical vocabulary, the sidebar structure, the section header idiom, the calendar idiom, the transaction row idiom, the color-coded fill idiom, the iconography. **This is the contract for every UI surface.**
- **Section 2** — Core concepts (Accounts, Envelopes, Transactions, Rules, Views, Widgets, AI Tier, Audit Log, Routing Level)
- **Section 3** — Feature surface by AI tier (0/1/2/3)
- **Section 4** — Layout customization (widget registry, slots, drag-drop, saveable views)
- **Section 5** — L1 routing + rules engine (**reframed: auto-allocate, no confirm modal**)
- **Section 5a** — Plugin architecture
- **Section 5b** — **Allocation Strategies** (Envelope / Zero-based / 50-30-20 / Pay-yourself-first)
- **Section 6** — Data model
- **Section 7** — Pages & routes (refactored into 3-chapter sidebar structure)
- **Section 8** — Tech stack (with alchemical design system notes)
- **Section 9** — Implementation order (refactored into **Cluster 1: Pay Period 1.0** as the next milestone)
- **Section 13** — Stage 2 starting point

---

## Locked decisions (D1–D16 from the spec)

- **D1** Primary user: xKryptic's mom, world-class bar
- **D2** AI: per-user tier (0/1/2/3), user picks
- **D3** Layout: modular widget system + drag-drop + saveable views, **structural from day one** (deferred to Cluster 3 in the v4 ordering)
- **D4** Routing in v1: **L1** (planned routing with rules engine)
- **D5** AI provider: **Mavis internal primary + Ollama local fallback**, swappable via plugin abstraction
- **D6** Name: **Compass**
- **D7** Auth: email + password (hashed), single-user, simple
- **D8** Design vibe: ~~Airtable-meets-treasury~~ → **Alchemical / Celestial (v4)** — cosmic dark canvas, gold leaf, planetary glyphs, illuminated typography. Locked 2026-08-22 from `compass-mockup-v4.html`. See Section 0a.
- **D9** Mobile: PWA-ready, native deferred
- **D10** Stack: **Next.js 16 monolith + plugin architecture + API routes for external integrations**
- **D11** **Unit of truth = pay period** (not month, not transaction)
- **D12** **Auto-allocate, no confirm modal** (plan is policy, not intent)
- **D13** **3-chapter sidebar**: Cosmos / The Great Work / Substance (order matters)
- **D14** **7 planetary vessels** (Sol=Rent, Luna=Groceries, Mars=Buffer, Mercury=Utilities, Jupiter=Growth, Venus=Joy, Saturn=Debt)
- **D15** **Alchemical vocabulary** (Vessels/Chronicle/Great Work/Prima Materia/Distillation/Aspects) — decoration, not primary labeling
- **D16** **Envelopes enforce** (balance = 100% = hard warning)

Do not re-litigate these in the next session. If you discover a real conflict, surface it in this file as a "Decision revision" entry rather than silently changing course.

---

## Stage 2 — Start here

The v4 ordering is **cluster-based**, not the linear 16-step order from v1.0. We deliver the alchemical dashboard end-to-end with mock data first (Cluster 1: Pay Period 1.0), then layer in AI tiers, drag-drop, Plaid, etc. The "visible UI matters more than invisible architecture" preference (xKryptic, 2026-08-22) drives this reordering.

### Cluster 0 — Scaffold + Auth (DONE)

- ✅ Scaffold (Next.js 16, React 19, TS strict, Tailwind v4, shadcn Base UI, Prisma 7 + SQLite, TanStack Query 5, Zustand 5, dnd-kit, Recharts 3, Zod 4, plugin registry)
- ✅ Lock Base UI decision
- ✅ Auth (argon2id, server-side sessions, `/welcome`+`/login` flow, route protection, 18/18 smoke tests passing)
- ✅ Three mockups reviewed (v1 → v2 → v3 editorial → v4 alchemical — **v4 LOCKED**)

### Cluster 1 — Pay Period 1.0 (✅ DONE — visible-UI push complete; 2026-08-22)

Full alchemical dashboard end-to-end with mock data. **This was the visible-UI milestone.** All 15 steps shipped, plus the visible interactivity pass (Cluster 1.5). Commits at the cluster boundary.

1. **Alchemical design system** — `globals.css` (cosmic canvas + gold leaf + planetary palette), Cinzel/Italiana/Cormorant/JetBrains Mono via `next/font/google`, `lib/money.ts` cents helper, `lib/format.ts` for date/period math, alchemical components in `src/components/alchemy/` (Mandala, VesselGlyph, CompassRose, EnvelopeBarChart, PageHead).
2. **Data model** — User, Account, Envelope (with `planet` field), Transaction, PaySchedule, Goal, AllocationPlan, AllocationRule, AuditLog. Money = integer cents. Migration `20260822113455_cluster1_full_data_model`.
3. **Onboarding flow** — deferred to next push (no `firstRun` flow yet; user signs in directly).
4. **Sidebar nav** — 3-chapter typographic spine (Overview / Plan / Money) with all 16 v4 routes wired. Collapsible, active state from `usePathname`.
5. **Dashboard** — v7 guiding flow: welcome + top priority hero + other goals + bar chart + snapshot + explore grid + next step + colophon. The Mandala was reserved to `/period` (v7 said it was too abstract for a dashboard centerpiece).
6. **Period page** — full period detail, allocation breakdown, closing balance walk (uses the live store).
7. **Calendar** — month grid with planetary day-of-week headers, payday / goal target / today cells, moon phase panel.
8. **Insights** — Ouroboros (allocation donut in planetary colors) + Trajectory (projection) + summary stats.
9. **Envelopes** — list of all envelopes with planetary glyphs, balance/target/spent/days-left, 100% hard warning, full bar chart.
10. **Transactions** — grouped by day, filterable, full record.
11. **Allocation plan** — 4-strategy picker UI (Envelope / Zero-based / 50-30-20 / Pay-yourself-first), Ouroboros preview, per-vessel breakdown, "ARMED · auto-runs on every paycheck" badge.
12. **Auto-allocate engine** — `src/lib/store.ts` exposes `runAllocation()` (pure) and `applyAllocation()` (mutates). Wired to the dashboard's "Run paycheck" simulator with a `useActionState` form + celebration banner. **No confirm modal** (D12) — the plan runs the moment a paycheck hits.
13. **Build-a-plan sub-pages** — Goals, Recurring bills, Emergency fund, Investment goal. Goals page is the canonical goal management view.
14. **Accounts** — Chase Checking mock with the live balance (updates when a paycheck runs).
15. **Subscriptions / Debts / Investments** — list pages with planetary affiliation, basic CRUD (CRUD not yet wired to actions; visual only for now).

### Cluster 1.5 — Visible Interactivity Pass (✅ DONE — commit `35ccc6e`; 2026-08-22)

The D12 contract made visible end-to-end:

- `src/lib/store.ts` — in-memory store (pinned on `globalThis.__COMPASS_STORE__` so HMR preserves balances). Holds envelopes, goals, transactions, plan, account, audit log. Read/write functions + the pure `runAllocation()` engine.
- `src/lib/mock-seed.ts` — extracted seed data; types mirror the eventual Prisma models.
- `src/lib/mock.ts` — thin compatibility shim. Each export is a fresh read from the live store, so every page picks up the new state on its next render.
- `src/app/actions/paycheck.ts` — `"use server"` action. Reads the form input as dollars, converts to cents, runs the engine, applies the transfers, writes the audit entry, revalidates every page that shows balance state.
- `src/components/dashboard/PaycheckSimulator.tsx` — `"use client"` form with `useActionState`. Gold-leaf "See the plan in action" card, live "Current plan" summary, celebration banner with each vessel's allocation.
- `src/app/page.tsx` — dashboard reads live state, includes the PaycheckSimulator between Top Priority and Envelopes.
- 8 deep pages (period, goals, accounts, allocation, insights, transactions, calendar, envelopes) now use live reads inside the page body, with `force-dynamic` so every render is fresh.

End-to-end: click "Run paycheck" on the dashboard, the engine distributes the dollars per the 7-rule envelope plan, the bar chart re-renders, the celebration banner shows the transfers, and every other page sees the new state.

### Cluster 1.7 — Four Data Visualizations (✅ DONE — commit `cda8972`; 2026-08-22)

The four "must-have" charts for a pay-period-centered finance app, each in the right place in the design system:

1. **Sankey (the Automation Map)** — `@nivo/sankey`. Paycheck on the left fans out to the 7 planetary envelopes on the right. Link widths are the share of paycheck. Hover any link to see the rule behind the flow. Wired into:
   - `PaycheckSimulator` celebration banner (the D12 contract made visible — click "Run paycheck" and watch the Sankey render the seven transfers in real time)
   - `/allocation` "Automation Map" section (a static reference of the active plan at the next paycheck size)
2. **Pacing line in the bar chart** — gold tick inside each row of the `EnvelopeBarChart`, positioned at "where you should be on day X of Y" of the pay period. Footer label "Pacing · day 9 of 14" with a hint that the gold tick = where you should be. Wired into:
   - `src/app/page.tsx` (dashboard)
   - `src/app/(app)/envelopes/page.tsx`
3. **Budget vs Actual (clustered bars)** — Recharts `BarChart`. For each envelope, two side-by-side bars: gold "Plan" (per-paycheck allocation target) + planetary "Actual" (cumulative spend this period). On `/insights`, the comparison view for the monthly review state.
4. **Cumulative line graph (Goal Trajectory)** — Recharts `LineChart`. One line per goal, climbing at the per-paycheck rate toward the target. A reference dashed line marks each goal's target. If a line is flat, the plan isn't moving it. Wired into:
   - `/insights` (alongside the Budget vs Actual)
   - `/goals` (the visual companion to the goal list cards)

All three new viz components are in `src/components/viz/`, themed to the alchemical visual system (cosmic canvas, gold leaf, planetary metals, Cinzel labels, Italiana numerics, Cormorant body). `tsc --noEmit` is clean; the dev server still returns 200 on every page.

### Cluster 1.8 — Bill organizer + Plan My Next Check + calendar warnings (✅ DONE — commit `999ff37`; 2026-08-22)

The "what's due before my next paycheck" + "how much can I safely spend" workflow is live end-to-end.

- **`BILLS_SEED`** — 6 bills (Rent, Spectrum, Discover, Spotify, ChatGPT, Magic Valley Electric) covering the 7-vessel plan, with `dueDay`, `autopay`, `paidAt`, and `envelopeId` wired through.
- **Biweekly period locked** (D17 in `00-DESIGN.md`): every-two-weeks is the canonical cadence; `PERIOD_START`, `PERIOD_END`, `NEXT_PAY_DATE` derived from the schedule. Period-close renamed to its pay-period-anchored form (D18).
- **Live store** got `Bill` type, `setBillPaid()` mutator (with audit entry), `billsDueInPeriod()` engine (handles month-boundary crossing correctly), `paycheckBreakdown()` for the 5-way split, `safeToSpend()` for the headline.
- **`/recurring` rewritten** with live data: summary strip (Total / Due this period / Period coverage / Autopay), three sections (Due / Paid / Not this period), per-row `BillPaidToggle` (useTransition + useOptimistic for instant feedback).
- **Plan My Next Check card on the dashboard** — always-visible 5-way breakdown (Bills / Spending / Debt / Savings / Free), stacked bar, warning banners when bills exceed the paycheck or safe-to-spend is under $50.
- **`/calendar`** got the bills-due-before-next-paycheck warning at the top, gold when covered, iron-red when bills exceed the paycheck.
- **PaycheckSimulator** text refreshed to "Run my next check" / "Plan my next check" — the user-facing intent matches the action.

Deferred to Clusters 1.9 and 2.x (see handoff below): debt payoff simulator, Snowball/Avalanche toggle, extra-payment "what if?", progress celebrations, period close mechanic, variable-income mode, bill reminders (AI tier).

### Cluster 1.7 visual audit + display fixes (✅ DONE — commit `3da5716`; 2026-08-22)

The 7 known issues from the handoff doc are resolved. The `/envelopes` page also got a "change certain displays" pass. Quick summary:

1. **Sankey source label clipped** → source label is now rendered as a header ABOVE the chart (`FROM  Paycheck · $1,820.00`) so it's never clipped regardless of width. Left margin bumped 168 → 200. The in-chart source node label is kept for hover consistency.
2. **GoalTrajectory flat lines invisible** → Y-axis is now **0–100% (percent of target)**. Every goal is on the same scale. The $2k Debt Free line and the $20k Emergency Fund line are both visible. A flat line is the visual "this plan isn't moving it" signal.
3. **BudgetVsActual legend dot color mismatch** → dropped the hard-coded `--jupiter` "Actual" dot. The legend now uses a neutral 3-bar cluster (one per representative planet color) so the swatch matches the per-envelope Actual bar.
4. **Pacing line too subtle** → widened from 2px to 4px, added a 7px gold-glow diamond cap on top, bumped the box-shadow glow from 6px to 10px.
5. **GoalTrajectory dashed reference label cut off** → replaced the per-goal `position: "right"` labels with a single 100% target line + a "Targets" footnote below the chart (`● EMERGENCY FUND · 15mo to 100%`, `● DEBT FREE · not moving` in iron red).
6. **Dashboard Next Step hard-coded text** → now reads `liveEnvelopes()`, pluralizes ("One envelope is over limit" / "N envelopes are over limit"), names each envelope with its current/target/overage, handles the calm state ("All envelopes within target") when nothing is over.
7. **Iron-red Next Step banner contrast** → coral wash on the surface background, body text in `--ink` (7.4:1 contrast passes WCAG AA), over-limit envelope names in iron-red bold, CTA kept high-contrast (parchment on dark — the iron-red button was 3.9:1, below the AA bar).

**"Change certain displays" cleanup:**
- `/envelopes` 7-card "Every envelope" detail grid → compact 5-col summary row (the bar chart already shows all 7; the detail cards added vertical mass without much new signal. Recent activity moves to per-envelope detail pages in Cluster 2.)
- `/envelopes` Insight section → now data-driven: pulls the worst over-limit envelope, computes % + overage, generates the "raise target to $X" CTA from live state.
- `/envelopes` "Over limit" section header → pluralized ("one envelope needs attention" / "N envelopes need attention").
- Dashboard "Explore Compass" 6-card grid → **kept** (it's a nav surface; not redundant with the top-priority goal hero).
- `/period` Mandala (420px) → **kept** (anchors the period page; the v7 reasoning was about the dashboard centerpiece, not here).

`tsc --noEmit` clean. `pnpm build` clean (12 static pages). Visual check confirmed all 7 issues resolved + the display cleanup landed without regressions.

### Cluster 1.9 — Debt payoff + Saturn vessel (✅ DONE — commits `feb50e3` + `801525c` + `0ffb439`; 2026-08-23)

The Saturn vessel, made tangible. The user can see at a glance how fast each debt will pay off, apply an extra payment, and celebrate when a debt hits zero.

- **Live store** got `Debt` type, `readDebts()`, `applyExtraDebtPayment()` mutator (with audit entry), `payoffProjection()` iterative engine, `orderDebtsByMethod()` for snowball/avalanche.
- **`/debts` page** rewritten with live data — debt list with balance / APR / min payment / paid-% / progress bar, then the **DebtPayoffSimulator** (3-up card: current / with-extra / saved; Snowball vs Avalanche toggle; $0–$500 "What if?" slider; Apply extra button; PaidOffCelebration celestial overlay).
- **Dashboard** integrates the simulator between Plan My Next Check and Envelopes (conditional on having debts).
- **Per-debt payoff sparkline** in each debt row — pure-SVG inline chart, planet-colored, falls from current balance toward $0 over a 24-month horizon at the debt's min payment. Iron-red when min < interest; ok-green end dot when the debt hits $0. Closed-form "~Nmo at min" caption.
- **Math fix** (commit `801525c`): the engine had two bugs — APR was being treated as monthly rate (12× too much interest), and the cascade was double-counting the other active debts' minimums. After fix: realistic numbers (e.g. SNOWBALL $244/mo → 28mo, $2,660 interest; AVALANCHE $244/mo → 26mo, $1,706 interest, saves $954).
- **`tests/test-debt-math.mjs`** — regression test for the math.

### Chart-next-to-data principle (✅ DONE — commit `843375c`; 2026-08-23)

User directive: "patterns and other graphs should directly be next to the information it is pulling its self from should all be associated." A chart that visualizes data on page A should sit on page A, not on a separate /insights page.

- **/goals**: master GoalTrajectory moved to the TOP of the page (right after the page header), so the chart sits next to the goal cards below it (the data it visualizes). Each goal card also got a per-card **GoalSparkline** (pure SVG, 140×42) showing the goal's own projection to 100% target, plus a months-to-100% caption. Flat lines for goals with `perPaycheckCents=0` show "Not moving" in iron red.
- **/envelopes**: **BudgetVsActual** (gold-plan vs planetary-actual) moved here from /insights, now sits between the period summary and the per-envelope data. Plan = envelope target; actual = currentCents. "Every envelope" row got a per-envelope **EnvelopeMiniBar** (pure SVG, 140×8) in a new column directly next to the current/target numbers. Removed the redundant big EnvelopeBarChart at the top.
- **/recurring**: new **BillsTimeline** strip (31-day strip with one dot per bill, sized by amount, gold tick = today) sits between the page header and the period summary.
- **/debts**: per-debt **DebtSparkline** (commit `0ffb439`) — see Cluster 1.9.
- **/insights**: removed BudgetVsActual and GoalTrajectory (moved to /envelopes and /goals respectively). Page now focuses on Ouroboros (allocation donut), Trajectory (net worth projection), and 4-cell summary stats.

New components: `GoalSparkline.tsx`, `EnvelopeMiniBar.tsx`, `DebtSparkline.tsx` (all pure SVG, cheap, 7+ can render on a single page without perf concerns).

`tsc --noEmit` clean. `pnpm build` clean (10 static pages, 18 routes). All 4 changed pages visually verified.

### Cluster 2 (after Cluster 1)

- Real Plaid sandbox (L2 routing) — deferred until Cluster 1 is fully working with mock data
- AI Tier 1 — chat, smart categorize, natural-language search
- AI Tier 2 — insights, anomaly, forecast, what-if, monthly narrative
- AI Tier 3 — autonomous actions + audit log deepening

### Cluster 3 (after Cluster 2)

- Layout customization system — widget registry, slot system, drag-drop, save views (the structural piece from v1.0 ordering)
- CSV import + recurring detection
- Mobile PWA polish

### Cluster 4 (future)

- L2 actual bank routing (Plaid + ACH)

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

### Next session: Cluster 1.6 — form actions + onboarding

The visual audit is **done** (commit `3da5716`). **Cluster 1.8 is also done** (commit `999ff37`) — see the Cluster 1.8 section above for the per-issue resolution (Biweekly period locked, /recurring wired to live data, Plan My Next Check on the dashboard, calendar warnings). The next push is **Cluster 1.6 — form actions + onboarding**.

**Scope (per 00-DESIGN.md §9 and the v4 cluster ordering):**

1. **Form actions** — wire the existing visual-only buttons to real mutations:
   - "New envelope" on `/envelopes` → form action that appends to the live store, revalidates the page.
   - "New transaction" on `/transactions` → form action; envelope dropdown; amount in dollars → cents conversion; updates envelope balance.
   - "New goal" on `/goals` → form action; envelope target association; per-paycheck contribution.
   - "New bill" on `/recurring` → form action; name, amount, dueDay, autopay, envelopeId. (Bills are live as of 1.8; only the form to add/edit is missing.)
2. **Onboarding flow** — the first-run experience when no user has set up yet:
   - Pay schedule picker (weekly / biweekly / monthly / custom) — **biweekly is the default per D17**
   - Seed 7 default envelopes (the planetary defaults, from `00-DESIGN.md` D14)
   - Arm the first Allocation Plan (default to "Envelope" strategy)
   - Land on the dashboard with everything wired
3. **Form patterns** — shared components for the form-action idiom:
   - "use server" actions in `src/app/actions/`
   - Zod-validated input schemas
   - Inline error rendering with `useActionState` (same pattern as the auth pages)
   - Success path: revalidate the page, scroll to the new entry

**The paycheck simulator (Cluster 1.5) is the gold standard** for form actions — same `useActionState` + `revalidatePath` pattern, dollar→cents conversion at the boundary, no client-side mutation. The `toggleBillPaid` action added in 1.8 is also a clean reference: minimal payload (just billId + paid flag), revalidates 3 pages.

**Form-action contract (apply to every new action):**
- Reads the form input as **dollars** (the human-readable unit)
- Converts to **cents** on the server: `Math.round(parseFloat(input) * 100)`
- Zod-validates the cents value (non-negative, finite, etc.)
- Calls a pure mutator on the live store
- Calls `revalidatePath('/envelopes')` (or wherever) so the next render re-reads
- Returns `{ ok: true }` or `{ ok: false, reason }` for inline error rendering

**Acceptance for Cluster 1.6:**
- [ ] `New envelope` form appends to the live store; the bar chart, over-limit summary, and NextStep section all reflect the new envelope.
- [ ] `New transaction` form updates the envelope balance; the bar chart and recent activity both reflect it.
- [ ] `New goal` form creates a goal with per-paycheck contribution; the dashboard top-priority hero + GoalTrajectory reflect it.
- [ ] `New debt` form creates a debt with balance + APR; the `/debts` list reflects it.
- [ ] `New bill` form creates a recurring bill with name, amount, dueDay, autopay; the Recurring page and the Plan My Next Check card on the dashboard both reflect it.
- [ ] Onboarding flow: clear the DB, hit `/welcome` → first user → pay schedule (biweekly default) → seed 7 envelopes → arm plan → land on dashboard with everything wired.
- [ ] `tsc --noEmit` clean; `pnpm build` clean; smoke test still passes.

---

## Cluster 1.9 + 2.x handoff (mom's full feature list)

This is the **roadmap of remaining work** derived from mom's feature list (2026-08-22). The "change certain displays" push surfaced the items below; the visible-UI priority is what mom touches every payday.

### Cluster 1.9 — Debt payoff + projections (✅ DONE — see "Cluster 1.9 — Debt payoff + Saturn vessel" section above; commits `feb50e3` + `801525c` + `0ffb439`)

### Cluster 2.x — Smart bills + variable income (AI tier, NOT yet started)

These touch the auto-allocate engine + the AI provider layer. Schedule for after the layout-customization system (Cluster 3) and the form-action pattern lands (1.6).

7. **Bill reminders** (Tier 1) — "Spectrum Internet due in 3 days, $75 from Chase Checking." Needs a notification surface (in-app banner first; push later).
8. **Variable-income mode** — paycheck amount is already a free input in the simulator. The missing piece: a "this paycheck is irregular" flag that routes the whole check to Buffer (no auto-distribution) or distributes differently. Small engine change + a toggle in the PaycheckSimulator.
9. **Period close (D18) — end-of-period rollover mechanic** — at `TODAY > PERIOD_END`, write a `PeriodClose` row, snapshot closing balances, roll unallocated Buffer / over-limit envelope deltas into the next period, write an audit entry. The "monthly rollover" framing in mom's list becomes period close in the biweekly model.

### Cluster 3 (already in roadmap)

- Layout customization system — widget registry, slot system, drag-drop, save views (the structural piece from v1.0 ordering)
- CSV import + recurring detection

### Cluster 4 (future)

- L2 actual bank routing (Plaid + ACH)

**Dev-server lifecycle note for the new session**: the bash tool has a 30-minute max runtime cap on background processes, which reaps the wrapping shell around `pnpm dev` even when Next itself is healthy. The session will need to restart the dev server roughly every 30 minutes via `pnpm dev` in a background task. The fresh session can avoid this by starting the dev server in a separate background task and only checking it as needed; or by running the build smoke (`pnpm build`) instead of `pnpm dev` for static verification.

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

- **Design v1.0 locked**: 2026-08-21
- **Design v4.0 locked (alchemical/celestial)**: 2026-08-22 — see Section 0a + Decision revisions
- **Cluster 0.1 (scaffold)**: ✅ 2026-08-22
- **Cluster 0.2 (auth)**: ✅ 2026-08-22
- **Cluster 1 (Pay Period 1.0 — alchemical dashboard end-to-end with mock data)**: ✅ 2026-08-22, commit `35ccc6e`
- **Cluster 1.5 (visible interactivity pass — auto-allocate engine + paycheck simulator + live store)**: ✅ 2026-08-22, commit `35ccc6e`
- **Cluster 1.7 (four data visualizations: Sankey, pacing line, Budget vs Actual, Goal Trajectory)**: ✅ 2026-08-22, commit `cda8972`
- **Cluster 1.7 visual audit (7 chart/banner issues + /envelopes cleanup)**: ✅ 2026-08-22, commit `3da5716`
- **Cluster 1.8 (Bill organizer + Plan My Next Check + calendar warnings)**: ✅ 2026-08-22, commit `999ff37`
- **Cluster 1.6 (form actions + onboarding)**: ⏳ next
- **Cluster 1.9 (Debt payoff + projections)**: ⏳ scoped, not started
- **Cluster 2.x (Smart bills + variable income)**: ⏳ scoped, not started
- **Handed off (design)**: 2026-08-21
- **Handed off (scaffold)**: 2026-08-22
- **Handed off (auth)**: 2026-08-22
- **Handed off (Cluster 1)**: 2026-08-22
- **From session**: `mvs_77706038b3dc41f0818e43d1aca029bd` (design)
- **From session**: `mvs_0ca37adfb53b4de188d584afc12df309` (scaffold + auth + Cluster 1 + Cluster 1.5 + Cluster 1.7)
- **From session**: `mvs_4d1dd62520784d9c9f0c7511fdeaee6d` (Cluster 1.7 visual audit + display fixes + Cluster 1.8 bill organizer + Plan My Next Check + calendar warnings + handoff scoping for 1.9 / 2.x)
- **Handed to**: next session (TBD) — start with **Cluster 1.6 (form actions + onboarding)**, then Cluster 1.9 (debt payoff). Full handoff for both in the "Cluster 1.9 + 2.x handoff" section below.
