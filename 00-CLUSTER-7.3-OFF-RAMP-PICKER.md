# Cluster 7.3 — Off-ramp picker (visible UI) + MOCK adapter + Spritz sandbox-ready wiring

**Date**: 2026-08-29 15:25 CDT
**Status**: 🟡 In progress
**Goal**: Add a user-facing picker for the off-ramp provider the gateway will try first. Wire a `MockOffRampAdapter` (clean success, no external call) as the default and the safe fallback. Wire the Spritz adapter to the `@spritz-finance/api-client` SDK; the adapter self-falls-back to MOCK when `SPRITZ_INTEGRATION_KEY` is missing. Visible-UI + the infra that makes the UI actually do something.

---

## Why this cluster exists

The vault's off-ramp gateway (Cluster Vault 4.0 M4) already has a stub chain: `Spritz → Monto → Manual Push`. But:

1. **The user has no choice.** The gateway is hardcoded to try Spritz first, regardless of what the user wants. Real users pick a primary provider; Compass shouldn't dictate.
2. **There's no `MOCK` mode.** A user (or the integration test) who wants to validate end-to-end without touching any external service has no way to opt out.
3. **Spritz is a stub.** The handover's "What was NOT done" list called out the real Spritz + Monto API adapters as a future cluster. The sandbox tier is documented and free; the wiring is straightforward.

This cluster closes the loop: the user picks a provider (or stays on MOCK for the safest end-to-end path), the gateway uses their choice, and the Spritz adapter is plumbed for the sandbox — flip a `.env.local` switch and it goes live.

The handover's "Next cluster" recommendation is this exact cluster: *"Wire one or both stubs to a real (or testnet-real) provider. Start with **Spritz**."*

---

## Scope (this cluster)

### 1. Prisma — `offRampProvider` on `VaultPreferences`

Add one field to the `VaultPreferences` model:

```prisma
/// Cluster 7.3 — user-level default for the off-ramp gateway's
/// first choice. One of OffRampProvider (TS union in
/// src/lib/vault/types.ts): MOCK | SPRITZ | MONTO. Default MOCK.
/// The gateway builds its adapter chain with this provider first
/// when the bill has no per-bill `providerPreference` override.
offRampProvider  String  @default("MOCK")
```

Plus the `OffRampProvider` TS union in `src/lib/vault/types.ts` and the matching field on the `VaultPreferences` interface. Default `MOCK` so a brand-new user (no preferences row yet) gets the safe path.

### 2. `MockOffRampAdapter` — clean success, no external call

New adapter in `src/lib/vault/adapters.ts`. Same `IOffRampAdapter` contract as `SpritzAdapter` / `MontoAdapter`. Returns:

```ts
{
  success: true,
  providerName: "Mock",
  transactionId: deterministic from idempotency key,
  requiresManualAction: false,
}
```

Idempotency via the existing `idempotencyCache` (in-process `Map`) — same contract as the other adapters. The integration smoke's existing idempotency test continues to pass.

### 3. `SpritzClientAdapter` — env-driven, MOCK fallback

New file `src/lib/vault/spritz-client.ts`. Wraps `@spritz-finance/api-client` to satisfy `IOffRampAdapter`. At construction time it checks:

- `SPRITZ_INTEGRATION_KEY` — required
- `SPRITZ_SANDBOX` — when `"true"`, hits the sandbox environment; otherwise the constructor refuses to instantiate

If either check fails, the factory `createSpritzAdapter({ userId })` returns a `MockOffRampAdapter` with `providerName: "Spritz"` so the gateway chain still works end-to-end. The `/vault` OffRampPanel surfaces the fallback via the note: *"Spritz — SDK configured, but credentials missing → MOCK fallback. Add `SPRITZ_INTEGRATION_KEY` and `SPRITZ_SANDBOX=true` to `.env.local` to go live."*

Real flow (when creds are present): `spritz.quotes.create` → resolve the bank account from the bill's `billerId` (deferred to a future cluster; the v1 mock returns a fixed `bankAccountId`) → execute. The smoke exercises the MOCK fallback path; the real path is plumbed but not exercised by automated tests (xKryptic's sandbox creds aren't available yet).

### 4. `OffRampGateway` — read the user's preference

Update `OffRampGateway.buildDefault(userId, preference)` to:

1. Build the full adapter map: `Mock`, `Spritz` (or MOCK-fallback named "Spritz"), `Monto`, `Manual Push`.
2. Compute the fallback chain: `[preference, ...others excluding preference, "Manual Push"]` — preference first, then everything else, Manual Push terminal.
3. Existing `resolveChain(bill)` still works: a bill-level `providerPreference` overrides the user default; the chain still ends with Manual Push.

