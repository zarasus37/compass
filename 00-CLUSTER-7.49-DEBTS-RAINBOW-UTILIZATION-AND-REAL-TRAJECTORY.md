# Cluster 7.49 — Debts: Rainbow Utilization + Real Payoff Trajectory

**Status**: planned (this session)
**Date**: 2026-09-27
**Predecessor**: Cluster 7.48 (`69ce9a2` + `84e0cc1` — utilization + legibility)
**Replaces**: nothing — pure additive refinement of 7.48's surfaces

## Why

xKryptic 2026-09-27 second-round feedback after 7.48 shipped:

1. **"Get rid of" the paid-down progress bar.** The current Compass `/debts` card shows a thin progress bar with the caption "$2,856.00 of $6,841.00 paid down" — xKryptic crossed this out in the screenshot. When a debt has a credit limit, paid-down is the wrong metric. Utilization is the right metric. The bar should not exist on credit-card debts.
2. **Use the rainbow utilization gauge** from xKryptic's reference screenshot — lighter color scheme with a green-yellow-red gradient bar showing available credit, not the current zone-colored (green/yellow/red filled) version. The reference feels lighter and more "fuel gauge" than the current "warning stripe" rendering.
3. **Bring back the payoff trajectory, but actually show something useful.** xKryptic reverted the "remove it" decision from 7.48 — they want the trajectory back, but as a real declining curve (not the prior flat dashed line that communicated nothing). The current `Months to payoff at min` cell value already tells the duration; the trajectory visual needs to show the path.

Three asks, mapped to one cluster:

- **A. Rainbow utilization gauge** (card surface + expand panel): replace zone-based fill with a green→yellow→red gradient background, tier-colored marker at the current position.
- **B. Remove paid-down bar entirely for credit-card debts**: when `creditLimitCents` is set, the card no longer renders a bar at all — only the rainbow utilization gauge. When no limit (loans), paid-down progress bar stays.
- **C. Real payoff trajectory curve**: replace the (already-removed) flat sparkline with an SVG line chart that actually draws the balance-over-time curve from current to zero. Y-axis: current balance at top, $0 at bottom. X-axis: 0 → monthsAtMin. Restored for all debts, not just loans.

## Card surface (post-7.49)

Pre-7.49 (after 7.48):
```
[Donut: paid-down %]   Best Buy                  APR pill
                       Best Buy · ··1234 [Credit]  33.00% APR  (red)
[Utilization bar]                                  · Due day 27
Credit limit $1,000 · 96% used  ← solid tier-color fill       // MIN
                                                          ~$945/YR INTEREST
                                                          ($79/MO)
```

Post-7.49:
```
[Donut: paid-down %]   Best Buy                  APR pill
                       Best Buy · ··1234 [Credit]  33.00% APR  (red)
[Rainbow utilization bar]                              · Due day 27
[gradient green→yellow→red]
Credit limit $1,000 · 96% used (red marker)               // MIN
                                                          ~$945/YR INTEREST
                                                          ($79/MO)
```

The difference from 7.48: the bar background now shows the full green→yellow→red gradient (lighter aesthetic), with a tier-colored fill up to the current utilization % AND a thin vertical marker line at the utilization position. The marker is what calls out "you are HERE." The gradient conveys severity without the bar feeling like a warning stripe.

For loans (no credit limit), the card surface stays with the paid-down progress bar — that story still applies.

## Expand panel — UtilizationPanel

Pre-7.49 (7.48):
```
// UTILIZATION                                  96%
[========================|]   ← 3-zone gauge with markers at 30% / 80%
[utilization bar with solid tier color fill + 2 threshold markers]
// Balance $4,820  // Limit $5,000  // Available $180
```

Post-7.49:
```
// UTILIZATION                                  96%
[rainbow gradient green→yellow→red
                          |    ← marker at utilization position]
[bar background is gradient; fill is tier color up to current position]
// Balance $4,820  // Limit $5,000  // Available $180
```

The 30%/80% threshold markers from 7.48 are removed — the gradient does that work visually (green left = good, red right = bad). One clean marker at the current position, no extra annotations.

## Expand panel — Payoff trajectory (restored)

The section is restored for ALL debts (not just loans). Replaces the prior flat sparkline.

