# Polar prompt — Cluster 7.12 (per-bill off-ramp provider override UI)

Hey Polar — picking the next cluster. Spec is at `00-CLUSTER-7.12-PER-BILL-OFF-RAMP-OVERRIDE.md` (in the workspace, not on Drive). TL;DR below; full detail in the spec.

## What I picked

**Per-bill off-ramp provider override UI.** The C7.3 spec explicitly deferred this as "future cluster" and the data shape is fully wired. The user can route different bills through different providers (e.g. rent → Spritz, subscriptions → MOCK) — a real product surface, not a theoretical one.

## Why this one

- **Visible UI on existing infra** — same pattern as 7.11 (ticker). Data layer (`ScheduledBill.providerPreference` + `gateway.resolveChain(bill)` + `addBill`/`updateBill` actions + `validateBillOptions`) is already there. Only the UI is missing.
- **Real product surface** — kill switch per bill, A/B testing per provider, "leave the high-stakes ones on Spritz and pin the noise to MOCK" is a real workflow.
- **Pairs with 7.11 ticker** — when a `vault.off_ramp_provider_changed` event with `scope: "bill"` lands, the ticker shows it; the bill's history page also shows the override timeline. The visible-UI payoff is in the history timeline (per-bill overrides over time) + the per-bill chip on /obligations.

## The contract (full spec in `00-CLUSTER-7.12-PER-BILL-OFF-RAMP-OVERRIDE.md`)

- **1 new server action**: `setBillProviderPreferenceAction({ billId, provider })`. Validates bill ownership + provider against `OffRampProvider` union (MOCK | SPRITZ | MONTO). Writes `vault.off_ramp_provider_changed` audit row with payload `{ scope: "bill", billId, from, to }`. Revalidates the bill page + /vault + /obligations.
- **1 new client component**: `BillOffRampPicker` — 3 provider chips (MOCK | SPRITZ | MONTO) + 1 "Use default · <userDefault>" chip (= the `null` value). Mirrors the C7.3 `OffRampProviderPicker` on /vault/preferences. Mounts on `/vault/bills/[id]`.
- **3 visible surfaces**:
  - `/vault/bills/[id]` — full picker under the bill header
  - `/obligations` — `[PROVIDER · spritz]` chip inline next to the bill name when an override is set (no chrome leak when no override)
  - `/vault` OffRampPanel — chain summary shows per-bill override vs. user default tooltip per row
  - `/vault/bills/[id]/history` — `vault.off_ramp_provider_changed` events with `scope: "bill"` in the timeline
- **No schema change, no new env vars, no middleware change**. `ScheduledBill.providerPreference` already exists (added C6.0/C7.3).
- **No-op short-circuit**: action returns `{ ok, noop: true }` if `from === to`; no audit row written for redundant changes.

## Smoke plan

`tests/smoke-bill-provider-override.mjs` (~30 checks): page surface + server action + /vault OffRampPanel + /vault/bills/[id]/history chain summary + the no-op short-circuit + the cross-user bill ownership check. `tests/integration-vault.mjs` Phase 4.0 M12 (~20 source + wire checks).

## What I'm asking you to do

1. **Read the spec** (`00-CLUSTER-7.12-PER-BILL-OFF-RAMP-OVERRIDE.md`) end to end.
2. **Read the source first** — before correcting the spec, open the files it references and verify the claims:
   - `src/lib/vault/server.ts` (the action surface — does the existing `setOffRampProviderAction` pattern match what I proposed?)
   - `src/lib/vault/gateway.ts` (does `resolveChain(bill)` actually read `bill.providerPreference`? — yes, confirmed)
   - `src/app/(app)/vault/preferences/page.tsx` (the existing `OffRampProviderPicker` — the visual pattern to mirror)
   - `src/app/(app)/obligations/page.tsx` (where the per-bill chip will live)
   - `src/app/(app)/vault/bills/[id]/page.tsx` (where the picker will mount)
   - `prisma/schema.prisma` (lines around 1000 — `providerPreference` column shape)
3. **Spec corrections** — anything in the spec that contradicts the source (I want the corrections as a list, not a rewrite).
4. **Design wins** — anything that makes the visible-UI payoff bigger, the data layer cleaner, or the failure modes more graceful. Reasonable scope; not a full redesign.
5. **Numbering** — happy to call this 7.12 (since 7.11.1 was the polish, the next cluster is 7.12). Push back if you'd rather call it something else.

The 7.11 → 7.11.1 pattern was: spec → your review → I integrate 3 wins + reject 2 with reasoning. Same shape here.

No need to draft the implementation — I integrate against my conventions. The 3 wins from your v2 review (semantic tones, hide unmapped, reconcile) shipped cleanly in 7.11.1; this is the same pattern.

Standing context: Mavis is the long-term co-architect across all of xKryptic's projects. Compass is the personal-finance app for xKryptic's mom. Specs at workspace root (00-CLUSTER-7.X-*.md), HANDOVER.md + COORDINATION.md are the handoff contract between sessions, design system is Component Oracle Terminal (cool teal/cyan on near-black, Sora headings + JetBrains Mono data, oracle voice with `[OK]/[WARN]/[SIGIL]/[INDEXED]` markers).

Talk soon.
