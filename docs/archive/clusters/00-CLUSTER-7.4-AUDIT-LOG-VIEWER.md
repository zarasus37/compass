# Cluster 7.4 — Audit Log Viewer (visible UI)

**Date**: 2026-08-29
**Predecessor**: `717e8e0` (handoff + COORDINATION reflect Cluster 7.3)
**Layer**: Vault
**Status**: spec — pending implementation

---

## What

A new `/vault/audit` page that surfaces every action the system has taken on the user's behalf, plus a link chip from `/vault/preferences` to the new page.

## Why

Every setter in the vault (and earlier: the auto-allocate engine, onboarding agent, plan editor) writes an audit row. The user has had no way to see them. This closes the loop — the user can now answer "what did I change last week?" / "when did I last switch off-ramp providers?" / "did that fund actually go through?" with a glance at the audit log.

It also surfaces Cluster 7.3's new `vault.off_ramp_provider_changed` event type, which the user currently has no way to see.

## Scope

### 1. New page: `/vault/audit` (force-dynamic, server-rendered)

**Header**
- `PageHead` with eyebrow `// ledger · vault · audit`, title "Audit log", em "every action, in order."
- Explanation copy explains the audit-the-audited meta event and the filter URL contract.

**Section: `// summary` — 4-cell headline strip (PolicySummaryCard pattern)**
- `total events` — count, sub: `// since {date of first event}`
- `this week` — 7d count, sub: `[OK] / [WARN] N failed` (or quiet state)
- `most active type` — top actionType by count, sub: `[FILTER →]` clickable chip
- `last activity` — relative time since last event, sub: `// n events / last 24h` (or `// quiet — no events in 7d` calm state)
- Each cell has a **growth-oriented suggestion** (per xKryptic User Memory 2026-08-24 — headline numbers pair with clickable suggestions). Suggestions: "Filter to {type} →", "Open this event →", etc.
- 4-col grid on desktop, 2x2 on narrow.

**Section: `// activity` — 30-day activity strip (visual-first, per xKryptic directive 2026-08-23)**
- Pure SVG, 30 day columns, oldest left → today right
- Bar height = `sqrt(count) * 4` (squash so quiet days still show), max 60px
- Bar color: cyan (terminal) by default, `vessel-over` (neg) if any failures that day, `vessel-gold` for today
- Today column: gold tick mark + `// TODAY` label above
- Footer: range labels `AUG {N}` ← → `SEP {N}`, total in period sub
- Hover any bar: native tooltip with date + count + breakdown of types
- Empty state: 30 dashed columns with `// quiet — no activity in 30d`

**Section: `// type distribution` — horizontal stacked bar (visual-first)**
- One segment per distinct actionType, width = `(typeCount / total) * 100%`
- 10 distinct terminal colors (`vessel-accent` cyan, `ok` green, `vessel-watch` orange, `vessel-over` red, `vessel-gold` gold, plus 5 grey/teal shades), reused for >10 types
- Segment order: by count desc
- Each segment: width + count label, clickable → `?type=<exactActionType>` (server-side filter)
- Caption: `// {N} types in {M} total events · click a segment to filter`

