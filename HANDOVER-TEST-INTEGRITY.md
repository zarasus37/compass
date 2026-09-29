# 🚨 READ FIRST — Session Briefing (2026-09-29, end of test-integrity session)

**Supersedes everything below this line.** The historical 7.x cluster log follows
for context, but the state described in the older "Last commit" / "🎯 NEXT CLUSTER"
lines is **stale** — it predates this session by three days of work.

---

## 1. Where `main` is

| Commit | What it is |
|---|---|
| `a0e9ecc` | `fix(seed): namespace canonical seed ids per user` |
| `8e34c30` | `fix(store): make the in-memory store per-user, not a process singleton` |
| `0c34701` | `fix(accounts): do not inject a phantom canonical account` + the whole per-test fixture migration |

All pushed to `origin/main`. Working tree clean except untracked `compass logo.jpg`.

## 2. What this session actually accomplished

The session started from an audit question — *"what needs to be done to get through
the testing phase?"* — and the answer turned out to be **"nothing could be verified
at all."** Four layered defects, each hiding the next:

1. **CRITICAL — every `(app)` page was 500ing.** Cluster 7.52 mounted
   `<ClientErrorCapture>` (a `"use client"` component) in `(app)/layout.tsx`; it
   imported `pathnameFromUrl` from a module that imports `prisma` → `pg` → node
   builtins. Bundling `pg` for the browser fails on `dns`. Fixed by extracting the
   pure helper to `src/lib/client-error-shared.ts` (zero imports).
2. **The dev server could not start on Windows.** Root cause was **not** Turbopack
   (it reproduced identically under `--webpack`). `globals.css` had
   `@import "tailwindcss"` with no `@source`, so Tailwind v4 walked the project root
   to discover utility classes — in a OneDrive-synced folder with ~990 packages.
   Adding `source(none)` + `@source "../"` took it from a >180s hang to **660ms**.
   This retires the long-standing `[SKIP-NO-SERVER]` workaround.
3. **22 of 53 smoke entries never ran.** The chain invoked
   `/tmp/runners/node_modules/.bin/tsx`, a sandbox path that exists nowhere
   including GitHub runners, and `tsx` was not even a declared dependency.
4. **Skips were indistinguishable from passes** — `[SKIP-NO-SERVER]` exited 0.
   `tests/skip-guard.mjs` now makes them fatal (exit 2) under
   `SMOKE_REQUIRE_SERVER=1`, which CI sets.

Plus, later in the session, three real product fixes:

5. **Phantom account injection** — `ensureUserAccountsSeeded` handed a **$84,210.00
   "Chase Checking"** to any user who already had their own accounts. Money they
   never had. Now returns early if the account list is non-empty.
6. **The store was a process singleton** — two users on one server would have
   shared debts and envelopes. Now a `Map` keyed by `userId`.
7. **Canonical seed ids were global primary keys** — so `POST /api/reset-seed` could
   only ever succeed with exactly one user in the database, while its doc comment
   claimed multi-user safety. Now namespaced per user via `src/lib/seed-ids.ts`.

**Test suite status went from: never executed → 8 chain entries green.**

## 3. Current verification state (all measured, not assumed)

Green standalone, with the numbers:
`smoke-vault` 77/0 · `smoke-vault-scheduler` 55/0 · `smoke-rebalance` 5/0 ·
`smoke-period` 46/0 · `smoke-reset-seed` 8/0 · `smoke-allocation-db` 53/0 ·
`smoke-accounts-db` 33/0 · `pnpm tsc` exit 0 · `pnpm lint` **0 errors** (542 warnings).

CI on `a0e9ecc`: Type check ✓, Lint ✓, Start dev server ✓, Run smoke suite ✗ —
identical to local. **Local and CI now agree, which is the single most important
property this session bought.**

## 4. 🎯 NEXT — the open defect, with a 2-command repro

`pnpm smoke` dies at **entry 8**. `pnpm smoke:ui` got to 8 entries before
`smoke-rebalance` was fixed and needs a fresh full run.

**Repro (on a live dev server, ~40s — do NOT run the full chain to investigate):**

```
tsx --conditions=react-server tests/smoke-vault-scheduler.mjs   # 55/0
tsx --conditions=react-server tests/smoke-vault.mjs             # 76/1  ← fails
```

`smoke-vault.mjs` alone is **77/0**. So this is an ordering interaction, not a
defect in that test. The failing check is always:
`yield reconciliation line parseable — could not match total/residual`.

**What is already RULED OUT — do not re-investigate these:**

- *Not* the seeded data. I dumped `VaultEnvelope.principalAllocated` and the DB
  `Envelope.current` values for a fresh fixture user, clean vs. immediately after
  the scheduler ran. **Byte-identical**: `totalEligible=514700`, same seven rows,
  same accrued values.
