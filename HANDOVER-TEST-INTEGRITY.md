docs(handover): the budgeting loop is persisted and automatic; hand off

Supersedes the previous briefing in this file. The test tail is done AND
the budgeting side has moved from "never worked" to "persisted, guarded,
and triggered automatically."

═══════════════════════════════════════════════════════════════════════
# 📎 SESSION 2 — 2026-10-02 — READ THIS FIRST
═══════════════════════════════════════════════════════════════════════

**The workspace moved. `cd C:\dev\compass` first.**

The old OneDrive path still exists on disk and is being KEPT on
purpose ("just in case"). It is stale. Do not work in it, do not read
state from it, and do not let a stale path in a doc send you there.
`C:\dev\compass` is a fresh clone and is the only working copy.

═══════════════════════════════════════════════════════════════════════
## (a) COMPLETED — 5 commits, all pushed, all CI-green
═══════════════════════════════════════════════════════════════════════

| Commit | What |
|---|---|
| `e056df2` | Repaired PowerShell double-encoding in 5 live files; added `scripts/scan-encoding.mjs` |
| `96fab73` | Moved the repo out of the OneDrive-synced folder; corrected every path reference |
| `dfbbb6c` | `pnpm build` EPERM measured as resolved — it was the cloud filesystem |
| `1afdc12` | `scripts/verify-prod-404.mjs`; the (app) 404 gap closed **as a live bug** |
| `facf66e` | CI: warm `/login` + `/welcome` before the smoke chain (cold-compile race) |

Latest CI: **`37000089746`, success, 13m21s**. Tree clean, 0 ahead.

### 1. A live user-facing rendering bug, found and fixed

Six files were double-encoded by `Set-Content` without `-Encoding UTF8`
— the same trap that broke `payeeKey`, and never fixed. It was **not**
comment-only:

- `goals/page.tsx` rendered `ðŸ›Ÿ Emergency` / `ðŸ“ˆ Invest`
  instead of `🛟` / `📈`
- every em-dash on **Goals** and **Envelopes** rendered as three
  garbage characters (`â€”`), every `·` separator as `Â·`

No smoke asserts on a dash or a middot — they assert on `$4,820.00`
and `24.99% APR` — which is how a green suite sat on top of it.

**The prescribed guard could not see this class.** A double-encoded
file is *valid UTF-8*; the bytes were re-encoded, not corrupted. So
`TextDecoder(fatal:true)` passes on all six while they are broken.
`scripts/scan-encoding.mjs` keys on the structural signature instead
(accented Latin-1 letter immediately followed by a cp1252 punctuation
codepoint) and exits 1. **Not wired into CI — that is a pipeline
decision and still open.**

Repair verified two ways: characters by codepoint, and with non-ASCII
stripped, 5/5 files byte-identical to HEAD — so it provably touched
nothing but characters. `tsc` 0, lint 0 errors.

### 2. Item 2 of the range: measured, not argued

`scripts/prove-transaction-restart.mjs`, **13 pass / 0 miss / 0
skipped**, across a real teardown (3 node processes killed, 0
remaining, cold start). Rows identical on id/amount/envelopeId/date;
`liveTransactionsFromDb` returns them; vessel balance survives
(61200 → 54288); the cold server renders them on `/transactions`.

The assertion that makes it mean something:
`globalThis.__COMPASS_STORE__` had **no entry at all** for that user,
so the data provably came from Postgres, not a re-seeded memory store.