**Section: `// filter` — actionType pills + prefix filter**
- Row 1: "All" pill (no filter) + one pill per distinct actionType (capped at 12, rest collapse under `+ {N} more`)
- Each pill shows type name + count, vessel-accent border + cyan fill when active
- Row 2 (smaller, mono caps): `prefix:` filter — buttons for `vault.*` (default), `auto_*`, `plan_*`, `envelope_*`, `transaction_*`, `goal_*` (only show prefixes that exist in this user's data)
- Free-text `?q=` substring search: a small textbox in the row, server-side filter on actionType

**Section: `// events` — the table (detail view)**
- Newest first, `take` 50 by default (`?take=100|200` page size)
- Columns: `// when` (ISO timestamp, mono), `// type` (chip with type color), `// ai tier` (mono number), `// payload` (pretty-printed JSON in a `<details>` block, collapsed by default)
- Stable color for each type (matches the type distribution palette)
- "Show 50 more" button (links to `?take={n+50}`)
- Empty state: `// no events match this filter`

### 2. New event type: `vault.audit_log_viewed`

- Added to the `actionType` union in `src/lib/vault/db.ts:recordVaultAudit` (TS-only, Prisma's column is `String`)
- The `/vault/audit` page writes one row at the end of every render, with payload `{ filter: { type, prefix, q, take } | null, at: ISO }`
- The page reads BEFORE writing (so the table on this visit doesn't show the just-written event; the next visit will)
- Subsequent visits show the prior `vault.audit_log_viewed` rows in the table (the audit log is auditable itself)

### 3. Link from `/vault/preferences`

- Add an `[AUDIT] →` chip to the `/vault/preferences` `PageHead` actions slot (mirrors the `[PROVIDER] <name>` chip pattern on `/vault`)
- No 6th cell in `PolicySummaryCard` (the grid stays 5-col)
- Click → `/vault/audit`

### 4. Server-side filter URL contract

- `?type=<exactActionType>` — narrows to one type
- `?prefix=<vault|auto|plan|envelope|transaction|goal|...>` — narrows to a prefix (the second filter row)
- `?take=<n>` — page size (default 50, max 200)
- `?q=<substring>` — free-text type search
- Combinations are AND
- The 4-cell summary shows **unfiltered** total + this-week (so the user always sees the full picture); the activity strip / type distribution / table all respect the filter

### 5. Files

**New:**
- `src/lib/vault/audit-log.ts` — data access layer (`getAuditLog`, `getAuditLogStats`, `getDistinctActionTypes`, `recordAuditLogViewed`, plus a stable color map)
- `src/app/(app)/vault/audit/page.tsx` — the page (server component, force-dynamic, reads `searchParams`)
- `src/app/(app)/vault/audit/AuditTable.tsx` — the table (server component)
- `src/app/(app)/vault/audit/ActivityStrip.tsx` — the 30-day strip (server component, pure SVG)
- `src/app/(app)/vault/audit/TypeDistribution.tsx` — the stacked bar (server component, links)
- `src/app/(app)/vault/audit/AuditHeadlineStrip.tsx` — the 4-cell headline strip
- `src/app/(app)/vault/audit/TypeFilterPills.tsx` — the actionType pill row
- `tests/smoke-audit-log.mjs` — ~35 checks

**Modified:**
- `src/lib/vault/db.ts` — add `vault.audit_log_viewed` to the `actionType` union in `recordVaultAudit`
- `src/app/(app)/vault/preferences/page.tsx` — add `[AUDIT] →` chip to `PageHead` actions slot
- `package.json` — add `tests/smoke-audit-log.mjs` to the `smoke` script

### 6. New smoke: `tests/smoke-audit-log.mjs`

~35 checks across:
- Page renders 200, the headline strip is present, the activity strip has 30 columns, the type distribution has segments
- Seeded `vault.synced` event appears in the table on first visit
- Filter contract: `?type=vault.synced` narrows the table to 1 row; `?prefix=vault` shows only vault.* types
- A new `vault.audit_log_viewed` row appears after a visit (verified by re-fetching `/vault/audit?type=vault.audit_log_viewed`)
- The `vault.audit_log_viewed` actionType is wired into the `recordVaultAudit` union (TS source check: `dbSrc.includes('"vault.audit_log_viewed"'`)
- The /vault/preferences page now has the `[AUDIT] →` chip (data-testid or text)
- `pnpm tsc` is clean
- `pnpm build` is clean (no broken dynamic routes)
- `next.config.ts` has no new secrets in the response (the API endpoint, if any, is public; smoke-deploy guard)

## Out of scope (deferred)

- **Real-time updates** — no SSE/WebSocket
- **Audit log retention / archival** — table grows forever; future cluster can add `vault.audit_log_pruned` + a cron
- **Per-action filtering** — only the existing actionType filter for v1; future: date range, payload-key search
- **Audit log export** (CSV / JSON download) — future cluster
- **Cross-user audit log** (admin / household) — future cluster
- The /vault/schedule "Last 20 runs" table **stays in place** (it's a quick-glance pattern, not a duplicate); add a `// full history → /vault/audit` link from it

## Acceptance

- `pnpm tsc` clean
- `pnpm smoke:all` all 30 smokes green (~1,510 checks, was ~1,470)
- The new `/vault/audit` page renders, filters work, the headline strip + activity strip + type distribution are visually present
- A `vault.audit_log_viewed` row appears after a visit (visible on the next render)
- An `[AUDIT] →` chip on `/vault/preferences` navigates to the new page

## Pre-existing inconsistency (not in scope, follow-on)

- `.env.production.example` uses `VAULT_SIGNER_KEY` but `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY`. Trivial fix, separate cluster.
