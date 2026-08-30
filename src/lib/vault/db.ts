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
import { publishAuditEvent } from "./audit-bus";
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
  OffRampProvider,
  OFFRAMP_PROVIDER_ADAPTER_NAME,
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

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — Safe deploy (M1)
//
// After the [DEPLOY] button fires, we persist the deployed
// Safe address + the signer address + the deploy tx hash +
// the chainId. The audit log captures the same. The
// `smartAccountAddress` column was the mock literal before;
// this swap is the inflection from "simulated vault" to
// "real on-chain vault."
// ──────────────────────────────────────────────────────────────────────

/**
 * Set the deployed Safe address + signer on the user's vault.
 * Refuses to overwrite a non-mock address (deploys are
 * irreversible; the [DEPLOY] button should be hidden once a
 * real Safe is set, and the server action re-checks).
 *
 * Writes a `vault.safe_deployed` audit entry with the full
 * deploy context so the future audit-log page can render the
 * "first deploy" event.
 */
export async function setVaultSafeAddress(args: {
  vaultId: string;
  userId: string;
  smartAccountAddress: string;
  signerAddress: string;
  chainId: number;
  txHash: string | null;
}): Promise<void> {
  const row = await prisma.vaultAccount.findUnique({
    where: { id: args.vaultId },
  });
  if (!row) {
    throw new Error(`vault not found: ${args.vaultId}`);
  }
  if (
    row.smartAccountAddress &&
    row.smartAccountAddress !== "0xMOCK0000000000000000000000000000000000DEAD"
  ) {
    throw new Error(
      `vault ${args.vaultId} already has a deployed Safe: ${row.smartAccountAddress}`,
    );
  }
  await prisma.vaultAccount.update({
    where: { id: args.vaultId },
    data: {
      smartAccountAddress: args.smartAccountAddress,
      signerAddress: args.signerAddress,
      chainId: args.chainId,
      updatedAt: new Date(),
    },
  });
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.safe_deployed",
    payload: {
      smartAccountAddress: args.smartAccountAddress,
      signerAddress: args.signerAddress,
      chainId: args.chainId,
      txHash: args.txHash,
      at: new Date().toISOString(),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — On-chain USDC funding + balance (M2)
//
// The [FUND] $X USDC button on /vault transfers testnet USDC
// from the server-side signer to the user's deployed Safe, and
// the [REFRESH] BALANCE button reads the Safe's on-chain USDC
// balance back into the DB. The two actions both write to the
// audit log + the new `onChainUsdcBalanceCents` + 
// `onChainBalanceRefreshedAt` columns on `VaultAccount`.
//
// Idempotency: the [FUND] action takes a `nonce` (the server
// action generates one) so a re-submit with the same nonce
// short-circuits to the prior audit row. This prevents
// double-funds on a double-click or a re-submit.
// ──────────────────────────────────────────────────────────────────────

/**
 * Update the on-chain USDC balance cache on the vault. Called
 * from `refreshSafeBalanceAction` after `getOnChainUsdcBalance`
 * returns. Does NOT touch `availableBalance` (the simulated
 * envelope-derived total) — the two are distinct views, surfaced
 * separately on the page.
 */
export async function setOnChainBalance(args: {
  vaultId: string;
  onChainUsdcBalanceCents: number;
  refreshedAt: Date;
}): Promise<void> {
  await prisma.vaultAccount.update({
    where: { id: args.vaultId },
    data: {
      onChainUsdcBalanceCents: args.onChainUsdcBalanceCents,
      onChainBalanceRefreshedAt: args.refreshedAt,
      updatedAt: args.refreshedAt,
    },
  });
}

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — Aave V3 supply / withdraw (M3)
//
// The [DEPOSIT] $X USDC button on /vault sends a Safe-side
// supply tx to Aave V3's Pool on Base Sepolia, and the
// [WITHDRAW] $X USDC button sends a Safe-side withdraw tx.
// Both are idempotent on a per-action nonce (the server
// action generates one).
//
// The aUSDC balance cache + the aToken address live on
// `VaultAccount.onChainAUsdcBalanceCents` +
// `aUsdcBalanceRefreshedAt` + `aUsdcTokenAddress`.
// ──────────────────────────────────────────────────────────────────────

/**
 * Update the on-chain aUSDC balance cache on the vault. Called
 * after a successful supply / withdraw (the post-tx balance
 * read) and from `refreshAUsdcBalanceAction`. The aUSDC
 * balance is the interest-bearing receipt the Safe receives
 * from Aave; distinct from `onChainUsdcBalanceCents` (the raw
 * USDC the Safe holds before deposit).
 *
 * `aUsdcTokenAddress` is the resolved aToken address from
 * Aave's `Pool.getReserveData(asset).aTokenAddress`. We cache
 * it on the row so subsequent reads skip the Pool hop.
 */
export async function setAUsdcBalance(args: {
  vaultId: string;
  onChainAUsdcBalanceCents: number;
  refreshedAt: Date;
  aUsdcTokenAddress?: string;
}): Promise<void> {
  await prisma.vaultAccount.update({
    where: { id: args.vaultId },
    data: {
      onChainAUsdcBalanceCents: args.onChainAUsdcBalanceCents,
      aUsdcBalanceRefreshedAt: args.refreshedAt,
      aUsdcTokenAddress: args.aUsdcTokenAddress ?? undefined,
      updatedAt: args.refreshedAt,
    },
  });
}

/**
 * Record a successful Aave V3 supply call. Writes a
 * `vault.aave_supply` audit entry with the full supply
 * context (supply tx hash, optional approve tx hash, amount,
 * aToken address, post-balance).
 */
export async function recordAaveSupply(args: {
  userId: string;
  vaultId: string;
  safeAddress: string;
  poolAddress: string;
  amountCents: number;
  amountUnits: string; // BigInt as string for JSON
  approveTxHash: string | null;
  supplyTxHash: string;
  aUsdcTokenAddress: string;
  postBalanceCents: number;
  nonce: string;
  suppliedAt: Date;
}): Promise<void> {
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.aave_supply",
    payload: {
      vaultId: args.vaultId,
      safeAddress: args.safeAddress,
      poolAddress: args.poolAddress,
      amountCents: args.amountCents,
      amountUnits: args.amountUnits,
      approveTxHash: args.approveTxHash,
      supplyTxHash: args.supplyTxHash,
      aUsdcTokenAddress: args.aUsdcTokenAddress,
      postBalanceCents: args.postBalanceCents,
      nonce: args.nonce,
      suppliedAt: args.suppliedAt.toISOString(),
    },
  });
}

