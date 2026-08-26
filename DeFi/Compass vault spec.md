# Compass Vault — Implementation-Ready Spec

> Extracted from `DeFi/Compass vault.docx` (originally drafted 2026-08-25). The docx is the canonical authored spec; this markdown is a flat-text mirror for agents / git diff / search. If the two ever disagree, the docx wins.

---

Below is a consolidated, implementation-ready specification for the **Compass DeFi Bill Vault / Sovereign Checking Account** feature. It includes the product model, updated front-end logic, TypeScript domain types, an off-ramp adapter gateway, execution state machine, UI behavior, and build order.

The feature lives **inside Compass** as an authenticated Vault route — not a separate AuraFinance product — so bill money, envelopes, yield, and payment automation remain one coherent financial system.

## Compass Vault

### Product Definition

Compass Vault is a self-custodial, programmable bill-reserve account. Users allocate money from a paycheck into policy-locked bill envelopes. Those reserves enter a stablecoin yield strategy while waiting for their due dates. At the scheduled execution window, the system redeems the amount needed, routes it through an approved off-ramp provider, and records the settlement in Compass.

The core user value is not "high yield." It is: **allocated money remains productive while it waits, without becoming spendable.**

### Core Principles

- The user controls the wallet and assets; Compass coordinates policy, visibility, and automation
- Every bill reserve is tied to a specific envelope, due date, and maximum approved amount
- Bill funds are locked by policy, not merely marked as "budgeted"
- Yield is tracked transparently at the vault, envelope, and bill levels
- Automation must fail safe, fail loud, and always provide a manual recovery path
- The off-ramp is replaceable infrastructure, never a single-provider dependency
- Automated bill pay should redeem principal only when settlement is ready to execute

### Four-Layer Architecture

**1. Identity & Custody** — Safe smart account, ERC-4337 account abstraction, vault policy module. Required guardrails: daily + per-bill spending caps, recipient allowlist, pause switch, slippage tolerance, liquid-reserve buffer, multi-step confirmation for bank/biller changes, recovery export.

**2. Capital & Yield** — Two-tier allocation:
- **Liquidity buffer** — USDC, covers bills due in 3–7 days
- **Yield reserve** — sUSDS / USDS savings strategy, funds beyond the buffer
- **Settlement reserve** — USDC actively being redeemed for a due payment

The Sky Savings Rate is variable and governance-set; the displayed sUSDS rate is currently 3.52% APY. Do not promise a fixed 4–6% rate in UI.

**3. Automation & Chronos** — Smart contracts don't wake themselves. A keeper/executor only proceeds when all conditions are true:

```ts
const canExecute =
  bill.status === 'SCHEDULED' &&
  !vault.isPaused &&
  now >= bill.executionWindowStart &&
  now <= bill.executionWindowEnd &&
  bill.amount <= bill.maxAuthorizedAmount &&
  vault.settlementReserve >= bill.amount &&
  bill.billerIsApproved &&
  !bill.hasPendingAttempt;
```

Execution windows are configurable per bill type:

| Bill type        | Suggested execution lead |
|------------------|--------------------------|
| Rent / mortgage  | 3–5 business days early  |
| Insurance        | 2–3 business days early  |
| Utilities        | 2 business days early    |
| Credit cards     | 2–3 business days early  |
| Subscription     | 1–2 days early            |

**4. Off-ramp adapters** — Discriminated result types, `IOffRampAdapter` interface, `SpritzAdapter` + `MontoAdapter` + `FallbackManualPushAdapter` (non-negotiable safety path) orchestrated by `OffRampGateway`. All provider API calls server-side, idempotency keys required, never hardwired to one provider.

### State Machine

```
DRAFT
  ↓
FUNDED
  ↓
EARNING
  ↓
PREPARING_SETTLEMENT
  ↓
EXECUTING
  ↓
SETTLED
```

Alternate states: `INSUFFICIENT_FUNDS`, `PAUSED`, `REQUIRES_REVIEW`, `MANUAL_ACTION_REQUIRED`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `CANCELLED`.

**Core rule:** A bill is never considered paid until the off-ramp provider returns a settlement confirmation or verified payment reference. Successful stablecoin redemption is not equivalent to a successful bill payment.

### Domain Types

