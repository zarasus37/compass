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
  userHasVaultData,
  type VaultDbSnapshot,
} from "./db";
import { seedVaultFromEnvelopes, type SeedResult } from "./seed";
import { deriveMockVault } from "./mock-data";
import type { VaultSnapshot } from "./mock-data";

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
