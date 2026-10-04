# Polar response — Cluster 7.14 vs 7.12

Tell Polar:

> You were right; my "yes, confirmed" on the gateway was a half-verification. Reading `bill.providerPreference` is not the same as using it as a Map key. The casing bridge via `OFFRAMP_PROVIDER_ADAPTER_NAME` is the type-system contract; `buildDefault` honors it, `resolveChain` doesn't. A per-bill override written as "SPRITZ" would silently fail `this.adapters.has("SPRITZ")` and fall back to `this.fallbackOrder[0]`. The UI would show the override, the chain would ignore it, and the smoke would pass because the chain is valid — the bug is invisible without a round-trip test.
>
> **Renumbering to 7.14** — agreed, 7.12 and 7.13 are taken (durable audit bus + sidebar activity ticker, both in Drive). Reusing 7.12 gives us two different specs under one number. Updated spec is at `00-CLUSTER-7.14-PER-BILL-OVERRIDE-UI.md` (path will be in the file the user saves to Drive).
>
> **Cluster shape changes** — your pushback is right: "a picker over a broken resolveChain is worse than no picker." Fix the resolution bug first, in the same cluster, with a smoke that proves the override changes the chain. The cluster is now:
>
> 1. **Fix `resolveChain`** in `src/lib/vault/gateway.ts:237-245` to normalize via `OFFRAMP_PROVIDER_ADAPTER_NAME`, accept both casings defensively (e.g. if someone manually wrote "spritz" lowercase), and store the enum form for consistency with `VaultPreferences.offRampProvider`. 3 lines.
> 2. **Add `chainSourceLabel(bill, userPref)`** to `gateway.ts` for the "per-bill override" vs "user default" display.
> 3. **Server action** `setBillProviderPreferenceAction({ billId, provider })` in `server.ts` — validate bill ownership (not `findUnique`, use `findFirst({ vault: { userId } })`), validate provider against the `OffRampProvider` union (not `string?` — widen the type or validate at the boundary; I'll widen at the boundary to keep `string?` for storage flexibility), no-op short-circuit if `from === to`, write `vault.off_ramp_provider_changed` audit row with `{ scope: "bill", billId, from, to }`, revalidate the bill page + /vault + /obligations.
> 4. **`setBillProviderPreferenceActionClient` wrapper** in `actions.ts` (mirrors the existing `setOffRampProviderActionClient` at actions.ts:92-94 — client-callable, returns the server action's result). The picker imports this wrapper, not the server action directly.
> 5. **`BillOffRampPicker.tsx`** — 4 chips (not 3): [USE MY DEFAULT · <userDefault>] + [MOCK] + [Spritz] + [Monto]. `USE MY DEFAULT` writes `null`. The other three write the enum form. Reuse `useTransition` + `pending` from `OffRampProviderPicker` so chips disable during the action (no double-fire).
> 6. **Resolved chain display** — under the chips, render the actual chain that `gateway.resolveChain(bill)` returns for THIS bill right now (e.g. `Spritz → Mock → Monto → Manual Push`). The resolved chain is the picker value's consequence; rendering it makes the fallback visible and would have surfaced the resolveChain bug on sight. Above-the-fold on /vault/bills/[id].
> 7. **Surfaces**:
>    - `/vault/bills/[id]` — full picker + resolved chain display
>    - `/obligations` — `[PROVIDER · <name>]` chip inline next to the bill name **only when overridden** (per-bill override ≠ user default). When the bill uses the user default, no chip — the user default applies uniformly and a chip per row is noise.
>    - `/vault` OffRampPanel — chain summary shows the per-bill override vs. user default tooltip per row
>    - `/vault/bills/[id]/history` — `vault.off_ramp_provider_changed` events with `scope: "bill"` in the timeline (extends the existing payload)
> 8. **Smoke (`tests/smoke-bill-provider-override.mjs` ~30 checks)** — including the round-trip you flagged: write a sentinel bill, set `providerPreference = "SPRITZ"`, hit `/api/vault/bills/[id]/provider` or call the action, run the gateway, assert `resolveChain(bill)[0] === "Spritz"` (the display name, not "SPRITZ"). Without that assertion the bug passes. The pre-fix behavior is `resolveChain(bill)[0] === "Mock"` (silent fallback to user default).
> 9. **Integration-vault M12** — ~20 source + wire checks for the wiring.
>
> **All 3 design wins adopted:**
> - Show the **resolved chain** (not the choice) — yes, this is the visible-UI payoff per your "what happens if this fails?" framing.
> - **"Inherit" / "Use default"** as a first-class state — yes, four chips not three. A bill that says "follow the account" is a real state; collapsing it into "default" loses intent.
> - **Chip on /obligations only when overridden** — yes, this is the inverse of the C7.3 user-level picker (which is the user default and shows once on /vault/preferences). The per-bill chip is the *exception*, not the rule.
>
> **All 3 spec corrections adopted** (verified against source):
> - `setBillProviderPreferenceActionClient` wrapper in `actions.ts` (mirrors `setOffRampProviderActionClient` at line 92-94). Confirmed.
> - `providerPreference: string?` in `types.ts:231` — nothing type-checks the stored value today. Will validate at the action boundary (widen to `OffRampProvider | null` in the picker + the audit row payload, but keep `string?` for storage so existing rows with weird values don't break the read). Confirmed.
> - `useTransition` + `pending` from `OffRampProviderPicker` to disable chips during the action. Confirmed.
>
> **What I won't do** — won't drop the spec in Drive myself (the workspace is my reach, Drive is yours). The user will save the spec file to Drive and re-relay to you for the end-to-end review. When you come back with the v2-amend I'll integrate the same way I did 7.11 / 7.11.1: 3 wins, reject 2 with reasoning, ship the cluster in one commit.
>
> **One follow-up question for the v2 review:** the "chip on /obligations only when overridden" rule — should the chip also surface when the user has no preference set (the default-when-unset case = MOCK)? Right now I'm treating "user has no preference" as "user default is MOCK" (the column default), so the chip is suppressed uniformly when the bill's `providerPreference` is null. The alternative: the chip shows whenever the bill's effective provider differs from the *user's chosen* default, not from MOCK. I think the former is right (one source of truth, the column default) but want your read.

Then I'll go execute. Estimated ~45 min: resolveChain fix + 3-line normalize + new helper, server action + client wrapper, picker component, surface updates, smoke with the round-trip assertion, integration-vault M12, tsc + full smokes, commit. Will report back when done.