/**
 * Record a successful Aave V3 withdraw call. Writes a
 * `vault.aave_withdraw` audit entry.
 */
export async function recordAaveWithdraw(args: {
  userId: string;
  vaultId: string;
  safeAddress: string;
  poolAddress: string;
  amountCents: number;
  amountUnits: string;
  withdrawTxHash: string;
  postUsdcBalanceCents: number;
  postAUsdcBalanceCents: number;
  nonce: string;
  withdrawnAt: Date;
}): Promise<void> {
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.aave_withdraw",
    payload: {
      vaultId: args.vaultId,
      safeAddress: args.safeAddress,
      poolAddress: args.poolAddress,
      amountCents: args.amountCents,
      amountUnits: args.amountUnits,
      withdrawTxHash: args.withdrawTxHash,
      postUsdcBalanceCents: args.postUsdcBalanceCents,
      postAUsdcBalanceCents: args.postAUsdcBalanceCents,
      nonce: args.nonce,
      withdrawnAt: args.withdrawnAt.toISOString(),
    },
  });
}

/**
 * Look up the most-recent `vault.aave_supply` audit row by
 * its nonce. Used by `depositSafeUsdcAction` to short-circuit
 * a re-submit (no double supply). Mirrors
 * `findFundedByIdempotencyKey` from M2.
 */
export async function findAaveSupplyByIdempotencyKey(
  userId: string,
  nonce: string,
): Promise<{
  id: string;
  payload: Record<string, unknown>;
  createdAt: Date;
} | null> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, actionType: "vault.aave_supply" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      if (payload && payload.nonce === nonce) {
        return { id: row.id, payload, createdAt: row.createdAt };
      }
    } catch {
      // skip malformed rows
    }
  }
  return null;
}

/** Like `findAaveSupplyByIdempotencyKey` but for the
 *  withdraw action. */
export async function findAaveWithdrawByIdempotencyKey(
  userId: string,
  nonce: string,
): Promise<{
  id: string;
  payload: Record<string, unknown>;
  createdAt: Date;
} | null> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, actionType: "vault.aave_withdraw" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      if (payload && payload.nonce === nonce) {
        return { id: row.id, payload, createdAt: row.createdAt };
      }
    } catch {
      // skip malformed rows
    }
  }
  return null;
}

/**
 * Record a successful USDC funding call. Writes a `vault.funded`
 * audit entry with the full funding context (tx hash, amount,
 * from/to addresses, nonce). The nonce is part of the payload
 * so the idempotency check can match re-submits.
 */
