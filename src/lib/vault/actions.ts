/**
 * Compass Vault — server actions.
 *
 * These are the public server actions exposed to client components
 * on the /vault page. They wrap the server.ts helpers and write
 * the appropriate audit-log entries.
 *
 * "use server" is required at the top of this file because the
 * actions are imported by a client component (the SyncButton).
 */

"use server";

import {
  syncVaultAction,
  clearVaultAction,
  setYieldRoutingAction,
  acknowledgeRiskAction,
  pauseVaultAction,
  resumeVaultAction,
  transitionBillServerAction,
  simulateNextStateAction,
  refreshVaultApyAction,
  createBillAction,
  updateBillAction,
  deleteBillAction,
  deploySafeAction,
} from "./server";

/**
 * Server action: sync the vault from the live envelopes + bills.
 * Idempotent. Re-exported from server.ts for client-component use.
 */
export async function syncVaultFromEnvelopes() {
  return syncVaultAction();
}

/**
 * Server action: clear the user's vault data. Used by the
 * integration test to reset state. NOT exposed in the UI (a real
 * "Reset vault" button would require a confirm step and a
 * separate re-auth check — that ships in Phase 3).
 */
export async function clearVault() {
  return clearVaultAction();
}

/**
 * Server action: set the user's yield-routing strategy.
 * Validates the input against the TS union; rejects unknown
 * values with a structured error.
 */
export async function setYieldRoutingStrategyAction(strategy: string) {
  return setYieldRoutingAction(strategy);
}

/**
 * Server action: mark the risk disclosure as acknowledged.
 * Persists `riskAcknowledgedAt = now()` on the preferences row
 * and writes a `vault.risk_acknowledged` audit entry.
 */
export async function acknowledgeRiskDisclosureAction() {
  return acknowledgeRiskAction();
}

/**
 * Server action: pause the vault. Sets `VaultAccount.status = PAUSED`.
 * The page surfaces this via the alert banner and the bills' state.
 */
export async function pauseVaultFromPage() {
  return pauseVaultAction();
}

/**
 * Server action: resume a paused vault. Sets `VaultAccount.status = ACTIVE`.
 */
export async function resumeVaultFromPage() {
  return resumeVaultAction();
}

/**
 * Server action: apply a single user-facing event to a bill.
 * Validates the event type against the whitelist; rejects unknown
 * events with a structured error. Returns the from/to/event on
 * success for the optimistic UI.
 */
export async function transitionBillFromPage(
  billId: string,
  eventType: string,
) {
  return transitionBillServerAction(billId, eventType);
}

/**
 * Server action: "simulate next state" — runs the first legal
 * event for a bill. The dev affordance called out in
 * COORDINATION.md (line 1401). Terminal states (SETTLED,
 * CANCELLED) are no-ops.
 */
export async function simulateNextBillStateFromPage(billId: string) {
  return simulateNextStateAction(billId);
}

/**
 * Server action: refresh the vault's APY from the active yield
 * adapter. The "manual cron" called out in the Phase 3.0
 * handoff. In production a real cron runs this every N
 * minutes; for Phase 3.0 the user triggers it from the
 * [SYNC] REFRESH button on the /vault page.
 */
export async function refreshVaultApyFromPage() {
  return refreshVaultApyAction();
}

/**
 * Server action: add a new bill to the user's vault. Form
 * shape: `{ billerName, amountCents, frequency, dueDay,
 * providerPreference? }`. The new bill starts in `FUNDED`
 * status and is tagged `source: "user"` so the seed pass
 * won't overwrite it.
 */
export async function createBillFromPage(
  rawForm: unknown,
  envelopeId: string,
) {
  return createBillAction(rawForm, envelopeId);
}

/**
 * Server action: update a bill's editable metadata (name,
 * amount, frequency, due day, provider). Status changes go
 * through `transitionBillFromPage`.
 */
export async function updateBillFromPage(
  billId: string,
  rawForm: unknown,
) {
  return updateBillAction(billId, rawForm);
}

/**
 * Server action: delete a bill from the user's vault. The
 * client component confirms via `window.confirm` before calling.
 */
export async function deleteBillFromPage(billId: string) {
  return deleteBillAction(billId);
}

/**
 * Server action: deploy a Safe to the configured chain
 * (Base Sepolia by default). Called from the [DEPLOY] button
 * on /vault when the user has not yet deployed a real Safe.
 *
 * Idempotent: refuses to re-deploy if a non-mock address is
 * already on the vault. The deploy tx is irreversible on-
 * chain, so the UI hides the button + the server re-checks.
 */
export async function deploySafeFromPage() {
  return deploySafeAction();
}
