/**
 * Compass Vault — mock data layer (Phase 1.0).
 *
 * Derives a `VaultAccount` + `VaultEnvelope[]` + `ScheduledBill[]` from
 * the existing Compass in-memory store. No new Prisma tables; no real
 * yield calls; no real off-ramp.
 *
 * Source data (read inside the server component):
 *   - `liveEnvelopes()` from `@/lib/mock` — the 7 seeded envelopes
 *   - `liveBills()`     from `@/lib/mock` — the 6 seeded bills
 *
 * The mapping rules:
 *   - VAULT_ENVELOPE.category is derived from the envelope's `planet`
 *     (the seeded plan: rent → sol, utilities → mercury, debt → saturn,
 *     etc.) with a name-pattern fallback for envelopes that don't have
 *     a planet match. This is the same kind of "envelope purpose
 *     inference" Cluster 1.8 already does for autopay routing.
 *   - VAULT_ENVELOPE.principalAllocated == envelope.current (cents).
 *     We're not "moving" any money; we're saying "this much of the
 *     envelope's balance is currently locked against upcoming bills."
 *   - VAULT_ENVELOPE.reservedForBills == sum of `amount` across all
 *     bills whose envelopeId points to this envelope.
 *   - VAULT_ENVELOPE.accruedYield is computed by `calculateEnvelopeYield`
 *     from the simulated yield pool (see below).
 *   - SCHEDULED_BILL.amount == source bill.amountCents, with
 *     `maxAuthorizedAmount` set to amount * 1.05 (5% policy headroom
 *     for variable bills like utilities). The execution window
 *     defaults to [dueDay-3, dueDay+1] in the current period.
 *   - Vault simulated APY is 0.0352 (3.52%) per spec — Sky sUSDS
 *     reference. Surfaced as "variable estimated APY" in the UI.
 *
 * Yield simulation:
 *   The vault's total accrued yield is a deterministic function of
 *   the deployed-to-yield principal, the simulated APY, and the
 *   number of days the principal has been deployed. For Phase 1
 *   we use a fixed "days deployed = 14" (one pay period) so the
 *   number is stable and easy to reason about across renders. The
 *   daily yield is `principal * apy / 365`, summed across envelopes,
 *   and attributed back by capital share.
 *
 * Phase 1.0 note: every value here is local and deterministic.
 * Nothing writes to the store, nothing persists across reloads. The
 * /vault page is a faithful simulation of the spec — the persistence
 * is Phase 2.
 */

import {
  liveEnvelopes,
  liveBills,
  TODAY,
  PERIOD_START,
} from "@/lib/mock";
import {
  calculateEnvelopeYield,
  sumAttributedYields,
} from "./yield";
import type {
  VaultAccount,
  VaultEnvelope,
  EnvelopeCategory,
  ScheduledBill,
  YieldEvent,
  BillStatus,
  BillFrequency,
  VaultAlertState,
  OffRampAdapterStatus,
} from "./types";
import { deriveAlertState } from "./state-machine";

// ──────────────────────────────────────────────────────────────────────
// Constants — tuned for the demo persona. Change here, see everywhere.
// ──────────────────────────────────────────────────────────────────────

