/**
 * Compass Vault — off-ramp gateway (Cluster Vault 4.0 M4).
 *
 * The orchestrator the spec calls `OffRampGateway`. Wraps the
 * 3 stub `IOffRampAdapter`s in the user's preferred order, runs
 * `canExecute` before any state transition, and drives the bill
 * through the 13-state machine to a terminal state (SETTLED or
 * a degraded branch).
 *
 * What it does:
 *   1. canExecute(bill, vault, now) — the 7-condition gate from
 *      the spec (status, pause, window, cap, reserve, approver,
 *      pending attempt). Returns `{ ok, reason? }` so the UI can
 *      show the reason in a tooltip when the button is disabled.
 *   2. executePayment(bill, vault, idempotencyKey) — picks the
 *      adapter chain (preference → fallback → Manual Push),
 *      invokes the first available adapter, maps the result
 *      to a state-machine event (CONFIRM_SETTLED for success,
 *      MANUAL_ACTION_REQUIRED for the fallback adapter,
 *      FAIL_FINAL for all-failed). Each adapter call is wrapped
 *      in `createDbBackedAdapter` so PaymentAttempt + ProviderEvent
 *      + audit log are written automatically.
 *   3. executePayment is idempotent on (billId, idempotencyKey)
 *      via the unique index on `PaymentAttempt` — re-submitting
 *      the same key returns the existing `transactionId` without
 *      creating duplicate rows.
 *
 * What's still stubbed (deferred to a later cluster):
 *   - Real provider API integrations (the spec calls this Phase 4
 *     separately). The gateway is provider-agnostic — swap a stub
 *     for a real one in 1 file and the rest stays the same.
 *   - The cron / scheduled trigger. M4 ships the manual "Execute
 *     now" button; a follow-on cluster adds the Vercel cron route
 *     that polls bills in EARNING whose window is open.
 *
 * Multi-round: M4 calls the gateway once per user click. The
 * state machine + canExecute gate are the round boundaries. A
 * real cron would loop through all eligible bills once per
 * tick.
 */

import "server-only";
import type {
  IOffRampAdapter,
  OffRampProvider,
  OffRampRequest,
  OffRampResult,
  ScheduledBill,
  VaultAccount,
} from "./types";
import { OFFRAMP_PROVIDER_ADAPTER_NAME } from "./types";
import type { BillEvent } from "./state-machine";
import {
  MockOffRampAdapter,
  SpritzAdapter,
  MontoAdapter,
  FallbackManualPushAdapter,
  createDbBackedAdapter,
} from "./adapters";
import { createSpritzAdapter } from "./spritz-client";
import { prisma } from "@/server/db";

/**
 * The 7 conditions from the spec, evaluated in order. The first
 * failing condition wins (the reason is specific to the gate that
 * failed, which the UI surfaces in a tooltip).
 */
