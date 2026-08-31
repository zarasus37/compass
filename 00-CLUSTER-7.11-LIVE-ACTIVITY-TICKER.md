# Cluster 7.11 — Real-time live activity ticker in the sidebar

**Status**: 🚧 IN PROGRESS (session `mvs_5c23655691c34fe6abace1b8c67fdabc`, started 2026-08-31 04:35 CDT)
**Predecessor**: `1f21ea1` (Cluster 7.10 — cron alert surface)
**Goal**: Surface the last 3 vault events as a small "live" ticker under the `// Ledger` chapter header in the sidebar, so every page in the signed-in app shows a real-time feed of what just happened.

---

## Why this cluster

The C7.6 SSE bus (`src/lib/vault/audit-bus.ts` + `src/lib/vault/use-audit-stream.ts` + `src/app/api/vault/audit/stream/route.ts`) is production-grade. It powers the live audit page (C7.6) and the live bill history (C7.5). Every other end-user surface currently has to know about it to use it.

**The sidebar is the single highest-traffic surface in the app** (visible on every page) and currently shows nothing live. Surfacing the last 3 vault events turns the existing infra into a "this thing is always on" affordance. **It's pure UI on top of work that's already shipped and tested** — small surface, high quality, visible payoff.

The visible-UI-heavy preference wins over the smaller pure-infra items (B/L/K). The big clusters (D, F, G, J) are out of scope for one session at "quality > speed." E (per-bill off-ramp override UI) is the closest alternative but adds bill-editor state churn the spec itself calls "stay in the bill editor for a future cluster" — bigger than it looks.

---

## Scope

### Files to add

- `src/components/shell/LiveActivityTicker.tsx` — new client component, subscribes to the existing `useAuditStream` hook with `limit: 3` + the new `ignoreActionTypes: LIVE_TICKER_IGNORED_TYPES`
- `tests/smoke-live-ticker.mjs` — ~30 checks (page surface + bus round-trip + source-file checks)

### Files to modify

- `src/lib/vault/audit-log-shared.ts`:
  - add `LIVE_TICKER_IGNORED_TYPES: ReadonlySet<AuditActionType>` (the two meta events: `vault.audit_log_viewed`, `vault.bill_history_viewed`)
  - add `LiveTickerEvent` type (derived from `AuditLog` row shape: id, actionType, summary, at, billId?)
  - add `humanizeVaultAction(actionType, payload): string` map (covers all 25+ action types, with a runtime fallback `"event happened"`)
- `src/components/sidebar/AppSidebar.tsx`:
  - slot `LiveActivityTicker` in between the `// Ledger` chapter header and the first nav item
  - only render the ticker rows (not the wrapping chrome) when `events.length > 0`
  - the existing sidebar structure (4 chapters + System footer) is unchanged
- `tests/integration-vault.mjs` — add Phase 4.0 M11 (~15 checks for the wiring)

### Files NOT touched

- `src/lib/vault/audit-bus.ts` — the bus already supports any subscriber; no changes
- `src/lib/vault/use-audit-stream.ts` — the hook already supports `ignoreActionTypes`; no changes
- `src/app/api/vault/audit/stream/route.ts` — the route already supports `?billId=` + any filter; no changes
- `prisma/schema.prisma` — no new fields
- `next.config.ts` — no new headers / redirects
- `src/middleware.ts` — no route changes
- `vercel.json` — no cron changes

---

## Spec details

### `LiveTickerEvent` shape

```ts
export type LiveTickerEvent = {
  id: string;
  actionType: AuditActionType;
  summary: string;          // humanized one-liner
  at: string;               // ISO 8601
  billId?: string;          // present when payload.billId is set
  href?: string;            // deep-link target (only when billId is set)
};
```

`billHistoryHrefForAuditRow` is the existing single source of truth for the deep-link shape (C7.5 contract). The ticker reuses it.

### `humanizeVaultAction` map

Covers all action types in the `recordVaultAudit` union. Examples:

| Action type | Summary (with sample payload) |
|---|---|
| `vault.payment_settled` | `"Rent · $1,820.00 settled"` |
| `vault.payment_failed` | `"Rent · $1,820.00 failed"` |
| `vault.bill_state_changed` | `"Spectrum · FUNDED → EXECUTING"` |
| `vault.cron_prune_failure` | `"Audit log prune failed"` |
| `vault.cron_alert_sent` | `"Sentry alert sent"` |
| `vault.safe_deployed` | `"Safe deployed"` |
| `vault.safe_deploy_failed` | `"Safe deploy failed"` |
| `vault.apy_refreshed` | `"APY refresh: 4.82% → 4.91%"` |
| `vault.apy_refresh_failed` | `"APY refresh failed"` |
| `vault.adapter_fallback` | `"Spritz → MOCK fallback"` |
| `vault.yield_routed` | `"Yield routed · $1,820.00"` |
| `vault.scheduler_run` | `"Scheduler run · 3 bills"` |
| `vault.off_ramp_provider_changed` | `"Off-ramp: MOCK → Spritz"` |
| `vault.allocation_changed` | `"Allocation changed"` |
| `vault.budget_breached` | `"Groceries over by $42.00"` |
| `vault.identity_projection` | `"Identity projected · 4 rows"` |
| `vault.audit_log_viewed` | *(never rendered — in ignored set)* |
| `vault.bill_history_viewed` | *(never rendered — in ignored set)* |
| fallback | `"event happened"` |

The full map is exhaustive (TS error on missing key). The runtime fallback handles future-added types before the map is updated.

### `LiveActivityTicker.tsx` layout