The snapshot projection (`loadVaultSnapshot` in `db.ts`) now reads `offRampProvider` from the preferences row and passes it to the gateway. The OffRampPanel reads the same field to highlight the active provider.

### 5. Server action `setOffRampProvider`

New `setOffRampProviderAction(provider: string)` in `src/lib/vault/server.ts` (with the validation whitelist pattern used by `setYieldRoutingAction`) and re-exported from `src/lib/vault/actions.ts`. Writes the field, writes a `vault.off_ramp_provider_changed` audit entry with `{ from, to }`.

### 6. `OffRampProviderPicker` — visible UI in `/vault/preferences`

New client component `src/components/vault/OffRampProviderPicker.tsx`. Mirrors the `YieldRoutingPicker` pattern exactly:

- 3 chip cards in a single row: `MOCK`, `Spritz`, `Monto`
- Each shows: `// mock · clean path` mono-capped label, the provider name in Sora 14 semibold, a one-line description, and a `[OK] Current` chip on the active one
- Click → optimistic UI → `setOffRampProviderAction(...)` → `router.refresh()`
- Wired into a new `// off-ramp · provider` SectionHeader on `/vault/preferences`, between the yield-routing section and the risk-disclosure section
- Includes a one-line note: *"MOCK is the safe default — no external call, no real money. Pick Spritz or Monto to use a real provider; missing credentials auto-fall-back to MOCK."*

### 7. "Currently configured" indicator in `/vault` PageHead

New chip `<OffRampProviderChip provider={prefs.offRampProvider} />` in the PageHead `actions` slot, sitting between `SourceChip` and `VaultStatusChip`. Renders as:

```
[PROVIDER] SPRITZ
```

with vessel-accent border. `data-testid="vault-offramp-chip"` + `data-provider="SPRITZ|MOCK|MONTO"` for the smoke.

### 8. `OffRampPanel` — highlight active provider + MOCK row

Add a 4th column: `Mock`. Highlight the user's configured provider with a `// CURRENT` label and a vessel-accent left border. Update the chain summary at the bottom to read the actual configured provider (not always "Spritz"). Each adapter's `note` becomes a per-provider truthful string:

- `MOCK` — "Clean path. No external call. Use for end-to-end testing."
- `Spritz` — "Real provider via @spritz-finance/api-client. Falls back to MOCK when credentials are missing." (or "Live in sandbox" when creds are set)
- `Monto` — "Stub — always succeeds (Phase 2)"
- `Manual Push` — "Safety path. Returns MANUAL_ACTION_REQUIRED when reached."

### 9. `PolicySummaryCard` — fifth cell

Add a fifth cell to the existing 4-cell grid on `/vault/preferences` showing the configured provider. Links to the picker section anchor below.

### 10. Files

**New:**
- `00-CLUSTER-7.3-OFF-RAMP-PICKER.md` — this spec
- `src/lib/vault/spritz-client.ts` — Spritz SDK adapter + MOCK fallback factory
- `src/components/vault/OffRampProviderPicker.tsx` — the picker
- `tests/smoke-off-ramp-picker.mjs` — UI smoke

**Edit:**
- `prisma/schema.prisma` — `VaultPreferences.offRampProvider` field
- `src/lib/vault/types.ts` — `OffRampProvider` union + `VaultPreferences.offRampProvider` field + `OFFRAMP_PROVIDER_LABEL`/`OFFRAMP_PROVIDER_DESC` maps (mirroring the yield-routing ones)
- `src/lib/vault/adapters.ts` — `MockOffRampAdapter`
- `src/lib/vault/gateway.ts` — `OffRampGateway.buildDefault(userId, preference)` takes a preference
- `src/lib/vault/server.ts` — `setOffRampProviderAction` + pass preference into the gateway
- `src/lib/vault/actions.ts` — re-export `setOffRampProviderAction`
- `src/lib/vault/db.ts` — `loadVaultSnapshot` returns the `offRampProvider` on `preferences`, projects 4 adapters (MOCK + Spritz + Monto + Manual Push), includes `isActive: boolean` per adapter (true for the configured one)
- `src/components/vault/PolicySummaryCard.tsx` — fifth cell
- `src/app/(app)/vault/preferences/page.tsx` — new picker section
- `src/app/(app)/vault/page.tsx` — new chip in PageHead actions + `isActive` highlight in OffRampPanel + chain summary reads from preference
- `tests/integration-vault.mjs` — gateway honors preference, MOCK fallback, chain still terminates on Manual Push
- `package.json` — add `@spritz-finance/api-client` dependency

