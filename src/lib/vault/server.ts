/**
 * Compass Vault — server-side helpers.
 *
 * The thin layer that server actions and server components call
 * when they need to interact with the vault. Internally these
 * wrap the `db.ts` accessors and add:
 *   - User resolution (read the current user from the session)
 *   - Audit log writes for every meaningful action
 *   - Default empty-state behavior
 *
 * The page component imports from here, not from `db.ts` directly.
 */

import "server-only";
import { revalidatePath } from "next/cache";
import { getAddress, type Address } from "viem";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/user";
import {
  loadVaultSnapshot,
  getOrCreateVault,
  getOrCreateVaultPreferences,
  setYieldRoutingStrategy,
  acknowledgeRisk,
  revokeRiskAcknowledgement,
  setVaultAccountStatus,
  transitionBillDb,
  recordVaultAudit,
  userHasVaultData,
  refreshVaultAggregates,
  routeYieldForStrategy,
  createBill,
  updateBillMetadata,
  deleteBill,
  setVaultSafeAddress,
  setOnChainBalance,
  setAUsdcBalance,
  recordFunded,
  findFundedByIdempotencyKey,
  recordAaveSupply,
  recordAaveWithdraw,
  findAaveSupplyByIdempotencyKey,
  findAaveWithdrawByIdempotencyKey,
  USER_FACING_BILL_EVENTS,
  type VaultDbSnapshot,
  type UserFacingBillEvent,
} from "./db";
import { seedVaultFromEnvelopes, type SeedResult } from "./seed";
import { deriveMockVault } from "./mock-data";
import { legalNextStates } from "./state-machine";
import { getActiveYieldAdapter } from "./yield-adapters";
import {
  deploySafe as deploySafeLib,
  isMockSafeAddress,
  MOCK_SAFE_ADDRESS,
} from "./safe-deploy";
import {
  fundSafeWithUsdc,
  getOnChainUsdcBalance,
  centsFromUsdcUnits,
  fundingIdempotencyKey,
} from "./funding";
import {
  supplySafeUsdc,
  withdrawSafeUsdc,
  getAUsdcBalance,
  getAaveUsdcBalance,
  getAUsdcTokenAddress,
} from "./aave";
import {
  OffRampGateway,
  canExecute as canExecuteGate,
  eventFromResult,
} from "./gateway";
import type { VaultSnapshot } from "./mock-data";
import type {
  BillEvent,
  ScheduledBill,
  VaultAccount,
  YieldRoutingStrategy,
} from "./types";

/**
 * Load the vault snapshot for the current user. Returns the DB
 * snapshot if the user has synced their vault. Returns null
 * (empty state) when the user has no vault data — the page
 * shows the empty state with a "Sync vault from envelopes" button.
 *
 * Note: there is NO in-memory fallback in this path. The in-memory
 * `deriveMockVault` is a dev-time convenience for the lib's
 * internal tests; the user-facing page should always reflect the
 * persisted state, even when that state is empty.
 */
export async function loadCurrentVaultSnapshot(): Promise<{
  snapshot: VaultSnapshot | null;
  source: "db" | "empty";
}> {
  const user = await requireUser();
  const dbSnap = await loadVaultSnapshot(user.id);
  if (!dbSnap) {
    return { snapshot: null, source: "empty" };
  }
  return {
    snapshot: projectDbToLegacy(dbSnap),
    source: "db",
  };
}

function hasAnyData(snap: VaultSnapshot): boolean {
  return (
    snap.envelopes.length > 0 ||
    snap.bills.length > 0 ||
    snap.vault.availableBalance > 0
  );
}

/**
 * Project the DB snapshot into the Phase 1 `VaultSnapshot` shape.
 * Same field names, same kpi block, same billsByLabel grouping.
 * The `offRampAdapters` panel comes from the DB snapshot's
 * metadata, but the entries are static for Phase 2.
 */
function projectDbToLegacy(db: VaultDbSnapshot): VaultSnapshot {
  // Group bills by user label.
  const billsByLabel: Record<string, typeof db.bills> = {};
  for (const b of db.bills) {
    const label = labelForStatus(b.status);
    (billsByLabel[label] ||= []).push(b);
  }
  return {
    vault: db.vault,
    envelopes: db.envelopes,
    bills: db.bills,
    yieldEvents: db.yieldEvents,
    offRampAdapters: db.offRampAdapters,
    alert: db.alert,
    totalAttributedYield: db.totals.attributedYield,
    billsByLabel,
    preferences: db.preferences,
    yieldAdapter: db.yieldAdapter,
    kpis: {
      vaultPrincipal: db.vault.availableBalance,
      billsCovered: db.totals.billsCovered,
      billsScheduledCount: db.totals.billsScheduledCount,
      billsNeedsActionCount: db.totals.billsNeedsActionCount,
      yieldEarned: db.totals.yieldEarned,
      nextExecution: db.totals.nextExecution,
      liquidBuffer: db.totals.liquidBuffer,
      // Phase 4.0 (M2) — on-chain USDC balance surfaced on the
      // status strip with a [LIVE] badge. The cache lives on
      // `VaultAccount.onChainUsdcBalanceCents` and is updated by
      // `refreshSafeBalanceAction`.
      onChainUsdcBalanceCents: db.vault.onChainUsdcBalanceCents,
      onChainBalanceRefreshedAt: db.vault.onChainBalanceRefreshedAt,
      // Phase 4.0 (M3) — aUSDC balance surfaced on the status
      // strip + the [DEPOSIT] / [WITHDRAW] buttons. The cache
      // lives on `VaultAccount.onChainAUsdcBalanceCents` and is
      // updated by `depositSafeUsdcAction` +
      // `withdrawSafeUsdcAction` + `refreshAUsdcBalanceAction`.
      onChainAUsdcBalanceCents: db.vault.onChainAUsdcBalanceCents,
      aUsdcBalanceRefreshedAt: db.vault.aUsdcBalanceRefreshedAt,
    },
  };
}

function labelForStatus(status: string): string {
  switch (status) {
    case "DRAFT":
    case "FUNDED":
      return "FUNDED";
    case "EARNING":
      return "EARNING";
    case "PREPARING_SETTLEMENT":
      return "PREPARING";
    case "EXECUTING":
      return "EXECUTING";
    case "SETTLED":
      return "SETTLED";
    case "INSUFFICIENT_FUNDS":
    case "REQUIRES_REVIEW":
    case "FAILED_RETRYABLE":
    case "FAILED_FINAL":
      return "ACTION REQUIRED";
    case "MANUAL_ACTION_REQUIRED":
      return "PAY MANUALLY";
    case "PAUSED":
      return "PAUSED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "FUNDED";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Server action — sync the vault from the live envelopes + bills
// ──────────────────────────────────────────────────────────────────────

/**
 * Server action: sync the vault from the in-memory envelope and
 * bill sources. Idempotent. Returns the seed result so the page
 * can render a "Synced X envelopes + Y bills" toast.
 */
export async function syncVaultAction(): Promise<{
  ok: boolean;
  result?: SeedResult;
  error?: string;
}> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    // Ensure the vault row exists before the seed so the seed
    // can write envelopes to a known vaultId. (The seed also
    // calls getOrCreateVault, but pre-creating here keeps the
    // audit-log entry clean.)
    await getOrCreateVault(user.id);
    const result = await seedVaultFromEnvelopes(user.id);
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] sync failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Server action: clear the user's vault data. Used by tests and
 * the (future) "Reset vault" button. Cascades through every
 * relation. Idempotent: deleting a non-existent vault is a no-op.
 */
export async function clearVaultAction(): Promise<{
  ok: boolean;
  deleted: { vault: number; envelopes: number; bills: number };
}> {
  const user = await requireUser();
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: true, deleted: { vault: 0, envelopes: 0, bills: 0 } };
  }
  const envelopes = await prisma.vaultEnvelope.count({
    where: { vaultId: vault.id },
  });
  const bills = await prisma.scheduledBill.count({
    where: { vaultId: vault.id },
  });
  await prisma.vaultAccount.delete({ where: { id: vault.id } });
  return { ok: true, deleted: { vault: 1, envelopes, bills } };
}

