# Cluster 7.51 — Debts: Cross-Debt "Where to Put Extra" View

**Status**: planned (this session)
**Date**: 2026-09-28
**Predecessor**: Cluster 7.50 (`8128d88` + `367d7cd` — mobile polish)

## Why

xKryptic 2026-09-28 picks up pending item (5): bring the cross-debt "where to put extra" math from the dashboard's Pay My Next Check card to `/debts` so mom can see the order of payoff on the same surface she manages the individual debts.

The dashboard's Pay My Next Check answers the question: "if I have $X extra per paycheck, which debt should I throw it at?" Currently this only lives on the dashboard. Cluster 7.51 puts the same answer (with a richer visual) on `/debts`.

## Design

A new `<CrossDebtExtraPanel>` client component renders above the existing `[WARN]` page-level banner (from 7.47). The panel has three sections:

1. **Method toggle** — `SNOWBALL` (pay smallest balance first) vs `AVALANCHE` (pay highest APR first). Default: `AVALANCHE` (the mathematically optimal choice for minimum total interest).
2. **Extra slider** — $0–$500/mo (matches the per-debt simulator range in DebtDetailExpand). Default: $0. The slider is SSR-stable (no flicker on mount).
3. **Outcome panel** — at any slider value, shows:
   - Total interest saved vs baseline (slider = 0): `$X saved`
   - Total months to debt-free: `N mo`
   - **Payoff order** — a ranked list of debts by `monthsToPayoff` (ascending). For each: name + balance + months + the absolute month they'll be paid off.
   - Empty state when `activeCount === 0`: `[OK] No active debts to allocate extra toward.`

The panel uses the existing `payoffProjection` helper (the same one `<PayoffCurve>` uses) — runs two projections (baseline + slider), diffs the `totalInterestCents`, and renders the result. `React.useMemo` caches the projection so slider drags don't recompute when the method is unchanged.

## Why on `/debts`, not the dashboard

- The dashboard's Pay My Next Check is one tile in a grid of tiles — easy to miss. `/debts` is the dedicated surface for debt management; the cross-debt math belongs there.
- The new panel is a sibling to the existing `[WARN]` page banner. They share the same viewport (above the cards, below the PageHead). They don't fight for attention — the banner is a one-line stat, the panel is interactive.
- Future: the dashboard's Pay My Next Check can either delegate to the panel (server-render the same component) or stay as a smaller teaser. Out of scope here.

## Files

### New

- **`src/components/debts/CrossDebtExtraPanel.tsx`** — client component (~180 lines). Holds method + extraDollars state, runs two `payoffProjection` calls (baseline + slider), renders method toggle + slider + outcome panel.
- **`00-CLUSTER-7.51-DEBTS-CROSS-DEBT-EXTRA.md`** — this spec.
- **`tests/smoke-debts-cross-extra.mjs`** — new smoke (~14 checks: panel imports payoffProjection, has method toggle state, runs baseline diff, shows savings, shows payoff order, hides when activeCount === 0, slider reacts, etc.).

### Modified

- **`src/components/debts/DebtListInteractive.tsx`** — renders `<CrossDebtExtraPanel debts={debts} anchor={a} />` ABOVE the existing `[WARN]` page banner (from 7.47). Passes the full debt list + anchor. The panel renders nothing when `activeCount === 0` (so the existing `[OK] No interest being paid — all debts are clear.` banner still shows for the all-paid-off case).
- **`package.json`** — new smoke added to the chain.

### Unchanged

- `src/lib/payoff-projection.ts` — reused as-is.
- `src/app/(app)/debts/page.tsx` — no change (the panel lives inside the client wrapper).
- `src/lib/debt-tier.ts`, `src/lib/debt-interest.ts` — no change.

## The cross-debt panel shape

```
┌─────────────────────────────────────────────────────────────────────┐
│ // CROSS-DEBT EXTRA                                                  │
│                                                                     │
│   [SNOWBALL]  [AVALANCHE]      ← method toggle (button-style pills) │
│                                                                     │
│   IF YOU ADD  $0 / MONTH                                          │
│   [▒▒▒▒▒|░░░░░░░░░░░░░░░░░░░░░]   ← extra slider ($0 - $500) │
│   $0                 $500                                          │
│                                                                     │
│   SAVES YOU       $X in interest   (when extra > 0)                │
│   DEBT-FREE IN    N months                                         │
│                                                                     │
│   PAYOFF ORDER:                                                    │
│   1. CareCredit       $1,240        Paid off at month 4             │
│   2. Chase Sapphire   $2,100        Paid off at month 12            │
│   3. Discover It      $4,820        Paid off at month 28            │
└─────────────────────────────────────────────────────────────────────┘
```

When `extraDollars === 0`, the SAVES YOU line shows `$0.00 — pay only minimums` (no savings) and DEBT-FREE IN shows the baseline timeline.

When `activeCount === 0` (all debts paid off), the panel renders nothing — the existing `[OK] No interest being paid — all debts are clear.` banner from 7.47 handles that state.

## Verification

- `pnpm tsc --noEmit` clean.
- `node tests/smoke-debts-cross-extra.mjs` — 14+ checks.
- Manual: open `/debts` on preview; toggle SNOWBALL vs AVALANCHE — verify the order changes (snowball = smallest first, avalanche = highest APR first). Move the slider — verify savings + debt-free total update.

## Risks

- **Method toggle is a value judgment**: avalanche is mathematically optimal (less total interest), snowball is psychologically optimal (early wins build momentum). The default is avalanche. xKryptic explicitly removed the cross-debt method from `<DebtDetailExpand>` in 7.45 ("per-debt method toggle doesn't make sense"), but the cross-debt view legitimately has a comparison. The toggle stays.
- **Slider scale**: $0–$500 matches `<PayoffCurve>` slider. For high-balance debts (>$10k), $500 might not move the needle visibly. Future cluster can widen the slider to $0–$5,000 (or auto-scale based on debt totals).
- **Two `payoffProjection` calls per render**: each call iterates up to 360 months. For 5 active debts, that's 720 vs 360 iterations — cheap (<1ms). `useMemo` on both calls prevents re-computation when unrelated state changes.
- **SSR-stable defaults**: the slider defaults to $0 (no extra payment) on first paint. The method defaults to `AVALANCHE`. No flash, no flicker.
- **Payoff order display**: when two debts pay off in the same month (rare but possible), the order between them is arbitrary. Future cluster could break ties by balance or APR for a stable display.

## Out of scope

- Per-debt method override (the user already rejected this in 7.45).
- Persistence of the slider value across sessions.
- Animated payoff order transition (the list just re-sorts instantly).
- Comparison of SNOWBALL vs AVALANCHE side by side (currently only one method is active at a time — toggle switches it).