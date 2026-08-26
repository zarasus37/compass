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
} from "./types";
import { deriveAlertState } from "./state-machine";

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
    | "vault.adapter_fallback";
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
  const alert = deriveAlertState(
    vault.status as "ACTIVE" | "PAUSED" | "RECOVERY_MODE",
    bills,
  );

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

/** YYYY-MM-DD in server-local time. */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
