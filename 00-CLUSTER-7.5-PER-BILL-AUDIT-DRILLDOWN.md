# Cluster 7.5 — Per-Bill Audit Drill-Down (visible UI)

**Date**: 2026-08-30
**Predecessor**: `ee405f8` (Cluster 7.4 — Audit log viewer)
**Layer**: Vault
**Status**: spec — pending implementation

---

## What

A new `/vault/bills/[id]/history` route that surfaces one bill's full event stream. Mirrors the `/vault/audit` (Cluster 7.4) pattern, but scoped to a single bill. Plus two deep-link wirings so the user can navigate from the global audit log + the bill schedule.

## Why

The `/vault/audit` page (7.4) shows every event for the user, but when a `vault.payment_settled` or `vault.bill_state_changed` row catches the user's eye, they have no way to see "everything that ever happened to this bill." A click on a bill-scoped row should deep-link to this page. The data shape already exists — every bill event writes `billId` into the audit payload — and the URL contract from 7.4 extends naturally (`?type=&take=`).

Per the "visible UI matters more than invisible architecture" preference (xKryptic, 2026-08-22), the headline numbers carry growth-oriented suggestion chips (per the 2026-08-24 directive).

## Scope

### 1. New route: `/vault/bills/[id]/history` (force-dynamic, server-rendered)

**Header**
- `PageHead` with eyebrow `// ledger · vault · bills · history`, title "<biller name> — full event stream", em "every action this bill has ever seen."
- Back link to `/vault` and to `/vault/audit?type=vault.bill_state_changed`.

**`BillHeader`** (server component)
- Bill name (large, Sora), vessel affiliation chip (per the 7-vessel mapping), amount (mono, USD), frequency, current state badge (uses `tone()` + `userLabel()` from `state-machine.ts`), next execution window, last attempt, source (`user` / `seed`).
- `// 404 — bill not found` empty state when the bill id doesn't exist for this user.

**`BillSummaryStrip`** (4-cell, per the 2026-08-24 directive)
- `total events` — count + `// since <date of first>`
- `current state` — `userLabel(status)` + `tone()` color block + `[TIMELINE →]` chip
- `most active type` — top actionType by count for this bill + `[FILTER →]` chip (deep-links to `?type=<type>`)
- `last activity` — relative time + `// n events / last 7d`

**`BillTimeline`** (server component, visual-first per 2026-08-23)
- Horizontal stepper showing the 8 user-facing states (EARNING → FUNDED → PREPARING → EXECUTING → SETTLED, plus alternate paths: ACTION REQUIRED / PAY MANUALLY / PAUSED / CANCELLED).
- Each step: label + tone color + the audit event count that hit this state (drawn from `vault.bill_state_changed` rows for this bill).
- The current state pulses (border + accent dot).
- Optional: small arrow under each transition showing the event that drove it (`FUND`, `BEGIN_SETTLEMENT`, `EXECUTE`, `CONFIRM_SETTLED`, `RETRY`, etc.).

