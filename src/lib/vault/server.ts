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
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/user";
import {
  loadVaultSnapshot,
  getOrCreateVault,
  getOrCreateVaultPreferences,
  setYieldRoutingStrategy,
  acknowledgeRisk,
  setVaultAccountStatus,
  transitionBillDb,
  recordVaultAudit,
  userHasVaultData,
  refreshVaultAggregates,
  USER_FACING_BILL_EVENTS,
  type VaultDbSnapshot,
  type UserFacingBillEvent,
} from "./db";
import { seedVaultFromEnvelopes, type SeedResult } from "./seed";
import { deriveMockVault } from "./mock-data";
import { legalNextStates } from "./state-machine";
import { getActiveYieldAdapter } from "./yield-adapters";
import type { VaultSnapshot } from "./mock-data";
import type { BillEvent, YieldRoutingStrategy } from "./types";

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
  await seedVaultFromEnvelopes(user.id);
  // Refresh the vault's top-level money aggregates.
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
    },
  });
  return {
    ok: true,
    apy,
    source: adapter.name,
    apyRefreshedAt: now.toISOString(),
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