/** Convenience re-export. */
export { userHasVaultData };

// ──────────────────────────────────────────────────────────────────────
// Phase 3.0 — Yield adapter refresh
//
// The "manual cron" — calls the active IYieldAdapter, updates
// the VaultAccount.simulatedApy, recomputes per-envelope yield,
// writes audit-log entries. In production a real cron runs
// this every N minutes; for Phase 3.0 the user triggers it from
// the [SYNC] REFRESH button on the /vault page.
// ──────────────────────────────────────────────────────────────────────

/**
 * Server action: refresh the vault's APY from the active yield
 * adapter. On success: writes a `vault.apy_refreshed` audit
 * entry, recomputes the per-envelope attribution via the
 * `seedVaultFromEnvelopes` reapportionment (or just refreshes
 * the aggregate), and returns the new APY. On failure: writes
 * a `vault.apy_refresh_failed` entry and returns the error.
 */
export async function refreshVaultApyAction(): Promise<
  | {
      ok: true;
      apy: number;
      source: string;
      apyRefreshedAt: string;
      strategy: YieldRoutingStrategy;
      yieldRouted: {
        totalRouted: number;
        counts: {
          compounded: number;
          allocatedToBill: number;
          movedToAvailable: number;
        };
        billsCredited: string[];
        vaultBalanceBumped: boolean;
      };
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  const adapter = getActiveYieldAdapter();
  let apy: number;
  try {
    apy = await adapter.getCurrentApy();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.apy_refresh_failed",
      payload: {
        adapter: adapter.name,
        source: adapter.source,
        error: message,
      },
    });
    return { ok: false, error: `adapter ${adapter.name} failed: ${message}` };
  }
  const now = new Date();
  await prisma.vaultAccount.update({
    where: { id: vault.id },
    data: { simulatedApy: apy, updatedAt: now },
  });
  // Recompute the per-envelope attribution at the new APY. The
  // seed function is idempotent — re-running with the same
  // envelope list keeps the row count stable and writes fresh
  // YieldEvent rows for the new APY.
  const seedResult = await seedVaultFromEnvelopes(user.id);
  // Phase 3.1 — dispatch the accrued yield per the user's
  // strategy. The router reads the freshly-computed per-envelope
  // attribution total from the seed result and writes either
  // COMPOUNDED / ALLOCATED_TO_BILL / MOVED_TO_AVAILABLE events
  // (plus an `appliedYieldCents` increment on the next bill for
  // APPLY_TO_NEXT_BILL, or a `vaultAccount.availableBalance`
  // bump for MOVE_TO_AVAILABLE / SPLIT_BY_ENVELOPE).
  const preferences = await getOrCreateVaultPreferences(user.id);
  const routingResult = await routeYieldForStrategy({
    vaultId: vault.id,
    userId: user.id,
    strategy: preferences.yieldRoutingStrategy,
    totalAccruedCents: seedResult.totalAccruedYield,
    adapterName: adapter.name,
    adapterSource: adapter.source,
  });
  // Refresh the vault's top-level money aggregates. The
  // router may have bumped `availableBalance`; this picks up
  // the new value.
  await refreshVaultAggregates(vault.id);
  await recordVaultAudit({
    userId: user.id,
    actionType: "vault.apy_refreshed",
    payload: {
      adapter: adapter.name,
      source: adapter.source,
      previousApy: vault.simulatedApy,
      newApy: apy,
      refreshedAt: now.toISOString(),
      strategy: preferences.yieldRoutingStrategy,
      yieldRouted: {
        totalRouted: routingResult.totalRouted,
        counts: routingResult.counts,
        billsCredited: routingResult.billsCredited,
        vaultBalanceBumped: routingResult.vaultBalanceBumped,
      },
    },
  });
  return {
    ok: true,
    apy,
    source: adapter.name,
    apyRefreshedAt: now.toISOString(),
    strategy: preferences.yieldRoutingStrategy,
    yieldRouted: {
      totalRouted: routingResult.totalRouted,
      counts: routingResult.counts,
      billsCredited: routingResult.billsCredited,
      vaultBalanceBumped: routingResult.vaultBalanceBumped,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Phase 2.5 — Server actions for the interactive /vault page
//
// Each action is thin: it resolves the user, calls the right
// db.ts accessor, writes an audit-log entry, and returns a typed
// result. The page calls them from client components via the
// `use server` re-exports in actions.ts.
//
// All actions follow the same shape: `{ ok: true, ... }` on success,
// `{ ok: false, error: string }` on failure. The client components
// branch on `ok` and surface the error inline.
// ──────────────────────────────────────────────────────────────────────

const STRATEGY_VALUES = new Set<YieldRoutingStrategy>([
  "COMPOUND",
  "APPLY_TO_NEXT_BILL",
  "MOVE_TO_AVAILABLE",
  "SPLIT_BY_ENVELOPE",
]);

/**
 * Set the user's yield-routing strategy. Validates the input
 * against the TS union; unknown values are rejected before the
 * write so a malformed form payload can't poison the column.
 */
export async function setYieldRoutingAction(
  rawStrategy: string,
): Promise<{ ok: true; strategy: YieldRoutingStrategy } | { ok: false; error: string }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (!STRATEGY_VALUES.has(rawStrategy as YieldRoutingStrategy)) {
    return { ok: false, error: `unknown strategy: ${rawStrategy}` };
  }
  const strategy = rawStrategy as YieldRoutingStrategy;
  try {
    const prev = await getOrCreateVaultPreferences(user.id);
    await setYieldRoutingStrategy(user.id, strategy);
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.yield_routing_changed",
      payload: { from: prev.yieldRoutingStrategy, to: strategy },
    });
    return { ok: true, strategy };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] setYieldRouting failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Mark the risk disclosure as acknowledged. Sets
 * `riskAcknowledgedAt = now()` on the user's preferences row and
 * writes a `vault.risk_acknowledged` audit entry.
 */
export async function acknowledgeRiskAction(): Promise<
  { ok: true; acknowledgedAt: string } | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    const prefs = await acknowledgeRisk(user.id);
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.risk_acknowledged",
      payload: { acknowledgedAt: prefs.riskAcknowledgedAt },
    });
    return { ok: true, acknowledgedAt: prefs.riskAcknowledgedAt! };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] acknowledgeRisk failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Cluster 7.0 — Revoke the risk-disclosure acknowledgement.
 * Sets `riskAcknowledgedAt = null` on the user's preferences row
 * (the row is preserved, not deleted) and writes a
 * `vault.risk_unacknowledged` audit entry. The next visit to
 * `/vault` or `/vault/preferences` will re-render the
 * unacknowledged disclosure until the user clicks
 * `[OK] I understand` again.
 *
 * This is the manual half of the spec's "re-acknowledgment
 * required on strategy change or new bill" requirement. A
 * future slice can auto-trigger this from the strategy
 * picker or the bill editor; today it's a button on the
 * preferences page.
 */
export async function revokeRiskAcknowledgementAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    await revokeRiskAcknowledgement(user.id);
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.risk_unacknowledged",
      payload: {},
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] revokeRiskAcknowledgement failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Pause the vault. Sets `VaultAccount.status = PAUSED` and writes
 * a `vault.paused` audit entry. The page reads `vault.status` and
 * the snapshot's alert state reflects this immediately.
 */
export async function pauseVaultAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    await setVaultAccountStatus(user.id, "PAUSED");
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.paused",
      payload: { at: new Date().toISOString() },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] pause failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Resume a paused vault. Sets `VaultAccount.status = ACTIVE` and
 * writes a `vault.resumed` audit entry.
 */
export async function resumeVaultAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    await setVaultAccountStatus(user.id, "ACTIVE");
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.resumed",
      payload: { at: new Date().toISOString() },
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] resume failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Build a `BillEvent` object from an event type + the bill's
 * current context. For events that take no payload this is a
 * straight `{ type }` object. For CONFIRM_SETTLED we generate
 * a fake transactionId and use the bill's providerPreference
 * as the providerName — Phase 2.5's "Simulate next state" is
 * a dev affordance, not a real provider call.
 */
function buildEvent(
  eventType: UserFacingBillEvent,
  ctx: { providerPreference: string | null; amount: number; billId: string },
): BillEvent {
  switch (eventType) {
    case "CONFIRM_SETTLED":
      return {
        type: "CONFIRM_SETTLED",
        transactionId: `sim-${ctx.billId.slice(0, 8)}-${Date.now()}`,
        providerName: ctx.providerPreference ?? "spritz",
      };
    default:
      // The remaining events are no-arg.
      return { type: eventType } as BillEvent;
  }
}

/**
 * Apply a single user-facing event to a bill. Validates the
 * event type against the whitelist, builds the event payload,
 * calls `transitionBillDb`, returns the result. The client
 * component uses this for the per-bill action buttons.
 */
export async function transitionBillServerAction(
  billId: string,
  eventType: string,
): Promise<
  | { ok: true; from: string; to: string; event: string }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (
    !USER_FACING_BILL_EVENTS.includes(eventType as UserFacingBillEvent)
  ) {
    return { ok: false, error: `unknown event: ${eventType}` };
  }
  try {
    const bill = await prisma.scheduledBill.findUnique({
      where: { id: billId },
    });
    if (!bill) {
      return { ok: false, error: `bill not found: ${billId}` };
    }
    const event = buildEvent(eventType as UserFacingBillEvent, {
      providerPreference: bill.providerPreference,
      amount: bill.amount,
      billId,
    });
    const from = bill.status;
    const result = await transitionBillDb(user.id, billId, event);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, from, to: result.bill.status, event: eventType };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] transitionBill failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * "Simulate next state" — picks the first legal next event for
 * the bill and runs it. The dev affordance called out in
 * COORDINATION.md line 1401 ("we add the manual 'simulate next
 * state' button in 2.0b if needed"). On a SETTLED or CANCELLED
 * bill this is a no-op (terminal states have no legal events).
 */
export async function simulateNextStateAction(
  billId: string,
): Promise<
  | { ok: true; from: string; to: string; event: string }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    const bill = await prisma.scheduledBill.findUnique({
      where: { id: billId },
    });
    if (!bill) {
      return { ok: false, error: `bill not found: ${billId}` };
    }
    const legal = legalNextStates(bill.status as import("./types").BillStatus);
    const first = legal[0];
    if (!first) {
      return {
        ok: false,
        error: `terminal state: ${bill.status} (no legal transitions)`,
      };
    }
    return await transitionBillServerAction(billId, first);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] simulateNextState failed:", message);
    return { ok: false, error: message };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase 3.5 — Per-bill CRUD server actions
//
// The user can add / update / delete their own bills via the
// /vault page. State transitions (status changes) go through
// the existing transitionBillServerAction.
// ──────────────────────────────────────────────────────────────────────

const BILL_FREQUENCIES: ReadonlySet<string> = new Set([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
  "ONE_TIME",
]);

interface BillFormFields {
  billerName: string;
  amountCents: number;
  frequency: string;
  dueDay: number;
  providerPreference?: string;
}

/** Validate a bill form payload, return a normalized BillFormFields
 *  or an error string. */
function validateBillForm(input: unknown): BillFormFields | string {
  if (!input || typeof input !== "object") return "form data is required";
  const o = input as Record<string, unknown>;
  const billerName =
    typeof o.billerName === "string" ? o.billerName.trim() : "";
  if (!billerName) return "biller name is required";
  if (billerName.length > 80) return "biller name is too long";
  const amountCents =
    typeof o.amountCents === "number" ? o.amountCents : NaN;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return "amount must be a positive number (cents)";
  }
  if (amountCents > 1_000_000_00) return "amount is unreasonably large";
  const frequency = typeof o.frequency === "string" ? o.frequency : "";
  if (!BILL_FREQUENCIES.has(frequency)) {
    return `unknown frequency: ${frequency}`;
  }
  const dueDay = typeof o.dueDay === "number" ? o.dueDay : NaN;
  if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
    return "due day must be 1-31";
  }
  const providerPreference =
    typeof o.providerPreference === "string" && o.providerPreference
      ? o.providerPreference
      : undefined;
  return { billerName, amountCents, frequency, dueDay, providerPreference };
}

/** Compute the next due date (and execution window) for a bill
 *  with the given day-of-month and frequency. The window opens
 *  3 days before the due date and closes 1 day after. */
function computeBillSchedule(
  dueDay: number,
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME",
  now: Date = new Date(),
): { dueDate: Date; windowStart: Date; windowEnd: Date } {
  const today = new Date(now);
  // For monthly+ frequencies, the next due date is the next
  // occurrence of `dueDay` strictly after today.
  let candidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    dueDay,
    9,
    0,
    0,
    0,
  );
  if (candidate.getTime() <= today.getTime()) {
    if (frequency === "WEEKLY") {
      candidate = new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (frequency === "QUARTERLY") {
      candidate = new Date(today.getFullYear(), today.getMonth() + 3, dueDay);
    } else if (frequency === "ANNUALLY") {
      candidate = new Date(today.getFullYear() + 1, today.getMonth(), dueDay);
    } else {
      // MONTHLY or ONE_TIME — roll to next month
      candidate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        dueDay,
        9,
        0,
        0,
        0,
      );
    }
  }
  const windowStart = new Date(candidate);
  windowStart.setDate(candidate.getDate() - 3);
  const windowEnd = new Date(candidate);
  windowEnd.setDate(candidate.getDate() + 1);
  return { dueDate: candidate, windowStart, windowEnd };
}

/** Generate a stable slug for `billerId` (the composite unique
 *  key) from the biller name. Lowercase, dashes, stripped of
 *  non-alphanumerics. Appends a 4-char suffix on collision
 *  (the caller resolves duplicates; this is the happy path). */
