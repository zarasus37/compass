# Cluster 7.40 — Envelope read migration (visible UI bug fix)

**Status**: spec, ready to build.
**Predecessor**: Cluster 7.39 (dashboard DB migration, shipped at `1e4bc9f`). Cluster 7.38 (onboarding completion). Phase 2 in-app UX bugs in progress.
**Author constraint**: xKryptic 2026-09-26 — "envelops still arent working." Specific failure mode: the transaction / bill / goal-creation pickers show the 7 in-memory seed vessels instead of mom's real envelopes, so adding a transaction to a custom envelope she created is impossible from the picker.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

If mom creates a custom envelope ("Medical") and then tries to add a transaction to it, the `/transactions/new` envelope picker shows the 7 seed vessels only. She can't log the transaction through the normal flow without manually picking the wrong envelope. This breaks §0: the engine can't carry out a financial plan that the user can't record events into.

Same bug for: adding a new bill (`/recurring/new`), creating a new goal (`/goals/new`), receipt-scan category, the smart-categorize picker, and `learn/your-numbers`. The `/debts` page also reads `livePlan()` (in-memory) for the allocation summary.

## Root cause

Cluster 5.2.6's widget switch migrated envelope reads to DB for the **list pages** (`/envelopes`, `/period`, `/allocation`, `/insights`, `/goals`, `/recurring`, `/debts`) but missed the **form pickers** in `/transactions/new`, `/goals/new`, `/recurring/new`, `/settings/receipt-scan`, `/settings/categorize`, `/learn/your-numbers`. Same with `livePlan()` for `/debts`.

The dashboard migration (Cluster 7.39) fixed the dashboard's read + the alert bay, but didn't touch the form pickers. This cluster closes that gap.

## Scope

### B1 — Form pickers + debts plan reader migrated to DB-backed

**Files (all 1-line swaps + comment update):**

| File | Before | After |
|---|---|---|
| `src/app/(app)/transactions/new/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/goals/new/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/recurring/new/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/settings/receipt-scan/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/settings/categorize/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/learn/your-numbers/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/period/page.tsx` | `liveEnvelopes()` | `liveEnvelopesFromDb(user.id)` |
| `src/app/(app)/debts/page.tsx` | `livePlan()` | `livePlanFromDb(user.id)` |

The 1-line swaps need the matching imports updated too (`liveEnvelopes` import → `liveEnvelopesFromDb`, same for plan).

### B2 — Defer `liveTransactions` + `liveSnapshot` migrations

Affected pages (not in this cluster):
- `/transactions` (liveTransactions) — list of transactions
- `/transactions/new` (line 18 still uses liveTransactions for a calendar chip) — keep on in-memory for this cluster
- `/envelopes` (liveTransactions) — bar chart "spend this period"
- `/period` (liveTransactions) — period detail
- `/insights` (liveSnapshot + liveTransactions) — insights calculations
- `/allocation` (liveSnapshot) — snapshot for pay distribution
- `/calendar` (liveSnapshot + liveTransactions) — calendar events
- `/debts` (liveSnapshot) — net worth + period delta

**No `*FromDb` versions exist** for these. Adding `liveTransactionsFromDb(userId)` and `liveSnapshotFromDb(userId)` is real work:
- `liveTransactionsFromDb`: read from `Transaction` table, match display shape (date, amountCents, envelopeId, accountId, etc.)
- `liveSnapshotFromDb`: derive `nextPaycheckCents` + `periodDeltaCents` + `netWorthCents` from pay schedule + accounts + bills + transactions

Follow-on cluster (7.41+ candidate).

## Files

| File | Change |
|---|---|
| `src/app/(app)/transactions/new/page.tsx` | 1-line swap + import |
| `src/app/(app)/goals/new/page.tsx` | 1-line swap + import |
| `src/app/(app)/recurring/new/page.tsx` | 1-line swap + import |
| `src/app/(app)/settings/receipt-scan/page.tsx` | 1-line swap + import |
| `src/app/(app)/settings/categorize/page.tsx` | 1-line swap + import |
| `src/app/(app)/learn/your-numbers/page.tsx` | 1-line swap + import |
| `src/app/(app)/period/page.tsx` | 1-line swap + import (liveEnvelopes only; liveTransactions deferred) |
| `src/app/(app)/debts/page.tsx` | 1-line swap + import (livePlan only; liveSnapshot deferred) |
| `tests/smoke-ui-envelope-reads.mjs` (new) | Smoke: create DB envelope, assert it shows up in the transaction-form picker |
| `00-CLUSTER-7.40-ENVELOPE-READ-MIGRATION.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:ui-dashboard-db` still green (Cluster 7.39's smoke)
- `pnpm smoke:setup-wizard` still green (Cluster 7.38's smoke)
- New `tests/smoke-ui-envelope-reads.mjs`: writes a sentinel envelope directly to Prisma with a unique name, GETs `/transactions/new`, asserts the rendered HTML contains the sentinel name. SKIP-NO-SERVER gate for HTTP-needing checks.
- Visual UI: mom's custom envelopes now show in the form pickers. No new types, no schema change, no migration.

## Risks

- **In-memory `liveTransactions()` and `liveSnapshot()` still used elsewhere** — 8 surfaces. Some computations (period delta, net worth, 7-day spend) will still show stale data. Documented as 7.41+ follow-on. This cluster is the pickers + the debts-plan reader — the most user-visible bugs.
- **Test data continuity** — if mom has any test envelopes with no `planet` field, they should still render (the form pickers accept null planet).