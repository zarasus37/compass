# 🚨 READ FIRST — Session Briefing (2026-09-30 00:05 UTC)

**Supersedes the 2026-09-29 test-integrity briefing this file previously
contained.** The four layered defects that session fixed are real and
still landed. What changed is everything downstream: the chain now runs
far enough to expose a new class of defect, and this session cleared
nine of them.

---

## 1. Where `main` is

| Commit | What it is |
|---|---|
| `daabae5` | scope the loading shell so `notFound()` can set a real 404 |
| `d0e6df9` | rewrite the briefing (this file) + COORDINATION status |
| `5861f50` | run src-importing smokes under tsx; un-orphan the stuck-detector users |
| `79a1478` | install Playwright's Chromium in CI; fail mobile-shell clearly |
| `5795fbc` | stop the vault reconciliation assertion matching the RSC flight payload |
| `cf34584` | fix four environment-coupled defects the honest suite exposed |
| `a0e9ecc` | *(previous session)* namespace canonical seed ids per user |

All pushed to `origin/main`. Working tree clean for tracked files.

## 2. The headline

**The 404 is fixed and CI-confirmed. The chain has advanced to the next
wall: `smoke-setup-wizard`. Fully diagnosed, not yet fixed — see §5a.**

Stage summary from the last full local run
(`pnpm smoke:strict`, 47 green entries):

| Stage | Result |
|---|---|
| `smoke` | **FAIL** — 2 checks in `smoke-setup-wizard` (§5a) |
| `smoke:ui` | **PASS** |
| `smoke:integration` | **PASS** |
| `smoke:deploy` | **PASS** (149/0) |

`pnpm tsc` exit 0 · `pnpm lint` exit 0 (542 warnings, 0 errors).

CI runtime is the honest progress signal, because the chain is
`&&`-joined — every entry after a failure is dead and never runs. The
series this session: **3m25s → 6m21s → 7m47s → 8m0s → 8m46s**, one wall
removed per commit. A longer run means it got further.

## 3. What this session fixed (all measured, not assumed)

Every one of these was a defect that **could never have passed**. They
were invisible while the suite skipped. None removed a check: each
either restored a fixture's ability to supply what an assertion already
demanded, or made an assertion actually test what it claimed to.

| # | File | Defect | Result |
|---|---|---|---|
| 1 | `tests/smoke-live-ticker.mjs` | Asserted `?take=5` returns 5 rows, but the fixture seeded only 4. Worse, the assertion had no teeth: with 4 rows, take=5 and take=999 both return 4, so a route that ignored `take` entirely would pass. Seeded the 2nd meta row so 3-vs-5 is a real signal. | 63/0 |
| 2 | `tests/smoke-sinking-funds.mjs` | Hardcoded `/workspace/compass/...` sandbox paths → `C:\workspace\compass\...` on Windows → unhandled ENOENT killed the entry at module load. | 15/0 |
| 3 | `tests/smoke-prod-env.mjs` | Same hardcoded path, masking two Windows failures: `spawnSync("tsx")` can't resolve the `.cmd` shim without a shell, and `shell:true` then breaks on the spaces in the repo path. Runs `node --import tsx` instead. Import specifier is a `pathToFileURL` because a bare `C:\…` parses as URL scheme `c:`. | 9/0 |
| 4 | `tests/smoke-deploy.mjs` | The `.env.local` assertion ran unconditionally, but `.env.local` is **gitignored** (`.gitignore: .env*`) and absent on CI — so it MISSed on every CI run regardless of code health. Now asserted only when the file exists. | 149/0 |
| 5 | `tests/smoke-vault.mjs` | **The documented "entry 8" failure.** See §4 — the subtle one. | 77/0 |
| 6 | `.github/workflows/ci.yml` + `tests/smoke-mobile-shell.mjs` | Suite contains a Playwright-driven test; neither CI nor a fresh checkout has the browser binary, and `pnpm install` does not fetch it. | 54/0 in CI |
| 7 | `scripts/fix-smoke-runners.mjs` | Its rule was "imports `tests/fixture.mjs`" only. Two tests import `../src/` **without** the fixture and die on a directory import (`ERR_UNSUPPORTED_DIR_IMPORT`) under bare `node`. Rule now covers both reasons. | 4 entries moved |
| 8 | `tests/smoke-onboarding-stuck-detector.mjs` | Required `stuck-detector-test@` and `fresh-test@` users that **nothing in the repo creates** — orphaned when the per-test fixture migration retired the shared-user seed. Now creates its own. | 11/0 |
| 9 | `src/app/(app)/loading.tsx` → `src/components/shell/AppLoadingShell.tsx` + 14 route files | The group-root Suspense boundary made 404 impossible for every page under `(app)`. Scoped to the nav segments; `envelopes`/`goals` use an internal `<Suspense>` instead. See §5. | 9/0 |

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

## 5a. 🎯 NEXT — `smoke-setup-wizard` (the new wall)

Both local and CI now fail at exactly the same place, 2 checks:

