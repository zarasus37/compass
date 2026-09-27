# Cluster 7.43 — Envelope detail per-section error boundaries

**Status**: spec, ready to ship.
**Predecessor**: Cluster 7.42 (envelope-detail null-planet defensive render). Cluster 7.39 (route-level error boundary — caught the crash mom saw).
**Author constraint**: xKryptic 2026-09-26 — even after the 7.42 null-planet fix, mom reported the same `[ERR] SOMETHING BROKE` card with digest `3789288087` on `/envelopes/[id]`. xKryptic chose option A from the 7.42 follow-on menu: **add per-section error boundaries** so one bad section can no longer take down the whole page. The user picked this over "wait to find the exact throw" because: (i) we can't inspect the Vercel production log (CLI's project-scope resolution fails for personal token vs `sovereign-monad-ecosystem` team project); (ii) the boundary keeps the page usable while we keep iterating on the underlying bug.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

A click on an envelope should land on its detail page. The page is the only place mom can see the cadence chart, recent transactions, sinking funds, and the "balance envelope" CTA. If Stats throws, Vessel / Cadence / Sinks / Activity should still render. If Activity throws on a single malformed row, the rest of the page should still render. The 7.43 per-section boundaries make that guarantee at the page level, on top of the 7.39 route-level boundary that already guarantees it across the whole `(app)` segment.

## Root cause

The detail page composes 5 sections (Stats, Vessel, Cadence, Sinking funds, Activity) into a single React tree. A throw in any one section (e.g., a malformed transaction row, a render in `EnvelopeCadenceChart` that hits an unexpected state) propagates to the route-level `(app)/error.tsx` and replaces the whole page with the calm-error card.

The exact throw with digest `3789288087` couldn't be inspected. Cluster 7.42 removed the most-likely null-planet throw but didn't cover all possible throws. Rather than guess which one we missed, 7.43 makes the page **resilient to all throws**: each section is wrapped in a `try/catch` and falls back to a calm per-section error card. The page is always usable even if we never find the exact throw.

## Scope

### B1 — `safeSection(section, render)` helper

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

A small async helper that wraps a section's render function. Any thrown error is caught, logged to `stderr` (dev only — `process.env.NODE_ENV !== "production"` guard), and converted to a `<SectionErrorFallback section={...} />`. Returns the React node (or fallback) so the page composition stays linear.

```tsx
async function safeSection(
  section: string,
  render: () => React.ReactNode | Promise<React.ReactNode>,
): Promise<React.ReactNode> {
  try {
    return await render();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[envelope-detail] ${section} section failed:`, err);
    }
    return <SectionErrorFallback section={section} />;
  }
}
```

### B2 — `<SectionErrorFallback section="..." />` component

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

A small component that renders a dimmed card with the section name + a "couldn't load this section" message. Calm-error copy: "Something in [Section] didn't load. The rest of the page should still work — try refreshing, or ping support if it keeps happening." No raw `error.message`, no digest. Matches the calm-error vocabulary established in `(app)/error.tsx` and `tests/smoke-onboarding-chat-escape.mjs`.

### B3 — Wrap all 5 sections

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

Replace direct JSX render with `await safeSection("Stats", () => ...)`, etc., for:

- `Stats` (the 4-card summary grid)
- `Vessel` (the vessel glyph + name + on-track indicator)
- `Cadence` (the 14-day burn chart)
- `Sinking funds` (the list of sinks)
- `Activity` (the per-row transaction list)

Footer actions bar (the "Back" / "Balance envelope" CTAs) stays unguarded — those are static Links and don't have data dependencies. If they throw, the route-level `(app)/error.tsx` is the right escalation.

### B4 — Per-row try/catch on Activity transactions

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

Even within the Activity section, a single malformed transaction row could take down the whole list. Wrap each row's render in try/catch so a bad row renders an inline error chip rather than crashing the list.

### B5 — Lazy `SINKS` read wrapped in try/catch

**File**: `src/app/(app)/envelopes/[id]/page.tsx`

`ensureUserSinksSeeded(user.id)` + `prisma.envelopeSink.findMany(...)` were at page-level (one-shot). If the seed call or the read throws (e.g., transient DB issue), wrap in try/catch and continue with an empty `SINKS = []`. The Sinking funds section will show an empty state; the rest of the page stays intact.

### B6 — Add a regression smoke

**File**: `tests/smoke-envelope-detail-section-errors.mjs` (new)

Source-file checks:
- `safeSection` helper exists in the page file
- 5 `safeSection(...)` invocations present (Stats, Vessel, Cadence, Sinking funds, Activity)
- `SectionErrorFallback` component exists
- `SINKS` lazy read is wrapped in try/catch
- Per-row try/catch present in Activity

Server-needing checks (SKIP-NO-SERVER gate per Cluster 7.38):
- Sentinel envelope exists; GET `/envelopes/[id]` renders without `[ERR]` even if a section throws (we can't easily simulate a throw from outside, so this check is structural — confirm the page still renders the envelope header + name).

## Files

| File | Change |
|---|---|
| `src/app/(app)/envelopes/[id]/page.tsx` | Add `safeSection`, `SectionErrorFallback`; wrap 5 sections; per-row try/catch in Activity; `SINKS` lazy try/catch |
| `tests/smoke-envelope-detail-section-errors.mjs` (new) | Source-file checks + optional server-needing check |
| `package.json` | New smoke added to chain |
| `00-CLUSTER-7.43-ENVELOPE-DETAIL-SECTION-ERRORS.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean (no output)
- `pnpm smoke:envelope-detail-section-errors` passes (source-file checks green; server-needing SKIP-NO-SERVER acceptable)
- Existing smokes in chain still green (orthogonal — each smoke validates a distinct boundary)
- Manual: mom can reach the detail page; if any one section throws, only that section shows the calm fallback; the rest of the page renders

## Risks

- The underlying throw (digest `3789288087`) is still in the code somewhere. 7.43 **masks** it rather than **fixes** it. If mom continues to see errors, we'll need either (a) the envelope ID she clicked when it broke, or (b) a client-side error capture endpoint to receive the digest + stack + envelope ID. Both are deferred follow-ons — the user's choice on 7.43 was explicitly to ship the defensive layer first.
- Logging in production is intentionally silent (`process.env.NODE_ENV !== "production"` guard on `console.error`). The throw is swallowed at the UI layer; Vercel's own error reporter still gets the original throw. We can switch on prod logging later if we need a quicker diagnostic path.
- The "Footer actions bar kept unguarded" choice assumes CTAs don't have data dependencies. If we add a "Balance envelope" that fetches data, we'll need to wrap it too.