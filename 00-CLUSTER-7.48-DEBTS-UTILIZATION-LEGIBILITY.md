# Cluster 7.48 — Debts: Utilization + Card Legibility

**Status**: planned (this session)
**Date**: 2026-09-27
**Predecessor**: Cluster 7.47 (`bfcaa39` + `0432be9` — wasted-in-interest prominence)
**Replaces**: nothing — pure additive + visual polish; no removed data

## Why

xKryptic 2026-09-27 feedback after 7.47 shipped, with screenshots:

1. **"The payoff trajectory doesn't really provide any useful information visually."** The current sparkline is a flat dashed line with one dot — mom can't read the projection from it. The cell value `~110mo at min` already says what she needs.
2. **"The numbers are too small to read"** under the name and balance on the card surface. The APR pill (11.5pt mono), the MIN line (9.5pt mono), the interest hints (10pt + 8.5pt mono) are all readable in good light but small on a laptop screen at arm's length. They sit in `var(--ink-3)` which adds to the low-feel.
4. **"It would be better to show a utilization graph instead of the numbers"** — xKryptic included a reference screenshot of a different banking app's Bills page that shows credit-card debts as: donut (paid-down %) + balance + MIN + APR + a horizontal "Credit limit $X" + utilization gauge (green/yellow/red) bar. The utilization gauge is the visual that summarizes "how much of your limit are you using" at a glance — a credit-health metric distinct from paid-down.

Three asks, mapped to one cluster:
- **A. Legibility**: bump small numbers on the card surface.
- **B. Utilization**: add a utilization gauge (only for credit-card debts, since utilization requires a credit limit).
- **C. Trajectory cleanup**: remove the uninformative payoff trajectory sparkline from the expanded panel. Replace with utilization visualization when credit limit is set.

## What we're NOT doing

- Not removing the small numbers entirely (the reference still shows MIN + APR). Just bumping legibility + adding utilization as additional context.
- Not changing the donut (it stays showing paid-down % for the "progress" story; utilization is a different metric).
- Not auto-detecting credit limit from account (would require linking to a Plaid-style provider; out of scope).
- Not touching the "Monthly interest" / "Wasted to interest" / "Total cost to zero" cells in the 12-cell grid — 7.47 already optimized those.

## Schema change (in-memory only — no DB)

Add an optional `creditLimitCents?: number` to the `Debt` interface (`src/lib/store.ts`) and `DebtSeed` (`src/lib/mock-seed.ts`). In-memory debts are not yet DB-backed for this view, so no Prisma migration needed.

Seeded values (initial mocks):
- **Discover It**: `creditLimitCents: 5_000_00` ($5,000 limit)
- **Chase Sapphire**: `creditLimitCents: 4_500_00` ($4,500 limit)
- **CareCredit**: `creditLimitCents: 5_000_00` ($5,000 limit)

These are the kind of values mom would have on her real cards. Discover It at 24.99% APR with ~$4,800 balance against a $5K limit = ~96% utilization (the high-utilization bucket — which is why the card is "expensive"). CareCredit promo at $1,240 against $5K = 25% utilization (low — appropriate for a 0% promo card).

The IdentityDebt Prisma model already exists but isn't wired into this view yet. When DB-backed debts land, the field gets added in that round (out of scope here).

## Card-surface changes

Pre-7.48 right column under balance:
```
// MIN $96.00          ← 9.5pt mono, var(--ink-3)
~$1,053.36/YR INTEREST  ← 10pt mono, tier color (primary)
($87.78/MO)             ← 8.5pt mono, var(--ink-3) (secondary)
▾ EXPAND
```

Post-7.48 right column:
```
// MIN $96.00          ← 11.5pt mono, var(--ink-2)  (was 9.5pt / ink-3)
~$1,053/YR INTEREST    ← 12pt mono bold, tier color  (was 10pt)
($88/MO)               ← 10pt mono, var(--ink-2)     (was 8.5pt / ink-3)
▾ EXPAND
```

Pre-7.48 middle column progress area:
```
[progress bar — 38% paid]
$2,626.00 of $6,841.00 paid down
```

Post-7.48 middle column progress area (when `creditLimitCents` set):
```
[utilization bar — 96%, red]
Credit limit $5,000 · 96% used
```

Post-7.48 middle column progress area (when no credit limit, e.g., loans):
```
[progress bar — 38% paid]
$2,626.00 of $6,841.00 paid down
```

The progress bar stays for non-credit-card debts (the "paid down" story). For credit-card debts, the bar switches to utilization (the "credit usage" story). Same visual shape, different semantic.

Utilization bar color thresholds (matches credit-score convention):
- `< 30%` → `var(--ok)` (green — good)
- `30–80%` → `var(--warn)` (amber — caution)
- `≥ 80%` → `var(--neg)` (red — high utilization hurts credit score)

