# 🚨 READ FIRST — Session Briefing (2026-09-30 ~11:00 CDT)

**Supersedes the 2026-09-30 00:05 UTC briefing this file previously
contained.** The three walls below were found, fixed and CI-confirmed.
The chain has advanced again; this briefing records what is now known to
be true and what the next blocker is.

**The headline correction: the previous briefing recorded ONE blocker
and was wrong on all three counts.** Each of the three walls it walked
past was a *stale assertion describing a contract that had already
moved* — not the cause it named. The single most useful lesson from
this session is in §3.

---

## 1. Where `main` is

| Commit | What it is |
|---|---|
| `b9c3c51` | clear `smoke-envelope-detail-section-errors` (4th landmine wall) |
| `e2be407` | clear `smoke-envelope-detail-null-planet` (the vacuous pass) |
| `424ab47` | clear `smoke-ui-envelope-reads` |
| `8ed91f4` | root `app/not-found.tsx`; clear `smoke-ui-dashboard-db` |
| `05e64e8` | clear `smoke-setup-wizard`, then `smoke-change-password` |

All pushed to `origin/main`.

## 2. What the chain has cleared, and what it died on

CI is the arbiter. Runtime is the tell: a longer run means it got
*further*.

| Commit | Runtime | Died at |
|---|---|---|
| `8ae8912` | 7m48s | smoke-envelope-detail-db ("lazy-seed worked") |
| `ae0596e` | 9m24s | **smoke-setup-wizard** |
| `05e64e8` | 9m4s | **smoke-ui-dashboard-db** |
| `8ed91f4` | 9m32s | **smoke-ui-envelope-reads** |
| `424ab47` | 9m20s | **smoke-envelope-detail-null-planet** |
| `e2be407` | 9m30s | **smoke-envelope-detail-section-errors** |
| `b9c3c51` | *see §6* | *see §6* |

Six walls cleared in one session:

| Wall | Before | After |
|---|---|---|
| `smoke-setup-wizard` | 2 MISS + P2025 crash | **31 / 0** |
| `smoke-change-password` | 4 MISS | **40 / 0** |
| `smoke-ui-dashboard-db` | 4 MISS | **11 / 0** |
| `smoke-ui-envelope-reads` | 2 MISS + 30s hang | **20 / 0** |
| `smoke-envelope-detail-null-planet` | 1 MISS | **6 / 0** |
| `smoke-envelope-detail-section-errors` | 1 MISS | **12 / 0** |

`pnpm tsc` exit 0 · `pnpm lint` exit 0 (543 warnings, 0 errors).

## 3. 🎯 The lesson that found them

**A red check is not a bug report. It is a claim that some contract
moved, and the first question is which side moved.**

Of the eleven individual defects, **ten** were an assertion encoding a
contract that an *earlier* commit had already deliberately changed.
The test was the stale side, not the product. The recurring shapes:

- `smoke-setup-wizard` did `update({ where: { userId } })` on a row a
  *previous check deliberately deleted*, to reproduce a bug shape.
- Its 7.38-B1 table expected `completedStep=1 → pay-schedule` — the
  step just *completed*, not the next one. Rows 3 and 4 were already
  right, so only half the loop ever reported.
- `smoke-change-password` asserted `type="password"` rendered *after*
  `data-testid`. React emits JSX props in order; the form writes
  `type` first. The regex could never match, whatever the component did.
- `smoke-ui-dashboard-db` `[5]` asserted `(app)/loading.tsx` exists.
  `daabae5` deleted it on purpose.
- Its `[8]` asserted an envelope's `planet` column renders as a string.
  Measured: it renders nowhere, raw or stripped. Unsatisfiable.
- `smoke-ui-envelope-reads` `[1.debts]` asserted the debts page imports
  `livePlanFromDb` — true from `94dd126` (7.40), replaced by `1149c49`
  (7.46) on purpose.

**Apply:** before fixing a check, `git log` the file it asserts about.
If that commit is recent and deliberate, the assertion is the stale
side. Three of these had a comment or docstring in the repo explaining
the *new* behaviour while the test asserted the *old* one.

### 3a. 🚨 The landmine — `smoke-escape-hatches`, and it has cost FOUR walls

`smoke-escape-hatches` (chain entry 34) is still hardwired to
`mom@compass.local` and calls `POST /api/onboarding/reset` on it,
wiping that account's `FinancialIdentity`. Every later entry that still
signs in as mom then sits **behind the onboarding gate**, and its pages
never render at all.

**Four of the six walls trace to this one test.** It is worth more than
any single failing entry, because each wall it causes has to be
diagnosed and migrated one at a time.

The nastiest symptom, in `smoke-envelope-detail-null-planet`:

```
[5] PASSED — asserts the page contains no "[ERR]" card.
             A gate redirect to /setup contains no error card.
             It passed for the WRONG REASON.
[6] FAILED — the envelope name and balance genuinely were not there.
```

**A negative assertion cannot distinguish "the thing worked" from "the
thing never ran."** That is the generalisable lesson, and it is why
`[5a]` / `[11a]` now assert the browser is still on the detail page
before the negative assertion is trusted.

### 3b. Two recurring sub-shapes

- **Attribute-order regexes over rendered HTML.**
  `/data-testid="x"[^>]*type="y"/` is unsound — resolve the tag by
  testid, then assert on it.
