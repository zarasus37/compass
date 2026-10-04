# Cluster 7.39 — In-app UX bugs (visible UI)

**Status**: spec, ready to build.
**Predecessor**: Cluster 7.38 (onboarding completion, shipped at `e82939c`). Phase 1 of xKryptic's 2026-09-26 plan is complete.
**Author constraint**: xKryptic 2026-09-26 — "we need the onboarding process to be fully functional and then we can move to the bugs in the app." This cluster is the first pass of "the bugs in the app" audit.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

A dashboard that shows **mock seed data** instead of mom's real envelopes / goals is a §0 violation: the visible state doesn't match the configured state, so the engine's downstream reads are based on fiction. Mom adds a real envelope via `/envelopes/new` (DB write), then opens the dashboard and sees... the seed. The 7 vessels she sees are not hers; the goal priority she set is not reflected. **This is the bug.**

Route-level error boundaries (§B2) are a §0 safety net: if a server component errors after the user has configured their plan, the recovery path must be calm + actionable, not "stack trace, refresh, pray." The dashboard being unreadable for an hour while she figures out recovery is worse than the bug that triggered the error.

## Scope

### B1a — Dashboard reads envelopes/goals/plan from in-memory mock; migrate to DB

**File**: `src/app/page.tsx`

The dashboard at `src/app/page.tsx` lines 85-94 calls:
```ts
const ENVELOPES = liveEnvelopes();    // in-memory seed
const GOALS = liveGoals();             // in-memory seed
const SNAPSHOT = liveSnapshot();       // derived aggregate (no DB version)
const BILLS = await liveBillsFromDb(user.id);  // DB ✓
const PLAN = livePlan();               // in-memory seed
const TRANSACTIONS = liveTransactions(); // in-memory seed
```

Cluster 5.2.6 migrated envelope/goal/bill/account reads to DB for `/envelopes`, `/period`, `/allocation`, `/insights`, `/goals`, `/recurring`, `/debts`, `/accounts` — but **missed the root dashboard**. The DB versions exist for envelopes (`liveEnvelopesFromDb`), goals (`liveGoalsFromDb`), bills (`liveBillsFromDb`), plan (`livePlanFromDb`), accounts (`liveAccountsFromDb`).

**Fix**: change the dashboard's three remaining in-memory reads to the DB versions.

```ts
const ENVELOPES = await liveEnvelopesFromDb(user.id);
const GOALS = await liveGoalsFromDb(user.id);
const PLAN = await livePlanFromDb(user.id);
```

### B1b — Snapshot + Transactions migration (DEFERRED to follow-on)

`liveSnapshot()` returns `nextPaycheckCents` + `periodDeltaCents` + `netWorthCents` — derived aggregates computed from pay schedule + accounts + bills. `liveTransactions()` reads from an in-memory transaction seed array.

**No `*FromDb` versions exist for these two** because the data shapes are derived/aggregate, not direct table reads. Adding `liveSnapshotFromDb(userId)` and `liveTransactionsFromDb(userId)` is real work — understanding the snapshot math + reading from the `Transaction` table + matching the display shape — and exceeds this cluster's scope.

**Follow-on cluster (7.40+ candidate)**: build the snapshot + transactions DB readers + migrate the dashboard.

### B2 — Route-level error / loading / not-found boundaries

**Files**: `src/app/(app)/error.tsx`, `src/app/(app)/loading.tsx`, `src/app/(app)/not-found.tsx` (all NEW)

Currently zero. Every error falls to Next.js defaults:
- Error → stack-trace dump (dev) / generic page (prod)
- Loading → "Loading..." text (no skeleton)
- 404 → generic Next.js 404 page

**Fix**: add three calm, mom-friendly route-level boundaries:
- `error.tsx` — error card with retry button + "back to dashboard" link. No stack trace in prod. Uses the design-system tokens (vessel palette, Sora heading, JetBrains Mono labels). `aria-live="polite"` on the error message.
- `loading.tsx` — dashboard-grid skeleton that holds the layout shape (sidebar + main column placeholders). Visual continuity so the page doesn't flicker to blank during slow queries.
- `not-found.tsx` — calm 404 with "back to dashboard" CTA + a search shortcut for the command palette. Uses the same terminal-voice markers as the rest of the app (`[404] NOT FOUND` eyebrow).

### B3 — Dashboard empty-state audit

**Files**: `src/components/dashboard/cards/*.tsx` (read-only audit, surgical fixes)

The dashboard's card-level empty handling is partial:
- ✅ TopPriorityCard handles `topGoal === null` (via dashboard's `?? null` pattern)
- ✅ EnvelopeStatusCard handles `overLimit.length === 0`
- ✅ HorizonStrip handles `horizonDays.some((d) => d.events.length > 0)`
- ❓ Other cards — needs read

**Fix**: read each card's empty path; if a card shows blank/zero when its data is empty, add an inline "Add your first X" CTA with the right next-step link. Keep changes small (1-3 LOC per card).

## Files

| File | Change |
|---|---|
| `src/app/page.tsx` | Migrate 3 reads to DB-backed versions |
| `src/app/(app)/error.tsx` | NEW — calm error boundary |
| `src/app/(app)/loading.tsx` | NEW — skeleton that holds layout |
| `src/app/(app)/not-found.tsx` | NEW — friendly 404 |
| `src/components/dashboard/cards/*.tsx` | Per-card empty-state CTA (read audit + surgical fix) |
| `tests/smoke-ui-dashboard-db.mjs` (new) | Smoke: create a DB envelope, verify dashboard sees it after the migration |
| `00-CLUSTER-7.39-IN-APP-UX-BUGS.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line + status append |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:setup-wizard` stays green (orthogonal)
- `pnpm smoke:change-password` stays green (orthogonal)
- New `tests/smoke-ui-dashboard-db.mjs`: create a DB envelope → assert dashboard renders it (via direct curl + DOM check, with the SKIP-NO-SERVER pattern from Cluster 7.38).
- The two existing dashboard reads that already work (`liveBillsFromDb`, the `(app)/layout.tsx` live envelope reads) remain untouched.

## Out of scope (intentional)

- **B1b (snapshot + transactions DB readers)** — too big for one cluster; follow-on candidate.
- **Vault / Plaid / setup wizard** — all shipped and out of scope per prior cluster discipline.
- **A formal Stage 3 integration test pass** — separate concern; this cluster is bug-fix, not test-coverage.
- **Migrating `(app)/layout.tsx`'s `liveEnvelopes()` read** — the layout reads envelopes for the alert bay; check whether it uses DB or mock. If mock, defer to follow-on. (Worth a 30-second audit before merging this cluster.)

## Risks

- **Snapshot + Transactions still showing seed** — mom will still see mock snapshot values and mock transaction counts. This is a known-acceptable gap for this cluster; documented in B1b.
- **Loading skeleton might not match real card heights** — cards are data-driven, so the skeleton is intentionally approximate. Visual continuity > perfect fidelity.