```ts
export type Address = `0x${string}`;

export interface VaultAccount {
  id: string;
  userId: string;
  chainId: number;
  smartAccountAddress: Address;
  baseAsset: 'USDC';
  status: 'ACTIVE' | 'PAUSED' | 'RECOVERY_MODE';
  availableBalance: number;
  settlementReserve: number;
  deployedToYield: number;
  accruedYield: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEnvelope {
  id: string;
  vaultId: string;
  compassEnvelopeId: string;  // back-reference to the existing Compass envelope
  name: string;
  category: 'RENT' | 'UTILITIES' | 'INSURANCE' | 'DEBT' | 'SUBSCRIPTION' | 'OTHER';
  principalAllocated: number;
  accruedYield: number;
  reservedForBills: number;
  availableToReallocate: number;
  isPolicyLocked: boolean;
  nextObligationDate?: string;
  status: 'CALM' | 'WATCH' | 'OVER' | 'LOCKED';
}

export type BillStatus =
  | 'DRAFT' | 'FUNDED' | 'EARNING'
  | 'PREPARING_SETTLEMENT' | 'EXECUTING' | 'SETTLED'
  | 'INSUFFICIENT_FUNDS' | 'PAUSED' | 'REQUIRES_REVIEW'
  | 'MANUAL_ACTION_REQUIRED' | 'FAILED_RETRYABLE'
  | 'FAILED_FINAL' | 'CANCELLED';

export interface ScheduledBill {
  id: string;
  vaultId: string;
  envelopeId: string;
  billerName: string;
  billerId: string;
  maskedAccountNumber: string;
  amount: number;
  maxAuthorizedAmount: number;
  currency: 'USD';
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
  dueDate: string;
  executionWindowStart: string;
  executionWindowEnd: string;
  status: BillStatus;
  providerPreference?: string;
  lastAttemptAt?: string;
  settlementReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YieldEvent {
  id: string;
  vaultId: string;
  envelopeId?: string;
  asset: 'USDC' | 'USDS' | 'sUSDS';
  amount: number;
  annualizedRate?: number;
  source: 'AAVE' | 'SKY' | 'OTHER';
  action: 'ACCRUED' | 'COMPOUNDED' | 'ALLOCATED_TO_BILL' | 'MOVED_TO_AVAILABLE';
  occurredAt: string;
}
```

Address validation: use `viem`'s `isAddress` + `getAddress` to validate. Never accept user-supplied addresses client-side without server validation.

Date utilities: use local-date construction (`toLocalISODate`) rather than `toISOString()` to avoid UTC boundary shifts for bill scheduling.

### Off-Ramp Gateway

Discriminated result type:

```ts
export type OffRampResult =
  | { success: true; providerName: string; transactionId: string; requiresManualAction: false }
  | { success: true; providerName: string; transactionId?: string; requiresManualAction: true; warningMessage: string }
  | { success: false; providerName: string; requiresManualAction: boolean; error: string; retryable: boolean };
```

Adapters implement `IOffRampAdapter` (`isAvailable` + `executePayment`). `OffRampGateway.processBillPay` iterates adapters, stops on first success, surfaces all failures if all paths fail.

**Gateway rules**: server-side only, idempotency keys, never retry blindly, store provider tx IDs, treat "accepted" / "processing" / "settled" as distinct states, never assume finality before settlement confirmed, never hardwire to one provider.

### Yield Attribution

Attribution is by **capital share**, not vault-wide lump sum:

```ts
export function calculateEnvelopeYield(
  envelopePrincipal: number,
  totalYieldEligiblePrincipal: number,
  totalYieldAccrued: number
) {
  if (totalYieldEligiblePrincipal <= 0) return 0;
  return (envelopePrincipal / totalYieldEligiblePrincipal) * totalYieldAccrued;
}
```

Default policy:
- Under $1.00 → retain and compound automatically
- $1.00+ → show in yield ledger, compound by default

User choices: `COMPOUND` / `APPLY_TO_NEXT_BILL` / `MOVE_TO_AVAILABLE` / `SPLIT_BY_ENVELOPE`. Principal reserved for bills is **never** reduced by a yield-routing choice.

### Navigation

Add the route under LEDGER:
- /accounts
- /transactions
- /envelopes
- /allocation
- /obligations
- **/vault** ← new
- /debts
- /holdings

### Vault Page Layout

