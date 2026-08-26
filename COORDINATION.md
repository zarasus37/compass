# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete (v1.0) → **v4.0** reframe locked 2026-08-22 (alchemical/celestial visual language) → **v5.0 reframe locked 2026-08-23** (Component Oracle Terminal: cool teal/cyan on near-black, Sora + JetBrains Mono, oracle voice with `[OK]/[WARN]` markers). The 7 planetary vessels are preserved as a semantic mapping.
- **Stage 2 (Creation)**: 🟢 Cluster 0 (scaffold + auth) — ✅ done. **Cluster 1 (Pay Period 1.0 — alchemical dashboard end-to-end with mock data) — ✅ done, commit `35ccc6e`. Cluster 1.5 (visible interactivity pass: auto-allocate engine + paycheck simulator + live store) — ✅ done. Cluster 1.7 (four data visualizations: Sankey, pacing line, Budget vs Actual, Goal Trajectory) — ✅ done, commit `cda8972`. Cluster 1.7 visual audit — ✅ done, commit `3da5716`. **Cluster 1.8 (Bill organizer + Plan My Next Check + calendar warnings) — ✅ done, commit `999ff37`. Cluster 1.9 (Debt payoff simulator + Saturn vessel + 3-up card + paid-off celebration) — ✅ done, commits `feb50e3` + `801525c` (math-bug fix) + `0ffb439` (per-debt sparkline).** Biweekly period locked as the canonical pay schedule (D17); period-close renamed to match (D18). **Chart-next-to-data principle applied across /goals, /envelopes, /recurring, /debts, /insights — commit `843375c`. Cluster 1.10 (drill-downs + new transaction / goal / envelope / bill / debt forms + edit forms) — ✅ done, commits `03f308f` + `006bca0` + `3dc679f` + `649d76e`. **Cluster 2.0 (customizable, scrollable, card-based dashboard with @dnd-kit drag-and-drop + localStorage persistence) — ✅ done, commit `e648ef5`. Cluster 2.0.1 (visual-first treatment: 7-day WeekSparkline, BurnSparkline, embedded GoalSparkline) — ✅ done, commit `af0b8d3`. Cluster 2.0.2 (full-month calendar with planetary headers + scheduled bills list) — ✅ done, commit `34f3928`. **Cluster 2.0.3 (Component Oracle Terminal re-skin of the dashboard) — ✅ done, commit `884fe70`.** **Cluster 2.1 (must-have viz + utility integration push: 3 new dashboard cards (Spend Ring, Net Trajectory, Pay Distribution) + Must-Have Tools index strip on dashboard + /settings hub + Plaid sandbox + AI categorize rules + Receipt scan + Habit quiz + Household stub + /subscriptions wired to live data) — ✅ done, single working session.** Next: tidy up — fine-tune placement, polish tooltips, add hover states where missing, decide which cards to default-on, integrate the tools into the sidebar nav as a 4th chapter if the Settings entry feels too hidden, then 2.x (form actions deep-dive, bill reminders, variable income, period close), then 3.x (real Plaid, AI tiers).
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-26 (Cluster 5.2.6 ✅ DONE — all 6 widgets on Prisma). Widgets #1-3 (recurring/bills, envelopes, goals) shipped in the prior session. Widgets #4-6 (allocation, insights, accounts) shipped in this session as commits `fe4380c` + `e1e9066`. The /allocation page now reads from the Prisma `AllocationPlan` + `AllocationRule` tables — the per-envelope distribution is rule-driven (33% Rent, 18% Savings, 15% Debt, etc.) instead of being derived from envelope target sizes. The /insights page reads envelopes + goals from Prisma (`liveEnvelopesFromDb` + `liveGoalsFromDb`); the Transaction read + Snapshot are still in-memory (Transaction model not migrated in this cluster, per the handoff). The /accounts page reads from the Prisma `Account` table — the canonical seed row (Chase Checking) is surfaced as the primary card, and the projection's `[identity] ` accounts (income/assets/debts from the chat) appear in a separate "From the onboarding chat" section. Also fixed a latent bug: the /accounts balance cell was hardcoded to the next paycheck amount (`formatMoney(2_400_00)`) rather than the live `account.balanceCents` — now reads the live balance. New seeders: `seed-allocation.ts` (1 plan + 7 rules), `seed-accounts.ts` (1 canonical row). New read functions: `livePlanFromDb`, `liveAccountsFromDb` (returns `{ canonical, projected }` discriminated by the `[identity] ` name prefix). New smokes: `smoke-allocation-db` (53 checks), `smoke-insights-db` (23), `smoke-accounts-db` (33). All 12 smokes green at 547 total checks (bills 36, envelopes 29, goals 28, allocation 53, insights 23, accounts 33, reset-seed 8, deprecated 42, onboarding-agent 97, sidebar 63, topbar 102, vault 33). Pre-existing tsc error in `src/app/(app)/vault/page.tsx:136` (Property 'acknowledged' missing) — not introduced by this cluster, owned by the vault cluster. Pre-existing smoke-auth.mjs failure — not introduced by this cluster. dev server on 127.0.0.1:3000.)

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
- **D8** Design vibe: ~~Airtable-meets-treasury~~ → ~~Alchemical / Celestial (v4)~~ → ~~Component Oracle Terminal (v5)~~ → **Sovereign Monad / vessel (v6)** — pivoted 2026-08-24 (Cluster 3.0). Dark slate-purple canvas (`--vessel-dark: #16121e`), neon purple accent (`--vessel-accent: #a855f7`), warning orange (`--vessel-watch: #f97316`), over-limit neon red (`--vessel-over: #ef4444`). Sora for headings, JetBrains Mono for data. App wordmark is "Sovereign Monad" with a pulsing accent dot. The 7 planetary vessels (D14) are still preserved as data semantics. v5 (Component Oracle Terminal) tokens (`--cosmos`, `--terminal-cyan`, `--gold`) coexist additively for any component that hasn't been migrated yet; new shells consume vessel tokens directly.
- **D9** Mobile: PWA-ready, native deferred
- **D10** Stack: **Next.js 16 monolith + plugin architecture + API routes for external integrations**
- **D11** **Unit of truth = pay period** (not month, not transaction)
- **D12** **Auto-allocate, no confirm modal** (plan is policy, not intent)
- **D13** **Sidebar structure**: ~~Cosmos / The Great Work / Substance~~ → ~~3-chapter Overview / Plan / Money~~ → **4-chapter Overview / Ledger / Aims / Learn + System footer** (terminal voice; order matters). The System chrome (Settings, Household, Plaid, Smart Categorize, Receipt Scan) lives behind the gear icon in TopAppBar, not in the sidebar. Recorded 2026-08-25.
- **D14** **7 planetary vessels** (Sol=Rent, Luna=Groceries, Mars=Buffer, Mercury=Utilities, Jupiter=Growth, Venus=Joy, Saturn=Debt) — preserved as semantic mapping
- **D15** ~~Alchemical vocabulary~~ (Vessels/Chronicle/Great Work/Prima Materia/Distillation/Aspects) — **demoted to decoration only**, primary labeling is now terminal voice
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

### Cluster 2.0 — Customizable, scrollable, card-based dashboard (✅ DONE — commit `e648ef5`; 2026-08-23)

The dashboard is now a 2-col card grid on desktop (1-col on mobile), mixing full-width and half-width cards. Each card is a single tap-through target routing to a deep-dive tab where the full data set lives. The user can add, remove, and reorder cards; the layout persists to localStorage.

**Default cards on a fresh dashboard (4 on by default):**
- **Daily Tracking** (full) — safe-to-spend + today's pace + 7-day weekly health, all in one strip
- **Critical Timeline** (half) — next 2-3 unpaid bills with color-coded time-remaining badges (Overdue iron-red, Today gold, Tomorrow warn, "In N days" neutral, "Next period" ink-3)
- **Envelope Status** (half) — top 3 envelopes ranked by attention (over-limit first, then highest utilization)
- **Next Step** (full) — the over-limit attention rail with calm jade fallback

**Catalog (2 more, opt-in via the Add card sheet):**
- **Top Priority** (full) — the primary goal hero with the Jupiter/Venus progress bar
- **Snapshot** (full) — 3-cell net worth / next paycheck / period strip

**Customization (persisted to `localStorage` as `compass-dashboard-layout-v1`):**
- Pencil toggle in the bottom-right enters edit mode
- `@dnd-kit/sortable` drag handle (whole card becomes draggable) OR up/down arrow buttons
- X removes a card from the dashboard
- "+ Add card" sheet shows the catalog with descriptions + "+ Add" buttons
- "Reset to default" button restores the default 4-card layout
- Order + visibility sync across tabs via `storage` events

**Visual continuity:**
- `view-transition-name` on each card so a future destination page can hand off the card into the new view (e.g. `/recurring` sets `view-transition-name: card-critical-timeline` and the browser morphs it into the page header)
- Subtle stretch + fade CSS animation on card → page transitions
- Hover lift (translateY -1px + soft box-shadow) on cards in view mode
- Tactile :active scale (0.992) on click for feedback
- All interactive states respect `prefers-reduced-motion`

**Architecture (3-tier split):**
- `page.tsx` (server) — reads live data, computes every card's payload, builds a `cardNodes` map keyed by `CardId`
- `DashboardCard.tsx` (client) — the card primitive; reads editing state from `DashboardEditingContext` (so the pre-rendered card can flip into edit mode without remounting)
- `DashboardGrid.tsx` (client) — owns layout state, dnd-kit context, customize mode, add/remove/reset, AddCardSheet
- `cards/*.tsx` (server) — pure render of data per card type, 6 files (`daily-tracking`, `critical-timeline`, `envelope-status`, `top-priority`, `next-step`, `snapshot`)
- `catalog.ts` (shared, no "use client") — card metadata, default order, `loadLayout` / `saveLayout` helpers

**Routing:**
- Daily Tracking → `/transactions` (where the full record lives)
- Critical Timeline → `/recurring` (bills page with the timeline strip + paid toggles)
- Envelope Status → `/envelopes` (per-envelope detail + bar chart)
- Next Step → `/envelopes` (same target — the over-limit attention rail IS the gateway)
- Top Priority → `/goals` (the goal management page)
- Snapshot → `/period` (the period page with the full walk)

`tsc --noEmit` clean. `pnpm build` clean (10 static pages, 25 routes — same as before, just refactored `page.tsx`). Visual check: customize toggle works, add-card sheet opens, drag handle visible in edit mode, tap-through routes correctly, layout persists across reloads.

### Cluster 2.0.1 — Visual-first treatment for all 4 data-display cards (✅ DONE — commit `af0b8d3`; 2026-08-23)

Per xKryptic directive 2026-08-23: a budget planner should let the user budget with clear guidelines that illustrate the simplicity. **Default to a visual over a list of text rows**; lists only when the visual would confuse. Applied to all four dashboard cards that show structured data.

**Critical Timeline → 14-day calendar strip**
- Pure SVG, 14 day columns spanning the pay period (D17)
- Each bill is a dot at its due day, color = planet (Luna/Mercury/Venus/Mars/Saturn/Sol/Jupiter)
- Paid bills = 35% opacity, unpaid = 100%, overdue = iron-red ring
- Today = gold vertical tick + "TODAY" label at the top
- Stacked dots when multiple bills share a day
- The 3-bill list with name + amount + status badge remains below the strip (the strip answers "when?", the list answers "what?")
- Day-of-month labels along the bottom edge, AUG 22 / SEP 5 range labels at the corners

**Daily Tracking → 7-day spend sparkline**
- `WeekSparkline` added to the Weekly Health cell
- Line shows the daily shape (flat = steady, spike = one big charge, falling = slowing)
- Today dot is the rightmost column, accent-colored by pace (ok/warn/neg)
- Dashed horizontal line at the 7-day average
- Spikes ≥ 2× the average get a gold ring marker
- Layout fix: pace label moved from inline to the sub line so cells don't overflow at narrow widths

**Envelope Status → per-envelope burn sparkline**
- `BurnSparkline` added to each row, sitting directly above the ratio bar
- 7-day per-envelope spend, color = planet, today dot = status color
- Subtle area fill below the line for shape emphasis
- A flat line = steady pace. A rising line = accelerating toward the cap.
- The shape tells the trajectory the static bar can't: Groceries is rising fast (burning), Rent/Buffer are flat (quiet)
- Empty state: dashed line in ink-5 (no recent spend)

**Top Priority → embedded GoalSparkline**
- The trajectory sparkline from /goals lives inside the card now
- Shows the projected path from "now" to 100% target over 18 months
- Reuses the existing `GoalSparkline` component (188×48) for visual consistency with the deep page
- Layout: stacked (numbers + bar at top, sparkline + projection label below) so the sparkline gets full card width instead of being squeezed beside the numbers
- Caption: "At +$432.00/check" or "Plan isn't moving this goal" or "Goal reached"

**Data plumbing** (computed server-side in `page.tsx`):
- `dailySpendCents`: 7-element array of per-day totals (oldest first), used by DailyTracking
- `spendByEnvelope`: `Record<envelopeId, 7-element array>`, used by EnvelopeStatus
- `allDueThisPeriod`: every bill due in the period with `dayIndex: 0..13`, used by CriticalTimeline strip
- `last7Days`: array of 7 Date objects for x-axis labels (sparklines)

`tsc --noEmit` clean. `pnpm build` clean. All 4 cards now visually communicate at a glance — the user doesn't have to read every number to spot the pattern.

### Cluster 2.0.2 — Full-month calendar (✅ DONE — commit `34f3928`; 2026-08-23)

Critical Timeline refactored from a 14-day strip into a full month calendar (per xKryptic reference mockup):
- 7 columns × 6 rows, current month centered, prev/next month spillover at 30% opacity
- Planetary day-of-week headers (Sun ☉, Mon ☽, Tue ♂, Wed ☿, Thu ♃, Fri ♀, Sat ♄) — the alchemical planet-day mapping
- Each day cell shows: day number, `PAY` badge (gold border) if a bill is due, `GOAL` badge (jupiter border) for goal target dates, small gold dot for days with transactions
- Today highlighted with gold border + soft fill
- Past days dimmed to 55%
- Hover any day with a bill → native browser tooltip with bill name(s) + amount(s) + autopay flag
- List below the calendar (replaces the previous 3-bill list): every bill due this month, sorted by day, with planet dot + name + `AP` marker + `DAY N` badge + amount

New component: `src/components/dashboard/cards/month-calendar.tsx` (pure TSX, no SVG — uses CSS grid for cells).

Removed: the 14-day `CalendarStrip` and the 3-bill list (both superseded by the month view + scheduled bills list).

**Apply going forward** (per the principle saved to User Memory 2026-08-23): every data-display surface in any xKryptic project. Build the chart first; add a list only if exact values can't live in the chart.

### Cluster 2.0.3 — Component Oracle Terminal re-skin (dashboard) (✅ DONE — commit `884fe70`; 2026-08-23)

The dashboard has been re-skinned from the alchemical/celestial warm-gold language to a cool **Component Oracle Terminal** look. Per xKryptic directive 2026-08-23: the planet system (7 vessels) is preserved as a semantic mapping, but the visual treatment is now terminal — no decorative occult. The deep pages (recurring, envelopes, goals, etc.) are still in the alchemical voice and are tracked in a follow-up push.

**Locked design language (per xKryptic 2026-08-23):**

- **Base canvas**: `#060A12` (near-black terminal)
- **Primary signal**: `#2DD4BF` (teal) — active states, connections, CTA, primary numeric accent
- **Arcane accent**: `#C9A45C` (antique gold) — today, payday, goal badges, symbolic insight only (sparingly)
- **System green**: `#4ADE80` — `[OK]` markers, healthy/confirmed states
- **Status**: `#F59E0B` warn / `#EF4444` neg — only for warnings/errors
- **Borders**: `#28404C` (teal-gray) — thin, dense; `#1F2D38` (line-soft) for secondary dividers
- **Surface**: dark navy (`#0B1118` → `#182030`), 4 px square corners throughout
- **Typography**: **Sora** (300-700) for headings + body, **JetBrains Mono** for data, labels, logs, controls
- **Voice**: oracle / protocol, terminal-log markers `[OK]`, `[WARN]`, `[SIGIL]`, `[INDEXED]`
- **Charts**: cyan / teal on faint terminal grid, planet color only as accent, gold for symbolic markers
- **Mystical elements**: subtle gold seals, geometric rings, symbolic markers — but never decorative occult overload

**The 7-vessel planet system is unchanged** (Sol=Rent, Luna=Groceries, Mars=Buffer, Mercury=Utilities, Jupiter=Growth, Venus=Joy, Saturn=Debt). The planetary glyphs ☉ ☽ ♂ ☿ ♃ ♀ ♄ are still used in the calendar's day-of-week headers as a semantic mapping.

**Font migration strategy** — to avoid touching every JSX `fontFamily` reference:
- `--font-cinzel`, `--font-italiana`, `--font-cormorant` are aliased to `--font-sora` in `globals.css`
- New explicit `var(--font-sora)` and `var(--font-jetbrains)` references used in the re-skin
- Result: any leftover `var(--font-cinzel)` etc. now renders as Sora, with no broken look

**Files re-skinned (14 source files, +908 / -623):**

- `src/app/globals.css` — palette rewrite, font aliasing, `.num` / `.num-big` / `.display` utility classes, teal/cyan everywhere, 4 px corner scale
- `src/app/layout.tsx` — removed Cinzel/Italiana/Cormorant, added Sora (300-700); title "Compass — Component Oracle", description "An oracle for your money. Personal-finance terminal, indexed by the user, for the user.", theme-color `#060A12`
- `src/app/page.tsx` — hero is now `● SESSION · [long date]` in teal, "Welcome back, **Mom.**" with Mom. in teal, mono subhead with `CUSTOMIZE` reference, `☉ PERIOD · AUG 22 – SEP 5 · 14D` mono pill; colophon `● COMPASS_ORACLE` / `A ORACLE FOR YOUR MONEY.` / `v0.1 · 2026 · Q3`
- `src/components/sidebar/AppSidebar.tsx` — removed `CompassRose`, new `BrandMark` = `[C]` in teal-cyan box; chapter labels `// Overview` / `// Plan` / `// Money`; nav items in JetBrains Mono; active state with teal left rail + `›` terminal prompt; AUTO badge teal-bordered; user card with cyan border + mono email + green status dot
- `src/components/dashboard/DashboardCard.tsx` — default accent `cyan` (not gold), mono JetBrains Mono eyebrow, Sora headings, terminal `›` chevron, teal hover border + glow, 4 px corners, `[OK] DONE · N CARDS` button when in edit mode
- `src/components/dashboard/DashboardGrid.tsx` — customize toggle in teal/cyan, `+ Add card` button mono, AddCardSheet header `// configure` in cyan, sheet border-top teal, `+ Add` pill in mono cyan, `[OK] All available cards are already on your dashboard.` empty state
- `src/components/dashboard/catalog.ts` — terminal voice (`// daily`, `// schedule`, `// watchlist`, `// recommended`, `// priority`, `// snapshot`); titles "Daily Telemetry" (renamed from "Daily Tracking"), "Critical Timeline", "Envelope Status", "Next Step", "Top Priority", "Snapshot"; accents cyan / warn / neg / neg / gold / cyan