### 11. Smoke (~22 new checks)

- `smoke-off-ramp-picker` — ~14 checks: picker renders, three chips labeled, MOCK is the default-active, save persists, the `/vault` chip reflects the choice, OffRampPanel highlights the active provider, chain summary uses the configured name.
- `integration-vault` — ~8 new checks: gateway picks the configured provider first, MOCK adapter writes a successful PaymentAttempt + ProviderEvent + audit row, MOCK is the fallback when Spritz creds are absent, Manual Push is the terminal safety net.

### 12. Dependencies

- `@spritz-finance/api-client` — Spritz's official TypeScript client (sandbox + production). Pinned to the latest minor; no peer-dep risk. Optional at runtime (the adapter self-falls-back to MOCK when the key is missing), so a fresh `pnpm i` with no env vars set still works.

---

## Out of scope (deferred)

- **Real Spritz sandbox creds** — xKryptic signs up at `sdk.spritz.finance` to get a sandbox key. The code is wired; smoke covers the MOCK fallback path; flipping to live is a `.env.local` change.
- **Monto real integration** — the spec calls Spritz the primary rail. Monto stub remains.
- **Real fiat bank-account linking** — the off-ramp delivers USDC to the user's wallet; the user is responsible for off-ramping to a bank themselves in v1.
- **Multi-rail failover** — a single bill uses one provider; chained providers are a future cluster.
- **Refund / dispute flow** — the existing `Manual Push` adapter's error path is the contract; a real adapter just maps the same error states.
- **Per-bill provider override at the UI level** — the data shape (`ScheduledBill.providerPreference`) already exists, but the picker in `/vault/preferences` is a single user-level value. Per-bill overrides stay in the bill editor for a future cluster.
- **Audit-log UI for `vault.off_ramp_provider_changed`** — the row is written; the audit log viewer that surfaces it is a future cluster.

---

## Acceptance criteria

1. `pnpm tsc` clean.
2. `pnpm smoke:all` green (29 suites — the existing 28 plus the new `smoke-off-ramp-picker`; total ~1,470 checks).
3. `/vault/preferences` shows a 3-chip picker: `MOCK`, `Spritz`, `Monto`. Default selection is MOCK for a fresh user.
4. Selecting a different provider persists the choice (visible after a hard reload).
5. `/vault` shows a `[PROVIDER] <name>` chip in the PageHead actions slot.
6. `/vault` OffRampPanel highlights the configured provider with a `// CURRENT` label + accent border.
7. The chain summary in the OffRampPanel reads `<configured> → <fallback> → Manual Push`, not the hardcoded `Spritz → Monto → Manual Push`.
8. `PolicySummaryCard` on `/vault/preferences` shows the configured provider in a 5th cell.
9. With no `SPRITZ_INTEGRATION_KEY` set, selecting Spritz still works end-to-end (gateway falls back to the MOCK-named-Spritz adapter); the OffRampPanel note explains the fallback.
10. With `SPRITZ_INTEGRATION_KEY` + `SPRITZ_SANDBOX=true` set, the adapter reports "Live in sandbox" and would call the real Spritz API (smoke doesn't exercise the network path).
11. The audit log records every change with `vault.off_ramp_provider_changed` and `{ from, to }` payload.

---

## Risk + rollback

- **Risk: Prisma schema drift** — adding a new column to an existing table. Mitigated by `prisma db push --accept-data-loss` + the existing restart-dev-server gotcha. The Prisma migration cache gotcha is in agent memory; restart the dev server after the push.
- **Risk: dev server caches the generated Prisma client** — same as every other schema change. Restart `pnpm dev` after the push.
- **Risk: optional Spritz dep** — `@spritz-finance/api-client` is imported at module load in `spritz-client.ts`. If the package is missing, the import throws. Mitigated by the `pnpm i` step before the next dev start. The adapter itself is gated by env vars, so the absence of env vars means the MOCK fallback runs — but the import must still resolve.
- **Risk: gateway chain re-ordering** — the chain now starts with the user's preference. If a user picks `Monto` and Monto is broken, the chain falls through to `Manual Push`. The Manual Push terminal state is preserved.
- **Rollback**: revert the commit. The `offRampProvider` column stays in the DB; the picker goes away; the gateway reverts to `Spritz → Monto → Manual Push`.

---

## Commit shape

- `<sha1> Cluster 7.3 — Off-ramp picker + MOCK adapter + Spritz sandbox-ready wiring (visible UI)`
- `<sha2> docs: HANDOVER + COORDINATION reflect Cluster 7.3`
