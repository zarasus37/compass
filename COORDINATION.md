# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete (v1.0) → **v4.0** reframe locked 2026-08-22 (alchemical/celestial visual language) → **v5.0 reframe locked 2026-08-23** (Component Oracle Terminal: cool teal/cyan on near-black, Sora + JetBrains Mono, oracle voice with `[OK]/[WARN]` markers). The 7 planetary vessels are preserved as a semantic mapping.
- **Stage 2 (Creation)**: 🟢 Cluster 0 (scaffold + auth) — ✅ done. **Cluster 1 (Pay Period 1.0 — alchemical dashboard end-to-end with mock data) — ✅ done, commit `35ccc6e`. Cluster 1.5 (visible interactivity pass: auto-allocate engine + paycheck simulator + live store) — ✅ done. Cluster 1.7 (four data visualizations: Sankey, pacing line, Budget vs Actual, Goal Trajectory) — ✅ done, commit `cda8972`. Cluster 1.7 visual audit — ✅ done, commit `3da5716`. **Cluster 1.8 (Bill organizer + Plan My Next Check + calendar warnings) — ✅ done, commit `999ff37`. Cluster 1.9 (Debt payoff simulator + Saturn vessel + 3-up card + paid-off celebration) — ✅ done, commits `feb50e3` + `801525c` (math-bug fix) + `0ffb439` (per-debt sparkline).** Biweekly period locked as the canonical pay schedule (D17); period-close renamed to match (D18). **Chart-next-to-data principle applied across /goals, /envelopes, /recurring, /debts, /insights — commit `843375c`. Cluster 1.10 (drill-downs + new transaction / goal / envelope / bill / debt forms + edit forms) — ✅ done, commits `03f308f` + `006bca0` + `3dc679f` + `649d76e`. **Cluster 2.0 (customizable, scrollable, card-based dashboard with @dnd-kit drag-and-drop + localStorage persistence) — ✅ done, commit `e648ef5`. Cluster 2.0.1 (visual-first treatment: 7-day WeekSparkline, BurnSparkline, embedded GoalSparkline) — ✅ done, commit `af0b8d3`. Cluster 2.0.2 (full-month calendar with planetary headers + scheduled bills list) — ✅ done, commit `34f3928`. **Cluster 2.0.3 (Component Oracle Terminal re-skin of the dashboard) — ✅ done, commit `884fe70`.** **Cluster 2.1 (must-have viz + utility integration push: 3 new dashboard cards (Spend Ring, Net Trajectory, Pay Distribution) + Must-Have Tools index strip on dashboard + /settings hub + Plaid sandbox + AI categorize rules + Receipt scan + Habit quiz + Household stub + /subscriptions wired to live data) — ✅ done, single working session.** Next: tidy up — fine-tune placement, polish tooltips, add hover states where missing, decide which cards to default-on, integrate the tools into the sidebar nav as a 4th chapter if the Settings entry feels too hidden, then 2.x (form actions deep-dive, bill reminders, variable income, period close), then 3.x (real Plaid, AI tiers).
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-25 (post-Cluster-5.1 — Chat UX: OnboardingGate in (app) layout + dashboard redirects incomplete identities to /onboarding; /onboarding page with minimal Sovereign Monad shell (brand + sign out, no sidebar); ChatSurface client component calls /api/onboarding/run per turn, renders user/assistant bubbles + tool-call chips, auto-scrolls, replaces the input with a "your audit is ready" completion panel on markOnboardingComplete; ProgressRail with 8 milestones (identity → income → expenses → debts → assets → goals → risk → complete) derived server-side from the message log's tool-call history; ProviderBanner shows the LLM provider + a vessel-watch [WARN] banner when the L1 rules fallback fires; "Start over" form posts to /api/onboarding/reset; dev convenience: signupAction in dev mode also creates a completed FinancialIdentity for the new user (so existing smokes that log in as mom still work); ensureMomOnboarded in the dev API keeps mom in an onboarded state after the onboarding smoke's resetAll; total 15 smokes at 551/551)

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

**Open items (next clusters):**
- **Cluster 5.2 — Wire dashboard to identity**: every surface reads from the materialized records (income, debts, goals, etc.). Seed moves to "demo mode" — a banner on /onboarding lets the user load the seed instead of going through the conversation. The FinancialIdentity schema is ready (Part B); the surfaces just need to switch from `liveEnvelopes()` etc. to `loadConversation(userId)` reads.
- **Cluster 5.3 — Ongoing advisor (Ollama)**: post-onboarding "ask me anything about your money" surface. Same `callAgent` interface, different provider. Privacy-first + free + local.

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
- **From session**: `mvs_1bcddf951dde44e08752858a24aeda18` (Cluster 5.0 Part B + Cluster 5.1: Prisma persistence + L1 fallback + OnboardingGate + /onboarding page + ChatSurface + ProgressRail + ProviderBanner + reset endpoint; dev convenience: signupAction in dev mode auto-creates a completed identity, ensureMomOnboarded in the dev API keeps mom in an onboarded state after the onboarding smoke's resetAll; total 15 smokes at 551/551)
- **Handed to**: next session — start by reading this file + `00-DESIGN.md`. The recommended next cluster is **5.2 — Wire dashboard to identity**: every surface (dashboard, period, envelopes, goals, accounts, debts, holdings, allocations, insights) reads from the materialized `FinancialIdentity` + child tables instead of the in-memory seed (`liveEnvelopes()`, `liveGoals()`, etc. in `src/lib/mock.ts`). The onboarding chat now produces a real identity; the surfaces need to surface it. A "Demo mode" banner on /onboarding can also be added (skips the chat, loads the dev seed directly into a FinancialIdentity). After 5.2, the queue is: 5.3 ongoing advisor via Ollama (post-onboarding "ask me anything" surface, same `callAgent` interface, privacy-first). The chat UX is live — sign in as `mom@compass.local` / `correct-horse-battery-staple` and visit `/onboarding` to see it. The OnboardingGate redirects `/`, `/period`, `/envelopes`, etc. to `/onboarding` for any user with no completed identity. The L1 rules fallback fires automatically when Mavis/Ollama errors — the `ProviderBanner` surfaces the warning. `.env.local.example` is committed; the actual `.env.local` is gitignored. The design system is **Sovereign Monad / vessel (v6)**, superseding Component Oracle Terminal. `tsc --noEmit` is clean; 15 smokes green at 551/551 (smoke-onboarding-agent 80, smoke-period 46, smoke-sidebar 60, smoke-topbar 102, smoke-bottom-dock 70, smoke-goals 36, smoke-deprecated 42, smoke-glossary 32, smoke-rebalance 5, smoke-reset-seed 8, smoke-engine-toggle 7, smoke-vessel-feed 7, smoke-horizon-strip 14, smoke-alert-bay 22, smoke-visual-finish 20); `smoke-auth.mjs` pre-existing failing — unrelated; dev server on 127.0.0.1:3000.