**Card content components re-skinned (6 files):**

- `daily-tracking.tsx` — eyebrows `// SAFE TO SPEND` / `// TODAY` / `// WEEKLY HEALTH`; big numbers in JetBrains Mono (safe in cyan or neg, today in ink, weekly in ink); pace labels prefixed with `[OK]` / `[WARN]` markers; `7-DAY SHAPE` sub label mono; sparkline line color changed from ink-2 to terminal-cyan
- `critical-timeline.tsx` — MonthCalendar unchanged structure; ScheduledBillsList section header `// SCHEDULED BILLS · THIS MONTH · N` mono cyan; planet dots, `AP` badge in cyan mono, `DAY 01` badge in gold mono, amounts in JetBrains Mono with `font-feature-settings: tnum, zero`
- `envelope-status.tsx` — status badge renamed to OVER / WATCH / CALM in mono caps with the accent color border; calm empty state now `[OK] All envelopes within target.` with `[OK]` chip instead of `✓`; bar color matches the per-envelope status
- `next-step.tsx` — main status chip now `[OK]` or `[WARN]` in JetBrains Mono (was `✓` / `!`); copy "Nice pace — the next paycheck will top up the ones that need it." (Sora body)
- `top-priority.tsx` — current/target/pct in JetBrains Mono, pct badge in mono gold bordered pill, bar gradient cyan→gold, target date in mono bordered pill, `+ check` amount in mono cyan bordered pill; sub-card "18-month projection" with mono caps header `// 18-month projection` in cyan
- `snapshot.tsx` — eyebrows `// net worth` / `// next paycheck` / `// this period` with mono caps; big numbers in JetBrains Mono colored per accent (cyan / gold / green); sub text in mono

`tsc --noEmit` clean. Dev server returns 200 on `/` and dashboard renders the new terminal voice end-to-end (verified via in-app browser screenshot — calendar with planetary glyphs, scheduled bills list with `DAY NN` badges, `[OK]/[WARN]` status markers throughout).

**Apply going forward** (saved to User Memory 2026-08-23):

- This design system applies on Compass and any other xKryptian work that wants the terminal / oracle flavor.
- "Component Oracle Terminal" = base #060A12 + teal #2DD4BF signal + gold #C9A45C accent + Sora / JetBrains Mono + oracle voice with terminal-log markers. No decorative occult.
- "Visible UI matters more than invisible architecture" preference still wins — the deep pages get re-skinned in subsequent visible-UI pushes, not as a single mega-PR.

**Cluster 2.0.3c–2.0.3e — deep-page re-skin (✅ DONE — commits `396e7e9`, `76e1284`, `72f2cec`; 2026-08-23)**

Per xKryptic's "push all deep pages now" directive, the entire app — not just the dashboard — has been moved to terminal voice. **Zero alchemical font refs remain** across all 34+ source files. The 5 commits ship:

- `396e7e9` (14 files) — top deep pages: `recurring`, `envelopes`, `period`, `goals`, `debts`, `accounts`, `insights`, `allocation`, `transactions`, `subscriptions`, `investments`, `emergency`, `invest`, `calendar`
- `76e1284` (15 files) — detail pages: `envelopes/[id]`, `goals/[id]` + all `new/*` and `edit/*` page wrappers + all 8 form files
- `72f2cec` (5 files) — chart components: `GoalTrajectory`, `BudgetVsActual`, `DebtPayoffSimulator`, `PlanMyNextCheck`, `PaycheckSimulator`

**Re-skin patterns applied across all files:**

- `var(--font-italiana), var(--font-cinzel), serif` → `var(--font-sora)` (headings, body)
- `var(--font-italiana), serif` → `var(--font-sora)` (input text, body)
- `var(--font-cinzel), serif` → `var(--font-jetbrains), monospace` (eyebrows, mono labels)
- `var(--font-cormorant), serif` → `var(--font-sora)` (body)
- `fontStyle: "italic"` removed (no italics in terminal voice)
- Primary CTAs (gold background, void text) → `background: var(--terminal-cyan)` with `var(--void)` text — preserves 7:1 contrast
- Eyebrows prefixed with `//` (e.g. `// money · envelopes`, `// plan · goals`)
- Section headers follow the locked pattern: `// TITLE` mono caps + bold Sora title + Sora body em (no italic)
- Mono stats: `// LABEL` mono caps + JetBrains Mono number + JetBrains Mono sub
- Status markers: `[OK]`, `[WARN]`, `[SIGIL]`, `[INDEXED]` — `[OK]` chip in mono caps with green border
- Planet colors preserved as semantic mapping (Sol=Rent etc.) — left-rail and accent borders only, not primary CTA
- Pacing line / today highlight: gold (`var(--gold)`) preserved as semantic accent
- The Mandala on `/period` is preserved as the page's alchemical centerpiece (per the v7 design — it's a visual anchor for the period arc). The page chrome around it is terminal.

**Files left in the alchemical voice (preserved intentionally):**

- The Mandala SVG (`src/components/alchemy/Mandala.tsx`) — alchemical centerpiece, intentional
- The VesselGlyph component (`src/components/alchemy/VesselGlyph.tsx`) — uses planet color as semantic identifier; no font ref to change
- Some alchemical vocabulary remains in user-facing copy where it's the term-of-art (e.g. "the vessel for this goal is the Jupiter · Savings envelope"). Decision: "vessel" stays as a term-of-art, but the surrounding microcopy is terminal.

**Visual verification (in-app browser, 4 deep pages captured):**

- `/recurring` — `// PLAN · RECURRING` eyebrow, mono summary cells (`// TOTAL RECURRING $1,113.99`), `// Due this period` section header with mono bill rows
- `/envelopes` — `// MONEY · ENVELOPES` eyebrow, mono stat cells (`// NEEDS ATTENTION 1` in red), `// Budget vs actual` section
- `/goals` — `// PLAN · GOALS` eyebrow, "The Trajectory" header in jupiter mono, GoalTrajectory chart with cyan/teal lines, mono legend (`100% TARGET` / `EMERGENCY FUND · 16mo` / `DEBT FREE · not moving`)
- `/period` — `// PERIOD 2 OF Q3` eyebrow, mono day counter, Mandala preserved as the period anchor

`tsc --noEmit` clean across all 39 source files. Dev server returns 200 on every page. **The full Compass app is now in Component Oracle Terminal voice.**

### Cluster 2.1 — Must-have viz + utility integration push (✅ DONE — single working session; 2026-08-23)

Per xKryptic directive: "go through this list and integrate everything into the build. after thats done we can fine tune where to place things more strickly. until then just place them where they would go best for now." Targeted two product lists:

**Must-have visualizations (5 of 5 wired to a visible surface):**
- **#1 Allocation Progress Bar** — `EnvelopeBarChart` + per-row `BurnSparkline` + per-envelope `EnvelopeMiniBar` (chart-next-to-data). Green/yellow/red states from `EnvelopeBarChart.tsx` (`var(--ok)` / `var(--warn)` / `var(--neg)`).
- **#2 Total Spend Progress Ring** — new `spend-ring.tsx` card. Concentric ring with center headline "REMAINING $X" + per-vessel % list (5 most-used shown). Ring color shifts cyan → warn → neg as fill crosses 50% / 90%. Wired into the catalog as `spend-ring` (defaultOff).
- **#3 Pay Period Horizon Line** — `Critical Timeline` card on the dashboard, with the full-month calendar (Cluster 2.0.2). Payday highlighted gold, bills as planet dots, today as gold ring.
- **#4 Growth Trend Curve** — new `net-trajectory.tsx` card. 12-month line projection of net worth at current period-delta pace, shaded area beneath the curve, gold dashed reference line at the emergency-fund target. Cyan dot at "now", jupiter dot at "12mo". Wired into the catalog as `net-trajectory` (defaultOff).
- **#5 Cash Flow Funnel (Sankey)** — new `pay-distribution.tsx` card (compact ribbon view at small size, since real Sankey doesn't read well below ~280px height). Shows the 7-vessel split as a horizontal stacked bar (gold source → planet destinations → free / unallocated). Full interactive Sankey stays on `/allocation`. Wired into the catalog as `pay-distribution` (defaultOff).

**Must-have tools index strip on the dashboard** — new `MustHaveToolsStrip.tsx`. Always-visible row above the card grid. Two rows: `// visualisations` (5 chips for the viz above) and `// utilities` (6 chips for the core features). Each chip is glyph + name + caption + `›` chevron; hover lifts the border. The 6 utilities:
- **Multi-Bank** → `/settings/plaid` (Plaid sandbox)
- **Smart Categorize** → `/settings/categorize` (rules engine)
- **Receipt Scan** → `/settings/receipt-scan` (paste-text OCR fallback)
- **Subscriptions** → `/subscriptions` (live detection)
- **Habit Quiz** → `/settings/habit-quiz` (5-question profile)
- **Household** → `/settings/household` (multi-user stub)

**Core features (8 of 8 wired):**
- **Multi-Bank Syncing (Plaid)** — `/settings/plaid` page with 6 mock institutions in a 3-col grid (Chase, Amex, Fidelity, Ally, Capital One, Venmo). Per-row Connect button. Sandbox warn banner. "What Plaid gives you" callout at the bottom. Schema ready; real Plaid env wires in a later cluster.
- **AI Auto-Categorization** — `/settings/categorize` with 12 seed rules (H-E-B → Groceries, Amazon → Joy, Spotify → Joy, etc.). Stats strip: rules / hits / coverage / uncategorized. v2 LLM-fallback roadmap card. Rules-based engine runs in the browser today.
- **Smart Receipt Scanning (OCR)** — `/settings/receipt-scan` with a paste-text form (`ReceiptScanForm.tsx`). Pre-filled with a sample H-E-B receipt. Parses merchant (first line), total (largest $ on a "total" line), date (any MM/DD/YYYY pattern). User picks vessel → "Save" creates the draft transaction.
- **Subscription & Bill Detection** — `/subscriptions` rewritten to derive rows from real data. New `src/lib/detect-subscriptions.ts` engine groups live transactions by payee (14/30/31-day cycle match, 2+ hits), unions with the BILLS list (recurring-by-construction). Each row gets active/review status from `lastUsedDays`. UI now shows: detected / active / review / recoverable stats + the list with "DETECTED" badge per row.
- **Modular Strategy Settings** — verified: 4 strategies on `/allocation` (Envelope / Zero-based / 50-30-20 / Pay-yourself-first) with Ouroboros preview, per-vessel breakdown, ARMED badge.
- **Dynamic Goal Calculators** — verified: `/goals` with `targetCents`, `currentCents`, `perPaycheckCents`, `targetDate` per goal; per-card `GoalSparkline` shows the projection. Master `GoalTrajectory` chart at the top of the page.
- **Behavioral Habit Quiz** — `/settings/habit-quiz` with 5 questions, 3-4 options each (A/B/C/D). Result maps to one of 4 profiles (Saver / Steady / Builder / Dreamer) based on weighted scores. Stored in localStorage; retakeable. The profile is the baseline for AI tier 1 insights.
- **Shared Multi-User Access** — `/settings/household` with member count / invites / shared stats, an email + role invite form (disabled), and a "schema is multi-user ready" callout. UI lands in Cluster 4.

**Settings hub** — new `/settings` index page lists all 6 utility surfaces in a 2-col grid (numbered `01–06`, mono caps titles, [OK]/[WARN] status badges, hover-lift).

**Sidebar** — added `Settings` as the 5th item in the `// Overview` chapter.

**New files:**
- `src/components/dashboard/MustHaveToolsStrip.tsx`
- `src/components/dashboard/cards/spend-ring.tsx`
- `src/components/dashboard/cards/net-trajectory.tsx`
- `src/components/dashboard/cards/pay-distribution.tsx`
- `src/lib/detect-subscriptions.ts`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/settings/plaid/page.tsx`
- `src/app/(app)/settings/categorize/page.tsx`
- `src/app/(app)/settings/receipt-scan/page.tsx` (+ `ReceiptScanForm.tsx`)
- `src/app/(app)/settings/habit-quiz/page.tsx` (+ `HabitQuiz.tsx`)
- `src/app/(app)/settings/household/page.tsx`

**Modified files:**
- `src/app/page.tsx` — added 3 new card entries + `MustHaveToolsStrip` between hero and grid
- `src/components/dashboard/catalog.ts` — 3 new `CardId` + 3 new `CARD_CATALOG` entries
- `src/components/sidebar/AppSidebar.tsx` — Settings nav entry
- `src/app/(app)/subscriptions/page.tsx` — wired to live data via `detectSubscriptions`
- `src/app/globals.css` — `.settings-row-link` + `.plaid-institution` hover/active rules (server-component-safe; no onMouseEnter)

**Verification:** `tsc --noEmit` clean across all 47 source files. Dev server returns 200 on every page (18 routes tested, all with correct content markers). Dashboard renders with: hero, Must-Have Tools strip, 4 defaultOn cards (Daily Tracking, Critical Timeline, Envelope Status, Next Step), and opt-in cards (Top Priority, Snapshot, Spend Ring, Net Trajectory, Pay Distribution) available via the + Add card sheet.

### Cluster 3.0 — Vessel shell foundation — Sovereign Monad pivot (✅ DONE — commit `81e7c7c`; 2026-08-24)

xKryptic's mid-session pivot: Compass re-themed from the Component Oracle Terminal (v5) to the **Sovereign Monad / vessel (v6)** design system. The new visual language is dark slate-purple canvas, neon purple accent, warning orange + over-limit neon red. The app wordmark is "Sovereign Monad" with a pulsing accent dot. The 7 planetary vessels (D14) are preserved as data semantics; only the visual treatment changes.

**Phase 1 — Infrastructure:**
- `prisma/schema.prisma`: added `model PayPeriod { id, startDate, endDate, isActive, createdAt, updatedAt }` with `@@index([isActive])` and `@@index([startDate, endDate])`. The `npx prisma generate` + `npx prisma db push` were applied to dev.db.
- `src/lib/mock.ts`: added `getCurrentPayPeriod()` that reads from the `PayPeriod` table with a constants fallback (`PERIOD_START` / `PERIOD_END` in `src/lib/mock-seed.ts`). The fallback is intentional — the table starts empty and a future cluster can seed it. The TopAppBar's "CYCLE" chip looks the same regardless.
- `src/app/(app)/settings/engine-actions.ts`: `toggleEngineAction` now returns `{ success: true, newLevel } | { success: false, error }` (was `Promise<void>`). The shape matches the spec's `useTransition` typed result envelope.
- `src/app/globals.css`: added the vessel palette as **additive** CSS custom properties so the existing Component Oracle Terminal components keep working:
  - `--vessel-dark: #16121e` (slate-purple canvas)
  - `--vessel-surface: #1c1726` (elevated)
  - `--vessel-border: #2d243d`
  - `--vessel-accent: #a855f7` (neon purple)
  - `--vessel-watch: #f97316` (warning orange)
  - `--vessel-over: #ef4444` (over-limit neon red)
  - `--vessel-accent-soft: rgba(168, 85, 247, 0.10)`
  - `--vessel-neon-glow: 0 0 12px rgba(168, 85, 247, 0.4)`
  - `--vessel-nav-shadow: 0 -4px 20px rgba(0, 0, 0, 0.6)`
- Added `@keyframes vessel-pulse` for the brand dot's heartbeat, with a `prefers-reduced-motion` fallback.

**Phase 2 — New shells:**
- `src/components/shell/TopAppBar.tsx`: full rewrite on vessel styling. Three regions — brand (pulsing accent dot + "SOVEREIGN MONAD" Sora 900 wordmark, letter-spaced), CYCLE chip ("CYCLE: AUG 22 ↔ SEP 5" with a thin vessel-accent progress rail), and engine toggle + settings cog. Sticky top, vessel-dark background, vessel-border bottom, soft drop shadow.
- `src/components/shell/EnginePillButton.tsx` (new): small client component for the toggle's pending state via `useFormStatus` (opacity 50% + cursor-wait during submission).
- `src/components/shell/BottomNav.tsx`: full rewrite on vessel styling. 4 tabs in a 4-col grid; Quick Entry is the floating 56px center disc (vessel-accent ring + neon-glow, elevated with `margin-top: -22`). Quick Entry glyph changed `+` → `⊕` to read more clearly as a circle-with-plus. The 3 flat tabs use vessel-accent active state.
- `src/app/(app)/layout.tsx` + `src/app/page.tsx`: read `getActiveEngineLevel()` + `getCurrentPayPeriod()` via `Promise.all` and pass them into TopAppBar as props. Force-dynamic so the bar reflects the latest engine level after `toggleEngineAction`.

**Phase 2.5 — Smoke updates for the new branding:**
- `tests/smoke-topbar.mjs`: 78 → 102 checks. Exercises the Sovereign Monad wordmark, pulsing accent dot, CYCLE chip (label + range + color + progress rail), engine pill label, vessel styling markers (vessel-dark bg + vessel-border).
- `tests/smoke-bottom-dock.mjs`: 70 checks. Updated Quick Entry glyph `+` → `⊕`. The tabCount regex and the active-tab regex now allow the `bottom-nav-tab--center` modifier on the floating center button (the old strict regex required `class="bottom-nav-tab"` to end with a closing quote; the center tab also has `--center` in its class).
- `tests/smoke-engine-toggle.mjs`: 7 checks. Reads the new label format "⚙ L1 RULES ENGINE" / "⚡ L2 AI ENGINE"; strips the leading glyph for stable equality.

**All 8 smokes green at 241/241** (topbar 102, rebalance 5, horizon-strip 16, alert-bay 22, vessel-feed 11, bottom-dock 70, reset-seed 8, engine-toggle 7).

**What is NOT yet migrated (the gap to Cluster 3.1):** the 5 body shells — `SafeToSpendHero`, `BurnCurve` (the cumulative-spend SVG), `HorizonStrip` (cards/horizon-strip.tsx), `VesselFeed` (AllocationFeed.tsx), and `RebalanceAlertBay + Drawer` — still use the Component Oracle Terminal palette (`var(--cosmos)`, `var(--terminal-cyan)`, `var(--gold)`, `var(--warn)`, `var(--neg)`). They render correctly today; the visual mismatch between the new vessel shell and the old terminal body is intentional. The recommended next cluster (3.1) replaces those tokens token-for-token with the vessel equivalents.

