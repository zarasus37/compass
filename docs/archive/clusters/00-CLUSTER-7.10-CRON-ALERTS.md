# Cluster 7.10 — Cron alert surface (M10)

**Status**: design + spec
**Date**: 2026-08-31
**Author**: Mavis (follow-on to Cluster 7.8.2)
**Predecessor**: Cluster 7.8.2 (Vercel cron schedule), commit `52bb94c`

---

## Goal

When the audit log retention cron (Cluster 7.8 / M8) returns
`usersFailed > 0`, currently nothing surfaces the failure to
ops. The bulk helper's response (`{ ok, usersFailed, totalRolledUp,
... }`) goes back to Vercel, which records the response but
doesn't alert on it. The dev scheduler logs to stdout. Nobody
checks either routinely.

Cluster 7.10 wires an alert surface: when a user fails to
prune, two things happen:

1. **A durable audit row is written** with actionType
   `vault.cron_prune_failure`. The row is the source of
   truth — it's queryable, visible in the `/vault/audit`
   page table, and persists in the existing audit log infra.
2. **An optional webhook POST** is fired to
   `CRON_ALERT_WEBHOOK_URL` (Sentry envelope / PagerDuty
   Events API v2 / generic JSON, auto-detected from the URL).
   When the env var is unset, only the audit row is written.

The audit row is visible in the existing audit page; the user
sees `vault.cron_prune_failure` rows in the table next to
normal events. The webhook is a real-time shortcut so ops
don't have to remember to check the audit page.

Visible-UI payoff: minimal but real. The user sees
`vault.cron_prune_failure` rows in the audit page table
(actionType column has a new color from the existing
`colorForActionType` palette). The activity strip / type
distribution get one more type to filter on. The headline
strip is unaffected (per the 7.4 contract — unfiltered
totals).

Why now (vs other candidates):

- **The cron is now production-scheduled (C7.8.2).** M9
  wired `vercel.json` so the cron actually fires in
  production. Without M10, a failure means the live
  AuditLog table keeps growing unbounded — silent data
  loss. A failed prune is a regression; the team needs
  to know.
- **Sentry/PagerDuty is a standard pattern.** The
  webhook format is auto-detected from the URL; the
  smoke + integration-vault verify the code path
  without requiring real Sentry/PD accounts. Production
  setup is a single env var.
- **Audit row is the durable record.** Even if the
  webhook fails (Sentry outage, network blip), the
  failure is captured in the audit log. Ops can
  reconcile later.

---

## Architecture

### `src/lib/vault/audit-log-alerts.ts` (new)

The alert adapter. Two functions:

- `recordCronAlert({ userId, kind, error, context? })` —
  writes the durable audit row, then attempts the webhook
  in parallel. Webhook failures are logged to stderr but
  don't throw (a Sentry outage doesn't fail the cron).
- `getRecentCronAlerts(userId, limit?)` — reads recent
  failure rows for the dev endpoint.

The webhook format is auto-detected:

| URL contains        | Format                              |
| ------------------- | ----------------------------------- |
| `sentry.io`         | Sentry envelope                     |
| `pagerduty.com`     | PagerDuty Events API v2             |
| (anything else)     | Generic JSON: `{ event, severity, message, details }` |

The 2s hard timeout on each webhook POST keeps the cron's
overall time budget under control. The audit row write is
fast (~50ms), so a single alert adds ~2s to the cron's
total time at most. Vercel's 10s cron budget is plenty of
headroom.

The adapter is fire-and-forget: `Promise.allSettled` in
the bulk helper means each alert runs independently. One
failed webhook (or even one failed audit row write) doesn't
break the others.

### `src/lib/vault/audit-log-cron.ts` (modified)

The bulk helper's loop is unchanged. After the loop,
filtered ERROR results are passed to `recordCronAlert` in
parallel:

```ts
const failedResults = results.filter((r) => r.status === "ERROR");
if (failedResults.length > 0) {
  await Promise.allSettled(
    failedResults.map((r) =>
      recordCronAlert({
        userId: r.userId,
        kind: "prune_failure",
        error: r.error ?? "unknown error",
        context: { retentionDays, now: now.toISOString() },
      }),
    ),
  );
}
```

The bulk helper's response shape is unchanged: same
`{ ok, usersProcessed, usersFailed, ... }`. The alert is
a side effect.

### `src/lib/vault/db.ts` (modified)

Added `vault.cron_prune_failure` to the `recordVaultAudit`
action type union. The audit page renders it like any other
event (the `colorForActionType` djb2 hash picks a color
automatically).

### `src/app/api/dev/cron-alerts/route.ts` (new)

Dev-only endpoint for the smoke + manual ops checks. POST
writes a fake alert; GET returns recent alerts for the user.
Same `NODE_ENV !== "production"` gate as the other dev
endpoints.

### `.env.production.example` (modified)

Documents the optional `CRON_ALERT_WEBHOOK_URL` and
`CRON_ALERT_PAGERDUTY_ROUTING_KEY` env vars.

---

## Files

**New**
- `src/lib/vault/audit-log-alerts.ts` — alert adapter
- `src/app/api/dev/cron-alerts/route.ts` — dev endpoint
- `tests/smoke-cron-alerts.mjs` — 36-check smoke
- `00-CLUSTER-7.10-CRON-ALERTS.md` — this spec

**Modified**
- `src/lib/vault/db.ts` — added `vault.cron_prune_failure`
  to the `recordVaultAudit` union
- `src/lib/vault/audit-log-cron.ts` — calls
  `recordCronAlert` for each ERROR result
- `.env.production.example` — documents webhook env vars
- `package.json` — added `smoke-cron-alerts.mjs` to chain
- `tests/integration-vault.mjs` — Phase 4.0 M10 (22 checks)

---

## Smoke plan

`tests/smoke-cron-alerts.mjs` (36 checks):
1. Login + cleanup
2. POST `/api/dev/cron-alerts` with a fake error → 200, body has `ok: true`, error echoed
3. GET `/api/dev/cron-alerts` → 200, body has `alerts: [...]`
4. The just-written alert is in the list with the right actionType, kind, error, context, at
5. DB-layer assertion: 1 audit row with the right userId
6. `?limit=1` returns at most 1 alert
7. Source-file checks: adapter exports + webhook URL detection + 2s timeout + URL masking; dev endpoint exports POST+GET + NODE_ENV gate; `recordVaultAudit` union includes the new type; bulk prune imports + uses `recordCronAlert`; package.json has the new smoke
8. Audit page renders the new action type

`tests/integration-vault.mjs` Phase 4.0 M10 (22 checks):
same source + wire checks at the integration level.

The webhook itself is **not** verified end-to-end in the
smoke (it would require either a mock HTTP server reachable
from the dev server's process or a real Sentry account).
The smoke verifies the durable record (audit row) and the
source-file wiring. The webhook is verified in production
by setting the env var and watching the receiver.

---

## Visible-UI payoff

Minimal but real:
- The audit page table on `/vault/audit` shows
  `vault.cron_prune_failure` rows (one per failed user per
  cron run). The user can filter for them via `?type=`.
- The type distribution + activity strip + headline strip
  treat them like any other event type (per the 7.4
  contract — unfiltered totals).
- The actionType column has a new color (from the
  existing `colorForActionType` djb2 hash).

No new components, no new chrome, no new chips. The user
sees a new color in the table when a cron failure has
occurred.

---

## What this cluster does NOT do

- **No real Sentry/PagerDuty integration testing.** The
  webhook code path is verified by source-file checks +
  unit-test-style review. A real webhook test would need
  a mock HTTP server in the dev process OR a real Sentry
  test project. The smoke doesn't do this; production
  setup is one env var.
- **No retry / backoff on webhook failure.** The 2s
  hard timeout means we give up quickly; we don't retry.
  A Sentry outage means the alert is missed. The audit
  row is still there; ops can reconcile from the audit
  log later. A future cluster can add retry with
  exponential backoff if Sentry's uptime proves flaky.
- **No alert on `usersFailed === 0` (the happy path).**
  Only failures are alerted. A successful cron run is
  the default; no need to notify.
- **No alert deduplication across runs.** If the same
  user fails every day for a week, the system writes
  7 audit rows + 7 webhook POSTs. PagerDuty's
  `dedup_key` (`compass-cron-prune_failure-<userId>`)
  collapses the PagerDuty side. Sentry's `event_id`
  doesn't dedupe natively; if the user wants Sentry
  dedup, they configure it in their Sentry project
  rules. The audit log has the full 7-row history.
- **No aggregate alert ("5 users failed this run").**
  Each user gets their own alert. The aggregate lives
  in the cron response (`{ usersFailed: 5 }`) and the
  Vercel logs. A future cluster can add a summary
  alert if individual alerts get noisy.
- **No vault cron alerts.** The vault auto bill-pay
  scheduler (Cluster 6.0) doesn't go through this
  surface yet. The `recordCronAlert` API supports
  adding `kind: "vault_billpay_failure"` (or similar)
  in a future cluster without breaking the alert
  surface; the union is open.
