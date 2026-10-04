# Cluster 7.47 — Debts: Wasted in Interest

**Status**: planned (this session)
**Date**: 2026-09-27
**Predecessor**: Cluster 7.46 (`1149c49` + `4a8e004` + `b97510d` — debts tier color + more detail)
**Replaces**: nothing — pure additive surface; keeps all existing interest cells

## Why

xKryptic 2026-09-27 follow-up after Cluster 7.46 shipped: **"include information regarding how much is being waisted in interest"**. The 7.46 design surfaces monthly interest (small mono hint on each card + a 12-cell grid in the expanded panel) but the framing doesn't emphasize the **waste**. Mom sees "~$45/mo interest" on a credit card — that's $540/year. Seeing it spelled out as yearly + the lifetime "if I pay only the minimum" total changes the emotional weight.

Three surfaces to add/refine:

1. **Card surface**: the small mono "~$X/mo interest" hint flips to "~$Y/yr interest" as the primary line (yearly is the shock value). Monthly stays as a smaller secondary line.
2. **Page-level aggregate headline**: a terminal `[WARN]` banner between the PageHead and the cards that says **"You're wasting ~$X/year in interest across N debts"**. Frames the entire page with the cost-at-glance.
3. **Expanded panel**: the existing "Interest at min" cell is relabeled to **"Wasted to interest"** and gains tier coloring so the long-term waste number stands apart like the other severity cells. The "Monthly interest cost" cell becomes "Monthly interest" (the current month, not the same as the lifetime).

All three numbers together give mom the full picture: **right now** (per-card yearly + page-level aggregate), **this month** (cell in expand), and **if you pay only the minimum** (the "Wasted to interest" cell).

## Math

All in cents, all derived from `Debt` fields. No new DB columns.

- `monthlyInterestCents(debt) = round(balance × aprBps / 120000)`
  - (Balance × APR% / 12 months — standard amortizing interest formula)
- `yearlyInterestCents(debt) = monthlyInterestCents(debt) × 12`
  - Approximation: assumes the balance stays roughly constant through the year. For debt-payoff math this is a slight overestimate (because mom pays down principal), but it's the right ballpark for "what's leaving your wallet this year."
- `totalWastedAtMinCents(debt, anchor?)` — existing math from `DebtDetailExpand` (`monthlyInterest × monthsAtMin` rounded). Pulled out into a shared helper.
- `aggregateYearlyInterestCents(debts) = sum(yearlyInterestCents(d) for d in debts where !isPaidOff)`

## Files

### New

- **`src/lib/debt-interest.ts`** — pure helpers (`monthlyInterestCents`, `yearlyInterestCents`, `totalWastedAtMinCents`, `aggregateYearlyInterestCents`, `hasAnyHighTier`). No React, no DB, safe to import from server + client.
- **`00-CLUSTER-7.47-DEBTS-WASTED-IN-INTEREST.md`** — this spec.
- **`tests/smoke-debts-interest.mjs`** — source-file smoke (~12 checks: helper file exists, exports correct names, DebtCard renders yearly hint, DebtListInteractive renders aggregate headline, DebtDetailExpand relabels cell + applies tier color).

### Modified

- **`src/components/debts/DebtCard.tsx`**:
  - Import `yearlyInterestCents` from new helper.
  - Replace "~$X/mo interest" line with two lines:
    - Primary: `~$Y/yr interest` in tier color, larger.
    - Secondary: `($X/mo)` in `var(--ink-3)`, smaller.
- **`src/components/debts/DebtDetailExpand.tsx`**:
  - Import `totalWastedAtMinCents` from new helper; use it instead of the inline `monthlyInterest × monthsAtMin` math.
  - Relabel cell "Monthly interest cost" → "**Monthly interest**" (concise).
  - Relabel cell "Interest at min" → "**Wasted to interest**" (matches user phrasing).
  - Apply tier color to the "Wasted to interest" cell so the severity matches the APR / Monthly Interest / Total Cost cells (currently `ink-2`).
- **`src/components/debts/DebtListInteractive.tsx`**:
  - Compute `aggregateYearlyCents` + `activeCount` from `debts`.
  - Render a `[WARN]` terminal banner ABOVE the cards: **"You're wasting ~$X/year in interest across N debts"**. Banner uses `var(--warn)` for the marker and `var(--ink)` for the text; the dollar amount uses tier color (highest tier across the debts).