**`BillEventTable`** (server component — same shape as `AuditTable`)
- Newest first, default `take=50`, `?take=200` to bump (capped by data layer at 200).
- Columns: `// when` (ISO timestamp, mono), `// type` (chip with type's stable color), `// payload` (pretty-printed JSON in `<details>`).
- Empty state: `// no events for this bill` (with a `[SEE VAULT AUDIT →]` chip deep-linking to `/vault/audit?type=vault.bill_state_changed`).
- URL contract (extends 7.4): `?type=<exactActionType>`, `?take=<n>`. No `prefix` or `q` (per-bill scope is already narrow).

**Footer**: `// first event: <iso> · /vault/audit?type=vault.bill_state_changed →`

### 2. New event type: `vault.bill_history_viewed`

- Added to the `actionType` union in `src/lib/vault/db.ts:recordVaultAudit` (TS-only, Prisma's column is `String`).
- The page writes one row at the end of every render, payload `{ billId, billerName, filter: { type, take } | null, at: ISO }`.
- The page reads BEFORE writing (so the just-written event doesn't show in this visit's table; the next visit will).
- Mirrors `vault.audit_log_viewed` (7.4) exactly.

### 3. New data helpers in `src/lib/vault/audit-log.ts`

```ts
// Reads
export async function getBillByIdForUser(
  userId: string,
  billId: string,
): Promise<{
  bill: ScheduledBill;
  envelope: { id: string; name: string; category: EnvelopeCategory } | null;
} | null>;

export async function getBillAuditLog(
  userId: string,
  billId: string,
  filter: { type?: string; take?: number },
): Promise<AuditLogRow[]>;

export async function getBillAuditSummary(
  userId: string,
  billId: string,
): Promise<{
  totalEvents: number;
  firstEventAt: string | null;
  lastActivityAt: string | null;
  mostActiveType: AuditLogTypeCount | null;
  eventsThisWeek: number;
  stateTransitionsByState: Record<string, number>;
  currentState: BillStatus | null;
}>;

// Writes
export async function recordBillHistoryViewed(args: {
  userId: string;
  billId: string;
  billerName: string;
  filter: { type?: string; take?: number };
}): Promise<void>;
```

**Query shape** (per-bill audit log):
- Postgres JSON path filter: `payload: { path: ['billId'], equals: billId }` (Prisma 7 syntax for JSON-typed columns; `payload` is `String`, so we filter in JS over the parsed payload — see "Gotcha" below).
- Actually: `payload` is `String` in the schema (per the existing audit-log pattern), so we filter by `userId` first, then post-filter the rows in JS. The bill's audit set is bounded (~10s of rows per bill) so this is cheap.

**URL contract (extends 7.4)**:
- `?type=<exactActionType>` — narrows to one type for this bill
- `?take=<n>` — page size (default 50, max 200)
- Combinations are AND

### 4. Deep-link wiring

**A. From `/vault/audit` table** — in `AuditTable.tsx`, when a row's `payload.billId` is a non-empty string, wrap the `// when` cell in a `<Link href="/vault/bills/<billId>/history">` (so the existing column becomes a clickable deep-link). The same logic applies to `vault.scheduler_run` rows whose `payload.billId` is set. Other rows (e.g. `vault.funded`, `vault.aave_supply`) keep the existing static text.

**B. From `/vault` bill schedule** — in `BillScheduleClient.tsx`, wrap the `<span>{bill.billerName}</span>` (line 238) in a `<Link href="/vault/bills/<bill.id>/history">` styled as an inline link (text color: `var(--vessel-accent)`, underline on hover, no other layout change).

### 5. New smoke: `tests/smoke-bill-history.mjs`

~35-40 checks across:
- Login as `mom@compass.local`.
- Sentinel setup: write a bill + 3-4 audit events for that bill via the shared Prisma client (self-contained, like `smoke-audit-log.mjs`).
- Page renders 200 with all 4 sections (BillHeader, BillSummaryStrip, BillTimeline, BillEventTable).
- `BillHeader` shows the bill name + amount + state badge with the right tone color.
- `BillSummaryStrip` shows 4 cells with growth-oriented suggestion chips.
- `BillTimeline` shows the 8 state labels and the current state is highlighted.
- `BillEventTable` shows the seeded audit events newest first.
- `?type=<type>` narrows the table; `?take=200` bumps take.
- `vault.bill_history_viewed` event appears after a visit (fire-and-forget AFTER the read).
- The new event type is in the `recordVaultAudit` union (source-file check).
- The `/vault/audit` table row with a `billId` in its payload has a `<a href="/vault/bills/<id>/history">` link.
- The `/vault` bill list's bill name is a `<a href="/vault/bills/<id>/history">` link.
- `package.json` smoke script includes `smoke-bill-history.mjs`.
- `pnpm tsc` is clean.

### 6. Integration-vault update

Add a "Phase 4.0 M5 — Bill audit drill-down" section in `tests/integration-vault.mjs`:
- Hit `/vault/bills/<seeded-bill-id>/history` after the existing M4 sync flow
- Verify 200 + headline + table
- Verify a `vault.bill_history_viewed` row exists
- Verify the seeded M4 payment events show up in the table
- ~5-7 new checks; brings integration total to ~170

### 7. Files

**New:**
- `src/app/(app)/vault/bills/[id]/history/page.tsx` — the page (server component, force-dynamic)
- `src/app/(app)/vault/bills/[id]/history/BillHeader.tsx` — bill snapshot + state badge
- `src/app/(app)/vault/bills/[id]/history/BillSummaryStrip.tsx` — 4-cell headline
- `src/app/(app)/vault/bills/[id]/history/BillTimeline.tsx` — state machine stepper
- `src/app/(app)/vault/bills/[id]/history/BillEventTable.tsx` — per-bill event table
- `tests/smoke-bill-history.mjs` — ~35-40 checks

**Modified:**
- `src/lib/vault/audit-log.ts` — add `getBillByIdForUser`, `getBillAuditLog`, `getBillAuditSummary`, `recordBillHistoryViewed`, `parseBillHistoryFilter`, `billHistoryFilterToQuery`
- `src/lib/vault/db.ts` — add `"vault.bill_history_viewed"` to the `actionType` union in `recordVaultAudit`
- `src/app/(app)/vault/audit/AuditTable.tsx` — when `payload.billId` is set, the `// when` cell becomes a `<Link>` to `/vault/bills/<id>/history`
- `src/components/vault/BillScheduleClient.tsx` — wrap `billerName` in a `<Link>` to the bill's history
- `package.json` — add `tests/smoke-bill-history.mjs` to the `smoke` script (after `smoke-audit-log.mjs`)
- `tests/integration-vault.mjs` — add Phase 4.0 M5 section
- `HANDOVER.md` + `COORDINATION.md` — reflect 7.5

## Out of scope (deferred)

- **Real-time updates on the bill history page** — no SSE; this page is force-dynamic
- **Per-bill filterable activity strip** — not needed; the bill's event count is bounded
- **Bill-level export** (CSV / JSON) — same as the audit-log export deferral
- **Cross-bill history view** (multiple bills in one timeline) — future cluster
- **Filter pill on the page** — the `?type=` URL contract is enough for v1
- **Bill name as a search target** — the URL contract narrows by actionType only
- **`vault.bill_state_changed` payload** — already includes `billId`, `billerName`, `from`, `to`, `event`. The timeline can read these directly. No schema change.

## Pre-existing pattern notes (do not re-litigate)

- The `vault.audit_log_viewed` meta event (7.4) is the model for the new `vault.bill_history_viewed` event — fire-and-forget AFTER the read, so the just-written event doesn't show in the same visit's table.
- The bill state machine in `src/lib/vault/state-machine.ts` is the source of truth for valid transitions. The history page's timeline uses the same 8 user-facing labels and tones.
- The bill's row in `VaultAccount.vaultEnvelope.bills[]` is the same source the bill schedule table reads. The history page reads from `prisma.scheduledBill.findUnique({ where: { id: billId } })` for the header (single source of truth for the bill, scoped by user via the `vaultId`).
- The per-bill audit log query is post-filtered in JS over `prisma.auditLog.findMany({ where: { userId } })` — the `payload` column is `String` (per the existing schema), so we parse and filter in app code. The bill's audit set is bounded (~10s of rows per bill) so the JS cost is negligible.
- The `colorForActionType` palette from `audit-log.ts` is reused for the event chips in `BillEventTable` — same color shows up across `/vault/audit` and `/vault/bills/[id]/history` for the same actionType.
- The "4-cell headline with growth-oriented suggestion chips" pattern from `AuditHeadlineStrip` (7.4) is the model for `BillSummaryStrip`.

## Gotchas

1. **Per-bill auth scoping** — the page must verify the bill belongs to the current user before rendering. Use `prisma.scheduledBill.findFirst({ where: { id: billId, envelope: { vault: { userId } } } })` — NOT `prisma.scheduledBill.findUnique({ where: { id: billId } })` (which would 500 on a bill that exists for another user). The handoff already calls this out.
2. **404 vs 200-with-empty-state** — when the bill doesn't exist for this user, render a `// 404 — bill not found` panel (matching the audit log's empty-state pattern), not a Next.js 404. Reason: a 404 hides the surrounding chrome (PageHead, back-link), which is bad UX. The audit page's empty-state pattern is the model.
3. **The `payload` column is `String`** — JSON filtering via Prisma's `payload: { path: ['billId'], equals: billId }` works only for `Json` columns; our column is `String`. Post-filter in JS: `rows.filter(r => { try { return JSON.parse(r.payload).billId === billId; } catch { return false; } })`. Bounded set, cheap.
4. **State transitions from `vault.bill_state_changed` payloads** — the `from` and `to` fields give us everything the timeline needs. The timeline doesn't need to query the bill's current state separately; the BillHeader reads it from `prisma.scheduledBill.findUnique`.

## Acceptance

- `pnpm tsc` clean
- `pnpm smoke:all` all 31 data-layer smokes green (was 30, +1 for `smoke-bill-history`), plus 13 UI + 1 integration + 1 deploy — ~1,550 checks (was ~1,510)
- The new `/vault/bills/[id]/history` page renders, filters work, the timeline shows the state progression
- A `vault.bill_history_viewed` row appears after a visit (visible on the next render)
- A click on a `vault.payment_settled` row in `/vault/audit` deep-links to the bill's history
- A click on a bill name in `/vault` deep-links to that bill's history

## Pre-existing inconsistency (not in scope, follow-on)

- `.env.production.example` uses `VAULT_SIGNER_KEY` but `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. Trivial fix, separate cluster.
