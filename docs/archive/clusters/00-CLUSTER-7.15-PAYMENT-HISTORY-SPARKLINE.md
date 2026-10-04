# Cluster 7.15 — Per-bill payment history sparkline (visible-UI, visual-first)

**Status**: 🚧 IN PROGRESS (session `mvs_5c23655691c34fe6abface1b8c67fdabc`, started 2026-08-31 14:10 CDT)
**Predecessor**: `eb0843b` (Cluster 7.14 — per-bill off-ramp provider override UI)
**Goal**: Add a compact "rhythm at a glance" visual to the per-bill history page — a horizontal sparkline that maps every audit event the bill has ever seen to a colored dot, positioned by time, colored by tone. The user sees the bill's payment history (attempts, outcomes, state transitions) at a glance, without scrolling the 50-row table.

---

## Why this cluster

The per-bill history page (`/vault/bills/[id]/history`) is the canonical "what happened to this bill" surface. Today it has:
- **PageHead** (title + em + explanation)
- **BillHeader** (bill name + amount + state badge)
- **Off-ramp picker** (7.14 — the per-bill override UI)
- **BillSummaryStrip** (4 cells: total events, current state, most active type, last activity)
- **BillTimeline** (state-machine stepper — the 13 discrete states, with transition counts)
- **LiveBillEventTable** (chronological list of every event)

The user can already see the bill's state progression (BillTimeline) and the full chronological list (LiveBillEventTable). What's missing is a **compact time-series visual** that shows the bill's *rhythm* — when did events happen, what tone were they, how frequent. The user's standing directive (2026-08-23): "build the chart first; add a list only if exact values can't live in the chart." A sparkline of the bill's audit-log events over time is exactly that — the chart-first view of the bill's history.

The visible-UI preference wins over the pure-infra candidates (env var rename, Prisma migration history). The pure-UI-on-existing-infra pattern is the same as 7.11 (ticker), 7.11.1 (tones), 7.14 (per-bill picker). Same "small surface, high payoff, no schema change."

---

## Scope

### Files to add

