# Cluster 7.30 — Mobile polish

**Status (2026-09-23): SPEC ONLY. Found via real phone install. Awaiting operator signoff before executing.**

## What mom saw

User reports from after the live mom-deploy:
> "The rendering on the phone needs a lot of work as far as the UI. It's all bunched up, it doesn't look clean."

I confirmed this with actual mobile-viewport renders via Playwright. iPhone-14 (393×852) screenshots show:
- The **desktop sidebar takes ~30% of the 393px width** (it's never collapsed)
- The **main content area has 80px horizontal padding** + ~120px of sidebar = only ~85px effective content area
- Cards in the dashboard grid become single-column correctly (the `dashboard-grid` CSS handles this), but **chart/data cards inside the dashboard render their internal content horizontally** — cash-flow chart card has 3 lines of title text instead of one
- The **Allocation Feed donut card** stacks badly — names like "Insurance", "Groceries" sit in tiny cramped pills
- The **BottomNav** is rendered but the layout above it makes the dock sit below several screens of cramming, not in a true fixed-below-fold way
- **Sidebar links "OVERVIEW / LEDGER / AIMS / LEARN" are tiny mono caps on mobile** at 9-10px in a 230px column that's too narrow

## Why now

- Mom is live in prod. Anything we ship now is the actual app she's using. The earlier work all prioritized **desktop correctness** (D7-single-user, mom-launch). Mobile was secondary by design. That math broke when mom landed on the home-screen icon and saw the desktop view crammed into 393px.
- This is a pure-frontend cluster: **no schema change, no API route, no deploy dependency.** It can ship and verify inside a single iteration.

## What ships

### 1. Sidebar: collapse to overlay on mobile (< 880px)
The 232px sidebar is the biggest "anti-mobile" element. Replace with a hamburger button on the TopAppBar (left side, before the brand) that toggles an overlay sheet containing all sidebar links. On desktop, behavior unchanged.

### 2. Main padding: 80px → 16px on mobile
Replace `padding: "40px 80px 112px"` with `padding: 40px 24px 112px` at > 880px and `padding: 16px 16px 96px` at ≤ 880px. The 16px base gives cards room to breathe on mobile without cramping desktop.

### 3. Layout grid: `auto 1fr` → single column on mobile
The outer `<div style={{ gridTemplateColumns: "auto 1fr" }}>` keeps the sidebar's reserved space. On mobile, it becomes `1fr` (sidebar is overlay, not in grid).

### 4. BottomNav: ensure 24px+ touch targets
The four dock icons are 24px circles today, with 0-1px gaps on mobile. Expand to 48px tall with proper spacing.

### 5. Critical page-level layouts (mobile-friendly collapse):
- **Accounts** (`/accounts`): the row `gridTemplateColumns: "60px 1fr 200px 140px 140px"` has 5 fixed columns — too wide. Stack to a vertical "card per row" on mobile.
- **Calendar** (`/calendar`): `repeat(7, 1fr)` 7-col grid — already tight at 393px. Reduce day-cell text to abbreviated (`Mo Tu We Th Fr Sa Su` as cell labels, numbers only).
- **Period** (`/period`): the period card grid is complex, mostly fine but needs verification.
- **Insights** (`/insights`): ranked spend rows — already single-column but titles `Top expenses, last 30 days` should not wrap mid-word.
- **Settings** (`/settings`): settings-row-link cards stack fine. Verify nav works in mobile bottom dock.
- **Transactions** (`/transactions`): table cards should reflow.

### 6. Smoke (`tests/smoke-mobile-rendering.mjs`)
Use Playwright (already installed) to:
- Render `/login`, `/`, `/envelopes`, `/accounts`, `/settings`, `/calendar`, `/insights` at iPhone-14 (393×852)
- Assert no element overflows horizontally (no `scrollWidth > clientWidth` on body)
- Assert primary content area is ≥ 280px wide (NOT 80px)
- Assert sidebar is hidden or in overlay state (not inline as a 232px column)
- Save golden screenshots to `tests/screenshots/mobile/` for visual diff

## Out of scope (deferred)

- Native app (TWA / RN). PWA is the choice per Step 7.5 runbook.
- Push notifications (Cluster 7.30.1+ if needed).
- All-page audit. We focus on the high-traffic routes mom uses daily (`/`, `/envelopes`, `/accounts`, `/transactions`, `/settings`, `/insights`, `/period`, `/calendar`).
- Redesign of the AppSidebar's left-rail design. We just collapse/overlay it on mobile.

## Honest tradeoffs

- The overlay-sidebar pattern means mom can't see nav while she's on a page — she has to open the sheet. That's standard mobile UX (Gmail, Notion, Slack all do this) but worth noting. The bottom dock remains for the 4 main destinations.
- We're moving the chunk-of-information-density from desktop (where it was readable) to mobile (where it's now bloated vertically). I'll measure scroll length before + after and report.
- Rebuilding for iPad-sized viewports (768-1024px) is in-scope for "tablet" (the same responsive rules apply), but I won't redesign the iPad experience specifically.

## Verification

- `pnpm tsc`: clean
- `pnpm smoke` (existing 25 stages, including new `smoke-mobile-rendering` at iPhone-14 viewport): target +6 checks
- `smoke:ui` (13 stages): unchanged
- `smoke:deploy`: 145/0 unchanged
- **Total: ~1973/0 across 41 stages** if we land as planned.

## Files expected to change

Modified:
- `src/app/(app)/layout.tsx` (media-query-aware padding + grid)
- `src/components/sidebar/AppSidebar.tsx` (renders as overlay content on mobile, inline on desktop)
- `src/components/shell/TopAppBar.tsx` (adds hamburger button visible only at ≤ 880px)
- `src/components/shell/BottomNav.tsx` (touch-target spacing)
- `src/app/(app)/accounts/page.tsx` (vertical-stack grid on mobile)
- `src/app/(app)/calendar/page.tsx` (7-col day-grid survives but mobile-friendly)
- `src/app/globals.css` (`.dashboard-grid` already has mobile collapse; add `.account-row`, `.day-cell` rules)

Added:
- `src/components/shell/MobileSidebarSheet.tsx` (~120 LOC, an overlay drawer)
- `src/hooks/useMediaQuery.ts` (~30 LOC, single hook used by multiple components)
- `tests/smoke-mobile-rendering.mjs` (~150 LOC, Playwright-driven)

## What I need from you to proceed

This is a focused polish that ships in one cluster but touches ~8 files. I'd like a sign-off on the approach before I execute, because:

1. There's no way to "verify mom is happy" except user feedback — so the design choices (overlay sidebar? hamburger position? collapsed vs hidden?) need your call, not mine.
2. Some mobile patterns are taste-driven: should the hamburger be top-left (iOS convention) or in the bottom dock (Android convention)? Compass uses Oracle Terminal chrome, so our calls are slightly different.

**My recommendation (default to proceed)**:
- Top-left hamburger opens overlay sheet (standard iOS feel, also works on Android)
- Bottom dock for the 4 main destinations (Dashboard, Quick Entry, Insights, Settings) unchanged — this is the mom-everyday-nav
- Sidebar's "LEARN" chapter (Field Guide, Your Numbers, etc.) becomes a single "More" link in the overlay that opens the full sidebar
- Main padding goes to 16px on mobile; 24px on tablet; 80px on desktop (progressive tightening)
