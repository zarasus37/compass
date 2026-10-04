# Cluster 7.8.1 — Audit log retention cron (M8)

**Status**: design + spec
**Date**: 2026-08-30
**Author**: Mavis (follow-on to Cluster 7.8)
**Predecessor**: Cluster 7.8 (audit log retention), commit `8f7b23b`

---

## Goal

Cluster 7.8 added the `pruneAuditLog(userId, ...)` function + a
dev-only `/api/dev/audit-log-prune` endpoint for the smoke. The
production cron was left as a follow-on. Cluster 7.8.1 wires the
cron: a nightly job that calls `pruneAuditLog` for every user
across the system, with the same pattern as the existing
`/api/cron/vault` endpoint (Cluster 6.0).

Visible-UI payoff: zero. This cluster is purely infra. The user
sees nothing new; the system just stops growing the live
`AuditLog` table past 90 days. The headline numbers stay
correct (the rollup preserves the shape), the activity strip
keeps showing the same bars, the year view keeps working.

Why now (vs other candidates):

- **Cluster 7.8 shipped 6 hours ago.** The function + dev
  endpoint are wired. Without the cron, the retention horizon
  is academic — no one is calling `pruneAuditLog` in
  production. The visible-UI work (C7.4-C7.8) is in a stable
  place; this is the natural clean-room moment to ship the
  cron before moving to the next visible-UI cluster.
- **The pattern is well-established.** `/api/cron/vault` (C6.0)
  + `scripts/cron-dev.mjs` is the template. Re-using it
  keeps the ops surface consistent (same auth, same response
  shape, same dev scheduler script).
- **Pre-existing middleware gap.** The middleware was
  redirecting unauth'd POSTs to `/api/cron/vault` to `/login`,
  silently breaking `scripts/cron-dev.mjs`. M8 fixes that
  too — adding `/api/cron` to the public list so the dev
  scheduler actually works (the route's own CRON_SECRET
  bearer is the gate, just like before).

---

## Architecture

### `pruneAuditLogForAllUsers(opts?)` (new helper)

A bulk wrapper around `pruneAuditLog(userId, ...)` in the new
`src/lib/vault/audit-log-cron.ts`. Iterates
`prisma.user.findMany({ select: { id: true } })` and calls the
per-user prune in a loop. Each user's prune is wrapped in
try/catch so one user's failure doesn't abort the batch.

```ts
export async function pruneAuditLogForAllUsers(opts?: {
  now?: Date;             // default = new Date()
  retentionDays?: number; // default = getRetentionDays()
}): Promise<{
  ok: boolean;
  usersProcessed: number;
  usersFailed: number;
  totalRolledUp: number;
  totalDeleted: number;
  totalRollupRows: number;
  results: Array<{
    userId: string;
    status: "PRUNED" | "NOOP" | "ERROR";
    rolledUp: number;
    deleted: number;
    rollupRows: number;
    error?: string;
  }>;
  retentionDays: number;
  now: string;
}>;
```

The shape is deliberately similar to the vault cron's response
(`{ ok, usersProcessed, billsAffected, results }`) so the dev
scheduler's log format and the production observability story
are consistent.

### `POST /api/cron/audit-log-prune` (new endpoint)

`src/app/api/cron/audit-log-prune/route.ts`. POST + GET both
delegate to `pruneAuditLogForAllUsers()`. Auth: same bearer
pattern as `/api/cron/vault` — when `CRON_SECRET` is set, a
`Authorization: Bearer <CRON_SECRET>` header is required;
when unset (dev), the auth check is skipped.

GET is included for ops debugging ("how many users would
this touch right now?"). It actually runs the prune, just
like POST — there's no "dry run" mode (the function is
idempotent, so a dry run would be the same as a real one
with empty outputs).

### `scripts/cron-audit-prune-dev.mjs` (new dev scheduler)

Long-running poller, mirrors `scripts/cron-dev.mjs`. Polls
`POST /api/cron/audit-log-prune` on a configurable interval
(`AUDIT_LOG_PRUNE_POLL_MS` env, default 24h).

In dev the interval is overridden to 5-30s for fast feedback.
The default 24h is correct for production (a typical
Vercel-cron "0 3 * * *" schedule).

The dev scheduler logs:
- `audit-prune scheduler started (poll=24h base=...)` on boot
- `no users due (retentionDays=90)` when there's nothing to prune
- `processed=N rolledUp=X deleted=Y rollupRows=Z` when work happened
- `processed=N rolledUp=X deleted=Y failed=F` when one or more users failed
- `ERROR <userId>... <message>` for each failed user
- A final shutdown line with totals on Ctrl-C

### Middleware: `/api/cron` becomes public

`src/middleware.ts` adds `/api/cron` to the `PUBLIC_PREFIXES`
list. Pre-existing bug: the dev scheduler was being silently
redirected to `/login` by the middleware, and the only reason
it didn't error was that the script catches the JSON parse
failure and logs "poll failed". M8 fixes that.