- `src/app/(app)/vault/bills/[id]/history/_components/PaymentHistorySparkline.tsx` — client component (interactive hover + click-anchor; the rest is presentational and could be SSR'd but a single client component is simpler)

### Files to modify

- `src/app/(app)/vault/bills/[id]/history/page.tsx` — compute the sparkline data server-side (mapping each `tableRows` entry to a `{at, actionType, tone, id}` shape), pass to the new component, mount between the BillSummaryStrip and BillTimeline sections
- `tests/smoke-bill-history.mjs` — add a section that asserts the sparkline testid + dot count + tone distribution on the per-bill history page (extension of the existing 7.5 smoke, not a new file)
- `tests/integration-vault.mjs` — add Phase 4.0 M13 (~15 source + wire checks for the wiring)

### Files NOT touched

- `prisma/schema.prisma` — no schema change; the audit log already exists
- The LiveBillEventTable — keeps its chronological list role; the sparkline is the *chart-first* complement
- The BillTimeline — state-machine stepper (discrete states); the sparkline is continuous-time
- The BillSummaryStrip — headline numbers (4 cells); the sparkline is the time-series complement
- No new env vars, no new headers, no middleware changes

---

## Spec details

### Layout

The sparkline sits between **BillSummaryStrip** ("headline numbers") and **BillTimeline** ("state progression") on `/vault/bills/[id]/history`. Natural escalation: numbers → rhythm → state machine → full detail. New `SectionHeader` with `eyebrow="// rhythm"`, `title="Payment history at a glance"`, `em="every event, one dot. colored by what happened."`.

```
┌──────────────────────────────────────────────────────────────┐
│  // RHYTHM                                                     │
│  Payment history at a glance                                  │
│  every event, one dot. colored by what happened.             │
│  ────                                                         │
│  [●] [●] [●]    [●]      [●]                [●]   [●]         │
│  Sep      Oct      Nov      Dec      Jan      Feb      Mar     │
│  ↑ good  ↑ good  ↑ bad    ↑ good   ↑ good   ↑ watch ↑ good     │
│  (hover for details · click to jump to the table row)         │
│                                                              │
│  [5 good] [2 watch] [1 bad] [12 neutral]                     │
└──────────────────────────────────────────────────────────────┘
```

### Sparkline dot mapping

Every audit event in the bill's `tableRows` becomes one dot. Each dot is positioned by `createdAtIso` (linear time scale, x = time), colored by `tone` (using the 7.11.1 `TONE_FOR` map + `TONE_COLOR`):

| Tone | CSS var | Action types (representative) |
|---|---|---|
| `good` | `var(--ok)` (green) | `vault.payment_settled`, `vault.payment_executed`, `vault.payment_manually_confirmed`, `vault.funded`, `vault.safe_deployed` |
| `watch` | `var(--vessel-watch)` (orange) | `vault.payment_attempted`, `vault.bill_state_changed`, `vault.apy_refresh_failed`, `vault.adapter_fallback` |
| `bad` | `var(--vessel-over)` (red) | `vault.payment_failed`, `vault.cron_prune_failure`, `vault.paused`, `vault.safe_deploy_failed` |
| `neutral` | `var(--ink-3)` (dim) | `vault.synced`, `vault.balance_refreshed`, `vault.bill_added`, `vault.scheduler_run`, `vault.bill_history_viewed` |

The full list comes from `TONE_FOR` (already exported from 7.11.1, 30 entries, all action types covered).

### Position math

- `x = (atMs - firstEventMs) / (lastEventMs - firstEventMs) * 100` (linear % from first event). Edge case: if there's only 1 event, the dot is at x=50. If 0 events, the section renders the empty state ("// no events yet").
- For events that share the same timestamp (e.g. multiple `vault.bill_state_changed` rows from a single transition), the dots are stacked horizontally with a 1px gap so they don't fully overlap (or use the `multiDot` strategy: stack at 0/8/16px offsets — see Risks).

### Tone distribution summary

Below the dot strip, a small legend shows the count per tone:
- `[5 good]  [2 watch]  [1 bad]  [12 neutral]`
- Each label is the tone color dot + count, in JetBrains Mono 9.5px uppercase.
- The legend is a one-glance summary of the bill's history flavor: "all green = reliable", "many orange = flaky", "any red = check this".

### Hover + click (interactive)

The component is a client component (the rest of the page is server-rendered). Two interactions:

- **Hover**: a small tooltip floats above the dot, showing the actionType + a compact 1-line humanized summary + relative time (e.g. "vault.payment_settled · Rent · payment settled · $1,820.00 · 3d ago"). Reuse the existing `humanizeVaultAction` from 7.11.1 (server-actionable) for the summary.
- **Click**: smooth-scrolls to the matching row in the `LiveBillEventTable` below (the row's `id` matches the dot's `id`). The table row gets a 1.5s "flash" highlight (cyan border + soft vessel-accent-soft background) so the user sees where they landed.

The tooltip + click are optional (degrades gracefully on touch / no-JS): the dots are still rendered as a static colored strip, and the humanized summary is in the tooltip's title attribute for accessibility.

### Empty state

A bill with zero events renders the section header + a single line: `// no events yet — the sparkline appears here as events arrive`. The LiveBillEventTable below already has its own empty footer; the sparkline's empty state is parallel and consistent.

### Title + meta

Section header eyebrow: `// rhythm`
Title: `Payment history at a glance`
Em: `every event, one dot. colored by what happened.`
Underline text (small): `hover for details · click to jump to the row`

---

## Smoke extension (`tests/smoke-bill-history.mjs`)

The existing 7.5 bill-history smoke is the natural host. Add a new section after the current event-table checks:

- GET `/vault/bills/<id>/history` → assert the sparkline testid is present
- Count the dot elements: should equal `summary.totalEvents` (every audit event becomes a dot; meta events like `vault.bill_history_viewed` are filtered by the page or counted as neutral)
- Assert at least one dot per tone that exists in the bill's events (e.g. if any `vault.payment_settled` rows exist, there should be a green dot)
- Assert the x-positions are unique (no two dots at exactly the same pixel, modulo the 1px-stack strategy for same-timestamp events)
- Assert the legend count matches the dot count for each tone
- Source-file checks: `PaymentHistorySparkline.tsx` exists, uses `TONE_FOR` from 7.11.1, has the dot + legend testids

### Integration-vault M13 (~15 checks)

- `src/app/(app)/vault/bills/[id]/history/page.tsx` imports `PaymentHistorySparkline` and mounts it between `BillSummaryStrip` and `BillTimeline`
- The page computes the sparkline data (mapping `tableRows` → `{at, actionType, tone, id}`)
- `PaymentHistorySparkline.tsx` uses `TONE_FOR` + `TONE_COLOR` from 7.11.1 (no color literal duplication)
- The sparkline handles the 0-event, 1-event, and N-event cases (source checks for the math)
- The component has `aria-label="Payment history at a glance"` + dot-level `aria-label` per dot
- The component renders the tone-distribution legend with per-tone counts
- The component uses the existing `humanizeVaultAction` for tooltip text (or a thin server-side equivalent)
- `package.json` smoke script includes the updated `smoke-bill-history.mjs`

---

## Visible-UI payoff

- The user sees the bill's payment history at a glance — the **chart-first** view per the 2026-08-23 directive
- "Many red dots in a row" → obvious bill flakiness
- "Long gap between dots" → bill was quiet (paid ahead, or scheduled infrequently)
- "Cluster of green dots" → bill is settling reliably
- The legend gives a one-glance flavor summary without scrolling the 50-row table
- Click-to-jump integrates the sparkline with the table — the chart isn't a separate surface, it's a navigation aid

## Infra-vs-UI mix

- ~5% new wiring (1 client component, 1 server-side data mapper, 2 file imports)
- ~85% pure presentation (the dot strip, the legend, the hover tooltip, the click-anchor)
- ~10% smoke + wire checks

---

## Risks + mitigations

1. **Same-timestamp collisions** — multiple events written in the same DB write (e.g. a `vault.bill_state_changed` + `vault.scheduler_run` row from one transition). Mitigation: stack the dots at 0/8/16px horizontal offsets within the same x-position so the user sees N events at that timestamp as a small cluster. The dot count is preserved.
2. **Hundreds of events on a long-lived bill** — the strip is one dot per event, so a 500-event bill would have 500 dots in a 600px strip. Mitigation: if `events.length > 80`, bin by day (one dot per day, color = the worst tone in that day). The "long strip" view is the default for short bills; the "binned" view is the fallback for long. Source-file check verifies the threshold + binning strategy.
3. **Hover tooltip on touch devices** — the tooltip is a CSS-only hover; on touch it's hidden. The dot's `aria-label` carries the humanized summary for screen readers / touch.
4. **The 7.11.1 `humanizeVaultAction` is in `audit-log-shared.ts` and is client-safe** — no `server-only` import. The component can import it directly.

---

## Acceptance

- [ ] Cluster spec written (this file)
- [ ] Prompt written for Polar review (`00-POLAR-PROMPT-NEXT-CLUSTER.md`)
- [ ] Polar's v2-amended spec received + integrated (3 wins + reject 2 with reasoning)
- [ ] `PaymentHistorySparkline.tsx` ships with dot strip + tone legend + hover tooltip + click-anchor
- [ ] The page renders the sparkline between BillSummaryStrip and BillTimeline
- [ ] The component uses `TONE_FOR` + `TONE_COLOR` (no color literal duplication)
- [ ] The empty state + 1-event + N-event cases render correctly
- [ ] Same-timestamp collisions handled with horizontal stack
- [ ] Long-bill binning (events > 80 → bin by day)
- [ ] `tsc --noEmit` clean
- [ ] `tests/smoke-bill-history.mjs` extension green (~10 new checks)
- [ ] `tests/integration-vault.mjs` Phase 4.0 M13 green (~15 checks)
- [ ] Full smoke baseline (~1,800 checks) green
- [ ] Single commit on top of `eb0843b` with the cluster shape
- [ ] HANDOVER + COORDINATION "Last update" updated
- [ ] Memory three-question test (any new lesson worth saving?)