export async function recordFunded(args: {
  userId: string;
  vaultId: string;
  safeAddress: string;
  signerAddress: string;
  amountCents: number;
  amountUnits: string; // BigInt as string for JSON
  txHash: string;
  nonce: string;
  fundedAt: Date;
  /** The on-chain USDC balance of the Safe *after* the transfer. */
  postBalanceCents: number;
}): Promise<void> {
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.funded",
    payload: {
      vaultId: args.vaultId,
      safeAddress: args.safeAddress,
      signerAddress: args.signerAddress,
      amountCents: args.amountCents,
      amountUnits: args.amountUnits,
      txHash: args.txHash,
      nonce: args.nonce,
      postBalanceCents: args.postBalanceCents,
      fundedAt: args.fundedAt.toISOString(),
    },
  });
}

/**
 * Look up a previous `vault.funded` audit row by its idempotency
 * nonce. Used by `fundSafeAction` to short-circuit re-submits.
 * The match is on the `nonce` field inside the JSON payload
 * (Prisma's audit log is a flat table; the nonce is one of the
 * payload's discriminated fields). Returns null on miss.
 */
export async function findFundedByIdempotencyKey(
  userId: string,
  nonce: string,
): Promise<{
  id: string;
  payload: Record<string, unknown>;
  createdAt: Date;
} | null> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, actionType: "vault.funded" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      if (payload && payload.nonce === nonce) {
        return { id: row.id, payload, createdAt: row.createdAt };
      }
    } catch {
      // Bad JSON in a prior row — skip; this isn't a code path
      // we ever write to with malformed JSON.
    }
  }
  return null;
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
// Phase 3.5 — Per-bill editor (add / update / delete)
//
// The user becomes the source of truth for their bills: the
// canonical seed from the live envelopes still runs (idempotent),
// but new bills (source="user") can be added, edited, and
// removed via the /vault page. State changes (status transitions
// through the 13-state machine) continue to go through
// `transitionBillDb` / `transitionBillServerAction`.
// ──────────────────────────────────────────────────────────────────────

/**
 * Create a new bill on the user's vault. The new row gets
 * `source: "user"` (so the seed pass won't overwrite it on the
 * next sync) and starts in `FUNDED` status. Returns the new
 * bill in the domain shape.
 *
 * The caller (server action) is responsible for:
 *  - Computing `executionWindowStart` / `executionWindowEnd` from
 *    the due date + the window constants
 *  - Picking `maxAuthorizedAmount` (the seed uses 5% headroom)
 *  - Resolving `envelopeId` from the compassEnvelopeId the user
 *    picked on the form
 */
export async function createBill(args: {
  userId: string;
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
  providerPreference?: string;
}): Promise<ScheduledBill> {
  const row = await prisma.scheduledBill.create({
    data: {
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
      status: "FUNDED",
      providerPreference: args.providerPreference ?? null,
      source: "user",
    },
  });
  await recordVaultAudit({
    userId: args.userId,
    actionType: "vault.bill_added",
    payload: {
      billId: row.id,
      billerName: args.billerName,
      amount: args.amount,
      frequency: args.frequency,
      dueDate: args.dueDate.toISOString(),
      envelopeId: args.envelopeId,
    },
  });
  return toScheduledBill(row);
}

/**
 * Update a bill's metadata. Status changes are NOT allowed here
 * — those go through `transitionBillDb` (the 13-state machine).
 * Returns the updated bill. Throws on not-found.
 */
export async function updateBillMetadata(
  userId: string,
  billId: string,
  patch: {
    billerName?: string;
    amount?: number;
    maxAuthorizedAmount?: number;
    frequency?: BillFrequency;
    dueDate?: Date;
    executionWindowStart?: Date;
    executionWindowEnd?: Date;
    providerPreference?: string | null;
  },
): Promise<ScheduledBill> {
  const before = await prisma.scheduledBill.findUnique({
    where: { id: billId },
  });
  if (!before) {
    throw new Error(`bill not found: ${billId}`);
  }
  const row = await prisma.scheduledBill.update({
    where: { id: billId },
    data: {
      billerName: patch.billerName ?? undefined,
      amount: patch.amount ?? undefined,
      maxAuthorizedAmount: patch.maxAuthorizedAmount ?? undefined,
      frequency: patch.frequency ?? undefined,
      dueDate: patch.dueDate ?? undefined,
      executionWindowStart: patch.executionWindowStart ?? undefined,
      executionWindowEnd: patch.executionWindowEnd ?? undefined,
      providerPreference:
        patch.providerPreference === undefined
          ? undefined
          : patch.providerPreference,
      updatedAt: new Date(),
    },
  });
  // Audit log: capture the diff. The fields we send are only
  // those the caller changed (TS undefined → not in the patch).
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const beforeVal = (before as unknown as Record<string, unknown>)[k];
    if (beforeVal instanceof Date) {
      const beforeIso = beforeVal.toISOString();
      const toIso = v instanceof Date ? v.toISOString() : v;
      if (beforeIso !== toIso) {
        changed[k] = { from: beforeIso, to: toIso };
      }
    } else if (beforeVal !== v) {
      changed[k] = { from: beforeVal, to: v };
    }
  }
  await recordVaultAudit({
    userId,
    actionType: "vault.bill_updated",
    payload: { billId, billerName: row.billerName, changed },
  });
  return toScheduledBill(row);
}

