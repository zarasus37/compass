/**
 * Compass Vault — bill state machine.
 *
 * The 13-state machine from the spec. The keeper / off-ramp gateway
 * is the thing that DRIVES transitions; this module is the
 * authoritative table of what transitions are legal.
 *
 * Phase 1.0 scope:
 *   - Pure functions. No DB, no side effects, no I/O.
 *   - `transitionBill(bill, event)` returns either an updated bill
 *     (on a legal transition) or a typed error (on an illegal one).
 *   - The same module also exports the label table that maps the
 *     13 technical states to the 8 user-facing labels the spec's
 *     "Status Language" table calls for (EARNING, FUNDED, etc.).
 *
 * Happy path (per spec):
 *
 *   DRAFT → FUNDED → EARNING → PREPARING_SETTLEMENT → EXECUTING → SETTLED
 *
 * Alternate entry conditions (where a bill lands when something
 * goes wrong):
 *
 *   - INSUFFICIENT_FUNDS:    the envelope can't cover the amount
 *   - PAUSED:                the user paused the vault
 *   - REQUIRES_REVIEW:       off-ramp returned an ambiguous result
 *                            that the gateway wants a human to look
 *                            at
 *   - MANUAL_ACTION_REQUIRED: every off-ramp provider fell back to
 *                             the manual adapter (provider outage)
 *   - FAILED_RETRYABLE:      one provider failed, the gateway has
 *                            more to try
 *   - FAILED_FINAL:          every provider rejected
 *   - CANCELLED:             the user cancelled the bill
 */

/** Events that drive state transitions. */
export type BillEvent =
  | { type: "FUND" } // principal allocated to the bill's envelope
  | { type: "ENTER_EARN" } // funding complete; bill is now in yield
  | { type: "BEGIN_SETTLEMENT" } // keeper started the settlement flow
  | { type: "EXECUTE" } // off-ramp call started
  | { type: "CONFIRM_SETTLED"; transactionId: string; providerName: string }
  | { type: "INSUFFICIENT_FUNDS" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "REQUIRES_REVIEW" }
  | { type: "MANUAL_ACTION_REQUIRED"; reason: string }
  | { type: "RETRY" }
  | { type: "FAIL_FINAL"; error: string }
  | { type: "CANCEL" };

/** Result of an attempted transition. Discriminated union. */
export type TransitionResult =
  | { ok: true; bill: ScheduledBill }
  | { ok: false; error: string; from: BillStatus; event: BillEvent["type"] };

import type {
  BillStatus,
  ScheduledBill,
  VaultAlertState,
} from "./types";

// ──────────────────────────────────────────────────────────────────────
// The transition table. Encoded as a Map<from, Set<eventType>> for
// O(1) legal-transition checks. Listed here in spec order.
// ──────────────────────────────────────────────────────────────────────

const LEGAL: Record<BillStatus, ReadonlySet<BillEvent["type"]>> = {
  // Happy path
  DRAFT: new Set(["FUND", "CANCEL"]),
  FUNDED: new Set(["ENTER_EARN", "CANCEL"]),
  EARNING: new Set(["BEGIN_SETTLEMENT", "PAUSE", "CANCEL"]),
  PREPARING_SETTLEMENT: new Set([
    "EXECUTE",
    "INSUFFICIENT_FUNDS",
    "MANUAL_ACTION_REQUIRED",
    "REQUIRES_REVIEW",
    "PAUSE",
  ]),
  EXECUTING: new Set([
    "CONFIRM_SETTLED",
    "INSUFFICIENT_FUNDS",
    "MANUAL_ACTION_REQUIRED",
    "REQUIRES_REVIEW",
    "FAIL_FINAL",
  ]),
  // Alternate states — most only resume / cancel / fail forward
  INSUFFICIENT_FUNDS: new Set(["RETRY", "CANCEL", "PAUSE"]),
  PAUSED: new Set(["RESUME", "CANCEL"]),
  REQUIRES_REVIEW: new Set(["RETRY", "CANCEL", "MANUAL_ACTION_REQUIRED"]),
  MANUAL_ACTION_REQUIRED: new Set(["RETRY", "CANCEL", "CONFIRM_SETTLED"]),
  FAILED_RETRYABLE: new Set(["RETRY", "FAIL_FINAL", "CANCEL"]),
  FAILED_FINAL: new Set(["CANCEL", "MANUAL_ACTION_REQUIRED"]),
  SETTLED: new Set(), // terminal
  CANCELLED: new Set(), // terminal
};