- *Not* the per-user store, and *not* shared cross-user data. The store is now a
  per-user `Map` (`8e34c30`).
- *Not* `/api/reset-seed` colliding on global seed ids. That was real and is fixed
  (`a0e9ecc`).

**Where to look next:** `smoke-vault` calls `POST /api/vault/sync?action=clear`
*before* its sync. That clear step is the one behaviour no probe has exercised yet.
Dump what it leaves behind for a fixture user and compare against the post-sync
state. The data is right; the reconciliation line just isn't matching, so suspect
**rendering**, not values — read what `/vault` actually emits after a clear+sync
and check it against the regex at `tests/smoke-vault.mjs:287-294`.

## 5. Pre-flight for the new session

```bash
cd "C:\Users\crisc\OneDrive - Southern Careers Institute\My Drive\Budget planner app"
git log --oneline -3                    # expect a0e9ecc, 8e34c30, 0c34701
pnpm tsc                                # must exit 0
pnpm lint                               # must report 0 errors
pnpm dev                                # REQUIRED before any HTTP smoke
```

The dev server **must be running** for anything HTTP-touching. Background
`pnpm dev` tasks have been reaped repeatedly in this environment — if
`http://127.0.0.1:3000/api/health` fails, restart it first. Verify with
`Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing`.

Tests that import the fixture **must** run under
`tsx --conditions=react-server` (the fixture imports `.ts` and Next's
`server-only` marker). `node tests/...` will fail at module load. Do not hand-edit
the chain — run `node scripts/fix-smoke-runners.mjs`, which derives the runner per
test from whether it imports `tests/fixture.mjs`.

## 6. Files to read first

1. `tests/fixture.mjs` — the per-test user factory. **Read its header comment
   before editing any test.** It explains why it does *not* call the canonical
   seeders and why it uses the product's `seededId`.
2. `src/lib/seed-ids.ts` — `seededId(userId, canonicalId)`. Anything that touches a
   seed id must go through this, never re-derive the rule.
3. `tests/skip-guard.mjs` — the exit-code contract (0 pass / 1 fail / 2 skipped).
4. `tests/smoke-vault.mjs:280-313` — the failing assertion.
5. `src/lib/store.ts` `getState`/`seedState` — the per-user store.

## 7. The next RANGE of work (not just one task)

1. Root-cause and fix the entry-8 ordering interaction (section 4).
2. Run `pnpm smoke` **and** `pnpm smoke:ui` **and** `pnpm smoke:integration` to
   completion. `smoke:ui` has not been run end-to-end since the last three changes.
3. Get CI green. It is the arbiter, not local output.
4. Update `COORDINATION.md` — it still describes the state as of `0c34701` and
   predates `8e34c30` / `a0e9ecc`.
5. Then, and only then, Stage 3 proper. Two standing items that gate it:
   - `smoke-envelope-detail-db` "[4] unknown envelope id returns 404" — **pre-existing,
     not caused by this session.** `/envelopes/does-not-exist` returns **200** with a
     "could not be found" body, because `notFound()` fires after the response has
     started streaming and the status can no longer be set.
   - The seven `smoke-debts-*` tests are still source-regex only. They cannot catch
     a wrong number until debts get a persistence model. This is a product decision
     for xKryptic, not something to start unilaterally.

## 8. ⚠️ Stop conditions and process warnings

- **Do not trust a green local run without checking the dev server was actually
  up.** That is the exact failure that produced six weeks of false "all green,
  ~1,580 checks" claims in this repo while CI had failed 60 consecutive runs.
  Check `gh run list` before believing any status.
- **Do not skip assertions to make a suite green.** Report the failure instead.
- **Do not name a cause before measuring it.** This session produced two confident
  wrong diagnoses (shared user; global in-memory store) and one bad measurement
  (sampling 5 seed ids, finding no references, and declaring a fix "verified safe"
  when `env-dining`/`env-buffer` were hard-coded in `period/page.tsx` — which would
  have rendered `$0.00` instead of `$174.00`). Use a pair repro and bisect
  predecessors; say "I don't know yet" when that is the honest state.
- **Prefer a config change over patching `node_modules`.** An earlier "fix" for the
  Tailwind hang was a manual `node_modules` patch that every `pnpm install` silently
  wiped — which is why that problem kept reappearing and looked unfixable.

## 9. Git hygiene

- Never `git add .` — this repo has untracked binaries (`compass logo.jpg`,
  `preview-login.png`, `videos/`) that must not land. Stage explicit paths.
- The session left log files (`dev*.log`, `chain*.log`, `ui*.log`) in the working
  tree. They are untracked and not committed; delete them with the runtime's
  recoverable-delete launcher, not `Remove-Item`.