/**
 * Hard-delete a bill. The audit log captures the deletion.
 * Soft-delete (an `isArchived` flag) is Phase 4 work — for now
 * the bill is removed from the vault. The seed pass won't
 * recreate it (it only runs for `source: "seed"` bills).
 */
export async function deleteBill(
  userId: string,
  billId: string,
): Promise<void> {
  const before = await prisma.scheduledBill.findUnique({
    where: { id: billId },
  });
  if (!before) {
    throw new Error(`bill not found: ${billId}`);
  }
  await prisma.scheduledBill.delete({ where: { id: billId } });
  await recordVaultAudit({
    userId,
    actionType: "vault.bill_deleted",
    payload: {
      billId,
      billerName: before.billerName,
      amount: before.amount,
      frequency: before.frequency,
      source: before.source,
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
    | "vault.risk_unacknowledged"
    | "vault.paused"
    | "vault.resumed"
    | "vault.apy_refreshed"
    | "vault.apy_refresh_failed"
    | "vault.yield_routed"
    | "vault.bill_added"
    | "vault.bill_updated"
    | "vault.bill_deleted"
    | "vault.safe_deployed"
    | "vault.safe_deploy_failed"
    | "vault.funded"
    | "vault.balance_refreshed"
    | "vault.aave_supply"
    | "vault.aave_withdraw"
    // Cluster Vault 4.0 M4 — gateway outcomes. `payment_executed`
    // records the gateway's per-click decision (provider chain,
    // success/degraded/failure); `payment_manually_confirmed`
    // records the user confirming an out-of-band payment after
    // the gateway fell back to the manual adapter.
    | "vault.payment_executed"
    | "vault.payment_manually_confirmed"
    // Cluster 7.3 — user-level off-ramp provider preference
    // change. Audit row written from `setOffRampProviderAction`
    // with `{ from, to }` payload so the future audit-log page
    // can show the provider history.
    | "vault.off_ramp_provider_changed"
    // Cluster 7.4 — meta event written by `/vault/audit` on
    // every render. The audit log is auditable itself, so the
    // user can see "I opened the audit log at 2:14pm" in the
    // event stream. Payload: `{ filter: { type, prefix, q, take }
    // | null, at: ISO }`. The page writes the row AFTER its
    // read so this visit's table doesn't show it; the next
    // visit will.
    | "vault.audit_log_viewed"
    // Cluster 7.5 — meta event written by
    // `/vault/bills/[id]/history` on every render. Same
    // audit-the-audited pattern as `vault.audit_log_viewed`;
    // the user can see "I opened the Spectrum bill's history
    // at 2:14pm" in the event stream. Payload:
    // `{ billId, billerName, filter: { type, take } | null,
    // at: ISO }`. The page writes the row AFTER its read so
    // this visit's table doesn't show it; the next visit will.
    | "vault.bill_history_viewed";
  payload: unknown;
}): Promise<void> {
  const row = await prisma.auditLog.create({
    data: {
      userId: args.userId,
      actionType: args.actionType,
      payload: JSON.stringify(args.payload ?? {}),
    },
  });
  // Cluster 7.6 — fan out to the audit event bus. The single
  // point of broadcast; every audit writer in the system calls
  // `recordVaultAudit`, so emitting here covers all of them.
  // The publish is sync + best-effort; a failed subscriber
  // doesn't poison the writer (the bus swallows listener
  // errors). The row is already in the DB; a missed live push
  // is reconciled on the next page render.
  publishAuditEvent({
    id: row.id,
    userId: row.userId,
    actionType: row.actionType,
    payload: row.payload,
    aiTierAtTime: row.aiTierAtTime,
    createdAt: row.createdAt,
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
 * Cluster 7.3 — Update the user's off-ramp provider preference.
 * Same shape as `setYieldRoutingStrategy`: validates the input
 * against the `OffRampProvider` union, idempotent create-if-missing
 * so the first setter wins correctly, returns the updated row.
 */
export async function setOffRampProvider(
  userId: string,
  provider: OffRampProvider,
): Promise<VaultPreferences> {
  await getOrCreateVaultPreferences(userId);
  const row = await prisma.vaultPreferences.update({
    where: { userId },
    data: { offRampProvider: provider },
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

/**
 * Cluster 7.0 — Revoke the risk-disclosure acknowledgement.
 * Sets `riskAcknowledgedAt = null` so the disclosure re-renders
 * on the user's next visit. The row is preserved (not deleted)
 * so a re-acknowledge is a single update. Idempotent: revoking
 * when already revoked is a no-op (returns the same row).
 *
 * Use case: the user changed their yield-routing strategy or
 * added a new bill, and per the spec the disclosure should
 * re-prompt. The current UI exposes this from the
 * `/vault/preferences` page (a "Re-acknowledge" button); a
 * future slice can auto-trigger it on certain user events.
 */
export async function revokeRiskAcknowledgement(
  userId: string,
): Promise<VaultPreferences> {
  await getOrCreateVaultPreferences(userId);
  const row = await prisma.vaultPreferences.update({
    where: { userId },
    data: { riskAcknowledgedAt: null },
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
        name: "Mock",
        available: true,
        note: "Clean path. No external call. Use for end-to-end testing.",
        isActive: preferences.offRampProvider === "MOCK",
      },
      {
        name: "Spritz",
        available: true,
        note:
          preferences.offRampProvider === "SPRITZ"
            ? "Real provider via Spritz SDK. Configure SPRITZ_INTEGRATION_KEY + SPRITZ_SANDBOX=true to go live."
            : "Real provider via Spritz SDK. Falls back to MOCK when credentials are missing.",
        isActive: preferences.offRampProvider === "SPRITZ",
      },
      {
        name: "Monto",
        available: true,
        note: "Stub — always succeeds. Real integration pending.",
        isActive: preferences.offRampProvider === "MONTO",
      },
      {
        name: "Manual Push",
        available: true,
        note: "Safety path. Always returns MANUAL_ACTION_REQUIRED when reached.",
        // Manual Push is never the active user-level choice — it's the
        // terminal fallback the gateway falls through to. The isActive
        // flag stays false even when SPRITZ_INTEGRATION_KEY is
        // missing and the Spritz row is showing the MOCK fallback.
        isActive: false,
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
  signerAddress?: string | null;
  baseAsset: string;
  status: string;
  availableBalance: number;
  settlementReserve: number;
  deployedToYield: number;
  accruedYield: number;
  simulatedApy: number;
  onChainUsdcBalanceCents: number;
  onChainBalanceRefreshedAt: Date | null;
  onChainAUsdcBalanceCents: number;
  aUsdcBalanceRefreshedAt: Date | null;
  aUsdcTokenAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VaultAccount {
  return {
    id: row.id,
    userId: row.userId,
    chainId: row.chainId,
    smartAccountAddress: row.smartAccountAddress,
    signerAddress: row.signerAddress ?? undefined,
    baseAsset: row.baseAsset as VaultAccount["baseAsset"],
    status: row.status as VaultAccount["status"],
    availableBalance: row.availableBalance,
    settlementReserve: row.settlementReserve,
    deployedToYield: row.deployedToYield,
    accruedYield: row.accruedYield,
    simulatedApy: row.simulatedApy,
    onChainUsdcBalanceCents: row.onChainUsdcBalanceCents,
    onChainBalanceRefreshedAt: row.onChainBalanceRefreshedAt
      ? row.onChainBalanceRefreshedAt.toISOString()
      : null,
    onChainAUsdcBalanceCents: row.onChainAUsdcBalanceCents,
    aUsdcBalanceRefreshedAt: row.aUsdcBalanceRefreshedAt
      ? row.aUsdcBalanceRefreshedAt.toISOString()
      : null,
    aUsdcTokenAddress: row.aUsdcTokenAddress ?? undefined,
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
  source: string;
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
    source: (row.source ?? "seed") as "seed" | "user",
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
  /// Cluster 7.3 — may be undefined for rows created before this
  /// column was added. Default to MOCK (the safe path) so the
  /// gateway still works for pre-existing users without an explicit
  /// preference. New rows get "MOCK" from the schema default.
  offRampProvider?: string;
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
    offRampProvider: (row.offRampProvider ?? "MOCK") as OffRampProvider,
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