- **Matching raw HTML without stripping `<script>`.** The RSC flight
  payload embeds an escaped second copy of the same text (§4).

## 4. Carried forward from the 2026-09-29 briefing (still true)

The four layered defects fixed then remain fixed. The **flight-payload
regex lesson** (§4 of the old briefing) is not historical — it is
active: it caused the `smoke-change-password` regex failure above, and
`smoke-ui-dashboard-db` now strips scripts for the same reason.

**The three hardcoded-date bugs are still fixed and still load-bearing.**
A check that passes at one wall-clock time and fails at another, with no
code change, is a clock bug until proven otherwise.

## 5. 🎯 NEXT — the tail of the chain

`smoke-envelope-detail-section-errors` was entry 41. Remaining:
`smoke-envelopes-list-defensive-reads`, `smoke-client-error-capture`,
and the seven `smoke-debts-*`.

**Do `smoke-escape-hatches` first** (entry 34) — see §3a. It is worth
more than any single failing entry, because it is poisoning the ones
behind it.

**Priority order for the tail:**

1. **`smoke-escape-hatches`** (entry 34) — migrate to the fixture.
   Defuses the landmine for everything still on the shared user.
2. **Migrate the rest of the shared-user set.** These still sign in as
   `mom@compass.local` (grep for the password literal, not the email —
   the email appears in ~50 files as prose, which drowns the signal):

   ```powershell
   Select-String -Path "tests/*.mjs" -Pattern "correct-horse-battery-staple" |
     ForEach-Object { $_.Filename } | Sort-Object -Unique
   ```

   The real list, excluding `smoke-auth.mjs` (which legitimately
   *creates* mom) and the untracked `tests/_debug-*.mjs` scratch files:

   - `smoke-escape-hatches.mjs` — entry 34, **the landmine**
   - `smoke-onboarding-chat-escape.mjs`
   - `smoke-envelopes-list-defensive-reads.mjs`
   - `smoke-client-error-capture.mjs`
   - `smoke-debts-{tier,interest,utilization,rainbow,interactive,mobile,cross-extra}.mjs`

   (`smoke-envelope-detail-section-errors.mjs` and
   `smoke-envelope-detail-null-planet.mjs` are now migrated.)

   **The seven `smoke-debts-*` are source-regex only** — they cannot
   catch a wrong number until debts get a persistence model. That is a
   product decision for xKryptic, not a unilateral start.

3. **Audit the remaining negative assertions for vacuous passes.** §3a.
   A `!html.includes(...)` check passes just as happily on a login page
   as on a working page. Ask what page it would pass on if the feature
   were entirely absent.
4. Then the tail itself, which is expected to be quick.

Note: `tests/_debug-insights.mjs`, `_debug-insights2.mjs`,
`_debug-login.mjs`, `_check-user.mjs` and `_cleanup-alloc.mjs` are
untracked scratch. Do not stage them; delete them with the recoverable
launcher when convenient.

Two other known-open items, unchanged:

- **The `smoke-setup-wizard` live walk-through still reports
  `step 4 (bills) did not advance SetupState.completedStep`.** It is a
  non-gating `[warn]`. The old briefing blamed the missing-`SetupState`
  row; that is **wrong** — the missing row was the P2025 crash, fixed.
  `saveBillsAction` calls `markStepCompleted` unconditionally
  (`src/app/setup/actions.ts:222`), so if the action runs the step must
  advance. Untested hypothesis: the walk-through's `callStep` posts an
  empty `FormData` with a bare `Next-Action` header, whereas the
  fixture's own helper (`tests/fixture.mjs:573`) uses the
  `$ACTION_REF_1` + `$ACTION_1:0` bound-action encoding. **Measure this
  before naming it** — it is a best-effort path, not a product bug yet.

## 6. Pre-flight

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -3                    # 8ed91f4, 05e64e8, 7ee48ee
pnpm tsc                                # exit 0
pnpm lint                               # exit 0
pnpm dev                                # REQUIRED before any HTTP smoke
```

Verify: `Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing`
→ `"status":"ok"`, `checks.db.ok: true`.

A dev server from a *previous* session may still be running on :3000
(Next.js prints "Another next dev server is already running" and exits
1 if you start a second). Check first; reuse it.

Background `pnpm dev` tasks get reaped in this environment. If health
fails, restart it before believing any HTTP smoke.

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
5. `src/lib/setup/state.ts` — `getNextStep` is the contract the
   7.38-B1 checks encode.

## 8. Stop conditions

- **Check `gh run list` before believing any status.** This repo has a
  documented history of six weeks of "all green, ~1,580 checks" claims
  while CI failed 60 consecutive runs. Runtime is the tell.
- **Do not skip or weaken assertions to make a suite green.** Every fix
  in this session either restored something the assertion already
  demanded, or corrected the assertion to the contract the product
  actually documents. None removed a check — `smoke-ui-dashboard-db`
  went from 9 to 11 checks while going green.
- **Do not name a cause before measuring it.** Two predecessor sessions
  produced confident wrong diagnoses; this session's briefing named a
  cause for a warning that had a different cause. Write a throwaway
  probe that prints the real markup. That is what cracked all three
  walls in minutes.
- **A red check may mean the assertion is stale, not the code.** See §3.
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
  `git commit -F`.



---

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

