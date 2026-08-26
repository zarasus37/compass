/**
 * Compass Vault — typed Prisma data accessors.
 *
 * Source: `DeFi/Compass vault spec.md`. All money fields are integer
 * cents. The accessors here wrap every read/write the /vault page
 * needs and are the ONLY place that talks to the Prisma client for
 * vault entities. Server actions and the page import from here.
 *
 * Idempotency contract:
 *   - `getOrCreateVault(userId)` is safe to call concurrently —
 *     `VaultAccount.userId` is unique, so Prisma's upsert makes
 *     the read-or-create atomic.
 *   - `upsertVaultEnvelope(vaultId, compassEnvelopeId, ...)` is
 *     keyed on the unique `compassEnvelopeId`. Re-running the
 *     seed updates the same row.
 *   - `upsertScheduledBill(vaultId, billerId, ...)` is keyed on
 *     the composite unique `(vaultId, billerId)`.
 *   - `recordPaymentAttempt(...)` is keyed on the unique
 *     `(providerName, idempotencyKey)`. Re-submitting the same
 *     key returns the existing row — true adapter idempotency.
 *   - `recordYieldEvent(...)` and `recordProviderEvent(...)` are
 *     append-only. Every call writes a new row.
 *
 * Phase 2.0 scope: the seed hydrates from `liveEnvelopes()` +
 * `liveBills()`. When a future cluster flips the production
 * Bill reads, the seed's `liveBills()` call swaps in a
 * `Bill`-table read. Single-line change.
 */

import "server-only";
import { prisma } from "@/server/db";
import type {
  VaultAccount,
  VaultEnvelope,
  EnvelopeCategory,
  VaultEnvelopeStatus,
  ScheduledBill,
  BillStatus,
  BillFrequency,
  YieldEvent,
  YieldAsset,
  YieldSource,
  YieldAction,
  OffRampResult,
  OffRampAdapterStatus,
  VaultAlertState,
  VaultPreferences,
  YieldRoutingStrategy,
  BillEvent,
} from "./types";
import { deriveAlertState, transitionBill as transitionBillPure } from "./state-machine";

// ──────────────────────────────────────────────────────────────────────
// Vault
// ──────────────────────────────────────────────────────────────────────

/**
 * Get the user's vault, creating it (with sensible defaults) if it
 * doesn't exist yet. Idempotent.
 */
export async function getOrCreateVault(userId: string): Promise<VaultAccount> {
  const existing = await prisma.vaultAccount.findUnique({ where: { userId } });
  if (existing) return toVaultAccount(existing);
  const created = await prisma.vaultAccount.create({
    data: {
      userId,
      smartAccountAddress: "0xMOCK0000000000000000000000000000000000DEAD",
      baseAsset: "USDC",
      status: "ACTIVE",
      availableBalance: 0,
      settlementReserve: 0,
      deployedToYield: 0,
      accruedYield: 0,
      simulatedApy: 0.0352,
    },
  });
  return toVaultAccount(created);
}

/**
 * Refresh the vault's top-level money aggregates from its envelopes
 * + bills. Called after a seed or a yield accrual.
 */
