# Polar prompt — Cluster 7.15 (per-bill payment history sparkline)

Hey Polar — picking the next cluster. Spec is at `00-CLUSTER-7.15-PAYMENT-HISTORY-SPARKLINE.md` (in the workspace, not on Drive). TL;DR below; full detail in the spec.

## What I picked

**Per-bill payment history sparkline.** A horizontal time-series visual on `/vault/bills/[id]/history` — one dot per audit event the bill has ever seen, positioned by `createdAtIso` on a linear time scale, colored by tone (using the 7.11.1 `TONE_FOR` map). Below the strip, a tone-distribution legend (`[5 good] [2 watch] [1 bad] [12 neutral]`). Hover a dot for the humanized summary, click a dot to smooth-scroll to the matching row in the existing `LiveBillEventTable` (with a 1.5s cyan flash so the user sees where they landed).

## Why this one

- **Visual-first, per the standing directive** — "build the chart first; add a list only if exact values can't live in the chart" (2026-08-23). The per-bill history page already has a 50-row `LiveBillEventTable`; what's missing is the *chart-first* view of the same data. The user can already see the list. They can't see the rhythm.
- **Visible-UI > invisible architecture** — beats the pure-infra candidates (env var rename, Prisma migration history). Pure-UI-on-existing-infra, same shape as 7.11 / 7.11.1 / 7.14.
- **Reuses 7.11.1 tone infra** — `TONE_FOR` + `TONE_COLOR` are already exported from `src/lib/vault/audit-log-shared.ts` and cover all 30 action types. The sparkline just consumes them; no new tone work.
- **Pairs with 7.14** — the per-bill history page already hosts the picker, the timeline, the table. The sparkline slots between the `BillSummaryStrip` (headline numbers) and the `BillTimeline` (state progression) as the *rhythm* layer in the natural escalation: numbers → rhythm → state machine → full detail.
- **Real product surface** — "many red dots in a row" = bill flakiness. "Long gap between dots" = paid ahead or scheduled infrequently. "Cluster of green dots" = settling reliably. The legend is a one-glance flavor summary without scrolling the table.

## The contract (full spec in `00-CLUSTER-7.15-PAYMENT-HISTORY-SPARKLINE.md`)

- **1 new client component**: `src/app/(app)/vault/bills/[id]/history/_components/PaymentHistorySparkline.tsx`. Mounts between `BillSummaryStrip` and `BillTimeline` on `/vault/bills/[id]/history`.
- **Server-side data mapper** in `page.tsx`: maps each `tableRows` entry to `{at, actionType, tone, id}` (where `tone` is derived from `TONE_FOR[actionType]`). Passes the array + summary to the component. No new API endpoint needed.
- **Component shape**:
  - Section header: `// RHYTHM` / `Payment history at a glance` / `every event, one dot. colored by what happened.` + `hover for details · click to jump to the row` underline.
  - Dot strip: each event = one dot, positioned by `(atMs - firstEventMs) / (lastEventMs - firstEventMs) * 100`, colored by tone via `TONE_COLOR` (CSS var). Single event → x=50. Zero events → empty state line.
  - Same-timestamp collisions: stack at 0/8/16px horizontal offsets so the user sees N events at that timestamp as a small cluster.
  - Long-bill binning: if `events.length > 80`, bin by day (one dot per day, color = worst tone in that day). Source-file check verifies the threshold + binning strategy.
  - Tone distribution legend below the strip: `[N good] [N watch] [N bad] [N neutral]`, each label is a tone-color dot + count, JetBrains Mono 9.5px uppercase.
  - Hover tooltip: humanized summary from `humanizeVaultAction(actionType, payload)` (already client-safe, no `server-only` import) + relative time. CSS-only hover.
  - Click anchor: smooth-scrolls to the matching `<tr id={eventId}>` in the `LiveBillEventTable` and adds a 1.5s `.flash` class (cyan border + soft `vessel-accent-soft` background) for visual feedback.
  - Empty state: a single line `// no events yet — the sparkline appears here as events arrive`.
  - Accessibility: `aria-label="Payment history at a glance"` on the section; per-dot `aria-label="<humanized summary> · <relative time>"`.
- **No schema change, no new env vars, no middleware change**. The audit log already exists (C6.0); `TONE_FOR` + `TONE_COLOR` already exist (7.11.1); `humanizeVaultAction` already exists (7.11.1).
- **Reuse-only color**: every dot uses `TONE_COLOR[tone]` (CSS var map). No new color literal. Stays inside the Component Oracle Terminal design system.

## Smoke plan

