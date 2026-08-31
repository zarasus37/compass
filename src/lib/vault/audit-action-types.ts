/**
 * Compass Vault — canonical audit action type union.
 *
 * This module is the single source of truth for the `vault.*`
 * action types used by `recordVaultAudit` (Cluster 7.x) and
 * consumed by both the server (db.ts, audit-log.ts) and the
 * client (audit-log-shared.ts, LiveActivityTicker, AuditTable,
 * etc.). Living in its own file (not db.ts) so client components
 * can import the union without pulling in `server-only` (db.ts
 * has `import "server-only"` at the top).
 *
 * **Keep in sync with `recordVaultAudit` in `db.ts`.** The
 * `recordVaultAudit` signature imports this type; adding a new
 * action type here without adding it to the union in db.ts (or
 * vice-versa) is a TS error.
 *
 * **Why a union AND an array?** The union is the type the
 * recordVaultAudit signature uses (compile-time exhaustiveness
 * check). The array is for runtime iteration — the LiveActivity
 * Ticker uses it to verify its humanizer map covers every type.
 */

export type VaultAuditActionType =
  // Vault lifecycle
  | "vault.synced"
  | "vault.paused"
  | "vault.resumed"
  | "vault.balance_refreshed"
  | "vault.safe_deployed"
  | "vault.safe_deploy_failed"
  | "vault.funded"
  // Aave
  | "vault.aave_supply"
  | "vault.aave_withdraw"
  | "vault.apy_refreshed"
  | "vault.apy_refresh_failed"
  // Yield routing
  | "vault.yield_routed"
  | "vault.yield_routing_changed"
  // Bills
  | "vault.bill_added"
  | "vault.bill_updated"
  | "vault.bill_deleted"
  | "vault.bill_state_changed"
  // Payments
  | "vault.payment_attempted"
  | "vault.payment_settled"
  | "vault.payment_failed"
  | "vault.payment_executed"
  | "vault.payment_manually_confirmed"
  // Adapters
  | "vault.adapter_fallback"
  // Off-ramp / risk
  | "vault.off_ramp_provider_changed"
  | "vault.risk_acknowledged"
  | "vault.risk_unacknowledged"
  // Scheduler
  | "vault.scheduler_run"
  // Meta (audit-the-audited)
  | "vault.audit_log_viewed"
  | "vault.bill_history_viewed"
  // Cluster 7.10 — cron alert surface
  | "vault.cron_prune_failure";

/**
 * The full list, in declaration order. Used at runtime to verify
 * exhaustive coverage of the humanizer map (the smoke imports
 * this + iterates).
 */
export const VAULT_AUDIT_ACTION_TYPES: ReadonlyArray<VaultAuditActionType> = [
  "vault.synced",
  "vault.paused",
  "vault.resumed",
  "vault.balance_refreshed",
  "vault.safe_deployed",
  "vault.safe_deploy_failed",
  "vault.funded",
  "vault.aave_supply",
  "vault.aave_withdraw",
  "vault.apy_refreshed",
  "vault.apy_refresh_failed",
  "vault.yield_routed",
  "vault.yield_routing_changed",
  "vault.bill_added",
  "vault.bill_updated",
  "vault.bill_deleted",
  "vault.bill_state_changed",
  "vault.payment_attempted",
  "vault.payment_settled",
  "vault.payment_failed",
  "vault.payment_executed",
  "vault.payment_manually_confirmed",
  "vault.adapter_fallback",
  "vault.off_ramp_provider_changed",
  "vault.risk_acknowledged",
  "vault.risk_unacknowledged",
  "vault.scheduler_run",
  "vault.audit_log_viewed",
  "vault.bill_history_viewed",
  "vault.cron_prune_failure",
];

/**
 * The two "meta" event types written by pages that audit
 * themselves. They should NEVER appear in the live ticker (the
 * user just opened the page; the row would echo back instantly).
 *
 * Used by:
 *   - `LiveActivityTicker` (Cluster 7.11) — pass to
 *     `useAuditStream({ ignoreActionTypes: [...LIVE_TICKER_IGNORED_TYPES] })`
 *   - `LiveAuditTable` / `LiveBillEventTable` (Cluster 7.6) — same
 *     purpose for the audit page + bill history page.
 */
export const LIVE_TICKER_IGNORED_TYPES: ReadonlySet<VaultAuditActionType> =
  new Set<VaultAuditActionType>([
    "vault.audit_log_viewed",
    "vault.bill_history_viewed",
  ]);