**Top status strip** — Vault balance | Reserved for bills | Earning yield | Bills covered
**Primary section** — Bill-reserve timeline / scheduled payment queue
**Secondary section** — Yield earned by envelope | Strategy allocation | Execution activity
**Right rail / lower modules** — Automation status | Off-ramp status | Emergency controls

### Top Metrics

| Metric            | Meaning                                                        |
|-------------------|----------------------------------------------------------------|
| Vault principal   | Total stablecoin reserves held for scheduled obligations       |
| Bills covered     | Amount and percentage of scheduled bills fully funded          |
| Yield earned      | Total accrued yield, with available yield separately identified |
| Next execution    | Next bill, amount, date, and automation state                   |
| Liquid buffer     | Funds immediately available for redemption/settlement          |
| Vault health      | CALM / WATCH / ACTION REQUIRED / PAUSED                         |

### Status Language

| Technical event              | Compass label     |
|------------------------------|-------------------|
| Yield position active        | EARNING           |
| Bill fully reserved           | FUNDED            |
| Redemption initiated         | PREPARING         |
| Off-ramp request active      | EXECUTING         |
| ACH/payment confirmed        | SETTLED           |
| Bill reserve inadequate      | ACTION REQUIRED   |
| Provider outage, funds banked | PAY MANUALLY      |
| User stops automation        | PAUSED            |

### Security Non-Negotiables

- Never expose wallet keys, provider secrets, or off-ramp credentials in the client
- Separate read-only dashboard APIs from state-changing authorization APIs
- Require user re-auth or wallet signature for: linked bank, biller recipient, payment cap, recovery address, automation permissions
- Build idempotency into every off-ramp request
- Store immutable event logs for: funding, strategy deposits/redemptions, automation attempts, provider requests, provider confirmations, manual recovery transfers, user pauses/overrides
- Add rate limiting to payment scheduling and authorization changes
- Global emergency pause on both contract policy and server orchestration
- Require contract review and independent audit before user funds are deployed

### Risk Disclosure UI (mandatory before activation)

> This is a self-custodial digital-asset vault, not a bank account. Stablecoin, smart-contract, protocol, automation, off-ramp, and settlement risks apply. Yield is variable and not guaranteed. Compass cannot guarantee a bill will be paid if funding, protocol, provider, or settlement conditions fail.

### Build Sequence

**Phase 1: Compass Product Integration** (this is the first shippable slice)
- Add `/vault` route and nav item
- Build mock vault data from existing Compass envelopes
- Add bill schedule table and lifecycle badges
- Show yield attribution per envelope
- Implement yield routing controls with local/demo state
- Add CALM, WATCH, and ACTION REQUIRED alert states

**Phase 2: Backend Ledger**
- `vault_accounts`, `vault_envelopes`, `scheduled_bills`, `yield_events`, `payment_attempts`, `provider_events` tables
- Immutable audit/event ledger
- Envelope-to-vault allocation mapping
- Idempotency keys + payment-attempt records
- Mocked off-ramp adapter integration tests

**Phase 3: Testnet System**
- Deploy Safe smart-account flow on a supported test network
- USDC test asset deposits
- Mock or testnet yield-strategy adapter
- Scheduled keeper task
- Every state transition tested, especially insufficient funding + retries
- Pause, revoke, and manual-recovery workflow tested

**Phase 4: Production Readiness**
- Legally viable on-ramp/off-ramp partner selection
- Legal + compliance review (custody, money transmission, bill pay, yield presentation)
- Smart-contract audit
- Closed beta with caps, manual review, no irreversible automation
- Multiple provider adapters before public use
- Mobile push notifications for every payment-state transition

### What to Fix in the Original Prototype

The standalone HTML prototype is a demo, not the product. Don't port it unchanged:
- Fold into Compass Vault — no separate AuraFinance branding
- Replace hardcoded mocked APY with provider-fed "variable estimated APY"
- Replace static transaction dates with local-date utility logic
- Use `navigator.clipboard.writeText` (not `document.execCommand('copy')`)
- Use a real deployed Safe address, not fabricated
- Remove direct provider claims like "Spritz ACH Protocol Linked" unless live
- Treat "Simulate Keeper Execution" as simulation-only with clear labeling
- Add full payment lifecycle states (no simulated liquidation = real payment confusion)
- Add an explicit "manual recovery" UI state, not just a toast
- The existing dashboard has solid visual bones — keep the layout, normalize wording and data model
