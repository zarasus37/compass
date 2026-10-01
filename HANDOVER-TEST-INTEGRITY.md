# 🚨 READ FIRST — Session Briefing (2026-09-30 ~13:20 UTC)

> ## 🎯 If you are here to build DEBTS, read `DEBTS-PERSISTENCE-BRIEF.md`
> That is the pickup brief: what to build, the exact field shape, the
> files to touch, the trap, and what "done" means. xKryptic approved it
> explicitly. Everything below is the test-suite state that leads to it.

**Supersedes every earlier briefing in this file.** The shared-user
landmine is defused, wall 8 is CI-confirmed cleared, and the seven
`smoke-debts-*` are migrated and green locally. The test tail is done —
the next block of work is the debts persistence feature.

**The headline finding is §3b, and it is a product bug, not a test bug.**
`toDisplayDebt` silently dropped `creditLimitCents`, so the utilization
caption, gauge and rainbow gradient had never rendered for any user.
Seven source-regex smokes could not see it.

---

## 1. Where `main` is

| Commit | What it is |
|---|---|
| `066270e` | restore `creditLimitCents` in `toDisplayDebt`; migrate the 7 debts smokes to the fixture |
| `09efb0a` | defuse the `escape-hatches` landmine; clear wall 8; fix a vacuous pass |
| `de3b688` | docs: add the debts persistence pickup brief |
| `d5d22f4` | clear `smoke-envelopes-list-defensive-reads` (5th landmine wall) |
| `b9c3c51` | clear `smoke-envelope-detail-section-errors` (4th landmine wall) |
| `e2be407` | clear `smoke-envelope-detail-null-planet` (the vacuous pass) |
| `424ab47` | clear `smoke-ui-envelope-reads` |
| `8ed91f4` | root `app/not-found.tsx`; clear `smoke-ui-dashboard-db` |
| `05e64e8` | clear `smoke-setup-wizard`, then `smoke-change-password` |

All pushed to `origin/main`.

## 2. What the chain has cleared, and what it died on

CI is the arbiter.

| Commit | Runtime | Died at |
|---|---|---|
| `424ab47` | 9m20s | `smoke-envelope-detail-null-planet` |
| `e2be407` | 9m30s | `smoke-envelope-detail-section-errors` |
| `b9c3c51` | 9m33s | `smoke-envelopes-list-defensive-reads` |
| `d5d22f4` | 9m34s | `smoke-client-error-capture` ← wall 8 |
| `09efb0a` | 9m25s | `smoke-debts-tier` [23] — **wall 8 passed** |
| `066270e` | ? | ? ← **the only open CI question** |

Eight walls fixed. Wall 8 is CI-confirmed: `smoke-client-error-capture`
reported **24 pass / 0 miss** on run `36717670391`, and the chain
advanced past it for the first time.

| Wall | Before | After |
|---|---|---|
| `smoke-setup-wizard` | 2 MISS + P2025 crash | 31 / 0 |
| `smoke-change-password` | 4 MISS | 40 / 0 |
| `smoke-ui-dashboard-db` | 4 MISS | 11 / 0 |
| `smoke-ui-envelope-reads` | 2 MISS + 30s hang | 20 / 0 |
| `smoke-envelope-detail-null-planet` | 1 MISS | 6 / 0 |
| `smoke-envelope-detail-section-errors` | 1 MISS | 12 / 0 |
| `smoke-envelopes-list-defensive-reads` | 1 MISS | 8 / 0 |
| `smoke-client-error-capture` | 1 MISS `[22]` | **24 / 0 — CI-confirmed** |
| `smoke-debts-tier` | 1 MISS `[23]` | **26 / 0 — local, awaiting CI** |
| the other six `smoke-debts-*` | 5 failing | **all green — local, awaiting CI** |

⚠️ **Runtime alone is no longer a reliable progress signal.** The
`09efb0a` run was *shorter* (9m25s vs 9m54s) while getting strictly
further, because the chain moved from dying inside a Playwright timeout
to dying on a fast assertion. Read *which* entry died, not only how long
it took.

