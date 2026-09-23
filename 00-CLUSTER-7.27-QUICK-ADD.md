# Cluster 7.27 — Quick-Add Transaction

**Status (2026-09-23): IN PROGRESS.** Spec on disk; awaiting code + smoke + audit.

## Goal

A header-mounted **+** button on `TopAppBar` that opens a popover with
a minimal transaction form (amount + envelope + optional payee)
reachable from any signed-in page. Mom spends ~30 seconds on each
transaction log today (navigate to `/transactions/new`, fill the form,
submit); this brings it to ~5 seconds with one keyboard hop to the
amount field.

## Why now

- User direction (2026-09-22): vault is experimental/separate; focus is
  budget features only.
- Tier 1 (cash-flow forecast, Cluster 7.26) just shipped. The projection
  card's accuracy depends on mom logging transactions promptly. Reducing
  the entry friction is the natural follow-on.
- Standard budget-app pattern: every Mint/YNAB/Copilot Money clone has a
  "quick add" affordance. Mom will recognize it.
- The hard work is already done: `logTransaction()` server action exists,
  `NewTransactionForm` is a full-featured form for the rare case where
  mom wants the long form.

## What ships

### 1. New client component: `src/components/shell/QuickAddTransaction.tsx`

A self-contained popover with three controls:
- **Amount** input (dollars, auto-focused on open)
- **Envelope** select (Vessel-styled dropdown of mom's envelopes)
- **Payee** input (optional, defaults to last-used)
- **Log** button (primary action)
- **Open full form** link (routes to `/transactions/new`)

Behavior:
- Submit calls `logTransaction()` server action with `source="quick-add"`.
- On success: popover closes, TopAppBar flashes a `+$X → Envelope` pill
  for 2.5 seconds, dashboard revalidates so the cash-flow projection
  sees the new transaction.
- On failure: inline error message in the popover (no close).
- Popover dismisses on: click outside, Escape key, submit success.

### 2. Wire into `TopAppBar`

Add a `+` button between the existing engine toggle pill and the
settings cog. Same `var(--vessel-accent)` styling, glyph is a Unicode
`+` in JetBrains Mono. Server-rendered button shell; the popover is
client-rendered.

### 3. Smoke

`tests/smoke-quick-add.mjs` (~12 checks):
- `+` button renders in TopAppBar (after auth)
- Clicking opens the popover (DOM hooks: `data-testid="quick-add-popover"`)
- Submitting creates a Transaction row (verify in DB)
- Dashboard revalidation: cash-flow card updates to reflect new bill
- "Open full form" link routes to `/transactions/new`
- No envelopes case: popover shows honest CTA to `/envelopes` (no fake submit)

## Out of scope (deferred to later clusters)

- **Sinking funds** — sub-envelope allocations (Cluster 7.28)
- **Spending trends** — `/insights` breakdown by envelope/payee (Cluster 7.29)
- **Smart payee suggestions** — type-ahead from transaction history
- **Receipt photo attachment** — file upload UI
- **Recurring transaction detection** — "we see Netflix every month,
  want to add as a bill?"

## No schema change. No env change. No middleware change.

The popover reuses `logTransaction()` which already writes a
`Transaction` row with `source="user"`. The only change is adding
`source="quick-add"` as a literal (the column already accepts free-form
strings). No new API routes. No new env vars.

## Verification

- `pnpm tsc`: clean
- `pnpm smoke` (data layer, +smoke-quick-add): ~1,003 → ~1,015
- `tests/integration-vault.mjs`: 345 / 0 miss (unchanged)
- `tests/smoke-deploy.mjs`: 145 / 0 miss (unchanged)
- `smoke:ui` (13 stages): 432 / 0 miss (no UI regression)

## Files expected to change

Added:
- `src/components/shell/QuickAddTransaction.tsx` (~280 LOC: popover + form)
- `tests/smoke-quick-add.mjs` (~150 LOC: 12 checks)

Modified:
- `src/components/shell/TopAppBar.tsx` (mount the trigger)
- `package.json` (`smoke` chain extended)
- `HANDOVER.md` (Cluster 7.27 audit + commit-chain refresh)
- `00-MOM-LAUNCH-RUNBOOK.md` (Step 6.8 — mom-visible quick-add)
