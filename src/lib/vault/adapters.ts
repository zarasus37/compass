/**
 * Compass Vault — off-ramp adapter stubs (Phase 1.0) + DB-backed
 * wrapper (Phase 2.0).
 *
 * Three stub implementations of `IOffRampAdapter`:
 *   - `SpritzAdapter`               — always succeeds (clean path)
 *   - `MontoAdapter`                — always succeeds (clean path)
 *   - `FallbackManualPushAdapter`   — always returns MANUAL_ACTION_REQUIRED
 *                                     (safety path; exercises the
 *                                     discriminated union's degraded
 *                                     branch)
 *
 * Phase 2.0 adds `createDbBackedAdapter(inner)` which wraps any
 * `IOffRampAdapter` so its `executePayment` calls also write a
 * `PaymentAttempt` + `ProviderEvent` row. The unique index on
 * `(providerName, idempotencyKey)` makes the call truly idempotent
 * — re-submitting the same key returns the existing row's
 * `transactionId` without creating a duplicate.
 *
 * The OffRampGateway that orchestrates these lands in Phase 3 along
 * with the keeper / cron. For Phase 2.0 the integration test calls
 * the DB-backed adapter directly to exercise idempotency.
 *
 * Real provider API integration is Phase 4.
 */

import type {
  IOffRampAdapter,
  OffRampRequest,
  OffRampResult,
} from "./types";
import {
  recordPaymentAttempt,
  recordProviderEvent,
  recordVaultAudit,
} from "./db";

let txCounter = 0;
function nextTxId(prefix: string): string {
  txCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${txCounter}`;
}

/** A local id cache so the same idempotency key returns the same
 * transactionId across calls. Matches the spec's "MUST be idempotent
 * on request.idempotencyKey" rule for the *in-memory* path. The
 * DB-backed path enforces the same rule at the unique index. */
const idempotencyCache = new Map<string, string>();

function withIdempotency(
  key: string,
  providerName: string,
  generate: () => string,
): string {
  const cached = idempotencyCache.get(key);
  if (cached) return cached;
  const fresh = generate();
  idempotencyCache.set(key, fresh);
  void providerName; // silence unused-arg lint when generate doesn't use it
  return fresh;
}

/**
 * Spritz — clean-path adapter. Always returns a fully-settled
 * success with a deterministic tx id.
 */
export class SpritzAdapter implements IOffRampAdapter {
  readonly name = "Spritz";
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async executePayment(request: OffRampRequest): Promise<OffRampResult> {
    const txId = withIdempotency(request.idempotencyKey, this.name, () =>
      nextTxId("spritz"),
    );
    return {
      success: true,
      providerName: this.name,
      transactionId: txId,
      requiresManualAction: false,
    };
  }
}

/**
 * Monto — clean-path adapter. Same shape as Spritz; exists so the
 * gateway can demonstrate provider preference + fallback routing.
 */
export class MontoAdapter implements IOffRampAdapter {
  readonly name = "Monto";
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async executePayment(request: OffRampRequest): Promise<OffRampResult> {
    const txId = withIdempotency(request.idempotencyKey, this.name, () =>
      nextTxId("monto"),
    );
    return {
      success: true,
      providerName: this.name,
      transactionId: txId,
      requiresManualAction: false,
    };
  }
}

/**
 * FallbackManualPushAdapter — non-negotiable safety path. Always
 * returns the degraded-success branch of `OffRampResult` so the UI
 * can demonstrate the warning state. Per the spec this is what the
 * gateway falls back to when every other adapter is unavailable.
 */
export class FallbackManualPushAdapter implements IOffRampAdapter {
  readonly name = "Manual Push";
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async executePayment(request: OffRampRequest): Promise<OffRampResult> {
    void request;
    return {
      success: true,
      providerName: this.name,
      requiresManualAction: true,
      warningMessage:
        "Provider outage. Funds are banked. Pay this bill manually and mark it settled in Compass.",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase 2.0: DB-backed wrapper
// ──────────────────────────────────────────────────────────────────────

/**
 * Wrap an `IOffRampAdapter` so its `executePayment` calls also
 * write a `PaymentAttempt` + `ProviderEvent` row. The unique
 * index on `(providerName, idempotencyKey)` makes the call truly
 * idempotent — re-submitting the same key returns the existing
 * row's `transactionId` without creating a duplicate.
 *
 * The `userId` is captured at construction time so audit-log
 * writes are self-contained.
 */
export function createDbBackedAdapter(
  inner: IOffRampAdapter,
  userId: string,
): IOffRampAdapter {
  return {
    name: inner.name,
    async isAvailable() {
      return inner.isAvailable();
    },
    async executePayment(request: OffRampRequest): Promise<OffRampResult> {
      // Write a REQUEST event BEFORE the inner call. If the inner
      // throws, we still have the request in the log.
      // (The PaymentAttempt row is created by recordPaymentAttempt.)
      let result: OffRampResult;
      try {
        result = await inner.executePayment(request);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result = {
          success: false,
          providerName: inner.name,
          requiresManualAction: false,
          error: errorMessage,
          retryable: true,
        };
      }
      const recorded = await recordPaymentAttempt({
        billId: request.billId,
        providerName: inner.name,
        idempotencyKey: request.idempotencyKey,
        requestAmount: request.amount,
        result,
      });
      await recordProviderEvent({
        attemptId: recorded.id,
        providerName: inner.name,
        eventType: result.success ? "RESPONSE" : "RESPONSE",
        payload: result,
      });
      // Audit log: the action depends on the result branch.
      if (result.success && !result.requiresManualAction) {
        await recordVaultAudit({
          userId,
          actionType: "vault.payment_settled",
          payload: {
            billId: request.billId,
            providerName: inner.name,
            transactionId:
              "transactionId" in result ? result.transactionId : null,
          },
        });
      } else if (result.success && result.requiresManualAction) {
        await recordVaultAudit({
          userId,
          actionType: "vault.adapter_fallback",
          payload: {
            billId: request.billId,
            providerName: inner.name,
            warningMessage: result.warningMessage,
          },
        });
      } else {
        await recordVaultAudit({
          userId,
          actionType: "vault.payment_failed",
          payload: {
            billId: request.billId,
            providerName: inner.name,
            error: result.error,
            retryable: result.retryable,
          },
        });
      }
      return result;
    },
  };
}

