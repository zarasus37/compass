# Cluster 7.50 — Debts: Mobile Polish

**Status**: planned (this session)
**Date**: 2026-09-28
**Predecessor**: Cluster 7.49 (`203b7aa` + `97a0829` — rainbow utilization + real trajectory)

## Why

xKryptic 2026-09-28 picks up two pending items in order:
**(8)** Mobile polish on `/debts` — the 3-column card layout (donut / name+meta+bar / balance+min+interest) was tuned on desktop. At 320–480px the right column gets squeezed, the small mono numbers (MIN, monthly interest) become unreadable, the rainbow utilization gauge wraps awkwardly, and the PayoffCurve SVG might overflow. Also the expand-panel 4-column `StatCell` grid collapses.

**(5)** Cross-debt "where to put extra" view on `/debts` — currently only on the dashboard's Pay My Next Check card. Bring the cross-debt math (snowball vs avalanche, total interest saved, the order debts get paid off) to `/debts` so mom can see it on the same page where she manages the individual cards.

This cluster = (8). Cluster 7.51 = (5).

## Scope of 7.50

Three layout breakpoints to fix:

1. **Card surface at `<768px`** — collapse the 3-column grid to a single stacked column. Donut moves to the top (smaller, 72px), name + meta + balance/min/interest stack vertically, utilization gauge stays full-width.
2. **Expand panel 4-column `StatCell` grid** — collapse to 2 columns at `<768px`, single column at `<480px`.
3. **PayoffCurve SVG width** — currently fixed at 360px. At `<480px` viewports, the 360px chart would overflow the panel padding. Make it responsive: `width: 100%; max-width: 360px`.

Approach: a small `useMediaQuery` hook (or inline window-size detection in `DebtListInteractive`) that tracks `window.innerWidth` and passes an `isMobile` flag down to `DebtCard` + `DebtDetailExpand`. The hook only triggers re-render at the breakpoint (uses a single threshold rather than listening for every resize).

## Files

### New

- **`src/lib/use-media-query.ts`** — a tiny hook that returns `true` when `window.innerWidth < breakpoint`. SSR-safe (returns `false` on server, then flips on mount + resize listener). Used by `DebtListInteractive` to detect narrow viewports.

### Modified

- **`src/components/debts/DebtListInteractive.tsx`** — uses `useMediaQuery("(max-width: 768px)")`. Renders `<DebtCard isMobile={isMobile} ... />`. Also: the page-level `[WARN]` banner from 7.47 wraps the marker + body cleanly at narrow widths.
- **`src/components/debts/DebtCard.tsx`** — accepts an optional `isMobile?: boolean` prop. When true, the outer grid switches from `120px minmax(0, 1.2fr) 140px` to a single-column stacked layout:
  - Row 1: donut (72px, smaller than the desktop 96px) + name (full width)
  - Row 2: APR pill + due day (full width)
  - Row 3: balance + min + interest hint (full width, centered or left-aligned)
  - Row 4: utilization gauge (full width) — already full-width in the desktop layout
  - The progress bar / utilization bar caption stays below.
- **`src/components/debts/DebtDetailExpand.tsx`** — accepts an optional `isMobile?: boolean` prop. When true:
  - Header summary (`$3,985 of $6,841 remaining`) wraps below the title instead of right-aligned.
  - 12-cell `StatCell` grid: 4 columns at desktop → 2 columns at `<768px` → 1 column at `<480px`.
  - `<UtilizationPanel>` and `<PayoffCurve>` SVGs use `width: 100%; max-width: 360px` (the curve fits the parent without overflow).
  - "What if?" slider text wraps cleanly at narrow widths.

### Unchanged

- `src/lib/debt-tier.ts` — no changes.
- `src/lib/debt-interest.ts` — no changes.
- `src/lib/store.ts` + `src/lib/mock-seed.ts` — no schema change.
- `src/app/(app)/debts/page.tsx` — no change (responsive layout lives in the components).

## Verification

- `pnpm tsc --noEmit` clean.
- `node tests/smoke-debts-mobile.mjs` — new smoke (~10 checks: useMediaQuery hook exists + is SSR-safe; DebtCard accepts isMobile prop; DebtCard layout uses single-column grid when isMobile true; DebtDetailExpand 12-cell grid collapses to 2/1 cols based on isMobile; PayoffCurve SVG width is responsive).
- Manual: open `/debts` in a 320px-wide viewport; verify the card stacks vertically; expand a card; verify the stats grid reads cleanly.

## Risks

- **Resize reflow**: switching layout based on `window.innerWidth` causes a reflow on viewport changes. For Compass's mom-driven usage (desktop at arm's length, occasional mobile check-in) this is fine. Avoid resizing during drag operations.
- **Touch targets**: at narrow widths, the tap target for `▾ EXPAND` / `▴ COLLAPSE` is a thin line in the right column. Need to make sure the entire card body is the click target (already is via `role="button"`), not just the chevron.
- **Server-rendered HTML for mobile**: the hook returns `false` on first server render (SSR-safe default). When the client hydrates at a narrow viewport, there's a brief flash of desktop layout → mobile layout. Acceptable; the alternative (CSS-only media queries) would require moving layout to CSS, which conflicts with the inline-styles pattern. If the flash becomes annoying, future cluster can switch to CSS for the breakpoint-dependent values.

## Out of scope

- Tablet (768-1024px) — only phone + desktop considered.
- Landscape phone — same as portrait phone for now.
- Bottom-sheet expand panel on mobile (full-screen takeover) — useful but separate cluster.
- Animated expand/collapse transition on the panel — separate motion path.