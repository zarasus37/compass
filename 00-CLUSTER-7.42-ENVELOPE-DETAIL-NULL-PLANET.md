# Cluster 7.42 — Envelope detail null-planet defensive render

**Status**: spec, ready to ship.
**Predecessor**: Cluster 7.40 (envelope read migration). Cluster 7.39 (route-level error boundary — caught this crash, surfaced the digest).
**Author constraint**: xKryptic 2026-09-26 — screenshot of `/envelopes/[id]` showing the `[ERR] SOMETHING BROKE` card after clicking on an envelope (Groceries, over its limit by $212.00). Reference digest `3789288087`. The route-level error boundary in `(app)/error.tsx` caught the crash cleanly; this cluster fixes the root cause.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

A click on an envelope should land on its detail page. The page is the only place mom can see the cadence chart, recent transactions, sinking funds, and the "balance envelope" CTA. Crashing there means the engine can't carry out the configuration that the detail page renders. Fixed.

## Root cause

The Prisma `Envelope.planet` column is nullable. Envelopes mom creates via `/envelopes/new` may not pick a planet. Several downstream components required `planet: PlanetId` (not nullable). When mom clicked an envelope with `planet = null`, the **EnvelopeCadenceChart** tried to look up `PLANET_COLORS[null]` — TypeScript's `noUncheckedIndexedAccess` made this `undefined`, which fell back to jupiter at the runtime render — but other code paths (`VesselGlyph` early-returned `null` and downstream consumers rendered without a `VesselGlyph`, leading to a layout-collapse that the page.tsx's overall render path couldn't recover from).

The exact runtime error (digest `3789288087`) couldn't be inspected without Vercel logs (the local CLI's project-scope resolution failed — personal token vs team project). The fix is defensive regardless of which path was actually throwing.

## Scope

### B1 — `EnvelopeCadenceChart` accepts nullable planet

**File**: `src/components/viz/EnvelopeCadenceChart.tsx`

Change `planet: PlanetId` → `planet: PlanetId | null`. Update the lookup at the render site to handle null safely (the existing `?? PLANET_COLORS.jupiter` was already defensive; just needed the type to allow null).

### B2 — Detail page normalizes nullable planet

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

Add `const safePlanet = (e.planet ?? "saturn") as PlanetId;` at the top of the page render. Use `safePlanet` everywhere the page would have used `e.planet` for a non-nullable prop. Falls back to "saturn" (long-cycle vessel, unknown lineage — the right vibe for "mom added this without picking a planet").

### B3 — Add a regression smoke

**File**: `tests/smoke-envelope-detail-null-planet.mjs` (new)

Writes a sentinel envelope with `planet: null`, GETs `/envelopes/[id]` as mom, asserts the page renders without the `[ERR] SOMETHING BROKE` card and includes the envelope name + balance. Source-file checks verify the type-safety changes. SKIP-NO-SERVER pattern for the HTTP-needing checks.

## Files

| File | Change |
|---|---|
| `src/components/viz/EnvelopeCadenceChart.tsx` | `planet: PlanetId` → `planet: PlanetId \| null`; safe lookup |
| `src/app/(app)/envelopes/[id]/page.tsx` | Normalize via `safePlanet = (e.planet ?? "saturn") as PlanetId` |
| `tests/smoke-envelope-detail-null-planet.mjs` (new) | Sentinel envelope with planet=null; asserts page renders |
| `package.json` | New smoke added to chain |
| `00-CLUSTER-7.42-ENVELOPE-DETAIL-NULL-PLANET.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:onboarding-chat-escape` + `pnpm smoke:setup-wizard` + `pnpm smoke:ui-dashboard-db` + `pnpm smoke:ui-envelope-reads` still green (orthogonal)
- New `tests/smoke-envelope-detail-null-planet.mjs`: 6 checks (4 source-file + 2 server-needing). SKIP-NO-SERVER gate per Cluster 7.38 pattern. Server-needing checks write a sentinel envelope with `planet: null`, GET the detail page as mom, assert no `[ERR]` + envelope name + balance rendered.

## Risks

- The exact digest (`3789288087`) maps to a specific error that Vercel logs would show. We can't reproduce it locally (Windows + Turbopack issue documented in agent memory). The fix is defensive against multiple throw points; if mom hits a DIFFERENT crash, we'll iterate.
- "saturn" as fallback planet is a judgment call. Saturn's hex is `#a8b0c8` (light blue-gray). If the user later asks for a different default, swap the literal in `envelopes/[id]/page.tsx`.