### 2a. ✅ The landmine is defused

`smoke-escape-hatches` no longer touches `mom@compass.local`. It uses
**two** fixture users — one for the dashboard/settings checks and one for
the reset test, because check [14] destroys the identity by design and
sharing a user would have reintroduced the bug it caused. 15 → 17 checks
(the two extra are `[8a]`/`[10a]` "the page actually rendered" guards).

`smoke-onboarding-chat-escape` and `smoke-client-error-capture` are
migrated too. `smoke-auth.mjs` still creates mom on purpose — correct,
it is the test that owns that account.

## 3. 🎯 The lesson that found them

**A red check is not a bug report. It is a claim that some contract
moved, and the first question is which side moved.**

Of the individual defects cleared, **most** were an assertion encoding
a contract that an *earlier* commit had already deliberately changed. The
test was the stale side, not the product. The recurring shapes:

- `smoke-setup-wizard` did `update({ where: { userId } })` on a row a
  *previous check deliberately deleted*, to reproduce a bug shape.
- `smoke-change-password` asserted `type="password"` rendered *after*
  `data-testid`. React emits JSX props in order; the form writes `type`
  first. The regex could never match, whatever the component did.
- `smoke-ui-dashboard-db` `[5]` asserted `(app)/loading.tsx` exists;
  `daabae5` deleted it on purpose. Its `[8]` asserted a `planet` column
  that renders nowhere.
- `smoke-debts-mobile` `[1]` required `useState<boolean>(false)` and a
  `typeof window` guard. `useMediaQuery` was deliberately moved to
  `useSyncExternalStore`, where the `false` server snapshot is the
  *third argument* and there is no window check to grep for at all.

**Apply:** before fixing a check, `git log` the file it asserts about.
If that commit is recent and deliberate, the assertion is the stale side.

### 3a. A negative assertion cannot fail

`smoke-envelope-detail-null-planet` had this:

```
[5] PASSED — asserts the page contains no "[ERR]" card.
             A gate redirect to /setup contains no error card.
             It passed for the WRONG REASON.
```

**A negative assertion cannot distinguish "the thing worked" from "the
thing never ran."** Guard every negative assertion with positive proof
that the page actually rendered. Settled shape, now used throughout:

```js
const onPage = p.url().endsWith("/debts");          // or status === 200
check("[x] page actually rendered", onPage, `url=${p.url()}`);
check("[y] the real assertion", onPage && <the thing>);
```

### 3b. 🚨 The one that was a PRODUCT bug

**Seven source-regex smokes passed green for weeks while the feature they
cover had never rendered once.**

`toDisplayDebt` in `src/lib/mock.ts` copied every field of a `Debt`
*except* `creditLimitCents`:

```js
function toDisplayDebt(d: Debt) {
  return { id, name, balanceCents, originalBalanceCents, aprBps,
           minPaymentCents, dueDay, accountId, sortOrder, isArchived };
}                                   // creditLimitCents: never copied
```

So `liveDebts()` handed `/debts` a debt with no credit limit, `DebtCard`'s
`debt.creditLimitCents ?? null` was always `null`, and `utilizationPct`
was always `null`. The `% used` caption, the utilization gauge and the
rainbow gradient (Clusters 7.48, 7.49, 7.50) never rendered for any
user. Fixed in `066270e`; verified by probe — the strings are absent
before the change and present after (page 50,043 → 50,413 bytes).

**The generalisable lesson:** a mapping layer between the data and the
component is the blind spot of source-regex testing. `DebtCard` was never
wrong; the object handed to it was. When a source-regex suite is green,
assert at least one **value** on one page before believing the feature
renders.

### 3c. The three debts assertions that could not pass

