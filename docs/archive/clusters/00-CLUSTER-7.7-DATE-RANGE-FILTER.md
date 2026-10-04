# Cluster 7.7 — Date range filter on `/vault/audit`

**Status**: design + spec
**Date**: 2026-08-30
**Author**: Mavis (cluster pickup from handoff)
**Predecessor**: Cluster 7.6 (SSE live updates), commit `3af7566`

---

## Goal

The `/vault/audit` page (C7.4) is filterable by `?type=`,
`?prefix=`, `?q=`, and `?take=`. But the most common
"narrow this" action is "show me only events from the last
7 days" or "only this month" — a time window, not a type.
Cluster 7.7 adds `?from=YYYY-MM-DD` and `?to=YYYY-MM-DD`
plus a row of preset chips (24h / 7d / 30d / 90d / All time)
that the user can click to scope the entire page in one
action. Visible-UI; small surface; no infra. Compounds
naturally on C7.6 (the SSE live-update wiring already filters
streamed rows through the same predicate — the date filter
extends the predicate, not the wire).

---

## Why now (vs other candidates)

- **Highest visible-UI payoff for the next cluster.** The
  audit log has 20+ event types accumulated since Cluster
  2.0; the user wants to scope to "this week" or "this
  month" for routine review. A single click on a chip is
  faster than navigating a date picker.
- **Pairs naturally with the C7.6 SSE live updates.** The
  live wrapper already filters streamed rows through
  `rowMatchesAuditFilter`; the date filter is just two
  more conditions on the same predicate. No new infra.
- **Pre-cluster for future retention work.** A "roll up
  old events into daily summaries" cluster (the 7.7
  candidate B from the handoff) can use the same `from` /
  `to` URL contract.

---

## URL / wire contract

### `?from=` and `?to=` query params

