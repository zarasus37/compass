# 🎯 Debts persistence — pickup brief

**Authored**: 2026-09-30, end of the test-integrity session. **Status: not
started.** xKryptic approved this explicitly: "this is a feature that is
absolutely important and is needed in the app."

Read this first, then `HANDOVER-TEST-INTEGRITY.md` for the test-suite
state. Everything below was measured, not assumed — but the first task
is to re-verify it, because the whole point of the last session was that
assumptions cost days.

---

## 1. Why this exists

The seven `smoke-debts-*` tests are **source-regex only**. They read the
component source and assert a string is present. They cannot catch the
page rendering a wrong number, and they would pass against a component
that computed garbage.

The reason: **debts are not persisted anywhere.** There is no `Debt`
model in `prisma/schema.prisma` (verified — `^model Debt` returns
nothing). The debts page calls:

    src/lib/mock.ts:456   liveDebts(userId) -> readDebts(userId).map(toDisplayDebt)

So debt state lives in the in-memory mock store. It renders, it looks
right, and it is gone on refresh. xKryptic considers this a real
product gap, not a test gap.

## 2. The shape you need to persist

From `src/lib/mock.ts` (`DebtSeed` + `toDisplayDebt`):

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `balanceCents` | int | current balance |
| `originalBalanceCents` | int | balance when first tracked — drives "progress" |
| `aprBps` | int | basis points, not percent. 24.99% → `2499` |
| `minPaymentCents` | int | |
| `dueDay` | int | 1–31, `0` = not on a schedule |
| `accountId` | string? | FK to `Account` — check onDelete before adding |

`DebtPayoffRow` and `PayoffProjection` (`debt-interest.ts`) are derived,
not stored — compute them from the rows.

⚠️ **`aprBps` is the trap.** Storing basis points as a float percent is
the kind of silent 100× error that a source-regex test cannot catch and
a user will. Whatever you do, the first real test must assert a known
APR round-trips exactly.

## 3. Files that will need to change

Readers / writers:
- `src/lib/mock.ts:456` — `liveDebts`, `readDebts`, `toDisplayDebt`
- `src/app/(app)/debts/page.tsx` — currently `liveDebts(user.id)` +
  `liveAccountsFromDb`
- `src/app/actions/debts.ts` — `applyExtraToDebt`, `logDebt`

Consumers (all read the display shape, so most should not change):
- `src/app/(app)/debts/new/NewDebtForm.tsx`
- `src/components/debts/DebtCard.tsx`
- `src/components/debts/DebtDetailExpand.tsx`
- `src/components/debts/DebtListInteractive.tsx`
- `src/components/debts/CrossDebtExtraPanel.tsx`
- `src/components/viz/DebtSparkline.tsx`
- `src/lib/debt-interest.ts`, `src/lib/debt-tier.ts`

Schema:
- `prisma/schema.prisma` — add `model Debt`
- a migration. **Note:** this repo uses `db push`, not migrations, for
  the dev/CI path — `/api/health` reports `migrationStatus: "pushed"`
  and logs a `_prisma_migrations does-not-exist` error that is *by
  design*. Follow whatever `38e3653`/`daabae5` did, not a migration
  tutorial.

## 4. First task: read `readDebts`

`readDebts(userId)` is called with a userId but there is no `Debt`
table — so **confirm what it actually reads** before designing the
migration. `8e34c30 fix(store): make the in-memory store per-user, not
a process singleton` touched this area; the store may already be
user-namespaced, which changes how much you can reuse.

Also check `git log --oneline -- src/lib/mock.ts` for the same reason
the test session kept finding stale assumptions: a commit may already
have moved this.

## 5. Follow the pattern that already works

Every other entity in this repo was migrated the same way. Copy it
rather than inventing:

- `src/lib/seed-bills.ts` → the read-path pattern
- `tests/fixture.mjs` → `provisionBaseline` already creates
  account/envelope/goal/bill/plan rows. **Add debts there** so every
  fixture user has a debt set, exactly like bills. The header comment
  in that file explains why it rebuilds values under per-user ids
  instead of calling the canonical seeders — read it first.

## 6. Definition of done

1. A debt entered in the UI **survives a page refresh and a server
   restart.**
2. `liveDebts` reads from Prisma; no in-memory source remains on the
   debts page.
3. An account with no debts renders a real empty state — **it must not
   500.** (This exact class of bug hit four other read paths; see
   `8ae8912` in the handoff archive for the pattern and the four
   defects it was hiding.)
4. The seven `smoke-debts-*` tests are rewritten to assert **real
   numbers from real rows** — not source strings. At minimum: a known
   APR round-trips, a known balance renders as the right dollar figure,
   and a known payoff projection computes correctly.
5. Each debt test uses `tests/fixture.mjs`, not `mom@compass.local`.
6. `pnpm tsc` exit 0, `pnpm lint` exit 0 (543 warnings / 0 errors is
   the current baseline), and the full `pnpm smoke` chain is green
   under `SMOKE_REQUIRE_SERVER=1`.

## 7. Stop conditions

- **CI is the arbiter.** `gh run list` before believing any status. This
  repo has six weeks of history claiming "all green" while CI failed 60
  runs in a row. **Runtime is the tell: longer = got further.**
- **A red check may mean the assertion is stale, not the code.** `git
  log` the file under test first. Ten of eleven defects cleared last
  session were exactly this.
- **Measure before naming a cause.** Two predecessor sessions produced
  confident wrong diagnoses. Write a throwaway probe that prints the
  real markup/values; delete it with the recoverable-delete launcher.
- **Do not weaken an assertion to go green.** Fix the contract, or
  report why it cannot be fixed.

## 8. Pre-flight

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -3
pnpm tsc                                # exit 0
pnpm lint                               # exit 0
pnpm dev                                # REQUIRED before any HTTP smoke
```

Verify: `Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing`
→ `"status":"ok"`. A dev server from a previous session may still hold
:3000 — Next prints "Another next dev server is already running" and
exits 1 if you start a second. Reuse it.

Anything importing `tests/fixture.mjs` or `../src/` must run under
`tsx --conditions=react-server`. Never hand-edit the chain — run
`node scripts/fix-smoke-runners.mjs`.

PowerShell has no heredoc: write commit messages to a file and use
`git commit -F`.
