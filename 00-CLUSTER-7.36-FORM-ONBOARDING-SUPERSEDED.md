# Cluster 7.36 — Two-step onboarding: form-first mechanical intake + Plaid link + LLM only for interpretation

**Status (2026-09-24): SPEC.** Operator feedback: model-extracted-from-natural-prose is fundamentally fragile. Mechanical questions belong in form fields; LLM only handles interpretation.

## Why

Mom hit two extraction bugs in Cluster 7.35 (and one in 7.33). The root pattern: the LLM gets a free-form sentence ("i currently get paid twice a month. first check on the 10th and second check on the 25th") and tries to extract structured data. Each phrasing variant is a new regex / new prompt tweak. Mom's natural diction will never match our engineering exhaustively.

Operator's fix: stop using the LLM for mechanical intake. Form fields for cadence, amount, source. Plaid link as a shortcut when direct-deposit is yes. LLM takes over AFTER the form is filled, for goals/risk/audit — the parts that genuinely need interpretation.

## What changes

### `src/app/onboarding/page.tsx` (server component, the orchestrator)

- Reads the user's saved form values from a new Prisma model `OnboardingForm` (or JSON column on `FinancialIdentity`).
- If the form is complete AND the LLM chat has finished (`state.completedAt` is set), redirect to `/`.
- Otherwise, renders `<MechanicalIntakeForm />` (always first, if form not yet complete) AND `<ChatSurface />` (after form is valid, for the interpretive chat).
- The form and chat are sequential, not simultaneous.

### New `src/components/onboarding/MechanicalIntakeForm.tsx` (client component, ~200 LOC)

- Cadence: 4 chips (`weekly` / `biweekly` / `semi_monthly` / `monthly`) + an "irregular" pill. State held locally, submitted via the form action.
- Amount: typed number input with `$` prefix. Validated `>= 0`, integer cents.
- Source label: text input, defaults to "Primary".
- Direct deposit: Y/N toggle. When Y, the Plaid link button appears below.
- "Anything else" (optional): textarea, passes through to the LLM chat as initial context.

Form action: new server action `saveIntakeAction` that writes to `OnboardingForm` and (if Plaid link completed) writes the bank-derived cadence/amount/source to `FinancialIdentity.incomes[]`.

### New `src/components/onboarding/PlaidLinkButton.tsx` (~50 LOC)

- Wraps the existing Plaid sandbox link from `src/app/(app)/settings/plaid`. On success, calls `saveIntakeAction` with the bank-derived values and marks the form complete.
- For v1: Plaid sandbox only. Real Plaid (Plaid live mode + OAuth) deferred to v1.1.

### `src/components/onboarding/ChatSurface.tsx` (existing)

- Receives the form values as already-structured context. The agent's system prompt is updated to read the form values from a JSON field on `OnboardingState` rather than extracting them from prose.
- The model ONLY asks interpretive questions now: goals, risk tolerance, what the user wants from the app.

### New `src/lib/onboarding/system-prompt-form-aware.ts` (~30 LOC)

- Updated system prompt that injects the form values into the prompt:
  ```
  Form answers (already captured, do not re-ask):
  - Cadence: semi_monthly
  - Amount: $2,000 per paycheck
  - Source label: "Acme Corp"
  - Direct deposit: yes
  - Anything else: "[user's free-text]"
  
  Continue with the interpretive questions: goals, risk tolerance, budget style.
  ```
- Removes the model's responsibility for cadence/amount/source extraction. Removes the corresponding tools from the tool list (`saveIncomeSource` is called from the form action, not the chat).

### New Prisma model `OnboardingForm`

```prisma
model OnboardingForm {
  id                String   @id @default(cuid())
  userId            String   @unique
  cadence           String?  // weekly | biweekly | semi_monthly | monthly | irregular
  amountCents       Int?
  sourceLabel       String?
  directDeposit     Boolean?
  anythingElse      String?
  plaidLinked       Boolean  @default(false)
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Migration: `pnpm prisma migrate dev --name onboarding_form`.

## What this fixes

| Bug | How |
|---|---|
| Mom types "every check i receive 2,000" and the agent falls through | The amount is a typed number input. "2,000", "2000", "$2,000", "two grand" all valid. The model doesn't see free-form text. |
| The agent calls `saveIncomeSource` with empty args | Form action calls `saveIntakeAction` with validated args. Tool calls only happen with valid data. |
| Mom hits the canned fallback 3 times and the stuck detector fires prematurely | Form is a one-shot — submit once, done. No loop possible. |
| Mom needs to manually type the take-home when her bank could provide it | Plaid sandbox link fills the form from the bank feed. |

## What's NOT in scope (deferred)

- Real Plaid (live mode + OAuth + security review) — v1.1
- Multi-user account householding — already in 7.32b/c
- Email verification of the form data (e.g. confirm the bank balance matches mom's memory) — out of scope

## Out-of-band questions for operator sign-off

1. **Form-first vs chat-first**: I'm proposing form-first (always). Alternative: chat-first with optional form shortcut. My recommendation: form-first, because it eliminates the entire extraction-fragility class.
2. **Plaid sandbox only**: I'm proposing Plaid sandbox for mom v1. Real Plaid is a security review and a separate decision.
3. **Form values to LLM as JSON context**: I'm proposing the LLM receives the form values as structured context (no extraction needed). Alternative: don't pass them to the LLM at all (LLM only sees the chat transcript).

If all three are OK, I'll proceed with the spec as written.

## Files (planned)

| File | Change |
|---|---|
| `prisma/schema.prisma` | New `OnboardingForm` model (~20 LOC) |
| `prisma/migrations/<timestamp>_onboarding_form/migration.sql` | Generated migration (~30 LOC) |
| `src/components/onboarding/MechanicalIntakeForm.tsx` (new, ~200 LOC) | Form UI with cadence chips, amount input, source label, direct-deposit toggle, anything-else textarea |
| `src/components/onboarding/PlaidLinkButton.tsx` (new, ~50 LOC) | Wraps Plaid sandbox link |
| `src/lib/onboarding/system-prompt-form-aware.ts` (new, ~30 LOC) | System prompt with form values injected |
| `src/lib/onboarding/system-prompt.ts` (~5 LOC) | Routes to the form-aware variant when form is complete |
| `src/app/(app)/onboarding/actions.ts` (new, ~40 LOC) | `saveIntakeAction` server action |
| `src/app/onboarding/page.tsx` (~30 LOC) | Mounts MechanicalIntakeForm + ChatSurface based on form state |
| `tests/smoke-form-onboarding.mjs` (new, ~12 checks) | Form fields render, cadence chips emit valid values, amount input validates >= 0, Plaid sandbox link appears when directDeposit=true, saveIntakeAction writes to DB, redirect-to-dashboard when complete |
| `00-CLUSTER-7.36-FORM-ONBOARDING.md` (this file) | Spec |

## Verification

- `pnpm tsc` clean
- `pnpm prisma migrate dev --name onboarding_form` succeeds
- `node tests/smoke-form-onboarding.mjs`: 12 / 0
- Adjacent smokes still green
- Mom re-tests the new flow: form should be fillable in <60 seconds, Plaid sandbox link should populate all 3 income fields, LLM chat should only ask about goals/risk
