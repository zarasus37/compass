# Cluster 6.0 — Vault Scheduler (Auto Bill-Pay)

**Date**: 2026-08-29 02:10 CDT
**Status**: 🟡 In progress
**Goal**: Replace manual "Execute now" clicks on `/vault` with a user-configured cron that auto-executes eligible `ScheduledBill` rows. Production-ready (Vercel Cron-compatible API route) + a dev-only long-running scheduler process.

---

## Why this cluster exists

The off-ramp gateway shipped in Cluster Vault 4.0 M4 is fully featured: `canExecute` 7-condition gate, `executePayment` runs the adapter chain, drives the 13-state machine, idempotent on `(providerName, idempotencyKey)`. But the *trigger* is manual — every "Execute now" click in the integration-vault smoke proves the gateway works, and every production usage requires the user to come back and click.

This cluster closes that loop:

- The user configures a cron on `/vault/schedule` (e.g. "Daily 9am, look 1 day ahead, skip if reserve < $50").
- A scheduler runs that cron, finds eligible `ScheduledBill` rows, and calls `executePayment` for each.
- The vault stops needing babysitting. The user gets a "Next auto-run" indicator and a "Last auto-run" line on `/vault`.

This is the feature the spec calls out as "Phase 4.1 — automated off-ramp" in the v4 implementation plan, and it's the missing piece between the manual demo and a usable product.

---

## Scope (this cluster)

### 1. Data model

Add one table to `prisma/schema.prisma`:

```prisma
model VaultSchedule {
  id                  String    @id @default(cuid())
  userId              String    @unique
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Whether the scheduler should run for this user. When false,
  /// `processEligibleBills` short-circuits. The /vault/schedule
  /// page shows a "Schedule paused" pill when this is false.
  enabled             Boolean   @default(true)
  /// Standard 5-field cron expression. Validated at upsert time.
  /// Presets offered by the UI: "0 9 * * *" (daily 9am), "0 9,18 * * *"
  /// (twice daily), "0 9 * * 1" (weekly Monday), "0 9 1 * *"
  /// (monthly 1st).
  cronExpression      String    @default("0 9 * * *")
  /// IANA timezone, e.g. "America/Chicago". Computed against this
  /// timezone when determining next-run. Default = server local TZ
  /// (production: set to the user's profile TZ; deferred to Cluster
  /// 6.1 — uses a hardcoded IANA string for now).
  timezone            String    @default("America/Chicago")
  /// How far ahead the scheduler should look for bills whose
  /// execution window is open. 1 = bills due in the next 24h;
  /// 7 = bills due in the next week. 0 = bills whose window
  /// has already opened (more aggressive).
  lookAheadDays       Int       @default(1)
  /// Skip execution if `VaultAccount.settlementReserve` is below
  /// this threshold. Protects against accidentally draining the
  /// reserve for a single large bill. Default 0 = no reserve gate.
  minReserveCents     Int       @default(0)
  lastRunAt           DateTime?
  lastRunStatus       String?   // SUCCESS | NO_BILLS | ERROR | SKIPPED
  lastRunError        String?
  lastRunBillsAffected Int      @default(0)
  nextRunAt           DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
  @@index([enabled, nextRunAt])
}
```

Add the back-relation on `User` (per the "Prisma models need `user` back-relation + cascade delete" lesson in agent memory):

```prisma
model User {
  // ...
  vaultSchedule  VaultSchedule?
  // ...
}
```

No migration history yet — `prisma db push` is the project's established pattern.

### 2. Engine

New file `src/lib/vault/scheduler.ts`:

- `computeNextRun(cronExpression: string, timezone: string, from: Date = new Date()): Date | null` — uses `cron-parser` (new dep). Returns the next time the cron fires after `from`, in the given timezone. Returns null if the expression is invalid.
- `findEligibleBillsForUser(userId: string, now: Date, lookAheadDays: number): ScheduledBill[]` — query for the user's vault, find `ScheduledBill` rows where `status in {FUNDED, EARNING}`, `executionWindowStart <= now + lookAheadDays`, `executionWindowEnd >= now`. The execution-window check is the "eligible" filter; `canExecute` does the rest.
- `runSchedulerForUser(userId: string, now: Date = new Date()): { status, billsAffected, error? }` — finds or creates the user's `VaultSchedule`. If `enabled=false` → return `{ status: "SKIPPED", billsAffected: 0 }`. If `nextRunAt` is null or in the future → return `{ status: "SKIPPED", billsAffected: 0 }`. Otherwise, call `processEligibleBills`.
- `processEligibleBills(userId: string, now: Date, lookAheadDays: number, minReserveCents: number): Promise<{ billsAffected, error? }>` — fetches vault + eligible bills, gates each through `canExecute`, and for each that passes: calls `executePayment` (from `gateway.ts`) with a fresh idempotency key. Returns the count and any error. Writes one `vault.scheduler_run` audit log entry per bill.
- `recordScheduleRun(userId: string, status: string, billsAffected: number, error?: string)` — updates `lastRunAt`, `lastRunStatus`, `lastRunError`, `lastRunBillsAffected`, and `nextRunAt` on the schedule row.

### 3. API

- `GET /api/vault/schedule` — returns the user's schedule (or null + defaults if not yet created).
- `POST /api/vault/schedule` — upserts the schedule. Body: `{ enabled, cronExpression, timezone, lookAheadDays, minReserveCents }`. Server-side validation: cron is parseable by `cron-parser`, `lookAheadDays` is 0–7, `minReserveCents` is 0–vault.availableBalance. On success, recomputes `nextRunAt` and returns the full row.
- `GET /api/vault/schedule/history` — returns the last 20 audit-log entries with `action: "vault.scheduler_run"` for the user. Used by the run history table.
- `POST /api/vault/schedule/run-now` — manual override. Bypasses the cron, immediately calls `processEligibleBills` and `recordScheduleRun`. Returns the result.
- `POST /api/cron/vault` — **Vercel cron-style endpoint** (deferred to a 6.0.1 follow-on if needed for production; see "Out of scope" below). When shipped: takes a `?secret=...` query param (matches `CRON_SECRET` env), iterates all users with `enabled=true` and `nextRunAt <= now`, calls `runSchedulerForUser` for each. Returns a JSON summary.

### 4. UI

#### New page: `/vault/schedule`

Layout (4-chapter sidebar → "Money → Vault → Schedule" breadcrumb, top app bar):
- **Header**: "// vault · scheduler" eyebrow, "Auto bill-pay" title, "set it and let it run" em.
- **Schedule card** (the form):
  - Enabled toggle (visual: gold-on-dark pill when enabled, dimmed when disabled)
  - Cron expression: select-with-presets (Daily 9am, Twice daily, Weekly Monday, Monthly 1st) + a text input that auto-validates and shows the next 3 fire times below it
  - Timezone: select with the 8 most common US TZ (Eastern, Central, Mountain, Pacific, Alaska, Hawaii, UTC, server default) — full IANA picker deferred
  - Look-ahead days: 0–7 slider with 5 min/max end stops
  - Min reserve: currency input ($0 default, capped at vault.availableBalance)
  - "Save schedule" button (uses server action; shows success toast)
- **Status card**:
  - "Next run" — "in 2h 14m" or "Tomorrow at 9:00 AM" (computed from `nextRunAt`)
  - "Last run" — "2 bills settled, 1h ago" or "No runs yet" or "Failed: <error>"
  - "Run now" button (calls the manual override endpoint)
- **Run history table**:
  - Columns: When (relative), Status (colored chip), Bills affected, Error (if any)
  - Last 20 runs from the audit log
  - Empty state: "No runs yet — your schedule will fire at <nextRunAt>."

#### Existing `/vault` additions

- "Next auto-run: in 2h 14m" indicator near the vault status strip (only when schedule is enabled and `nextRunAt` is in the future)
- "Last auto-run: 2 bills settled, 1h ago" line below the indicator
- "Schedule" link button → `/vault/schedule` (so the user can find the page)

### 5. Dev scheduler

New file `scripts/cron-dev.mjs` + new `package.json` script:

```json
"cron:dev": "node scripts/cron-dev.mjs"
```

The script:
- Loads `tests/db-client.mjs`'s `prisma` instance
- Loops every 30 seconds
- For each user with `enabled=true` and `nextRunAt <= now`:
  - Calls `runSchedulerForUser(userId, now)`
  - Logs `[{ts}] user={id} status={status} bills={count} nextRunAt={nextRunAt}`
- Graceful SIGINT/SIGTERM handling (prints summary, exits 0)
- Catches and logs all errors per-user (one user's failure doesn't crash the loop)

Production uses `POST /api/cron/vault` (deferred). Dev uses this long-running process for the same end result. The HANDOVER.md recovery section gets a new "Dev scheduler" entry.

### 6. Smokes

New file `tests/smoke-vault-scheduler.mjs` (28 checks, structured after `smoke-vault.mjs`):

**Schedule CRUD**:
- GET /api/vault/schedule returns null before any schedule exists
- POST /api/vault/schedule with valid cron creates a row
- nextRunAt is computed correctly (within 5 min of expected)
- POST /api/vault/schedule rejects an invalid cron expression
- POST /api/vault/schedule rejects lookAheadDays > 7
- POST /api/vault/schedule rejects minReserveCents > vault.availableBalance
- GET /api/vault/schedule returns the saved schedule

**Engine**:
- `runSchedulerForUser` is a no-op when schedule is disabled
- `runSchedulerForUser` is a no-op when nextRunAt is in the future
- `processEligibleBills` calls `executePayment` for each bill in FUNDED/EARNING
- `processEligibleBills` skips bills whose execution window hasn't opened yet
- `processEligibleBills` skips bills whose execution window has closed
- `processEligibleBills` skips when vault is paused (canExecute gate)
- `processEligibleBills` respects minReserveCents gate
- `processEligibleBills` writes one `vault.scheduler_run` audit row per bill
- `recordScheduleRun` updates lastRunAt + lastRunStatus + nextRunAt

**UI** (`/vault/schedule` page):
- Page renders 200
- Eyebrow + title + em present
- Schedule form is present
- Run history table is present
- "Next run" indicator is on /vault
- "Last run" indicator is on /vault (or shows "No runs yet")

**API run-now**:
- POST /api/vault/schedule/run-now returns 200
- Response has the bill-affected count
- The bills transition through the state machine (FUNDED/EARNING → SETTLED)
- lastRunAt is updated
- Audit log has the run entries

Wire into `package.json`:
```json
"smoke": "node tests/smoke-auth.mjs && ... && node tests/smoke-vault-scheduler.mjs && node tests/smoke-vault.mjs && ..."
```

(`smoke-vault-scheduler` runs BEFORE `smoke-vault` so the smoke-vault test starts with a clean `VaultSchedule` row.)

### 7. Files

**New**:
- `prisma/migrations/` (none — `prisma db push` is the project pattern)
- `src/lib/vault/scheduler.ts` — the engine
- `src/lib/vault/scheduler-actions.ts` — server actions (form submit, run-now)
- `src/app/api/vault/schedule/route.ts` — GET + POST
- `src/app/api/vault/schedule/history/route.ts` — GET
- `src/app/api/vault/schedule/run-now/route.ts` — POST
- `src/app/(app)/vault/schedule/page.tsx` — server component
- `src/app/(app)/vault/schedule/ScheduleForm.tsx` — client form
- `src/app/(app)/vault/schedule/RunHistoryTable.tsx` — client table
- `src/app/(app)/vault/schedule/NextRunIndicator.tsx` — client live-update indicator
- `src/components/vault/ScheduleStatusCard.tsx` — shared card
- `scripts/cron-dev.mjs` — the dev scheduler
- `tests/smoke-vault-scheduler.mjs` — the smoke

**Edit**:
- `prisma/schema.prisma` — add `VaultSchedule` + User back-relation
- `src/app/(app)/vault/page.tsx` — add next-run + last-run indicator
- `src/components/sidebar/...` (or wherever the vault sub-nav lives) — add "Schedule" link
- `package.json` — add `cron:dev` script + chain `smoke-vault-scheduler` into `smoke`
- `HANDOVER.md` — add "Dev scheduler" recovery section
- `00-CLUSTER-6.0-VAULT-SCHEDULER.md` — this file

