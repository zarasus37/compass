# Cluster 7.0 — Vault preferences hub (visible UI)

**Date**: 2026-08-29 04:00 CDT
**Status**: 🟡 In progress
**Goal**: Give the user a clean, single-page summary of their vault policy + a re-acknowledge risk flow + visual consistency across the vault area. Visible-UI pass.

---

## Why this cluster exists

The HANDOVER "What was NOT done" list calls out: *"Vault prefs UX — yield-routing picker + risk-ack are DB-backed; UI for editing the strategy description / rebalance cadence is still light."*

Two things are true at HEAD:

1. **The pieces are all there but spread across three pages.** The main `/vault` page has the yield-routing picker (well-styled, vessel-accent). The risk-disclosure state is on the same page. The vault pause toggle is on the same page. The scheduler is on `/vault/schedule` (its own page). The user can edit any of these in isolation, but there is no single place that summarizes "what is your vault policy right now" — and the pages use a mix of vessel tokens (YieldRoutingPicker) and the older Component Oracle Terminal tokens (RiskDisclosure unacknowledged state, SchedulerIndicator, the schedule page's chrome).

2. **There is no re-acknowledge path.** Once the user clicks `[OK] I understand` on the risk disclosure, the disclosure is suppressed forever. If the user changes their yield-routing strategy or adds a large bill later, the spec calls for re-acknowledgment; today, the only way to do it is to delete the row in the DB. A visible-UI path should exist.

This cluster closes both gaps. No engine changes, no new DB models, no new dependencies. The "rebalance cadence" half of the HANDOVER note is deferred — the spec doesn't define it and the engine doesn't model it, so adding a stub would be premature. The rest is reachable with current data.

---

## Scope (this cluster)

### 1. New `/vault/preferences` page (server component, force-dynamic)

A clean "preferences hub" that reads `VaultPreferences` + `VaultSchedule` + `VaultAccount.status` and renders a single-page summary. Sections, top to bottom:

1. **Page chrome** — `// ledger · vault · preferences` eyebrow, "Vault preferences" title, "your policy, in one place." em, accent cyan. Same PageHead idiom as `/vault` and `/vault/schedule`.

2. **Policy summary card** — 4-cell grid (vessel-surface bg, vessel-border). Each cell shows one knob + its current value:
   - `// yield routing` + the active strategy's `YIELD_ROUTING_LABEL`
   - `// risk disclosure` + `[OK] acknowledged <date>` or `[WARN] not yet acknowledged`
   - `// auto bill-pay` + the schedule's enabled state + next run relative time, OR `[—] not configured` with a "Set up" link
   - `// vault status` + `LIVE` (green) / `PAUSED` (orange) / `ARCHIVED` (ink-3)

3. **Yield routing section** — re-uses `<YieldRoutingPicker current={strategy} />`. Below the picker, a one-line note: "Switching strategy re-routes future yield only. Already-deployed principal is unaffected."

4. **Risk disclosure section** — if `riskAcknowledgedAt` is set: the `[OK] Risk` chip + the acknowledged copy + a `Re-acknowledge` button. If null: the same warning disclosure + `RiskAckButton` from the main page. The `Re-acknowledge` button calls a new `revokeRiskAcknowledgementAction` that sets `riskAcknowledgedAt = null` (preserving the row but clearing the timestamp) and writes a `vault.risk_unacknowledged` audit entry.

5. **Schedule section** — compact card. If a `VaultSchedule` row exists: "Next auto-run: <relative> (<absolute>)" + "Last run: <relative>" + `[SCHEDULE →]` link. If not: `[—] no schedule set` + `[CONFIGURE →]` link to `/vault/schedule`. Re-uses a `SchedulerIndicator`-like presentation but is its own component (`ScheduleSummaryCard`).

6. **Footer** — "Last updated <date>" if `updatedAt` is set, otherwise "no changes yet."

### 2. Re-acknowledge risk flow (server action + UI)

`src/lib/vault/actions.ts` (existing file) gets a new action: `revokeRiskAcknowledgementAction(): Promise<{ ok: true } | { ok: false; error: string }>`. It:
- Reads the current user
- Updates `VaultPreferences.riskAcknowledgedAt = null`
- Writes a `vault.risk_unacknowledged` audit entry with `actionType: "vault.risk_unacknowledged"`, payload `{}`
- Returns `{ ok: true }`
- On any error, returns `{ ok: false, error }` (same shape as the existing actions)

A new client component `<RevokeRiskAckButton />` mirrors `<RiskAckButton />` (vessel-accent border, void-text on hover, optimistic UI). It calls the new action and `router.refresh()` on success.

### 3. Vault area re-skin to vessel tokens

Per the Cluster 3.1 token map (also applied in Cluster 4.4), the following files still reference old Component Oracle Terminal tokens. Re-skin them token-for-token, additive pattern (the v5 tokens stay in `globals.css` for any un-migrated shell, but the vault area is now consistent):

- `src/app/(app)/vault/page.tsx` — the `RiskDisclosure` unacknowledged aside (currently `var(--surface)`, `var(--line)`, `var(--warn)`). Replace with vessel tokens; the acknowledged banner is already on vessel tokens and stays.
- `src/app/(app)/vault/schedule/page.tsx` — the page chrome (3-cell status grid uses `var(--line)`, `var(--surface)`, `var(--terminal-cyan)`, `var(--warn)`, `var(--line-soft)`). Replace with vessel tokens.
- `src/components/vault/SchedulerIndicator.tsx` — currently `var(--surface)`, `var(--line)`, `var(--terminal-cyan)`, `var(--warn)`. Replace with vessel tokens. The `var(--over)` reference becomes `var(--vessel-over)`.

### 4. Main vault page → "Preferences" link

Below the risk-disclosure section on the main `/vault` page, add a small "See all your vault preferences in one place →" link to `/vault/preferences`. vessel-accent link, mono caps, terminal-voice. Subtle, not a banner — just a discoverability affordance.

### 5. Sidebar

The sidebar already lists `// Ledger → Vault` and `// Ledger → Auto bill-pay` (the latter pointing to `/vault/schedule`). Add a third entry: `// Ledger → Preferences` pointing to `/vault/preferences`. `aria-current="page"` follows the existing pattern.

### 6. Smoke (`tests/smoke-vault-prefs.mjs`)

New smoke, ~30 checks. Verifies:
- `/vault/preferences` returns 200 and is non-empty
- All 4 policy-summary cells render with the right keys (`yield routing`, `risk disclosure`, `auto bill-pay`, `vault status`)
- Risk-disclosure state matches the DB
- Yield-routing picker is on the page and shows the current strategy
- ScheduleSummaryCard shows the right state (configured vs not configured) + the right link
- Sidebar has the new `Preferences` entry under `// Ledger` and it's not active on the main `/vault` page
- Sidebar entry IS active on `/vault/preferences`
- Main `/vault` page has the "See all your vault preferences" link to `/vault/preferences`
- Re-acknowledge API: `POST /api/vault/preferences/revoke-risk-ack` (or server action) sets `riskAcknowledgedAt = null` + writes the audit row
- Re-skin checks: no `var(--terminal-cyan)` / `var(--line)` / `var(--warn)` / `var(--surface)` references in the rendered HTML of the vault area pages
- Updated smoke `tests/smoke-vault-scheduler.mjs` (existing 55 checks) — change the warn/cyan token regexes to the new vessel equivalents (mirror of the Cluster 4.4 `smoke-visual-finish.mjs` pattern)
- `tests/smoke-vault.mjs` (existing 77 checks) — add 4 checks: main vault page has the "Preferences" link, sidebar entry is reachable, no remaining old-token references

### 7. Files

**New:**
- `src/app/(app)/vault/preferences/page.tsx` — the prefs hub server component
- `src/components/vault/PolicySummaryCard.tsx` — the 4-cell policy grid
- `src/components/vault/ScheduleSummaryCard.tsx` — the compact schedule card
- `src/components/vault/RevokeRiskAckButton.tsx` — the re-acknowledge button
- `tests/smoke-vault-prefs.mjs` — the new smoke
- `00-CLUSTER-7.0-VAULT-PREFS-UX.md` — this spec

**Edit:**
- `src/lib/vault/actions.ts` — add `revokeRiskAcknowledgementAction`
- `src/app/(app)/vault/page.tsx` — re-skin RiskDisclosure unacknowledged; add the "See all your vault preferences" link
- `src/app/(app)/vault/schedule/page.tsx` — re-skin the page chrome
- `src/components/vault/SchedulerIndicator.tsx` — re-skin to vessel tokens
- `src/components/sidebar/AppSidebar.tsx` — add the `Preferences` entry
- `tests/smoke-vault-scheduler.mjs` — update token regexes
- `tests/smoke-vault.mjs` — add 4 new checks
- `package.json` — add the new smoke to the `smoke` script

### 8. Dependencies

**None.** Pure UI + a server action.

---

## Out of scope (deferred)

- **Rebalance cadence** — the spec doesn't define it and the engine doesn't model it. A future cluster can introduce it as either (a) a cron expression the user sets, or (b) a fixed interval (weekly / monthly) that triggers a "review and rebalance" CTA. For now, the scheduler covers "when to run" and the strategy picker covers "where yield goes." A rebalance cadence is orthogonal.
- **Per-bill re-acknowledgment** — the spec says "re-acknowledgment is required when the user adds a new bill or changes yield-routing strategy in a future slice." This cluster ships the manual re-acknowledge path; the auto-trigger flow is a future cluster.
- **Strategy-description editing** — `YIELD_ROUTING_DESC` is hardcoded in `src/lib/vault/types.ts`. The user can't override it. The current scope doesn't need this; a future "Advanced" section on the prefs page can add it.
- **Vault pause from prefs** — the main `/vault` page already has the pause toggle. The prefs page shows the status; moving the toggle would be a second visible-UI pass. Defer.

---

## Acceptance criteria

1. `pnpm tsc` clean.
2. `pnpm smoke:all` green (all 27 suites — one new `smoke-vault-prefs`, plus 4 new checks in `smoke-vault`, plus regex updates in `smoke-vault-scheduler`).
3. `/vault/preferences` returns 200 and renders the 4 policy cells + yield-routing picker + risk-disclosure section + schedule summary.
4. `RevokeRiskAcknowledgementAction` sets `riskAcknowledgedAt = null` + writes the audit row, and the new button reflects it on `router.refresh()`.
5. No `var(--terminal-cyan)`, `var(--warn)`, `var(--surface)`, `var(--line)`, `var(--line-soft)` references in the rendered HTML of `/vault`, `/vault/schedule`, `/vault/preferences`. (The vessel equivalents are allowed; the old tokens are forbidden.)
6. The sidebar's `// Ledger` section has 3 entries (Vault, Auto bill-pay, Preferences); Preferences is active on `/vault/preferences`.
7. The main `/vault` page has a "See all your vault preferences" link to `/vault/preferences`.
8. COORDINATION.md + HANDOVER.md updated to point at the new commit.

---

## Risk + rollback

- **Risk: re-skin changes break an existing smoke** — the re-skin changes are token swaps only; the smoke regexes that depend on the old tokens get updated in the same commit. The vault page is large (1426 lines); a token swap can ripple. Mitigation: a single `pnpm smoke:all` after the re-skin catches regressions.
- **Risk: revoke-risk-ack causes the disclosure to re-render on every visit** — yes, that is the design. The user can re-acknowledge at any time. The audit log records both events. The "sticky" behavior is "until next change" not "permanent."
- **Rollback**: revert the commit. The prefs page is additive; the re-skin is a token swap. No destructive changes.

---

## Commit shape

- `b1c2d3e Cluster 7.0 — Vault preferences hub (visible UI)`
- `a2b3c4d docs: HANDOVER + COORDINATION reflect Cluster 7.0`
