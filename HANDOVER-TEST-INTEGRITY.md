docs(handover): the budgeting loop is persisted and automatic; hand off

Supersedes the previous briefing in this file. The test tail is done AND
the budgeting side has moved from "never worked" to "persisted, guarded,
and triggered automatically."

═══════════════════════════════════════════════════════════════════════
## (a) COMPLETED WORK
═══════════════════════════════════════════════════════════════════════

Shipped (all pushed to `main`, all CI-green):

| Commit | What |
|---|---|
| `09efb0a` | Defused the `smoke-escape-hatches` landmine; cleared wall 8; fixed a vacuous pass |
| `066270e` | **Product bug** — `toDisplayDebt` dropped `creditLimitCents`; migrated the 7 debts smokes to the fixture |
| `1677415` | **Product bug** — `(app)/not-found.tsx` leaked legacy tokens into every page's RSC payload |
| `5bf1232` | Debts persisted (Debt model + `liveDebtsFromDb` + transactional writes) |
| `35aeafa` | Third-time-stale debt-reader assertion, fixed at the intent not the name |
| `7266bad` | **Persisted the paycheck allocation engine**; mounted `PaycheckSimulator` |
| `935b8fb` | Fixed a regression I caused (hardcoded vessel names in the new card) |
| `1fff191` | **Persisted transactions** — the last entity on the in-memory store |
| *uncommitted at handoff* | Automatic paycheck trigger + fixture PaySchedule + this handover |

**CI is green** on `36829232662` and `36840537868` (13m+ each, full pipeline
across all four chains). It has been green for several consecutive runs.

### Three real product bugs found — none of them visible to the old suite

1. **`toDisplayDebt` dropped `creditLimitCents`.** So `utilizationPct` was
   always null and the utilization caption, gauge and rainbow gradient
   (Clusters 7.48/7.49/7.50) **had never rendered for any user**.
2. **`(app)/not-found.tsx` used legacy tokens.** Next serializes the error
   boundary into the RSC payload for every `(app)` route, so one
   un-migrated 404 card leaked `var(--surface)`/`var(--line)` into every
   page's payload.
3. **The allocation engine wrote to a process-local store** while every
   page read Postgres. Measured before the fix: **7/7 envelopes moved in
   memory, 0/7 in the database.**

### And two of the core flows were unreachable entirely

- `PaycheckSimulator` was written in Cluster 1.8 and **never imported
  anywhere**. The engine had no reachable UI.
- `Transaction` rows went only to the in-memory store: **0 rows in
  Postgres, 6 in memory**, all six rendered on `/transactions`, all six
  gone on restart.

### What is now durable

Envelopes, bills, goals, accounts, allocation plan, debts, paycheck
allocation, transactions. **Nothing on a user-facing path reads
`globalThis.__COMPASS_STORE__` any more.**

═══════════════════════════════════════════════════════════════════════
## (b) NEXT — THE RANGE
═══════════════════════════════════════════════════════════════════════

Against xKryptic's own 10-item roadmap:

| # | Item | State |
|---|---|---|
| 1 | Tests | ✅ done, and now trustworthy |
| 2 | End-to-end budgeting | ⚠️ **substantially advanced, not done** |
| 3 | State consistency | ⚠️ partial — persistence is real, canonical state is not |
| 4 | Canonical state | ❌ not started — no `FinancialState` symbol exists |
| 5 | State-aware rules | ❌ `AllocationRule` is `pct` + `fixedCents` only |
| 6 | Rule conflicts | ❌ no priority resolution |
| 7 | Edge cases | ❌ no shortfall model |
| 8 | Deterministic execution | ⚠️ **partially done** — `PaycheckRun` guards the paycheck; nothing guards rebalance/bills |
| 9 | Explainability | ⚠️ partial — audit rows exist; no per-decision "why" |
| 10 | Zero-touch paycheck test | ✅ **done** (`smoke-auto-paycheck`, 10/0) |

**The next RANGE, in order:**

**1. Land and confirm the automatic trigger** (if it is not yet pushed and
   green). It is written and locally green at 10/0; the commit + CI verdict
   is the last thing this session did. See §5 "Stop conditions" for what
   to do if CI is red.

**2. Verify transaction restart-survival.** Debts were proven across a
   0-node teardown. Transactions were NOT — they are structurally durable
   (rows in Postgres, page reads Postgres) but that is an argument, not a
   measurement. Do the same two-phase test used for debts.

**3. Canonical state (item 4).** This is the real next feature. `Debts`,
`Transactions`, `Bills`, `Goals`, `Envelopes` all have their own readers
and each page assembles its own picture. A single
`src/lib/financial-state.ts` that derives obligations, buffer, shortfall
and safe-to-spend once is the highest-leverage remaining work — and it is
the precondition for items 5, 6, 7, 9.

**4. State-aware rules (item 5).** `AllocationRule` cannot express a
condition. Adding `mode`/`value`/`priority` columns was considered and
rejected — `livePlanFromDb`'s reverse mapping already round-trips all
three modes including `remainder`. Re-verify before changing the schema.

**5. Idempotency for the OTHER writers (item 8).** `PaycheckRun` guards
the paycheck. `rebalanceEnvelopes` and bill execution are guarded only by
`prisma.$transaction` atomicity, not by a uniqueness constraint. The
VAULT is the working precedent: `@@unique([providerName, idempotencyKey])`.

