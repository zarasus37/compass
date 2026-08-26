/**
 * Compass Vault — seed.
 *
 * Hydrates the vault tables (VaultAccount, VaultEnvelope, ScheduledBill,
 * YieldEvent) from the in-memory `liveEnvelopes()` + `liveBills()`
 * sources. Idempotent: re-running replaces the same rows (uses
 * upsert keyed on unique indexes). Safe to call from a "Sync from
 * envelopes" button on the /vault page or a server action.
 *
 * Phase 2.0 scope: this seeds a *simulated* vault. The APY is
 * hardcoded, the yield is a deterministic function of
 * `principal * apy * daysDeployed / 365`, and the attribution is
 * by capital share. Phase 3 swaps in a real yield adapter.
 *
 * Why idempotent (not "wipe + insert"): the seed is also called
 * from the "Sync from envelopes" button, which the user may
 * click multiple times. The `Wipe` projection pattern from 5.2.5
 * would lose audit-log entries between syncs. Upsert preserves
 * the append-only ledger.
 */

import "server-only";
import { liveEnvelopes, liveBills, TODAY, PERIOD_START } from "@/lib/mock";
import {
  getOrCreateVault,
  upsertVaultEnvelope,
  upsertScheduledBill,
  setVaultEnvelopeYield,
  recordYieldEvent,
  refreshVaultAggregates,
  recordVaultAudit,
} from "./db";
import { calculateEnvelopeYield } from "./yield";
import { getActiveYieldAdapter } from "./yield-adapters";

// ──────────────────────────────────────────────────────────────────────
// Constants (the APY is now sourced from the active yield adapter;
// the other constants stay local for now).
// ──────────────────────────────────────────────────────────────────────

const DAYS_DEPLOYED = 14;
const MAX_HEADROOM = 0.05;
const EXEC_WINDOW_DAYS_BEFORE = 3;
const EXEC_WINDOW_DAYS_AFTER = 1;

// ──────────────────────────────────────────────────────────────────────
// Public result
// ──────────────────────────────────────────────────────────────────────

export interface SeedResult {
  vaultId: string;
  envelopesUpserted: number;
  billsUpserted: number;
  yieldEventsCreated: number;
  totalAccruedYield: number;
  source: {
    envelopes: number;
    bills: number;
  };
}

// ──────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────

/**
 * Seed (or re-sync) the vault for `userId` from the live
 * `liveEnvelopes()` + `liveBills()` reads. Idempotent.
 */