- **`src/components/debts/DebtCard.tsx`** (additionally): the existing inline `monthlyInterestCents = round(balance × aprBps / 120000)` gets replaced by `yearlyInterestCents` import; the local computation is removed (deduplicate with the helper).
- **`package.json`**: add `smoke-debts-interest.mjs` to the smoke chain.

### Unchanged

- `src/lib/debt-tier.ts` — already provides `aprTier` + color helpers; this cluster uses them but doesn't change them.
- `src/lib/payoff-projection.ts` — already provides `payoffProjection([debt], ...)`; this cluster uses it but doesn't change it.
- `src/lib/store.ts` (Debt type) — no schema change.
- `src/app/(app)/debts/page.tsx` — no change (the aggregate is computed inside `DebtListInteractive` from the debts it already gets).

## The terminal headline shape

```
┌─────────────────────────────────────────────────────────────────────┐
│ [WARN] You're wasting ~$1,440/year in interest across 5 debts        │
└─────────────────────────────────────────────────────────────────────┘
```

- Border + background: `var(--cosmos)` (panel surface) + `1px solid var(--warn)` (warn-tinted border)
- Marker: `[WARN]` in `var(--warn)` (amber)
- Body: "You're wasting " in `var(--ink-2)`; "~$X/year" in **highest-tier color across debts** (red if any high, amber if any medium, green otherwise, dim if all 0%); " in interest across N debts" in `var(--ink-2)`.
- Mono font for the [WARN] marker + dollar figure (matches the terminal aesthetic); Sora for the rest.

When all debts are paid off, banner reads: `[OK] No interest being paid — all debts are clear.`

## Card-surface hint shape

Pre-7.47:
```
~$45/mo interest
```

Post-7.47:
```
~$540/YR INTEREST         ← primary, tier color, 10pt bold mono
($45/MO)                 ← secondary, var(--ink-3), 8.5pt mono
```

The yearly is the headline. The monthly is the reality.

## Expanded panel cells (after 7.47)

The 12-cell grid stays 12 cells; **only labels + colors change**:

| Old label              | New label              | Accent change             |
|------------------------|------------------------|---------------------------|
| Monthly interest cost  | **Monthly interest**   | (tier-colored, unchanged) |
| Interest at min        | **Wasted to interest** | **tier-colored (was ink-2)** |
| Total cost to zero     | Total cost to zero     | (tier-colored, unchanged) |

The "Wasted to interest" cell now matches the tier-color severity treatment of the other severity cells. The lifetime "if I pay only the minimum" cost stands out alongside APR, Monthly interest, and Total cost to zero.

## Verification

- `pnpm tsc --noEmit` clean.
- `node tests/smoke-debts-interest.mjs` — 12+ checks (helper exports, DebtCard yearly hint, DebtListInteractive aggregate headline + paid-off banner, DebtDetailExpand relabeled cells + tier color on Wasted cell).
- Manual: expand a card on the preview; verify the aggregate banner shows the right total; verify the "Wasted to interest" cell is tier-colored.

## Risks

- **Yearly is an approximation.** It assumes the balance stays constant through the year. For a debt mom is actively paying down, the actual interest she pays this year is slightly less than `yearlyInterestCents`. For a debt at minimum payments, it's slightly more. The approximation is good enough for "how much is being wasted" framing but the exact figure will be a few percent off. Acceptable for v1; future cluster could integrate with the existing payoff projection to show "Year 1 interest: $X" with amortized math.
- **Aggregate headline could read judgmental.** "You're wasting $1,440/yr" is a strong phrase. xKryptic's wording ("wasted") was explicit, but if mom finds it harsh, the banner copy can soften ("going to" / "spent on") in a one-line edit. Keeping the strong framing matches the user's ask.
- **Tier color of the aggregate headline depends on the worst single debt.** If one high-APR debt dominates the waste number, the whole banner goes red. That's the desired behavior (severity is global) but worth noting.
- **No URL/anchor for "what changes if I pay this down faster?"** The aggregate banner doesn't link anywhere — it's a stat. The per-card simulator already exists in the expand panel.

## Out of scope

- Amortized Year-1 interest (approximation is fine for v1)
- Aggregate "saved by paying $X extra" headline (per-card simulator covers this)
- `/debts` page filter / sort by interest cost (future cluster)
- Renaming the `Monthly interest cost` cell on the dashboard's Pay My Next Check card (separate surface)