```
[MISS] [7.38-B1] /setup/activate with completedStep=1 → /setup/pay-schedule (not 404)
[MISS] [7.38-B1] /setup/activate with completedStep=2 → /setup/accounts (not 404)
```

followed by a hard crash:

```
PrismaClientKnownRequestError: … No record was found for an update.
```

**Root cause (diagnosed, not yet fixed).** `tests/smoke-setup-wizard.mjs`
is the last major smoke still hardwired to the retired shared user. It
logs in as `mom@compass.local` / `correct-horse-battery-staple` at ten
sites and does
`prisma.setupState.update({ where: { userId: u.id } })`. The User row
exists on CI (chain entry 1, `smoke-auth`, creates it) but **no
`SetupState` row exists for it on a fresh database**, so the update
throws. Locally the row is a leftover from years of dev use, which is
why this test passes on this machine and fails in CI — the same
warm-vs-cold trap as the vault flight-payload bug.

Note the pre-flight "live walk-through" line in CI also reports
`step 4 (bills) did not advance SetupState.completedStep`, which is the
same missing-row problem surfacing earlier.

**Suggested fix:** migrate this test to `tests/fixture.mjs`
(`loginAsFixture("setup-wizard")`), the same migration the other ~30
smokes already got. The fixture creates the user *with* a
`SetupState` row and tears it down afterwards. Expect it to touch
~10 login sites plus the two `findUnique` calls at lines 70 and 219.
It also uses Playwright, so it must keep running under
`tsx --conditions=react-server` (its rule change already covers it —
it imports `../src/`).


## 6. Pre-flight

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -4                    # 5861f50, 79a1478, 5795fbc, cf34584
pnpm tsc                                # exit 0
pnpm lint                               # exit 0
pnpm dev                                # REQUIRED before any HTTP smoke
```

Verify the server: `Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing`.

`/api/health` reports `db.migrationStatus: "pushed"` and logs a
`_prisma_migrations` does-not-exist error. **That is by design** — the
health route catches it and reports `"pushed"` for `db push` schemas
(`src/app/api/health/route.ts:33-36,114-119`). It is noise, not a defect.

Background `pnpm dev` tasks get reaped in this environment. If health
fails, restart it before believing any smoke result.

Anything importing `tests/fixture.mjs` **or** `../src/` must run under
`tsx --conditions=react-server`. Do not hand-edit the chain — run
`node scripts/fix-smoke-runners.mjs`, which derives the runner from both
conditions.

## 7. Files to read first

1. `tests/fixture.mjs` — the per-test user factory. **Read its header
   before editing any test.** It explains why it does not call the
   canonical seeders and why it uses the product's `seededId`.
2. `src/lib/seed-ids.ts` — `seededId(userId, canonicalId)`. Anything
   touching a seed id must go through this.
3. `tests/skip-guard.mjs` — exit contract: 0 pass / 1 fail / 2 skipped.
4. `scripts/fix-smoke-runners.mjs` — how the chain is generated.
5. `src/app/(app)/loading.tsx` — the cause of the remaining blocker.

## 8. Next RANGE of work

1. **Migrate `tests/smoke-setup-wizard.mjs` to the fixture** (§5a). It
   is the current CI blocker and the cause is fully diagnosed.
2. Get CI green on the resulting commit. CI is the arbiter.
3. Keep going down the chain — the `&&`-join means each fix exposes the
   next, and there is no shortcut to seeing the whole thing.
4. Then Stage 3 proper, which is no longer infrastructure:
   - The seven `smoke-debts-*` tests are still source-regex only. They
     cannot catch a wrong number until debts get a persistence model.
     That is a product decision for xKryptic, not a unilateral start.
   - `smoke:ui`, `smoke:integration` and `smoke:deploy` all PASS as of
     the 2026-09-29 23:5x run (see §2).

## 9. Stop conditions

- **Check `gh run list` before believing any status.** This repo has a
  documented history of six weeks of "all green, ~1,580 checks" claims
  while CI failed 60 consecutive runs. Runtime is the tell: a longer CI
  run means it got *further*, not that something is wrong.
- **Do not skip or weaken assertions to make a suite green.** Report the
  failure instead. (Each of the 8 fixes above either restored a
  fixture's ability to supply what an assertion already demanded, or
  made an assertion actually test what it claimed to — none removed a
  check.)
- **Do not name a cause before measuring it.** This session's own
  predecessor produced two confident wrong diagnoses. Write a throwaway
  probe that prints the real markup; that is what cracked §4 in minutes
  after bisection had failed.
- **Prefer a config change over patching `node_modules`.**
- **Env-local assertions do not belong in CI.** If a check reads a
  gitignored file, it is a local-setup guard — assert it only when the
  file exists (see #4).

## 10. Git hygiene

- Never `git add .` — untracked binaries (`compass logo.jpg`,
  `preview-login.png`, `videos/`, `design/vision.docx`) must not land.
  Stage explicit paths.
- Delete scratch files (`*.log`, throwaway probe scripts) with the
  runtime's recoverable-delete launcher, not `Remove-Item`.
