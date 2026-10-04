# Cluster 7.14 — Per-bill off-ramp provider override UI (+ resolveChain fix)

**Status**: 🚧 IN PROGRESS (session `mvs_5c23655691c34fe6abface1b8c67fdabc`, started 2026-08-31 05:42 CDT)
**Predecessor**: `8b13660` (Cluster 7.11.1 — live activity ticker polish)
**Goal**: Fix the silent-no-op bug in `gateway.resolveChain` (the per-bill override doesn't reach the adapter Map) AND extend the C7.3 user-level off-ramp provider picker to the per-bill surface, so the user can route different bills through different providers. Visible-UI on existing infra, with the resolution bug fixed in the same commit.

---

## Why this cluster

The C7.3 spec (off-ramp picker) noted: *"Future cluster: per-bill off-ramp provider override UI — the data shape exists (`ScheduledBill.providerPreference`); the picker in `/vault/preferences` is a single user-level value. Per-bill overrides stay in the bill editor for a future cluster."* — that future cluster is now.

A bill-by-bill override is a real product surface:
- **High-value bills** (rent, mortgage) go to Spritz for the sandbox-tested path.
- **Low-value bills** (subscriptions, utilities) stay on MOCK — no real money at risk if the adapter flakes.
- **One-off / experimental** bills can pin to a specific provider while leaving the rest of the gateway chain at the user default.
- **Risk-bounded** — the user can isolate any single bill to MOCK as a kill switch without changing the user-wide default.

The visible-UI preference wins over the pure-infra candidates (C: env var rename, E: forked-mainnet, J: Monto adapter, L: dynamic Pool).

**AND** the cluster starts with a **bug fix** that the C7.3 work left behind: `gateway.resolveChain` reads `bill.providerPreference` but the `adapters` Map is keyed by the display name (`"Mock"`, `"Spritz"`, `"Monto"`, `"Manual Push"`) while `OffRampProvider` is the enum form (`"MOCK"`, `"SPRITZ"`, `"MONTO"`). The bridge is `OFFRAMP_PROVIDER_ADAPTER_NAME`; `buildDefault` applies it, `resolveChain` doesn't. So a per-bill override written as the enum silently falls back to the user-level preference — a "control that lies." Polar flagged this; fixing it in the same cluster is the right shape (the picker is useless if the chain doesn't honor it).

The visible-UI-heavy preference wins over the smaller pure-infra items, AND the rule "fix the broken read first" wins over "ship the picker anyway" — both are right for this cluster.

---

## Scope

### Task 1 — Fix `resolveChain` (the silent-no-op bug)

`src/lib/vault/gateway.ts:237-245`:

```ts
// BEFORE (silent no-op for enum-form values)
resolveChain(bill: ScheduledBill): string[] {
  const pref = bill.providerPreference;
  const known =
    pref && this.adapters.has(pref)
      ? pref
      : (this.fallbackOrder[0] ?? "Mock");
  const tail = this.fallbackOrder.filter((n) => n !== known);
  return [known, ...tail];
}

// AFTER
resolveChain(bill: ScheduledBill): string[] {
  // Normalize the stored preference to the adapter name (the Map key).
  // Accept both enum form ("SPRITZ") and display form ("Spritz")
  // defensively — older rows may have either. Unknown values fall
  // through to the user default.
  const pref = bill.providerPreference;
  const adapterName = pref
    ? (OFFRAMP_PROVIDER_ADAPTER_NAME as Record<string, string>)[pref] ??
      (this.adapters.has(pref) ? pref : null)
    : null;
  const known = adapterName && this.adapters.has(adapterName)
    ? adapterName
    : (this.fallbackOrder[0] ?? "Mock");
  const tail = this.fallbackOrder.filter((n) => n !== known);
  return [known, ...tail];
}
```

3 lines of effective change. The bridge is already imported at `gateway.ts:51`.

### Task 2 — Add `chainSourceLabel` helper

`src/lib/vault/gateway.ts` (new exported function):