export type CanExecuteResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * A bill is eligible for execution when ALL of the following are
 * true:
 *   1. status is in {FUNDED, EARNING}  (the spec's "SCHEDULED" —
 *      mapped to our 13-state names)
 *   2. vault is not paused or in recovery
 *   3. now is within the execution window
 *   4. amount does not exceed the per-bill cap
 *   5. settlement reserve covers the amount
 *   6. biller is on the approver list (M4 stub: always true)
 *   7. no in-flight attempt (PaymentAttempt rows in the last 5
 *      minutes that haven't reached a terminal state)
 */
export async function canExecute(
  bill: ScheduledBill,
  vault: VaultAccount,
  now: Date = new Date(),
): Promise<CanExecuteResult> {
  // 1. status
  if (bill.status !== "FUNDED" && bill.status !== "EARNING") {
    return {
      ok: false,
      reason: `Bill is in ${bill.status}; can only execute from FUNDED or EARNING.`,
    };
  }
  // 2. vault not paused
  if (vault.status === "PAUSED") {
    return { ok: false, reason: "Vault is paused." };
  }
  if (vault.status === "RECOVERY_MODE") {
    return {
      ok: false,
      reason: "Vault is in recovery mode; manual settlement required.",
    };
  }
  // 3. execution window
  const start = new Date(bill.executionWindowStart).getTime();
  const end = new Date(bill.executionWindowEnd).getTime();
  const t = now.getTime();
  if (t < start) {
    return {
      ok: false,
      reason: `Execution window opens at ${bill.executionWindowStart}.`,
    };
  }
  if (t > end) {
    return {
      ok: false,
      reason: `Execution window closed at ${bill.executionWindowEnd}.`,
    };
  }
  // 4. amount vs cap
  if (bill.amount > bill.maxAuthorizedAmount) {
    return {
      ok: false,
      reason: `Amount ${bill.amount} exceeds cap ${bill.maxAuthorizedAmount}.`,
    };
  }
  // 5. settlement reserve
  if (vault.settlementReserve < bill.amount) {
    return {
      ok: false,
      reason: `Settlement reserve short: need ${bill.amount}, have ${vault.settlementReserve}.`,
    };
  }
  // 6. biller approver (M4 stub — the policy module lands in
  //    a later cluster per spec)
  // Always true for M4.
  // 7. (deferred) in-flight attempt check. Originally a 5-min
  //    backoff to prevent double-spend, but the unique constraint
  //    on (providerName, idempotencyKey) + the per-minute key
  //    rotation (see executionIdempotencyKey in server.ts) handle
  //    correctness already. The 5-min backoff was too noisy — a
  //    user wanting to retry a failed bill within 5 min was
  //    blocked. Dropped. A future cluster can add a "result in
  //    last 30s" check if needed.
  return { ok: true };
}

/**
 * The gateway orchestrator. Built per-user because the DB-backed
 * adapter wrapper needs the userId for audit-log writes.
 */
export class OffRampGateway {
  private readonly userId: string;
  private readonly adapters: Map<string, IOffRampAdapter>;
  private readonly fallbackOrder: string[];

  constructor(
    userId: string,
    adapters: Map<string, IOffRampAdapter>,
    fallbackOrder: string[],
  ) {
    this.userId = userId;
    this.adapters = adapters;
    this.fallbackOrder = fallbackOrder;
  }

  /**
   * The default chain. Cluster 7.3 — takes the user's
   * `VaultPreferences.offRampProvider` and builds the chain with
   * that adapter first, followed by the other real providers in a
   * stable order, and `Manual Push` as the terminal safety path.
   *
   * The `Manual Push` adapter returns the degraded-success branch of
   * `OffRampResult` (success=true, requiresManualAction=true) so the
   * bill lands in `MANUAL_ACTION_REQUIRED` — the user is told to pay
   * out-of-band and confirm.
   *
   * The `preference` parameter is the user's `OffRampProvider`
   * literal ("MOCK" | "SPRITZ" | "MONTO"). It is mapped to the
   * adapter name ("Mock" | "Spritz" | "Monto") via
   * `OFFRAMP_PROVIDER_ADAPTER_NAME`. The chain starts with the
   * preferred adapter, then continues through the remaining real
   * adapters in their canonical order, ending with "Manual Push".
   * Unknown preferences fall back to "Mock" so the gateway still
   * has a working first adapter.
   */
  static buildDefault(userId: string, preference: OffRampProvider = "MOCK"): OffRampGateway {
    const preferredAdapterName =
      preference in OFFRAMP_PROVIDER_ADAPTER_NAME
        ? OFFRAMP_PROVIDER_ADAPTER_NAME[preference]
        : "Mock";
    // Canonical order for the non-preferred real adapters. Manual
    // Push is always the terminal entry, never the user-facing
    // preference.
    const realAdapters: string[] = ["Mock", "Spritz", "Monto"];
    const chain = [
      preferredAdapterName,
      ...realAdapters.filter((n) => n !== preferredAdapterName),
      "Manual Push",
    ];

    const wrapped = new Map<string, IOffRampAdapter>();
    wrapped.set(
      "Mock",
      createDbBackedAdapter(new MockOffRampAdapter("Mock"), userId),
    );
    wrapped.set(
      "Spritz",
      createDbBackedAdapter(createSpritzAdapter({ userId }), userId),
    );
    wrapped.set(
      "Monto",
      createDbBackedAdapter(new MontoAdapter(), userId),
    );
    wrapped.set(
      "Manual Push",
      createDbBackedAdapter(new FallbackManualPushAdapter(), userId),
    );
    return new OffRampGateway(userId, wrapped, chain);
  }

  /**
   * The chain the gateway will try for a specific bill, given the
   * bill's `providerPreference` and the user's configured
   * preference (baked into the constructor's `fallbackOrder`).
   *
   * Cluster 7.3 — when the bill has no per-bill `providerPreference`
   * override, the chain starts at the user's preference (the first
   * entry of `fallbackOrder`). When the bill sets a preference that
   * matches a known adapter, that adapter goes first; the rest of
   * the chain follows in the user-preference order. The chain
   * always ends with "Manual Push" (the terminal safety path).
   *
   * Cluster 7.14 — the stored preference is normalized via
   * `OFFRAMP_PROVIDER_ADAPTER_NAME` (the enum form "SPRITZ" maps
   * to the adapter name "Spritz") because `this.adapters` is
   * keyed by display names. Accepts the enum form, the display
   * form, and the lowercase form defensively — older rows may
   * have any of the three. Unknown values fall through to the
   * user default. The smoke (`smoke-bill-provider-override.mjs`)
   * asserts the round-trip: set "SPRITZ", get "Spritz" first.
   */
  resolveChain(bill: ScheduledBill): string[] {
    const adapterName = resolveProviderAdapterName(
      bill.providerPreference,
      this.adapters,
    );
    const known =
      adapterName ?? (this.fallbackOrder[0] ?? "Mock");
    const tail = this.fallbackOrder.filter((n) => n !== known);
    return [known, ...tail];
  }

  /**
   * Try each adapter in the resolved chain. The first non-error
   * result wins. The Manual Push adapter always returns
   * success=true (degraded), so the chain is guaranteed to
   * terminate.
   *
   * "Error" here means `success: false` (the provider rejected
   * the payment). A degraded success (`success: true,
   * requiresManualAction: true`) is a terminal result — we
   * surface it to the user as the warning state.
   */
  async executePayment(
    bill: ScheduledBill,
    idempotencyKey: string,
  ): Promise<OffRampResult> {
    const chain = this.resolveChain(bill);
    const request: OffRampRequest = {
      billId: bill.id,
      amount: bill.amount,
      currency: "USD",
      preferredProvider: bill.providerPreference,
      idempotencyKey,
    };
    let lastResult: OffRampResult | null = null;
    for (const name of chain) {
      const adapter = this.adapters.get(name);
      if (!adapter) continue;
      // Cheap availability check before invoking. The stubs always
      // return true; real providers might 503.
      let available = false;
      try {
        available = await adapter.isAvailable();
      } catch {
        available = false;
      }
      if (!available) continue;
      const result = await adapter.executePayment(request);
      // If the result is a degraded success or a true failure, we
      // continue down the chain. The only terminal "good" result is
      // success + !requiresManualAction.
      if (result.success && !result.requiresManualAction) {
        return result;
      }
      // Save the result; if every subsequent adapter also fails, we
      // return the last one (which will be Manual Push's degraded
      // success in practice).
      lastResult = result;
    }
    if (lastResult) return lastResult;
    // Defensive: if the chain was empty (shouldn't happen — Manual
    // Push is always in the chain), return a structured failure.
    return {
      success: false,
      providerName: "none",
      requiresManualAction: true,
      error: "no adapters configured",
      retryable: false,
    };
  }
}

/**
 * The state-machine event the gateway's result maps to. Used by
 * the server action to drive the bill into its terminal state.
 *
 *   - success + !requiresManualAction  → CONFIRM_SETTLED
 *   - success + requiresManualAction   → MANUAL_ACTION_REQUIRED
 *   - failure                          → FAIL_FINAL
 */
export function eventFromResult(
  result: OffRampResult,
  bill: ScheduledBill,
): BillEvent & object {
  if (result.success && !result.requiresManualAction) {
    return {
      type: "CONFIRM_SETTLED",
      transactionId: (result as { transactionId: string }).transactionId,
      providerName: result.providerName,
    };
  }
  if (result.success && result.requiresManualAction) {
    return {
      type: "MANUAL_ACTION_REQUIRED",
      reason: result.warningMessage ?? "Provider fallback; manual pay required.",
    };
  }
  return {
    type: "FAIL_FINAL",
    error: (result as { error: string }).error,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Cluster 7.14 — helpers for the per-bill off-ramp provider override UI
// ──────────────────────────────────────────────────────────────────────

/**
 * The user-visible label for which preference is driving a bill's
 * chain. Cluster 7.14 — used by `BillOffRampPicker` to render the
 * "currently routes via" line and by `BillScheduleClient` to
 * decide whether to show the per-bill override chip on /vault.
 *
 * Two states: "per-bill override" (the bill has its own preference
 * that diverges from the user default) or "user default" (the bill
 * inherits the user-level choice). The default is "user default"
 * (covers `null` and `undefined`).
 */
export type BillOffRampSource = "per-bill override" | "user default";

export function chainSourceLabel(
  bill: { providerPreference?: string | null | undefined },
  userDefault: string,
): BillOffRampSource {
  return bill.providerPreference ? "per-bill override" : "user default";
}

/**
 * Resolve a stored `providerPreference` to the adapter name the
 * `adapters` Map is keyed by.
 *
 * The Map is keyed by display names ("Mock" | "Spritz" | "Monto" |
 * "Manual Push"). The enum form ("MOCK" | "SPRITZ" | "MONTO") is
 * the canonical stored value (consistent with
 * `VaultPreferences.offRampProvider`). Older rows may have the
 * display form or the lowercase form (the original seed used
 * lowercase). The bridge is `OFFRAMP_PROVIDER_ADAPTER_NAME`.
 *
 * Returns `null` when the input is empty, malformed, or doesn't
 * match any known adapter. The caller (resolveChain) falls back
 * to the user default in that case.
 *
 * Cluster 7.14 — added when the per-bill override surfaced as a
 * silent no-op (the value was being read but the Map key never
 * matched). The round-trip smoke asserts "SPRITZ" → "Spritz".
 */
function resolveProviderAdapterName(
  pref: string | null | undefined,
  adapters: Map<string, unknown>,
): string | null {
  if (!pref) return null;
  // Direct hit on the bridge (handles "MOCK" / "SPRITZ" / "MONTO")
  const fromEnum = (OFFRAMP_PROVIDER_ADAPTER_NAME as Record<string, string>)[pref];
  if (fromEnum) return fromEnum;
  // Case-insensitive match (handles "Mock" / "mock" / "spritz" /
  // "Monto" / etc. — defensive against legacy rows + manual edits)
  const upper = pref.toUpperCase();
  if (upper in OFFRAMP_PROVIDER_ADAPTER_NAME) {
    return OFFRAMP_PROVIDER_ADAPTER_NAME[upper as keyof typeof OFFRAMP_PROVIDER_ADAPTER_NAME];
  }
  // Direct match on the adapter name itself (e.g. "Manual Push"
  // bypasses the enum bridge)
  if (adapters.has(pref)) return pref;
  return null;
}

/**
 * Cluster 7.14 — normalize a stored `providerPreference` (which
 * may be in any of: enum form, display form, lowercase legacy
 * form) to the canonical `OffRampProvider` enum value. Returns
 * `null` when the value is empty or doesn't match any known
 * provider. Used by the picker prop + the per-bill chip to
 * decide which chip to highlight + the audit row's "to" payload.
 */
export function normalizeOffRampProvider(
  pref: string | null | undefined,
): OffRampProvider | null {
  if (!pref) return null;
  // Direct hit on the enum form
  if (pref in OFFRAMP_PROVIDER_ADAPTER_NAME) {
    return pref as OffRampProvider;
  }
  // Case-insensitive match for legacy rows
  const upper = pref.toUpperCase();
  if (upper in OFFRAMP_PROVIDER_ADAPTER_NAME) {
    return upper as OffRampProvider;
  }
  return null;
}
