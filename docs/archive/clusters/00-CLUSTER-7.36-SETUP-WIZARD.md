# Cluster 7.36 — Setup wizard for the Financial Operating System

**Status (2026-09-25): SPEC REVISION.** Originally scoped as "form-first onboarding" after mom hit extraction bugs in the chat. Vision document re-read: the chat was never the right surface. Compass setup is a multi-step wizard for the budgeting engine, not a model conversation. This cluster realigns the work to match the vision's Stage A-B: inventory → canonical financial state → setup wizard.

## What the vision document says (anchors)

> "Compass should not gradually become another budgeting app with lots of features. Instead, the progression should be: Budgeting → Planning → Automation → Financial Policy → Financial Operating System."

> "If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?" — Stage H gate.

> "User creates accounts → Creates envelopes → Defines pay schedule → Defines financial goals → Creates allocation policies → Activates plan." — Stage 16 setup sequence.

> "AI should enhance the financial engine rather than replace deterministic financial logic." — Stage 14.

> "The user should not need to understand the machinery underneath Compass. The complexity belongs in the system." — Stage 12 (UX).

> "Compass needs to know: what gets funded, what gets partially funded, what gets deferred, what gets flagged, what gets rolled forward." — Stage 7.

## What this means for Cluster 7.36

The previous 7.36 spec ("form-first mechanical intake + chat stays for interpretation") was correct about mechanical-vs-interpretive separation but **too narrow**. The vision puts setup in a sequence:

1. **Accounts** (Stage A) — checking, savings, credit cards. Required for canonical state.
2. **Envelopes** (Cluster 7.28) — already exists, but needs to be exposed as setup step.
3. **Pay schedule** (Stage A) — when the paycheck arrives + cadence + amount + source.
4. **Bills** (Stage A) — recurring obligations. Already exists (Cluster 5.x).
5. **Goals** (Stage A) — emergency fund, retirement, debt payoff. Already exists.
6. **Allocation rules** (Stage C) — what happens when a paycheck arrives. **Not yet implemented.**
7. **Plan activation** (Stage E) — the user clicks "Activate plan" and the engine takes over.

Steps 1-5 are data capture. Step 6 is the policy engine — that's the actual gap in the codebase today. Step 7 is the lifecycle state.

The LLM's role in setup:
- Help the user NAME things (envelopes, goals) when they don't know what to call them
- EXPLAIN why a particular allocation would be appropriate (recommendations)
- ANSWER questions about what the system is doing (audit narratives)
- Catch ANOMALIES (unusual balance, missed paycheck)