### 8. Dependencies

Add to `package.json` `dependencies`:
- `cron-parser` — the cron expression library. Pure JS, no native deps, MIT-licensed, ~10kb minified. Already the de-facto choice for Node cron parsing.

That's the only new dep. No Tailwind plugins, no UI kits, no charting libraries.

---

## Out of scope (deferred to a follow-on)

These are noted but not part of this cluster:

- **`POST /api/cron/vault` endpoint** — the Vercel-cron style endpoint. The dev scheduler (`scripts/cron-dev.mjs`) covers the same use case for local + test. Vercel cron wiring lands in Cluster 6.0.1 alongside the production deploy (Chain 8453) cluster.
- **Full IANA timezone selector** — the 8 most-common US TZ is enough for v1. The full 400+ IANA list is a UX cluster (Cluster 6.0.2 or part of a profile/settings cluster).
- **Run history pagination** — the 20-row table covers any user's reasonable usage. Pagination lands if a real user needs it.
- **Per-bill overrides on the schedule** — e.g. "run this bill 3 days early, not on the cron." Spec'd as a future Cluster 6.1 "Per-bill scheduler overrides."
- **Schedule dry-run / preview** — "what would happen if the cron fired right now?" is a nice-to-have. Lands in a follow-on.
- **Manual cron expression field validation UX** — the form rejects invalid expressions inline. The "next 3 fire times" preview is a nice-to-have, not a blocker.

---

## Acceptance criteria

1. `prisma db push` succeeds (new `VaultSchedule` table, `User.vaultSchedule` back-relation).
2. `pnpm tsc` is clean.
3. `pnpm smoke` is green (all 11 data-layer smokes including the new `smoke-vault-scheduler`).
4. `pnpm smoke:all` is green (all 26 suites, ~1,200 checks).
5. `pnpm cron:dev` runs, polls every 30s, logs a `user=... status=SUCCESS bills=2 nextRunAt=...` line on each fire, exits 0 on SIGINT.
6. The `/vault/schedule` page renders the form + status card + run history table.
7. The `/vault` page shows the "Next auto-run" + "Last auto-run" indicators when a schedule is set.
8. A schedule with `enabled=true` and a 1-minute cron fires within 2 minutes of starting the dev scheduler, and `lastRunAt` updates.
9. A schedule with `minReserveCents` above the vault's settlement reserve skips execution (no bills settle, `lastRunStatus: "SKIPPED"`).
10. A disabled schedule (`enabled=false`) does not fire.
11. The smoke `smoke-vault-scheduler` exits 0 with 28 pass / 0 miss.
12. COORDINATION.md "Last update" line points at the new commit; HANDOVER.md "Last commit" updated.

---

## Rollback plan

If anything in the engine or scheduler breaks the existing vault:

- `package.json` revert (drop the `smoke-vault-scheduler` chain entry) makes the existing `smoke:all` skip the new suite.
- The `VaultSchedule` table is additive (`onDelete: Cascade` from User, so the table vanishes with the user). No destructive migration needed.
- `pnpm cron:dev` is a separate process; not starting it = no scheduler running. The vault falls back to the manual "Execute now" button (the Cluster Vault 4.0 M4 status quo).

---

## Open questions for xKryptic (none blocking — defaults documented above)

- Timezone default: "America/Chicago" (server local TZ). Override later when the user-profile TZ is wired.
- `lookAheadDays` upper bound: 7 (one week). Anything higher = bill reminders, a different feature.
- `minReserveCents` upper bound: capped at `vault.availableBalance` at write time. Prevents setting a gate that can never open.
- Cron presets: 4 are enough for the form; advanced users can edit the raw expression.

---

## Commit shape

Single cluster commit, e.g. `e2f3a4b Cluster 6.0 — Vault scheduler (auto bill-pay)` (commit hash will be different). Includes all the files listed above, the schema push, and the package.json + COORDINATION.md + HANDOVER.md updates.