```ts
/**
 * Cluster 7.14 — the user-visible label for which preference is
 * driving a bill's chain: "per-bill override" | "user default".
 * Used by the BillOffRampPicker to render the "currently routes
 * via" line and the chip on /obligations.
 */
export function chainSourceLabel(
  bill: { providerPreference?: string | null },
  userDefault: string,
): "per-bill override" | "user default" {
  return bill.providerPreference ? "per-bill override" : "user default";
}
```

### Task 3 — Server action

`src/lib/vault/server.ts` — new `setBillProviderPreferenceAction`:

```ts
const BILL_PROVIDER_VALUES = new Set(["MOCK", "SPRITZ", "MONTO"]);

export async function setBillProviderPreferenceAction(
  billId: string,
  rawProvider: string,
): Promise<
  | { ok: true; from: string | null; to: string | null }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  // Validate bill ownership — use findFirst with vault.userId,
  // NOT findUnique (which 500s on a bill that exists for another user).
  const bill = await prisma.scheduledBill.findFirst({
    where: { id: billId, vault: { userId: user.id } },
  });
  if (!bill) return { ok: false, error: "bill not found" };
  // "" or null → clear the override
  const provider =
    rawProvider && BILL_PROVIDER_VALUES.has(rawProvider)
      ? (rawProvider as OffRampProvider)
      : null;
  const from = (bill.providerPreference as string | null) ?? null;
  const to = provider;
  if (from === to) return { ok: true, from, to: to }; // no-op
  await prisma.scheduledBill.update({
    where: { id: billId },
    data: { providerPreference: provider, updatedAt: new Date() },
  });
  await recordVaultAudit({
    userId: user.id,
    actionType: "vault.off_ramp_provider_changed",
    payload: { scope: "bill", billId, from, to },
  });
  revalidatePath(`/vault/bills/${billId}`);
  revalidatePath("/vault");
  revalidatePath("/obligations");
  return { ok: true, from, to };
}
```

### Task 4 — Client wrapper

`src/lib/vault/actions.ts` — mirrors `setOffRampProviderActionClient` (line 92-94):

```ts
export async function setBillProviderPreferenceActionClient(
  billId: string,
  provider: string,
) {
  return setBillProviderPreferenceAction(billId, provider);
}
```

The picker imports the `_Client` wrapper, not the server action directly — same pattern as the user-level picker.

### Task 5 — `BillOffRampPicker` client component

`src/app/(app)/vault/bills/[id]/_components/BillOffRampPicker.tsx`:

Layout (4 chips, "inherit" is first-class):

```
┌─────────────────────────────────────────────────────┐
│  Off-ramp provider                                 │
│  [▣ USE MY DEFAULT · Spritz] [MOCK] [Spritz] [Monto]│
│  ─────                                            │
│  Resolved chain:                                   │
│  Spritz → Mock → Monto → Manual Push               │
│  (currently inheriting your user default)           │
│  [Clear override]                                  │
└─────────────────────────────────────────────────────┘
```

- 4 chips: [USE MY DEFAULT] (writes `null`) + [MOCK] + [Spritz] + [Monto] (the 3 enum values)
- `USE MY DEFAULT` shows the user's current default in the chip label
- Under the chips: the **resolved chain** rendered from `resolveChain(bill)` (rendered server-side and passed as a prop, since `resolveChain` is in `server-only` `gateway.ts`; or via a thin server-side helper that returns the chain array as a string)
- "Currently routes via" line uses `chainSourceLabel(bill, userDefault)` — "inherit" or "per-bill override"
- [Clear override] button when a per-bill override is set
- `useTransition` + `pending` so chips disable during the action (no double-fire)
- `aria-label="Per-bill off-ramp provider"` + `aria-live` for the change announcement

### Task 6 — Surface updates

