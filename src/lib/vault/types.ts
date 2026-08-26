/**
 * Compass Vault — domain types.
 *
 * Source: `DeFi/Compass vault spec.md` (extracted from the authored
 * docx — the docx is canonical; the md is a flat-text mirror for
 * agents / search / git diff).
 *
 * Money convention: integer cents, no exceptions. Display divides by 100;
 * math never does. This matches the Compass house rule documented in
 * AGENTS.md and used by every other monetary field in the project.
 *
 * Phase 1.0 scope (2026-08-25):
 *   - Types only. No real Safe address, no real yield adapter, no real
 *     off-ramp call. The `Address` type is a plain `string` here; the
 *     spec's `viem` branded `0x${string}` swaps in during Phase 3 when
 *     Safe actually deploys. Keeping the placeholder string keeps us off
 *     the viem dependency tree for a route that doesn't need it yet.
 *   - No new Prisma tables. These types are derived from the existing
 *     `Envelope` + `Bill` tables via `src/lib/vault/mock-data.ts`.
 */

// ──────────────────────────────────────────────────────────────────────
// Identity & Custody
// ──────────────────────────────────────────────────────────────────────

/**
 * A blockchain address. In Phase 3 this becomes viem's branded
 * `0x${string}` after we install viem for Safe integration. For
 * Phase 1.0 we accept any string; nothing on this page takes user-
 * supplied addresses (the placeholder smart-account address is
 * generated locally and never validated).
 */
export type Address = string;

/**
 * The two-tier base asset a vault holds. Phase 1 always uses USDC;
 * sUSDS only appears in the yield attribution display (as the
 * "earning" vehicle). Phase 3 widens this to multi-asset.
 */
export type VaultAsset = "USDC";

/** Lifecycle status of the vault itself, not the bills inside it. */
export type VaultAccountStatus = "ACTIVE" | "PAUSED" | "RECOVERY_MODE";

/**
 * The user's vault. One per user in Phase 1 (single-user assumption
 * matches the rest of Compass). Future multi-user: one row per
 * `userId`.
 */
