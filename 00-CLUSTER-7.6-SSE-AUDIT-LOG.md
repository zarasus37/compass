# Cluster 7.6 — Real-time audit log updates (SSE)

**Status**: design
**Date**: 2026-08-30
**Author**: Mavis (cluster pickup from handoff)
**Predecessor**: Cluster 7.5 — Per-bill audit drill-down (visible UI), commit `eb7c1f9`

---

## Goal

The audit log at `/vault/audit` (C7.4) and the per-bill history at
`/vault/bills/[id]/history` (C7.5) currently require a full page reload
to surface new events. Cluster 7.6 makes both surfaces **live**:
whenever the system writes a new `AuditLog` row for the current user,
the affected table prepends the row in real time via a
Server-Sent Events (SSE) stream.

Visible-UI; no schema change; compounds directly on C7.5 (the same
stream can fan out to both pages, and to a future live activity ticker
in the sidebar).

---

## Why SSE (not WebSocket / polling / LISTEN-NOTIFY)

| Mechanism            | Pros                                      | Cons                                                  | Decision |
|----------------------|-------------------------------------------|-------------------------------------------------------|----------|
| **SSE**              | Built into Next.js route handlers; auto-reconnect on the client; one-way (perfect for "server pushes new events"); simple text protocol | Server→client only (we don't need client→server)      | ✅        |
| WebSocket            | Bidirectional                              | Overkill for read-only push; needs a separate ws server | ❌        |
| Polling              | Trivial                                    | Latency = poll interval; wastes requests; bad UX     | ❌        |
| Postgres LISTEN/NOTIFY| Works across multiple Node processes       | Needs a dedicated pg client; more moving parts       | Future    |
| Redis pub/sub        | Cross-process                              | Adds infra (Redis); not in stack today                | Future    |

**Chosen**: SSE over an in-process Node `EventEmitter` pinned to
`globalThis`. Single-server assumption is fine for the dev server
and for the current Vercel-function deployment (one Node process per
region). If we ever scale to multiple Next.js instances behind a
load balancer, the swap path is to replace the bus with a Postgres
LISTEN/NOTIFY trigger + a dedicated `pg` client — the SSE route
handler and the client hook stay the same.

---

## Architecture

```
┌──────────────────┐                    ┌─────────────────────┐
│  recordVaultAudit│── Prisma create ──▶│  PostgreSQL         │
│  (db.ts)         │                    │  AuditLog table     │
└────────┬─────────┘                    └─────────────────────┘
         │                                       ▲
         │ publish(row)                          │ page read
         ▼                                       │
┌──────────────────┐         SSE           ┌────┴───────────────┐
│  audit-bus.ts    │── event per row ────▶│  /api/vault/audit/ │
│  EventEmitter    │                       │  stream route      │
│  (globalThis)    │                       └────────┬───────────┘
└──────────────────┘                                │
                                                    │ text/event-stream
                                                    ▼
                                          ┌─────────────────────┐
                                          │  useAuditStream()   │
                                          │  client hook        │
                                          └────────┬────────────┘
                                                   │ onRow(parsedRow)
                                                   ▼
                                          ┌─────────────────────┐
                                          │  LiveAuditTable /   │
                                          │  LiveBillEventTable │
                                          │  (prepends new row) │
                                          └─────────────────────┘
```

**One writer, many readers.** `recordVaultAudit` is the only path
to the `AuditLog` table; emitting to the bus is a side effect of
that single call. The bus is process-local; the SSE route filters
by `userId` (and optionally `billId` for the history page) before
forwarding to the right client.

---

## Files

### New

| Path                                                     | Purpose |
|----------------------------------------------------------|---------|
| `src/lib/vault/audit-bus.ts`                             | `EventEmitter` pinned to `globalThis`; `publishAuditEvent`, `subscribeAuditEvents`, `unsubscribeAuditEvents`. Carries parsed `AuditLogRow` shape. |
| `src/app/api/vault/audit/stream/route.ts`                | `GET` route. `text/event-stream` response. Auth → subscribe → forward → heartbeat every 15s → cleanup on close. Optional `?billId=` filter. |
| `src/lib/vault/use-audit-stream.ts`                      | Client hook. `EventSource` + auto-reconnect + `ignoreActionTypes` + per-bill filter. |
| `src/app/(app)/vault/audit/LiveAuditTable.tsx`           | `"use client"` wrapper around `AuditTable`. Holds state for streamed rows, prepends them, applies the page's filter, respects the `take` cap, ignores `vault.audit_log_viewed` to avoid self-feedback. |
| `src/app/(app)/vault/bills/[id]/history/LiveBillEventTable.tsx` | Same pattern, scoped to a single bill. Forwards `?billId=` to the stream. |
| `tests/smoke-sse-audit-log.mjs`                          | Self-contained: login → connect stream → write sentinel row via Prisma → assert it lands in ≤2s → assert billId-filtered stream works → assert reconnect after a server-side disconnect. ~25 checks. |
| `00-CLUSTER-7.6-SSE-AUDIT-LOG.md`                        | This file. |

### Modified

| Path                                                     | Change |
|----------------------------------------------------------|--------|
| `src/lib/vault/db.ts`                                    | `recordVaultAudit` calls `publishAuditEvent(row)` after the Prisma write. The single point of broadcast. |
| `src/app/(app)/vault/audit/page.tsx`                     | Pass `initialRows` to `LiveAuditTable` instead of `AuditTable`. Everything else stays. |
| `src/app/(app)/vault/bills/[id]/history/page.tsx`        | Pass `initialRows` to `LiveBillEventTable`. |
| `package.json`                                           | Add `tests/smoke-sse-audit-log.mjs` to the `smoke` script chain. |
| `tests/integration-vault.mjs`                            | New "Phase 4.0 M6 — SSE audit log" section (~8 checks). |
| `HANDOVER.md`                                            | "Cluster 7.6" entry; "Recent change worth knowing about" section; smoke baseline table. |
| `COORDINATION.md`                                        | "Last update" line + Stage 2 entry for 7.6. |

---

## URL / wire contract

### `GET /api/vault/audit/stream`

- **Auth**: session cookie required (existing `getCurrentUser()` check). 401 if not signed in.
- **Query params**:
  - `billId=<id>` (optional) — when set, only events whose payload
    mentions this bill (via `payload.billId` or `payload.billsCredited`)
    are forwarded.
- **Response**: `text/event-stream; charset=utf-8`
  - First event: `id: connected\ndata: {"ok":true}\n\n`
  - Each new audit row for the user: `id: <rowId>\ndata: <JSON AuditLogRow>\n\n`
  - Heartbeat every 15s: `: heartbeat\n\n` (SSE comment, ignored by client)
- **Cleanup**: on `request.signal.aborted`, remove the bus listener + clear the heartbeat timer.

### Client hook `useAuditStream`

```ts
useAuditStream({
  billId?: string;                 // forward to ?billId=
  onRow: (row: AuditLogRow) => void;
  ignoreActionTypes?: string[];    // e.g. ["vault.audit_log_viewed"]
  isOpen?: boolean;                // default true
});
```

- Opens `EventSource('/api/vault/audit/stream' + (billId ? '?billId=...' : ''))`.
- `EventSource` auto-reconnects on error (browser default).
- Closes on unmount or when `isOpen === false`.
- Skips `data: {"ok":true}` (the hello message).
- Calls `onRow(row)` for every parsed event after the ignore filter.

---

## Self-feedback guard

The audit log page writes `vault.audit_log_viewed` after its read
(fire-and-forget; the row doesn't appear in the same visit's table).
With SSE, the bus would push that row back to the same client. The
`ignoreActionTypes` option on the hook solves this: the audit page
passes `["vault.audit_log_viewed"]`; the bill history page passes
`["vault.bill_history_viewed", "vault.audit_log_viewed"]`.

This is the same pattern the existing fire-and-forget write uses —
the just-emitted row is suppressed at the consumer.

---

## Filter + cap behavior

`AuditTable` and `BillEventTable` are server-rendered with a
`take` cap (default 50, max 200) and a filter (`?type=`, `?prefix=`,
`?q=` for audit; `?type=` for bill history). The live wrappers
respect both:

- A streamed row is **filtered** through the same predicates the
  initial read uses (e.g. `actionType === filter.type`). If the row
  doesn't pass, it's dropped before the prepend.
- The combined list is **capped** at `take`. When a new row arrives
  and the list is at the cap, the **oldest** row is dropped from the
  tail.

The wrappers don't grow unbounded.

---

## Smoke plan

### `tests/smoke-sse-audit-log.mjs` (~25 checks)

1. **Auth**: unauthenticated `GET /api/vault/audit/stream` returns 401.
2. **Stream opens**: authenticated request returns 200, `text/event-stream`.
3. **Hello message**: first event is `data: {"ok":true}`.
4. **End-to-end**: open the stream, write a sentinel audit row directly
   via shared Prisma, assert the row's `id` and `actionType` arrive
   in the stream within 2s.
5. **Filter — type**: a stream opened with the page's filter ignores
   events that don't match.
6. **Filter — billId**: a stream opened with `?billId=...` only
   forwards events whose payload mentions the bill (via `billId`
   or `billsCredited`).
7. **Self-feedback guard**: the hook with `ignoreActionTypes: ["vault.audit_log_viewed"]`
   does not call `onRow` for the just-written page-view meta event.
8. **Heartbeat**: the stream emits a `: heartbeat` comment within 20s
   (we patch the interval to 2s in test mode).
9. **Cleanup**: when the client aborts the request, the server-side
   listener is removed (verified via a sentinel count on the bus).
10. **Source-file checks** (defensive):
    - `audit-bus.ts` pins to `globalThis`
    - `db.ts recordVaultAudit` calls `publishAuditEvent`
    - `stream/route.ts` calls `getCurrentUser`
    - `LiveAuditTable.tsx` is `"use client"`
    - `package.json` smoke script includes the new file
    - `integration-vault.mjs` has the M6 phase section

### `tests/integration-vault.mjs` M6 phase (~8 checks)

1. `/api/vault/audit/stream` returns `text/event-stream` when authed.
2. The stream emits a hello message on open.
3. End-to-end: write a sentinel row, assert it arrives in the stream.
4. `?billId=...` filter passes only bill-scoped events.
5. The `LiveAuditTable` client component file exists.
6. The `LiveBillEventTable` client component file exists.
7. The `useAuditStream` hook file exists.
8. `package.json` includes `smoke-sse-audit-log.mjs`.

### Baseline (must stay green)

All 31 existing smokes continue to pass. The wrapper components
preserve the server-rendered initial view; the live behavior is
strictly additive (rows are prepended, never replaced or hidden).

---

## Visible-UI deliverable

| Surface                                            | Before C7.6                       | After C7.6                                              |
|----------------------------------------------------|-----------------------------------|---------------------------------------------------------|
| `/vault/audit`                                     | Static table, full reload to refresh | New rows prepended in <2s as the system writes them |
| `/vault/bills/[id]/history`                        | Same                              | Same; filtered to that bill                            |
| New rows indicator                                 | n/a                               | A small `[+1 NEW]` chip flashes on the table head when a row streams in (3s fade) |
| Connection state                                    | n/a                               | A `// stream: live` chip in the page foot + `// stream: reconnecting` on disconnect |

The `[+1 NEW]` chip is the visible payoff — every action the
system takes now visibly lands in the audit log without a reload.

---

## Upgrade path (documented, not built)

If the project ever deploys to multi-server / multi-region:
1. Replace the bus in `audit-bus.ts` with a Postgres `LISTEN` connection.
2. The trigger `NOTIFY audit_log_changed '<row_json>'` can be added
   as a Prisma migration with a raw SQL block.
3. The SSE route handler and the client hook stay the same.

The single-server assumption is documented in `audit-bus.ts` and in
the HANDOVER "Critical gotchas" list.

---

## What we are NOT doing in this cluster

- **No `Last-Event-ID` resume support.** `EventSource` sends a
  `Last-Event-ID` header on reconnect; we ignore it. A reconnect
  just starts streaming from "now"; events during the disconnect
  window are missed. This is acceptable for an audit log viewer
  (the user can scroll to the bottom or hit refresh).
- **No Postgres LISTEN/NOTIFY.** Single-server assumption holds.
- **No live activity ticker in the sidebar.** Same bus + hook could
  power it, but that's a separate cluster.
- **No new actionType.** The bus is an infra layer; the audit log
  table itself doesn't change.
- **No date-range filter.** That's the 7.6 candidate B; separate
  cluster if you want it.

---

## Acceptance criteria

- [ ] `pnpm tsc` clean.
- [ ] `pnpm smoke:all` green (existing 1,494 checks + the new
      ~25 SSE checks + the 8 new M6 integration checks).
- [ ] Manual: open `/vault/audit` in one tab, click `[SYNC] RUN VAULT SEED`
      in another tab, watch the new `vault.synced` row land in the
      audit table without a reload.
- [ ] Manual: open `/vault/bills/<id>/history` for a bill with recent
      activity, trigger a bill state change from the dev tools,
      watch the new row land in <2s.
- [ ] HANDOVER.md + COORDINATION.md updated.
- [ ] Single commit on top of `f980240` with the spec + the changes.