The page render is conditional on a reachable server and reports SKIP
rather than a pass when there isn't one. The first run scored
10/0/**1-skip** for that reason; the cycle was re-run rather than leave
the skip standing.

### 3. The repo moved out of OneDrive

`C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget
planner app` → **`C:\dev\compass`**. Cloned fresh at `e056df2`,
`.env`/`.env.local` copied by hand with contents never printed.

Measured on the same machine:

| | OneDrive | `C:\dev\compass` |
|---|---|---|
| `pnpm tsc` | >300s, killed twice | **76.2s** |
| `next dev` ready | 93s, then wedged at 0% CPU | **17.2s** |
| `/api/health` | hung >120s, then 500 | **200 in 16.6s** |
| `pnpm build` | EPERM on `.next` | **exit 0 in 177.6s** |

OneDrive Files On-Demand never hydrates `node_modules/.pnpm`, and
Turbopack reads through the `\\?\` prefix which does not trigger
recall — so reads fail with `os error 389`, or `errno: -4094 /
syscall: read / code: 'UNKNOWN'`. **"Always keep on this device" is
not a sufficient fix** — verified, not assumed: it cleared the 500s
but left 20,889 files `Offline`, 20,858 inside `.pnpm`. Diagnose by
counting `Offline`, not `RecallOnDataAccess` — the latter reads 0
while 20k files are still offline.

### 4. The production verification path now works

`pnpm build` completing reopened it. `NODE_ENV=production
COMPASS_SANDBOX=1 pnpm start` boots clean (`Ready in 9.8s`) — the
sandbox flag is the project's own documented operator opt-in, not a
faked guard, and production never sets it.

### 5. A pre-existing CI flake, fixed at the source

Run `36998303068` died at 1m47s: the chain is `&&`-chained from
`smoke-auth.mjs`, and its first `/login` hit got a 500 from a cold
compile. CI declared the server ready on `/api/health` (tiny) while
`/login` and `/welcome` (heavy) compile on demand. **A fast red is a
cold-compile race, not a decisive failure.** `facf66e` warms both
before the chain. The test was left alone deliberately — teaching it
to tolerate a 500 would hide real failures elsewhere.

═══════════════════════════════════════════════════════════════════════
## (b) NEXT — THE RANGE
═══════════════════════════════════════════════════════════════════════

**1. ~~Fix the blank (app) 404~~ — NOT A BUG; closed 2026-10-03.** This was
item 1 of the range on 2026-10-02 and it was wrong. The "blank page" was an
artifact of measuring pre-hydration HTML on a client-bootstrap shell; in a
real browser the 404 card renders correctly (verified, with a screenshot and
a negative control). No product code was changed. The actual defect was in
`scripts/verify-prod-404.mjs`, which asserted something no correct build
could satisfy; it is now rewritten to assert in a browser, and proven able to
go red. See "✅ RESOLVED 2026-10-03" further down. **Do not spend another
session on this.**

**2. Canonical state (roadmap item 4).** The real feature.
`Debts`, `Transactions`, `Bills`, `Goals`, `Envelopes` each have their
own reader and each page assembles its own picture. One
`src/lib/financial-state.ts` deriving obligations, buffer, shortfall
and safe-to-spend once is the precondition for items 5, 6, 7 and 9.
Give this an uninterrupted block.

**3. Wire `scripts/scan-encoding.mjs` into CI.** One line, prevents
the fourth recurrence of a bug class the current guard cannot see.

**4. State-aware rules (item 5).** `AllocationRule` is `pct` +
`fixedCents` only. Adding `mode`/`value`/`priority` was considered and
rejected — `livePlanFromDb`'s reverse mapping already round-trips all
three modes including `remainder`. Re-verify before changing schema.

**5. Idempotency for the OTHER writers (item 8).** `PaycheckRun`
guards the paycheck. `rebalanceEnvelopes` and bill execution are
guarded only by `prisma.$transaction` atomicity, not a uniqueness
constraint. The VAULT is the precedent: `@@unique([providerName,
idempotencyKey])`.

**6. `PayPeriod` has no `userId`.** One global active row; two users
would collide. Not a scaling concern — a data-corruption one at two
users. First thing to fix before a second person signs in.

═══════════════════════════════════════════════════════════════════════
## (c) PICKUP BRIEFING
═══════════════════════════════════════════════════════════════════════

### Pre-flight — note the path

```bash
cd "C:\dev\compass"          # NOT the OneDrive path
git log --oneline -3
gh run list --limit 2        # ← CI is the arbiter. Check it FIRST.
pnpm tsc                      # expect ~76s, exit 0
pnpm lint                     # 0 errors is the bar
pnpm dev                      # REQUIRED before any HTTP smoke
```

Health (the chain contract's probe, 10s):

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing
```

**The Prisma CLI needs `DATABASE_URL` explicitly** — `prisma.config.ts`
reads it, but the CLI does not auto-load `.env.local`:

```powershell
$l = (Get-Content .env.local | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1)
$env:DATABASE_URL = ($l -replace '^DATABASE_URL=','').Trim('"').Trim("'")
pnpm exec prisma db push
pnpm exec prisma generate
```

### The harness contract

- Tests importing `tests/fixture.mjs` OR `../src/` must run under
  `tsx --conditions=react-server`. Do **not** hand-edit the chain —
  run `node scripts/fix-smoke-runners.mjs`, then verify idempotent.
- Server probe is `GET /api/health` at **10s**. `GET /login` at 2s is
  a false negative on a cold dev server.
- `tests/fixture.mjs` sweeps every `smoke-*` user on each
  `createFixture`. **Never create a fixture in a probe whose subject
  you are about to measure** — it deletes the evidence.
  `loginExisting(email, password)` is the no-sweep login, added this
  session for exactly that reason. **`s.login.status` is part of the
  contract** — ~30 smokes log it and `smoke-change-password` asserts
  it is 303.
- `"use server"` modules cannot be imported from a test. Write logic
  lives in plain modules: `apply-paycheck.ts`, `log-transaction.ts`,
  `paycheck-scheduler.ts`.
- `tests/fixture.mjs`'s `post(path, fields, { actionId })` has **never**
  been proven against a real bound server action — it hardcodes action
  index 1 and `["$undefined"]`. Do not trust it.

### Two commands this session added

```bash
# restart-survival, two phases around a teardown
node scripts/prove-transaction-restart.mjs write
#   kill every node process; cold-start the server
node scripts/prove-transaction-restart.mjs read

# production (app) 404 — needs a prod server:
pnpm build
NODE_ENV=production COMPASS_SANDBOX=1 pnpm start   # separate shell
pnpm exec tsx --conditions=react-server scripts/verify-prod-404.mjs
```

`verify-prod-404.mjs` is **production-only by design**: it gates on
`/api/health` reporting `env: "production"` and exits `SKIP-ENV`
otherwise. **Do not move its assertions into the smoke chain** — they
cannot pass against dev, which is exactly why this gap survived
`daabae5`.

### The encoding trap — and the corrected guard

**Never rewrite a source file with PowerShell `Set-Content` without
`-Encoding UTF8`.** PS 5.1 writes the ANSI codepage. That has broken
this repo **four times**, twice in live JSX.

The old check was:

    node -e "new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync('PATH'))"

**It cannot catch this class** — a double-encoded file is valid UTF-8.
Use the structural check:

```bash
node scripts/scan-encoding.mjs .    # exits 1 on a hit
```

Expect **two** hits on a clean tree, in one category. **Do not "fix"
any of them:**

| File | Why it hits | If you "fix" it |
|---|---|---|
| `HANDOVER-TEST-INTEGRITY.md` (10 runs) | Quoting the corruption it documents. | Docs get unreadable. |
| `COORDINATION.md` (2 runs) | Same, in the status summary. | Same. |

**Changed 2026-10-04: this used to be three files / 144 runs.** The third
was `HANDOVER.md` (132 runs) — genuinely corrupt, and the one real
outstanding item on this page. It has now been repaired and archived to
`docs/archive/handovers/HANDOVER-2026-09-26.md`. The repair was
**per-run and keyed to the scanner's own lead/follower tell**, not a
whole-file re-decode: a blanket cp1252→UTF-8 reversal silently destroys
correctly-encoded text (Node's `latin1` truncates codepoints above
U+00FF instead of throwing, so a real `—` becomes `0x14`). That is what
wrecked this file and `COORDINATION.md` when an automatic repair was
tried on them earlier. **These two are quotations — repairing them would
delete the documentation, so they stay.**

**Changed 2026-10-03: this used to be four.** The fourth was
`scripts/verify-prod-404.mjs`, which hit because it *searched for* `â€”`
to assert the mojibake was absent — a detection-required hit where
removing the literal would have deleted the guard. That file was rewritten
(its assertions now run in a browser) and no longer contains the literal,
so the detection-required category is now empty. **If a fourth
detection-required hit ever reappears, the same rule applies: check
whether removing the literal guts the check before "cleaning" it.**

If a hit appears in a file **not** on that list, that one is real.
Recovery for a real one is `git checkout -- <file>` and re-apply —
never patch mangled bytes.

### Stop conditions

- **Check `gh run list` before believing any status.** This repo has a
  history of long green stretches while CI was actually failing.
- **Read WHICH entry died, not the runtime.** A run that dies in
  ~1m50s died on an early assertion; a 13m run died deep. `facf66e`
  exists because that distinction was read wrongly for a while.
- **A red check is not a bug report.** Measure the rendered value
  first. Three product bugs, six stale assertions, one bad
  `global-error.tsx` fix and one false token-leak report were all
  separated this way in a single session.
- **A negative assertion cannot distinguish "worked" from "never
  ran".** Guard it with positive proof the page rendered.
- **A source-regex assertion pins a spelling, not a contract.** Two
  were stale for the third time in one session.
- **Strip `<script>` before matching an RSC page.** The same sentence
  exists twice — once rendered, once escaped in the flight payload. A
  match on the payload is not a rendered value.
- **Do not fake a safety guard.** Use `COMPASS_SANDBOX=1` — the
  project's own documented operator opt-in — or verify read-only
  against the live deployment.
- **A document's `__next_error__` marker is not a defect.** It
  identifies the error path. The defect is an EMPTY body.

### Known open, deliberately not fixed

- **TICKET — the production health gate has no automated coverage.** CI
  (`.github/workflows/ci.yml:48,91`) runs the smokes against `pnpm dev`
  with `NODE_ENV: "development"`, so `isProd` in
  `src/app/api/health/route.ts` is **always false** in CI. That single
  flag decides three things the suite therefore never exercises:
  1. `validateProdEnv()` — the env subsystem is stubbed to `{ok:true}`
     outside production, so a bad prod env cannot fail a build here.
  2. `allOk` requires `ai.ok` — in dev only `dbPing` is required, so a
     broken AI provider still reports healthy.
  3. The vault `prodReady` gate — enforced only when `VAULT_ENABLED=1`
     (added 2026-10-06). No CI run can prove `compass` stays fail-loud
     while `compass-mom` returns 200.
  **Consequence:** every prod-only health behaviour is verified by hand
  against a live deployment or not at all. This is exactly how
  `compass-mom` sat at **503 for days** while CI stayed green.
  **Suggested fix:** a unit-level test that imports the route's gate
  logic and drives it across the truth table — `{NODE_ENV,
  VAULT_ENABLED, VAULT_CHAIN_ID, VAULT_SAFE_SIGNER_PRIVATE_KEY}` —
  asserting the status code. No server, no Vercel, seconds to run.
- **The (app) 404 is NOT blank — the 2026-10-02 claim was wrong.** Measured
  in a real browser 2026-10-03: the card renders, with a working CTA. The
  blank reading came from stripping `<script>` out of a client-bootstrap
  shell. The probe that asserted it was rewritten; the app was never
  touched. See "✅ RESOLVED 2026-10-03" below.
- **`/transactions` and friends still use `--surface` / `--line`.**
  These are **defined** (`globals.css:110-112`) and render correctly —
  it is an un-migrated-token consistency gap, not a break. The chain's
  `smoke-visual-finish` audits the **dashboard**, not every page.
- `PayPeriod` has no `userId` — see range item 6.
- `TODAY` is module-scope, so a long-lived dev server goes stale
  across midnight. Accurate on Vercel (cold start per deploy).
- `detect-subscriptions` was async-ified in one pass and is only
  smoke-covered indirectly.
- `scripts/clear-demo-data.mjs` has **never been run against
  production** — needs an operator with the production
  `DATABASE_URL`. Dry run first, then `--confirm`.

═══════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════
# 📎 SESSION 2026-10-01 (late) — item 2 MEASURED, plus a live rendering bug
═══════════════════════════════════════════════════════════════════════

Everything below §"NEXT — THE RANGE" is still true except where noted.
This section records what changed and, more importantly, the one
environment fact that will cost a future session an hour if it is not
known.

## What was completed

**1. Item 1 of the range is landed and CI-confirmed.** `777307b`
("apply the armed plan automatically when a paycheck arrives") — run
`36851618281`, success, 13m41s. Item 1 is closed.

**2. Item 2 is now MEASURED rather than argued.** This is the gap the
previous session flagged as "structurally sound but unmeasured".

`scripts/prove-transaction-restart.mjs` (new, committed-ready) is a
two-phase probe. Phase 1 runs in one process, writes three distinctive
transactions through the REAL write path (`logTransactionToDb`), and
exits. Phase 2 runs in a **different process** and re-reads.

Result: **13 pass / 0 miss / 0 skipped.** No skips — the first run of
this probe reported 10/0/**1 skip** because the dev server was
unavailable at the time; the page-render half was then closed by
re-running the whole cycle against a working server. A skip reported
honestly is a task left open, not a task passed.

The full cycle, as run:

    # phase 1 — pid 46072
    node scripts/prove-transaction-restart.mjs write
    # teardown: 3 node processes killed, 0 remaining, port 3000 free
    # cold start, then:
    # phase 2 — pid 41292
    node scripts/prove-transaction-restart.mjs read

- 3 rows survived the process boundary, identical on id, amount,
  envelopeId and date.
- `liveTransactionsFromDb` — the reader every page uses — returned all 3
  in the fresh process.
- **`globalThis.__COMPASS_STORE__` had no entry at all for that user**,
  so the data demonstrably came from Postgres rather than from a
  re-seeded memory store. This is the assertion that makes the result
  mean something.
- The vessel balance survived too: 61200 -> 54288, i.e. the ledger and
  the vessel agree after the restart, not just the ledger.
- The cold-started server rendered all three on `/transactions`
  (92,092 bytes), with a positive control on document size so the
  three matches could not be satisfied by an empty or error page.

Running it is two commands around a teardown:

    node scripts/prove-transaction-restart.mjs write
    # kill every node process; cold-start the server
    node scripts/prove-transaction-restart.mjs read

**The page render is conditional on a reachable server, by design.** If
the server is down the probe still measures durability and reports the
render as `SKIP` — never as a pass. `SMOKE_PROBE_TIMEOUT_MS` raises the
health-probe budget, which matters here because a cold `/api/health`
compile measured 64.7s on this box while the chain contract assumes
10s.

**3. A LIVE USER-VISIBLE BUG, found while doing the above.** Six files
had been double-encoded by a PowerShell `Set-Content` without
`-Encoding UTF8` — the same corruption that broke `payeeKey`, except
this time it was never fixed. It was not comment-only:

| File | Was rendering as | Should be |
|---|---|---|
| `src/app/(app)/goals/page.tsx` | `ðŸ›Ÿ Emergency` | `🛟 Emergency` |
| `src/app/(app)/goals/page.tsx` | `ðŸ“ˆ Invest` | `📈 Invest` |
| `src/app/(app)/goals/page.tsx` | `—` (3 garbage chars) | `—` |
| `src/app/(app)/envelopes/page.tsx` | `—`, `Â·` | `—`, `·` |
| `src/app/setup/envelopes/page.tsx` | `—` | `—` |

Every em-dash on the Goals and Envelopes pages rendered as three
visible garbage characters, and the goal-kind badge rendered as mojibake
instead of an emoji. Repaired in all six files
(`goals/page.tsx`, `envelopes/page.tsx`, `setup/envelopes/page.tsx`,
`tests/fixture.mjs`, `tests/smoke-reset-seed.mjs`,
`scripts/clear-demo-data.mjs`); characters verified by codepoint, not by
eyeball. Diff is symmetric (83/83) — encoding only, no logic touched.

**The suite cannot see this class of bug**, which is the point. No smoke
asserts on a dash or a middot; they assert on `$4,820.00` and
`24.99% APR`. A 1,500-check green suite and a page full of `â€”` are
fully compatible.

### ⚠ THE PRESCRIBED ENCODING CHECK IS NOT SUFFICIENT — READ THIS

The previous session's verification was:

    node -e "...new TextDecoder('utf-8',{fatal:true}).decode(...)"

**That check passes on double-encoded files.** A double-encoded file is
perfectly valid UTF-8; the bytes were re-encoded, not corrupted. All six
files above pass the fatal-decode check and were still broken.

The check that actually catches it is structural: a mis-decode always
leaves an accented Latin-1 letter (U+00C2–U+00F4) immediately followed by
a cp1252 punctuation codepoint (U+0080–U+00BF, U+20AC, U+201A–U+201E,
…). A correctly authored em-dash is ONE codepoint and does not match.
`scripts/scan-encoding.mjs` (new, committed) implements exactly that and
exits 1 on a hit, so it can gate CI. **Wiring it into the workflow is
the one recommendation here that needs your call** — it is a pipeline
change, not a code fix.

**Expect two hits and do not "fix" them.** Both are docs *quoting* the
corruption they describe; that is correct behaviour, and the fix is to stop
embedding examples, not to silence the check. There is no longer an
outstanding corruption item: `HANDOVER.md` (132 runs) was repaired and moved
to `docs/archive/handovers/HANDOVER-2026-09-26.md` on 2026-10-04. (A fourth,
detection-required hit used to live in `scripts/verify-prod-404.mjs` and is
gone as of 2026-10-03 — see the table above.)

## 🚨 THE ENVIRONMENT FACT THAT WILL COST YOU AN HOUR

**`pnpm dev` cannot serve this project on this machine.** Two distinct
causes, both found this session:

**(a) A stale `.next/dev` cache makes the server appear to hang.** It
printed `Ready in 93s` and then accepted connections while using 0% CPU
— a deadlock, not slow compilation. Deleting `.next/dev` fixed it
(`Ready in 10.5s`). The project's own `scripts/smoke-server.mjs` warns
about mixing caches; it understates the symptom. **If `next dev` is
"ready" but never answers, delete `.next/dev` and restart.**

**(b) OneDrive Files On-Demand breaks Node's extended-path reads.**
**RESOLVED 2026-10-02 by moving the repo to `C:\dev\compass`.** Kept
here because the symptom recurs if anyone moves it back, and because it
reads like a code bug when it isn't. The repo was OneDrive-backed, and
unhydrated files failed:

    Error: Reading source code for parsing failed
    Caused by: The cloud operation was unsuccessful. (os error 389)

`os error 389` is the cloud-files filter failing to hydrate a
placeholder. `node_modules/.pnpm/next@16.3.6_.../next/headers.js`
carried `RecallOnDataAccess` (0x400000), and Turbopack reads through the
`\\?\C:\...` extended-length prefix, which does NOT trigger the recall —
so the read simply fails, and every route that touches it 500s. It
surfaced as a health check that hung for 120s, then as a 500 on
`/api/health` and `/login`.

**"Always keep on this device" is NOT a sufficient fix — verified, not
assumed.** Applying it took the server from `Ready in 93s` to 20s and
cleared the 500s, but **20,889 files were still `Offline` afterwards,
20,858 of them inside `node_modules/.pnpm`.** OneDrive does not hydrate
a pnpm content-addressed store (which is hardlinked), so reads there
kept failing under a different error code: `errno: -4094,
syscall: 'read', code: 'UNKNOWN'`. Do not read that code as a different
problem.

**Diagnose it by counting `Offline` files, not by reading
`RecallOnDataAccess`** — that attribute reads 0 while 20k files are
still offline, which is exactly the false "all clear" that sent this
search down the wrong path. The fix is structural: keep the working
tree out of any cloud-synced folder, and let OneDrive hold only the
docs and deliverables.

Also note: `.next/dev` is 197 MB / 329 files here, so deleting it costs a
slow re-compile. Do it only when the server is actually wedged.

## Harness change

`tests/fixture.mjs` gained **`loginExisting(email, password)`** — a login
that creates no user and, critically, **runs no sweep**.
`createFixture` calls `sweepStaleFixtures`, which deletes every `smoke-*`
user, so a probe that logs in via `createFixture` to inspect evidence
deletes the evidence and then reports a clean pass on an empty account.
This is the trap the previous session wrote into the stop conditions; the
function is how you get past it safely.

The cookie-jar client and the login sequence were extracted into
`openClient()` / `authenticate()` so both entry points share them.

**Caught before it shipped:** the extraction initially dropped
`login.status`, which ~30 smokes log and which
`smoke-change-password.mjs` **asserts** (`=== 303`). Restored —
`authenticate` returns `{ actionId, status }`. If you refactor this file
again, grep `login.status` first.

## What is NOT verified

- **`tsc` / `lint` on the repaired files** were still running when this
  was written (this box is very slow under OneDrive). Run both before
  trusting the repair. NOTE: do not run them while killing stray node
  processes — a blanket `Stop-Process` on node takes tsc with it, which
  cost two attempts this session.
- **No full smoke chain was run against the repaired tree.** The
  fixture refactor was verified two ways — statement-by-statement
  equivalence against HEAD, and a live `POST /login 303` through
  `loginExisting` during the probe — but not by running a
  `loginAsFixture` smoke end to end. Run at least
  `smoke-transactions-persist` and `smoke-change-password` (the latter
  asserts on `login.status`) before trusting the harness change.
- Items 3, 4 and 5 of the range are **not started**. Canonical state
  (`FinancialState`) still does not exist.

## Working tree state

Modified (uncommitted): the six repaired files + `fixture.mjs`.
Untracked and intended: `scripts/prove-transaction-restart.mjs`.
Untracked scratch, **do not stage**: `.tmp.driveupload/`, `.codex-screen/`,
`_dev-start.cmd`, `dev7.err`, `preview-login.png`, `videos/`,
`design/vision.docx`, `compass logo.jpg`.

**Nothing has been committed or pushed this session.** The mojibake fix
is a real user-facing bug fix and is worth landing on its own, with the
restart probe alongside it.

═══════════════════════════════════════════════════════════════════════

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

**2b. ~~FIX THE BLANK (app) 404~~ — RESOLVED 2026-10-03; it was not a bug.**
This was believed to be a live, user-facing defect. It is not. The (app) 404
renders correctly in a real browser; the blank reading was an artifact of
measuring pre-hydration HTML, and `global-error.tsx` "not working" was a
consequence of chasing that artifact. The only real defect was in the probe
itself, now fixed and proven able to fail. See "✅ RESOLVED 2026-10-03"
below.

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
cd "C:\dev\compass"
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

## ✅ RESOLVED 2026-10-03: the (app) 404 is NOT blank. The guard was wrong.

**The bug described below did not exist.** The 2026-10-02 section claimed
"a user following a stale link inside the app sees a blank page," derived
by stripping `<script>` out of the server HTML and finding 26 visible
characters. Measured in a real browser on 2026-10-03, same production
build, authenticated:

    status                  404                             <- correct
    eyebrow                 "[404] NOT FOUND"  (visible)
    <h1>                    "That page doesn't exist."
    back-to-dashboard CTA   present, href="/"
    a REAL envelope id      200, real content, no card     <- negative control

Screenshot confirmed the full Compass chrome, the `[404] NOT FOUND`
eyebrow, the heading, the explanation, and a working `BACK TO DASHBOARD`
button. **No product code was changed. There was nothing to fix.**

### Why the HTML-only measurement was structurally doomed

`notFound()` makes Next emit an **error-path document**: root
`<html id="__next_error__">`, and a body holding one empty placeholder
plus the RSC flight payload inside `<script>`:

    <div hidden=""><!--$--><!--/$--></div>

That is a **client-bootstrap shell**. The not-found element is serialized
correctly — it sits in the flight payload under the layout router's
`notFound` slot, beside `E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}` —
and is rendered on the client after hydration. Strip the scripts and you
have measured a shell, not a page. **Any assertion of the form "the card
must be in the pre-hydration HTML" fails against a WORKING build by
construction.**

So "26 visible characters" was a true measurement of the wrong thing.

### What was actually wrong: the guard, not the app

`scripts/verify-prod-404.mjs` ended with two assertions that could never
pass ("the 404 card is VISIBLE...", "the 404 page has real visible
text..."). Both measured pre-hydration HTML. They sat **red against a
healthy build**, which is what made the phantom bug look real, and why
the `global-error.tsx` experiment below appeared to "fail".

Rewritten 2026-10-03 to measure visibility where the question has a
truthful answer (a real browser, after hydration), covering both 404
paths (bad id inside the shell, and a URL matching no route at all) plus
a negative control so a probe that painted the card on every route could
not pass. **12 pass / 0 miss.**

**The guard is proven able to fail**: with the card deliberately stubbed
to `return null`, 5 checks went red (eyebrow, heading, CTA, and both
wiring checks). A guard that cannot fail is not a guard.

### Ruled out by measurement, do not re-try

- **Do not retry `global-error.tsx`.** It "did not work" because there was
  nothing to work on. The underlying observation was real —
  `global-error` is genuinely not consulted for the `notFound()` path,
  since the document root stays `<html id="__next_error__">` — but the
  conclusion drawn from it was not.
- **The inherited-Suspense hypothesis is DISPROVED, not untested.**
  `daabae5` moved `loading.tsx` off the (app) group root onto 14 primary
  nav segments, leaving `envelopes/` and `goals/` without one, and the
  hypothesis was that a boundary inherited under `/envelopes/[id]`
  swallows `notFound()`. It does not. The card renders.
- **The `1677415` token guard is CLEAN in production.** On the dashboard:
  `--vessel-dark` 31, `--vessel-surface` 78, `--vessel-border` 208,
  `--vessel-accent` 138 occurrences; and `--cosmos`, `--surface`,
  `--line`, `--line-soft`, `--terminal-cyan`, `--warn`, `--neg` all
  **0**. That fix holds.
- **`--surface` / `--line` are NOT broken tokens.** They are defined at
  `src/app/globals.css:110-112` and used by un-migrated components on
  pages like `/transactions`. An earlier version of the probe reported
  them as a leak and was wrong on both scope and premise: the chain's
  `smoke-visual-finish` audits the **dashboard**, not every page.

### How to re-check

    pnpm build
    NODE_ENV=production COMPASS_SANDBOX=1 pnpm start
    pnpm exec tsx --conditions=react-server scripts/verify-prod-404.mjs

Expect **12 pass / 0 miss**. The probe is **production-only by design**
and gates on `/api/health` reporting `env: "production"`. Against dev it
exits `SKIP-ENV`. **Do not move it into the smoke chain** — it needs both
a production build and a browser, so it cannot pass in that context.

Two traps this probe already fell into once, kept here so they are not
re-learned the hard way:

- **Match card text case-insensitively.** The eyebrow is uppercased by
  CSS (`text-transform: uppercase`), so `innerText` returns
  `[404] NOT FOUND`. A case-sensitive check for `[404] not found` reports
  a working page as broken. This briefly produced a false "still broken"
  reading mid-investigation.
- **Exclude `<script>` when searching the DOM.** The RSC flight payload
  inside a `<script>` contains the eyebrow as escaped source text, and a
  `<script>` has zero element children and a 0x0 box, so an unfiltered
  `querySelectorAll("*")` match lands on the script instead of the card.

### The transferable lesson

Two guards in this repo's history have now failed the same way: they
encoded a contract the product never had, so no correct build could ever
satisfy them. The mojibake guard could not see double-encoding; this one
could not see a client-rendered document. A permanently-red guard does
not point at a bug — it may be the bug.

**Before trusting a red guard: confirm a correct implementation can turn
it green, then confirm a broken one turns it red.** The second half is
the half that gets skipped.


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

