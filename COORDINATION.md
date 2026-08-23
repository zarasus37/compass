# Compass — Coordination / Handoff

> Handoff package for fresh-session pickup of **Compass**, a personal-finance / treasury app.
> Workspace: `C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app`
> This file is the **contract** between sessions. Update it when the state changes; treat it as the source of truth for "where we are right now."

---

## Status

- **Stage 1 (Design)**: ✅ Complete (v1.0) → **v4.0** reframe locked 2026-08-22 (alchemical/celestial visual language) → **v5.0 reframe locked 2026-08-23** (Component Oracle Terminal: cool teal/cyan on near-black, Sora + JetBrains Mono, oracle voice with `[OK]/[WARN]` markers). The 7 planetary vessels are preserved as a semantic mapping.
- **Stage 2 (Creation)**: 🟢 Cluster 0 (scaffold + auth) — ✅ done. **Cluster 1 (Pay Period 1.0 — alchemical dashboard end-to-end with mock data) — ✅ done, commit `35ccc6e`. Cluster 1.5 (visible interactivity pass: auto-allocate engine + paycheck simulator + live store) — ✅ done. Cluster 1.7 (four data visualizations: Sankey, pacing line, Budget vs Actual, Goal Trajectory) — ✅ done, commit `cda8972`. Cluster 1.7 visual audit — ✅ done, commit `3da5716`. **Cluster 1.8 (Bill organizer + Plan My Next Check + calendar warnings) — ✅ done, commit `999ff37`. Cluster 1.9 (Debt payoff simulator + Saturn vessel + 3-up card + paid-off celebration) — ✅ done, commits `feb50e3` + `801525c` (math-bug fix) + `0ffb439` (per-debt sparkline).** Biweekly period locked as the canonical pay schedule (D17); period-close renamed to match (D18). **Chart-next-to-data principle applied across /goals, /envelopes, /recurring, /debts, /insights — commit `843375c`. Cluster 1.10 (drill-downs + new transaction / goal / envelope / bill / debt forms + edit forms) — ✅ done, commits `03f308f` + `006bca0` + `3dc679f` + `649d76e`. **Cluster 2.0 (customizable, scrollable, card-based dashboard with @dnd-kit drag-and-drop + localStorage persistence) — ✅ done, commit `e648ef5`. Cluster 2.0.1 (visual-first treatment: 7-day WeekSparkline, BurnSparkline, embedded GoalSparkline) — ✅ done, commit `af0b8d3`. Cluster 2.0.2 (full-month calendar with planetary headers + scheduled bills list) — ✅ done, commit `34f3928`. **Cluster 2.0.3 (Component Oracle Terminal re-skin of the dashboard) — ✅ done, commit `884fe70`.** Next: apply terminal re-skin to deep pages (recurring, envelopes, goals, etc.) in subsequent visible-UI pushes, then 2.x (form actions deep-dive, bill reminders, variable income, period close), then 3.x (real Plaid, AI tiers).
- **Stage 3 (Test & bug-fix)**: pending Stage 2

> Last update: 2026-08-23 (post-Cluster-2.0.3 — Component Oracle Terminal re-skin of dashboard)

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
- **D8** Design vibe: ~~Airtable-meets-treasury~~ → ~~Alchemical / Celestial (v4)~~ → **Component Oracle Terminal (v5)** — locked 2026-08-23. Cool terminal canvas (`#060A12` base, teal `#2DD4BF` signal, antique gold `#C9A45C` accent, system green `#4ADE80`). Sora for headings, JetBrains Mono for data/labels. Square 4px corners, thin teal-gray borders. Oracle / protocol voice with terminal-log markers (`[OK]`, `[WARN]`, `[SIGIL]`, `[INDEXED]`). The 7 planetary vessels (D14) are preserved as a semantic mapping (calendar day-of-week headers) but the visual treatment is terminal — no decorative occult overload. Replaces v4 alchemical / celestial warm-gold language. See Cluster 2.0.3.
- **D9** Mobile: PWA-ready, native deferred
- **D10** Stack: **Next.js 16 monolith + plugin architecture + API routes for external integrations**
- **D11** **Unit of truth = pay period** (not month, not transaction)
- **D12** **Auto-allocate, no confirm modal** (plan is policy, not intent)
- **D13** **3-chapter sidebar**: ~~Cosmos / The Great Work / Substance~~ → **Overview / Plan / Money** (terminal voice; order matters)
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

**Still in the alchemical voice (deferred to follow-up pushes):**

- All deep pages: `/recurring`, `/envelopes`, `/envelopes/[id]`, `/goals`, `/goals/[id]`, `/debts`, `/transactions`, `/calendar`, `/period`, `/insights`, `/allocation`, `/accounts`, `/investments`, `/emergency`, `/subscriptions`, `/invest`
- The form pages (`/envelopes/new`, `/goals/new`, `/debts/new`, etc.) — these may stay alchemical for now since they're set-and-forget
- The alchemical vocabulary ("vessel", "great work", "prima materia") — decide per-call whether to translate to terminal voice or keep as decorative
- Some catalog em strings still have alchemical flavor ("vessels needing attention.", "the one thing to fix.") — candidates for terminal voice in a follow-up

**Open question for xKryptic**: how aggressively to translate the alchemical vocabulary (Vessel/Sigil/Great Work) to terminal voice, or whether to keep it as a decorative layer on top of the terminal language. Recommendation: keep "vessel" as the term-of-art (it's already in the data model), but lean terminal in microcopy ("the one thing to look at." not "the one thing to fix.").

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