- **Format**: `YYYY-MM-DD` (local date). Anything else is
  silently dropped (per the 7.4 contract — invalid filter
  values are forgiven, not 400'd).
- **Semantics**: `from` is INCLUSIVE; `to` is INCLUSIVE
  (the upper bound is `to + 1 day` exclusive at the DB
  layer, so a `?to=2026-08-30` filter still includes rows
  that landed at 23:59:59 on Aug 30).
- **Combinations**: AND with `?type=`, `?prefix=`, `?q=`,
  `?take=`. The 4-cell headline strip stays UNFILTERED
  (per the 7.4 contract — the user always sees the full
  picture); the activity strip + type distribution + table
  respect the filter.
- **Edge case**: `from > to` drops `to` (more useful than
  silently returning 0 rows).

### Preset chips

The `DateRangeBar` renders 5 chips. Each is a `<Link>` that
sets `?from=` and `?to=` to a fixed window relative to
"now" (the page's render time).

| Chip id | Label              | Window (days back from today) |
|---------|--------------------|------------------------------|
| 24h     | Last 24 hours      | 1 day                        |
| 7d      | Last 7 days        | 7 days                       |
| 30d     | Last 30 days       | 30 days                      |
| 90d     | Last 90 days       | 90 days                      |
| all     | All time           | no `from`, no `to`           |

The chip's href merges the new range with the page's
existing filter (type/prefix/q/take) via
`auditLogFilterToQuery`. Clicking "Last 7 days" while
`?type=vault.payment_settled` is active produces
`?type=vault.payment_settled&from=<today-7>&to=<today>`.

A `[CLEAR]` chip is shown when a range is active. It
preserves the rest of the filter and drops only the date
params.

### Activity strip dimming

The 30-day activity strip (C7.4) stays fixed-width
("30 days" is the user's "view of recent activity" — too
short is lossy, too long is cluttered). When a date range
is active, bars OUTSIDE the range are dimmed to 30%
opacity. Bars on the range boundary are still full
opacity so the visual cutoff is obvious. The header label
flips from `// 30-day shape` to `// 30-day shape (range
active)`.

---

## Files

### New

| Path                                                     | Purpose |
|----------------------------------------------------------|---------|
| `src/app/(app)/vault/audit/DateRangeBar.tsx`             | The preset chips + active-range badge + clear chip. Server component (chips are plain `<Link>`s). |
| `00-CLUSTER-7.7-DATE-RANGE-FILTER.md`                    | This file. |

### Modified

| Path                                                     | Change |
|----------------------------------------------------------|--------|
| `src/lib/vault/audit-log-shared.ts`                      | `AuditLogFilter` gains `from?: string`, `to?: string`. `parseAuditLogFilter` parses + validates (silently drops invalid). `auditLogFilterToQuery` includes them when set. `rowMatchesAuditFilter` also gates on the date range (defense-in-depth for streamed rows). New helpers: `parseYmdDate`, `toYmd`, `dateRangeForPreset`, `hasDateRange`. New constant: `DATE_RANGE_PRESETS`. |
| `src/lib/vault/audit-log.ts`                              | `whereFromFilter` adds `createdAt: { gte: from, lt: to + 1 day }` when set. Re-exports the new shared helpers for back-compat. |
| `src/app/(app)/vault/audit/page.tsx`                     | Wires `DateRangeBar` between PageHead and the headline strip. Forwards `from` / `to` to `LiveAuditTable`. Section header title flips to "Last 30 days (range dimmed)" when a range is active. |
| `src/app/(app)/vault/audit/ActivityStrip.tsx`            | New `rangeFrom` / `rangeTo` props. Bars outside the range are dimmed to 30% opacity. Each bar `<g>` gets a `data-in-range` testid attribute. |
| `src/app/(app)/vault/audit/LiveAuditTable.tsx`           | The `filter` prop type now includes `from` / `to`. `rowMatchesAuditFilter` (which the wrapper already calls) handles the date check. No new behavior in this file beyond the prop type. |
| `tests/smoke-audit-log.mjs`                               | New checks: preset chips render, click sets `?from=`, clear chip drops the range, dimming works, out-of-range rows are excluded, source-file checks. |
| `HANDOVER.md` + `COORDINATION.md`                         | The 7.7 entry, baseline table, "next cluster" pointer. |

---

## Self-feedback / behavior

- **The SSE live wrapper** (`LiveAuditTable`) already calls
  `rowMatchesAuditFilter` on every streamed row. With the
  date filter applied, streamed rows that fall outside the
  range are dropped before prepending. The user sees only
  in-range rows stream in.
- **The `vault.audit_log_viewed` meta event** is still
  ignored by the hook (the page's own write-after-read
  meta event). The page writes the meta event AFTER the
  read (per the 7.4 contract), so the meta event is on
  `now` and always in range — but the hook drops it
  regardless. Self-feedback is unchanged.
- **The 4-cell headline strip** stays UNFILTERED. The
  date filter is a "view" of the data; the user still sees
  the total + this-week + most-active-type + last-activity
  over the entire log. The "last activity" cell pairs with
  the date filter: clicking the headline's "last activity"
  chip links to the page with no date range, so the user
  can always see the full picture.

---

## Smoke plan (~8 new checks in `tests/smoke-audit-log.mjs`)

1. **`/vault/audit` renders the DateRangeBar.** The 5
   preset chips are present (`data-testid="vault-audit-range-24h"`,
   `…-7d`, `…-30d`, `…-90d`, `…-all`).
2. **No range active by default.** The page's URL has no
   `?from` or `?to`; the `[CLEAR]` chip is NOT rendered.
3. **Clicking "Last 7 days" sets `?from=…&to=…`.** The
   chip's `href` matches `?from=<today-7>&to=<today>` (regex
   against the rendered HTML).
4. **The active chip is highlighted.** After setting the
   range, the `7d` chip has `data-active="true"`.
5. **`?from=YYYY-MM-DD` narrows the table.** With a known
   sentinel row's date known, `?from=<sentinelDate>` returns
   the sentinel; `?from=<sentinelDate+1>` returns 0 rows.
6. **`?from=` + `?type=` compose.** The combo narrows the
   table to rows that match BOTH predicates.
7. **Out-of-range bars are dimmed.** When a range is
   active, the `data-in-range="false"` bars exist; when
   no range is active, all bars are `data-in-range="true"`.
8. **`[CLEAR]` chip drops the range.** The chip's `href`
   has no `?from` or `?to`, but preserves any other active
   filter (e.g. `?type=`).
9. **Malformed `?from=` is silently dropped.** `?from=garbage`
   renders the page without a range (no `[CLEAR]` chip, no
   `vault-audit-range-active` badge).
10. **Source-file checks:** `DateRangeBar.tsx` exists,
    `DATE_RANGE_PRESETS` lives in `audit-log-shared.ts`,
    `whereFromFilter` handles the date range in
    `audit-log.ts`.

---

## Visible-UI deliverable

- A row of 5 preset chips appears between the page head
  and the headline strip. The active chip is highlighted
  in the accent color; the rest are dim.
- When a range is active, the 30-day activity strip dims
  the out-of-range bars to 30% opacity so the user sees
  both the recent shape AND the highlighted window.
- An active-range badge (`from 2026-08-23 → 2026-08-30`)
  sits to the right of the chips, with a `[CLEAR]` chip
  next to it.
- The section header above the activity strip flips from
  "Last 30 days" to "Last 30 days (range dimmed)" so the
  user knows the strip's data is unchanged but the range
  is applied.

The headline numbers stay UNFILTERED — the user always
sees the total + this-week + most-active-type + last-
activity. The 4-cell strip is the "ground truth" of the
audit log; the date range is a "view" into a subset of it.

---

## What we are NOT doing in this cluster

- **No date picker / custom range UI.** The preset chips
  cover the 90% case; a full date-picker is a future
  cluster (could pair with a "comparing two ranges"
  feature).
- **No `?from` / `?to` on the bill history page.** The
  bill's event set is bounded (~10s of rows per bill);
  a date filter there is less useful.
- **No audit-log retention / archival.** A "roll up old
  events into daily summaries" cluster is the 7.7
  candidate B; ship the date filter first, retention
  second.
- **No new actionType.** The data layer doesn't change.

---

## Acceptance criteria

- [ ] `pnpm tsc` clean.
- [ ] `pnpm smoke` green (existing 1,522 checks + the ~10
      new date-range checks in `smoke-audit-log.mjs`).
- [ ] Manual: open `/vault/audit`, click "Last 7 days" →
      the table narrows, the activity strip dims bars
      before the window, the headline numbers stay
      unfiltered, the [CLEAR] chip is visible.
- [ ] Manual: combine `?type=vault.payment_settled&from=…`
      → table narrows to the intersection; both filters
      are honored.
- [ ] Manual: malformed `?from=garbage` → no range active,
      page renders normally.
- [ ] HANDOVER.md + COORDINATION.md updated.
- [ ] Single commit on top of `3af7566` (C7.6).