export async function seedVaultFromEnvelopes(
  userId: string,
): Promise<SeedResult> {
  const sourceEnvelopes = liveEnvelopes();
  const sourceBills = liveBills();

  // Read the active yield adapter's APY for the seed. The adapter
  // may throw (env misconfigured, etc.) — we fall back to 0 so
  // the seed still completes; the audit log entry below records
  // the fallback.
  let apy: number;
  let adapterName: string;
  try {
    const adapter = getActiveYieldAdapter();
    apy = await adapter.getCurrentApy();
    adapterName = adapter.name;
  } catch {
    apy = 0;
    adapterName = "fallback";
  }

  // Index bills by envelopeId once so the envelope pass is O(1)
  // per envelope.
  const billsByEnvelope = new Map<
    string,
    Array<(typeof sourceBills)[number]>
  >();
  for (const b of sourceBills) {
    if (!b.envelopeId) continue;
    const list = billsByEnvelope.get(b.envelopeId) ?? [];
    list.push(b);
    billsByEnvelope.set(b.envelopeId, list);
  }

  // Get or create the vault row.
  const vault = await getOrCreateVault(userId);
  const vaultId = vault.id;
  // Phase 3.0 — ensure the vault's cached simulatedApy matches
  // the active adapter's APY on every seed.
  if (vault.simulatedApy !== apy) {
    const { prisma } = await import("@/server/db");
    await prisma.vaultAccount.update({
      where: { id: vault.id },
      data: { simulatedApy: apy },
    });
  }

  // Pass 1: upsert every envelope, with `reservedForBills`
  // computed from the linked bills.
  let envelopesUpserted = 0;
  for (const e of sourceEnvelopes) {
    const linkedBills = billsByEnvelope.get(e.id) ?? [];
    const reserved = linkedBills.reduce((s, b) => s + b.amountCents, 0);
    const nextDue = pickNextDue(linkedBills);
    await upsertVaultEnvelope({
      vaultId,
      compassEnvelopeId: e.id,
      name: e.name,
      category: deriveCategory(e.name, e.planet) as
        | "RENT"
        | "UTILITIES"
        | "INSURANCE"
        | "DEBT"
        | "SUBSCRIPTION"
        | "OTHER",
      principalAllocated: e.current,
      reservedForBills: reserved,
      availableToReallocate: Math.max(0, e.current - reserved),
      isPolicyLocked: e.current > 0,
      nextObligationDate: nextDue,
      status: deriveEnvelopeStatus(e.current, reserved) as
        | "CALM"
        | "WATCH"
        | "OVER"
        | "LOCKED",
    });
    envelopesUpserted += 1;
  }

  // Pass 2: compute yield by capital share, set per-envelope
  // accruedYield, write one YieldEvent per envelope.
  const totalEligible = sourceEnvelopes.reduce((s, e) => s + e.current, 0);
  const totalAccrued = Math.round(
    (totalEligible * apy * DAYS_DEPLOYED) / 365,
  );
  let yieldEventsCreated = 0;
  for (const e of sourceEnvelopes) {
    const envelopeYield = calculateEnvelopeYield(
      e.current,
      totalEligible,
      totalAccrued,
    );
    // Find the vault envelope we just upserted.
    const { prisma } = await import("@/server/db");
    const vEnv = await prisma.vaultEnvelope.findUnique({
      where: { compassEnvelopeId: e.id },
    });
    if (!vEnv) continue;
    await setVaultEnvelopeYield(vEnv.id, envelopeYield);
    if (envelopeYield > 0) {
      // Phase 3.0 — the YieldEvent's `source` now matches the
      // active adapter (SKY / AAVE / OTHER). The asset stays
      // sUSDS for the Sky adapter; future AaveAdapter can
      // override this if needed.
      const yieldSource: "AAVE" | "SKY" | "OTHER" =
        adapterName === "Sky"
          ? "SKY"
          : adapterName === "Aave"
            ? "AAVE"
            : "OTHER";
      await recordYieldEvent({
        vaultId,
        envelopeId: vEnv.id,
        asset: "sUSDS",
        amount: envelopeYield,
        annualizedRate: apy,
        source: yieldSource,
        action: "ACCRUED",
      });
      yieldEventsCreated += 1;
    }
  }

  // Pass 3: upsert every bill.
  let billsUpserted = 0;
  for (const b of sourceBills) {
    const { prisma } = await import("@/server/db");
    const vEnv = b.envelopeId
      ? await prisma.vaultEnvelope.findUnique({
          where: { compassEnvelopeId: b.envelopeId },
        })
      : null;
    if (!vEnv) continue; // skip bills with no envelope mapping
    const due = dueDateForBill(b.dueDay, TODAY);
    const windowStart = new Date(due);
    windowStart.setDate(due.getDate() - EXEC_WINDOW_DAYS_BEFORE);
    const windowEnd = new Date(due);
    windowEnd.setDate(due.getDate() + EXEC_WINDOW_DAYS_AFTER);
    const maxAuth = Math.round(b.amountCents * (1 + MAX_HEADROOM));
    const status =
      b.paidAt !== null ? "SETTLED" : b.autopay ? "EARNING" : "FUNDED";
    await upsertScheduledBill({
      vaultId,
      envelopeId: vEnv.id,
      billerName: b.name,
      billerId: b.id,
      maskedAccountNumber: "•••• 4218",
      amount: b.amountCents,
      maxAuthorizedAmount: maxAuth,
      frequency: "MONTHLY",
      dueDate: due,
      executionWindowStart: windowStart,
      executionWindowEnd: windowEnd,
      status,
      providerPreference: b.autopay ? "spritz" : "monto",
    });
    billsUpserted += 1;
  }

  // Pass 4: refresh the vault's top-level money aggregates.
  await refreshVaultAggregates(vaultId);

  // Pass 5: audit log entry.
  await recordVaultAudit({
    userId,
    actionType: "vault.synced",
    payload: {
      envelopesUpserted,
      billsUpserted,
      yieldEventsCreated,
      totalAccruedYield: totalAccrued,
      source: "liveEnvelopes + liveBills",
    },
  });

  return {
    vaultId,
    envelopesUpserted,
    billsUpserted,
    yieldEventsCreated,
    totalAccruedYield: totalAccrued,
    source: {
      envelopes: sourceEnvelopes.length,
      bills: sourceBills.length,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers (mirror Phase 1 mock-data; kept here so the seed is
// self-contained and can be re-evaluated without importing the
// page's mock layer).
// ──────────────────────────────────────────────────────────────────────

function deriveCategory(name: string, planet?: string | null): string {
  const n = name.toLowerCase();
  if (planet === "sol" || /\brent\b|\bmortgage\b/.test(n)) return "RENT";
  if (
    planet === "mercury" ||
    /\butilit|\belectric|\bwater|\binternet|\bgas\b/.test(n)
  ) {
    return "UTILITIES";
  }
  if (planet === "saturn" || /\bdebt\b|\bcredit\b|\bloan\b/.test(n))
    return "DEBT";
  if (/\binsur|\bhealth\b|\bauto\b|\bcoverage\b/.test(n)) return "INSURANCE";
  if (/\bsubscri|\bstream|\bspotify|\bnetflix\b|\bchatgpt\b/.test(n)) {
    return "SUBSCRIPTION";
  }
  return "OTHER";
}

function deriveEnvelopeStatus(
  currentCents: number,
  reservedCents: number,
): string {
  if (currentCents > 0 && currentCents < reservedCents) return "LOCKED";
  if (currentCents > reservedCents * 1.5) return "OVER";
  return "CALM";
}

function dueDateForBill(dueDay: number, today: Date): Date {
  const safeDay = Math.max(1, Math.min(31, Math.floor(dueDay)));
  const candidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    safeDay,
    9,
    0,
    0,
    0,
  );
  if (candidate.getTime() < today.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

function pickNextDue(
  bills: Array<{ dueDay: number; paidAt: string | null }>,
): Date | undefined {
  const upcoming = bills
    .filter((b) => b.paidAt === null)
    .map((b) => dueDateForBill(b.dueDay, TODAY))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return upcoming;
}

// Re-export for the test that needs the seed entry point in isolation.
export const _seedInternals = {
  DAYS_DEPLOYED,
  MAX_HEADROOM,
};

// Re-export so callers can import the source-of-truth date.
export { PERIOD_START };