/** Sky sUSDS reference rate. Spec: never promise fixed APY in copy. */
const SIMULATED_APY = 0.0352;
/** Days the principal has been deployed (one pay period). */
const DAYS_DEPLOYED = 14;
/** 5% headroom on `maxAuthorizedAmount` for variable bills (utilities). */
const MAX_HEADROOM = 0.05;
/** Day-of-month -> execution window. Days before the due day. */
const EXEC_WINDOW_DAYS_BEFORE = 3;
/** Days after the due day the window stays open (slack for retries). */
const EXEC_WINDOW_DAYS_AFTER = 1;

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export interface VaultSnapshot {
  vault: VaultAccount;
  envelopes: VaultEnvelope[];
  bills: ScheduledBill[];
  yieldEvents: YieldEvent[];
  offRampAdapters: OffRampAdapterStatus[];
  /** Single-line alert state. Same as `deriveAlertState(...)` for the same inputs. */
  alert: VaultAlertState;
  /** Sum of envelope `accruedYield`. Equals `vault.accruedYield` up to rounding. */
  totalAttributedYield: number;
  /** Bills grouped by user-facing status language, for the table. */
  billsByLabel: Record<string, ScheduledBill[]>;
  /**
   * Phase 2.5 — The user's vault preferences. Surfaces the
   * yield-routing strategy and the risk-disclosure ack timestamp
   * so the page can render pickers + conditional disclosure
   * without a round-trip.
   */
  preferences: import("./types").VaultPreferences;
  /**
   * Phase 3.0 — The active yield adapter's display info. The
   * [SYNC] REFRESH button reads `name` + `lastRefreshedAt` to
   * render the source label + the "refreshed HH:MM:SS" line.
   * `source` is the YieldSource enum value (SKY / AAVE / OTHER)
   * for future per-envelope yield routing.
   */
  yieldAdapter: {
    name: string;
    source: import("./types").YieldSource;
    lastRefreshedAt: string | null;
  };
  /** Top-line KPIs for the 5-cell status strip. */
  kpis: {
    /** `vault.availableBalance` (cents). */
    vaultPrincipal: number;
    /** Sum of `amount` across all bills (cents). */
    billsCovered: number;
    /** Count of bills that are EARNING / FUNDED / PREPARING / EXECUTING. */
    billsScheduledCount: number;
    /** Count of bills in any "needs action" state. */
    billsNeedsActionCount: number;
    /** `vault.accruedYield` (cents). */
    yieldEarned: number;
    /** Earliest non-settled bill, or null. */
    nextExecution: ScheduledBill | null;
    /** Funds immediately available for redemption (cents). */
    liquidBuffer: number;
    /**
     * Phase 4.0 (M2) — on-chain USDC balance, in integer cents. The
     * in-memory mock always returns 0 (no chain); the DB-sourced
     * path returns the cached value from `VaultAccount`.
     */
    onChainUsdcBalanceCents: number;
    /**
     * Phase 4.0 (M2) — last time the on-chain USDC balance was
     * refreshed. Null until the first refresh. The page surfaces
     * "refreshed HH:MM:SS" next to the [REFRESH] BALANCE button.
     */
    onChainBalanceRefreshedAt: string | null;
    /**
     * Phase 4.0 (M3) — aUSDC balance, in integer cents. Same
     * 0 / null story in the in-memory mock.
     */
    onChainAUsdcBalanceCents: number;
    /**
     * Phase 4.0 (M3) — last time the aUSDC balance was refreshed.
     * Null until the first supply.
     */
    aUsdcBalanceRefreshedAt: string | null;
  };
}

// ──────────────────────────────────────────────────────────────────────
// Envelope category mapping
// ──────────────────────────────────────────────────────────────────────

/**
 * Map envelope name + planet → EnvelopeCategory. The seeded envelopes
 * use planetary names; for custom envelopes (name only) we fall back
 * to a keyword scan. Same approach Cluster 1.8 uses for autopay
 * routing.
 */
function deriveCategory(name: string, planet?: string | null): EnvelopeCategory {
  const n = name.toLowerCase();
  if (planet === "sol" || /\brent\b|\bmortgage\b/.test(n)) return "RENT";
  if (
    planet === "mercury" ||
    /\butilit|\belectric|\bwater|\binternet|\bgas\b/.test(n)
  ) {
    return "UTILITIES";
  }
  if (planet === "saturn" || /\bdebt\b|\bcredit\b|\bloan\b/.test(n)) return "DEBT";
  if (/\binsur|\bhealth\b|\bauto\b|\bcoverage\b/.test(n)) return "INSURANCE";
  if (/\bsubscri|\bstream|\bspotify|\bnetflix\b|\bchatgpt\b/.test(n)) {
    return "SUBSCRIPTION";
  }
  return "OTHER";
}