export async function refreshVaultAggregates(vaultId: string): Promise<void> {
  const envelopes = await prisma.vaultEnvelope.findMany({
    where: { vaultId },
    include: { bills: true },
  });
  const availableBalance = envelopes.reduce(
    (s, e) => s + e.principalAllocated,
    0,
  );
  const reservedForBills = envelopes.reduce(
    (s, e) => s + e.reservedForBills,
    0,
  );
  const deployedToYield = Math.max(
    0,
    availableBalance - reservedForBills,
  );
  // Sum the per-envelope accruedYield; total accrued = sum of yields.
  const accruedYield = envelopes.reduce((s, e) => s + e.accruedYield, 0);
  await prisma.vaultAccount.update({
    where: { id: vaultId },
    data: {
      availableBalance,
      deployedToYield,
      accruedYield,
      updatedAt: new Date(),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Vault envelopes
// ──────────────────────────────────────────────────────────────────────

/**
 * Upsert a vault envelope keyed on the unique `compassEnvelopeId`.
 * Returns the row in our domain shape.
 */
export async function upsertVaultEnvelope(args: {
  vaultId: string;
  compassEnvelopeId: string;
  name: string;
  category: EnvelopeCategory;
  principalAllocated: number;
  reservedForBills: number;
  availableToReallocate: number;
  isPolicyLocked: boolean;
  nextObligationDate?: Date;
  status: VaultEnvelopeStatus;
}): Promise<VaultEnvelope> {
  const data = {
    vaultId: args.vaultId,
    compassEnvelopeId: args.compassEnvelopeId,
    name: args.name,
    category: args.category,
    principalAllocated: args.principalAllocated,
    reservedForBills: args.reservedForBills,
    availableToReallocate: args.availableToReallocate,
    isPolicyLocked: args.isPolicyLocked,
    nextObligationDate: args.nextObligationDate,
    status: args.status,
  };
  const row = await prisma.vaultEnvelope.upsert({
    where: { compassEnvelopeId: args.compassEnvelopeId },
    create: { ...data, accruedYield: 0 },
    update: { ...data, updatedAt: new Date() },
  });
  return toVaultEnvelope(row);
}

/** Update only the `accruedYield` field on a vault envelope. */
export async function setVaultEnvelopeYield(
  vaultEnvelopeId: string,
  accruedYield: number,
): Promise<void> {
  await prisma.vaultEnvelope.update({
    where: { id: vaultEnvelopeId },
    data: { accruedYield, updatedAt: new Date() },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Scheduled bills
// ──────────────────────────────────────────────────────────────────────

/**
 * Upsert a scheduled bill keyed on the composite unique
 * `(vaultId, billerId)`.
 */
export async function upsertScheduledBill(args: {
  vaultId: string;
  envelopeId: string;
  billerName: string;
  billerId: string;
  maskedAccountNumber: string;
  amount: number;
  maxAuthorizedAmount: number;
  frequency: BillFrequency;
  dueDate: Date;
  executionWindowStart: Date;
  executionWindowEnd: Date;
  status: BillStatus;
  providerPreference?: string;
}): Promise<ScheduledBill> {
  const data = {
    vaultId: args.vaultId,
    envelopeId: args.envelopeId,
    billerName: args.billerName,
    billerId: args.billerId,
    maskedAccountNumber: args.maskedAccountNumber,
    amount: args.amount,
    maxAuthorizedAmount: args.maxAuthorizedAmount,
    currency: "USD",
    frequency: args.frequency,
    dueDate: args.dueDate,
    executionWindowStart: args.executionWindowStart,
    executionWindowEnd: args.executionWindowEnd,
    status: args.status,
    providerPreference: args.providerPreference,
  };
  const row = await prisma.scheduledBill.upsert({
    where: {
      vaultId_billerId: { vaultId: args.vaultId, billerId: args.billerId },
    },
    create: data,
    update: { ...data, updatedAt: new Date() },
  });
  return toScheduledBill(row);
}

/** Update a bill's status (and any of the optional fields). */
export async function updateBillStatus(
  billId: string,
  status: BillStatus,
  extra?: {
    settlementReference?: string;
    lastAttemptAt?: Date;
  },
): Promise<void> {
  await prisma.scheduledBill.update({
    where: { id: billId },
    data: {
      status,
      settlementReference: extra?.settlementReference,
      lastAttemptAt: extra?.lastAttemptAt ?? new Date(),
      updatedAt: new Date(),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Yield events (append-only)
// ──────────────────────────────────────────────────────────────────────

export async function recordYieldEvent(args: {
  vaultId: string;
  envelopeId?: string;
  asset: YieldAsset;
  amount: number;
  annualizedRate?: number;
  source: YieldSource;
  action: YieldAction;
}): Promise<YieldEvent> {
  const row = await prisma.yieldEvent.create({
    data: {
      vaultId: args.vaultId,
      envelopeId: args.envelopeId ?? null,
      asset: args.asset,
      amount: args.amount,
      annualizedRate: args.annualizedRate ?? null,
      source: args.source,
      action: args.action,
    },
  });
  return toYieldEvent(row);
}

// ──────────────────────────────────────────────────────────────────────
// Payment attempts (idempotent on providerName + idempotencyKey)
// ──────────────────────────────────────────────────────────────────────

/**
 * Record a payment attempt. **Idempotent on (providerName,
 * idempotencyKey)** per the spec's MUST rule: re-submitting the
 * same key returns the existing row's transactionId without
 * creating a duplicate.
 *
 * If the existing row is in a different state (e.g. FAILURE was
 * retried and is now SUCCESS), this updates it. That matches the
 * "retry → same key, possibly new outcome" semantics.
 */
export async function recordPaymentAttempt(args: {
  billId: string;
  providerName: string;
  idempotencyKey: string;
  requestAmount: number;
  result: OffRampResult;
}): Promise<{
  id: string;
  wasCreated: boolean;
  result: OffRampResult;
}> {
  const branch = args.result;
  const resultColumn = branch.success
    ? branch.requiresManualAction
      ? "DEGRADED"
      : "SUCCESS"
    : "FAILURE";
  const transactionId =
    branch.success && "transactionId" in branch
      ? (branch.transactionId ?? null)
      : null;
  const warningMessage =
    branch.success && branch.requiresManualAction
      ? branch.warningMessage
      : null;
  const errorMessage = !branch.success ? branch.error : null;
  const retryable = !branch.success ? branch.retryable : false;

  // Try to find an existing row first. If found, update it
  // (preserving the id); if not, create. This is the most
  // explicit way to express the "same key, possibly new
  // outcome" semantics in a single atomic call.
  const existing = await prisma.paymentAttempt.findUnique({
    where: {
      providerName_idempotencyKey: {
        providerName: args.providerName,
        idempotencyKey: args.idempotencyKey,
      },
    },
  });
  if (existing) {
    const updated = await prisma.paymentAttempt.update({
      where: { id: existing.id },
      data: {
        result: resultColumn,
        transactionId,
        warningMessage,
        errorMessage,
        retryable,
        completedAt: new Date(),
      },
    });
    return { id: updated.id, wasCreated: false, result: args.result };
  }
  const created = await prisma.paymentAttempt.create({
    data: {
      billId: args.billId,
      providerName: args.providerName,
      idempotencyKey: args.idempotencyKey,
      requestAmount: args.requestAmount,
      result: resultColumn,
      transactionId,
      warningMessage,
      errorMessage,
      retryable,
      completedAt: new Date(),
    },
  });
  return { id: created.id, wasCreated: true, result: args.result };
}

export async function getPaymentAttempt(
  providerName: string,
  idempotencyKey: string,
) {
  return prisma.paymentAttempt.findUnique({
    where: { providerName_idempotencyKey: { providerName, idempotencyKey } },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Provider events (append-only)
// ──────────────────────────────────────────────────────────────────────

export async function recordProviderEvent(args: {
  attemptId: string;
  providerName: string;
  eventType: "REQUEST" | "RESPONSE" | "WEBHOOK" | "RETRY" | "SETTLED";
  payload: unknown;
}): Promise<void> {
  await prisma.providerEvent.create({
    data: {
      attemptId: args.attemptId,
      providerName: args.providerName,
      eventType: args.eventType,
      payload: JSON.stringify(args.payload ?? {}),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Audit log
// ──────────────────────────────────────────────────────────────────────

/**
 * Append a row to the existing AuditLog. The vault reuses the
 * project's append-only audit trail. `actionType` is a dotted
 * string (`vault.synced`, `vault.bill_state_changed`, etc.) so
 * the future audit-log page can filter on it.
 */
export async function recordVaultAudit(args: {
  userId: string;
  actionType:
    | "vault.synced"
    | "vault.bill_state_changed"
    | "vault.payment_attempted"
    | "vault.payment_settled"
    | "vault.payment_failed"
    | "vault.adapter_fallback"
    | "vault.yield_routing_changed"
    | "vault.risk_acknowledged"
    | "vault.paused"
    | "vault.resumed"
    | "vault.apy_refreshed"
    | "vault.apy_refresh_failed"
    | "vault.yield_routed";
  payload: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      actionType: args.actionType,
      payload: JSON.stringify(args.payload ?? {}),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Vault preferences (Phase 2.5)
// ──────────────────────────────────────────────────────────────────────

/**
 * Get the user's vault preferences, creating them with the
 * canonical defaults if they don't exist yet. Idempotent.
 * One row per user (`userId` is `@unique` on the schema).
 */
export async function getOrCreateVaultPreferences(
  userId: string,
): Promise<VaultPreferences> {
  const existing = await prisma.vaultPreferences.findUnique({
    where: { userId },
  });
  if (existing) return toVaultPreferences(existing);
  const created = await prisma.vaultPreferences.create({
    data: {
      userId,
      yieldRoutingStrategy: "COMPOUND",
      riskAcknowledgedAt: null,
    },
  });
  return toVaultPreferences(created);
}

/**
 * Update the user's yield-routing strategy. Validates the input
 * against the TS union — unknown strategies are rejected before
 * the write so a malformed form payload can't poison the column.
 */
export async function setYieldRoutingStrategy(
  userId: string,
  strategy: YieldRoutingStrategy,
): Promise<VaultPreferences> {
  // Idempotent create-if-missing so the first setter wins correctly.
  await getOrCreateVaultPreferences(userId);
  const row = await prisma.vaultPreferences.update({
    where: { userId },
    data: { yieldRoutingStrategy: strategy },
  });
  return toVaultPreferences(row);
}

/**
 * Mark the risk disclosure as acknowledged. Sets
 * `riskAcknowledgedAt = now()`. Idempotent: re-acknowledging just
 * bumps the timestamp (a future slice can re-prompt on certain
 * triggers; that's not in Phase 2.5).
 */
export async function acknowledgeRisk(
  userId: string,
): Promise<VaultPreferences> {
  await getOrCreateVaultPreferences(userId);
  const row = await prisma.vaultPreferences.update({
    where: { userId },
    data: { riskAcknowledgedAt: new Date() },
  });
  return toVaultPreferences(row);
}

// ──────────────────────────────────────────────────────────────────────
// Vault status (Phase 2.5 — pause / resume)
// ──────────────────────────────────────────────────────────────────────

/**
 * Set the vault's account-level status. The legal transitions
 * follow the spec: ACTIVE ⇄ PAUSED; ACTIVE → RECOVERY_MODE is
 * reserved for the off-ramp gateway when every adapter fell back
 * to MANUAL_ACTION_REQUIRED (Phase 3 work).
 */
export async function setVaultAccountStatus(
  userId: string,
  status: "ACTIVE" | "PAUSED" | "RECOVERY_MODE",
): Promise<VaultAccount> {
  await getOrCreateVault(userId);
  const row = await prisma.vaultAccount.update({
    where: { userId },
    data: { status, updatedAt: new Date() },
  });
  return toVaultAccount(row);
}

// ──────────────────────────────────────────────────────────────────────
// Bill state transitions (Phase 2.5 — interactive state machine)
// ──────────────────────────────────────────────────────────────────────

/**
 * The set of bill events that the user can drive from the UI.
 * The other events (FUND, ENTER_EARN) are keeper-driven in
 * production; they're still in the transition table for the
 * state machine's tests but are not exposed as user actions.
 */
export const USER_FACING_BILL_EVENTS = [
  "BEGIN_SETTLEMENT",
  "EXECUTE",
  "CONFIRM_SETTLED",
  "INSUFFICIENT_FUNDS",
  "PAUSE",
  "RESUME",
  "REQUIRES_REVIEW",
  "MANUAL_ACTION_REQUIRED",
  "RETRY",
  "FAIL_FINAL",
  "CANCEL",
] as const;

export type UserFacingBillEvent = (typeof USER_FACING_BILL_EVENTS)[number];

/**
 * Apply a bill state transition: pure state-machine call +
 * persist the result + audit log. Returns the updated bill in
 * the domain shape, or a structured error on an illegal
 * transition.
 *
 * `eventArgs` carries the per-event payload (e.g. CONFIRM_SETTLED
 * needs `transactionId` + `providerName`). For events that don't
 * take a payload, callers pass an empty object.
 *
 * The audit-log `actionType` is `vault.bill_state_changed` with
 * the from/to/event captured in the payload.
 */
export async function transitionBillDb(
  userId: string,
  billId: string,
  event: BillEvent,
): Promise<
  | { ok: true; bill: ScheduledBill }
  | { ok: false; error: string; from: BillStatus; event: BillEvent["type"] }
> {
  const row = await prisma.scheduledBill.findUnique({ where: { id: billId } });
  if (!row) {
    return {
      ok: false,
      error: `bill not found: ${billId}`,
      from: "DRAFT",
      event: event.type,
    };
  }
  const bill = toScheduledBill(row);
  const result = transitionBillPure(bill, event);
  if (!result.ok) return result;

  // Persist the new state. The pure function's output carries any
  // updated fields (settlementReference, lastAttemptAt, updatedAt)
  // — we apply them all in one write.
  const updated = await prisma.scheduledBill.update({
    where: { id: billId },
    data: {
      status: result.bill.status,
      settlementReference: result.bill.settlementReference ?? null,
      lastAttemptAt: result.bill.lastAttemptAt
        ? new Date(result.bill.lastAttemptAt)
        : null,
      updatedAt: new Date(),
    },
  });

  // Audit log. One entry per transition; the from/to/event
  // captured for replay.
  await recordVaultAudit({
    userId,
    actionType: "vault.bill_state_changed",
    payload: {
      billId,
      billerName: row.billerName,
      from: bill.status,
      to: result.bill.status,
      event: event.type,
    },
  });

  return { ok: true, bill: toScheduledBill(updated) };
}

// ──────────────────────────────────────────────────────────────────────
// Yield routing (Phase 3.1) — dispatch the accrued yield per
// the user's `VaultPreferences.yieldRoutingStrategy`. Called
// from `refreshVaultApyAction` after the adapter returns; the
// strategies' effects are persisted via `YieldEvent` rows +
// `Bill.appliedYieldCents` (for APPLY_TO_NEXT_BILL) and an
// `availableBalance` increment (for MOVE_TO_AVAILABLE).
//
// Per the spec ("Principal reserved for bills is never reduced
// by a yield-routing choice"): all 4 strategies preserve the
// envelope `principalAllocated`. The strategies differ in
// where the yield *credit* lands, not in how the principal is
// drawn.
// ──────────────────────────────────────────────────────────────────────

/**
 * Find the next bill in (or approaching) its execution window.
 * Used by `APPLY_TO_NEXT_BILL` to know which bill to credit.
 * Prefers bills in EARNING / FUNDED / PREPARING_SETTLEMENT
 * status; falls back to EXECUTING if no other candidates.
 * Returns null if the vault has no actionable bills.
 */
export async function getNextExecutableBill(
  vaultId: string,
): Promise<ScheduledBill | null> {
  const candidates = await prisma.scheduledBill.findMany({
    where: {
      vaultId,
      status: {
        in: ["EARNING", "FUNDED", "PREPARING_SETTLEMENT", "EXECUTING"],
      },
    },
    orderBy: { executionWindowStart: "asc" },
  });
  if (candidates.length === 0) return null;
  // Prefer the earliest non-EXECUTING bill; fall back to the
  // first EXECUTING bill if no others qualify.
  const nonExecuting = candidates.find((b) => b.status !== "EXECUTING");
  const target = nonExecuting ?? candidates[0];
  if (!target) return null;
  return toScheduledBill(target);
}

/**
 * The yield-routing result. Per-bill + per-envelope + vault-level
 * movements are summarized so the caller (server action + tests)
 * can audit-log the work in a single batched write.
 */
export interface YieldRoutingResult {
  strategy: YieldRoutingStrategy;
  /** Total accrued yield that was available to route (cents). */
  totalRouted: number;
  /** Counts of each YieldEvent action written. */
  counts: {
    compounded: number;
    allocatedToBill: number;
    movedToAvailable: number;
  };
  /** Bill IDs that received an `appliedYieldCents` increment. */
  billsCredited: string[];
  /** Whether the vault's `availableBalance` was incremented. */
  vaultBalanceBumped: boolean;
}

/**
 * Dispatch the accrued yield per the user's strategy. Idempotent
 * in the sense that re-running with the same inputs produces the
 * same YieldEvent + appliedYieldCents totals (the audit log will
 * have duplicate entries, which is acceptable for a manual cron).
 *
 * `totalAccruedCents` is the total yield that needs to be routed
 * — typically the per-envelope attribution sum from the seed
 * pass that just ran. The dispatcher splits this amount across
 * envelopes (for COMPOUND / SPLIT_BY_ENVELOPE) or a single bill
 * (for APPLY_TO_NEXT_BILL) or the vault balance (for
 * MOVE_TO_AVAILABLE).
 */
export async function routeYieldForStrategy(args: {
  vaultId: string;
  userId: string;
  strategy: YieldRoutingStrategy;
  totalAccruedCents: number;
  adapterName: string;
  adapterSource: YieldSource;
}): Promise<YieldRoutingResult> {
  const { vaultId, userId, strategy, totalAccruedCents, adapterName, adapterSource } = args;
  const result: YieldRoutingResult = {
    strategy,
    totalRouted: 0,
    counts: { compounded: 0, allocatedToBill: 0, movedToAvailable: 0 },
    billsCredited: [],
    vaultBalanceBumped: false,
  };
  if (totalAccruedCents <= 0) return result;

  switch (strategy) {
    case "COMPOUND": {
      // Re-invest the yield back into the strategy. Per-envelope
      // attribution is already done by the seed; the COMPOUNDED
      // event row records the action without changing any money
      // totals.
      const envelopes = await prisma.vaultEnvelope.findMany({
        where: { vaultId },
      });
      const totalPrincipal = envelopes.reduce(
        (s, e) => s + e.principalAllocated,
        0,
      );
      if (totalPrincipal <= 0) break;
      for (const e of envelopes) {
        if (e.principalAllocated <= 0) continue;
        const share = Math.round(
          (e.principalAllocated / totalPrincipal) * totalAccruedCents,
        );
        if (share <= 0) continue;
        await recordYieldEvent({
          vaultId,
          envelopeId: e.id,
          asset: "sUSDS",
          amount: share,
          annualizedRate: undefined,
          source: adapterSource,
          action: "COMPOUNDED",
        });
        result.counts.compounded += 1;
        result.totalRouted += share;
      }
      break;
    }
    case "APPLY_TO_NEXT_BILL": {
      // Find the next bill in (or approaching) its execution
      // window. Credit the entire accrued yield to that bill;
      // the bill's effective out-of-pocket cost at settlement is
      // `amount - appliedYieldCents`.
      const nextBill = await getNextExecutableBill(vaultId);
      if (!nextBill) break;
      // Cap the credit at the bill's amount (don't credit more
      // than the bill needs; leftover is logged as COMPOUNDED
      // instead).
      const credit = Math.min(totalAccruedCents, nextBill.amount);
      if (credit <= 0) break;
      const leftover = totalAccruedCents - credit;
      const updated = await prisma.scheduledBill.update({
        where: { id: nextBill.id },
        data: { appliedYieldCents: { increment: credit } },
      });
      await recordYieldEvent({
        vaultId,
        envelopeId: nextBill.envelopeId,
        asset: "sUSDS",
        amount: credit,
        annualizedRate: undefined,
        source: adapterSource,
        action: "ALLOCATED_TO_BILL",
      });
      result.counts.allocatedToBill += 1;
      result.billsCredited.push(nextBill.id);
      result.totalRouted += credit;
      if (leftover > 0) {
        // Any yield that didn't fit the bill gets compounded.
        await recordYieldEvent({
          vaultId,
          envelopeId: undefined,
          asset: "sUSDS",
          amount: leftover,
          annualizedRate: undefined,
          source: adapterSource,
          action: "COMPOUNDED",
        });
        result.counts.compounded += 1;
        result.totalRouted += leftover;
      }
      void updated;
      break;
    }
    case "MOVE_TO_AVAILABLE": {
      // Move the yield into the vault's available balance
      // (immediately redeemable). The off-ramp gateway can draw
      // from this pool without touching the principal.
      const vault = await prisma.vaultAccount.findUnique({
        where: { id: vaultId },
      });
      if (!vault) break;
      await prisma.vaultAccount.update({
        where: { id: vaultId },
        data: { availableBalance: { increment: totalAccruedCents } },
      });
      await recordYieldEvent({
        vaultId,
        envelopeId: undefined,
        asset: "sUSDS",
        amount: totalAccruedCents,
        annualizedRate: undefined,
        source: adapterSource,
        action: "MOVED_TO_AVAILABLE",
      });
      result.counts.movedToAvailable += 1;
      result.vaultBalanceBumped = true;
      result.totalRouted = totalAccruedCents;
      break;
    }
    case "SPLIT_BY_ENVELOPE": {
      // Same as COMPOUND (per-envelope attribution IS by capital
      // share) but the action recorded is MOVED_TO_AVAILABLE per
      // envelope — the yield becomes immediately available on
      // each envelope, rather than staying in the strategy.
      const envelopes = await prisma.vaultEnvelope.findMany({
        where: { vaultId },
      });
      const totalPrincipal = envelopes.reduce(
        (s, e) => s + e.principalAllocated,
        0,
      );
      if (totalPrincipal <= 0) break;
      for (const e of envelopes) {
        if (e.principalAllocated <= 0) continue;
        const share = Math.round(
          (e.principalAllocated / totalPrincipal) * totalAccruedCents,
        );
        if (share <= 0) continue;
        await recordYieldEvent({
          vaultId,
          envelopeId: e.id,
          asset: "sUSDS",
          amount: share,
          annualizedRate: undefined,
          source: adapterSource,
          action: "MOVED_TO_AVAILABLE",
        });
        // Also bump the vault's available balance by the same
        // amount so the value is reflected in the top-level KPI.
        await prisma.vaultAccount.update({
          where: { id: vaultId },
          data: { availableBalance: { increment: share } },
        });
        result.counts.movedToAvailable += 1;
        result.totalRouted += share;
      }
      result.vaultBalanceBumped = true;
      break;
    }
    default:
      break;
  }

  // Audit-log the routing summary.
  await recordVaultAudit({
    userId,
    actionType: "vault.yield_routed",
    payload: {
      strategy,
      adapter: adapterName,
      source: adapterSource,
      totalRouted: result.totalRouted,
      counts: result.counts,
      billsCredited: result.billsCredited,
    },
  });
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Full snapshot
// ──────────────────────────────────────────────────────────────────────

/**
 * Load the full vault snapshot for the /vault page. Returns null
 * if the user has no vault yet (the page shows the empty state
 * and a sync button).
 */
export interface VaultDbSnapshot {
  vault: VaultAccount;
  envelopes: VaultEnvelope[];
  bills: ScheduledBill[];
  yieldEvents: YieldEvent[];
  alert: VaultAlertState;
  preferences: VaultPreferences;
  /**
   * Phase 3.0 — The active yield adapter's display info, for
   * the [SYNC] REFRESH button on the page. `name` is the adapter
   * ("Mock" / "Sky" / "Aave"); `lastRefreshedAt` is the ISO
   * timestamp of the most recent `vault.apy_refreshed` audit
   * entry, or null if the user has never clicked refresh.
   */
  yieldAdapter: {
    name: string;
    source: YieldSource;
    lastRefreshedAt: string | null;
  };
  totals: {
    billsCovered: number;
    billsScheduledCount: number;
    billsNeedsActionCount: number;
    yieldEarned: number;
    nextExecution: ScheduledBill | null;
    liquidBuffer: number;
    attributedYield: number;
    reconciledResidual: number;
  };
  offRampAdapters: OffRampAdapterStatus[];
}

export async function loadVaultSnapshot(
  userId: string,
): Promise<VaultDbSnapshot | null> {
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId },
    include: {
      envelopes: {
        include: { bills: true },
      },
      bills: true,
      yieldEvents: {
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!vault) return null;

  const envelopes = vault.envelopes.map(toVaultEnvelope);
  const bills = vault.bills.map(toScheduledBill);
  const yieldEvents = vault.yieldEvents.map(toYieldEvent);
  const preferences = await getOrCreateVaultPreferences(userId);
  const alert = deriveAlertState(
    vault.status as "ACTIVE" | "PAUSED" | "RECOVERY_MODE",
    bills,
  );
  // Phase 3.0 — the most recent `vault.apy_refreshed` audit
  // entry drives the "refreshed at HH:MM:SS" label on the
  // [SYNC] REFRESH button. The adapter name + source come from
  // the server-side `getActiveYieldAdapter()` (the client never
  // sees the env var directly).
  const { getActiveYieldAdapter } = await import("./yield-adapters");
  const activeAdapter = getActiveYieldAdapter();
  const lastRefreshAudit = await prisma.auditLog.findFirst({
    where: { userId, actionType: "vault.apy_refreshed" },
    orderBy: { createdAt: "desc" },
  });
  const lastRefreshedAt = lastRefreshAudit
    ? (() => {
        try {
          const payload = JSON.parse(lastRefreshAudit.payload);
          return typeof payload?.refreshedAt === "string"
            ? payload.refreshedAt
            : lastRefreshAudit.createdAt.toISOString();
        } catch {
          return lastRefreshAudit.createdAt.toISOString();
        }
      })()
    : null;

  const billsCovered = bills.reduce((s, b) => s + b.amount, 0);
  const billsScheduledCount = bills.filter((b) =>
    ["EARNING", "FUNDED", "PREPARING_SETTLEMENT", "EXECUTING"].includes(
      b.status,
    ),
  ).length;
  const billsNeedsActionCount = bills.filter((b) =>
    [
      "INSUFFICIENT_FUNDS",
      "MANUAL_ACTION_REQUIRED",
      "FAILED_RETRYABLE",
      "FAILED_FINAL",
      "REQUIRES_REVIEW",
      "PAUSED",
    ].includes(b.status),
  ).length;
  const sortedNonSettled = bills
    .filter((b) => b.status !== "SETTLED" && b.status !== "CANCELLED")
    .sort(
      (a, b) =>
        new Date(a.executionWindowStart).getTime() -
        new Date(b.executionWindowStart).getTime(),
    );
  const nextExecution = sortedNonSettled[0] ?? null;
  const totalReserved = envelopes.reduce(
    (s, e) => s + e.reservedForBills,
    0,
  );
  const liquidBuffer = Math.max(0, vault.deployedToYield - totalReserved);
  const attributedYield = envelopes.reduce((s, e) => s + e.accruedYield, 0);
  const reconciledResidual = vault.accruedYield - attributedYield;

  return {
    vault: toVaultAccount(vault),
    envelopes,
    bills,
    yieldEvents,
    alert,
    preferences,
    yieldAdapter: {
      name: activeAdapter.name,
      source: activeAdapter.source,
      lastRefreshedAt,
    },
    totals: {
      billsCovered,
      billsScheduledCount,
      billsNeedsActionCount,
      yieldEarned: vault.accruedYield,
      nextExecution,
      liquidBuffer,
      attributedYield,
      reconciledResidual,
    },
    offRampAdapters: [
      {
        name: "Spritz",
        available: true,
        note: "Mock DB-backed (Phase 2) — always succeeds",
      },
      {
        name: "Monto",
        available: true,
        note: "Mock DB-backed (Phase 2) — always succeeds",
      },
      {
        name: "Manual Push",
        available: true,
        note: "Fallback DB-backed (Phase 2) — MANUAL_ACTION_REQUIRED",
      },
    ],
  };
}

/**
 * True if the user has any vault data. Used to decide whether to
 * show the empty state or the populated state on the /vault page.
 */
export async function userHasVaultData(userId: string): Promise<boolean> {
  const count = await prisma.vaultAccount.count({ where: { userId } });
  return count > 0;
}

// ──────────────────────────────────────────────────────────────────────
// Mappers — Prisma row → domain type. The Prisma row uses `String`
// for status / category / etc.; the domain types use TS unions.
// Keep these in sync with the schema's comments.
// ──────────────────────────────────────────────────────────────────────

function toVaultAccount(row: {
  id: string;
  userId: string;
  chainId: number;
  smartAccountAddress: string;
  baseAsset: string;
  status: string;
  availableBalance: number;
  settlementReserve: number;
  deployedToYield: number;
  accruedYield: number;
  simulatedApy: number;
  createdAt: Date;
  updatedAt: Date;
}): VaultAccount {
  return {
    id: row.id,
    userId: row.userId,
    chainId: row.chainId,
    smartAccountAddress: row.smartAccountAddress,
    baseAsset: row.baseAsset as VaultAccount["baseAsset"],
    status: row.status as VaultAccount["status"],
    availableBalance: row.availableBalance,
    settlementReserve: row.settlementReserve,
    deployedToYield: row.deployedToYield,
    accruedYield: row.accruedYield,
    simulatedApy: row.simulatedApy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toVaultEnvelope(row: {
  id: string;
  vaultId: string;
  compassEnvelopeId: string;
  name: string;
  category: string;
  principalAllocated: number;
  accruedYield: number;
  reservedForBills: number;
  availableToReallocate: number;
  isPolicyLocked: boolean;
  nextObligationDate: Date | null;
  status: string;
}): VaultEnvelope {
  return {
    id: row.id,
    vaultId: row.vaultId,
    compassEnvelopeId: row.compassEnvelopeId,
    name: row.name,
    category: row.category as EnvelopeCategory,
    principalAllocated: row.principalAllocated,
    accruedYield: row.accruedYield,
    reservedForBills: row.reservedForBills,
    availableToReallocate: row.availableToReallocate,
    isPolicyLocked: row.isPolicyLocked,
    nextObligationDate: row.nextObligationDate
      ? row.nextObligationDate.toISOString()
      : undefined,
    status: row.status as VaultEnvelopeStatus,
  };
}

function toScheduledBill(row: {
  id: string;
  vaultId: string;
  envelopeId: string;
  billerName: string;
  billerId: string;
  maskedAccountNumber: string;
  amount: number;
  maxAuthorizedAmount: number;
  currency: string;
  frequency: string;
  dueDate: Date;
  executionWindowStart: Date;
  executionWindowEnd: Date;
  status: string;
  providerPreference: string | null;
  lastAttemptAt: Date | null;
  settlementReference: string | null;
  appliedYieldCents: number;
  createdAt: Date;
  updatedAt: Date;
}): ScheduledBill {
  return {
    id: row.id,
    vaultId: row.vaultId,
    envelopeId: row.envelopeId,
    billerName: row.billerName,
    billerId: row.billerId,
    maskedAccountNumber: row.maskedAccountNumber,
    amount: row.amount,
    maxAuthorizedAmount: row.maxAuthorizedAmount,
    currency: row.currency as "USD",
    frequency: row.frequency as BillFrequency,
    dueDate: toLocalISODate(row.dueDate),
    executionWindowStart: row.executionWindowStart.toISOString(),
    executionWindowEnd: row.executionWindowEnd.toISOString(),
    status: row.status as BillStatus,
    providerPreference: row.providerPreference ?? undefined,
    lastAttemptAt: row.lastAttemptAt
      ? row.lastAttemptAt.toISOString()
      : undefined,
    settlementReference: row.settlementReference ?? undefined,
    appliedYieldCents: row.appliedYieldCents ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toYieldEvent(row: {
  id: string;
  vaultId: string;
  envelopeId: string | null;
  asset: string;
  amount: number;
  annualizedRate: number | null;
  source: string;
  action: string;
  occurredAt: Date;
}): YieldEvent {
  return {
    id: row.id,
    vaultId: row.vaultId,
    envelopeId: row.envelopeId ?? undefined,
    asset: row.asset as YieldAsset,
    amount: row.amount,
    annualizedRate: row.annualizedRate ?? undefined,
    source: row.source as YieldSource,
    action: row.action as YieldAction,
    occurredAt: row.occurredAt.toISOString(),
  };
}

function toVaultPreferences(row: {
  id: string;
  userId: string;
  yieldRoutingStrategy: string;
  riskAcknowledgedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): VaultPreferences {
  return {
    id: row.id,
    userId: row.userId,
    yieldRoutingStrategy: row.yieldRoutingStrategy as YieldRoutingStrategy,
    riskAcknowledgedAt: row.riskAcknowledgedAt
      ? row.riskAcknowledgedAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** YYYY-MM-DD in server-local time. */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