/**
 * Attempt to drive a bill from its current state to the next state.
 * Pure function — does not mutate the input. Returns a new `ScheduledBill`
 * on success or a structured error on an illegal transition.
 */
export function transitionBill(
  bill: ScheduledBill,
  event: BillEvent,
): TransitionResult {
  const allowed = LEGAL[bill.status];
  if (!allowed.has(event.type)) {
    return {
      ok: false,
      error: `illegal transition: ${bill.status} -[${event.type}]-> ?`,
      from: bill.status,
      event: event.type,
    };
  }
  const next = applyEvent(bill, event);
  if (!next) {
    return {
      ok: false,
      error: `event handler missing: ${event.type}`,
      from: bill.status,
      event: event.type,
    };
  }
  return { ok: true, bill: next };
}

function applyEvent(
  bill: ScheduledBill,
  event: BillEvent,
): ScheduledBill | null {
  const now = new Date().toISOString();
  switch (event.type) {
    case "FUND":
      return { ...bill, status: "FUNDED", updatedAt: now };
    case "ENTER_EARN":
      return { ...bill, status: "EARNING", updatedAt: now };
    case "BEGIN_SETTLEMENT":
      return { ...bill, status: "PREPARING_SETTLEMENT", updatedAt: now };
    case "EXECUTE":
      return {
        ...bill,
        status: "EXECUTING",
        lastAttemptAt: now,
        updatedAt: now,
      };
    case "CONFIRM_SETTLED":
      return {
        ...bill,
        status: "SETTLED",
        settlementReference: `${event.providerName}:${event.transactionId}`,
        lastAttemptAt: now,
        updatedAt: now,
      };
    case "INSUFFICIENT_FUNDS":
      return {
        ...bill,
        status: "INSUFFICIENT_FUNDS",
        lastAttemptAt: now,
        updatedAt: now,
      };
    case "PAUSE":
      return { ...bill, status: "PAUSED", updatedAt: now };
    case "RESUME":
      // Resume always lands back in EARNING — that's the only
      // pre-execution state we pause out of. If the bill was paused
      // mid-execution, the caller should send a different event.
      return { ...bill, status: "EARNING", updatedAt: now };
    case "REQUIRES_REVIEW":
      return {
        ...bill,
        status: "REQUIRES_REVIEW",
        lastAttemptAt: now,
        updatedAt: now,
      };
    case "MANUAL_ACTION_REQUIRED":
      return {
        ...bill,
        status: "MANUAL_ACTION_REQUIRED",
        updatedAt: now,
      };
    case "RETRY":
      // Retry from FAILED_RETRYABLE / INSUFFICIENT_FUNDS / REQUIRES_REVIEW
      // / MANUAL_ACTION_REQUIRED all funnel back to EARNING. The caller
      // (the gateway) is responsible for re-evaluating `canExecute`
      // before the next BEGIN_SETTLEMENT.
      return { ...bill, status: "EARNING", updatedAt: now };
    case "FAIL_FINAL":
      return {
        ...bill,
        status: "FAILED_FINAL",
        lastAttemptAt: now,
        updatedAt: now,
      };
    case "CANCEL":
      return { ...bill, status: "CANCELLED", updatedAt: now };
    default:
      return null;
  }
}