- `smoke-debts-tier` `[23]` asserted `DebtDetailExpand` labels on a
  **collapsed** list. `DebtListInteractive` starts with
  `expandedId = null` and renders `{isExpanded && <DebtDetailExpand/>}`,
  so those labels exist nowhere until a card is expanded. Now `[23]`
  (collapsed) + `[23b]` (click `[aria-controls^="debt-detail-"]`, then
  assert).
- `smoke-debts-mobile` `[15]` was named "narrow + wide" but captured only
  a 375px viewport, then asserted the caption inside `DebtCard`'s
  `{!isMobile && ...}` **desktop** column. Now `[15]` (narrow: column
  collapsed) + `[15b]` (`setViewportSize(1280)`, reload, caption present).
- `smoke-debts-mobile` `[1]` — the stale useMediaQuery shape, §3.

### 3d. OPEN, NOT A PRODUCTION BUG — the blank (app) 404 on `pnpm dev`

On the dev server, a `notFound()` raised by a page inside the `(app)`
group returns **HTTP 404 with an empty visible body** — the whole body is
the document title. Five routes call `notFound()`:

- `(app)/envelopes/[id]/page.tsx`
- `(app)/envelopes/[id]/edit/page.tsx`
- `(app)/envelopes/[id]/edit-target/page.tsx`
- `(app)/goals/[id]/page.tsx`
- `(app)/goals/[id]/edit/page.tsx`

The response is Next's **global error fallback**, identified by
`<html id="__next_error__">`, `<meta name="next-error" content="not-found">`
and a `resolveErrorDev` frame in the stack. There is no
`global-error.tsx`, so in dev nothing fills the gap.

**What was checked before concluding anything:**

- The **root** boundary renders correctly on the same dev server
  (`/definitely-not-a-route` shows the full card), so this is not a
  missing-boundary problem in the usual sense.
- **Deleting `(app)/not-found.tsx` entirely does not change it** —
  measured, and the deletion was reverted. The theory that a route group
  with no `page.tsx` never joins the route tree, so the group boundary
  was shadowed by the root one, is **false**.
- A **local production build cannot be exercised**: `next build`
  succeeds, but `next start` refuses with
  `[prod-env] refused to start in production` unless the real production
  `DATABASE_URL`, `MAVIS_API_KEY`, `LLM_PROVIDER` and `VAULT_CHAIN_ID`
  are set. Those were **not** faked.
- The **real deployment** was checked read-only instead:
  `compass-mom.vercel.app/definitely-not-a-route` returns the card and
  contains **no** `__next_error__` document.

So the blank body is **confined to the dev server**, and production does
not use the global-error fallback. The `(app)` case in production still
needs one authenticated request to confirm; that is left open rather than
assumed.

**Consequence for tests:** do **not** add an assertion that a 404 body is
visibly non-empty — it would fail against dev, and encoding a dev-only
artifact as an invariant is exactly the mistake §3a is about. `smoke-envelope-detail-db`
[2c] instead proves its detector fires against a route that genuinely
renders the card.

## 4. Carried forward (still true)

**A `GET /login` server probe with `AbortSignal.timeout(2000)` reports a
healthy dev server as unreachable.** A dev server compiles `/login` on
demand, and a cold first compile outruns a 2s budget. Measured directly:
`/api/health` returned 200 at the same moment the probe said unreachable.
All migrated tests now probe `GET /api/health` at 10s.

**The three hardcoded-date bugs are still fixed and still load-bearing.**
A check that passes at one wall-clock time and fails at another, with no
code change, is a clock bug until proven otherwise.

**The flight-payload regex lesson is active.** The RSC payload embeds an
escaped second copy of the same text; strip `<script>` bodies before
matching, or scope to a `data-testid`.

## 5. 🎯 NEXT — the debts persistence feature

The test tail is **done**. Nothing between here and the end of the chain
is left to fix; the seven debts smokes are green locally and awaiting CI
on `066270e`.

Read `DEBTS-PERSISTENCE-BRIEF.md` and start there. Three things this
session changed that the brief should absorb:

1. **Debts are still in-memory only.** `readDebts` →
   `getState(userId).debts` in `src/lib/store.ts`, seeded lazily from
   `DEBTS_SEED` via `seededId` for *any* unknown userId, pinned on
   `globalThis.__COMPASS_STORE__`. The store is **per dev-server
   process** — a test process cannot seed it. That is why the fixture
   cannot provision debts today, and why the debts live checks were
   written to expand a real card rather than rely on seeded rows.
2. **`Debt.creditLimitCents?: number` already exists** on the store type
   (`store.ts:305`) with a docstring saying utilization applies when it
   is set. Any new `Debt` model must carry it, or §3b recurs.
3. `tests/fixture.mjs` provisions account/envelope/goal/bill/plan. **Add
   debts there** once they persist.

Remaining known-open items, unchanged:

- **The `smoke-setup-wizard` live walk-through still reports
  `step 4 (bills) did not advance SetupState.completedStep`.** Non-gating
  `[warn]`. The old "missing SetupState row" diagnosis was **wrong** —
  `saveBillsAction` calls `markStepCompleted` unconditionally
  (`src/app/setup/actions.ts:222`), so if the action runs the step must
  advance. Untested hypothesis: the walk-through's `callStep` posts an
  empty `FormData` with a bare `Next-Action` header, whereas the
  fixture's helper (`tests/fixture.mjs:573`) uses the `$ACTION_REF_1` +
  `$ACTION_1:0` bound-action encoding. **Measure before naming it.**
- `tests/_debug-insights.mjs`, `_debug-insights2.mjs`, `_debug-login.mjs`,
  `_check-user.mjs`, `_cleanup-alloc.mjs` are untracked scratch. Do not
  stage them.