The route's own CRON_SECRET bearer is the gate, just like
before. In dev (no secret set), the endpoint is local-only by
virtue of the script running on the dev machine.

### Production schedule (Vercel cron)

Documented in `.env.production.example` (no new env vars — the
schedule is configured in `vercel.json` or the Vercel dashboard,
not env). The endpoint is the same in dev and prod; the
schedule wrapper is the only difference.

Recommended: `0 3 * * *` (03:00 UTC daily). The audit page is
light traffic in that window; a 3am prune won't race with any
read.

---

## Files

**New**
- `src/lib/vault/audit-log-cron.ts` — bulk prune helper
- `src/app/api/cron/audit-log-prune/route.ts` — cron endpoint
- `scripts/cron-audit-prune-dev.mjs` — dev scheduler
- `tests/smoke-cron-audit-log-prune.mjs` — 30-check smoke
- `00-CLUSTER-7.8.1-AUDIT-LOG-CRON.md` — this spec

**Modified**
- `src/middleware.ts` — `/api/cron` added to public prefixes
- `package.json` — `cron:dev:audit` script + new smoke in chain
- `tests/integration-vault.mjs` — Phase 4.0 M8 (23 source + wire checks)

---

## Smoke plan

`tests/smoke-cron-audit-log-prune.mjs` (target: ~30 checks):

1. **Auth + setup** — login as the smoke user, clear the
   user's `AuditLog` + `AuditLogDailyRollup` rows.
2. **Write 5 sentinels** at 0d/30d/60d/100d/100d with the
   `smoke.cron_prune.*` prefix.
3. **POST `/api/cron/audit-log-prune`** — assert
   `usersProcessed >= 2`, `ok: true`, the response shape
   (`retentionDays`, `now`, `results`).
4. **Per-user assertion** — the smoke user is in the
   `results` array with `status: "PRUNED"`, `rolledUp >= 2`
   (the 2x 100d sentinels), `rollupRows >= 1`.
5. **DB-layer assertion** — 3 in-window sentinels remain in
   the live table; 1 rollup row exists for `(100d,
   smoke.cron_prune.old)` with `count=2`.
6. **Idempotency** — second POST returns `status: "NOOP"`
   for the smoke user and `totalRolledUp: 0` overall.
7. **Source-file checks** — bulk helper exports, route
   exports POST + GET, route gates on CRON_SECRET, dev
   scheduler script polls the right endpoint, package.json
   has `cron:dev:audit`, middleware allows `/api/cron`.
8. **Wire checks** — POST + GET both return 200 with the
   expected shape.

`tests/integration-vault.mjs` Phase 4.0 M8 (target: 23
checks): source-file checks for the new helper + route +
script + middleware; wire checks for POST + GET; package.json
checks for the npm script + new smoke in the chain.

---

## Visible-UI payoff

None. This is pure infra. The user sees no new chrome, no new
chips, no new flows. The only behavioral effect is that the
`AuditLog` table stops growing past 90 days per user — a
nightly cron at 3am writes 1+N `AuditLogDailyRollup` rows
(sum of distinct `(dateKey, actionType)` buckets across all
users) and deletes the corresponding live rows.

A user looking at `/vault/audit` sees the same data they did
yesterday. The headline numbers are unchanged (the rollup
preserves `count` + `failedCount`). The activity strip is
unchanged. The table is unchanged. The year view is unchanged.

The 1-year-old user is the beneficiary: their `AuditLog`
table is bounded at ~750 rows instead of growing to 6k+.

---

## What this cluster does NOT do

- **No Vercel cron schedule file.** The schedule is
  configured in the Vercel dashboard (or `vercel.json` if
  we add one later) — not in this cluster. The endpoint is
  callable from any cron system.
- **No retry / backoff.** A user whose prune throws gets
  `status: "ERROR"` with the error message; the remaining
  users are processed normally. The endpoint returns 200
  with `ok: false` if any user failed. A Vercel cron
  scheduler that retries on non-2xx is a future concern;
  the `usersFailed > 0` count is in the response so the
  scheduler can detect it.
- **No alerting.** A separate observability cluster will
  wire Sentry / PagerDuty / etc. The endpoint's response
  is structured so a future alerting layer can read it
  without code changes.
- **No per-user retention override.** C7.8's
  `AUDIT_LOG_RETENTION_DAYS` is a global env var. Per-user
  overrides (e.g. a "premium tier" with 365-day retention)
  are a future enhancement.
- **No lock / single-instance guarantee.** If two cron
  processes fire at the same time (e.g. a manual `pnpm
  cron:dev:audit` + a Vercel cron misfire), they BOTH call
  `pruneAuditLogForAllUsers`. The function is idempotent —
  the second one finds nothing to prune and returns
  `totalRolledUp: 0`. No double-delete, no data loss. A
  Postgres advisory lock would be a future enhancement for
  "exactly once" semantics.
