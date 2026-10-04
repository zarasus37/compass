# Cluster 7.45 — Debts interactive list (snowball hybrid redesign)

**Status**: spec, ready to ship.
**Predecessor**: Cluster 7.44 (envelopes list defensive reads). Cluster 1.9 (snowball + DebtPayoffSimulator initial ship).
**Author constraint**: xKryptic 2026-09-27 — show mom a hybrid of two templates: (1) the current snowball overview (overall debt + 3-up projection + slider + apply button + per-debt sparkline + payoff timeline) and (2) a Borrowell-style per-debt card list (each debt as a stacked card with circular progress + balance + min + APR + utilization gauge). Currently `/debts` shows an aggregated summary + a single simulator across all debts. xKryptic wants:
- All debts displayed as cards (template 2's per-debt stacked layout, terminal-flavored)
- Click a card → inline-expand to show that debt's breakdown (template 1's per-debt stats + sparkline + slider + apply)
- Method toggle is per-debt (snowball/avalanche only matters across debts; the per-debt view doesn't need it)

xKryptic picked option A (inline expand) + option A (per-debt method toggle) from the design questionnaire.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

The snowball view is the only place mom can see per-debt progress, payoff timeline, and apply extra payments to specific debts. Pre-7.45, the page shows ONE aggregate simulator across all debts — fine for "I have $175 free, where should it go?" but useless for "how is Best Buy's payoff shaping up?" Per-debt breakdown surfaces the math per debt so mom can prioritize. Visible UI: each debt becomes a tappable surface; clicking reveals the focused analysis.

## §1 current shape

`/debts` page (server component) renders:
1. `<PageHead>` with explanation
2. "Your debts" section — `<DebtCard>`-like rows (name, balance, min pay, progress bar, sparkline). One row per debt. NOT tappable.
3. `<DebtPayoffSimulator>` — client component. Aggregated simulator: snowball/avalanche toggle, "What if?" slider, 3-up projection (Current / With extra / You save), headline answer + apply button, PaidOffCelebration modal, unpayable warning.

The current simulator is one-shot for ALL debts. The per-debt math is buried inside the simulator's projection (`.perDebt` array) but never surfaced in the UI.

## §2 design

### Card layout (collapsed — default view)

Per-debt card, terminal-flavored. Replaces the current "Your debts" rows.

```
┌─ saturn left rail ─────────────────────────────────────────────────────┐
│  ⬤  Best Buy                          [OK] PAID OFF? or APR · Due Day  │
│      Paid-off donut (or progress donut for non-zero balance)         │
│      $945.30 (large)                                                   │
│      // MIN $55.00    // APR 33.00%                                   │
│                                                                       │
│      [progress bar — paid down vs original]                            │
│      "Tap to expand ↓" indicator                                      │
└───────────────────────────────────────────────────────────────────────┘
```

- Saturn left rail (2px, glow)
- Donut chart on the left (circular progress): "paid down %" for non-zero balance, "PAID OFF" badge for zero balance
- Right side: debt name (Sora 20), balance (mono 24, large), APR + due day (mono 11)
- Below: progress bar (paid down vs original)
- "Tap to expand ↓" terminal-cyan hint

### Expanded panel (click a card → opens below)

Replaces the current standalone `<DebtPayoffSimulator>` for the active debt. Other cards stay visible above.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Best Buy                                       $945.30 of $1,200.00 │
│                                                                       │
│  Stats grid (4 cells):                                                │
│  ┌─────────┬─────────┬─────────┬─────────┐                             │
│  │ Balance │ APR     │ Min Pay │ Monthly │                             │
│  │ $945.30 │ 33.00%  │ $55.00  │ Int $26 │                             │
│  └─────────┴─────────┴─────────┴─────────┘                             │
│                                                                       │
│  Timeline:                                                            │
│  Payoff sparkline + "~9mo at min" or "[WARN] Min < interest"           │
│                                                                       │
│  What if?                                                             │
│  $0 ─────●───────────── $500                                          │
│  Add $50/paycheck                                                     │
│  → Pays off in 6mo. You save 3mo + $X.                                │
│  [ Apply extra → ]                                                     │
│                                                                       │
│  // Edit  // Delete  // Collapse ↑                                    │
└──────────────────────────────────────────────────────────────────────┘
```

- Saturn left rail
- Header: debt name + balance + paid down vs original
- Stats grid: Balance, APR, Min Pay, Monthly Interest (computed)
- Payoff sparkline (existing `<DebtSparkline>`)
- "What if?" slider (existing pattern, refactored for per-debt)
- Apply extra button (existing `applyExtraToDebt` action, refactored to per-debt)
- Edit/Delete/Collapse actions

### §2.1 — method toggle decision

**Hidden in per-debt view.** Per-debt payoff math doesn't care about order across debts (this debt's interest accrues at its APR regardless of whether other debts are paid first). The snowball/avalanche toggle was about cross-debt prioritization — that's a different concern that doesn't belong on the per-debt card. Aggregate cross-debt strategy is still available via the existing overall-projection, but if the user's per-debt view doesn't need it, we can omit it from this iteration (the unpayable warning + apply button per debt are still useful).

## §3 implementation

### B1 — `DebtCard.tsx` (new, server component OK)

Pure display. Takes `debt: Debt` + `onClick?: () => void` (or as a child via render prop). Renders the collapsed card. No client state. Tappable container delegates to parent.

### B2 — `DebtDetailExpand.tsx` (new, client component)

Renders the expanded panel for a single debt. Owns the "What if?" slider state (useState for `extraDollars`) + the apply button (calls existing `applyExtraToDebt` action). Reuses the existing 3-up ProjectionCard aesthetic but only for THIS debt.

Internally uses the existing `payoffProjection([debt], "snowball", extraCents, anchor)` — passing a single-element array yields the math for that debt alone. The "Current" card = baseline (extra=0). The "With extra" card = projection. The "You save" card = delta.

### B3 — `DebtListInteractive.tsx` (new, client component)

Owns the expansion state (`useState<string | null>`). Takes `debts: Debt[]` as prop. Renders a list of `<DebtCard>`s. When a card is clicked, sets the expanded id. Renders the `<DebtDetailExpand>` below the matching card. Click again (or "Collapse ↑") clears the state.

This is the only client component that needs `'use client'` at the top — the inner `<DebtCard>` can stay server-rendered by passing click handlers via a render prop.

### B4 — Refactor `<DebtPayoffSimulator>` for per-debt use

Extract the slider + apply + projection display into a smaller reusable component (or inline it into `DebtDetailExpand`). Keep the original `<DebtPayoffSimulator>` for backward compat with other callers (search for usages — likely only `/debts`).

### B5 — Update `/debts/page.tsx`

Replace the current "Your debts" + standalone simulator with `<DebtListInteractive debts={DEBTS} />`. Keep the existing `<PageHead>` + explanation + "+ Add debt" CTA.

### B6 — New smoke `tests/smoke-debts-interactive.mjs`

Source-file checks verify:
- `DebtCard` component exists
- `DebtDetailExpand` component exists
- `DebtListInteractive` is a client component (has `'use client'`)
- `/debts/page.tsx` imports + renders `<DebtListInteractive>`
- `/debts/page.tsx` no longer imports `<DebtPayoffSimulator>` directly (refactored)
- Per-debt method toggle is NOT rendered (matches design choice)
- Circular progress / donut chart present in `DebtCard`

Server-needing check (SKIP-NO-SERVER gate per Cluster 7.38): GET `/debts` as mom, assert the cards render + no `[ERR]` card + no method toggle (snowball/avalanche) visible at page level.

### B7 — Spec + docs

`00-CLUSTER-7.45-DEBTS-INTERACTIVE-LIST.md` (this spec). HANDOVER commit-chain header + new "Recent change" section. COORDINATION last update.

## Files

| File | Change |
|---|---|
| `src/components/debts/DebtCard.tsx` (new) | Pure display card — collapsed view |
| `src/components/debts/DebtDetailExpand.tsx` (new) | Client component — expanded panel with per-debt simulator |
| `src/components/debts/DebtListInteractive.tsx` (new) | Client wrapper — manages expansion state |
| `src/components/debts/DebtPayoffSimulator.tsx` (refactor or split) | Extract slider/apply into reusable piece |
| `src/app/(app)/debts/page.tsx` | Replace list + simulator with `<DebtListInteractive>` |
| `tests/smoke-debts-interactive.mjs` (new) | Source + server-needing checks |
| `package.json` | New smoke added to chain |
| `00-CLUSTER-7.45-DEBTS-INTERACTIVE-LIST.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:debts-interactive` passes
- Existing smokes (`smoke-debts`, etc.) still green — orthogonal
- Manual: clicking a debt card on `/debts` expands the panel with that debt's breakdown + per-debt simulator; clicking again collapses; switching to a different debt collapses the previous and expands the new

## Risks

- **Refactor scope creep.** The existing `<DebtPayoffSimulator>` is a large client component. Refactoring it for per-debt use could break other callers (if any). Cluster 7.45 will do a quick grep before refactoring; if no other callers, the original can be deleted.
- **Donut chart implementation.** We don't have a reusable donut/arc component yet. Cluster 7.45 will inline an SVG-based arc in `DebtCard`. Could refactor to a shared `<Donut>` later if other cards need it.
- **Method toggle removal breaks cross-debt UX.** A user who previously used the snowball/avalanche toggle to see "if I pay $X extra to the smallest-balance debt, what happens?" might be confused when that's gone. Mitigation: keep the apply button on the per-debt panel (no method toggle needed; the user picks the debt directly).
- **Circular progress math.** For a paid-off debt (balanceCents === 0), the donut shows [OK] badge, not a progress arc. For non-zero balance, the arc = (originalBalance - balance) / original. Edge case: balance > original (overpaid) — show 100% + [WARN].