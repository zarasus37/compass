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

import { syncVaultAction, clearVaultAction } from "./server";

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