For Discover It (97mo at min, $3,985 balance, 24.99% APR, $96 min):
```
// PAYOFF TRAJECTORY                              ~97mo at min
$4k ┤╲
    │ ╲
$3k ┤  ╲╲
    │   ╲ ╲
$2k ┤    ╲  ╲╲
    │     ╲   ╲╲╲
$1k ┤      ╲     ╲╲╲
    │       ╲        ╲╲╲╲
$0  ┼────────────────────────╲╲╲╲────────────
   0       25      50      75      97mo
```

The curve is computed by sampling balance at each month from the existing `payoffProjection` helper. Rendered as an SVG path. Y-axis labeled at $0 / $1k / $2k / $3k / $4k. X-axis labeled at 0, halfway, end. The curve actually declines — visually communicates "your balance shrinks each month."

When the slider is moved (extra payment), the curve reacts in real time:
- More extra = curve flattens out faster (less time to zero)
- The "~Xmo at min" header updates to "~Xmo at min" or "~Xmo with $Y extra"

This is the "actually shows something useful" version — the curve carries information.

## Files

### Modified

- **`src/components/debts/DebtCard.tsx`**:
  - When `creditLimitCents` set: replace the solid-tier-color utilization bar with the rainbow gradient + marker.
  - The caption stays the same (`Credit limit $X · Y% used`) but the color follows the marker position tier (green if below 30%, amber if 30-80%, red if ≥80%).
  - Paid-down bar still renders when no credit limit.
- **`src/components/debts/DebtDetailExpand.tsx`**:
  - `<UtilizationPanel>`: gradient background replaces zone colors; threshold markers removed; single tier-colored marker at current utilization position.
  - Restore the "Payoff trajectory" section for ALL debts. Replace the flat `<DebtSparkline>` with a new `<PayoffCurve>` SVG line chart that draws the actual declining curve from `payoffProjection`. Y-axis: balance labels. X-axis: month labels.
  - Slider state feeds into the curve (when extra payment added, the curve recomputes to show the shorter timeline).
- **`00-CLUSTER-7.49-DEBTS-RAINBOW-UTILIZATION-AND-REAL-TRAJECTORY.md`** — this spec.
- **`tests/smoke-debts-rainbow.mjs`** — new smoke (~12 checks: rainbow gradient present in card + panel; no paid-down bar when creditLimit set; payoff curve renders SVG path with real data points; curve reacts to slider; existing 7.48 checks for utilization color thresholds stay green/yellow/red).

### Unchanged

- `src/lib/debt-tier.ts` — still provides tier colors.
- `src/lib/debt-interest.ts` — 7.47's helpers; trajectory curve uses `payoffProjection` directly (not the helpers).
- `src/lib/store.ts` + `src/lib/mock-seed.ts` — `creditLimitCents` schema stays.

## Verification

- `pnpm tsc --noEmit` clean.
- `node tests/smoke-debts-rainbow.mjs` — 12+ checks.
- Manual: open `/debts` on preview; verify the rainbow utilization feels lighter than the current zone version; expand Discover It; verify the trajectory curve visibly declines; move the slider; verify the curve reacts.

## Risks

- **SVG path performance**: rendering 100+ path points per debt is negligible (browsers handle this trivially). The payoff projection already runs in-memory in milliseconds.
- **Gradient legibility on dark theme**: green→yellow→red on `var(--cosmos)` (panel surface) should contrast well. If contrast is poor in the green-amber transition, future cluster can tweak the gradient stops. For now, the colors are the same `var(--ok)` / `var(--warn)` / `var(--neg)` already used elsewhere — visual consistency.
- **Curve y-axis range**: if balance is very high ($20k), the curve is the same shape but the y-axis labels shift. The component computes the y-axis scale dynamically (rounded to nearest $1k / $5k / $10k based on balance). For now, hardcoded at $1k increments — acceptable for balances under $10k.
- **Slider reactivity**: the curve re-renders on every slider drag. With `useMemo` on `payoffProjection([debt], "snowball", extraDollars, a)`, the projection is cached and only recomputes when extraDollars changes. Cheap.
- **Removed paid-down bar for credit-card debts**: matches user intent (the bar was crossed out). Loans still get the paid-down bar — that story still applies when there's no credit limit.

## Out of scope

- Animated curve (the curve updates instantly when slider moves; no transition between values — keep it cheap).
- Y-axis labels in different scales ($5k increments for higher balances).
- Sparkline tooltips (hover to see exact balance at month X).
- New-debt form to set credit limit (when DB-backed debts ship).
- Real amortized Year-1 interest calculation (separate future cluster).