export interface VaultAccount {
  id: string;
  userId: string;
  chainId: number;
  smartAccountAddress: Address;
  /**
   * Phase 4.0 (M1) — the EOA that owns the deployed Safe.
   * Set during the [DEPLOY] flow. Null until the user has
   * deployed a real Safe (i.e. the `smartAccountAddress` is
   * still the MOCK literal).
   */
  signerAddress?: Address;
  baseAsset: VaultAsset;
  status: VaultAccountStatus;
  /** Total reserves held for scheduled obligations (cents). */
  availableBalance: number;
  /** USDC actively being redeemed for an imminent payment (cents). */
  settlementReserve: number;
  /** Principal deployed into the yield strategy (cents). */
  deployedToYield: number;
  /** Cumulative yield earned across the vault's life (cents). */
  accruedYield: number;
  /**
   * Variable estimated APY as a decimal (0.0352 = 3.52%). Surfaced
   * in the UI as a "variable estimated APY" line. NEVER hardcode
   * a fixed rate in the user-visible copy — Sky Savings Rate is
   * governance-set and can change.
   */
  simulatedApy: number;
  /**
   * Phase 4.0 (M2) — on-chain USDC balance for the deployed Safe,
   * in integer cents. 0 until the first [REFRESH] BALANCE call
   * after deploy. Distinct from `availableBalance` (the *simulated*
   * sum of envelope principal) so the two views stay comparable on
   * the page.
   */
  onChainUsdcBalanceCents: number;
  /**
   * Phase 4.0 (M2) — last time the on-chain USDC balance was
   * refreshed (null until the first refresh). The page surfaces
   * "refreshed HH:MM:SS" next to the [REFRESH] BALANCE button.
   */
  onChainBalanceRefreshedAt: string | null;
  /**
   * Phase 4.0 (M3) — the Safe's aUSDC balance (the
   * interest-bearing receipt from Aave V3). 0 until the first
   * supply. Distinct from `onChainUsdcBalanceCents` (the raw
   * USDC the Safe holds before deposit). Together they describe
   * the Safe's total earning position.
   */
  onChainAUsdcBalanceCents: number;
  /**
   * Phase 4.0 (M3) — last time the aUSDC balance was refreshed.
   * Null until the first supply. The page surfaces this next
   * to the [REFRESH] AAVE BALANCE button.
   */
  aUsdcBalanceRefreshedAt: string | null;
  /**
   * Phase 4.0 (M3) — the aUSDC token address, resolved
   * dynamically from Aave V3's Pool.getReserveData(asset)
   * on the first supply and cached on the row. Subsequent
   * reads skip the Pool hop.
   */
  aUsdcTokenAddress?: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────
// Vault Envelopes (one per backing Compass envelope)
// ──────────────────────────────────────────────────────────────────────

/** Envelope categories the Vault understands. Mirrors the spec. */
export type EnvelopeCategory =
  | "RENT"
  | "UTILITIES"
  | "INSURANCE"
  | "DEBT"
  | "SUBSCRIPTION"
  | "OTHER";

/**
 * Envelope-level status. Driven by the bills that reference the
 * envelope:
 *   - CALM:    every bill fully reserved and on schedule
 *   - WATCH:   a bill is approaching its execution window and
 *              funding is below the cap
 *   - OVER:    the envelope is over its target (informational;
 *              user can reallocate the surplus)
 *   - LOCKED:  the envelope has a policy lock in effect (cannot
 *              reallocate until the lock expires)
 */
export type VaultEnvelopeStatus = "CALM" | "WATCH" | "OVER" | "LOCKED";

/**
 * The Vault-side projection of a Compass envelope. Principal reserved
 * for bills is NEVER reduced by yield routing (per spec). The
 * `availableToReallocate` field is the only field yield routing may
 * touch.
 */
export interface VaultEnvelope {
  id: string;
  vaultId: string;
  /** Back-reference to the live Compass envelope. */
  compassEnvelopeId: string;
  name: string;
  category: EnvelopeCategory;
  /** Principal locked against upcoming bills (cents). */
  principalAllocated: number;
  /** Cumulative yield attributed to this envelope (cents). */
  accruedYield: number;
  /** Sum of `amount` across all bills due from this envelope (cents). */
  reservedForBills: number;
  /** `principalAllocated - reservedForBills` (cents). */
  availableToReallocate: number;
  /** True when a policy lock is in effect (no reallocate allowed). */
  isPolicyLocked: boolean;
  /** ISO timestamp of the next bill due from this envelope, if any. */
  nextObligationDate?: string;
  status: VaultEnvelopeStatus;
}

// ──────────────────────────────────────────────────────────────────────
// Scheduled Bills (the 13-state machine)
// ──────────────────────────────────────────────────────────────────────

/**
 * The 13 states. The spec calls this `BillStatus`. We export the name
 * `BillStatus` for the public type; the runtime values are the strings
 * below.
 */
export type BillStatus =
  // Happy path
  | "DRAFT"
  | "FUNDED"
  | "EARNING"
  | "PREPARING_SETTLEMENT"
  | "EXECUTING"
  | "SETTLED"
  // Alternate / failure states
  | "INSUFFICIENT_FUNDS"
  | "PAUSED"
  | "REQUIRES_REVIEW"
  | "MANUAL_ACTION_REQUIRED"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "CANCELLED";

export type BillFrequency =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | "ONE_TIME";

/**
 * The Vault-side projection of a recurring Compass bill. The
 * execution window is the key new field the spec adds — it's the
 * keeper's `canExecute` gate's `now >= start && now <= end` check.
 */
export interface ScheduledBill {
  id: string;
  vaultId: string;
  envelopeId: string;
  billerName: string;
  billerId: string;
  /** Last-4 of the linked account, e.g. "•••• 4218". */
  maskedAccountNumber: string;
  amount: number;
  /** Hard cap enforced by the keeper (cents). */
  maxAuthorizedAmount: number;
  currency: "USD";
  frequency: BillFrequency;
  /** ISO date (YYYY-MM-DD) — local-date form per spec. */
  dueDate: string;
  /** ISO timestamp — earliest moment the keeper may execute. */
  executionWindowStart: string;
  /** ISO timestamp — latest moment the keeper may execute. */
  executionWindowEnd: string;
  status: BillStatus;
  /** Preferred off-ramp adapter id (e.g. "spritz", "monto"). */
  providerPreference?: string;
  lastAttemptAt?: string;
  /** Provider-supplied confirmation reference, set on SETTLED. */
  settlementReference?: string;
  /**
   * Phase 3.1 — Yield routed to this bill by the
   * `APPLY_TO_NEXT_BILL` strategy. Cents. The bill's effective
   * out-of-pocket cost at settlement is `amount - appliedYieldCents`.
   * Per the spec: "Principal reserved for bills is never reduced
   * by a yield-routing choice" — this field tracks the credit,
   * not a principal draw.
   */
  appliedYieldCents?: number;
  /**
   * Phase 3.5 — `seed` (migrated by the canonical seed pass from
   * `liveBills()`) or `user` (added via the vault's per-bill
   * editor). The seed pass only writes `source: "seed"` rows, so
   * user-added bills survive a re-sync.
   */
  source?: "seed" | "user";
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────
// Yield Events (immutable ledger of yield movements)
// ──────────────────────────────────────────────────────────────────────

export type YieldAsset = "USDC" | "USDS" | "sUSDS";
export type YieldSource = "AAVE" | "SKY" | "OTHER";
export type YieldAction =
  | "ACCRUED"
  | "COMPOUNDED"
  | "ALLOCATED_TO_BILL"
  | "MOVED_TO_AVAILABLE";

export interface YieldEvent {
  id: string;
  vaultId: string;
  envelopeId?: string;
  asset: YieldAsset;
  amount: number;
  /** Annualized rate as a decimal (0.0352 = 3.52%) at the time of the event. */
  annualizedRate?: number;
  source: YieldSource;
  action: YieldAction;
  occurredAt: string;
}

// ──────────────────────────────────────────────────────────────────────
// Off-Ramp Gateway
// ──────────────────────────────────────────────────────────────────────

/**
 * The discriminated result type. Three branches, by design:
 *   1. Fully automatic success — settlement confirmed.
 *   2. Degraded success — provider "accepted" or "processing" but
 *      not yet settled; user must be told to expect a delay.
 *   3. Failure — provider rejected the payment; may be retryable.
 *
 * The spec calls this `OffRampResult`. The union forces the UI to
 * handle each branch correctly (TypeScript will reject unhandled
 * cases in a switch).
 */
export type OffRampResult =
  | {
      success: true;
      providerName: string;
      transactionId: string;
      requiresManualAction: false;
    }
  | {
      success: true;
      providerName: string;
      transactionId?: string;
      requiresManualAction: true;
      warningMessage: string;
    }
  | {
      success: false;
      providerName: string;
      requiresManualAction: boolean;
      error: string;
      retryable: boolean;
    };

/** Off-ramp bill payment request — what the gateway hands the adapter. */
export interface OffRampRequest {
  billId: string;
  amount: number;
  currency: "USD";
  /** Provider preference hint, used as the gateway's first choice. */
  preferredProvider?: string;
  /**
   * Idempotency key. Every call to `executePayment` carries the same
   * key for retries of the same bill. The adapter must surface the
   * same `transactionId` for the same key.
   */
  idempotencyKey: string;
}

/**
 * The adapter contract. Phase 1 ships stub implementations
 * (SpritzAdapter, MontoAdapter, FallbackManualPushAdapter). Phase 3
 * wires them into an OffRampGateway; Phase 4 swaps in real
 * provider API integrations.
 */
export interface IOffRampAdapter {
  readonly name: string;
  /** Cheap, non-mutating health check. */
  isAvailable(): Promise<boolean>;
  /**
   * Submit a payment. The implementation MUST be idempotent on
   * `request.idempotencyKey` — re-submitting the same key returns
   * the same `transactionId`.
   */
  executePayment(request: OffRampRequest): Promise<OffRampResult>;
}

// ──────────────────────────────────────────────────────────────────────
// Yield Routing (user choice on what to do with accrued yield)
// ──────────────────────────────────────────────────────────────────────

/**
 * The four user-facing yield routing strategies. Default per spec
 * is COMPOUND. Persisted in `VaultPreferences.yieldRoutingStrategy`
 * starting Phase 2.5.
 */
export type YieldRoutingStrategy =
  | "COMPOUND"
  | "APPLY_TO_NEXT_BILL"
  | "MOVE_TO_AVAILABLE"
  | "SPLIT_BY_ENVELOPE";

// ──────────────────────────────────────────────────────────────────────
// Alert / health state
// ──────────────────────────────────────────────────────────────────────

/**
 * The single alert state for the whole vault, derived from the
 * underlying envelopes and bills. Drives the top-of-page banner.
 *   - CALM:           every bill fully reserved, no near-term risk
 *   - WATCH:          a bill is approaching its window and the
 *                     envelope is underfunded
 *   - ACTION_REQUIRED: a bill is in MANUAL_ACTION_REQUIRED /
 *                     INSUFFICIENT_FUNDS / FAILED_FINAL
 *   - PAUSED:         the user paused the vault
 */
export type VaultAlertState =
  | "CALM"
  | "WATCH"
  | "ACTION_REQUIRED"
  | "PAUSED";

/** A single off-ramp adapter status row, for the gateway panel. */
export interface OffRampAdapterStatus {
  name: string;
  available: boolean;
  /** Human-readable reason (e.g. "mock — always succeeds"). */
  note: string;
}

// ──────────────────────────────────────────────────────────────────────
// Phase 2.5 — Vault user preferences
// ──────────────────────────────────────────────────────────────────────

/** Human-readable label + em-tail for each strategy. The page renders
 *  the label as the primary text and the em as the secondary line. */
export const YIELD_ROUTING_LABEL: Record<YieldRoutingStrategy, string> = {
  COMPOUND: "Compound",
  APPLY_TO_NEXT_BILL: "Apply to next bill",
  MOVE_TO_AVAILABLE: "Move to available",
  SPLIT_BY_ENVELOPE: "Split by envelope",
};

/** One-line description of what the strategy does. */
export const YIELD_ROUTING_DESC: Record<YieldRoutingStrategy, string> = {
  COMPOUND:
    "Reinvest accrued yield back into the strategy. Principal reserved for bills is never reduced.",
  APPLY_TO_NEXT_BILL:
    "Route accrued yield to the next bill in the execution window.",
  MOVE_TO_AVAILABLE:
    "Move accrued yield into the available balance (redeemable now).",
  SPLIT_BY_ENVELOPE:
    "Distribute accrued yield across envelopes in proportion to their principal share.",
};

/**
 * The user's vault preferences. One row per user. Populated by
 * `getOrCreateVaultPreferences` in db.ts and surfaced on the
 * snapshot so the page can render pickers + persist without a
 * round-trip.
 */
export interface VaultPreferences {
  id: string;
  userId: string;
  yieldRoutingStrategy: YieldRoutingStrategy;
  /** ISO timestamp of when the user acknowledged the risk disclosure.
   *  Null = not yet acknowledged → the disclosure renders. */
  riskAcknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Re-export the bill event union from state-machine so callers can
 *  import everything vault-typed from a single module. */
export type { BillEvent } from "./state-machine";

// ──────────────────────────────────────────────────────────────────────
// Phase 3.0 — Yield adapter interface
// ──────────────────────────────────────────────────────────────────────

/**
 * The yield-adapter contract. The vault reads the current APY
 * from the active adapter (configured via `VAULT_YIELD_ADAPTER`),
 * rather than the Phase 1.0 hardcoded `simulatedApy = 0.0352`.
 *
 * Phase 3.0 ships 3 stub adapters (`MockYieldAdapter`,
 * `SkyAdapter`, `AaveAdapter`) that read from env vars. Phase 4
 * swaps in real provider API integrations. The interface
 * intentionally mirrors the off-ramp adapter contract
 * (`IOffRampAdapter` in `types.ts`) so the two gateway patterns
 * stay symmetric.
 */
export interface IYieldAdapter {
  /** Stable adapter name (e.g. "Mock", "Sky", "Aave"). */
  readonly name: string;
  /** Yield source — maps to the `YieldSource` enum. */
  readonly source: YieldSource;
  /**
   * The current annualised yield as a decimal (0.0352 = 3.52%).
   * Throws on provider error so the caller can record a
   * `vault.apy_refresh_failed` audit entry.
   */
  getCurrentApy(): Promise<number>;
  /**
   * A short human-readable note about where the APY came from.
   * The page surfaces this next to the live APY so the user
   * knows whether the value is real (Sky Savings Rate) or
   * simulated (a test value).
   */
  describe(): string;
}
