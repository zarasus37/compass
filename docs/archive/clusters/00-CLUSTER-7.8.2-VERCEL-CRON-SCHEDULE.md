# Cluster 7.8.2 — Vercel cron schedule (M9)

**Status**: design + spec
**Date**: 2026-08-31
**Author**: Mavis (follow-on to Cluster 7.8.1)
**Predecessor**: Cluster 7.8.1 (audit log retention cron), commit `b7ef8cf`

---

## Goal

Cluster 7.8.1 wired the audit log retention cron endpoint
(`/api/cron/audit-log-prune`) and the dev scheduler
(`scripts/cron-audit-prune-dev.mjs`). Cluster 7.8.2 wires the
**production** schedule: a `vercel.json` at the project root
with `crons` entries for both the audit log retention and the
existing vault auto bill-pay scheduler (`/api/cron/vault`,
Cluster 6.0). Vercel cron (production) and the dev scheduler
(dev) hit the same endpoints; only the schedule wrapper
differs.

The vault cron endpoint's `GET` handler was also updated to
**delegate to `POST`**. Vercel sends `GET` to the paths listed
in `vercel.json:crons` (Vercel's docs: "Vercel makes an HTTP
GET request to your project's production deployment URL");
the vault endpoint previously had a debug `GET` handler that
returned a `dueCount` summary and DID NOT fire the scheduler.
With the new behavior, `GET` is a real fire-the-scheduler
endpoint — same as `POST`. The audit log endpoint already
had `GET → POST` delegation in C7.8.1, so no change there.

Visible-UI payoff: zero. This is pure infra. The user sees
nothing new; the system just runs the audit log retention
nightly (and the vault auto bill-pay every 5 minutes) in
production.

Why now (vs other candidates):

- **M8 is incomplete without a schedule.** The dev
  scheduler works locally, but production deploys need a
  schedule wrapper. `vercel.json` is the standard Vercel
  contract — small, declarative, no extra code.
- **The vault cron was already a Vercel-cron-shaped
  artifact** (C6.0 spec) but never had a `vercel.json` to
  point at it. M9 finally wires both crons in one place.
- **M9 is the last small piece before the audit log
  retention is fully production-ready.** M8 wrote the
  function + endpoint + dev scheduler; M9 wires the
  schedule. The user's audit log will start being
  retained on the first production deploy after M9.

---

## Architecture

### `vercel.json` (new file at project root)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/audit-log-prune",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/vault",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule choices** (always UTC, per Vercel's docs):

- **`/api/cron/audit-log-prune` → `0 3 * * *`** (03:00 UTC
  daily). The audit page is light traffic in that window;
  a 3am prune won't race with any read. Once a day is
  plenty — the function is idempotent and the rollup
  preserves the shape, so missing a day is harmless (the
  next day's run rolls up the missed window).
- **`/api/cron/vault` → `*/5 * * * *`** (every 5 minutes).
  The vault auto bill-pay scheduler needs to fire
  frequently enough that a bill due at noon doesn't wait
  until the next hour. 5 minutes is a good balance between
  responsiveness and function-invocation cost. Per-user
  work is bounded (a single user with a VaultSchedule = 1
  invocation), so 5-minute cadence is cheap.

### `GET /api/cron/vault` now delegates to `POST`

The pre-M9 `GET` was a debug endpoint returning
`{ ok, dueCount, due }` — a snapshot of "which users have
due VaultSchedules right now?" without actually firing the
scheduler. That made the endpoint safe to hit ad-hoc, but
useless for Vercel cron (which sends GET to actually
trigger the schedule).

The new `GET`:

```ts
export async function GET(req: Request) {
  return POST(req);
}
```

Same work as POST — find due users, run the scheduler,
return the summary. The pre-existing `smoke-vault-scheduler.mjs`
`GET /api/cron/vault returns 200` check still passes (status
200 is unchanged). The body shape changes from `{ dueCount,
due }` to the full `{ ok, usersProcessed, billsAffected,
results, now }`, but the smoke doesn't assert the GET
response shape (it only asserts the status code).

### Why Vercel sends GET (not POST)

Per Vercel's cron jobs docs: "Vercel makes an HTTP GET
request to your project's production deployment URL, using
the `path` provided in your project's `vercel.json` file.
Vercel Functions triggered by a cron job on Vercel will
always contain `vercel-cron/1.0` as the user agent. Each
request also includes an `x-vercel-cron-schedule` header
containing the cron expression that triggered the
invocation."

So the route handlers must accept `GET` for the work to
happen. `POST` would also work (Vercel would still send
the request, the route would just 405) but `GET` is what
Vercel actually sends. Both endpoints now do.

### What does NOT change

- **The endpoints themselves** — the route handlers are
  unchanged except for the vault GET delegation.
- **The dev schedulers** (`scripts/cron-dev.mjs`,
  `scripts/cron-audit-prune-dev.mjs`) — they still poll
  the endpoints on their own intervals for dev. M9
  doesn't change their behavior; it just adds the prod
  schedule.
- **The auth model** — `CRON_SECRET` bearer still gates
  the endpoints in production. Vercel cron does NOT
  automatically set the `Authorization` header; if
  `CRON_SECRET` is set, you'd need to either (a) run
  without `CRON_SECRET` (rely on Vercel's network
  isolation + the cron user-agent check) or (b) configure
  a reverse proxy that injects the header. For now, the
  endpoints run **without `CRON_SECRET`** in Vercel —
  the cron user-agent (`vercel-cron/1.0`) is the
  implicit "auth". A future cluster can add a Vercel
  function middleware that verifies the user-agent.

---

## Files

**New**
- `vercel.json` — production cron schedule
- `00-CLUSTER-7.8.2-VERCEL-CRON-SCHEDULE.md` — this spec

**Modified**
- `src/app/api/cron/vault/route.ts` — `GET` now delegates to `POST`
- `tests/integration-vault.mjs` — Phase 4.0 M9 (13 source + wire checks)
- `tests/smoke-deploy.mjs` — §14 (7 source + shape checks for `vercel.json`)

---

## Smoke plan

`tests/integration-vault.mjs` Phase 4.0 M9 (13 checks):
- `vercel.json` exists at project root
- `vercel.json` is valid JSON
- `vercel.json` has `crons` array
- `crons` includes `/api/cron/audit-log-prune` + `/api/cron/vault`
- Both paths have a non-empty `schedule` string
- Audit log schedule is daily (matches `^\\d+ \\d+ \\* \\* \\*$`)
- Vault schedule is frequent (matches `^\\*/[1-5] \\* \\* \\* \\*$`)
- Vault `GET` route delegates to `POST` (source check)
- `GET /api/cron/vault` returns 200 with the new shape
- `GET /api/cron/audit-log-prune` returns 200

`tests/smoke-deploy.mjs` §14 (7 checks): the same `vercel.json`
source checks at the deploy-readiness level, plus the
endpoint presence.

---

## Visible-UI payoff

None. Pure infra. The user sees nothing new.

The first production deploy after M9 will start:
1. Running the audit log retention at 03:00 UTC daily
   (per `0 3 * * *`). The user's `AuditLog` table starts
   being bounded at 90 days.
2. Running the vault auto bill-pay scheduler every 5
   minutes (per `*/5 * * * *`). Bills due in the next
   24 hours start being checked + paid automatically.

Both behaviors were wired in earlier clusters (C6.0 and
C7.8); M9 just turns them on for production.

---

## What this cluster does NOT do

- **No `vercel.json` for non-cron config.** The file
  only contains `crons` — no `buildCommand`, no
  `framework`, no env-var overrides. Vercel detects
  Next.js automatically; the rest is the default.
- **No `CRON_SECRET` enforcement.** The endpoints run
  without `CRON_SECRET` in Vercel (the cron user-agent
  is the implicit auth). A future cluster can add a
  Vercel function middleware that verifies the
  user-agent. The dev schedule is unaffected (no
  `CRON_SECRET` either).
- **No GitHub Actions cron.** The smoke-deploy
  workflow runs on PRs only; no scheduled workflow.
  Vercel cron is the production scheduler.
- **No per-environment override.** The `vercel.json`
  applies to all production deploys. There's no
  per-preview-deployment override; preview
  deployments don't run crons anyway (per Vercel
  docs: "Vercel invokes cron jobs only for production
  deployments and not for preview deployments").
- **No "exactly once" guarantee.** Two cron invocations
  at the same minute (e.g. if a Vercel hiccup causes a
  retry) would both fire the scheduler. The functions
  are idempotent — the second one finds nothing to do
  and returns `usersProcessed: 0` / `totalRolledUp: 0`.
  No double-delete, no data loss.
- **No alert on `usersFailed > 0`.** The endpoints
  return `ok: false` when any user fails, and the
  response body has per-user `error` strings. A future
  observability cluster (Sentry / PagerDuty) can
  surface these.