═══════════════════════════════════════════════════════════════════════
## (c) PICKUP BRIEFING
═══════════════════════════════════════════════════════════════════════

### Pre-flight

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -3
gh run list --limit 2          # ← CI is the arbiter. Check it FIRST.
pnpm tsc                        # exit 0
pnpm lint                       # exit 0 (543 warnings, 0 errors is the baseline)
pnpm dev                        # REQUIRED before any HTTP smoke
```

Verify health:
```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing
```

**The Prisma CLI needs the DB URL explicitly.** `prisma.config.ts` reads
`process.env.DATABASE_URL`, which the CLI does NOT auto-load from
`.env.local` (and the compose port 5433 is not the live DB — native PG is
on **5432**):

```powershell
$l = (Get-Content .env.local | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1)
$env:DATABASE_URL = ($l -replace '^DATABASE_URL=','').Trim('"').Trim("'")
pnpm exec prisma db push
pnpm exec prisma generate
```

### The test harness contract

- Tests importing `tests/fixture.mjs` OR `../src/` must run under
  `tsx --conditions=react-server`. Do **not** hand-edit the chain — run
  `node scripts/fix-smoke-runners.mjs`, then verify it is idempotent.
- Server probe must be `GET /api/health` at **10s**. `GET /login` at 2s
  is a false negative on a cold dev server.
- `tests/fixture.mjs` provisions: account, 7 envelopes, goals, bills, 3
  debts, allocation plan, **and a biweekly PaySchedule** (added because
  the automatic trigger reads it and only the setup wizard created one).
- The fixture sweeps every `smoke-*` user on each `createFixture`. **Never
  create a fixture in a probe whose subject you are about to measure** —
  it will delete the evidence.
- `"use server"` modules cannot be imported from a test (pulls
  next/navigation → `_react.default.createContext is not a function`).
  Write logic lives in plain modules: `apply-paycheck.ts`,
  `log-transaction.ts`, `paycheck-scheduler.ts`.
- `tests/fixture.mjs`'s `post(path, fields, { actionId })` has **never
  been proven against a real bound server action** — it hardcodes action
  index 1 and `["$undefined"]`, while real pages use their own index and
  carry the useActionState previous state. Do not trust it.

### The encoding trap — cost real time

**Never rewrite a source file with PowerShell `Set-Content` without
`-Encoding UTF8`.** PS 5.1 writes the ANSI codepage. This silently turned
`.split(/[·\-]/)` into `.split(/[Â·\-]/)` inside a regex character class,
breaking `payeeKey`. No type error, no lint error, `tsc` green; the app
only 500'd with `invalid utf-8 sequence of 1 bytes`.

Use the editor tools for source. After any bulk rewrite, verify:

```bash
node -e "const fs=require('fs');new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync('PATH'))"
```

Recovery is `git checkout -- <file>` then re-apply — never patch mangled bytes.

### Stop conditions

- **Check `gh run list` before believing any status.** This repo has a
  history of six weeks of "all green, ~1,580 checks" while CI failed 60
  consecutive runs.
- **Read WHICH entry died, not the runtime.** `09efb0a` ran *shorter*
  (9m25s vs 9m54s) while getting further, because the chain moved from
  dying in a Playwright timeout to dying on a fast assertion.
- **A red check is not a bug report.** Measure the rendered value first.
  Three product bugs and six stale assertions were separated this way.
- **A negative assertion cannot distinguish "worked" from "never ran".**
  Guard it with a positive proof the page rendered.
- **A source-regex assertion pins a spelling, not a contract.** Two of
  them were stale for the third time this session.
- **Do not fake a safety guard.** `next start` refuses to boot without
  real production secrets; verify production behaviour read-only against
  the live deployment instead.

### Known open, deliberately not fixed

- **The (app) 404 renders an empty body on `pnpm dev`.** Next serves its
  global-error fallback (`<html id="__next_error__">`); there is no
  `global-error.tsx`. Confined to dev — the live deployment returns the
  card with no `__next_error__` document. The (app) case in production is
  still unverified (needs an authenticated request). **Do not add a test
  asserting a 404 body is visibly non-empty** — it fails against dev.
- **`PayPeriod` has no `userId`** — one global active row, and the
  roll-forward writes during a GET render. Two users would collide. The
  paycheck guard avoids depending on it by keying on the period's start
  date instead.
- **`detect-subscriptions` reads bills from `liveBillsFromDb` and
  transactions from `liveTransactionsFromDb`** — both durable now, but
  the whole module was async-ified in one pass and only smoke-covered
  indirectly.
- `tests/_debug-*.mjs`, `_check-user.mjs`, `_cleanup-alloc.mjs` are
  untracked scratch. Do not stage them.

═══════════════════════════════════════════════════════════════════════
## Files to read first

1. `tests/fixture.mjs` — the per-test user factory. Read its header.
2. `src/lib/apply-paycheck.ts` — the persisted engine + idempotency.
3. `src/lib/paycheck-scheduler.ts` — the automatic trigger.
4. `src/lib/mock.ts` — `live*FromDb` readers, and why they never auto-seed.
5. `src/lib/store.ts` — what is LEFT on the in-memory store (the advisor's
   read-only simulation still uses `runAllocation`; that is deliberate).
6. `tests/debt-value-assertions.mjs` — the real-value pattern the debts
   tests share. Extend this idea to other surfaces.

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

