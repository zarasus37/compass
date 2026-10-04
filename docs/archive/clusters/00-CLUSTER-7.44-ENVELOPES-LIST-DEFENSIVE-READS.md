# Cluster 7.44 — Envelopes list page defensive reads

**Status**: spec, ready to ship.
**Predecessor**: Cluster 7.43 (per-section error boundaries on `/envelopes/[id]`).
**Author constraint**: xKryptic 2026-09-27 — screenshot from mom on `compass-olive-mu.vercel.app/envelopes`. Clicking "Envelopes" in the left rail AppSidebar navigates to `/envelopes` (the LIST page), which surfaces the `[ERR] SOMETHING BROKE` card with the same digest `3789288087` that mom saw on `/envelopes/[id]` before Cluster 7.43 wrapped that page. The detail page is fixed; the list page was missed in 7.43. Same throw, different page.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

The Envelopes list page is the primary navigation hub for vessel-by-vessel inspection. Every other surface (AllocationFeed on the dashboard, /period detail, /allocation, /insights, /goals) navigates through `/envelopes` → `/envelopes/[id]`. Crashing on the list page makes the entire vessel layer unreachable from the left rail. The user still has the AllocationFeed on the dashboard as a workaround, but that's a degraded experience. The list page must render.

## Root cause

The `/envelopes` (list) page's top-of-page reads (`liveEnvelopesFromDb(user.id)` + `ensureUserSinksSeeded(user.id)` + `prisma.envelopeSink.findMany(...)`) were unguarded. Cluster 7.43 wrapped the equivalent reads on `/envelopes/[id]` with try/catch (SINKS specifically) but missed the list page. The same transient DB failure that 7.43 silently recovered from on the detail page blew up the list page entirely.

The exact underlying throw is still unconfirmed — same digest `3789288087` appears on both `/envelopes/[id]` (now wrapped) and `/envelopes` (still unwrapped). Whatever `ensureUserSinksSeeded` is doing on first-call seed is the suspected culprit; the seed runs once per user and may touch envelope rows that don't match the canonical seed map (`ENVELOPE_SINK_SEED` in `src/lib/seed-sinks.ts` is keyed by canonical name only). Investigating the exact seed failure requires Vercel production logs (CLI's project-scope resolution still fails for the personal token vs team project).

## Scope

### B1 — Wrap `liveEnvelopesFromDb` in try/catch

**File**: `src/app/(app)/envelopes/page.tsx`

The page-level read of `liveEnvelopesFromDb(user.id)` now lives inside a try/catch. On failure: log to `stderr` (dev only — `process.env.NODE_ENV !== "production"` guard), degrade to empty envelope list. The rest of the page (page head, summary strip with 0 envelopes, rebalance form with empty options) still renders.

### B2 — Wrap `ensureUserSinksSeeded` + SINKS read in try/catch

**File**: `src/app/(app)/envelopes/page.tsx`

Mirrors Cluster 7.43's pattern on `/envelopes/[id]`. The lazy-seed call + `prisma.envelopeSink.findMany(...)` both live inside a try/catch. On failure: log to `stderr` (dev only), degrade to empty SINKS. The inline sinks row under each envelope (Cluster 7.28) simply shows no sinks. The rest of the page stays intact.

### B3 — Add a regression smoke

**File**: `tests/smoke-envelopes-list-defensive-reads.mjs` (new)

Source-file checks verify:
- `liveEnvelopesFromDb` is wrapped in try/catch on the list page
- `ensureUserSinksSeeded` + SINKS read are wrapped in try/catch
- `ENVELOPES` fallback to `[]` on throw
- `SINKS` fallback to `[]` on throw
- `NODE_ENV` guard prevents prod console logging

Server-needing check (SKIP-NO-SERVER gate per Cluster 7.38 pattern): GET `/envelopes` as the smoke user, assert the page renders without `[ERR]` and the page head + summary strip are present. Uses the existing DB-connected smoke user (`mom@compass.local`).

## Files

| File | Change |
|---|---|
| `src/app/(app)/envelopes/page.tsx` | Wrap `liveEnvelopesFromDb` + `ensureUserSinksSeeded`/SINKS read in try/catch with `[]` fallback |
| `tests/smoke-envelopes-list-defensive-reads.mjs` (new) | Source-file checks + 1 server-needing check |
| `package.json` | New smoke added to chain |
| `00-CLUSTER-7.44-ENVELOPES-LIST-DEFENSIVE-READS.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean (no output)
- `pnpm smoke:envelopes-list-defensive-reads` passes (source-file checks green; server-needing SKIP-NO-SERVER acceptable)
- Existing smokes in chain still green (orthogonal — each smoke validates a distinct boundary)

## Risks

- The underlying throw is still in the code somewhere. 7.44 **masks** it on the list page rather than **fixes** it. If mom reports the same `[ERR]` on a different page, that page's reads also need wrapping (probably worth a cluster-wide audit: which pages still call `liveEnvelopesFromDb` / `ensureUserSinksSeeded` / `liveTransactions` / `liveSnapshot` without a defensive wrap?).
- Logging in production is intentionally silent (`NODE_ENV` guard). Vercel's own error reporter still receives the original throw. Same trade-off as Cluster 7.43.
- We did NOT add per-section boundaries to the list page (only the top-of-page reads). The list page has more inline sections (Rebalance form, Budget vs Actual, Over-limit cards, Every envelope rows) than the detail page. If a section throws, the list page still errors. Cluster 7.45 candidate if mom reports.