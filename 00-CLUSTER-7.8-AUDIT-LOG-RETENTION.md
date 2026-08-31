# Cluster 7.8 — Audit log retention

**Status**: design + spec
**Date**: 2026-08-30
**Author**: Mavis (cluster pickup from handoff)
**Predecessor**: Cluster 7.7 (date range filter), commit `ef0982a`

---

## Goal

The audit log is append-only and grows without bound. A user
who has been on Compass for 6 months will have ~3-5k events;
at 1 year it's 6-10k. The activity strip and headline cells
already feel slow at that scale (the JS-side groupby in
`getAuditLogActivity` does 1 query for live rows; the head
4-cell strip does 5 queries, two of which are `findMany` over
all the user's rows).

Cluster 7.8 introduces a **retention horizon**: the live
`AuditLog` table holds the last 90 days of events; older
events are aggregated into `AuditLogDailyRollup` (one row per
`(userId, dateKey, actionType)`, with `count` and `failedCount`)
and then DELETED from the live table. The rollup preserves
the per-day shape the activity strip and headline need; the
per-event payload is dropped (the rollup is a count, not a
replay).

The visible-UI payoff is the **year view**: the activity strip
can now show 365 days of activity by combining the live
horizon (last 90 days) with the rollup (days 91-365). The
table shows the full year, filtered to whatever the user
picked. The headline numbers stay unfiltered so the user
always sees the total.

A nightly cron (not in this cluster — the dev-only
`/api/dev/audit-log-prune` endpoint exercises the same
function so the smoke can test the rollup logic in seconds
instead of days) calls `pruneAuditLog` for every user. The
rollup is idempotent: re-running the prune on the same
window is a no-op (the rollup rows are upserted with
`increment`, not `set`).

---

## Why now (vs other candidates)

- **Infra-only cluster finally pays off.** C7.4-C7.7 were
  the "make the audit log useful" clusters. The data has
  piled up enough to start hurting the live read path. The
  rollup is the smallest infra change that ships a new
  feature (year view) AND caps the live table growth.
- **Year view is the next user-visible win after the
  date-range filter.** C7.7 added `from` / `to` and the 5
  preset chips. The 365-day window is the obvious next
  step: the chips already have 90d, and the user wants 1y
  to compare month-over-month. Without the rollup, the
  365-day view would do a `findMany` over 5k+ rows per
  request.
- **Idempotent + low-risk.** The prune is a single function
  with no new wire protocol, no new UI for the prune
  itself (it's a cron), and the rollup model is pure add.
  A bug in the prune produces a wrong rollup (correctable
  on next run) but cannot lose data — the live table
  delete is gated on the upsert succeeding.

---

## Architecture

### New model: `AuditLogDailyRollup`

| Field          | Type    | Notes                                                   |
| -------------- | ------- | ------------------------------------------------------- |
| `id`           | cuid    | PK                                                      |
| `userId`       | String  | FK → `User.id`, cascade-delete                          |
| `dateKey`      | String  | `YYYY-MM-DD` (local)                                    |
| `actionType`   | String  | The dotted action type (e.g. `vault.synced`)            |
| `count`        | Int     | # of `AuditLog` rows rolled up into this bucket         |
| `failedCount`  | Int     | # of those rows whose actionType is in `FAILED_*` set   |
| `createdAt`    | DateTime | When the rollup row was first written                  |
| `updatedAt`    | DateTime | Last write (the prune is idempotent)                  |

Indexes:
- `@@unique([userId, dateKey, actionType])` — upsert key
- `@@index([userId, dateKey])` — strip / headline reads
- `@@index([userId, actionType])` — type distribution

One row per `(userId, dateKey, actionType)`. A user with
the default 20+ action types and 365 days of history will
have ~7k rollup rows. The indexes cover the queries
`getAuditLogActivity` and `getAuditLogSummary` issue.

### `pruneAuditLog(userId, options)`

```ts
async function pruneAuditLog(
  userId: string,
  options?: { retentionDays?: number; now?: Date },
): Promise<{
  rolledUp: number;
  deleted: number;
  rollupRows: number;
  retentionDays: number;
}>;
```

Steps:
1. Compute the cutoff = `now - retentionDays` (default 90,
   override via `AUDIT_LOG_RETENTION_DAYS` env var). The
   cutoff is start-of-day local; rows with
   `createdAt < cutoff` are pruned.
2. `findMany` the rows to prune (just `id`, `actionType`,
   `createdAt` — the payload is dropped on the rollup).
3. Group by `(dateKey, actionType)`. For each group, compute
   `count` and `failedCount` (the latter is the subset whose
   `actionType` is in `FAILED_ACTION_TYPES`).
4. `upsert` each group into `AuditLogDailyRollup` (key =
   `userId_dateKey_actionType`). The `update` clause uses
   `count: { increment }` so re-runs add to the existing
   count.
5. `deleteMany` the original live rows by `id`.

Returns counts so the cron / dev endpoint can log what
happened.

### `getAuditLogActivity` refactor

The function (line 246) now reads from BOTH the live table
AND the rollup:

- **Live window** = `[max(windowStart, now - retentionDays),
  now]`. For the default 30-day strip, this is the full
  window (the retention horizon is 90 days).
- **Rollup window** = `[windowStart, liveStart)`. For the
  default 30-day strip, this is empty.
- For the 365-day strip, the rollup window is
  `[windowStart, now - 90d)` and fills the older 275 days.

Both queries are in parallel (no actual `Promise.all` — the
two awaits run sequentially inside the function, but the
`Promise.all` at the page level parallelizes this with the
other reads). The bucket map is initialized with a zero
entry for every day in the window; live rows are added
`+= 1`; rollup rows are added `+= r.count`. Both use the
same `dateKeyLocal` helper, so the buckets line up exactly.

### Dev-only endpoint: `POST /api/dev/audit-log-prune`

Mirrors `/api/dev/audit-log-write`:
- `NODE_ENV !== "development"` → 403
- `requireUser()` → identifies the target user
- Body: `{ retentionDays?: number, now?: string }` (both
  optional; defaults are the function defaults)
- Returns `{ ok: true, ...result }`

The smoke uses this to test the rollup path in seconds:
post `retentionDays: 0` to roll up everything older than
today, then verify the rollup rows + the live-row count.

### URL contract (extends C7.7)

`?from=YYYY-MM-DD&to=YYYY-MM-DD` works as before. The
DateRangeBar now renders 6 chips: 24h / 7d / 30d / 90d /
**365d (Last 12 months)** / All time. The 365d chip drives
a `days=365` activity strip via the page's
`computeActivityDays` helper.

The activity strip is dynamic: `days <= 30` keeps the
original 30-bar look; `days > 30` widens the SVG to fit
up to 90 columns at 7px each; `days > 90` downsamples the
data into 90 buckets (each bucket spans ~`days/90` days).
The header label updates ("// 30-day shape" → "// 90-day
shape" → "// 365-day shape") and the per-bar label cadence
scales with the window (every 5th bar for 30d, every 10th
for 90d/365d).

---

## Files

**New**
- `prisma/schema.prisma` — `AuditLogDailyRollup` model + the
  `User.auditLogRollup` back-relation
- `src/app/api/dev/audit-log-prune/route.ts` — dev endpoint
- `tests/smoke-audit-log-retention.mjs` — the smoke (this
  cluster's signature deliverable)

**Modified**
- `src/lib/vault/audit-log.ts` — `getRetentionDays()`,
  `getAuditLogActivity()` refactor, `pruneAuditLog()`
  function
- `src/lib/vault/audit-log-shared.ts` — added `365d` preset
- `src/app/(app)/vault/audit/ActivityStrip.tsx` —
  `geometryFor()`, `downsample()`, `labelEvery()`,
  density-aware header label
- `src/app/(app)/vault/audit/page.tsx` — `computeActivityDays`
  helper; activity strip's `days` follows the active range
- `tests/smoke-audit-log.mjs` — added `365d` to the chip list
- `tests/integration-vault.mjs` — Phase 4.0 M7 (source-file
  checks for the new model, the dev endpoint, the prune
  function, the `getRetentionDays` export, and the
  ActivityStrip dynamic geometry)
- `package.json` — added `tests/smoke-audit-log-retention.mjs`
  to the `smoke` script chain

---

## Smoke plan

`tests/smoke-audit-log-retention.mjs` (target: ~30 checks):

1. **Auth + setup** — login as the smoke user, clear the
   user's `AuditLog` + `AuditLogDailyRollup` rows (so the
   test is hermetic).
2. **Write sentinels at backdated timestamps** — insert
   rows at 0d / 30d / 60d / 100d ago via direct Prisma
   writes (not through the dev endpoint — the endpoint
   fires the bus, which the smoke doesn't need). Use
   different actionTypes so the rollup grouping is
   unambiguous.
3. **POST `/api/dev/audit-log-prune` with `retentionDays=30`** —
   assert `rolledUp`, `deleted`, `rollupRows` counts match
   the sentinels written at 60d + 100d ago (those are the
   only ones older than 30d).
4. **DB-layer assertions** — assert the live table has
   only the 0d + 30d rows; assert the rollup has rows for
   the 60d + 100d buckets with the expected `count` and
   `failedCount` per `(dateKey, actionType)`.
5. **Idempotency** — call the prune again; assert the
   rollup `count` is the same (no double-increment) and
   the live table is unchanged.
6. **Year view via the page** — fetch `/vault/audit` (no
   filter) and assert the activity strip has 30 bars
   (the default no-filter view stays at 30). Then fetch
   `/vault/audit?from=YYYY-MM-DD&to=YYYY-MM-DD` for a
   365-day window and assert the strip's
   `data-window-days="365"` is present.
7. **365d chip is in the bar** — assert
   `data-testid="vault-audit-range-365d"` is in the HTML.
8. **Year view rollup aggregation** — backdate rows to
   200d ago (within the rollup window), run the prune,
   then fetch `/vault/audit?from=...&to=...` covering a
   365-day window, and assert the activity strip's
   `vault-audit-activity-summary` text contains the right
   total events.
9. **M7 phase in `integration-vault.mjs`** — source-file
   checks (model exists in `client.d.ts`, prune function
   is exported, dev endpoint is registered, `getRetentionDays`
   is exported, `ActivityStrip.tsx` contains the
   `geometryFor` / `downsample` helpers, `package.json`
   smoke script includes the new file).

---

## Visible-UI payoff

The user gets:
- A new "Last 12 months" chip on `/vault/audit` that
  shows a 365-day activity strip (downsampled to 90
  columns — same density as the 90-day view).
- The 90-day chip now actually shows 90 daily bars (was
  previously truncated to 30 by the strip's `COLS=30`
  constant).
- A 7x drop in the `AuditLog` table size for a 1-year-old
  user (live table holds 90 days = ~750 rows; rollup holds
  275 days = ~1,750 rows aggregated — but the live
  `findMany` is the hot path, and it scans 750 rows
  instead of 6k+).
- Future clusters can read the rollup directly (e.g. a
  monthly "system digest" email) without re-aggregating
  the live table.

---

## What this cluster does NOT do

- **No cron.** The nightly prune is a separate cluster
  (Phase 4.0 M8 or later). The dev endpoint + smoke
  exercise the function; the cron wiring is the next
  cluster.
- **No per-user retention override.** The horizon is a
  global `AUDIT_LOG_RETENTION_DAYS` env var. Per-user
  overrides are a future enhancement (likely a
  `VaultPreferences.retentionDays` field).
- **No "export my audit log" feature.** The rollup is
  internal — the user can still see all live events
  through the page; exporting a CSV is a separate
  cluster.
- **No realtime updates from the rollup.** The SSE bus
  (C7.6) fires on `recordVaultAudit`, which only writes
  to the live table. The rollup is a once-per-day batch
  event; the user doesn't need live updates for the
  yearly view.
- **No per-type retention.** All action types share the
  same horizon. If the user wants "keep `vault.synced`
  for 365 days but everything else for 30", that's a
  future enhancement.
