# Cluster 7.26 — Cash Flow Forecast

**Status (2026-09-22): IN PROGRESS.** Spec on disk; awaiting code + smoke + audit.

## Goal

A mom-visible **30/60/90-day balance projection** on `/dashboard` (primary) and a
60-day chip on `/insights` (secondary). Answers the question "what's my checking
account balance next month?" — the most common budgeting anxiety and a question
neither the existing pace projection (`/period`) nor the 12-month net-worth
trajectory (`/insights`) actually answers.

## Why now

- User direction (2026-09-22): vault is experimental and out of scope for the
  mom-launch. Focus is budget features only.
- The pay-period primitives are already in the codebase (`nextPayDate` cadence
  math, `PaySchedule` Prisma table, `paycheckBreakdown` envelope distribution,
  `Account.currentBalance`, `Bill.dueDay` + `amountCents`). No new data shape
  needed.
- Standard budget-app feature — any Mint/YNAB/Copilot Money clone surfaces a
  balance projection. Mom will recognize the pattern immediately.

## What ships

### 1. New helper: `src/lib/forecast/cash-flow.ts`

Server-side projection. Inputs:
- `userId` — pulls `PaySchedule`, `Account.currentBalance`, `Bill[]`,
  `AllocationPlan.rules`, `Envelope[]` from Prisma
- `today: Date` (default `new Date()`)
- `horizonDays: number` (30, 60, or 90)

Output: `CashFlowForecast` shape:
```ts
{
  status: "ok" | "pending_no_pay_schedule" | "pending_no_account" | "pending_no_bills",
  startBalanceCents: number,
  startDate: string,                  // ISO
  horizonDays: number,
  series: Array<{
    date: string,                     // ISO date (every pay period)
    balanceCents: number,             // projected end-of-day balance
    incomeCents: number,              // paycheck that day
    billsCents: number,               // bills that day
    envelopeCents: number,            // allocations (non-bill envelopes)
  }>,
  lowPoint: {                         // first projected red day, if any
    date: string,
    balanceCents: number,
    daysFromNow: number,
  } | null,
  endBalanceCents: number,
  bufferFloorCents: number,           // 1 bill-cycle of bills, or 0 if no bills
}
```

Algorithm:
1. Read all `Bill` rows for the user; resolve each bill's next N occurrences
   within the horizon via `dueDay` cadence (monthly, default).
2. Walk day-by-day. On a pay date (per `PaySchedule.cadence` via
   `nextPayDate()`), add `PaySchedule.amount`. On a bill due day, subtract
   `Bill.amountCents`. Each pay period, subtract the bill-cycle total and
   the per-paycheck envelope allocation per `paycheckBreakdown()`.
3. Track the running balance; record the first day it dips below
   `bufferFloorCents` (= total bills in next 30 days, or 0 if no bills).
4. Sample the series at every pay period boundary (not every day — keeps
   the chart readable).

### 2. New component: `src/components/dashboard/cards/CashFlowForecastCard.tsx`

Visual treatment matches the existing `NetTrajectoryCard`:
- Line chart with the projected balance over the horizon
- Pay periods marked with a small gold dot
- Bill days marked with a small warn-amber dot
- "First projected red day" callout if any (rendered even when balance
  stays positive — "you'll dip to $X on day 30 but recover by day 45" is
  useful too)
- Headline: "Projected balance on day {N}" with `formatMoneyCompact()`
- Subtext: "{N} paychecks · {M} bills · {envelope contributions}"
- Pill: `[OK] HEALTHY` if no red day, `[WARN] TIGHT DAYS AHEAD` if a red
  day exists, `[PENDING] ...` if any prerequisite is missing

States (rendered honestly, no fake data):
- `pending_no_pay_schedule` → "Set up pay schedule in /accounts to enable
  cash-flow projection." with a CTA link
- `pending_no_account` → "Add a checking account to enable cash-flow
  projection." with a CTA link