1. **`/vault/bills/[id]`** — full picker + resolved chain display under the bill header. The page reads the user's preference (existing `buildGatewayForUser(userId)`) and passes the chain + label as props.
2. **`/obligations`** — `[PROVIDER · <name>]` chip inline next to the bill name **only when the bill has a per-bill override AND the override differs from the user default**. No chip when the bill uses the user default (one source of truth: the user default applies uniformly and a chip per row is noise).
3. **`/vault` OffRampPanel** — chain summary per bill row, with a tooltip showing "per-bill override: Spritz" or "inherits user default" so the user sees which bills are pinned vs. following the account.
4. **`/vault/bills/[id]/history`** — `vault.off_ramp_provider_changed` events with `scope: "bill"` in the timeline (extends the existing payload).

### Task 7 — `providerPreference` storage convention

Store the **enum form** (`"MOCK" | "SPRITZ" | "MONTO" | null`) for consistency with `VaultPreferences.offRampProvider`. Existing rows are read with the normalization in `resolveChain` (defensive — accepts both casings). The TS type stays `string?` for storage flexibility; the action validates at the boundary and casts to `OffRampProvider | null`.

### Files to add

- `src/app/(app)/vault/bills/[id]/_components/BillOffRampPicker.tsx` — client component (4 chips, resolved chain, useTransition)
- `tests/smoke-bill-provider-override.mjs` — ~30 checks including the **round-trip assertion** (set SPRITZ override, assert resolveChain returns "Spritz" first)

### Files to modify

- `src/lib/vault/gateway.ts` — fix `resolveChain` (3 lines) + add `chainSourceLabel` (exported)
- `src/lib/vault/server.ts` — new `setBillProviderPreferenceAction`
- `src/lib/vault/actions.ts` — new `setBillProviderPreferenceActionClient` wrapper
- `src/app/(app)/vault/bills/[id]/page.tsx` — mount the picker + read user default for the "use default" chip
- `src/app/(app)/obligations/page.tsx` — show `[PROVIDER · <name>]` chip inline only when overridden
- `src/app/(app)/vault/page.tsx` — OffRampPanel tooltip per row
- `tests/integration-vault.mjs` — add Phase 4.0 M12 (~20 checks: resolveChain fix + the round-trip + surface wiring)

### Files NOT touched

- `prisma/schema.prisma` — `ScheduledBill.providerPreference` already exists
- The user-level `/vault/preferences` picker — unchanged; the per-bill picker is additive
- `src/lib/vault/audit-bus.ts` — no new event types
- No new env vars, no new headers, no middleware changes

---

## Smoke (`tests/smoke-bill-provider-override.mjs`)

- Login as the smoke user
- Write a sentinel ScheduledBill (via the shared prisma client, id-stable)
- Hit the action (POST or server action invocation) with `{ billId, provider: "MOCK" }`
- **Round-trip assertion** (the bug fix proof): build a gateway for the user, call `gateway.resolveChain(bill)`, assert `chain[0] === "Mock"` (display name, the Map key)
- Repeat with `"SPRITZ"` → assert `chain[0] === "Spritz"`
- Clear with `""` → assert the chain falls back to the user default
- GET `/vault/bills/[id]` → assert the picker shows the new chip selected + the resolved chain display
- GET `/obligations` → assert the bill row has the `[PROVIDER · mock]` chip (when overridden; absent when inheriting)
- GET `/vault` → assert the OffRampPanel shows the per-bill override tooltip
- GET `/vault/bills/[id]/history` → assert the audit row with `scope: "bill"` is in the timeline
- Cross-user bill ownership: try `{ billId: <another-user-bill>, provider: "MOCK" }` → expect `error: "bill not found"`
- Source-file checks: action validates, gateway normalizes via `OFFRAMP_PROVIDER_ADAPTER_NAME`, audit row written, `chainSourceLabel` exported

### Integration-vault M12 (~20 checks)