APR pill text size bump: 11.5pt → 13pt (more legible).

## Expand-panel changes

The "Payoff trajectory" section (currently a flat sparkline) is replaced with one of two visuals:

**When `creditLimitCents` is set** — a full-width utilization visualization:
- 3-zone gauge (green 0–30% / amber 30–80% / red 80%+) with a marker at the current utilization position
- Labels: "Credit limit $X" / "Balance $Y" / "Z% used"
- Tier-colored marker dot at the current position
- No flat line. The gauge IS the visual.

**When no credit limit** — the section is removed entirely (the cell value `~110mo at min` in the existing `Months to payoff at min` cell already tells mom the projection; the flat sparkline adds nothing).

This restores the "the numbers tell you everything you need" principle: if there's no credit limit, there's no utilization story to tell, so don't show a hollow visual. If there IS a credit limit, the utilization gauge replaces the sparkline as the meaningful visual.

## Files

### Modified

- **`src/lib/store.ts`** — add `creditLimitCents?: number` to `Debt` interface.
- **`src/lib/mock-seed.ts`** — add `creditLimitCents?: number` to `DebtSeed` interface + populate for the 3 seeded debts.
- **`src/components/debts/DebtCard.tsx`**:
  - Bump small-number legibility: APR pill 11.5pt → 13pt; MIN line 9.5pt → 11.5pt + var(--ink-2); YR INTEREST 10pt → 12pt; MO secondary 8.5pt → 10pt + var(--ink-2).
  - When `creditLimitCents` set: replace paid-down progress bar with utilization bar.
  - When null: keep paid-down progress bar.
- **`src/components/debts/DebtDetailExpand.tsx`**:
  - When `creditLimitCents` set: replace `<DebtSparkline>` payoff trajectory section with utilization gauge visualization.
  - When null: remove the payoff trajectory section entirely (the `~110mo at min` label in the section is redundant with the `Months to payoff at min` cell).
- **`00-CLUSTER-7.48-DEBTS-UTILIZATION-LEGIBILITY.md`** — this spec.
- **`tests/smoke-debts-utilization.mjs`** — new smoke (~12 checks: schema field exists, seed values set, card legibility bumps applied, utilization bar renders when credit limit set, progress bar still renders when not, expand panel uses utilization visualization when credit limit set, expand panel removes payoff trajectory when no credit limit).

### Unchanged

- `src/lib/debt-tier.ts` — already provides tier color; we use `var(--ok)` / `var(--warn)` / `var(--neg)` directly for utilization thresholds (no new tier helper needed).
- `src/lib/debt-interest.ts` — 7.47's wasted-in-interest math; this cluster reuses the data but doesn't change the helpers.
- `src/components/debts/DebtListInteractive.tsx` — page-level banner from 7.47; unchanged.
- `src/app/(app)/debts/page.tsx` — unchanged.

## Verification

- `pnpm tsc --noEmit` clean.
- `node tests/smoke-debts-utilization.mjs` — 12+ checks.
- Manual: open `/debts` on preview; verify Discover It shows utilization gauge; verify CareCredit also shows utilization gauge; verify legibility bumps read at arm's length.

## Risks

- **Hardcoded credit limits in seed**: real moms will have different limits. Future cluster (when DB-backed debts land) needs a form field to set/edit the credit limit. For now, the seed values are the only source.
- **Utilization thresholds are credit-score conventions** (`<30% good / 30-80% caution / ≥80% bad`). These are stable across the industry but mom might not know what "30% utilization" means. The cell copy ("Credit limit $5,000 · 96% used") reads naturally without requiring threshold knowledge; the color communicates severity at a glance. If mom asks what the colors mean, future cluster could add a tooltip.
- **Removing the payoff trajectory section for non-credit-card debts**: the flat sparkline was uninformative; removing it cleans up the panel. The `Months to payoff at min` cell value (`~110mo at min`) already communicates the projection duration. If mom wants a real projection curve (balance over time), that's a future cluster — the existing `payoffProjection` can render it, but the previous flat-line rendering proved the visual wasn't carrying its weight.
- **Schema change without migration**: this is in-memory only. No production impact because the debts view doesn't yet read from Prisma IdentityDebt. When DB-backed debts ship, the same field gets added to the Prisma model.

## Out of scope

- DB-backed debts (separate cluster)
- New-debt form to set the credit limit when creating a debt
- Amortized curve for the payoff trajectory (would replace the flat sparkline with a real declining curve — future cluster)
- Tooltip explaining utilization thresholds
- Credit-score impact panel ("How much would your score improve if you paid this down to <30%?") — future cluster