/** Map Compass bill cadence string → BillFrequency enum. */
function deriveFrequency(cadence: string): BillFrequency {
  switch (cadence) {
    case "weekly":
      return "WEEKLY";
    case "biweekly":
    case "semi_monthly":
    case "monthly":
      return "MONTHLY";
    case "quarterly":
      return "QUARTERLY";
    case "annual":
      return "ANNUALLY";
    default:
      return "MONTHLY";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────

export function deriveMockVault(userId: string = "user-mom"): VaultSnapshot {
  const sourceEnvelopes = liveEnvelopes();
  const sourceBills = liveBills();

  // Index bills by envelopeId once.
  const billsByEnvelope = new Map<string, typeof sourceBills>();
  for (const b of sourceBills) {
    if (!b.envelopeId) continue;
    const list = billsByEnvelope.get(b.envelopeId) ?? [];
    list.push(b);
    billsByEnvelope.set(b.envelopeId, list);
  }

  // ── Pass 1: build vault envelopes with reservedForBills.
  const envelopes: VaultEnvelope[] = sourceEnvelopes.map((e) => {
    const linkedBills = billsByEnvelope.get(e.id) ?? [];
    const reserved = linkedBills.reduce(
      (s, b) => s + b.amountCents,
      0,
    );
    const nextDue = linkedBills
      .filter((b) => b.paidAt === null)
      .map((b) => dueDateForBill(b.dueDay, TODAY))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return {
      id: `vaultenv-${e.id}`,
      vaultId: "vault-mom",
      compassEnvelopeId: e.id,
      name: e.name,
      category: deriveCategory(e.name, e.planet),
      principalAllocated: e.current,
      accruedYield: 0, // filled in pass 2
      reservedForBills: reserved,
      availableToReallocate: Math.max(0, e.current - reserved),
      isPolicyLocked: e.current > 0, // soft lock while funding is in
      nextObligationDate: nextDue ? toLocalISODate(nextDue) : undefined,
      status: "CALM", // filled in pass 3
    };
  });

  // ── Pass 2: compute yield by capital share.
  // Eligible principal = sum of envelope.principalAllocated across
  // envelopes that have a non-zero allocation. We treat every cent
  // as yield-eligible in Phase 1 (the spec's "settlement reserve" is
  // a Phase 3 refinement).
  const totalEligible = envelopes.reduce(
    (s, e) => s + e.principalAllocated,
    0,
  );
  const dailyYield = (totalEligible * SIMULATED_APY) / 365;
  const totalAccrued = Math.round(dailyYield * DAYS_DEPLOYED);

  for (const env of envelopes) {
    env.accruedYield = calculateEnvelopeYield(
      env.principalAllocated,
      totalEligible,
      totalAccrued,
    );
  }

  // Total attributed should equal total accrued up to ±1 cent per
  // envelope. We surface both numbers on the page so the user can
  // see the reconciliation.
  const totalAttributed = sumAttributedYields(envelopes.map((e) => e.accruedYield));

  // ── Pass 3: derive envelope status from the bills.
  for (const env of envelopes) {
    const linkedBills = billsByEnvelope.get(env.compassEnvelopeId) ?? [];
    const anyOverdue = linkedBills.some((b) => {
      if (b.paidAt) return false;
      const due = dueDateForBill(b.dueDay, TODAY);
      return due.getTime() < TODAY.getTime();
    });
    const anyInsufficient = linkedBills.some((b) =>
      // Phase 1 demos these via the state machine, but for the
      // mock snapshot we mark INSUFFICIENT when reserved < amount
      // (should never happen because reserved = sum(amount), but
      // future phases will model "partial funding" differently).
      env.reservedForBills < b.amountCents,
    );
    if (env.isPolicyLocked && anyInsufficient) {
      env.status = "LOCKED";
    } else if (anyOverdue) {
      env.status = "WATCH";
    } else if (env.principalAllocated > env.reservedForBills * 1.5) {
      env.status = "OVER";
    } else {
      env.status = "CALM";
    }
  }

  // ── Pass 4: build scheduled bills.
  const bills: ScheduledBill[] = sourceBills.map((b) => {
    const due = dueDateForBill(b.dueDay, TODAY);
    const windowStart = new Date(due);
    windowStart.setDate(due.getDate() - EXEC_WINDOW_DAYS_BEFORE);
    const windowEnd = new Date(due);
    windowEnd.setDate(due.getDate() + EXEC_WINDOW_DAYS_AFTER);
    const maxAuth = Math.round(b.amountCents * (1 + MAX_HEADROOM));
    const status: BillStatus = b.paidAt !== null
      ? "SETTLED"
      : b.autopay
        ? "EARNING"
        : "FUNDED";
    return {
      id: `sched-${b.id}`,
      vaultId: "vault-mom",
      envelopeId: `vaultenv-${b.envelopeId ?? "unassigned"}`,
      billerName: b.name,
      billerId: b.id,
      maskedAccountNumber: "•••• 4218",
      amount: b.amountCents,
      maxAuthorizedAmount: maxAuth,
      currency: "USD",
      frequency: deriveFrequency("monthly"),
      dueDate: toLocalISODate(due),
      executionWindowStart: windowStart.toISOString(),
      executionWindowEnd: windowEnd.toISOString(),
      status,
      providerPreference: b.autopay ? "spritz" : "monto",
      lastAttemptAt: undefined,
      settlementReference: b.paidAt ?? undefined,
      createdAt: new Date(PERIOD_START).toISOString(),
      updatedAt: new Date(TODAY).toISOString(),
    };
  });

  // ── Pass 5: synthetic yield events (one per envelope that earned).
  const yieldEvents: YieldEvent[] = envelopes
    .filter((e) => e.accruedYield > 0)
    .map((e) => ({
      id: `yield-${e.id}-${TODAY.getTime()}`,
      vaultId: "vault-mom",
      envelopeId: e.id,
      asset: "sUSDS" as const,
      amount: e.accruedYield,
      annualizedRate: SIMULATED_APY,
      source: "SKY" as const,
      action: "ACCRUED" as const,
      occurredAt: new Date(TODAY).toISOString(),
    }));

  // ── Pass 6: vault account.
  const deployedToYield = envelopes.reduce(
    (s, e) => s + Math.max(0, e.principalAllocated - e.reservedForBills),
    0,
  );
  const reserved = envelopes.reduce((s, e) => s + e.reservedForBills, 0);
  const liquidBuffer = Math.max(0, deployedToYield - reserved);
  const vault: VaultAccount = {
    id: "vault-mom",
    userId,
    chainId: 1,
    smartAccountAddress: "0xMOCK0000000000000000000000000000000000DEAD",
    baseAsset: "USDC",
    status: "ACTIVE",
    availableBalance: totalEligible,
    settlementReserve: 0,
    deployedToYield,
    accruedYield: totalAccrued,
    simulatedApy: SIMULATED_APY,
    // Phase 4.0 (M2) — the in-memory mock has no on-chain
    // balance. Always 0 / null.
    onChainUsdcBalanceCents: 0,
    onChainBalanceRefreshedAt: null,
    // Phase 4.0 (M3) — same story for the aUSDC balance.
    onChainAUsdcBalanceCents: 0,
    aUsdcBalanceRefreshedAt: null,
    createdAt: new Date(PERIOD_START).toISOString(),
    updatedAt: new Date(TODAY).toISOString(),
  };

  // ── Pass 7: alert state.
  const alert = deriveAlertState(vault.status, bills);

  // ── Pass 8: KPIs.
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

  // ── Pass 9: bills-by-label for the schedule table.
  const billsByLabel: Record<string, ScheduledBill[]> = {};
  for (const b of bills) {
    const label = labelForStatus(b.status);
    (billsByLabel[label] ||= []).push(b);
  }

  // ── Pass 10: off-ramp adapter status panel.
  const offRampAdapters: OffRampAdapterStatus[] = [
    {
      name: "Spritz",
      available: true,
      note: "Mock — always succeeds (Phase 1)",
      isActive: false,
    },
    {
      name: "Monto",
      available: true,
      note: "Mock — always succeeds (Phase 1)",
      isActive: false,
    },
    {
      name: "Manual Push",
      available: true,
      note: "Fallback — always MANUAL_ACTION_REQUIRED (Phase 1)",
      isActive: false,
    },
  ];

  return {
    vault,
    envelopes,
    bills,
    yieldEvents,
    offRampAdapters,
    alert,
    totalAttributedYield: totalAttributed,
    billsByLabel,
    // Phase 1.0 in-memory mock has no DB-backed preferences; the
    // page reads from `loadCurrentVaultSnapshot` (DB-sourced) for
    // real data. This stub exists so the type stays complete and
    // the unit tests can still construct a VaultSnapshot.
    preferences: {
      id: "mock-prefs",
      userId: "mock-user",
      yieldRoutingStrategy: "COMPOUND",
      riskAcknowledgedAt: null,
      offRampProvider: "MOCK",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Phase 3.0 — the in-memory mock always reports the Mock
    // adapter with no last-refresh timestamp. The user-facing
    // path reads the live adapter via `loadCurrentVaultSnapshot`.
    yieldAdapter: {
      name: "Mock",
      source: "OTHER",
      lastRefreshedAt: null,
    },
    kpis: {
      vaultPrincipal: vault.availableBalance,
      billsCovered,
      billsScheduledCount,
      billsNeedsActionCount,
      yieldEarned: vault.accruedYield,
      nextExecution,
      liquidBuffer,
      // Phase 4.0 (M2) — the in-memory mock has no on-chain
      // balance. The DB-sourced path (used in production) reads
      // these from `VaultAccount.onChainUsdcBalanceCents` /
      // `onChainBalanceRefreshedAt`.
      onChainUsdcBalanceCents: 0,
      onChainBalanceRefreshedAt: null,
      // Phase 4.0 (M3) — same story for the aUSDC balance.
      // The DB-sourced path reads from
      // `VaultAccount.onChainAUsdcBalanceCents` /
      // `aUsdcBalanceRefreshedAt`. The in-memory mock always
      // returns 0 / null.
      onChainAUsdcBalanceCents: 0,
      aUsdcBalanceRefreshedAt: null,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Local-date construction per the spec. `today` is the current period
 * anchor; we project a `dueDay` (1-31) into the current month. If
 * `dueDay` has already passed in the current month, we project into
 * next month so the schedule always shows upcoming bills.
 */
function dueDateForBill(dueDay: number, today: Date): Date {
  const safeDay = Math.max(1, Math.min(31, Math.floor(dueDay)));
  const candidate = new Date(
    today.getFullYear(),
    today.getMonth(),
    safeDay,
    9, // 9am local — keeper-friendly
    0,
    0,
    0,
  );
  if (candidate.getTime() < today.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

/** YYYY-MM-DD in the server's local time. */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mirror of `userLabel()` from state-machine.ts; kept here to avoid
 * a circular import in tests that import only this module. */
function labelForStatus(status: BillStatus): string {
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