- `gateway.ts:resolveChain` normalizes via `OFFRAMP_PROVIDER_ADAPTER_NAME` (source check)
- `gateway.ts:chainSourceLabel` is exported
- `server.ts:setBillProviderPreferenceAction` validates the bill ownership
- The action validates the provider against the `OffRampProvider` union
- The action writes a `vault.off_ramp_provider_changed` audit row with `scope: "bill"` payload
- The action revalidates the bill page + /vault + /obligations
- `actions.ts:setBillProviderPreferenceActionClient` is exported
- `BillOffRampPicker` renders the 4 chips (3 provider + 1 inherit)
- The picker passes the user's current default in the "inherit" chip label
- The picker has aria-label="Per-bill off-ramp provider" + aria-live
- `/vault/bills/[id]` page renders the picker + the resolved chain display
- `/obligations` shows the `[PROVIDER · ...]` chip per bill **only when overridden** (no chip when inheriting)
- `/vault` OffRampPanel shows the per-bill override tooltip
- Audit row payload shape matches `{ scope: "bill", billId, from, to }`
- package.json smoke script includes `smoke-bill-provider-override.mjs`

---

## Visible-UI payoff

- The user can isolate any single bill to MOCK (kill switch) without changing the user-wide default
- The /vault OffRampPanel shows exactly which bills have overrides vs. which use the user default (visualizing the "policy")
- The /obligations row shows the per-bill chip inline — but only when the bill diverges from the account, so the chip is meaningful (not noise)
- The /vault/bills/[id] history timeline shows the override changes over time (audit-the-audited)
- The **resolved chain display** under the picker shows exactly what happens if this bill's payment fails — the user's "what happens if this fails?" question gets a literal visual answer

## Infra-vs-UI mix

- ~15% infra (resolveChain fix + server action + audit row payload + storage convention)
- ~75% pure presentation (picker, chip, OffRampPanel tooltip, resolved chain display)
- ~10% smoke + wire checks

---

## Risks + mitigations

1. **Existing rows with display-form preference** — defensive normalization in `resolveChain` accepts both casings. The smoke covers both.
2. **Server action on a non-owned bill** — `findFirst({ where: { id, vault: { userId } } })` (NOT `findUnique`) is the pattern; a bill id from another user's vault returns null and the action returns `error: "bill not found"`. The smoke verifies this.
3. **Provider not in `OffRampProvider` union** — the action validates against the 3-value set; an unknown value falls through to `null` (clears the override, which is the safe default).
4. **No-op (from === to)** — the action short-circuits and returns `{ ok, from, to }`; no audit row is written for a redundant change. Avoids audit log spam.
5. **Gateway chain ordering with override** — `resolveChain` already handles this. The fix is the 3-line normalize; the chain ordering is unchanged.
6. **/obligations row height growth** — the chip adds ~16px per bill row, but only when overridden. A user with no per-bill overrides has no chips; the page is unchanged.

---

## Acceptance

- [ ] Cluster spec written (this file, renamed from 7.12 to 7.14)
- [ ] Polar's v2-amended spec received + integrated
- [ ] `gateway.resolveChain` fixes the silent-no-op bug (3-line normalize via `OFFRAMP_PROVIDER_ADAPTER_NAME`)
- [ ] `chainSourceLabel` is exported
- [ ] `setBillProviderPreferenceAction` ships with validation + audit + revalidate
- [ ] `setBillProviderPreferenceActionClient` wrapper in `actions.ts`
- [ ] `BillOffRampPicker` ships with 4 chips (inherit + 3 provider) + resolved chain display + useTransition
- [ ] `/vault/bills/[id]` renders the picker + resolved chain
- [ ] `/obligations` shows the per-bill chip only when overridden
- [ ] `/vault` OffRampPanel shows the per-bill override tooltip per row
- [ ] `/vault/bills/[id]/history` shows the `scope: "bill"` audit events
- [ ] `tsc --noEmit` clean
- [ ] `tests/smoke-bill-provider-override.mjs` green (~30 checks, including the **round-trip assertion**)
- [ ] `tests/integration-vault.mjs` Phase 4.0 M12 green (~20 checks)
- [ ] Full smoke baseline (~1,800 checks) green
- [ ] Single commit on top of `8b13660` with the cluster shape
- [ ] HANDOVER + COORDINATION "Last update" updated
- [ ] Memory three-question test (any new lesson worth saving?)