**Token-mapping cheatsheet for Cluster 3.1:**
| Old (Terminal) | New (Vessel) |
| --- | --- |
| `var(--cosmos)` | `var(--vessel-dark)` |
| `var(--surface)` | `var(--vessel-surface)` |
| `var(--line)` / `var(--line-soft)` | `var(--vessel-border)` |
| `var(--terminal-cyan)` | `var(--vessel-accent)` |
| `var(--terminal-cyan-dim)` | (no direct equiv — use `var(--vessel-accent-soft)` for 10% alpha, or opacity: 0.6 on accent) |
| `var(--gold)` | `var(--vessel-accent)` (or a vessel-watch if it's a warning state) |
| `var(--warn)` | `var(--vessel-watch)` |
| `var(--neg)` | `var(--vessel-over)` |
| `var(--ok)` | keep (system green is still semantically correct for "healthy" / "confirmed") |

**Prisma client cache gotcha for Cluster 3.1:** any standalone `node -e` / `node _peek_*.mjs` script that imports `@prisma/client` from outside the Next.js dev server will fail with `Cannot find module '.prisma/client/default'` (the in-memory Prisma client is regenerated when `npx prisma generate` runs and the standalone node process has the old resolution). The dev server is fine. Workaround for the peek scripts: hit the dev server's HTTP endpoint instead (e.g. `GET /api/reset-seed` to read/write envelope state), or use `sqlite3` directly on dev.db.

**Tidy-up pass still owed (per xKryptic's "fine tune where to place things more strickly"):**
- Decide which of the 3 new viz cards should be `defaultOn: true` (right now all 3 are opt-in)
- Decide if Settings belongs in the Overview chapter or its own `// Settings` chapter
- Add hover/active polish to the new viz cards (the static SVGs lack the click affordance the existing cards have)
- Add the MustHaveToolsStrip to the (app) layout below the hero on deep pages too (currently dashboard-only)
- Tighten the "Change certain displays" — the `/settings` index is 6 rows in a 2-col grid which may be too dense; consider a 3-col grid

### Cluster 3.1 — Vessel visual migration (✅ DONE — commits `bc1906d` + `f7ad92f`; 2026-08-24)

The 5 body shells listed in the Cluster 3.0 "what is NOT yet migrated" gap are now on the Sovereign Monad (v6) vessel palette. Token-for-token swap per the cheatsheet above; additive pattern (v5 Component Oracle Terminal tokens are still defined in `globals.css` for any un-migrated shell, but the new shells + migrated body use vessel tokens).

**Files migrated:**

- `src/components/alerts/RebalanceAlertBay.tsx` (commit `bc1906d`) — the warn-bordered alert banner with `[ Balance Envelope ]` CTA. Now: vessel-surface panel + vessel-watch warn border + vessel-accent CTA. The vessel-watch orange (`#f97316` = `rgb(249, 115, 22)`) replaces the old terminal amber `rgba(245, 158, 11, …)`.
- `src/components/alerts/RebalanceDrawer.tsx` (commit `bc1906d`) — the right-slide micro-drawer for fixing the over-limit envelope. vessel-surface panel + vessel-dark header + vessel-watch context banner + vessel-over error state + vessel-accent submit. Backdrop dim dropped to 0.45 alpha (vessel canvas is already dark; less dim needed).
- `src/components/envelopes/RebalanceForm.tsx` (commit `bc1906d`) — the 3-field "Move $X from Y → Z" form on `/envelopes`. Same vessel palette; cyan CTA → vessel-accent.
- `src/components/dashboard/cards/safe-to-spend-hero.tsx` (commit `f7ad92f`) — the daily-telemetry anchor (SafeToSpendHero + the BurnCurve sub-component, the cumulative-spend SVG). vessel-accent for the eyebrow + under-pace actual line; vessel-watch for the over-pace line; `var(--gold)` preserved for the "expected" trajectory + TODAY markers (semantic accent, like the engine pill in TopAppBar).
- `src/components/dashboard/cards/horizon-strip.tsx` (commit `f7ad92f`) — the 14-day horizon strip with the today row + event list. vessel-accent for the eyebrow + BILL tag; vessel-watch for the TRANSFER tag; `var(--gold)` preserved for the TODAY row rail + GOAL tag (semantic). The EventLine tag-background conditional picks the matching soft-tint rgba (gold soft / watch soft / accent soft).
- `src/components/dashboard/AllocationFeed.tsx` (commit `f7ad92f`) — the scrollable vessel feed (one row per envelope, with a 12px gauge bar). vessel-surface row bg + vessel-dark gauge track + vessel-over OVER state + vessel-watch WATCH state. Planet color (jupiter, sol, luna, etc.) preserved as the per-row left-rail vessel identifier. The `.vessel-feed-bar--over` blink class still fires (the keyframe in `globals.css` references `var(--neg)`, which is still defined globally).

**Tokens preserved (semantic, not migrated):**
- `var(--gold)` — "expected" / "today" / category-accent semantic (used by the engine pill, BurnCurve's expected line, HorizonStrip's TODAY rail + GOAL tag). The global `--gold: #C9A45C` token is still defined in `globals.css`.
- `var(--ok)` — system green for "healthy" / "confirmed" states. The vessel-over and vessel-watch cover warn/error; the system-green semantic is unchanged.
- `var(--jupiter)` and the other planet tokens — vessel identifiers, not palette colors. Preserved everywhere.
- `var(--ink-*)` — the light text scale works on the vessel-dark canvas unchanged.

**Smoke updates:**
- `tests/smoke-alert-bay.mjs` (line 105): the warn-border regex now matches `rgba(249, 115, 22, …)` (vessel-watch) instead of the old terminal amber `rgba(245, 158, 11, …)`.
- `tests/smoke-vessel-feed.mjs` (lines 108, 126, 128): the sparkline-fill regex + the OVER/WATCH bar-color regexes now match `var(--vessel-over)` / `var(--vessel-watch)` instead of the old `var(--neg)` / `var(--warn)`.

**Collateral fix (was blocking tsc):**
- `src/app/(app)/settings/engine-actions.ts` (commit `bc1906d`): `toggleEngineAction` return type was `Promise<ToggleEngineResult>` but the plain-form `action` prop in `TopAppBar.tsx` requires `Promise<void>` (plain server-action forms do not consume the typed envelope; only `useActionState` does). Changed to `Promise<void>`; the `ToggleEngineResult` type stays exported for any future `useActionState` caller. This was a Cluster 3.0 regression (the typed result was added in `81e7c7c` but no caller used it; `tsc --noEmit` had been failing since that commit).

**Verification:**
- `tsc --noEmit` clean
- All 8 smokes green at 241/241 (topbar 102, rebalance 5, alert-bay 22, horizon-strip 16, vessel-feed 11, bottom-dock 70, reset-seed 8, engine-toggle 7)

**What is NOT yet migrated (the residual gap):** the remaining dashboard shell components — `DashboardCard`, `DashboardGrid`, `MustHaveToolsStrip`, `PlanMyNextCheck`, `PaycheckSimulator`, `SwipeableDashboardHeader`, and the remaining dashboard cards (`daily-tracking`, `envelope-status`, `critical-timeline`, `net-trajectory`, `spend-ring`, `pay-distribution`, `snapshot`, `top-priority`, `next-step`, `month-calendar`) — still use Component Oracle Terminal tokens. The visual mismatch between the vessel shell and the terminal body is now reduced (the 5 priority body shells match) but not eliminated. Tracked as **Cluster 3.1.5 — Visual finish pass** (low effort, additive — same token map).

### Cluster 4.0 — Site-wide nav restructure (✅ DONE; 2026-08-25)

Per xKryptic's directive 2026-08-25: the 3-chapter `// Overview / // Plan / // Money` structure is no longer the right fit. The app reorganizes into **4 chapters + a System footer**, and the new structure is in production.

**New chapter structure:**

| Chapter | Items |
|---|---|
| **// Overview** | Dashboard, Period, Calendar, Insights |
| **// Ledger** | Accounts, Transactions, Envelopes, Allocation, **Obligations** (new — merges Recurring + Subscriptions), Debts, **Holdings** (renamed from Investments) |
| **// Aims** | Goals (Emergency Fund + Invest are now goal **types** on /goals, not standalone routes) |
| **// Learn** | **Field Guide** (new), **Your Numbers** (new), **Glossary** (new stub), **Habit Quiz** (moved from /settings) |
| **Footer / System** | Settings, Household, Plaid, Smart Categorize, Receipt Scan — behind the gear icon in TopAppBar, NOT a sidebar entry |

**Files changed:**

- `src/components/sidebar/AppSidebar.tsx` — full rewrite to the 4-chapter + footer structure. Removed `Settings` from the sidebar (it's behind the gear). Added `aria-current="page"` on the active item (was missing in the prior version — caught by the new sidebar smoke). The `isItemActive` helper now uses exact match for `/` and exact+prefix match for deep routes, so `/envelopes/x` stays lit when the sidebar item points to `/envelopes`.

- `next.config.ts` — added a `redirects()` block with 6 permanent (308) redirects:
  - `/recurring` → `/obligations?tab=bills`
  - `/subscriptions` → `/obligations?tab=subs`
  - `/investments` → `/holdings`
  - `/settings/habit-quiz` → `/learn/habit-quiz`
  - `/emergency` → `/goals?kind=emergency`
  - `/invest` → `/goals?kind=invest`
  Old deep links still work; bookmarks, smoke scripts, and shared URLs survive the rename.

- `src/app/(app)/obligations/page.tsx` (new) — the merged Recurring + Subscriptions view. Two-tab UI (Bills / Subscriptions) wired to live data from both sources. Reads `?tab=bills` (default) or `?tab=subs` via Next 16 `searchParams` Promise. The Bills tab is a direct port of the old `/recurring` content (liveBills + billsDueInPeriod + BillPaidToggle + due-day timeline); the Subs tab is a direct port of the old `/subscriptions` content (detectSubscriptions + stat strip + active/review list). The `+ Add bill` button only shows on the Bills tab.

- `src/app/(app)/holdings/page.tsx` (new) — rename of `/investments`. Same data, same accent (jupiter), just a new label and route. The 308 redirect handles the old URL.

- `src/app/(app)/learn/field-guide/page.tsx` (new) — the model behind the screens. 6 sections (the period, the vessels, allocation, overflow, goals, pace) with a top-of-page card grid, in-page anchors, and a "colophon" footer pointing to the Glossary and Your Numbers. Sora body, mono caps eyebrows, vessel-accent pull-quote left rail.

- `src/app/(app)/learn/your-numbers/page.tsx` (new) — coaching pulled from live data. Three sections: (1) headline ratios (envelopes used, envelopes over, period progress), (2) per-vessel attention list (over → watch → ok → calm, sorted), (3) top opportunities (same `topOpportunities` engine that powers the SafeToSpendHero). Each row is a one-line observation, not a thesis. Adapts to the data — calm when everything's tight, more rows when there's something to act on.

- `src/app/(app)/learn/glossary/page.tsx` (new stub) — the vocabulary. Per the user's choice, this lands as a calm `[OK] COMING SOON` state with the planned 12 terms listed in a footer callout. Term definitions will fill in over a follow-up pass.

- `src/app/(app)/learn/habit-quiz/page.tsx` (new) + `HabitQuiz.tsx` (moved) — the quiz from `/settings/habit-quiz`, copied verbatim and rebased to the new path. The 308 redirect handles the old URL. The Quiz component itself is unchanged.

- `src/app/(app)/settings/page.tsx` — full rewrite. Dropped the Subscriptions row (moved to /obligations) and the Habit Quiz row (moved to /learn). Renumbered the remaining 4 rows. Updated the eyebrow from `// overview · settings` to `// system · settings`. The page is now a true System hub (Multi-Bank, Smart Categorize, Receipt Scan, Household) — accessed via the gear icon in TopAppBar.

- `src/app/(app)/recurring/new/page.tsx` — the "Add bill" form. The "← All bills" back link now points to `/obligations?tab=bills` (was `/recurring`). The form itself is unchanged.

- `src/components/dashboard/MustHaveToolsStrip.tsx` — 3 href updates: Pay Period Horizon chip → `/obligations?tab=bills`; Subscriptions chip → `/obligations?tab=subs`; Habit Quiz chip → `/learn/habit-quiz`.

- `src/components/dashboard/PlanMyNextCheck.tsx` — the "mark them in Recurring →" CTA now points to `/obligations?tab=bills` with the new label "mark them in Obligations".

- `src/app/(app)/calendar/page.tsx` — the "Open Recurring →" link at the bottom of the bills-due warning now points to `/obligations?tab=bills` with the new label "Open Obligations".

- `src/components/dashboard/cards/critical-timeline.tsx`, `snapshot.tsx`, `dashboard/PaycheckSimulator.tsx` — 3 stale comment-only references updated to the new routes (so future readers see the right paths in the code comments).

**Dead-code / deletion note:** the old page files for `/recurring`, `/subscriptions`, `/investments`, `/emergency`, `/invest`, and `/settings/habit-quiz` are still on disk (the harness blocks `Remove-Item`). The 308 redirects in `next.config.ts` make them unreachable, so they're inert. A future cluster can move them to `_deprecated/` for tidiness, but no functional behavior depends on the removal.

**Collateral fix — pre-existing /debts bundling bug (caught by the new sidebar smoke):**

The new `smoke-sidebar.mjs` exercises every route in the sidebar, including `/debts`. That route failed to compile: `DebtPayoffSimulator.tsx` is `"use client"` but imported the pure `payoffProjection` and `orderDebtsByMethod` functions from `@/lib/store` — which transitively pulled in `better-sqlite3` (a Node-only native module) into the client bundle.

This bug had been latent since Cluster 1.9 (when DebtPayoffSimulator was first shipped); the prior 8 smokes never hit `/debts`, so the dev server's lazy compilation never tripped on it. My new sidebar smoke did.

**Fix:** extracted the pure payoff functions to a new file `src/lib/payoff-projection.ts` (no DB dependency). `lib/store.ts` re-exports them for backwards compatibility (so any server-side import keeps working). Updated `DebtPayoffSimulator.tsx` to import from the new file. The /debts page now compiles cleanly.

The same fix would apply to any other client component that pulls in a pure function from `@/lib/store`. Audited — `paycheckBreakdown` and `safeToSpend` are server-only callers; `billsDueInPeriod` is used in the `/recurring` server page (deleted, see above) and the `/obligations` server page (which I wrote fresh and uses the right import). No other leaks.

**Smoke updates:**

- `tests/smoke-sidebar.mjs` (new, 60 checks) — full coverage of the new 4-chapter structure. Verifies the chapter labels render in order, all 16 nav items have correct hrefs and labels, the Settings entry is absent from the sidebar, every new route resolves to 200, every old URL gets the 308 redirect, and each nav item gets the active treatment on its own page (via the new `aria-current="page"` attribute). This is the smoke that caught the /debts bundling bug.

- `tests/smoke-bottom-dock.mjs` (70 checks) — unchanged. The bottom dock is a separate navigation layer (Dashboard / Quick Entry / Advanced Analytics / Settings), not the sidebar.

- `tests/smoke-topbar.mjs` (102 checks) — unchanged. The top bar (TopAppBar) is unchanged.

- `tests/smoke-vessel-feed.mjs` (7 checks) — unchanged. AllocationFeed is unchanged.

- `tests/smoke-horizon-strip.mjs` (14 checks) — unchanged. Horizon strip is unchanged.

- `tests/smoke-alert-bay.mjs` (22 checks) — unchanged. RebalanceAlertBay is unchanged.

- `tests/smoke-rebalance.mjs` (5 checks) — unchanged. Tests `/envelopes` rebalance which is unaffected.

- `tests/smoke-reset-seed.mjs` (8 checks) — unchanged.

- `tests/smoke-engine-toggle.mjs` (7 checks) — unchanged.

- `tests/smoke-auth.mjs` — still pre-existing failing (expects "Welcome, Mom" heading on `/`; the dashboard was rewritten in Cluster 2.0 and the smoke hasn't been updated). Unrelated to this cluster.

**Verification:**

- `tsc --noEmit` clean across all 60+ source files.
- All 9 smokes green at 301/301 (topbar 102, sidebar **60** new, rebalance 5, horizon-strip 14, alert-bay 22, vessel-feed 7, bottom-dock 70, reset-seed 8, engine-toggle 7) — plus 6 OK / 0 MISS on the dev server route check.
- 308 redirects verified end-to-end: `/recurring` → `/obligations?tab=bills`, `/subscriptions` → `/obligations?tab=subs`, `/investments` → `/holdings`, `/settings/habit-quiz` → `/learn/habit-quiz`, `/emergency` → `/goals?kind=emergency`, `/invest` → `/goals?kind=invest`.
- All 16 new routes resolve to 200 (dashboard, period, calendar, insights, accounts, transactions, envelopes, allocation, obligations, debts, holdings, goals, learn/field-guide, learn/your-numbers, learn/glossary, learn/habit-quiz).

**Decision revision recorded:**

- **D13 (3-chapter sidebar) → 4-chapter + footer.** The D8 Sovereign Monad vessel tokens are unchanged. The D14 planetary vessels are unchanged. The D12 auto-allocate (no confirm modal) is unchanged.

**Follow-up clusters (not in this push, queued for fresh-session handoff):**

- **Cluster 4.1 — Glossary content fill-in.** ✅ Done 2026-08-25. 12 term definitions written, grouped by chapter (4 Overview / 7 Ledger / 1 Aims). Each term has a 1-paragraph mom-grade definition + 1–3 "where it shows up" deep links. Search box added (client-side filter; chapter sections stay visible so the vocabulary's structure is preserved while filtering). The COMING SOON stub and the "planned terms" callout are gone. New `smoke-glossary.mjs` (32 checks) locks in the 12-term structure + chapter sections + see-also links.
- **Cluster 4.2 — `/goals` goal-type filtering.** ✅ Done 2026-08-25. The /goals page now accepts `?kind=emergency` and `?kind=invest` to deep-link to the right goal type. New `GoalType { EMERGENCY, INVEST }` enum + nullable `goalType` field on the Goal model. New "Invest" goal seeded ($50,800 → $1.2M, jupiter planet, 22-year horizon). The 308 redirects from `/emergency` and `/invest` now land on the right filtered view. The page adds a 3-tab switcher (All [4] / Emergency [1] / Invest [1]) at the top + a per-card kind badge in the goal header (jupiter-bordered for EMERGENCY, mercury-bordered for INVEST). The trajectory chart still shows ALL goals (the comparison is the point of the chart — narrowing would lose the signal). New `smoke-goals.mjs` (36 checks) locks in the filter, the deep-link wiring, the tab counts, the per-card presence, and the no-cross-contamination. Also extended `/api/reset-seed` to call `resetStore()` so a seed change picks up without a dev server restart.
- **Cluster 4.3 — Deprecated cleanup pass.** ✅ Done 2026-08-25. The 6 files in `src/app/(app)/_deprecated/` (committed in Cluster 4.0) stay on disk as historical reference (the dev harness blocks `Remove-Item`; no Trash tool). The work for this cluster was the audit + lock-in: 4 stale live hrefs were updated to point to the new canonical paths (`lib/opportunities.ts:94` — subscription cancel href; `app/actions/bills.ts` — `revalidatePath("/recurring")` → `revalidatePath("/obligations")`; `app/(app)/recurring/new/NewBillForm.tsx:244` — back link; `components/dashboard/catalog.ts:67` — Critical Timeline card href). 2 comment-only references updated for accuracy. Added `src/app/(app)/_deprecated/README.md` explaining the situation, the redirect chain, and the audit history. Added `tests/smoke-deprecated.mjs` (42 checks) — locks in the 6 redirects return 308 with the right `Location` header, the old URLs return 308 (not 200 — confirms no file is being rendered), the redirect targets resolve to 200, the Sidebar has 0 entries pointing to old paths, and all 11 new canonical routes resolve to 200. Files will be hard-deleted in a future cluster when a Trash tool becomes available.
- **Cluster 4.4 — Visual finish pass.** ✅ Done 2026-08-25. The 16 dashboard shell components from the Cluster 3.1.5 list (DashboardCard, DashboardGrid, MustHaveToolsStrip, PlanMyNextCheck, PaycheckSimulator, SwipeableDashboardHeader, + 9 dashboard cards: daily-tracking, envelope-status, critical-timeline, net-trajectory, spend-ring, pay-distribution, snapshot, top-priority, next-step, month-calendar) were migrated from Component Oracle Terminal tokens to Sovereign Monad (vessel) tokens in one bulk pass. Two follow-on files were also migrated: `AppSidebar.tsx` (the sidebar was still on terminal tokens from its Cluster 4.0 rewrite — visual finish means the entire signed-in chrome is on vessel) and `app/page.tsx` (the dashboard entry point — the Next Step card's `[WARN] 1 ATTENTION` was using `var(--neg)`). 194 token swaps total: 16 shell files in pass 1, 2 chrome files in pass 2. The `--gold` and planet tokens are kept (semantic accents, per the Cluster 3.1 decision). New `smoke-visual-finish.mjs` (20 checks) locks in: vessel tokens are present in the rendered `/` (4 token groups, 347 total occurrences), no terminal tokens remain (`--cosmos`, `--cosmos-2`, `--cosmos-3`, `--surface`, `--line`, `--line-soft`, `--terminal-cyan`, `--terminal-cyan-dim`, `--warn`, `--neg` all 0), the old terminal RGBA colors are gone, `--gold` and `--jupiter` are preserved as semantic accents.

### Cluster 5.0 — LLM-powered onboarding (✅ Part A + Part B DONE; 2026-08-25)

The next user-facing product is a **CFP-grade conversational onboarding agent** that builds a complete financial identity for the user — pay schedule, income, fixed expenses, debts, assets, goals, risk profile, household — and produces a structured audit at the end. The agent is a real LLM-driven tool user, not a scripted form. Mavis is the production-grade LLM for onboarding; Ollama is the local fallback for the post-onboarding "ask me anything" advisor.

**Design decisions (locked):**
- **The LLM is the expert, not the orchestrator.** CFP knowledge lives in the system prompt; the tool definitions are the *mechanism*, not a forced flow. The agent decides what to ask, in what order, when to cross-reference, when to explain.
- **Provider split: Mavis (onboarding) + Ollama (ongoing advisor).** Mavis is production-grade for the high-stakes identity-creation moment. Ollama is privacy-first + free + local for the post-onboarding casual questions.
- **Single env var to switch: `LLM_PROVIDER=mavis|ollama|mock`.** No code changes to switch.
- **Tool format: OpenAI-compatible** for v1. Anthropic support is a follow-up.
- **Plug-and-play Mavis activation**: only 3 required env vars (`MAVIS_API_BASE`, `MAVIS_API_KEY`, `MAVIS_MODEL`). `MAVIS_TOOL_FORMAT` defaults to `openai` if left blank. Mavis was verified reachable on 2026-08-25 (HTTP 402 "insufficient balance" — auth + endpoint + model id all correct, just out of credit).
- **Path B taken**: all 3 providers (Mavis + Ollama + mock) code-complete; smoke runs against mock; flip `LLM_PROVIDER=mavis` when creds have credit.
- **L1 rules fallback** (Part B): when the user has selected a real provider (Mavis or Ollama) and the call throws (out of credit, network down, malformed response), the dispatcher falls through to the deterministic mock engine so the user can keep the conversation going. The fallback is marked in `meta.fellBack=true` + `meta.originalProvider` + `meta.l1Error`; the orchestrator records it on `state.lastFellBack` + `state.lastErrorMessage` so the chat UI can show a "we had trouble reaching Mavis; using a backup" banner. The mock provider never falls back (it IS the rules engine); if it throws, the error propagates.

**Part A — the LLM engine** (✅ done 2026-08-25):

The engine has 6 files + 1 dev API route + 1 smoke + 1 env contract. No persistence yet (Part B). All 14 smokes green at 467/467 (added `smoke-onboarding-agent.mjs` at 42 checks).

- `src/lib/llm/types.ts` — shared `LLMProvider`, `LLMTool`, `LLMToolCall`, `LLMMessage`, `LLMRequest`, `LLMResponse` types. Provider-agnostic normalized shape so the orchestrator doesn't care which provider was used.
- `src/lib/llm/config.ts` — env-driven provider selection. Reads `LLM_PROVIDER` + 3-4 vars per provider. **Throws** (not silent fallback) if the selected provider is misconfigured — silent fallback to mock would mask a real bug.
- `src/lib/llm/providers/mock.ts` — deterministic 5-topic state machine (income → debt → goal → risk → audit). Pattern-matches the user's last message, calls the right tool with the real tool spec's field names (`label`, `amountDollars`, `balanceDollars`, `aprPercent`, `targetDollars`), and ends with `buildAudit` + `markOnboardingComplete`. `resetMockState()` for test isolation.
- `src/lib/llm/providers/mavis.ts` — OpenAI-compatible Mavis API caller. Reads `MAVIS_API_BASE`, `MAVIS_API_KEY`, `MAVIS_MODEL`. POSTs to `${apiBase}/chat/completions` with the standard `messages` + `tools` shape. Maps the response back to the normalized `LLMResponse`. **Verified reachable** on 2026-08-25 — the Mavis endpoint accepted the auth header and the model id, returned a clean HTTP 402 (out of credit), with the request_id round-tripped.
- `src/lib/llm/providers/ollama.ts` — local Ollama server caller via `/api/chat`. OpenAI-compatible tool format. (Not exercised in smoke — will be the default for the post-onboarding advisor in Cluster 5.3.)
- `src/lib/llm/index.ts` — `callLLM()` dispatcher. Loads config once (cached), routes to the right provider, re-exports types.
- `src/lib/onboarding/system-prompt.ts` — the CFP system prompt (~10KB). 8 topic coverage areas, voice rules ("one question at a time", "never use 'should' without a reason"), cross-referencing examples, validation rules (catch unit/cadence slips), the closing audit structure, the edge cases (user wants to skip, user wants to talk for an hour, sensitive disclosures). This is the source of truth for "what the agent knows about personal finance."
- `src/lib/onboarding/tools.ts` — 12 tool definitions with JSON schemas: `saveIdentityBasics`, `saveIncomeSource`, `saveFixedExpense`, `saveDebt`, `saveAsset`, `saveGoal`, `saveRiskProfile`, `savePlannedEvent`, `saveHouseholdMember`, `savePreferences`, `buildAudit`, `markOnboardingComplete`. All money fields are **dollars** (not cents) to match the user's mental model — the orchestrator converts to cents before persistence.
- `src/lib/onboarding/agent.ts` — `runAgent({ userId, userMessage, history? })` orchestrator. Per-turn loop: LLM call → tool calls? → run tools → feed results back → LLM call again → ... → final response. Caps at 6 rounds to prevent runaway loops. Returns `{ agentMessage, toolCalls[], state, rounds, provider, onboardingCompleted }`.
- `src/lib/onboarding/state.ts` — in-memory `OnboardingState` keyed by userId, pinned to `globalThis` for HMR persistence. 13 fields (identity, income[], expenses[], debts[], assets[], goals[], risk, events[], household[], preferences, audit, completedAt, lastProvider). Designed so the persistence swap in Part B is a single module replacement.
- `src/app/api/dev-agent/run-agent/route.ts` — dev-only API route that exposes the agent for the smoke. Refuses to run in production. Supports `reset` and `resetAll` to wipe in-memory + mock state. Also calls `resetLLMConfig()` so env changes between smoke runs are picked up.
- `.env.local.example` — env contract (committed; `.env.local` is gitignored). Clear 4-field Mavis section, plug-and-play path documented, sample values inline.
- `.env.local` — gitignored, holds the actual Mavis creds (verified on 2026-08-25, currently out of credit).
- `tests/smoke-onboarding-agent.mjs` — 42 checks. Drives a scripted 4-turn conversation (`$1,820 biweekly` → `$300K mortgage at 6.5%` → `$20K emergency fund` → `30/65/moderate`). Verifies each tool call by name + result + state mutation. Verifies the 3rd turn produces 3 tool calls (`saveRiskProfile` + `buildAudit` + `markOnboardingComplete`) and `onboardingCompleted=true`. Verifies state carries across turns (income from turn 1 is still in turn 4). Verifies the reset path wipes and reseeds.
- `src/middleware.ts` — added `/api/dev-agent` to `PUBLIC_PREFIXES` so the smoke can hit the dev-only route without auth.
- 3 pre-existing tsc errors fixed (mock `extractCents`/`extractAprBps` undefined-match cases; `snapshotState` import in agent.ts).

**Smoke state**: 15 smokes green at 551/551 (Part B added 38 checks to the onboarding smoke: 42 → 80, net +38). `smoke-auth.mjs` pre-existing failing (expects "Welcome, Mom" heading on `/` — dashboard was rewritten in Cluster 2.0; smoke hasn't been updated). Unrelated to this work.

**Part B — Prisma persistence + L1 rules fallback** (✅ done 2026-08-25):

Replaces the in-memory `Map<userId, OnboardingState>` from Part A with a `FinancialIdentity` row + 7 child tables + an `OnboardingMessage` log. The `OnboardingState` interface is the same shape, so the agent's tool dispatcher and the chat UI (Cluster 5.1) need no changes — only the storage layer.

- **`prisma/schema.prisma`** — 9 new models. `FinancialIdentity` (1 per user, FK to User, has scalar identity + risk + preferences + audit + provider telemetry fields). 7 child tables (`IdentityIncome`, `IdentityExpense`, `IdentityDebt`, `IdentityAsset`, `IdentityGoal`, `IdentityEvent`, `IdentityHouseholdMember`) — one row per list item, each with `sortOrder` for stable ordering. `OnboardingMessage` for the full conversation log (one row per `LLMMessage`, monotonic `seq` per identity, `toolCallsJson` for assistant tool calls, `toolCallId` for tool results). The User model got `identity FinancialIdentity?` (1:1 optional).
- **`prisma db push`** applied — no migration file (matches the project pattern for PayPeriod/SystemSettings/GoalType from Clusters 3.0/4.2). The dev DB grew from 307KB → 385KB.
- **`src/lib/onboarding/state.ts`** (rewrote) — `loadConversation(userId)` does a single Prisma query with all 7 child includes + messages (ordered by `seq`), maps to `OnboardingState`. `saveConversation(state, newMessages)` is a single `$transaction`: upsert the identity, delete-and-insert all child rows (cheap because the lists are tiny), append the new messages (computed by the orchestrator as `workingHistory.slice(history.length)`). The seq starts at the highest existing seq + 1.
- **`src/lib/onboarding/agent.ts`** (refactored for async + telemetry) — `loadConversation` and `saveConversation` are now awaited. The orchestrator computes the new-messages diff before save. Added `fellBack` + `fallbackError` to `RunAgentResult`; the orchestrator reads `res.meta?.fellBack` from each LLM round and records it on the final state.
- **`OnboardingState`** grew 2 new fields: `lastFellBack: boolean` and `lastErrorMessage: string | null`. Both default to false / null on a fresh load.
- **`src/lib/llm/index.ts`** — L1 rules fallback. Wraps the primary provider call in try/catch; on error from Mavis or Ollama, logs a warning, calls `callMock` with a stable per-primary seed (`l1-fallback-mavis` or `l1-fallback-ollama` — different seeds so a user who flips primary mid-onboarding doesn't carry topic state), and returns the result with `meta.fellBack=true` + `meta.originalProvider` + `meta.l1Error`. The mock provider has no fallback (it IS the rules engine).
- **`src/app/api/dev-agent/run-agent/route.ts`** — async reset (await `resetConversation` / `resetAllConversations`). New `GET ?userId=...` endpoint that reads `prisma.financialIdentity.findUnique` to detect "no identity" (returns 404), then `loadConversation` and returns the full state. Auto-creates a `User` row for the smoke's arbitrary userId (placeholder password hash; dev-only).
- **`src/app/api/dev-agent/test-llm-call/route.ts`** (new) — forces a specific primary via env mutation in a try/finally block. The smoke hits it twice (Mavis, then Ollama) to verify the L1 fallback path.

**Cluster 5.0 acceptance:**
- [x] `prisma db push` applies without drift on the existing dev DB.
- [x] `tsc --noEmit` clean across all source files.
- [x] `loadConversation(userId)` returns a fully-hydrated `OnboardingState` from Prisma (identity + 7 lists + messages).
- [x] `saveConversation(state, newMessages)` persists the state + appends the new messages inside one transaction.
- [x] The agent's per-turn loop survives a dev server restart (state is in the DB, not in-memory).
- [x] The L1 rules fallback fires when `LLM_PROVIDER=mavis|ollama` and the primary errors; the mock engine produces the response; the orchestrator records `lastFellBack=true` on the state.
- [x] The chat UI (Cluster 5.1) can read `state.lastFellBack` + `state.lastErrorMessage` to surface a "we had trouble reaching Mavis" banner.

### Cluster 5.2.5 — Project identity to production tables (✅ DONE — commit `0fe11ac`; 2026-08-25)

The other dashboard widgets (period, envelopes, bills, allocation, insights) still read from the in-memory seed. This cluster lays the data-layer groundwork for the widget switch by projecting the FinancialIdentity into the production tables when the chat completes. The widgets themselves still read the seed; the actual switch is a follow-up cluster.

- **`prisma/schema.prisma`** — added the `Bill` model. Every other production table (Account, Envelope, Goal, AllocationPlan, AllocationRule) was already in place from Cluster 1; Bill was the only gap. Includes a `source` column (`seed | identity | user`) so the projected rows are distinguishable from the in-memory `BILLS_SEED` and any future user-entered bills.
- **`prisma db push` + `prisma generate`** — applied. Generated client now exposes `prisma.bill.{findMany,create,deleteMany,count}` etc. (Bill model field shape: `userId, name, amountCents, cadence, dueDay?, autopay, paidAt?, source, isArchived`).
- **`src/lib/identity/cadence.ts`** (new) — extracted `cadenceMonthlyFactor(cadence)` so the projection and the identity summary share one canonical cadence map (weekly=52/12, biweekly=26/12, semi_monthly=24/12, monthly=1, irregular=0). Was previously inlined in `identity-summary.ts`.
- **`src/lib/onboarding/projection.ts`** (new) — `projectIdentityToProduction(state, userId, { wipe = true })`. The projection is **idempotent**: re-running with the same state is a no-op; re-running with a different state wipes the previous projected rows (by `name startsWith "[identity] "` for Account/Goal + `source="identity"` for Bill) and re-inserts from scratch. Mapping:
  - `Income[]` → `Account` (type `checking`, balance 0 cents, `institution: "monthly:$X <cadence>"`)
  - `Assets[]` → `Account` (type from `mapAssetKindToAccountType`; retirement/HSA/brokerage → `other` until L2 lands)
  - `Debts[]` → `Account` (type `other`, `currentBalance: -Math.abs(balanceCents)`, `institution: "apr:X.XX% kind:<kind>"`)
  - `Expenses[]` → `Bill` (amountCents, cadence, dueDay=1 if monthly else null, autopay=false, source="identity")
  - `Goals[]` → `Goal` (targetAmount in cents, kind TRANSFER|MILESTONE, goalType EMERGENCY|INVEST|null, isPrimary=priority===1)
  Also exports `getProjectionCounts(userId)` for cheap count reads (used by the Identity Summary card footer).
- **`src/lib/onboarding/agent.ts`** — after `saveConversation` in the post-turn hook, if `onboardingCompleted` is true, dynamically import + call `projectIdentityToProduction`. Wrapped in try/catch so a projection failure logs a warning but doesn't break the chat (the identity itself is already persisted at that point).
- **`src/app/api/onboarding/seed-demo/route.ts`** — same projection call after the identity is seeded, so the demo path produces the same shape.
- **`src/lib/identity/identity-summary.ts`** — `loadIdentitySummary` now also calls `getProjectionCounts` and returns them in the result. The summary card surfaces them.
- **`src/components/dashboard/cards/identity-summary.tsx`** — new `ProjectionFooter` component. Renders `[OK] PROJECTED  N acct · M bill · K goal` (terminal voice, `[OK]` marker) below the suggestions. Hidden when total=0 (the projection hasn't run yet).
- **`tests/smoke-onboarding-agent.mjs`** — 17 new checks (97 total, was 80). The smoke now queries Prisma directly using the same `createRequire` + `PrismaBetterSqlite3` adapter pattern as `smoke-auth.mjs`, after the 4-turn conversation. Asserts:
  - 2 Account rows for the smoke user (1 income + 1 debt), 0 Bill rows (test conversation has no expenses), 1 Goal row (Emergency Fund)
  - Income account: `type=checking`, `balance=0`, `institution` contains `monthly:` and `biweekly`
  - Debt account: `type=other`, `balance=-30000000` cents, `institution` contains `apr:6.50` and `kind:mortgage`
  - Goal: `name="[identity] Emergency Fund"`, `targetAmount=2000000` cents, `kind=TRANSFER`, `goalType=EMERGENCY`, `isPrimary=true`
- **Restart note** — adding the Bill model requires a dev server restart, not just HMR. The Next dev server caches the generated Prisma client at module-graph level; new model accessors throw `Property 'bill' does not exist` until restart even though tsc is clean. Same constraint applied to PayPeriod, SystemSettings, GoalType, and now Bill. Recorded as Agent Memory.
- **JSDoc** on the smoke updated to mention Cluster 5.2.5 additions.

**What does NOT ship yet (deliberately):**
- The other widgets (period, envelopes, bills, allocation, insights) still read from the in-memory seed. The Bill table is now populated by the projection, but nothing reads it yet. Switching the existing widgets from `liveEnvelopes()` / `BILLS_SEED` / `MOCK_ACCOUNTS` / `mockAllocationPlan()` to the production tables is the next cluster.
- Risk profile → AllocationPlan (the auto-allocate engine) is not projected yet — the engine itself is L2 future work.
- Envelopes are not derived from expenses (a future cluster can do this).
- The first paycheck after onboarding still doesn't create a Transaction row.

**Cluster 5.2.5 acceptance:**
- [x] `prisma db push` applies the Bill model without drift on the existing dev DB.
- [x] `prisma generate` produces a client with `prisma.bill` accessors.
- [x] `tsc --noEmit` clean across all source files.
- [x] `projectIdentityToProduction(state, userId)` runs after `markOnboardingComplete` in `runAgent`.
- [x] `projectIdentityToProduction(state, userId)` runs after the identity is seeded in `/api/onboarding/seed-demo`.
- [x] Projection is idempotent (re-running replaces rows; no duplicates).
- [x] Projection failure does not break the chat or the seed-demo flow.
- [x] Identity Summary card shows the `[OK] PROJECTED` footer with accurate counts.
- [x] All 17 new smoke checks pass; total smoke 97/97 on this cluster.
- [x] All other smokes (alert-bay 22, bottom-dock 70, engine-toggle 7, glossary 32, goals 36, horizon-strip 14, onboarding-agent 97, period 46, rebalance 5, reset-seed 8, sidebar 60, topbar 102, vessel-feed 7, visual-finish 20) still green.
- [x] `smoke-auth.mjs` still pre-existing failing (unchanged from before this cluster).

**Open items (next clusters):**
- ~~**Cluster 5.2.6 — Widget switch (IN PROGRESS, 3/6 widgets done)**~~ ✅ **DONE 2026-08-26** (commits `fe4380c` + `e1e9066`). All 6 widgets on Prisma: recurring/bills, envelopes, goals, allocation, insights, accounts. 12/12 smokes green at 547 total checks. See "Last update" + sign-off entry for the contract.

---

## HANDOFF — Cluster 5.2.6 widgets 4-6 (allocation, insights, accounts)

**Picked up by**: next fresh session. Read this section + COORDINATION.md "Last update" + the three existing seeders as templates.

**State at handoff** (commit `c45c291`):
- Widgets 1-3 (recurring/bills, envelopes, goals) are DONE, committed, smokes green.
- `tsc --noEmit` clean. Adjacent smokes (reset-seed 8/8, deprecated 42/42, onboarding-agent 97/97) all green.
- Dev server on 127.0.0.1:3000. Restart pattern after any schema change: `Stop-Process -Id <pid>; cd <workspace>; npx next dev -p 3000` (background). **Always restart after `npx prisma generate`** — Next.js caches the generated client at the module-graph level, not source-file level (HMR alone isn't enough).

### The 8-step pattern (do this for every widget)

1. **Schema** — add the `source` field to the model (e.g. `source String @default("seed")`) if not present. **Check first** whether the model has the `user` back-relation: open `prisma/schema.prisma` and look for `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` on the model. **If it's missing, add it FIRST** — both on the model and on the User model (`bills Bill[]`, `envelopes Envelope[]`, `goals Goal[]`, `allocationPlans AllocationPlan[]`, etc.). Missing cascade-delete leaves orphan rows after user-delete test runs, which crash the new seeder with P2002 unique-constraint violations on `id`. Reference: the `Bill` and `Goal` models had this bug; Account and Envelope didn't. Then add an index like `@@index([userId, source])` if you'll be filtering on `source`.
2. **Push** — `npx prisma db push` (no migration file is the project pattern). Then `npx prisma generate`. Then **restart the dev server**.
3. **Seeder** — create `src/lib/seed-<model>.ts` exporting `ensureUser<X>Seeded(userId): Promise<{ seeded, version, alreadyHadSeed }>`. Idempotent: count check, then `deleteMany({ where: { userId, source: "seed" } })` + `createMany({ data: <SEED>.map(...) })`. Use the in-memory seed's stable id (e.g. `"env-rent"`, `"bill-rent"`, `"goal-emergency"`, `"plan-default"`) so the UI's `b.id === "env-rent"` key keeps working without a mapping layer. Bump a `<MODEL>_SEED_VERSION` constant if you ever change the canonical seed.
4. **Read function** — add `liveXFromDb(userId)` in `src/lib/mock.ts` that calls the seeder, then `prisma.<model>.findMany({ where: { userId, isArchived: false }, orderBy: { sortOrder: "asc" } })`, maps the rows to the legacy display shape. Return a plain object array (not Promise) is fine — the call sites `await` it.
5. **Page switch** — make the page `async`, add `await requireUser()` at the top, replace `const X = liveX()` with `const X = await liveXFromDb(user.id)`. Add `user.id` to every call site that needs it. Make sure the page's component subroutines (BillsTab, EnvelopeDetail, etc.) are also `async` if they call other async functions.
6. **Consumer widening** — viz components that take `planet: PlanetId` (non-null) may need to be widened to `planet: PlanetId | null` (the DB schema allows null for custom envelopes/goals). Pattern: `planet: PlanetId | null` on the prop type, and `planet ? PLANET_COLORS[planet] : "var(--ink-3)"` on the color lookup. Real examples: `EnvelopeMiniBar.tsx`, `GoalSparkline.tsx`.
7. **Reset endpoint** — `src/app/api/reset-seed/route.ts` already calls `resetUserEnvelopesToSeed`, `ensureUserBillsSeeded`, `ensureUserGoalsSeeded`. Add the new seeder's call in the same order: envelopes → bills → goals → (new).
8. **Smoke** — write `tests/smoke-<widget>-db.mjs` that: logs in as `mom@compass.local` / `correct-horse-battery-staple`, posts to `/api/reset-seed`, queries Prisma directly to verify the rows, hits the page and checks the right text appears, and (if there's a write path) does a round-trip via direct DB write + page re-render. Use the `PrismaBetterSqlite3` adapter pattern from `tests/smoke-onboarding-agent.mjs:65-76` for direct DB queries from the smoke. The smoke can clean up `source="user"` rows from previous runs at the top (`prisma.<model>.deleteMany({ where: { userId: { not: "" }, source: "user" } })`) for idempotency.

**Gotchas** (from the 3 widgets just done):
- The first `prisma.bill.createMany` after a fresh user delete+recreate crashed with P2002 because of orphan Bill rows with `id="bill-rent"` etc. from a previous test run. The `user` back-relation + `onDelete: Cascade` fixes future orphans. For one-time cleanup of existing orphans, write a `_cleanup_orphans.mjs` script that finds rows whose `userId` is not in `prisma.user.findMany()` and `prisma.<model>.deleteMany({ where: { userId: { in: orphans } } })` wipes them.
- The `setBillPaid` action is `useTransition` + `useOptimistic` (programmatic `await toggleBillPaid(null, fd)`), not a `<form action={...}>` — so smoke tests can't trivially exercise it via form POST + `$ACTION_ID`. Pattern: write to Prisma directly in the smoke (mimics what the action does), then re-render the page to verify the read picks it up. The new-bill form on `/recurring/new` is the opposite — it's a `useActionState` form, so the smoke can extract the action id by scoping to the form around the "Add this bill" button (`formStart = lastIndexOf("<form", addBtnIdx)`), not the page-level first `$ACTION_ID` (which is the engine-pill action).
- The first HTML-escaped JSON in the page (`&quot;id&quot;:&quot;[hex]&quot;`) is often the engine-pill action, not the new-bill form's action. Scope your extraction to the specific form to avoid triggering the wrong action.

### Widget #4: /allocation (allocation)

- **Models**: `AllocationPlan` + `AllocationRule` (already in `prisma/schema.prisma` lines 297-337). Both have `userId` but check the `user` back-relation + `onDelete: Cascade`. If missing, add `user User @relation(...)` to both models and `allocationPlans AllocationPlan[]` + the implicit `allocationRules` (not on User) to the User model.
- **Source field**: add `source String @default("seed")` to both models.
- **Seeder**: `src/lib/seed-allocation.ts`. The in-memory seed is `ALLOCATION_PLAN_SEED` in `src/lib/mock-seed.ts:344-359` — a single plan with 7 rules. Insert order: (a) `prisma.allocationPlan.create({ data: { id: "plan-default", userId, strategy: "envelope", isArmed: true, source: "seed" } })` (note: the seeder needs to use explicit id + return the plan; `createMany` doesn't return ids). (b) Then `prisma.allocationRule.createMany({ data: ALLOCATION_PLAN_SEED.rules.map(r => ({ id: r.id, planId: "plan-default", envelopeId: r.envelopeId, mode: r.mode, value: r.value, sortOrder: r.priority, source: "seed" })) })`. The `mode` enum ("percent" | "fixed" | "remainder") is stored as a String column. The `value` is the percent (0-100) or cents.
- **Read**: `livePlanFromDb(userId)` in `src/lib/mock.ts`. Lazy seed → `prisma.allocationPlan.findFirst({ where: { userId, isArmed: true } })` (there's typically one armed plan) → map to the `AllocationPlan` shape (with `rules: prisma.allocationRule.findMany({ where: { planId: plan.id }, orderBy: { sortOrder: "asc" } })`). The legacy shape is `{ id, strategy, isArmed, rules: [{ id, envelopeId, mode, value, priority }] }`. The DB shape has `sortOrder` (1-7) which is the same as `priority`.
- **Page**: `src/app/(app)/allocation/page.tsx` uses `livePlan()`. Switch to `await livePlanFromDb(user.id)` (the page is likely already async or easily made async). The Sankey reads from `livePlan()` + `liveEnvelopes()` — both should be from DB by the time /allocation is wired.
- **Smoke**: verify the 1 AllocationPlan + 7 AllocationRule rows in the DB, the strategy is "envelope" + isArmed, the rules have the right envelopeIds + percents summing to ≤100. Hit /allocation and verify the Sankey renders.

### Widget #5: /insights (insights)

- **Models**: composite page — reads from `Envelopes`, `Goals`, `Transactions`, `Snapshots`. All of these are already migrated (Goals/Envelopes in widgets 2-3; Transactions still in-memory; Snapshot is a derived view).
- **Schema**: no new fields. **But** the `Transaction` model is still in-memory. The /insights page likely uses `liveTransactions()` which reads from the in-memory store. The widget switch is OK to skip `liveTransactions` for now (the page will use a hybrid: DB for the migrated widgets, in-memory for Transactions). Note this in the commit message.
- **Source field**: none added.
- **Seeder**: none. The page just reads from the already-migrated sources via `liveEnvelopesFromDb`, `liveGoalsFromDb`. The Transaction read can stay in-memory for v1.
- **Read**: no new function. The page's existing imports change: `liveEnvelopes` → `liveEnvelopesFromDb` (await), `liveGoals` → `liveGoalsFromDb` (await), `liveTransactions` stays.
- **Page**: `src/app/(app)/insights/page.tsx`. Likely needs to be made async if not already. Replace the live* calls with the FromDb versions. Widen any consumer prop types (planet: PlanetId → PlanetId | null on viz components used here).
- **Smoke**: hit /insights and verify the page renders with the new DB-driven data. Look for known text from each migrated widget (envelope names, goal names) in the HTML. The page already has smokes (`smoke-insights.mjs`?), check before adding.

### Widget #6: /accounts (accounts)

- **Model**: `Account` in `prisma/schema.prisma:115-138`. Already has `user` relation + `onDelete: Cascade` (line 133). Just needs `source` field added.
- **Source field**: add `source String @default("seed")` to `Account`.
- **Seeder**: `src/lib/seed-accounts.ts`. The in-memory seed is `ACCOUNT_SEED` in `src/lib/mock-seed.ts:206-213` — ONE canonical account (acct-chase). The seeder inserts that one row with `source="seed"`. The projection (`src/lib/onboarding/projection.ts`) already inserts `[identity] ` prefixed accounts with `source: "identity"` so those coexist. **Be careful with the `currentBalance`** — the seed has 8_421_000 cents ($84,210) but the projection stores `0` (the per-period amount lives in PaySchedule, a future cluster). The seeder uses 8_421_000 to match the in-memory BILLS_SEED's display.
- **Read**: `liveAccountFromDb(userId)` in `src/lib/mock.ts`. The legacy shape is `{ id, name, mask, institution, type, balanceCents }` (single account, not array). Lazy seed → `prisma.account.findFirst({ where: { userId, type: "checking", isArchived: false, source: "seed" } })` (or the first account) → map.
- **Page**: `src/app/(app)/accounts/page.tsx` uses `liveAccount()`. Switch to `await liveAccountFromDb(user.id)`. The page also surfaces the projection's `[identity] ` accounts — those are separate rows. The page may want both lists (canonical + projected). If so, the read function should return both via `findMany`.
- **Smoke**: verify the 1 seed Account row in the DB, hit /accounts, verify the account name + balance renders.

### When all 6 widgets are done

1. Update COORDINATION.md "Last update" line to call out all 6 widgets done with smoke counts.
2. Update "Open items" to mark Cluster 5.2.6 as ✅ DONE.
3. Commit with a message like "Cluster 5.2.6 — Widget switch complete (all 6 widgets on Prisma)".
4. Update the bottom-dock / vault smokes if they touch any migrated read (they don't currently read from any of the migrated tables directly).
5. Run **all** smokes and confirm green: `node tests/smoke-auth.mjs` (pre-existing fail), `smoke-bills-db.mjs`, `smoke-envelopes-db.mjs`, `smoke-goals-db.mjs`, `smoke-allocation-db.mjs` (new), `smoke-insights-db.mjs` (new), `smoke-accounts-db.mjs` (new), `smoke-reset-seed.mjs`, `smoke-deprecated.mjs`, `smoke-onboarding-agent.mjs`, plus the 8 visual smokes (alert-bay, bottom-dock, engine-toggle, glossary, horizon-strip, period, sidebar, topbar, vessel-feed, visual-finish). If any regress, fix in the same session before handing back.
6. Hand back to xKryptic with the commit hash + a "Cluster 5.2.6 complete" summary.

### Reference files (the templates)

- **Best template for a 1-table seeder**: `src/lib/seed-bills.ts` (BILLS_SEED → Bill rows, simple flat insert).
- **Best template for a model with `kind` + `goalType` enums**: `src/lib/seed-goals.ts` (maps in-memory `GoalKindSeed` / `GoalTypeSeed` to the Prisma `GoalKind` / `GoalType` enums — the string values are identical so the mapping is identity).
- **Best template for an existing seeder that needed the `source` field added**: `ensureUserEnvelopesSeeded` + `resetUserEnvelopesToSeed` in `src/lib/store.ts` (the seed function was already there from Cluster 3.0; widget #2 just added the `source: "seed"` line to both createMany data blocks).
- **Best template for a page switch**: `src/app/(app)/goals/page.tsx` (made async, added `await requireUser()`, swapped `liveGoals()` → `await liveGoalsFromDb(user.id)`, filtered to non-null planet + targetDate for the trajectory).
- **Best template for a smoke**: `tests/smoke-goals-db.mjs` (login, reset, query Prisma, hit page, deep-link filter, DB-write → re-render round trip).

### Cluster 5.3 — Ongoing advisor (Ollama)

### Cluster 2 (after Cluster 2.0)

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

### Next session: pick from the handoff menu below

**Cluster 1.6 form actions + onboarding is now DONE** (folded into Cluster 1.10 — drill-downs + form actions: New envelope / New bill / New debt / New goal / New transaction + edit forms for goals / envelopes / target). See the "Cluster 1.10 follow-up" commit history. The form pattern (dollars in, cents on the server, Zod validate, revalidate path, inline error) is established and the 8 form components are wired.

The "Next session" pointer has been retired. The next session should:

1. **Read this COORDINATION.md top-to-bottom** (it's the contract)
2. **Read `00-DESIGN.md` v4.0** (the design spec — note v4.0 = alchemical, but the **v5.0 Component Oracle Terminal re-skin is the live visual language** as of 2026-08-23; treat the design spec as canonical for *what* to build and the Cluster 2.0.3 section as canonical for *how it looks*)
3. **Pick a cluster from the handoff menu below** and ship it. If xKryptic gives a directive, follow that.

**Handoff menu — next-up clusters (all scoped, not started):**

- **Cluster 3.1 — Vessel visual migration (✅ DONE — see body entry above; commits `bc1906d` + `f7ad92f`)** — The 5 priority body shells (SafeToSpendHero + BurnCurve, HorizonStrip, VesselFeed, RebalanceAlertBay + Drawer) are all on the vessel palette. Same token map, additive pattern.
- **Cluster 3.1.5 — Visual finish pass (RECOMMENDED NEXT)** — Migrate the remaining dashboard shell components from Component Oracle Terminal tokens to vessel: `DashboardCard`, `DashboardGrid`, `MustHaveToolsStrip`, `PlanMyNextCheck`, `PaycheckSimulator`, `SwipeableDashboardHeader`, and the remaining dashboard cards (`daily-tracking`, `envelope-status`, `critical-timeline`, `net-trajectory`, `spend-ring`, `pay-distribution`, `snapshot`, `top-priority`, `next-step`, `month-calendar`). Low effort, additive — same token-for-token swap as Cluster 3.1. Smokes should stay green; the only checks that might be affected are the ones that assert on the migrated card colors.
- **Cluster 2.1 — Alchemical voice microcopy sweep** (low effort, high polish) — `src/components/dashboard/catalog.ts` em strings still have alchemical flavor ("vessels needing attention", "the one thing to fix"). Replace with terminal voice. ~20 strings. Also review the few leftover alchemical words in pages.
- **Cluster 2.2 — ⌘K command palette** (medium effort, high visible-UI) — global search/navigation drawer; jumps to any of 28 routes + any envelope/goal/debt/bill. Mom will love this on payday.
- **Cluster 2.3 — Onboarding flow (D2 of 1.6 was actually never built)** — pay schedule picker → seed 7 envelopes → arm plan → land on dashboard. Critical for any real second user; smoke test exercises this path.
- **Cluster 2.4 — Bill reminders** (Tier 1 AI) — "Spectrum Internet due in 3 days, $75 from Chase Checking." In-app banner first.
- **Cluster 2.5 — Variable income mode** — toggle in PaycheckSimulator that routes irregular checks to Buffer instead of auto-distribute.
- **Cluster 2.6 — Period close (D18)** — at `TODAY > PERIOD_END`, write a `PeriodClose` row, snapshot balances, roll unallocated Buffer / over-limit deltas, audit.
- **Cluster 2.7 — Responsive polish** (small effort) — `/envelopes` section header meta wraps on narrow viewports; `/period` right column overflows at 938px. `flex-wrap` + `min-width: 0` fixes. Test at 768 / 938 / 1280 / 1440.
- **Cluster 3.x — Layout customization system (D3, structural)** — widget registry, slot system, drag-drop, saveable views. The big one.
- **Cluster 4 — Plaid sandbox / L2 routing** (real money).

**Open issues (not yet promoted to clusters):**

- **pnpm build EPERM** — Turbopack build fails on the OneDrive-synced `.next` folder. Not blocking because dev server works for visual verification. Workarounds: (a) build only when dev server isn't running; (b) move `.next` outside the OneDrive sync; (c) accept dev-only verification. Decide when the next ship needs a real build artifact.
- **Catalog em strings** — see Cluster 2.1.
- **Narrow-viewport wrap** — see Cluster 2.7.

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
- **Cluster 1.6 (form actions + onboarding)**: ✅ shipped inside Cluster 1.10 (form pages + drill-downs)
- **Cluster 1.9 (Debt payoff + projections)**: ✅ 2026-08-23, commits `feb50e3` + `801525c` + `0ffb439`
- **Cluster 2.0 (customizable card dashboard)**: ✅ 2026-08-23, commit `e648ef5`
- **Cluster 2.0.1 (visual-first data cards)**: ✅ 2026-08-23, commit `af0b8d3`
- **Cluster 2.0.2 (full-month calendar)**: ✅ 2026-08-23, commit `34f3928`
- **Cluster 2.0.3 (Component Oracle Terminal re-skin — full app)**: ✅ 2026-08-23, commits `884fe70` + `29dcd02` + `396e7e9` + `76e1284` + `72f2cec`
- **Cluster 2.x (Smart bills + variable income)**: ⏳ scoped, not started (see "Handoff menu" above)
- **Cluster 2.1 (Must-have viz + utility integration push)**: ✅ 2026-08-23, single working session — 5 viz wired (3 new dashboard cards + 2 already-shipped) + 6 utility surfaces under /settings + Must-Have Tools index strip on the dashboard + /subscriptions wired to live detection.
- **Cluster 5.2.6 (widget switch — all 6 widgets on Prisma)**: ✅ 2026-08-26, two focused pushes. Widgets #1-3 (recurring/bills, envelopes, goals) shipped in the prior session. Widgets #4-6 (allocation, insights, accounts) shipped in this session as commits `fe4380c` + `e1e9066`. The /allocation page now reads from Prisma `AllocationPlan` + `AllocationRule` (rule-driven distribution: 33% Rent, 18% Savings, 15% Debt, etc.). The /insights page reads envelopes + goals from Prisma (Transaction read + Snapshot still in-memory, per the handoff). The /accounts page reads from Prisma `Account` (canonical + `[identity] ` projection rows surfaced separately). Latent bug fixed in /accounts: balance cell was hardcoded to `formatMoney(2_400_00)` (next paycheck), now reads the live `account.balanceCents`. New seeders: `seed-allocation.ts` (1 plan + 7 rules), `seed-accounts.ts` (1 canonical row). New read functions: `livePlanFromDb`, `liveAccountsFromDb`. New smokes: `smoke-allocation-db` (53), `smoke-insights-db` (23), `smoke-accounts-db` (33). All 12 smokes green at 547 total checks. AllocationRule gained `onDelete: Cascade` on its envelope relation so /api/reset-seed can wipe + reseed envelopes without FK violations.
- **Cluster 3.0 (Vessel shell foundation — Sovereign Monad pivot)**: ✅ 2026-08-24, commit `81e7c7c` — vessel palette added to globals.css, PayPeriod Prisma model + getCurrentPayPeriod() reader, toggleEngineAction typed result, new TopAppBar (Sovereign Monad wordmark + pulsing accent dot + CYCLE chip + engine pill), new BottomNav (4 tabs + floating Quick Entry disc), all 8 smokes green at 241/241. Old Component Oracle Terminal tokens preserved additively; body shells (SafeToSpendHero, BurnCurve, HorizonStrip, VesselFeed, RebalanceAlertBay) still use cosmos/teal/gold and migrate in Cluster 3.1.
- **Cluster 3.1 (Vessel visual migration — 5 body shells)**: ✅ 2026-08-24, commits `bc1906d` + `f7ad92f` — RebalanceAlertBay + Drawer + Form (Component 3) and SafeToSpendHero + BurnCurve + HorizonStrip + AllocationFeed (Components 1+2+4+5) all on vessel tokens. Collateral tsc fix in `engine-actions.ts` (toggleEngineAction return type narrowed to `Promise<void>` to satisfy the plain-form `action` prop signature; the typed `ToggleEngineResult` envelope stays exported for future `useActionState` callers). All 8 smokes still green at 241/241. The remaining shell components (DashboardCard, DashboardGrid, MustHaveToolsStrip, PlanMyNextCheck, PaycheckSimulator, SwipeableDashboardHeader, and the other dashboard cards) still use terminal tokens and are tracked as Cluster 3.1.5.
- **Handed off (design)**: 2026-08-21
- **Handed off (scaffold)**: 2026-08-22
- **Handed off (auth)**: 2026-08-22
- **Handed off (Cluster 1)**: 2026-08-22
- **Handed off (Cluster 1.8 + 1.9 + 2.0 + 2.0.1 + 2.0.2 + 2.0.3)**: 2026-08-23
- **Handed off (Cluster 2.1 — must-have integration)**: 2026-08-23
- **Handed off (Cluster 3.0 — vessel shell foundation)**: 2026-08-24
- **Handed off (Cluster 3.1 — vessel visual migration)**: 2026-08-24
- **Handed off (Cluster 3.2.x — dashboard polish + Cluster 4.x — nav restructure + visual finish)**: 2026-08-25, session `mvs_195bdf454faf4c83ad4a59dbb183effb` (4.0 nav restructure 29 files + 6 redirects `d8514d6`; 4.1 glossary fill-in 12 terms `5af95a4`; 4.2 /goals goal-type filtering + GoalType enum + INVEST seed `e165ce7`; 4.3 deprecated cleanup pass 4 stale hrefs + smoke `0a40170`; 4.4 visual finish pass 194 token swaps across 18 files `d9cd3b8`)
- **Handed off (Cluster 5.0 Part A — LLM engine + onboarding agent)**: 2026-08-25, same session (`a4b1d9e` — 3 providers code-complete, smoke at 42 checks, Mavis verified end-to-end with real CFP-grade responses)
- **Handed off (Cluster 5.x — Period page: 7-feature push + PeriodDonut fix)**: 2026-08-25, same session (3 commits: `10ea75c` pace/bridge/compare, `5e09337` ring/safe-to-spend/burn/sankey, `e58bd05` multi-sector donut fix)
- **From session**: `mvs_77706038b3dc41f0818e43d1aca029bd` (design)
- **From session**: `mvs_0ca37adfb53b4de188d584afc12df309` (scaffold + auth + Cluster 1 + Cluster 1.5 + Cluster 1.7)
- **From session**: `mvs_4d1dd62520784d9c9f0c7511fdeaee6d` (1.7 visual audit → 1.8 bill organizer → 1.9 debt payoff → 2.0 customizable dashboard → 2.0.1 visual-first → 2.0.2 full-month calendar → 2.0.3 Component Oracle Terminal re-skin of the full app)
- **From session**: `mvs_28714e5fc30a415aa7fe7b06b51246f5` (Q4–Q7: GoalKind enum + SystemSettings + engine toggle, commit `dbbdaec`; then Prisma cutover, then vessel shell foundation, commit `81e7c7c`)
- **From session**: `mvs_195bdf454faf4c83ad4a59dbb183effb` (Cluster 3.1 vessel + 4.0 nav + 4.1 glossary + 4.2 goals filtering + 4.3 deprecated cleanup + 4.4 visual finish + 5.0 Part A LLM engine + 5.x Period page 7-feature push + PeriodDonut fix)
- **From session**: `mvs_1bcddf951dde44e08752858a24aeda18` (Cluster 5.0 Part B + Cluster 5.1 + Cluster 5.2 + Cluster 5.2.5: Prisma persistence + L1 fallback + OnboardingGate + /onboarding page + ChatSurface + ProgressRail + ProviderBanner + reset endpoint + Identity Summary dashboard card + Use demo data button + /api/onboarding/seed-demo endpoint + Bill model + projectIdentityToProduction + ProjectionFooter + 17 new smoke checks; total 14/15 smokes green at 526/526, smoke-onboarding-agent 97)
- **From session**: `mvs_9cb2d226c55c4c31b0573065b31cfd08` (Cluster 5.2.6 widgets #4-6: `source` field + cascade fixes on AllocationPlan + AllocationRule + Account; new `seed-allocation.ts` (1 plan + 7 rules) + `seed-accounts.ts` (1 canonical row); new `livePlanFromDb` + `liveAccountsFromDb` read functions; /allocation rewritten to use rule-driven distribution; /insights page now reads envelopes + goals from Prisma; /accounts rewritten to read from Prisma + surface `[identity]` projection rows; fixed latent /accounts balance hardcode bug; /api/reset-seed now calls the new seeders; 109 new smoke checks across 3 new files. All 12/12 smokes green at 547 total checks. See "Cluster 5.2.6" sign-off entry for the contract.)
- **Handed to**: next session — **Cluster 5.2.6 is ✅ DONE**. Recommended next cluster is **5.3 — Ongoing advisor (Ollama)**: flip the existing dashboard widgets (period, envelopes, bills, allocation, insights) from the in-memory seed (`liveEnvelopes()`, `BILLS_SEED`, `MOCK_ACCOUNTS`, `mockAllocationPlan()`) to the production tables. The data layer is now in place after 5.2.5 — Account/Bill/Goal tables are populated by the projection; the in-memory seed still drives the widgets. Recommended approach: add a `source` field to the migrated seed rows (like Bill already has via `prisma db push`) so production reads can filter `WHERE source IN ('seed','identity')` and the projected rows + migrated seed rows are visible together. This is the visible-UI half of the chat-to-dashboard pipeline (5.2.5 was the invisible-architecture half). After 5.2.6, the queue is: 5.3 ongoing advisor via Ollama (post-onboarding "ask me anything" surface, same `callAgent` interface, privacy-first). The chat is live (sign in as `mom@compass.local` / `correct-horse-battery-staple` and visit `/onboarding`). The Identity Summary card appears on the dashboard with the chat's data + a `[OK] PROJECTED N acct · M bill · K goal` footer. The "Use demo data" button on /onboarding gives instant-onboard (no chat) — click it and you're on the dashboard with seeded income, debt, goal, AND projected production rows. The L1 rules fallback fires automatically when Mavis/Ollama errors — the `ProviderBanner` surfaces the warning. `.env.local.example` is committed; the actual `.env.local` is gitignored. The design system is **Sovereign Monad / vessel (v6)**, superseding Component Oracle Terminal. `tsc --noEmit` is clean; 14 smokes green at 526/526 (smoke-onboarding-agent 97, smoke-period 46, smoke-sidebar 60, smoke-topbar 102, smoke-bottom-dock 70, smoke-goals 36, smoke-glossary 32, smoke-rebalance 5, smoke-reset-seed 8, smoke-engine-toggle 7, smoke-vessel-feed 7, smoke-horizon-strip 14, smoke-alert-bay 22, smoke-visual-finish 20); `smoke-auth.mjs` pre-existing failing — unrelated; dev server on 127.0.0.1:3000.

---

## Mavis → Compass Vault feature (start: 2026-08-25)

The user attached `DeFi/Compass vault.docx` (extracted to `DeFi/Compass vault spec.md`) — a full implementation-ready spec for a **Compass Vault** feature: a self-custodial, programmable bill-reserve account with stablecoin yield, off-ramp payment gateway, and a 13-state bill payment state machine.

This is a **brand-new feature**, not a refactor of existing Compass. It introduces a new domain (Safe smart accounts, yield strategies, off-ramp providers, bill automation) and a new route (`/vault`). The spec is opinionated about architecture: Safe for custody, two-tier yield allocation, multi-provider off-ramp gateway with manual-recovery fallback, discriminated result types for settlement, explicit risk disclosure UI.

**The spec defines 4 build phases:**

1. **Phase 1 — Compass Product Integration** (UI + mock data, no DeFi risk): add `/vault` route, mock vault data from existing envelopes, bill schedule table + lifecycle badges, yield attribution display, yield routing controls (local/demo), alert states
2. **Phase 2 — Backend Ledger**: `vault_accounts`, `vault_envelopes`, `scheduled_bills`, `yield_events`, `payment_attempts`, `provider_events` tables; immutable audit ledger; idempotency keys; mocked off-ramp integration tests
3. **Phase 3 — Testnet System**: Safe smart-account deployment, USDC testnet deposits, testnet yield adapter, scheduled keeper task, full state-transition tests
4. **Phase 4 — Production Readiness**: legal/compliance, contract audit, closed beta, multi-provider adapters, mobile push

**This is a multi-session feature.** Phase 1 alone is substantial (a full new page with state machine, yield attribution, bill scheduling). Phases 2-4 are each larger. Plan is to ship Phase 1 in focused slices and hand off at the natural breakpoint between phases.

### Architecture decisions locked from the spec

- **Vault lives inside Compass, not a separate product.** No AuraFinance branding. `/vault` is a normal authenticated route.
- **Two-tier capital allocation** — liquidity buffer (USDC, 3-7 day bills) + yield reserve (sUSDS/USDS savings, longer-dated bills). The spec calls out Sky/Aave as the example providers but treats them as replaceable adapters.
- **Off-ramp is a gateway, not a single provider.** `IOffRampAdapter` interface, `OffRampGateway` orchestrator, `FallbackManualPushAdapter` is a non-negotiable safety path. Spritz + Monto are the demo adapters. Never hardwire to one provider.
- **Bill state machine has 13 states** — DRAFT / FUNDED / EARNING / PREPARING_SETTLEMENT / EXECUTING / SETTLED + 7 alternates (PAUSED, INSUFFICIENT_FUNDS, REQUIRES_REVIEW, MANUAL_ACTION_REQUIRED, FAILED_RETRYABLE, FAILED_FINAL, CANCELLED). A bill is never considered paid until provider settlement confirmation.
- **Discriminated result types for off-ramp outcomes** — TS unions so the UI is forced to handle success / degraded success / failure correctly.
- **Yield attribution is by capital share**, not vault-wide lump sum. Default policy: under $1 → auto-compound; $1+ → ledger, compound by default. User can opt into auto-routing (COMPOUND / APPLY_TO_NEXT_BILL / MOVE_TO_AVAILABLE / SPLIT_BY_ENVELOPE). Principal reserved for bills is never reduced by yield routing.
- **Money in integer cents** (Compass house rule) — the spec's example types use `number` but the project standard is `int`. The Vault types will use the same pattern.
- **Audit log is non-negotiable** for every L1+ action (funding, strategy, automation, provider, manual recovery, user override).
- **Mandatory risk disclosure UI** before activation — "This is a self-custodial digital-asset vault, not a bank account."
- **Design system fit**: existing Compass is on **Sovereign Monad / vessel (v6)**. The HTML prototype in the docx is dark glass + cyan/indigo gradients — that conflicts with the v6 system. Phase 1 should integrate with the existing token system, not introduce a new visual language. The prototype is reference for layout/data shape, not for visual style.

### Where this slots in the 16-step build order

This is **not** on the 16-step list (which tops out at "Allocation rules engine (L1 routing)" in step 9 and AI tiers). The Vault is a **separate, larger feature** that runs in parallel to the main roadmap. The recommended next main-roadmap cluster remains **5.2.5 (Projection step + remaining surfaces)**, but if we're working on the Vault we focus there until the slice is shippable.

### Proposed first slice — Phase 1.0 (mock-data UI shell)

If you greenlight this, the first shippable slice is:

1. **Type definitions** — `src/lib/vault/types.ts` with the spec's `VaultAccount`, `VaultEnvelope`, `ScheduledBill`, `YieldEvent`, `BillStatus` enums, `OffRampResult` discriminated union, `IOffRampAdapter` interface. All integer-cents where the Compass standard applies. Mirror the spec faithfully.
2. **Mock data layer** — `src/lib/vault/mock-data.ts` that derives a `VaultAccount` + 5–7 `VaultEnvelope`s + 4–6 `ScheduledBill`s from the existing Compass envelopes (via Prisma read of the live DB at page mount). This is what the spec calls "mock vault data from existing Compass envelopes" — the envelopes are real, the yield/automation is simulated.
3. **State machine helpers** — `src/lib/vault/state-machine.ts` with `transitionBill(bill, event)` that enforces the legal DRAFT → FUNDED → EARNING → ... transitions and the alternate-state entry conditions. Pure function, no DB.
4. **Yield attribution** — `calculateEnvelopeYield` per the spec (capital share, not lump sum).
5. **`/vault` route** — server component, reads envelopes from Prisma, derives mock vault data, renders the page. Nav entry under LEDGER.
6. **Page layout (v1, the minimum shippable surface)**:
   - Top status strip (5 metrics: vault principal, bills covered, yield earned, next execution, liquid buffer)
   - Bill schedule table with lifecycle badges
   - Yield earned by envelope (per-envelope attribution)
   - Alert state banner (CALM / WATCH / ACTION REQUIRED / PAUSED) — single state for v1, derived from the bill + envelope data
7. **Risk disclosure modal** — mandatory on first visit, dismissable but re-prompted on any new bill or settings change
8. **Smoke test** — `tests/smoke-vault.mjs` covering: page loads, table renders, alert banner shows correct state, yield attribution math is right, modal appears on first visit

That's roughly 1 focused session of work, self-contained, demonstrable, and it gives you a real page to look at + react to before we touch the off-ramp gateway / yield adapters / Safe integration.

### What's NOT in the first slice (and what the spec says about each)

- **No Safe smart account** — Phase 1 uses the existing Compass account model. Safe integration is Phase 3.
- **No real yield strategy** — the 3.52% APY is hardcoded as `simulatedApy` in the mock layer. Real Sky/Aave integration is Phase 3.
- **No real off-ramp calls** — the gateway's `SpritzAdapter` and `MontoAdapter` will exist as type definitions + mock implementations that always succeed (or always return `MANUAL_ACTION_REQUIRED` to test the safety path). Real provider API integration is Phase 4.
- **No Prisma tables for vault** — Phase 1 reads from the existing Envelope table. New tables (`vault_accounts`, etc.) are Phase 2.
- **No automation / keeper** — bills are state-machine-demoable via a "simulate next execution" button. Real keeper is Phase 3.

### Sign-off needed

If you agree with Phase 1.0 as the first shippable slice, say "go" and I'll:
- Post a dated sub-note here with the build order
- Read the existing Envelope Prisma model so the mock data derives from the right source
- Check the design tokens (Sovereign Monad / vessel v6) so the page uses the right tokens
- Start at (1) types and work down the list

If you want a smaller first slice (e.g. just types + state machine, no UI), or a different angle (e.g. start with the state machine tests in isolation), flag that and I'll re-scope.

### Vault build — Phase 1.0 sub-note (2026-08-25, xKryptic sign-off)

User signed off on the full Phase 1.0 scope: types + mock data + state machine + /vault route + nav entry + 5-metric status strip + bill schedule table + yield attribution + alert banner + risk modal + smoke test. Quality > speed. No further checkpoints until the smoke passes.

#### Decisions during build (locked here per AGENTS.md)

- **Read pattern follows existing (app) pages**: liveEnvelopes() + liveBills() from @/lib/mock (in-memory store, re-evaluated per server-component render). The Envelope Prisma model exists but no (app) page reads it yet — staying consistent with the current pattern, with the Prisma swap as a future Cluster 2 concern. Same comment for the Bill table.
- **Route path**: /vault under (app)/ (not (auth)/). Authenticated, lands in the LEDGER chapter of the sidebar.
- **Money: integer cents**, every value. ormatMoney(cents) for display. iem address validation deferred (no real addresses in Phase 1 — only placeholder string).
- **APY is hardcoded as simulatedApy = 0.0352** in the mock layer, surfaced in UI as "variable estimated APY" with a tooltip that says the value is not guaranteed. Per spec, never promise 4-6% in copy.
- **Yield routing default**: COMPOUND (matches spec default). For Phase 1.0 the controls are visible but local-state only (not wired to persistence). The audit log ships in Phase 2.
- **Risk modal**: shown on every visit in Phase 1.0 (we don't yet have a "first visit" flag — that's Phase 2 when we add user preferences). The "I understand" button dismisses; the next visit shows it again. Acceptable for the demo.
- **No iem install**. Phase 1 has no real address types in flight. The spec's Address type becomes string in Phase 1 with a comment noting Phase 3 swaps to iem's  x\ branded type.
- **No 
ext.config.ts change**. /vault is a new route — no redirect needed.

#### 8-item build order (Phase 1.0)

1. src/lib/vault/types.ts — VaultAccount, VaultEnvelope, ScheduledBill, YieldEvent, BillStatus, EnvelopeCategory, VaultEnvelopeStatus, VaultAccountStatus, OffRampResult discriminated union, IOffRampAdapter interface. All integer cents.
2. src/lib/vault/yield.ts — calculateEnvelopeYield(envelopePrincipal, totalEligiblePrincipal, totalYieldAccrued) per spec (capital share, not lump sum).
3. src/lib/vault/state-machine.ts — 	ransitionBill(bill, event) pure function with the legal transition table. Returns { ok: true, bill } or { ok: false, error } discriminated union.
4. src/lib/vault/mock-data.ts — deriveMockVault() reads liveEnvelopes() + liveBills(), maps to vault domain, computes yield by capital share, computes alert state, returns { vault, envelopes, bills, yieldEvents, offRampAdapters }.
5. src/lib/vault/adapters.ts — SpritzAdapter + MontoAdapter + FallbackManualPushAdapter as stub classes implementing IOffRampAdapter. The first two return success; the fallback always returns MANUAL_ACTION_REQUIRED to exercise the safety path. Phase 1 doesn't wire any of them into a gateway, but the types need to compile.
6. src/app/(app)/vault/page.tsx — server component. PageHead + 5-cell status strip + bill schedule table (lifecycle badges) + yield attribution block + alert banner + risk modal. No client interactivity in v1.0.
7. src/components/sidebar/AppSidebar.tsx — add /vault nav entry to the LEDGER chapter with a [BETA] badge (signals Phase 1 is preview-quality and explains why the entry is below the others).
8. 	ests/smoke-vault.mjs — verifies: page returns 200, page contains the 5 metric labels, the bill schedule renders ≥1 row with a badge, the alert banner is present, the risk modal copy is rendered, yield attribution is mathematically consistent (sum of envelope yields equals vault accruedYield ± rounding).

#### Verification gates before sign-off

- pnpm tsc --noEmit — clean (zero new errors introduced).
- 
ode tests/smoke-vault.mjs — passes.
- Dev server /vault route returns 200 in a manual fetch; ledger nav lights up the Vault entry.
- COORDINATION.md final entry summarizes what shipped + what didn't.

### Vault Phase 1.0 — SHIPPED (2026-08-25)

Built end-to-end in one focused push, verified clean, smoke-green, on disk.

#### Files created
- src/lib/vault/types.ts — domain types (VaultAccount, VaultEnvelope, ScheduledBill, YieldEvent, 13-state BillStatus, OffRampResult discriminated union, IOffRampAdapter, YieldRoutingStrategy, VaultAlertState, OffRampAdapterStatus). All integer cents. No viem dependency.
- src/lib/vault/yield.ts — calculateEnvelopeYield(envelopePrincipal, totalEligiblePrincipal, totalYieldAccrued) per spec (capital share, not lump sum). Returns integer cents.
- src/lib/vault/state-machine.ts — 	ransitionBill(bill, event) pure function. Legal-transitions table for all 13 states. Also exports userLabel(status), 	one(status), legalNextStates(from), deriveAlertState(vaultStatus, bills).
- src/lib/vault/mock-data.ts — deriveMockVault(userId). Reads liveEnvelopes() + liveBills() from the in-memory store. Maps 7 envelopes → 7 vault envelopes, 6 bills → 6 scheduled bills. Computes yield by capital share. Surfaces a VaultSnapshot with vault, envelopes, bills, yield events, off-ramp adapter status, alert state, and a 7-KPI summary.
- src/lib/vault/adapters.ts — SpritzAdapter, MontoAdapter, FallbackManualPushAdapter stubs implementing IOffRampAdapter. Idempotency-key aware.
- src/app/(app)/vault/page.tsx — server component. Section order: risk disclosure → alert banner → 5-cell status strip → bill schedule table → yield attribution block → off-ramp panel → two-tier allocation. All sections share a consistent SectionHeader with eyebrow + title + em tail.
- 	ests/smoke-vault.mjs — 33 checks, all green.

#### Files modified
- src/components/sidebar/AppSidebar.tsx — added /vault entry under // Ledger with a [BETA] badge.
- 	ests/smoke-sidebar.mjs — added Vault to the expected Ledger chapter items (so future nav regressions catch the entry).

#### Verification
- 	sc --noEmit — exit 0, zero output. No type errors introduced.
- 
ode tests/smoke-vault.mjs — **33/33 green** (page loads, sidebar entry + BETA + active state, risk disclosure copy + 7 risk categories, alert banner with state attribute, 5 KPI labels, bill schedule with 6 rows and 6/6 [OK]/[WARN]/[SIGIL] markers, yield attribution block with 7 envelope rows, reconciliation residual 0.14% of total, off-ramp panel with 3 adapters, two-tier allocation copy).
- 
ode tests/smoke-sidebar.mjs — **63/63 green** (was 16 items; +2 checks from the new Vault entry).
- 14 of the 15 pre-existing smokes still green. The lone red is smoke-auth.mjs, which was already broken before this work began (per the session-startup status).
- GET /vault returns 200, body is 135 KB.

#### Live numbers (one render of /vault against the seeded data)
- Vault principal: **,147.00** across 7 envelopes
- Reserved for bills: **,113.99** (6 scheduled)
- Yield earned: **.95** at 3.52% estimated APY (variable, per spec)
- Next execution: **.00** on Aug 31 (FUNDED)
- Liquid buffer: computed from deployed-to-yield minus reserved
- Reconciliation: attributed .96 vs vault .95 — residual is .01, well under 1% (rounding from integer-cents attribution math)
- Alert state: WATCH (a bill is approaching its execution window)

#### What's deferred (per the original plan)
- **Phase 2** — Prisma tables for ault_accounts, ault_envelopes, scheduled_bills, yield_events, payment_attempts, provider_events; immutable audit ledger; idempotency on writes; user preference for the risk-disclosure acknowledgment.
- **Phase 3** — Safe smart-account deployment; USDC testnet deposits; real yield adapter; keeper cron; full state-transition test matrix; pause/revoke/manual-recovery workflow.
- **Phase 4** — Real off-ramp provider API integration; legal/compliance; contract audit; closed beta; multi-provider failover in production.

#### One thing to flag for the next slice
The SectionHeader component is currently local to the /vault page. If we want to use it on other pages (the cluster 5.2.5 push, etc.), it should move to src/components/alchemy/SectionHeader.tsx alongside PageHead. Not done in this slice — single-use is fine for now.

### Vault Phase 2.0 — Backend Ledger (2026-08-25, ready when you are)

Phase 1.0 was the simulation. Phase 2.0 makes the vault real: 6 new Prisma tables, a typed data-access layer with idempotency, a seed that hydrates the vault from the existing in-memory envelopes + bills, the /vault page reads from Prisma instead of the in-memory store, and the existing immutable AuditLog gets a few new action types. No Safe, no real yield, no real off-ramp — those are still stubs. The state machine from Phase 1 stays in place; this slice wraps it with persistent storage and an append-only audit trail.

**Important context (5.2.5 just shipped, xKryptic 2026-08-25 21:08):** the other session added a Bill model to prisma/schema.prisma and projected FinancialIdentity into production Account / Bill / Goal tables. They explicitly left the live dashboard widgets on the in-memory seed. My Phase 2.0 is the FIRST cluster to flip a widget to production reads, so I become the pattern. I will:
- Only add new models at the end of schema.prisma (additive, no edits to existing model lines)
- Read only from the new vault tables I create (no reads from the new Bill table — that belongs to the next cluster to flip the obligations widget)
- Run prisma db push once at a clean moment; verify success before continuing

#### Decisions locked from the spec (Phase 2 build)

- **6 new models**, appended to schema.prisma:
  - VaultAccount — one row per user; userId unique; chainId default 1; simulatedApy as Float; money fields as integer cents.
  - VaultEnvelope — back-reference to compassEnvelopeId (unique); category as String (no Prisma enum; we have a TS union but adding a Prisma enum is overkill for SQLite).
  - ScheduledBill — back-reference to the in-memory BillSeed.id (NOT a FK to the new Bill table — that coupling is the 5.2.6 / obligations-flips concern, not ours); status as String; index on (vaultId, dueDate) + (vaultId, status).
  - YieldEvent — append-only ledger; envelopeId nullable for vault-wide events; nnualizedRate as Float; index on (vaultId, occurredAt).
  - PaymentAttempt — append-only with idempotency: unique on (providerName, idempotencyKey). Discriminated 
esult as String (SUCCESS | DEGRADED | FAILURE) — we keep the rich payload (	ransactionId, warningMessage, errorMessage, 
etryable) as separate columns so the page can render each branch.
  - ProviderEvent — append-only; FK to PaymentAttempt; JSON payload as String (SQLite-friendly, matches the existing metadata pattern).
- **Audit log = existing AuditLog model** (already append-only, already immutable in spirit). New action types: ault.synced, ault.bill_state_changed, ault.payment_attempted, ault.payment_settled, ault.payment_failed, ault.adapter_fallback. No new VaultEvent table — the existing one is enough.
- **Idempotency strategy** (per spec, "MUST be idempotent on request.idempotencyKey"):
  - PaymentAttempt has a unique index on (providerName, idempotencyKey). Re-submitting the same key returns the existing row.
  - The adapter stubs from Phase 1 are now backed by the DB. executePayment() becomes: write a PaymentAttempt row (or fetch the existing one if the unique constraint hits), then write a ProviderEvent for the call.
  - seedVaultFromEnvelopes() is idempotent: uses upsert keyed on (vault.userId), (vaultEnvelope.compassEnvelopeId), (scheduledBill.billerId + vaultId).
- **Read pattern on the /vault page** changes: instead of deriveMockVault() (in-memory only), the page calls loadVaultSnapshot(userId) (Prisma read). If the vault tables are empty, the page shows an empty state with a "Sync vault from envelopes" button. The button triggers a server action that runs the seed.
- **Yield simulation is still local** — no real yield calls. The 3.52% APY stays hardcoded in the seed. Phase 3 wires a real adapter.
- **No Bill table reads in this slice** — the existing ScheduledBill projection continues to source from the in-memory liveBills(). When a future cluster flips the obligations widget to read from the production Bill table, the vault's seed function will be updated in a 1-line change.

#### 8-item build order (Phase 2.0a)

1. prisma/schema.prisma — append 6 new models in their own section. No edits to existing lines.
2. pnpm prisma db push — verify success. Re-run pnpm prisma generate if the client cache invalidated.
3. src/lib/vault/db.ts — typed Prisma accessors. getOrCreateVault, upsertVaultEnvelope, upsertScheduledBill, 
ecordYieldEvent, 
ecordPaymentAttempt (idempotent on key), 
ecordProviderEvent, loadVaultSnapshot.
4. src/lib/vault/seed.ts — seedVaultFromEnvelopes(userId). Reads liveEnvelopes() + liveBills(), writes vault rows. Idempotent. Returns a { created, updated } tally.
5. src/lib/vault/adapters.ts — extend with a DB-backed path. New createDbBackedAdapter(prisma, providerName) factory that wraps the Phase 1 stub with a PaymentAttempt + ProviderEvent write. Idempotency comes from the unique index, not the in-memory cache. The in-memory cache stays for the smoke test (no DB needed) but is bypassed in production.
6. src/lib/vault/server.ts — server-side helpers. loadVaultSnapshot(userId) reads from Prisma; syncVaultAction() is the server action for the seed button. Both wrap their writes in AuditLog entries.
7. src/app/(app)/vault/page.tsx — switch to loadVaultSnapshot. Empty state: "No vault yet — sync from envelopes" with a button. Populated state: same UI as Phase 1, with an "audited X events" footer line. The yield attribution reconciliation row stays — it's the user's window into the math.
8. 	ests/integration-vault.mjs — exercises:
   - syncVaultAction runs cleanly on empty DB (creates vault + 7 envelopes + 6 bills)
   - syncVaultAction is idempotent (re-run produces 0 new rows)
   - loadVaultSnapshot returns the right shape (vault, envelopes, bills, yield events, payment attempts)
   - adapter with the same idempotency key returns the same transactionId (DB-backed, not in-memory)
   - AuditLog receives entries for each meaningful action
   - The /vault page still renders with the same surface as Phase 1 (the 33 smoke checks must continue to pass)

#### Verification gates before sign-off

- pnpm tsc --noEmit — clean.
- 
ode tests/integration-vault.mjs — all checks pass.
- 
ode tests/smoke-vault.mjs — all 33 checks still pass (the page surface didn't change).
- 
ode tests/smoke-sidebar.mjs — 63/63 still pass.
- 14 of 15 pre-existing smokes still pass (smoke-auth.mjs is the pre-existing red, not ours).
- pnpm prisma db push exits clean.

#### Out of scope (Phase 3+)

- Safe deployment, real yield adapter, keeper cron
- Adapter integration with real provider APIs
- Closed beta, legal/compliance, contract audit
- Yield-routing controls wired to a user preference (we ship the buttons read-only in 2.0a; persistence lands in 2.0b)
- Bill state transitions being driven by a real cron (we add the manual "simulate next state" button in 2.0b if needed)
- Reading the new Bill table in the vault seed (next cluster to flip the obligations widget handles that coupling)

### Vault Phase 2.0 — SHIPPED (2026-08-25)

Built end-to-end in one focused push, verified clean, smoke-green, on disk. The 6 new Prisma tables are live, the /vault page reads from them via loadCurrentVaultSnapshot(), the seed hydrates from liveEnvelopes() + liveBills() idempotently, and the existing AuditLog now receives vault events.

#### Files created
- src/lib/vault/db.ts — typed Prisma accessors (getOrCreateVault, upsertVaultEnvelope, upsertScheduledBill, setVaultEnvelopeYield, updateBillStatus, 
ecordYieldEvent, 
ecordPaymentAttempt with idempotency on (providerName, idempotencyKey), 
ecordProviderEvent, 
ecordVaultAudit, loadVaultSnapshot, userHasVaultData). Plus the row → domain mappers.
- src/lib/vault/seed.ts — seedVaultFromEnvelopes(userId). Reads liveEnvelopes() + liveBills(), writes 7 vault envelopes + 6 scheduled bills + 7 yield events. Idempotent. Returns { vaultId, envelopesUpserted, billsUpserted, yieldEventsCreated, totalAccruedYield }.
- src/lib/vault/server.ts — loadCurrentVaultSnapshot() (DB-sourced; no in-memory fallback for the user-facing path), syncVaultAction() (server action wrapper), clearVaultAction() (test-only).
- src/lib/vault/actions.ts — "use server" re-exports for client components.
- src/components/vault/SyncButton.tsx — client component with useTransition + 
outer.refresh().
- src/app/api/vault/sync/route.ts — POST endpoint for the seed (also supports ?action=clear for tests / CLI). Returns JSON.
- 	ests/integration-vault.mjs — 32 checks, all green.

#### Files modified
- prisma/schema.prisma — appended 6 new models (VaultAccount, VaultEnvelope, ScheduledBill, YieldEvent, PaymentAttempt, ProviderEvent) in their own section. Added aultAccount VaultAccount? to User and aultEnvelope VaultEnvelope? to Envelope for back-relation. All new models have @@index on their hot query columns. PaymentAttempt has @@unique([providerName, idempotencyKey]) for adapter idempotency. ScheduledBill has @@unique([vaultId, billerId]) for seed idempotency.
- src/lib/vault/adapters.ts — added createDbBackedAdapter(inner, userId) factory. Wraps any IOffRampAdapter so its executePayment calls also write PaymentAttempt + ProviderEvent rows, with idempotency enforced by the unique index. Audit log entries: ault.payment_settled (success), ault.adapter_fallback (degraded), ault.payment_failed (failure).
- src/app/(app)/vault/page.tsx — server component now uses loadCurrentVaultSnapshot(). Empty state with a SyncButton when the user has no vault data. New SourceChip + AuditFooter components show [OK] DB-SOURCED | [OK] DB-SOURCED and an event count.
- 	ests/smoke-vault.mjs — added a sync at the start (via the API route) so the populated-state checks exercise DB-sourced data.

#### Verification
- pnpm prisma db push — clean. New tables created in dev.db. 5.2.5's existing 97 smokes still pass.
- 
ode_modules/.bin/prisma generate — client regenerated.
- 	sc --noEmit for the vault files only — zero errors. The single pre-existing error is in envelopes/page.tsx:259 (planet: PlanetId | null not assignable to PlanetId) — that's 5.2.5's nullable planet refactor, not introduced by this work. 5.2.5 owns that fix.
- 
ode tests/integration-vault.mjs — **32/32 green**:
  - Clear endpoint works (idempotent, returns deleted: { vault, envelopes, bills }).
  - Empty state visible when no vault data (testid ault-empty-state + SyncButton copy).
  - First sync creates 7 envelopes + 6 bills + 7 yield events + 1 audit row.
  - Second sync is idempotent at the DB layer (counts stay stable, audit delta = +1).
  - Populated state has all Phase 1 sections + source chip + audit footer with DB-SOURCED.
  - PaymentAttempt unique index on (providerName, idempotencyKey) blocks duplicate inserts; the original row's 	ransactionId is preserved on retry.
  - State machine + persistence: a bill driven EARNING → PREPARING_SETTLEMENT → EXECUTING → SETTLED in the DB carries the settlementReference back to read.
- 
ode tests/smoke-vault.mjs — **33/33 green** (Phase 1 surface preserved end-to-end against the DB-sourced page).
- 
ode tests/smoke-sidebar.mjs — **63/63 green**.
- 18 of 19 smokes green. The lone red is smoke-auth.mjs (pre-existing, unrelated to this work — was already failing at session start).
- pnpm prisma db push exit clean, no warnings.

#### Live numbers (one render of /vault, DB-sourced)
- Vault principal: **,147.00** across 7 envelopes
- Reserved for bills: **,113.99** (6 scheduled)
- Yield earned: **.95** at 3.52% estimated APY
- Next execution: **.00** on Aug 31 (FUNDED)
- Audit footer: 7 envelopes · 6 bills · 7 yield events · 2 vault.synced entries
- Source chip: [OK] DB

#### Decisions locked during the build
- **No in-memory fallback in the user-facing path.** loadCurrentVaultSnapshot returns 
ull (empty state) when the DB has no vault, never falls back to deriveMockVault(). The in-memory mock stays around for the lib's internal tests but is no longer the user-visible default. The Phase 1 smoke was updated to seed-via-API at the start so it still exercises the populated surface.
- **Idempotency is the unique index, not the in-memory cache.** 
ecordPaymentAttempt looks up by (providerName, idempotencyKey) and updates if found, creates if not. The in-memory cache in dapters.ts is retained for the test path that doesn't touch the DB.
- **Audit log = existing AuditLog model.** No new VaultEvent table. New action types: ault.synced, ault.payment_settled, ault.payment_failed, ault.adapter_fallback. Future audit-log page can filter on ctionType: { startsWith: 'vault.' }.
- **Bill table reads still go through in-memory liveBills().** When 5.2.6 (or the next cluster) flips the obligations widget to read from the production Bill table, the seed's liveBills() call swaps in a Bill-table read — one-line change. The vault doesn't depend on that timing.
- **/api/vault/sync route exists for the integration test + future CLI.** Not linked in the nav. The user-facing path is the SyncButton server action.
- **simulatedApy is a Float, not a money field.** It's a single scalar rate. Never multiply money by it without going through calculateEnvelopeYield which uses integer math.

#### Out of scope (Phase 3+)
- Safe smart-account deployment, real yield adapter, keeper cron
- Real off-ramp provider API integration
- Closed beta, legal/compliance, contract audit
- Yield-routing controls wired to a user preference (the buttons on the page are read-only in Phase 2; persistence lands in Phase 2.5 or 3)
- The pre-existing 	sc error in envelopes/page.tsx:259 (5.2.5's nullable planet refactor). 5.2.5 owns that fix.
- The pre-existing smoke-auth.mjs failure. Unrelated to the Vault.

#### What to flag for the next slice
- The SyncButton is the only client component on /vault today. If we add more interactive controls (state-machine transition buttons, yield-routing toggles, bill editor), we should colocate them under src/components/vault/ and have the server actions live next to them in src/lib/vault/actions.ts.
- getOrCreateVault is now called from two places (server.ts and seed.ts). If we ever want to make the vault userId column indexable for fast lookups in a multi-user world, add @@index([userId]) — already covered by @@unique([userId]) on VaultAccount, so the index is automatic.
- The Phase 1 in-memory mock (src/lib/vault/mock-data.ts) is now unused by the page. It's still a useful fixture for unit tests; we should keep it but mark it as such in a top-of-file comment in the next slice.

### Vault Phase 2.5 — Make it interactive (2026-08-25, xKryptic sign-off)

Phase 2.0 was the simulation: a read-only `/vault` page, all the data in Prisma but no user actions wired. Phase 2.5 is the visible-UI half of "the chat-to-vault pipeline" — it takes the existing surface and makes it interactive. Three controls that share the new `VaultPreferences` table.

**Files added**
- `prisma/schema.prisma` — new `VaultPreferences` model (1 row per user, `userId @unique`, `yieldRoutingStrategy` String @default("COMPOUND"), `riskAcknowledgedAt DateTime?`); back-relation on `User`.
- `src/components/vault/YieldRoutingPicker.tsx` — 4-strategy card grid (COMPOUND / APPLY_TO_NEXT_BILL / MOVE_TO_AVAILABLE / SPLIT_BY_ENVELOPE), `[OK] CURRENT` chip on the active one, optimistic UI + `useTransition` + `router.refresh()`. Vessel-accent active border + neon glow.
- `src/components/vault/BillTransitionMenu.tsx` — per-bill action buttons filtered by `legalNextStates(status)` so an illegal transition is impossible from the UI. A `SIMULATE →` button picks the first legal event (the dev affordance called out in the Phase 2.0 handoff). High-stakes events (`CANCEL`, `INSUFFICIENT_FUNDS`, `FAIL_FINAL`) confirm via `window.confirm`. `[WARN] <error>` renders inline on failure.
- `src/components/vault/RiskAckButton.tsx` — `[OK] I understand` button inside the risk disclosure. Calls the action, suppresses the disclosure on next render.
- `src/components/vault/VaultPauseToggle.tsx` — small button that toggles `VaultAccount.status` between `ACTIVE` and `PAUSED`. `[OK] Resume` on the next visit. Disabled in `RECOVERY_MODE` (Phase 3 work).

**Files modified**
- `src/lib/vault/types.ts` — new `VaultPreferences` interface + `YIELD_ROUTING_LABEL` + `YIELD_ROUTING_DESC` lookup tables. Re-exported `BillEvent` from `state-machine.ts` so callers can import everything vault-typed from one module.
- `src/lib/vault/db.ts` — new accessors: `getOrCreateVaultPreferences`, `setYieldRoutingStrategy`, `acknowledgeRisk`, `setVaultAccountStatus`, `transitionBillDb`. The transition function applies the pure `transitionBill` from `state-machine.ts`, persists, and writes a `vault.bill_state_changed` audit entry. The `VaultDbSnapshot` interface grew a `preferences` field; `loadVaultSnapshot` populates it. The `recordVaultAudit` union gained 4 new action types.
- `src/lib/vault/server.ts` — 6 new server actions: `setYieldRoutingAction`, `acknowledgeRiskAction`, `pauseVaultAction`, `resumeVaultAction`, `transitionBillServerAction`, `simulateNextStateAction`. All validate inputs (strategy against the TS union, event against the `USER_FACING_BILL_EVENTS` whitelist) before writing. All wrap writes in audit-log entries.
- `src/lib/vault/actions.ts` — re-exports the 6 new server actions with the "From Page" naming convention (so client components import a thin `actions.ts` boundary).
- `src/lib/vault/mock-data.ts` — `deriveMockVault` stub adds a default `preferences` row so the `VaultSnapshot` type stays complete (the user-facing path uses `loadCurrentVaultSnapshot`, which is DB-sourced; the in-memory mock is for unit tests only).
- `src/app/(app)/vault/page.tsx` — wires the 4 new client components. Page order now: risk disclosure → alert banner → pause row → status strip → bill schedule (each row has a transition menu) → yield attribution → yield-routing picker → off-ramp panel → strategy allocation → audit footer. The risk disclosure renders a `[OK] Risk acknowledged` summary after acknowledgment instead of the full notice.
- `tests/integration-vault.mjs` — +17 checks (was 32, now 49). Covers the new preferences row on sync, default strategy, risk-ack persistence, vault pause/resume, bill state transitions through the DB, and the new components' presence in the rendered HTML.
- `tests/smoke-vault.mjs` — +16 checks (was 33, now 49). Covers all 4 strategy cards, the `[OK] CURRENT` chip on the active one, the risk-disclosure + ack button on fresh sync, the pause row + toggle, every bill row's transition menu with the `SIMULATE →` button, and at least one of each legal-event button (`BEGIN_SETTLEMENT`, `PAUSE`) for EARNING bills.

**Verification**
- `npx prisma db push` — clean. `VaultPreferences` table added; existing 6 vault tables unchanged.
- `npx tsc --noEmit` — clean across the full project (40+ source files).
- `node tests/integration-vault.mjs` — **49/49 green** (was 32/32).
- `node tests/smoke-vault.mjs` — **49/49 green** (was 33/33).
- `node tests/smoke-sidebar.mjs` — 63/63 green (unchanged).
- `node tests/smoke-reset-seed.mjs` — 8/8 green (unchanged).
- `node tests/smoke-deprecated.mjs` — 42/42 green (unchanged).
- Dev server returns 200 on `/vault`; the 4 new client components hydrate and the page is interactive end-to-end.

**Decisions locked during the build**
- **One preferences row per user, not per vault.** The unique key is `userId`, not `vaultId`. If a future slice adds a second vault per user (recovery vault, joint vault), the preferences stay user-scoped. The `user` back-relation is `@unique` so Prisma's `upsert` makes the read-or-create atomic.
- **Validation at the server-action boundary, not the DB.** The `setYieldRoutingAction` validates against the TS union *before* writing; the DB just stores a `String`. The `transitionBillServerAction` validates the event type against the `USER_FACING_BILL_EVENTS` whitelist — `FUND` and `ENTER_EARN` are keeper-driven in production and not user-actionable.
- **Audit log = existing `AuditLog` model.** No new `VaultEvent` table. New action types: `vault.yield_routing_changed`, `vault.risk_acknowledged`, `vault.paused`, `vault.resumed`, plus `vault.bill_state_changed` (which the integration test asserts on).
- **`SIMULATE →` is explicit and labeled.** It's a dev affordance, not a user feature. The button label is the literal "SIMULATE →" and a `title` attribute says "Run the first legal next event (dev affordance)". When Phase 3 wires a real keeper cron, this button gets a `display: none` (or moves to a `?dev=1` query-gated surface).
- **`pauseVaultAction` is disabled in `RECOVERY_MODE`.** RECOVERY_MODE is a Phase 3 concept (off-ramp gateway fell back to MANUAL_ACTION_REQUIRED across every provider). The user shouldn't be able to toggle themselves out of it without manual recovery.
- **Risk disclosure is hidden, not minimized.** After `riskAcknowledgedAt` is set, the disclosure is replaced with a single `[OK] Risk` summary line. No "show again" affordance in 2.5; the spec says a re-prompt is required only on certain triggers (new bill, settings change) which is a future slice.

**Out of scope (Phase 3+)**
- Safe smart-account deployment, real yield adapter, keeper cron (the `SIMULATE →` button is the placeholder until the keeper lands)
- Real off-ramp provider API integration
- Closed beta, legal/compliance, contract audit
- Yield-routing strategy's actual effect (the strategy is *chosen*; what it *does* is a Phase 3 wire-up)
- Re-prompting the risk disclosure on new-bill or settings-change triggers
- Multi-vault-per-user (the preferences row is per-user, so this is a 1-line model change)
- Per-bill *custom* transitions (e.g. "raise max authorized amount") — the menu shows the legal events, not arbitrary actions

**What to flag for the next slice**
- The SectionHeader component is now used in 8 places on the page. If we want to use it elsewhere, it should move from page.tsx-local to `src/components/alchemy/SectionHeader.tsx` alongside PageHead. Same call-out as Phase 2.0.
- The `legalNextStates` import in `BillTransitionMenu.tsx` is a client component importing a pure function from the state machine — fine today, but if the state machine grows server-only helpers (e.g. needing DB access), the import will need to be split. Worth a one-line refactor when that happens.
- `transitionBillServerAction` calls `buildEvent` to construct the CONFIRM_SETTLED payload with a fake `transactionId`. When the real off-ramp gateway lands (Phase 3), this function should be replaced with a call to the gateway; the rest of the action stays unchanged.
- The pause toggle is a single button, not a confirmation-step toggle. If the user wants a more explicit "I really mean it" affordance, that's a 5-minute add (window.confirm, which `pauseVaultAction` already does).

### HANDOFF — Cluster Vault 2.5+ (next session)

**Picked up by**: next fresh session. The visible-UI half of the vault is done. The next cluster is the data-layer half:

**Cluster Vault 3.0 — Real yield adapter (Ollama-style stub for now)**
- Replace the hardcoded `simulatedApy = 0.0352` with a read from a `YieldAdapter` interface
- `SkyAdapter` (the example in the spec) + `AaveAdapter` + a `MockAdapter` for tests
- Real cron that calls the adapter every N minutes, writes `YieldEvent` rows
- The vault UI surfaces the new APY value (currently hardcoded)
- Out: Safe deployment, real off-ramp API calls (still Phase 4)

**Cluster Vault 3.1 — Yield routing actually does something**
- Implement the 4 strategies' effects: COMPOUND writes more YieldEvents, APPLY_TO_NEXT_BILL bumps a per-bill credit, MOVE_TO_AVAILABLE moves money into `availableBalance`, SPLIT_BY_ENVELOPE distributes by capital share
- The picker becomes a real lever, not just a setting

**Cluster Vault 3.5 — Per-bill editor**
- Add/edit/delete bills on /vault (the user is the source of truth, not the in-memory `liveBills()` mirror)
- The "new bill" form on /obligations/new can wire to the vault's `ScheduledBill` table

**Cluster Vault 4.0 — Safe deployment (the big one)**
- Real Safe smart-account deployment
- USDC testnet deposits via the adapter
- Real yield strategy on testnet
- Closed beta

The 5.2.6 widgets 4–6 (allocation, insights, accounts) work is in the working tree (uncommitted) and untouched. When that work resumes, the `Vault` entry on the sidebar is the only thing that overlaps; the two clusters can ship independently.

---

## HANDOFF — Vault 2.5 + Vault 3.0 (next session)

**From session `mvs_0231e88821e04a47b450a77f70e6e1d0` (2026-08-26, ~1h focused)**: shipped two commits for the vault.

- `d9e3dc9` **Cluster Vault 2.0** — Backend ledger. 6 new Prisma tables (VaultAccount, VaultEnvelope, ScheduledBill, YieldEvent, PaymentAttempt, ProviderEvent), DB-sourced /vault page, idempotency on (providerName, idempotencyKey), 32/32 integration + 33/33 smoke green.
- `a43b3d8` **Cluster Vault 2.5** — Make it interactive. New VaultPreferences table, 4-strategy yield-routing picker, per-bill state-transition menus, risk-disclosure persistence, vault pause/resume toggle. 49/49 integration + 49/49 smoke green. tsc clean.

**What just shipped (Phase 2.5 surface, in detail)**
- New `VaultPreferences` Prisma model: `yieldRoutingStrategy` (String @default("COMPOUND")), `riskAcknowledgedAt` (DateTime?), `userId @unique`. Back-relation on User.
- `YieldRoutingPicker` (4 strategies, `[OK] CURRENT` chip, optimistic UI + useTransition + router.refresh)
- `BillTransitionMenu` (per-bill action buttons filtered by `legalNextStates()`, `SIMULATE →` dev affordance, `window.confirm` on CANCEL/INSUFFICIENT_FUNDS/FAIL_FINAL)
- `RiskAckButton` (inside the disclosure; clicking it persists `riskAcknowledgedAt = now()` and the disclosure is suppressed on the next render)
- `VaultPauseToggle` (toggles `VaultAccount.status` between ACTIVE/PAUSED; disabled in RECOVERY_MODE)
- 6 new server actions in `src/lib/vault/server.ts` + re-exports in `actions.ts` for client use
- `transitionBillDb` (db.ts) — applies the pure 13-state machine, persists, audit-logs each transition
- 5 new audit-log action types: `vault.yield_routing_changed`, `vault.risk_acknowledged`, `vault.paused`, `vault.resumed`, `vault.bill_state_changed`

**Where Compass is right now** (smoke summary)
- integration-vault: 49/49 · smoke-vault: 49/49 · smoke-sidebar: 63/63 · smoke-reset-seed: 8/8 · smoke-deprecated: 42/42 · `tsc --noEmit` clean.
- Untested smokes in this session (unchanged from the COORDINATION.md baseline): smoke-auth (pre-existing fail), smoke-alert-bay, smoke-bottom-dock, smoke-engine-toggle, smoke-glossary, smoke-goals, smoke-horizon-strip, smoke-onboarding-agent, smoke-period, smoke-rebalance, smoke-topbar, smoke-vessel-feed, smoke-visual-finish.
- The 5.2.6 widgets 4–6 (allocation, insights, accounts) are still in the working tree, uncommitted. They're orthogonal to the vault work; the next session can either commit them or revert.

**Recommended next cluster (Vault 3.0)**
- **Real yield adapter (Ollama-style stub for now)** — replace hardcoded `simulatedApy = 0.0352` with a `YieldAdapter` interface; `SkyAdapter` + `AaveAdapter` + `MockAdapter`; real cron calling the adapter; the UI surfaces the new APY value. Out: Safe, real off-ramp.
- **Cluster Vault 3.1 — Yield routing actually does something** — implement the 4 strategies' effects so the picker becomes a real lever.
- **Cluster Vault 3.5 — Per-bill editor** — add/edit/delete bills on /vault; the "new bill" form on /obligations/new can wire to ScheduledBill.

**How to pick up**
1. `git log --oneline -10` to see the two new commits.
2. Read this handoff + the "Vault Phase 2.5 — Make it interactive" section above + the "Vault Phase 2.0 — SHIPPED" section.
3. Sign in as `mom@compass.local` / `correct-horse-battery-staple`; visit `/vault` to see the interactive page. The risk disclosure appears; click "[OK] I understand" to suppress it. Pick a yield-routing strategy. Drive a bill through a state with the SIMULATE → button. Pause the vault.
4. Pick a cluster from the Vault 3.x list above.

The COORDINATION.md is now ahead of git; the next session should commit it as the handoff baseline before starting work.