- Vertical stack of up to 3 rows, newest first
- Each row: `●` color dot (10-color vessel palette via existing `colorForActionType`) + 1-line summary in Sora body + relative time (`"2s ago"`, `"1m ago"`, `"3h ago"`, `"2d ago"`) in JetBrains Mono
- Whole row is a `<Link>` to `href` when set, otherwise just text
- A `+1 NEW` flash on the new row for 2s after insertion (same pattern as the C7.6 `LiveAuditTable`)
- `// stream: live | reconnecting` chip at the top of the ticker (3-char label, mono)
- Empty state is NO chrome (don't render the section header or "no events" placeholder — the user just doesn't see anything)
- Container: thin vessel-border top + bottom dividers, 8px vertical padding, no extra surface tint (the sidebar's vessel-dark already provides the canvas)

### `AppSidebar.tsx` slot

- Position: between the `// Ledger` chapter label and the first `// Ledger` nav item
- The ticker is a child of the `<nav>` section for `// Ledger`, not a sibling
- The chapter label's flex layout stays the same; the ticker adds vertical space below it
- `aria-label="Recent vault activity"` on the `<section>` for screen readers
- The "1 new" flash is announced via `aria-live="polite"` so AT users hear the new event

### Smoke (`tests/smoke-live-ticker.mjs`)

- Login as `mom@compass.local` / `correct-horse-battery-staple`
- Direct `prisma.auditLog.create` for 4 sentinel events (3 visible + 1 ignored meta) — bypasses the bus (the smoke can't fire the bus in the dev process without a server roundtrip)
- Hit `POST /api/dev/audit-log-write` for a 5th event so the bus actually fires in the dev process (proves the live path)
- Wait 500ms (SSE heartbeat is 300ms in smoke override)
- GET `/` → parse the rendered HTML; assert:
  - 3 ticker rows present, with the bus-fired event first
  - color dots match the action-type color (djb2 hash → same palette as audit page)
  - summaries are humanized (e.g. `"Rent · $1,820.00 settled"`)
  - billId rows have `<a href="/vault/bills/.../history">`
  - the meta event is NOT in the ticker
  - the 4th sentinel (would be 4th) is dropped at the limit
  - `// stream: live` chip is present
- Source-file checks: `LIVE_TICKER_IGNORED_TYPES` is a `Set`, contains exactly the two meta events; `humanizeVaultAction` covers every `AuditActionType` in the union (parse from `db.ts`); `LiveActivityTicker` is imported in `AppSidebar.tsx`; new ticker is wrapped in `aria-label` + `aria-live`

### Integration-vault M11 (~15 checks)

- `AppSidebar.tsx` imports `LiveActivityTicker`
- `LiveActivityTicker` imports `useAuditStream` from `@/lib/vault/use-audit-stream`
- The ticker passes `limit: 3` + `ignoreActionTypes: [...LIVE_TICKER_IGNORED_TYPES]`
- `humanizeVaultAction` map covers all action types in `db.ts`'s `recordVaultAudit` union
- `LIVE_TICKER_IGNORED_TYPES` contains exactly `vault.audit_log_viewed` + `vault.bill_history_viewed`
- `LiveTickerEvent.href` uses `billHistoryHrefForAuditRow` (same helper as C7.5)
- `aria-label="Recent vault activity"` present in AppSidebar render path
- `aria-live="polite"` present on the flash region
- The ticker renders nothing when `events.length === 0` (no chrome leak)

---

## Visible-UI payoff

- Every signed-in page shows a live feed under the `// Ledger` chapter
- New events stream in with a `+1 NEW` flash for 2s
- The 3-event limit means the ticker never crowds the sidebar
- The color dot is the same color the user sees in the audit page action-type column — they learn the type signature visually

## Infra-vs-UI mix

- ~10% new wiring (1 helper, 1 ignored-set, 1 hook call)
- ~85% pure presentation
- ~5% smoke + wire checks

---

## Risks + mitigations

1. **Self-feedback loop** — same as C7.6: a direct `prisma.auditLog.create` from a smoke doesn't fire the dev server's bus. Use `POST /api/dev/audit-log-write` (or a direct bus emit) for the bus-fired assertion. Documented in the smoke.
2. **Color stability** — `colorForActionType` is djb2-based and stable; no change.
3. **Latency surprise** — 300ms heartbeat (smoke override) means the user might see a stale state for ~1s. Acceptable; documented in the humanize fallback.
4. **Sidebar height growth** — the ticker adds up to 3 rows × ~24px = 72px vertical. Acceptable. The `// Ledger` chapter already has 7 nav items; the ticker sits at the top, not the bottom, so it doesn't push the System footer out of view on a typical screen.

---

## Acceptance

- [x] Cluster spec written (this file)
- [ ] HANDOVER.md updated
- [ ] COORDINATION.md updated
- [ ] `LiveActivityTicker.tsx` ships
- [ ] `humanizeVaultAction` exhaustive + falls back gracefully
- [ ] `LIVE_TICKER_IGNORED_TYPES` blocks the two meta events
- [ ] `AppSidebar.tsx` slots the ticker under `// Ledger`
- [ ] `tsc --noEmit` clean across all 70+ source files
- [ ] `tests/smoke-live-ticker.mjs` green (~30 checks)
- [ ] `tests/integration-vault.mjs` Phase 4.0 M11 green (~15 checks)
- [ ] Full smoke baseline (~1,730 + 45 = ~1,775 checks) green
- [ ] Single commit on top of `1f21ea1` with the cluster shape
- [ ] HANDOVER.md "Recent change worth knowing about" + "Next cluster" updated
- [ ] COORDINATION.md "Last update" line + entry updated
- [ ] Memory three-question test (any new lesson worth saving?)