/**
 * List every legal next state from `from`. Useful for the dev panel
 * and the smoke test.
 */
export function legalNextStates(from: BillStatus): BillEvent["type"][] {
  return Array.from(LEGAL[from]);
}

// ──────────────────────────────────────────────────────────────────────
// Status language — map the 13 technical states to the 8 user-facing
// labels the spec calls for. (EARNING / FUNDED / PREPARING /
// EXECUTING / SETTLED / ACTION REQUIRED / PAY MANUALLY / PAUSED)
// ──────────────────────────────────────────────────────────────────────

export type BillUserLabel =
  | "EARNING"
  | "FUNDED"
  | "PREPARING"
  | "EXECUTING"
  | "SETTLED"
  | "ACTION REQUIRED"
  | "PAY MANUALLY"
  | "PAUSED"
  | "CANCELLED";

const STATUS_LANGUAGE: Record<BillStatus, BillUserLabel> = {
  DRAFT: "FUNDED",
  FUNDED: "FUNDED",
  EARNING: "EARNING",
  PREPARING_SETTLEMENT: "PREPARING",
  EXECUTING: "EXECUTING",
  SETTLED: "SETTLED",
  INSUFFICIENT_FUNDS: "ACTION REQUIRED",
  PAUSED: "PAUSED",
  REQUIRES_REVIEW: "ACTION REQUIRED",
  MANUAL_ACTION_REQUIRED: "PAY MANUALLY",
  FAILED_RETRYABLE: "ACTION REQUIRED",
  FAILED_FINAL: "ACTION REQUIRED",
  CANCELLED: "CANCELLED",
};

export function userLabel(status: BillStatus): BillUserLabel {
  return STATUS_LANGUAGE[status];
}

/**
 * The compass label tone. Drives the badge color in the bill
 * schedule table. The colors map to the existing design tokens
 * (--ok, --warn, --terminal-cyan, --ink-3) so the page fits the
 * Component Oracle Terminal system without introducing new colors.
 */
export type BillTone = "ok" | "warn" | "cyan" | "ink";

export function tone(status: BillStatus): BillTone {
  switch (STATUS_LANGUAGE[status]) {
    case "SETTLED":
      return "ok";
    case "ACTION REQUIRED":
    case "PAY MANUALLY":
      return "warn";
    case "EARNING":
    case "FUNDED":
    case "PREPARING":
    case "EXECUTING":
      return "cyan";
    case "PAUSED":
    case "CANCELLED":
    default:
      return "ink";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Vault alert state — derive the single vault-level alert from the
// bills. The page banner reads this and shows one of CALM / WATCH /
// ACTION REQUIRED / PAUSED.
// ──────────────────────────────────────────────────────────────────────

export function deriveAlertState(
  vaultStatus: "ACTIVE" | "PAUSED" | "RECOVERY_MODE",
  bills: ReadonlyArray<ScheduledBill>,
): VaultAlertState {
  if (vaultStatus === "PAUSED") return "PAUSED";
  if (vaultStatus === "RECOVERY_MODE") return "ACTION_REQUIRED";
  // Any bill in a degraded state lifts the whole vault to ACTION.
  const anyDegraded = bills.some((b) =>
    [
      "INSUFFICIENT_FUNDS",
      "MANUAL_ACTION_REQUIRED",
      "FAILED_FINAL",
      "REQUIRES_REVIEW",
    ].includes(b.status),
  );
  if (anyDegraded) return "ACTION_REQUIRED";
  // Any bill in EARNING with a window opening within 3 days bumps
  // the vault to WATCH.
  const now = Date.now();
  const near = bills.some((b) => {
    if (b.status !== "EARNING" && b.status !== "FUNDED") return false;
    const start = new Date(b.executionWindowStart).getTime();
    return start - now <= 3 * 24 * 60 * 60 * 1000;
  });
  if (near) return "WATCH";
  return "CALM";
}