function slugifyBillerId(name: string): string {
  return (
    "user-" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

/**
 * Server action: create a new bill. The new bill is `source: "user"`
 * so the seed pass won't overwrite it. Status starts at `FUNDED`.
 */
export async function createBillAction(
  rawForm: unknown,
  envelopeId: string,
): Promise<{ ok: true; billId: string } | { ok: false; error: string }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const validated = validateBillForm(rawForm);
  if (typeof validated === "string") {
    return { ok: false, error: validated };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  // Verify the envelope belongs to this vault (security: a
  // crafted envelopeId could otherwise attach a bill to a
  // different vault's envelope).
  const envelope = await prisma.vaultEnvelope.findUnique({
    where: { id: envelopeId },
  });
  if (!envelope || envelope.vaultId !== vault.id) {
    return { ok: false, error: "envelope not found" };
  }
  const { dueDate, windowStart, windowEnd } = computeBillSchedule(
    validated.dueDay,
    validated.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME",
  );
  const maxAuthorized = Math.round(validated.amountCents * 1.05);
  // Generate a unique billerId (slug). The composite unique on
  // (vaultId, billerId) would otherwise reject a re-add of the
  // same name; the random suffix keeps the happy path simple.
  const billerId = slugifyBillerId(validated.billerName);
  try {
    const bill = await createBill({
      userId: user.id,
      vaultId: vault.id,
      envelopeId,
      billerName: validated.billerName,
      billerId,
      maskedAccountNumber: "•••• 4218",
      amount: validated.amountCents,
      maxAuthorizedAmount: maxAuthorized,
      frequency: validated.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME",
      dueDate,
      executionWindowStart: windowStart,
      executionWindowEnd: windowEnd,
      providerPreference: validated.providerPreference,
    });
    return { ok: true, billId: bill.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] createBill failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Server action: update a bill's metadata. Status changes go
 * through `transitionBillServerAction` — this action only handles
 * the editable fields (name, amount, frequency, due day,
 * provider).
 */
export async function updateBillAction(
  billId: string,
  rawForm: unknown,
): Promise<
  | { ok: true; billId: string }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const validated = validateBillForm(rawForm);
  if (typeof validated === "string") {
    return { ok: false, error: validated };
  }
  const bill = await prisma.scheduledBill.findUnique({
    where: { id: billId },
  });
  if (!bill) {
    return { ok: false, error: "bill not found" };
  }
  // Verify the bill belongs to the current user's vault.
  const vault = await prisma.vaultAccount.findUnique({
    where: { id: bill.vaultId },
  });
  if (!vault || vault.userId !== user.id) {
    return { ok: false, error: "bill not found" };
  }
  const { dueDate, windowStart, windowEnd } = computeBillSchedule(
    validated.dueDay,
    validated.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME",
  );
  try {
    const updated = await updateBillMetadata(user.id, billId, {
      billerName: validated.billerName,
      amount: validated.amountCents,
      maxAuthorizedAmount: Math.round(validated.amountCents * 1.05),
      frequency: validated.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME",
      dueDate,
      executionWindowStart: windowStart,
      executionWindowEnd: windowEnd,
      providerPreference: validated.providerPreference ?? null,
    });
    return { ok: true, billId: updated.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] updateBill failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Server action: delete a bill. The caller (client component) is
 * expected to confirm via `window.confirm` first.
 */
export async function deleteBillAction(
  billId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const bill = await prisma.scheduledBill.findUnique({
    where: { id: billId },
  });
  if (!bill) {
    return { ok: false, error: "bill not found" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { id: bill.vaultId },
  });
  if (!vault || vault.userId !== user.id) {
    return { ok: false, error: "bill not found" };
  }
  try {
    await deleteBill(user.id, billId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] deleteBill failed:", message);
    return { ok: false, error: message };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — Safe deploy server action (M1)
//
// The [DEPLOY] button on /vault calls this. The flow:
//   1. Resolve user + vault.
//   2. Reject if the vault already has a non-mock Safe
//      address (deploys are irreversible; the UI also hides
//      the button in this state, but the server is the
//      second line of defense).
//   3. Call the safe-deploy lib to broadcast the
//      CREATE2 deploy tx. The lib's pre-flight (signer ETH
//      balance) gives a clear error if the user forgot to
//      fund the signer.
//   4. Persist the deployed address + signer + chainId + tx
//      hash on the vault row, and write a
//      `vault.safe_deployed` audit entry.
//   5. Refresh the page's snapshot via `revalidatePath("/vault")`
//      so the next render shows the new address + chip.
// ──────────────────────────────────────────────────────────────────────

export async function deploySafeAction(): Promise<
  | {
      ok: true;
      safeAddress: string;
      chainId: number;
      signerAddress: string;
      txHash: string | null;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (!isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: `safe already deployed at ${vault.smartAccountAddress}`,
    };
  }
  let deployed;
  try {
    deployed = await deploySafeLib();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] deploySafe failed:", message);
    // Audit the failure too — the signer is configured, the
    // intent is real, the user deserves a record of why it
    // didn't go through.
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.safe_deploy_failed",
        payload: {
          error: message,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // best-effort; don't mask the original error
    }
    return { ok: false, error: message };
  }
  try {
    await setVaultSafeAddress({
      vaultId: vault.id,
      userId: user.id,
      smartAccountAddress: deployed.safeAddress,
      signerAddress: deployed.signerAddress,
      chainId: deployed.chainId,
      txHash: deployed.txHash === "0x" ? null : deployed.txHash,
    });
  } catch (err) {
    // The deploy tx already mined; we just failed to persist.
    // Surface the persistence error — the chain state is on
    // the user's behalf, the DB is the user's problem.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] setVaultSafeAddress failed:", message);
    return {
      ok: false,
      error: `deployed on-chain but DB write failed: ${message}. The Safe is at ${deployed.safeAddress}; re-sync to recover.`,
    };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    safeAddress: deployed.safeAddress,
    chainId: deployed.chainId,
    signerAddress: deployed.signerAddress,
    txHash: deployed.txHash === "0x" ? null : deployed.txHash,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — USDC funding + on-chain balance read (M2)
//
// The [FUND] $X USDC button on /vault calls `fundSafeAction`.
// The [REFRESH] BALANCE button calls `refreshSafeBalanceAction`.
// Both are guarded by the deployed-Safe check (a MOCK Safe
// address means the user hasn't deployed yet) and write
// audit-log entries on success or failure.
// ──────────────────────────────────────────────────────────────────────

/** Read the funding cap from env. Default = $10,000 (1_000_000 cents). */
function getFundMaxCents(): number {
  const raw = process.env.VAULT_FUND_MAX_CENTS;
  if (!raw) return 1_000_000_00; // $10,000
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 1_000_000_00;
  return n;
}

/** Read the funding minimum. Default = $1 (100 cents).
 *  Below 1 cent risks being a typo or rounding loss. */
function getFundMinCents(): number {
  return 100; // $1.00
}

/**
 * Server action: transfer testnet USDC from the server-side
 * signer to the user's deployed Safe.
 *
 * The flow:
 *   1. Resolve user + vault. Reject if the Safe is MOCK
 *      (deploy first).
 *   2. Validate the amount (positive integer, within the
 *      configured min/max).
 *   3. Idempotency check via the per-request nonce. If a prior
 *      `vault.funded` row already carries the same nonce,
 *      return that row's result (no double-broadcast).
 *   4. Call `fundSafeWithUsdc` — the lib's pre-flight (signer
 *      USDC balance) and on-chain broadcast.
 *   5. Persist the new on-chain balance cache + write the
 *      `vault.funded` audit entry.
 *   6. Revalidate /vault so the next render shows the new
 *      balance.
 */
export async function fundSafeAction(
  amountCents: number,
  nonce: string,
): Promise<
  | {
      ok: true;
      txHash: string;
      amountCents: number;
      postBalanceCents: number;
      nonce: string;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    return { ok: false, error: "amount must be a positive integer (cents)" };
  }
  const min = getFundMinCents();
  const max = getFundMaxCents();
  if (amountCents < min) {
    return {
      ok: false,
      error: `amount must be at least $${(min / 100).toFixed(2)}`,
    };
  }
  if (amountCents > max) {
    return {
      ok: false,
      error: `amount exceeds cap of $${(max / 100).toFixed(2)}`,
    };
  }
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 80) {
    return { ok: false, error: "nonce must be a non-empty string ≤ 80 chars" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: "Safe is not deployed yet — click [DEPLOY] Safe first",
    };
  }
  // Idempotency check. A double-click re-submits with the same
  // nonce, so the second call short-circuits to the prior row's
  // tx hash.
  const prior = await findFundedByIdempotencyKey(user.id, nonce);
  if (prior) {
    const txHash =
      typeof prior.payload.txHash === "string" ? prior.payload.txHash : null;
    const priorAmount =
      typeof prior.payload.amountCents === "number"
        ? prior.payload.amountCents
        : amountCents;
    const priorPostBalance =
      typeof prior.payload.postBalanceCents === "number"
        ? prior.payload.postBalanceCents
        : 0;
    if (txHash) {
      return {
        ok: true,
        txHash,
        amountCents: priorAmount,
        postBalanceCents: priorPostBalance,
        nonce,
      };
    }
  }
  let result;
  try {
    result = await fundSafeWithUsdc({
      safeAddress: vault.smartAccountAddress,
      amountCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] fundSafe failed:", message);
    // Audit-log the failure too — the user deserves a record
    // of why the broadcast didn't happen (most commonly: signer
    // is out of testnet USDC).
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.funded",
        payload: {
          vaultId: vault.id,
          safeAddress: vault.smartAccountAddress,
          amountCents,
          nonce,
          failed: true,
          error: message,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // best-effort; don't mask the original error
    }
    return { ok: false, error: message };
  }
  const postBalanceCents = centsFromUsdcUnits(result.postBalanceUnits);
  try {
    await setOnChainBalance({
      vaultId: vault.id,
      onChainUsdcBalanceCents: postBalanceCents,
      refreshedAt: new Date(),
    });
    await recordFunded({
      userId: user.id,
      vaultId: vault.id,
      safeAddress: result.safeAddress,
      signerAddress: result.signerAddress,
      amountCents: result.amountCents,
      amountUnits: result.amountUnits.toString(),
      txHash: result.txHash,
      nonce,
      fundedAt: new Date(),
      postBalanceCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] fundSafe persist failed:", message);
    return {
      ok: false,
      error: `funded on-chain but DB write failed: ${message}. The tx is at ${result.txHash}; re-refresh to recover.`,
    };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    txHash: result.txHash,
    amountCents: result.amountCents,
    postBalanceCents,
    nonce,
  };
}

/**
 * Server action: read the deployed Safe's on-chain USDC balance
 * via viem and persist it to the denormalized cache on
 * `VaultAccount.onChainUsdcBalanceCents`. Writes a
 * `vault.balance_refreshed` audit entry.
 *
 * Rejects if the Safe is MOCK (deploy first). On RPC failure,
 * returns a structured error so the button can surface a clear
 * "RPC unreachable" line.
 */
export async function refreshSafeBalanceAction(): Promise<
  | {
      ok: true;
      onChainUsdcBalanceCents: number;
      refreshedAt: string;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: "Safe is not deployed yet — click [DEPLOY] Safe first",
    };
  }
  const refreshedAt = new Date();
  let balanceUnits: bigint;
  try {
    balanceUnits = await getOnChainUsdcBalance(vault.smartAccountAddress);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] refreshSafeBalance failed:", message);
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.balance_refreshed",
        payload: {
          vaultId: vault.id,
          safeAddress: vault.smartAccountAddress,
          failed: true,
          error: message,
          at: refreshedAt.toISOString(),
        },
      });
    } catch {
      // best-effort
    }
    return { ok: false, error: `RPC read failed: ${message}` };
  }
  const onChainUsdcBalanceCents = centsFromUsdcUnits(balanceUnits);
  try {
    await setOnChainBalance({
      vaultId: vault.id,
      onChainUsdcBalanceCents,
      refreshedAt,
    });
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.balance_refreshed",
      payload: {
        vaultId: vault.id,
        safeAddress: vault.smartAccountAddress,
        onChainUsdcBalanceCents,
        refreshedAt: refreshedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] setOnChainBalance failed:", message);
    return { ok: false, error: `DB write failed: ${message}` };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    onChainUsdcBalanceCents,
    refreshedAt: refreshedAt.toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Phase 4.0 — Aave V3 deposit + withdraw + aUSDC refresh (M3)
//
// The [DEPOSIT] $X USDC button on /vault calls
// `depositSafeUsdcAction`. The [WITHDRAW] $X USDC button calls
// `withdrawSafeUsdcAction`. The on-chain aUSDC balance cache
// is also refreshable via `refreshAUsdcBalanceAction` (the
// post-tx reads in the deposit/withdraw flows already update
// the cache, so this is for the manual [REFRESH] button).
// ──────────────────────────────────────────────────────────────────────

/** Read the deposit cap from env. Default = $10,000 (1_000_000 cents). */
function getDepositMaxCents(): number {
  const raw = process.env.VAULT_DEPOSIT_MAX_CENTS;
  if (!raw) return 1_000_000_00; // $10,000
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 1_000_000_00;
  return n;
}

/** Read the deposit minimum. Default = $1 (100 cents). */
function getDepositMinCents(): number {
  return 100; // $1.00
}

/**
 * Server action: deposit Aave-USDC from the Safe into Aave V3.
 * The Safe is the actor; the server-side signer EOA is the
 * relayer (pays gas, signs the meta-tx). On the first deposit
 * we also issue an unlimited approval — subsequent deposits
 * skip the approval tx.
 *
 * 1. Validate the amount.
 * 2. Idempotency check (per-request nonce).
 * 3. Pre-flight: the Safe has enough Aave-USDC.
 * 4. Call `supplySafeUsdc` (lib) which broadcasts the approve
 *    (if needed) + supply txs via the Protocol Kit.
 * 5. Persist the new aUSDC balance + write the audit.
 * 6. Revalidate /vault.
 */
export async function depositSafeUsdcAction(
  amountCents: number,
  nonce: string,
): Promise<
  | {
      ok: true;
      txHash: string;
      amountCents: number;
      postBalanceCents: number;
      aUsdcTokenAddress: string;
      nonce: string;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    return { ok: false, error: "amount must be a positive integer (cents)" };
  }
  const min = getDepositMinCents();
  const max = getDepositMaxCents();
  if (amountCents < min) {
    return {
      ok: false,
      error: `amount must be at least $${(min / 100).toFixed(2)}`,
    };
  }
  if (amountCents > max) {
    return {
      ok: false,
      error: `amount exceeds cap of $${(max / 100).toFixed(2)}`,
    };
  }
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 80) {
    return { ok: false, error: "nonce must be a non-empty string ≤ 80 chars" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: "Safe is not deployed yet — click [DEPLOY] Safe first",
    };
  }
  // Idempotency check. The nonce is a per-button-press string
  // the client generates. A double-click re-submits with the
  // same nonce, so the second call short-circuits to the prior
  // row's tx hash.
  const prior = await findAaveSupplyByIdempotencyKey(user.id, nonce);
  if (prior) {
    const txHash =
      typeof prior.payload.supplyTxHash === "string"
        ? prior.payload.supplyTxHash
        : null;
    const priorAmount =
      typeof prior.payload.amountCents === "number"
        ? prior.payload.amountCents
        : amountCents;
    const priorPostBalance =
      typeof prior.payload.postBalanceCents === "number"
        ? prior.payload.postBalanceCents
        : 0;
    const priorAToken =
      typeof prior.payload.aUsdcTokenAddress === "string"
        ? prior.payload.aUsdcTokenAddress
        : "";
    if (txHash) {
      return {
        ok: true,
        txHash,
        amountCents: priorAmount,
        postBalanceCents: priorPostBalance,
        aUsdcTokenAddress: priorAToken,
        nonce,
      };
    }
  }
  let result;
  try {
    result = await supplySafeUsdc({
      safeAddress: vault.smartAccountAddress,
      amountCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] depositSafeUsdc failed:", message);
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.aave_supply",
        payload: {
          vaultId: vault.id,
          safeAddress: vault.smartAccountAddress,
          amountCents,
          nonce,
          failed: true,
          error: message,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // best-effort
    }
    return { ok: false, error: message };
  }
  const postBalanceCents = centsFromUsdcUnits(result.postBalanceUnits);
  try {
    await setAUsdcBalance({
      vaultId: vault.id,
      onChainAUsdcBalanceCents: postBalanceCents,
      refreshedAt: new Date(),
      aUsdcTokenAddress: result.aUsdcAddress,
    });
    await recordAaveSupply({
      userId: user.id,
      vaultId: vault.id,
      safeAddress: result.safeAddress,
      poolAddress: result.poolAddress,
      amountCents: result.amountCents,
      amountUnits: result.amountUnits.toString(),
      approveTxHash: result.approveTxHash,
      supplyTxHash: result.supplyTxHash,
      aUsdcTokenAddress: result.aUsdcAddress,
      postBalanceCents,
      nonce,
      suppliedAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] depositSafeUsdc persist failed:", message);
    return {
      ok: false,
      error: `deposited on-chain but DB write failed: ${message}. The tx is at ${result.supplyTxHash}; re-refresh to recover.`,
    };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    txHash: result.supplyTxHash,
    amountCents: result.amountCents,
    postBalanceCents,
    aUsdcTokenAddress: result.aUsdcAddress,
    nonce,
  };
}

/**
 * Server action: withdraw Aave-USDC from the Safe's aUSDC
 * position back to the Safe. Burns the aUSDC and sends the
 * underlying USDC to the Safe. Per-request nonce idempotency.
 */
export async function withdrawSafeUsdcAction(
  amountCents: number,
  nonce: string,
): Promise<
  | {
      ok: true;
      txHash: string;
      amountCents: number;
      postUsdcBalanceCents: number;
      postAUsdcBalanceCents: number;
      nonce: string;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    return { ok: false, error: "amount must be a positive integer (cents)" };
  }
  const min = getDepositMinCents();
  const max = getDepositMaxCents();
  if (amountCents < min) {
    return {
      ok: false,
      error: `amount must be at least $${(min / 100).toFixed(2)}`,
    };
  }
  if (amountCents > max) {
    return {
      ok: false,
      error: `amount exceeds cap of $${(max / 100).toFixed(2)}`,
    };
  }
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 80) {
    return { ok: false, error: "nonce must be a non-empty string ≤ 80 chars" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: "Safe is not deployed yet — click [DEPLOY] Safe first",
    };
  }
  // Idempotency check.
  const prior = await findAaveWithdrawByIdempotencyKey(user.id, nonce);
  if (prior) {
    const txHash =
      typeof prior.payload.withdrawTxHash === "string"
        ? prior.payload.withdrawTxHash
        : null;
    const priorAmount =
      typeof prior.payload.amountCents === "number"
        ? prior.payload.amountCents
        : amountCents;
    const priorPostUsdc =
      typeof prior.payload.postUsdcBalanceCents === "number"
        ? prior.payload.postUsdcBalanceCents
        : 0;
    const priorPostAUsdc =
      typeof prior.payload.postAUsdcBalanceCents === "number"
        ? prior.payload.postAUsdcBalanceCents
        : 0;
    if (txHash) {
      return {
        ok: true,
        txHash,
        amountCents: priorAmount,
        postUsdcBalanceCents: priorPostUsdc,
        postAUsdcBalanceCents: priorPostAUsdc,
        nonce,
      };
    }
  }
  let result;
  try {
    result = await withdrawSafeUsdc({
      safeAddress: vault.smartAccountAddress,
      amountCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] withdrawSafeUsdc failed:", message);
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.aave_withdraw",
        payload: {
          vaultId: vault.id,
          safeAddress: vault.smartAccountAddress,
          amountCents,
          nonce,
          failed: true,
          error: message,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // best-effort
    }
    return { ok: false, error: message };
  }
  const postUsdcBalanceCents = centsFromUsdcUnits(result.postUsdcBalanceUnits);
  const postAUsdcBalanceCents = centsFromUsdcUnits(result.postAUsdcBalanceUnits);
  try {
    await setOnChainBalance({
      vaultId: vault.id,
      onChainUsdcBalanceCents: postUsdcBalanceCents,
      refreshedAt: new Date(),
    });
    await setAUsdcBalance({
      vaultId: vault.id,
      onChainAUsdcBalanceCents: postAUsdcBalanceCents,
      refreshedAt: new Date(),
    });
    await recordAaveWithdraw({
      userId: user.id,
      vaultId: vault.id,
      safeAddress: result.safeAddress,
      poolAddress: result.poolAddress,
      amountCents: result.amountCents,
      amountUnits: result.amountUnits.toString(),
      withdrawTxHash: result.withdrawTxHash,
      postUsdcBalanceCents,
      postAUsdcBalanceCents,
      nonce,
      withdrawnAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] withdrawSafeUsdc persist failed:", message);
    return {
      ok: false,
      error: `withdrawn on-chain but DB write failed: ${message}. The tx is at ${result.withdrawTxHash}; re-refresh to recover.`,
    };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    txHash: result.withdrawTxHash,
    amountCents: result.amountCents,
    postUsdcBalanceCents,
    postAUsdcBalanceCents,
    nonce,
  };
}

/**
 * Server action: read the Safe's aUSDC balance via viem and
 * persist the cache. The deposit/withdraw flows already
 * update the cache on success, so this is for the manual
 * [REFRESH] button (and the post-aave-approval recovery
 * case).
 */
export async function refreshAUsdcBalanceAction(): Promise<
  | {
      ok: true;
      onChainAUsdcBalanceCents: number;
      aUsdcTokenAddress: string;
      refreshedAt: string;
    }
  | { ok: false; error: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
  });
  if (!vault) {
    return { ok: false, error: "no vault yet — sync first" };
  }
  if (isMockSafeAddress(vault.smartAccountAddress)) {
    return {
      ok: false,
      error: "Safe is not deployed yet — click [DEPLOY] Safe first",
    };
  }
  const refreshedAt = new Date();
  // Resolve the aToken address — prefer the cached value on
  // the vault row, fall back to a fresh Pool read.
  let aUsdcTokenAddress: Address;
  if (vault.aUsdcTokenAddress) {
    aUsdcTokenAddress = getAddress(vault.aUsdcTokenAddress);
  } else {
    aUsdcTokenAddress = await getAUsdcTokenAddress();
  }
  let balanceUnits: bigint;
  let aUsdcBalanceUnits: bigint;
  let usdcBalanceUnits: bigint;
  try {
    aUsdcBalanceUnits = await getAUsdcBalance(
      vault.smartAccountAddress as Address,
      aUsdcTokenAddress,
    );
    usdcBalanceUnits = await getAaveUsdcBalance(
      vault.smartAccountAddress as Address,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] refreshAUsdcBalance read failed:", message);
    try {
      await recordVaultAudit({
        userId: user.id,
        actionType: "vault.aave_supply",
        payload: {
          vaultId: vault.id,
          safeAddress: vault.smartAccountAddress,
          failed: true,
          error: message,
          at: refreshedAt.toISOString(),
        },
      });
    } catch {
      // best-effort
    }
    return { ok: false, error: `RPC read failed: ${message}` };
  }
  const onChainAUsdcBalanceCents = centsFromUsdcUnits(aUsdcBalanceUnits);
  const onChainUsdcBalanceCents = centsFromUsdcUnits(usdcBalanceUnits);
  balanceUnits = aUsdcBalanceUnits;
  void balanceUnits;
  try {
    await setOnChainBalance({
      vaultId: vault.id,
      onChainUsdcBalanceCents,
      refreshedAt,
    });
    await setAUsdcBalance({
      vaultId: vault.id,
      onChainAUsdcBalanceCents,
      refreshedAt,
      aUsdcTokenAddress,
    });
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.aave_supply",
      payload: {
        vaultId: vault.id,
        safeAddress: vault.smartAccountAddress,
        kind: "balance_refreshed",
        aUsdcTokenAddress,
        onChainAUsdcBalanceCents,
        refreshedAt: refreshedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] setAUsdcBalance failed:", message);
    return { ok: false, error: `DB write failed: ${message}` };
  }
  revalidatePath("/vault");
  return {
    ok: true,
    onChainAUsdcBalanceCents,
    aUsdcTokenAddress,
    refreshedAt: refreshedAt.toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Cluster Vault 4.0 M4 — off-ramp gateway server actions.
//
// Three actions that drive the gateway + state machine:
//
//   1. executeBillPaymentAction — the "Execute now" button on a
//      bill in FUNDED/EARNING. Runs canExecute, then the gateway,
//      then the state machine. The idempotency key is auto-derived
//      from (billId, current minute) so re-clicks in the same minute
//      are deduped via the PaymentAttempt unique index.
//
//   2. retryBillPaymentAction — the "Retry" button on a bill in
//      a degraded state (FAILED_RETRYABLE / INSUFFICIENT_FUNDS /
//      REQUIRES_REVIEW). Calls RETRY (funnels back to EARNING),
//      then re-enters executeBillPaymentAction.
//
//   3. confirmManualPaymentAction — the "Mark manually paid" button
//      on a bill in MANUAL_ACTION_REQUIRED / FAILED_FINAL. Calls
//      CONFIRM_SETTLED with `providerName: "manual"` and the user's
//      `settlementRef` as the transactionId. The user pays out-
//      of-band and confirms here; the bill lands in SETTLED.
//
// All 3 actions revalidate /vault on success so the table + alert
// banner reflect the new state on the next render.
// ──────────────────────────────────────────────────────────────────────

/**
 * The auto-derived idempotency key for `executeBillPaymentAction`.
 * Stable within a 1-minute window so accidental double-clicks
 * dedupe, but rotates often enough that a real retry later in
 * the day gets a fresh PaymentAttempt row.
 */
export function executionIdempotencyKey(billId: string, now: Date = new Date()): string {
  const minute = Math.floor(now.getTime() / 60_000);
  return `bill:${billId}:exec:${minute}`;
}

/**
 * Load a VaultAccount + ScheduledBill pair for the current user.
 * Returns null if either is missing (the caller surfaces a 404
 * to the UI). Used by the 3 new actions.
 */
async function loadBillAndVault(
  billId: string,
  userId: string,
): Promise<{ bill: ScheduledBill; vault: VaultAccount } | null> {
  const billRow = await prisma.scheduledBill.findUnique({ where: { id: billId } });
  if (!billRow) return null;
  // Defensive: confirm the bill belongs to this user's vault.
  const vaultRow = await prisma.vaultAccount.findFirst({
    where: { id: billRow.vaultId, userId },
  });
  if (!vaultRow) return null;
  const bill = toScheduledBillLocal(billRow);
  const vault = toVaultAccountLocal(vaultRow);
  return { bill, vault };
}

export type ExecuteBillPaymentResult =
  | {
      ok: true;
      from: string;
      to: string;
      providerName: string;
      transactionId?: string;
      requiresManualAction: boolean;
    }
  | { ok: false; error: string; reason?: string };

/**
 * Run the gateway for a single bill. The user-facing "Execute now"
 * button calls this. The 7-condition `canExecute` gate runs first;
 * a failure short-circuits with the reason in the response.
 */
export async function executeBillPaymentAction(
  billId: string,
): Promise<ExecuteBillPaymentResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    const ctx = await loadBillAndVault(billId, user.id);
    if (!ctx) return { ok: false, error: `bill not found: ${billId}` };
    const { bill, vault } = ctx;
    const gate = await canExecuteGate(bill, vault);
    if (!gate.ok) {
      return { ok: false, error: gate.reason, reason: gate.reason };
    }
    const idempotencyKey = executionIdempotencyKey(bill.id);
    const gateway = OffRampGateway.buildDefault(user.id);
    // Drive the state machine: EARNING → BEGIN_SETTLEMENT →
    // PREPARING_SETTLEMENT → EXECUTE → EXECUTING. Then call the
    // gateway, which writes PaymentAttempt + ProviderEvent +
    // audit. The final CONFIRM_SETTLED / MANUAL_ACTION_REQUIRED
    // / FAIL_FINAL is derived from the result and applied.
    const begin = await transitionBillDb(user.id, bill.id, { type: "BEGIN_SETTLEMENT" });
    if (!begin.ok) return { ok: false, error: begin.error };
    const exec = await transitionBillDb(user.id, bill.id, { type: "EXECUTE" });
    if (!exec.ok) return { ok: false, error: exec.error };
    const result = await gateway.executePayment(exec.bill, idempotencyKey);
    const event = eventFromResult(result, exec.bill);
    const from = bill.status;
    const transition = await transitionBillDb(user.id, bill.id, event);
    if (!transition.ok) {
      return { ok: false, error: transition.error };
    }
    // Audit the gateway decision explicitly. `transitionBillDb`
    // already wrote `vault.bill_state_changed`; the gateway
    // outcome is a separate concern.
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.payment_executed",
      payload: {
        billId,
        providerName: result.providerName,
        success: result.success,
        requiresManualAction: result.success
          ? result.requiresManualAction
          : false,
        error: result.success
          ? null
          : "error" in result
            ? result.error
            : null,
      },
    });
    revalidatePath("/vault");
    return {
      ok: true,
      from,
      to: transition.bill.status,
      providerName: result.providerName,
      transactionId:
        "transactionId" in result ? result.transactionId : undefined,
      requiresManualAction: result.success
        ? result.requiresManualAction
        : false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] executeBillPayment failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Retry a bill in a degraded state. Validates that the bill is
 * in a legal source state (FAILED_RETRYABLE / INSUFFICIENT_FUNDS /
 * REQUIRES_REVIEW / MANUAL_ACTION_REQUIRED), calls `RETRY` to
 * funnel it back to EARNING, then runs the gateway.
 */
export async function retryBillPaymentAction(
  billId: string,
): Promise<ExecuteBillPaymentResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  try {
    const ctx = await loadBillAndVault(billId, user.id);
    if (!ctx) return { ok: false, error: `bill not found: ${billId}` };
    const { bill, vault } = ctx;
    const RETRYABLE = new Set([
      "INSUFFICIENT_FUNDS",
      "REQUIRES_REVIEW",
      "MANUAL_ACTION_REQUIRED",
      "FAILED_RETRYABLE",
    ]);
    if (!RETRYABLE.has(bill.status)) {
      return {
        ok: false,
        error: `cannot retry from ${bill.status}`,
        reason: `Bill is in ${bill.status}; retry only valid from a degraded state.`,
      };
    }
    // Step 1: RETRY → EARNING (or → SETTLED if manual-action confirm).
    // For most degraded states, RETRY funnels to EARNING.
    const retryEvent: BillEvent = { type: "RETRY" };
    const from = bill.status;
    const retryTransition = await transitionBillDb(user.id, bill.id, retryEvent);
    if (!retryTransition.ok) {
      return { ok: false, error: retryTransition.error };
    }
    // Step 2: re-enter the gateway with the now-EARNING bill.
    const gate = await canExecuteGate(retryTransition.bill, vault);
    if (!gate.ok) {
      // Retry succeeded (bill is EARNING again) but the gate now
      // refuses — return a partial result so the UI can show the
      // new state plus the gate's reason.
      revalidatePath("/vault");
      return { ok: false, error: gate.reason, reason: gate.reason };
    }
    const idempotencyKey = executionIdempotencyKey(bill.id, new Date());
    const gateway = OffRampGateway.buildDefault(user.id);
    // Drive the same 3 transitions as executeBillPaymentAction:
    // EARNING → BEGIN_SETTLEMENT → PREPARING_SETTLEMENT → EXECUTE
    // → EXECUTING → CONFIRM_SETTLED / MANUAL_ACTION_REQUIRED /
    // FAIL_FINAL.
    const begin = await transitionBillDb(user.id, bill.id, { type: "BEGIN_SETTLEMENT" });
    if (!begin.ok) return { ok: false, error: begin.error };
    const exec = await transitionBillDb(user.id, bill.id, { type: "EXECUTE" });
    if (!exec.ok) return { ok: false, error: exec.error };
    const result = await gateway.executePayment(exec.bill, idempotencyKey);
    const event = eventFromResult(result, exec.bill);
    const transition = await transitionBillDb(user.id, bill.id, event);
    if (!transition.ok) {
      return { ok: false, error: transition.error };
    }
    revalidatePath("/vault");
    return {
      ok: true,
      from,
      to: transition.bill.status,
      providerName: result.providerName,
      transactionId:
        "transactionId" in result ? result.transactionId : undefined,
      requiresManualAction: result.success
        ? result.requiresManualAction
        : false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] retryBillPayment failed:", message);
    return { ok: false, error: message };
  }
}

