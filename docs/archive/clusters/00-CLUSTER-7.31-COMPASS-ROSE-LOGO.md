# Cluster 7.31 — Compass Rose logo

**Status (2026-09-23): SHIPPED + awaiting user verification on actual phone.** Commit pending.

## What shipped

Replaced Compass's placeholder PNG icons + the placeholder `[C]` sidebar glyph with a real branded visual: an ornate compass rose (gold/bronze metalwork with runic ring + center gem + teal ambient glow) sourced from Google Flow, scaled across 4 PWA sizes, and abstracted into an inline SVG for the sidebar.

### Files touched

| File | Change |
|---|---|
| `public/icon-192.png` (412 KB → 90 KB) | Original PNG: placeholder. New: rose at 192×192, full bleed |
| `public/icon-512.png` (392 KB → 591 KB) | 512×512, full bleed |
| `public/icon-maskable-512.png` (343 KB → 855 KB) | 512×512, composited on `#060A12` (theme color). Loop + bottom diamond fit inside Android adaptive safe area |
| `public/apple-touch-icon.png` (372 KB → 80 KB) | 180×180, iOS auto-rounds corners |
| `src/components/sidebar/AppSidebar.tsx` | `BrandMark` was a 28px `[C]` JetBrains Mono glyph. Now an inline SVG of a stylized compass rose (8-point star outline + center gem + suspension loop), `currentColor` so it picks up `--vessel-accent` |
| `tests/smoke-live-ticker.mjs` | One regex updated to read either `nav.ts` or `AppSidebar.tsx` for the Ledger/Ticker slot wiring (Cluster 7.30a's NAV extraction broke the original check) |

### Test/visual references

- `docs/logo-references/source-1024.png` — original 1024×1024 source
- `docs/logo-references/icon-512.png` and `icon-192.png` — PWA sizes
- `docs/logo-references/icon-maskable-512-preview.png` — what Android will see (composited on theme color)
- `docs/logo-references/apple-touch-icon.png` — iOS Add-to-Home variant

## Source + resize pipeline

1. Source dropped to `/workspace/attachments/1154b9109213fd49/image.png` (1024×1024 PNG, lossless)
2. Copied to `/workspace/compass-logo-source.png`
3. `convert` (ImageMagick) resized to each size + composited the maskable on `#060A12`
4. Strategy for maskable: 410×410 source dropped on a 512×512 dark canvas with `gravity center` so the top loop + bottom diamond stay inside Android's ~80% safe zone. Loop survives a rounded-square crop; the inner gem + center star are well-clear

## Verification

- `pnpm tsc`: clean
- `pnpm smoke-mobile-shell`: 54 / 0 (unchanged from 7.30a — icon change doesn't affect shell)
- `pnpm smoke-deploy`: 145 / 0 (manifest still has 3 icons, all served as 200)
- `pnpm smoke-live-ticker`: 64 / 64 (regex updated for nav.ts extraction; otherwise no functional change)
- Combined chain test (smoke + smoke:ui + smoke:integration + smoke:deploy): transient timeout on /insights mobile render (Playwright `networkidle` exceeded 20s on the chart-heavy insights page). Resolves on retry — confirmed green when isolated.

## Open items

- **Phone verification from the user is still pending.** Mom's PWA install icon won't refresh until she re-installs (iOS caches the home-screen icon until the manifest SW updates or the user re-adds the icon). I should mention that to her; otherwise she'll see the old icon and conclude "nothing changed."

## What I did NOT touch

- The `Compass` wordmark in TopAppBar (kept the JetBrains Mono "Compass" + pulsing accent dot). The rose is the **system brand** (installable icon); the wordmark is **chrome** (in-app). Different concerns, different surfaces.
- The decorative `CompassRose.tsx` + `Mandala.tsx` SVG components in `src/components/alchemy/`. Those are standalone pieces used inside alchemy cards / onboarding. Their full ornate detail lives there as SVG vectors. The PNG icons are a separate, simpler abstraction.