The LLM does NOT:
- Extract structured data from natural prose
- Decide where money goes (that's deterministic policy engine)
- Re-ask questions the form already captured

## What we're building in 7.36

A multi-step setup wizard at `/setup` (replacing the current `/onboarding` chat as the primary entry point for first-time users). Each step is a form, validated, ~30-60 seconds per step. Total setup time target: 5-8 minutes.

```
┌─ /setup ────────────────────────────────────────────────────────────┐
│ STEP 1 OF 5 — Pay schedule                                          │
│                                                                     │
│ How often does the money hit?                                       │
│ [ weekly ] [ biweekly ] [ twice a month ] [ monthly ]                │
│                                                                     │
│ Take-home per paycheck?                                             │
│ $ [          ]                                                      │
│                                                                     │
│ Source label?                                                       │
│ [ Acme Corp                              ]                          │
│                                                                     │
│ Do you get paid by direct deposit?                                  │
│ [ Yes — connect my bank ] [ No — manual entry ]                     │
│   └─ Yes → Plaid Link (Real Plaid, Cluster 7.37)                    │
│                                                                     │
│                                       [ Back ]    [ Continue → ]    │
└─────────────────────────────────────────────────────────────────────┘
```

Steps 2-5 follow the same pattern: one form per step, validated, with a "Back" / "Continue" navigation.

**Step 1: Pay schedule** (this cluster — was the original 7.36 scope)
**Step 2: Accounts** — checking + savings + credit card balances. Cluster 7.36 ships the form; reads from existing Account model.
**Step 3: Envelopes** — start with 7 canonical vessels (Rent, Groceries, Utilities, Dining, Buffer, Savings, Debt) pre-seeded by `ensureUserEnvelopesSeeded`. User can rename, retarget, add more.
**Step 4: Bills** — pull from existing scheduled_bills table. User can edit/add.
**Step 5: Goals** — Emergency Fund (default $20K), Debt payoff, Retirement. User can adjust targets and dates.

After step 5: "Activate plan" CTA → calls `activatePlanAction` → user is at `/dashboard` with the engine ready.

## Plaid integration (Cluster 7.37 — separate, depends on 7.36)

The "Yes — connect my bank" button in Step 1 is wired to the Plaid Link UI. Real Plaid (production), not sandbox. Cluster 7.37 ships:
- Plaid Link UI integration (Plaid's hosted link, mom enters her real bank creds via Plaid's secure UI)
- Token exchange → derive cadence + amount + employer from first 30 days of transactions
- Webhook handler for ongoing transaction sync
- Re-auth flow when Plaid item needs renewal
- Encrypted-at-rest storage of `plaidAccessToken` per user

## LLM role in setup (preserved from previous 7.36 spec)

The chat surface stays at `/onboarding` as an OPTIONAL parallel path for users who prefer natural-language interaction. After Step 5 of the wizard, the user can return to `/onboarding` to ask the model questions about their setup ("why is the engine suggesting $300 to emergency fund?"). The wizard is the deterministic path; the chat is the exploratory path.

The model receives the wizard answers as structured context (not as something to extract). It can:
- Explain allocations ("the engine put $300 here because...")
- Answer questions ("what happens if I get a second paycheck this month?")
- Recommend ("based on your $2K take-home and $900 rent, I'd suggest...")
- Catch anomalies ("you said you get paid biweekly but your rent is due on the 1st — make sure your schedule is right")

## Out of scope (this cluster)

- **Stage C: Policy engine** — the rule-priority + conflict-resolution + dry-run engine. Cluster 7.38+.
- **Stage D: Execution** — the atomic allocation engine. Cluster 7.38+.
- **Stage E: Automation** — paycheck detection + auto-execution. Cluster 7.39+.
- **Stage H: Zero-touch paycheck validation** — the gate that proves the whole system works. Cluster 7.40+.
- **Vault / decentralized** — deferred, vision doc says "Only after [budgeting engine] is solid."

## Files (planned, this cluster)

| File | Change |
|---|---|
| `src/app/setup/layout.tsx` (new, ~30 LOC) | Shared setup layout — progress rail, brand, sign-out |
| `src/app/setup/page.tsx` (new, ~50 LOC) | Step router — reads `OnboardingForm.completedStep`, redirects to the next incomplete step |
| `src/app/setup/pay-schedule/page.tsx` (new, ~80 LOC) | Step 1: cadence chips, amount input, source label, direct-deposit toggle, Plaid button (stub for 7.37) |
| `src/app/setup/accounts/page.tsx` (new, ~80 LOC) | Step 2: account list with editable balances |
| `src/app/setup/envelopes/page.tsx` (new, ~100 LOC) | Step 3: 7 canonical vessels pre-seeded, editable |
| `src/app/setup/bills/page.tsx` (new, ~100 LOC) | Step 4: scheduled bills list, editable |
| `src/app/setup/goals/page.tsx` (new, ~100 LOC) | Step 5: goals list with target + date |
| `src/app/setup/actions.ts` (new, ~150 LOC) | Server actions per step: `savePayScheduleAction`, `saveAccountsAction`, `saveEnvelopesAction`, `saveBillsAction`, `saveGoalsAction`, `activatePlanAction` |
| `src/components/setup/SetupProgress.tsx` (new, ~60 LOC) | 5-dot progress rail with step labels |
| `src/components/setup/StepNav.tsx` (new, ~30 LOC) | Back / Continue buttons, validates current step before continuing |
| `prisma/schema.prisma` (+ ~30 LOC) | New `OnboardingForm` model with `completedStep` (Int 0-5), `paySchedule` (Json), `accountsEdited` (Boolean), etc. |
| `src/app/(app)/layout.tsx` (~5 LOC) | Redirects to `/setup` if `OnboardingForm.completedStep < 5` |
| `src/app/onboarding/page.tsx` (~30 LOC) | Refactored: chat is now a parallel optional surface, not the primary setup path |
| `src/lib/onboarding/system-prompt-form-aware.ts` (new, ~30 LOC) | System prompt with form answers injected as JSON context |
| `tests/smoke-setup-wizard.mjs` (new, ~15 checks) | Each step renders, form validation works, progress rail advances, activation redirects to /dashboard |
| `00-CLUSTER-7.36-SETUP-WIZARD.md` (this file) | Spec |

## Verification

- `pnpm tsc` clean
- `pnpm prisma migrate dev --name onboarding_form` succeeds
- `node tests/smoke-setup-wizard.mjs`: 15 / 0
- Mom walks through the wizard in <8 minutes (target)
- After activation, `/dashboard` shows the populated financial state (envelope balances, bill calendar, goal progress)

## What this fixes

| Problem (from mom testing) | How 7.36 fixes it |
|---|---|
| "The model is stuck asking the same question" | Wizard doesn't have a model — it's a form. Can't loop. |
| "I don't know what to type" | Form fields have chips and placeholders. Plaid link fills income fields automatically. |
| "How do I exit demo mode?" | Wizard doesn't have a "demo mode" — it's a deterministic path. |
| "How do I sign out?" | TopAppBar sign-out (Cluster 7.34). |

## What this does NOT fix (intentional — out of scope)

- The system still doesn't automatically process a paycheck when one arrives (Stage E — automation). After activation, mom still has to log paychecks manually.
- The system still doesn't auto-rebalance on shortfall (Stage C — policy engine). On overspend, she still sees a warning.
- The system doesn't yet link to a real bank for live transactions (Cluster 7.37).

Those are the next three clusters after 7.36. The vision document says to ship them in order — and that order is what 7.36 enables.

## Honest risks

- **5 steps may be too many for a mom-launch.** Possible mitigation: combine accounts + envelopes into one step ("where your money lives"). I'll watch for this in mom testing.
- **The form-first approach removes the LLM "magic"** that the chat had. Some users liked asking the model what to do. The chat stays available — it's just not the primary path.
- **Schema migration risk.** The `OnboardingForm` model is new. Backward compat: existing users with a FinancialIdentity already in the DB will need their `OnboardingForm` row created (with `completedStep` set based on what's already captured). One-time migration script.

## Where this puts the project

After Cluster 7.36:
- Stage A complete (canonical financial state via wizard)
- Stage B partially complete (state is captured; the calculation engine comes later)
- Stage C-G not started (those are the engine + automation + UX layers)

After Cluster 7.37-7.40:
- Stage H gate cleared (zero-touch paycheck scenario works)

Then: vault / decentralized, per vision Stage I.