- `pending_no_bills` → "Add a bill in /obligations to see when they'll
  hit your balance." (we can still project paychecks, just no bill math)

### 3. Wiring

- `/dashboard` (the new mom-checked-daily surface): render
  `<CashFlowForecastCard data={forecast} />` between the existing
  `NetTrajectoryCard` and the `AlertBay` or wherever there's a clear
  slot. Single component import.
- `/insights`: render the same component in a smaller variant
  (`<CashFlowForecastCard compact />` — 60-day chip, no per-day list).
  Above the existing `Trajectory` section so it reads as "today's lens"
  before "12-month lens".

### 4. Smoke

`tests/smoke-cash-flow-forecast.mjs` (~15 checks):
- Card mounts on `/dashboard` and `/insights` with `data-testid` hooks
- Pending states render honestly (no fake projection) when prerequisites
  missing
- After seeding pay schedule + checking account + a bill: projection
  shows non-empty `series`, math invariants hold
- First-day balance equals `Account.currentBalance` (no drift)
- Pay-period sum on a single step equals `PaySchedule.amount`
- Bill day subtractions match `Bill.amountCents`
- `lowPoint` is `null` when buffer is always satisfied; populated when
  not
- `[OK] HEALTHY` vs `[WARN] TIGHT DAYS AHEAD` pill state matches math

### 5. Cleanup (bundled, ~10 min)

Fix the 3 reachable React 19 `<title>` array-children warnings:
- `src/app/(app)/vault/audit/ActivityStrip.tsx:289`
- `src/components/viz/SankeyFlow.tsx:452`
- (skip `_deprecated/recurring/page.tsx` — unreachable)

Wrap each multi-line `<title>` JSX child in a single template-string
`{`...`}`, same pattern as `obligations/page.tsx:634` and
`period/page.tsx:1762`.

## Out of scope (deferred)

- **Multiple-account aggregation** — sum of all `currentBalance`
  across user's accounts. Single "Spendable" account is enough for
  v1. Cluster 7.27+ if mom opens a second checking.
- **Variable income modeling** — assumes the per-paycheck allocation
  is fixed. Variable-income (1099, freelance) is a v1.1 problem.
- **What-if scenarios** — "what if I add $200/mo to savings?"
  Interactive forecast editor is a much larger surface.
- **Calendar export of low-balance days** — Tier 3 cluster.

## No schema change. No env change. No middleware change.

The forecast reads existing tables (`User`, `Account`, `PaySchedule`,
`Bill`, `AllocationPlan`, `Envelope`). No new env vars. No new API
routes (the data flow is server-side at the page level). No middleware
change.

## Verification

- `pnpm tsc`: clean
- `pnpm smoke` (data layer, +smoke-cash-flow-forecast): 981 → ~996
- `tests/integration-vault.mjs`: 345 / 0 miss (unchanged)
- `tests/smoke-deploy.mjs`: 145 / 0 miss (unchanged)
- `smoke:ui` (13 stages): 432 / 0 miss (unchanged; no UI regressions
  from title-warning cleanup)
- New visual: `/dashboard` and `/insights` render the new card

## Files expected to change

Added:
- `src/lib/forecast/cash-flow.ts` (~180 LOC: projection math + types)
- `src/components/dashboard/cards/CashFlowForecastCard.tsx`
  (~150 LOC: presentational + chart)
- `tests/smoke-cash-flow-forecast.mjs` (~250 LOC: 15 checks)

Modified:
- `src/app/(app)/page.tsx` — mount on dashboard
- `src/app/(app)/insights/page.tsx` — mount compact variant
- `src/app/(app)/vault/audit/ActivityStrip.tsx` — title wrap
- `src/components/viz/SankeyFlow.tsx` — title wrap
- `package.json` — `smoke` chain extended
- `HANDOVER.md` — Cluster 7.26 audit + commit-chain refresh
- `00-MOM-LAUNCH-RUNBOOK.md` — Step 6.7 (mom-visible cash flow card)