## 6. Pre-flight

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -3                    # 066270e, 09efb0a, de3b688
pnpm tsc                                # exit 0
pnpm lint                               # exit 0 (543 warnings, 0 errors)
pnpm dev                                # REQUIRED before any HTTP smoke
```

Verify: `Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing`
→ `"status":"ok"`, `checks.db.ok: true`.

A dev server from a *previous* session may still be running on :3000
(Next.js prints "Another next dev server is already running" and exits 1
if you start a second). Check first; reuse it.

Background `pnpm dev` tasks get reaped in this environment, and it can
happen **between** two test runs — a run can report "dev server
unreachable" while `/api/health` is 200. If health fails, restart before
believing any HTTP smoke.

Anything importing `tests/fixture.mjs` **or** `../src/` must run under
`tsx --conditions=react-server`. Do not hand-edit the chain — run
`node scripts/fix-smoke-runners.mjs`, which derives the runner from both
conditions.

## 7. Files to read first

1. `tests/fixture.mjs` — the per-test user factory. **Read its header
   before editing any test.**
2. `src/lib/seed-ids.ts` — `seededId(userId, canonicalId)`.
3. `tests/skip-guard.mjs` — exit contract: 0 pass / 1 fail / 2 skipped.
4. `scripts/fix-smoke-runners.mjs` — how the chain is generated.
5. `src/lib/store.ts` — `getState` / `seedState` / `readDebts`: the
   in-memory layer the debts feature has to replace.
6. `src/lib/setup/state.ts` — `getNextStep` is the contract the 7.38-B1
   checks encode.

## 8. Stop conditions

- **Check `gh run list` before believing any status.** This repo has a
  documented history of six weeks of "all green, ~1,580 checks" claims
  while CI failed 60 consecutive runs. Read *which entry* died, not just
  the runtime (§2).
- **Do not skip or weaken assertions to make a suite green.** Every fix
  in these sessions either restored something the assertion already
  demanded, corrected the assertion to the contract the product actually
  documents, or gave an unsatisfiable assertion a real subject. None
  removed a check.
- **Do not name a cause before measuring it.** Three predecessor sessions
  produced confident wrong diagnoses. Write a throwaway probe that
  prints the real markup or the real values, then delete it with the
  recoverable-delete launcher. That is what cracked every wall here,
  and what found the `toDisplayDebt` bug.
- **Never hand-transcribe an assertion when you can edit in place.** A
  file read collapsed a space in a regex; retyping it produced a check
  that had always passed and now failed. Use targeted edits, then diff
  the untouched assertions against `git show HEAD:<file>` to prove they
  are byte-identical.
- **A red check may mean the assertion is stale, not the code.** §3.
  Check `git log` on the file under test first.
- **Prefer a config change over patching `node_modules`.**
- **Env-local assertions do not belong in CI.**

## 9. Git hygiene

- Never `git add .` — untracked binaries (`compass logo.jpg`,
  `preview-login.png`, `videos/`, `design/vision.docx`) must not land.
  Stage explicit paths.
- Delete scratch files (`*.log`, throwaway probe scripts) with the
  runtime's recoverable-delete launcher, not `Remove-Item`.
- PowerShell has no heredoc: write the commit message to a file and use
  `git commit -F`. It also has no `&&` in 5.1 — use `;` or separate
  statements.



# 📎 ARCHIVE — 2026-09-29 / 09-30 session detail (still true unless noted)

Status lines from this section are superseded by §1-§2 above. The
mechanism write-ups are kept because they explain *how* the class of
defect in §3 arises, and they are still actively being hit.

## 4. The subtle one — why "entry 8" defeated bisection

The handoff's documented repro (`smoke-vault-scheduler` then
`smoke-vault`) **did not reproduce** — both passed, repeatedly, both
standalone and in-chain. The previous session had already ruled out the
seeded data, the per-user store, and shared cross-user state by dumping
values. It was right to suspect rendering, and rendering was the cause.

The App Router streams its RSC flight payload as
`self.__next_f.push([...])`, containing an **escaped JSON copy** of the
same text:

```
"Reconciliation: attributed ","$$6.96"," · vault total ","$$6.96",
" · residual"," ","$$0.00"
```

The line regex is `Reconciliation:[^<]*residual[^<]*`. There is no `<`
between those two words inside a script either — so when the flight
payload precedes the rendered markup, the regex happily matches the
**payload**. The two amount regexes then fail against it, because the
payload escapes the separator: there is no bare `$` + digits
immediately after `vault total` — it reads `vault total ","$$6.96`.

**Where the flight payload lands relative to the body HTML depends on
streaming/Suspense boundaries and cache warmth.** That is why it passed
twice on a warm local dev server and failed deterministically on CI's
cold one, and why predecessor bisection kept failing to reproduce it.

Fix: strip `<script>` bodies before matching. Verified against five
cases — markup-first parses, flight-first now parses, a negative
residual parses, a genuinely large residual still FAILS the <1% bound,
and a genuinely missing line still FAILS as unparseable. The check
keeps its teeth.

**The transferable lesson:** a regex over raw HTML that uses `[^<]*` to
bridge two words is unsound on a React Server Components page, because
the same sentence exists twice — once rendered, once escaped in the
flight payload. Prefer scoping to a testid element, or strip scripts.

## 5. The 404 — FIXED (`daabae5`), and what it exposed next

`smoke-envelope-detail-db` `[4] unknown envelope id returns 404`.
`/envelopes/does-not-exist` returned **200** with a "could not be found"
body. Pre-existing, not caused by any session.

**Root cause (measured, not assumed):** `src/app/(app)/loading.tsx`
existed at the (app) group root, making the whole group a Suspense
boundary. Next flushed a 200 shell immediately, so the `notFound()` at
`src/app/(app)/envelopes/[id]/page.tsx:81` could no longer set the
status. **No page under `(app)` could ever return 404.**

**Resolution** (xKryptic chose "scope the boundary down" over dropping
the shell, to avoid a visible-UX regression):

- The shell moved to `src/components/shell/AppLoadingShell.tsx` — one
  copy, not fifteen.
- `loading.tsx` is now a one-line re-export on the 14 primary nav
  segments (period, calendar, insights, accounts, allocation,
  obligations, holdings, recurring, settings, debts, transactions,
  vault, advisor, learn).
- `envelopes/` and `goals/` **cannot** take a route-level
  `loading.tsx` — a loading file on a segment also covers its
  children, which re-creates the bug for `[id]`. Those two list pages
  wrap their data fetch in an internal
  `<Suspense fallback={<AppLoadingShell/>}>`, so the list still shows
  the skeleton and the detail route stays un-suspended.

Verified: `smoke-envelope-detail-db` 8/1 → **9/0**; `smoke-envelopes-db`
29/0; `smoke-goals-db` 28/0; tsc 0; lint 0. **CI confirmed the 9/0** on
run `36647590522`, which then advanced to the next blocker.

No UX regression: every primary nav destination still gets the same
skeleton. The only routes that lose it are `/envelopes/[id]`,
`/goals/[id]` and their edit forms — single-record reads that resolve
fast. The sidebar/topbar/bottom-nav chrome was never affected either
way; it lives in `(app)/layout.tsx`, above every boundary.



## 5b. Side quest — the app clock was frozen (shipped, `38e3653`)

Not part of the CI work, but found mid-session and worth its own record
because it was a **live-user-facing product bug**, not a test issue.

`src/lib/mock-seed.ts` pinned the entire date model to literals:

    TODAY         = new Date("2026-08-30T18:30:00")
    PERIOD_START  = new Date("2026-08-22T00:00:00")
    PERIOD_END    = new Date("2026-09-05T00:00:00")
    NEXT_PAY_DATE = new Date("2026-08-28T00:00:00")

**106 references across 21 files** read `TODAY` — dashboard,
safe-to-spend, horizon strip, top priority, calendar, transactions,
obligations, goals, debts, insights, envelopes, vault activity strip.
So the production site reported "Day 9 of 14 in this pay period — 5
days to the next paycheck" and "$24.4/day to last 5 days" weeks after
that period ended. It never errored; a frozen clock renders a complete,
plausible dashboard, so it reads as "working".

Shipped in `38e3653`:
- `TODAY` is now `new Date()` — one line at the single source, all 106
  follow.
- The period constants are no longer a frozen literal and are now only
  the *fallback* for `getCurrentPayPeriod()`.
- `getCurrentPayPeriod()` already read the active `PayPeriod` row but
  nothing advanced it. It now rolls an expired window forward off the
  user's `PaySchedule` cadence until it contains today, then persists
  it. Verified by planting an expired row: `Sep 6 → Sep 20` rolled to
  `Sep 20 → Oct 5`, idempotent on the second call.

**Known follow-ups, deliberately not done:**
- `TODAY` is module-scope, so it is fixed for the life of the process.
  Accurate on Vercel (cold start per deploy); a long-lived dev server
  can go stale across midnight. Per-request would mean 106 edits.
- `PayPeriod` has **no `userId`** — one global active row, so the roll
  is single-user. First thing to fix if a second person signs in.
- The period is written during a GET render. Idempotent and guarded, but
  it is a write on a read path.
- Unrelated but noticed: the dashboard's over-limit banner says
  Groceries is over by **$424** while the card below says **+$212** (the
  suite confirms $212 is correct). Not chased.

### Clearing the demo data

`scripts/clear-demo-data.mjs` strips the seeded demo persona from one
account while leaving `User`, `Session` and `FinancialIdentity` alone —
login, password and onboarding answers survive. Its model list is
derived from `prisma/schema.prisma` at runtime (a hardcoded list had
already rotted: `PaymentAttempt` has no `userId`). It requires an
explicit `DATABASE_URL`, prints the resolved host before acting, and
defaults to a dry run.

**Not yet run against production** — the Vercel CLI cannot spawn a
worker from the dev machine, so this needs an operator with the
production `DATABASE_URL`:

```powershell
$env:DATABASE_URL = "<production url>"
npx tsx scripts/clear-demo-data.mjs <email>            # dry run
npx tsx scripts/clear-demo-data.mjs <email> --confirm  # delete
```

## 5d. Demo data no longer enters a real account (`8ae8912`, `ae0596e`)

Operator decision: a real account starts **empty**. Demos belong on the
marketing side — homepage, a video, or a public no-signup demo before
signup. Demo seeding is still fine for testing; it just must not be
automatic.

**The root problem was five read paths that wrote.** Each
`live*FromDb` reader called a seeder on every read:

    liveEnvelopesFromDb -> ensureUserEnvelopesSeeded
    liveAccountsFromDb  -> ensureUserAccountsSeeded
    liveBillsFromDb     -> ensureUserBillsSeeded
    liveGoalsFromDb     -> ensureUserGoalsSeeded
    livePlanFromDb      -> ensureUserAllocationSeeded

So an account with nothing got the demo persona on its first page
load, invisibly. All five now just read. Creating rows is explicit:
the setup wizard, `POST /api/reset-seed`, `scripts/clear-demo-data`.

**Four real bugs were hiding behind the seeded rows** — each only ever
happened because something else had been created first:

1. The dashboard 500'd on an empty account. `livePlanFromDb` threw
   `"no seed plan found for user after seeding. This is a bug."` —
   true only while the read path seeded. "No plan" is now a normal
   state returning an unarmed plan, so `AllocationPlan.id` is
   `string | null`.
2. `AllocationRule_envelopeId_fkey` violation.
3. The vault sync errored: `seedVaultFromEnvelopes` read the
   **in-memory** store (populated from `ENVELOPES_SEED` regardless of
   reality) while its FK target was the empty DB table. It now reads
   `liveEnvelopesFromDb` / `liveBillsFromDb`, which also closes the
   in-memory/DB split the 7.39 notes deferred.
4. A class of undefined-envelope failures across bills/goals.

**The wizard keeps structure, loses the fiction:**
`seedZeroedEnvelopesForOnboarding` writes the same seven categories in
the same order with every balance zeroed.

Verified: all 15 main surfaces render 200 on a genuinely empty account,
and after browsing every one the account still has 0 envelopes /
0 accounts. `POST /api/vault/sync` → `{"ok":true,"envelopesUpserted":0,…}`.

**Tests that described the old behaviour were migrated, not deleted:**
`integration-vault` and `smoke-envelope-detail-db` were the last two
hardwired to `mom@compass.local`. The latter asserted, by name,
"mom has envelopes in DB (lazy-seed worked)". Both now use the fixture
and assert against real data. The integration test's "sync creates 7
envelopes, 6 bills" became "sync upserts exactly the source counts" —
stronger, because it proves the sync mirrors the user's rows rather
than a magic number.

## 5c. Three hardcoded dates, one lesson

Three separate clock bugs in one session, all the same shape, all found
only by running the thing:

1. `TODAY` frozen in product code (§5b).
2. `smoke-audit-log` derived a row date with `toISOString()` (UTC) while
   the page parses `?from=` as **local** midnight. Passed at 18:54 UTC,
   failed at 02:55 UTC, identical code — fires every evening in US
   timezones. Fixed in `38e3653`.
3. `smoke-cron-audit-log-prune` pinned its own `NOW` to 2026-08-30
   while the endpoint under test always used real `new Date()`. Once the
   real date passed `pinned + 60d + 90d`, a "60d" sentinel fell on the
   wrong side of the 90-day retention cutoff and got pruned — exactly 2
   live rows and 2 rollup buckets in CI. Fixed in `d0b2dcc`.

**The diagnostic that keeps working:** a check that passes at one
wall-clock time and fails at another, with no code change, is a clock
bug until proven otherwise. Confirm by re-running against a stashed
pre-change tree before blaming your own work — that is how #2 and #3
were separated from the real fix in #1.

