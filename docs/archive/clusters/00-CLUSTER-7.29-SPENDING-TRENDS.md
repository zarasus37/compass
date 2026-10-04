# Cluster 7.29 — Spending Trends

**Status (2026-09-23): IN PROGRESS.** Spec on disk; awaiting code + smoke + audit.

## Goal

A **"Top expenses · last 30 days"** card on `/insights` showing two
ranked lists: by envelope (top 5) and by payee (top 10). Answers
"where did my money go?" — mom-readable, no analyst needed.

## Why now

- Tier 2 (user direction, 2026-09-22) final cluster: sinking funds
  (7.28), quick-add (7.27), now spending trends (this one).
- Pairs with the cash-flow forecast (7.26) and quick-add (7.27):
  the forecast projects what's coming; this card shows what already
  happened. Together they answer "where am I" + "where am I going".
- Pure read of existing `Transaction` table. No schema change, no new
  env vars, no new middleware, no new API routes. Lowest-risk cluster
  in Tier 2.

## What ships

### 1. New helper: `src/lib/forecast/spending-trends.ts`

Pure server-side aggregation. Reads all `Transaction` rows for the
user in the last 30 days, filters to expenses (negative amounts, OR
positive amounts flagged `isPrimaMateria=false`), groups by envelope
and by payee, ranks, returns top N for each.

Output shape:
```ts
{
  status: "ok" | "pending_no_expenses",
  windowDays: 30,
  windowStart: string,    // ISO date
  windowEnd: string,      // ISO date
  totalSpentCents: number,
  transactionCount: number,
  byEnvelope: Array<{
    envelopeId: string | null,
    name: string,
    planet: PlanetId | null,
    totalCents: number,
    transactionCount: number,
  }>,
  byPayee: Array<{
    payee: string,
    totalCents: number,
    transactionCount: number,
  }>,
}
```

### 2. New component: `src/components/dashboard/cards/spending-trends.tsx`

Two-column layout:
- **Left (40%)**: ranked list "By envelope" (top 5)
- **Right (60%)**: ranked list "By payee" (top 10)
- Header: `// SPEND · LAST 30D` + total spent headline
- Empty state: "no expenses logged yet — start logging" (no fake data)
- per-row: rank number, label, `$X · Y transactions`, % of total

Reuses `var(--vessel-*)` design tokens, `VesselGlyph` for envelope
planet colors.

### 3. Wire into `/insights`

Mounts as a new section between `CashFlowForecastCard` (Cluster
7.26) and `NetTrajectoryCard` (12-month net worth trajectory). Same
`data-testid` and `data-*` invariants as Cluster 7.26 for smoke
coverage.

### 4. Smoke

`tests/smoke-spending-trends.mjs` (~10 checks):
- DOM hook for the card on `/insights`
- "by envelope" list renders with ≥1 ranked row (after seeding sample transactions)
- "by payee" list renders with ≥1 ranked row
- Math invariant: sum of byEnvelope totals ≤ totalSpent (positive amounts excluded)
- Math invariant: top-1 byPayee has `totalCents > 0`
- Empty state: when no expenses exist in 30d, the card shows "no expenses logged"
- 30-day window: the data-* attributes carry a real ISO date

## Out of scope (deferred)

- **Period-over-period comparison** (this 30d vs previous 30d). Pure
  visualization, bigger card. Could be a v1.1 polish cluster.
- **Daily-spend heatmap** (calendar grid showing spend density). Heavy
  viz, defer.
- **Category breakdown** (a "spending by category" donut distinct
  from the existing Ouroboros which shows allocation). Same data
  source, different framing — defer until mom asks.
- **Export to CSV**. Power-user feature. Defer.

## No schema change. No env change. No middleware change.

The card reads the existing `Transaction` table via Prisma. No new
env vars. No new API routes. The cash-flow card (7.26) already
established the read-path pattern; this reuses it.

## Verification

- `pnpm tsc`: clean
- `pnpm smoke` (data layer, +smoke-spending-trends): ~1,025 → ~1,035
- `tests/integration-vault.mjs`: 345 / 0 miss (unchanged)
- `tests/smoke-deploy.mjs`: 145 / 0 miss (unchanged)
- `smoke:ui` (13 stages): 432 / 0 miss

## Files expected to change

Added:
- `src/lib/forecast/spending-trends.ts` (~150 LOC: aggregation helper)
- `src/components/dashboard/cards/spending-trends.tsx` (~250 LOC: visual)
- `tests/smoke-spending-trends.mjs` (~150 LOC: 10 checks)

Modified:
- `src/app/(app)/insights/page.tsx` (mount)
- `package.json` (`smoke` chain extended)
- `HANDOVER.md` (Cluster 7.29 audit + commit-chain refresh)
- `00-MOM-LAUNCH-RUNBOOK.md` (Step 6.10 — mom-visible spending trends)