- **`tests/smoke-bill-history.mjs`** — extend the existing 7.5 smoke with a new section after the current event-table checks (~10 checks): assert the sparkline testid is present, dot count equals `summary.totalEvents`, x-positions are unique modulo the 1px-stack strategy, legend counts match dot counts per tone, at least one dot per tone that exists in the bill's events, source-file checks for `PaymentHistorySparkline.tsx` + `TONE_FOR` import + the testids.
- **`tests/integration-vault.mjs` Phase 4.0 M13** — ~15 source + wire checks: `page.tsx` imports + mounts `PaymentHistorySparkline` between `BillSummaryStrip` and `BillTimeline`; the page computes the sparkline data (mapping `tableRows` → `{at, actionType, tone, id}`); the component uses `TONE_FOR` + `TONE_COLOR` (no color literal duplication); the 0-event / 1-event / N-event cases have source-level handling; the component has `aria-label` + per-dot `aria-label`; the legend renders per-tone counts; the component uses `humanizeVaultAction` for tooltip text; `package.json` smoke script includes the updated `smoke-bill-history.mjs`.

## What I'm asking you to do

1. **Read the spec** (`00-CLUSTER-7.15-PAYMENT-HISTORY-SPARKLINE.md`) end to end.
2. **Read the source first** — before correcting the spec, open the files it references and verify the claims:
   - `src/app/(app)/vault/bills/[id]/history/page.tsx` — the page shape, where `BillSummaryStrip` and `BillTimeline` mount, the existing `tableRows` shape
   - `src/lib/vault/audit-log-shared.ts` — the `TONE_FOR` + `TONE_COLOR` map (7.11.1), confirm 30 action types are covered and the export shape
   - `src/lib/vault/audit-log-shared.ts` — `humanizeVaultAction` is client-safe (no `server-only` import), confirm
   - `src/components/vault/LiveBillEventTable.tsx` (or whatever the table is called) — does each row have a stable `id` we can anchor to?
   - `src/components/section-headers/SectionHeader.tsx` (or the existing section header pattern on the page) — the `// rhythm` eyebrow pattern
   - `src/components/vault/BillSummaryStrip.tsx` — the surrounding component to ensure the sparkline slots in cleanly
3. **Spec corrections** — anything in the spec that contradicts the source (corrections as a list, not a rewrite). Specifically check: is the page server-rendered or does it need `"use client"` to be lifted? Does the table have anchorable row IDs already or do I need to add them? Does `humanizeVaultAction` accept the per-bill payload shape I'm assuming?
4. **Design wins** — anything that makes the visible-UI payoff bigger, the data layer cleaner, or the failure modes more graceful. Reasonable scope; not a full redesign. Specifically: is there a better visual encoding than the dot strip (vertical bars? sparkline line? calendar heatmap?)? Is "long-bill binning at 80 events" the right threshold or should it scale with viewport width? Should the tone legend be sortable/filterable (e.g. click a tone to dim the other dots)?
5. **Numbering** — 7.15 (continuing the chain: 7.11 ticker → 7.11.1 tones → 7.14 per-bill override → 7.15 sparkline). Push back if you'd rather call it something else (e.g. fold into 7.14.1 if you think it should be a polish commit rather than its own cluster).

The 7.11 → 7.11.1 / 7.14 pattern was: spec → your review → I integrate 3 wins + reject 2 with reasoning → single commit + optional `.X.1` polish commit. Same shape here.

No need to draft the implementation — I integrate against my conventions. The 3 wins from 7.11/7.14 v2 reviews (semantic tones, hide unmapped, reconcile-on-reconnect / 4 chips with "use my default", resolved chain display, chip on `/obligations` only when overridden / `setBillProviderPreferenceActionClient` wrapper, `useTransition` + `pending`, `findFirst({ vault: { userId } })` ownership check) all shipped cleanly. The round-trip lesson from 7.14 (verify Map key match, not just variable read) is now an Agent Memory entry — same discipline applied here: the smoke must assert "override X puts adapter X first" / "sparkline x-position matches the event's createdAtIso," not just "the function reads the field."

Standing context: Mavis is the long-term co-architect across all of xKryptic's projects. Compass is the personal-finance app for xKryptic's mom. Specs at workspace root (00-CLUSTER-7.X-*.md), HANDOVER.md + COORDINATION.md are the handoff contract between sessions, design system is Component Oracle Terminal (cool teal/cyan on near-black, Sora headings + JetBrains Mono data, oracle voice with `[OK]/[WARN]/[SIGIL]/[INDEXED]` markers). The 2026-08-23 visual-first directive ("build the chart first; add a list only if exact values can't live in the chart") is the reason this cluster exists.

Talk soon.