export type ConfirmManualResult =
  | { ok: true; from: string; to: string; settlementRef: string }
  | { ok: false; error: string };

/**
 * Mark a bill paid out-of-band. The user pays the biller directly
 * (because the gateway fell back to Manual Push, or every provider
 * failed), then confirms here. Transitions the bill from
 * MANUAL_ACTION_REQUIRED or FAILED_FINAL to SETTLED with
 * `providerName: "manual"`.
 *
 * `settlementRef` is a free-form string the user types — typically
 * a confirmation number from the biller. Required.
 */
export async function confirmManualPaymentAction(
  billId: string,
  settlementRef: string,
): Promise<ConfirmManualResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "not signed in" };
  }
  if (typeof settlementRef !== "string" || settlementRef.trim().length === 0) {
    return { ok: false, error: "settlementRef is required" };
  }
  try {
    const ctx = await loadBillAndVault(billId, user.id);
    if (!ctx) return { ok: false, error: `bill not found: ${billId}` };
    const { bill } = ctx;
    const VALID_FROM = new Set([
      "MANUAL_ACTION_REQUIRED",
      "FAILED_FINAL",
      "EXECUTING",
      "REQUIRES_REVIEW",
    ]);
    if (!VALID_FROM.has(bill.status)) {
      return {
        ok: false,
        error: `cannot confirm manual payment from ${bill.status}`,
      };
    }
    const event: BillEvent = {
      type: "CONFIRM_SETTLED",
      providerName: "manual",
      transactionId: settlementRef.trim(),
    };
    const from = bill.status;
    const transition = await transitionBillDb(user.id, bill.id, event);
    if (!transition.ok) {
      return { ok: false, error: transition.error };
    }
    // Audit the manual settlement explicitly.
    await recordVaultAudit({
      userId: user.id,
      actionType: "vault.payment_manually_confirmed",
      payload: {
        billId,
        settlementRef: settlementRef.trim(),
        from,
      },
    });
    revalidatePath("/vault");
    return {
      ok: true,
      from,
      to: transition.bill.status,
      settlementRef: settlementRef.trim(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault] confirmManualPayment failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Local row → domain-type converters. The Prisma row shapes differ
 * slightly from the public ScheduledBill + VaultAccount types
 * (camelCase vs snake_case, Date → ISO string, etc.), so we map
 * inline rather than depending on `db.ts`'s internal helpers.
 */
export function toScheduledBillLocal(row: any): ScheduledBill {
  return {
    id: row.id,
    vaultId: row.vaultId,
    envelopeId: row.envelopeId,
    billerName: row.billerName,
    billerId: row.billerId,
    maskedAccountNumber: row.maskedAccountNumber,
    amount: row.amount,
    maxAuthorizedAmount: row.maxAuthorizedAmount,
    currency: "USD",
    frequency: row.frequency,
    dueDate:
      row.dueDate instanceof Date
        ? row.dueDate.toISOString().slice(0, 10)
        : row.dueDate,
    executionWindowStart:
      row.executionWindowStart instanceof Date
        ? row.executionWindowStart.toISOString()
        : row.executionWindowStart,
    executionWindowEnd:
      row.executionWindowEnd instanceof Date
        ? row.executionWindowEnd.toISOString()
        : row.executionWindowEnd,
    status: row.status,
    providerPreference: row.providerPreference ?? undefined,
    lastAttemptAt:
      row.lastAttemptAt instanceof Date
        ? row.lastAttemptAt.toISOString()
        : row.lastAttemptAt ?? undefined,
    settlementReference: row.settlementReference ?? undefined,
    appliedYieldCents: row.appliedYieldCents ?? undefined,
    source: row.source ?? undefined,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export function toVaultAccountLocal(row: any): VaultAccount {
  return {
    id: row.id,
    userId: row.userId,
    chainId: row.chainId,
    smartAccountAddress: row.smartAccountAddress,
    signerAddress: row.signerAddress ?? undefined,
    baseAsset: "USDC",
    status: row.status,
    availableBalance: row.availableBalance,
    settlementReserve: row.settlementReserve,
    deployedToYield: row.deployedToYield,
    accruedYield: row.accruedYield,
    simulatedApy: row.simulatedApy,
    onChainUsdcBalanceCents: row.onChainUsdcBalanceCents,
    onChainBalanceRefreshedAt:
      row.onChainBalanceRefreshedAt instanceof Date
        ? row.onChainBalanceRefreshedAt.toISOString()
        : row.onChainBalanceRefreshedAt ?? null,
    onChainAUsdcBalanceCents: row.onChainAUsdcBalanceCents,
    aUsdcBalanceRefreshedAt:
      row.aUsdcBalanceRefreshedAt instanceof Date
        ? row.aUsdcBalanceRefreshedAt.toISOString()
        : row.aUsdcBalanceRefreshedAt ?? null,
    aUsdcTokenAddress: row.aUsdcTokenAddress ?? undefined,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}
