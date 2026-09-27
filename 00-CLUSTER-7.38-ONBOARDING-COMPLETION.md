# Cluster 7.38 — Onboarding Completion

**Status**: spec, ready to build.
**Predecessor**: Cluster 7.36 (form-first 5-step setup wizard at /setup), shipped.
**Author constraint**: xKryptic 2026-09-26 — "we need the onboarding process to be fully functional and then we can move to the bugs in the app." This cluster closes the gap between "the wizard exists" and "the wizard works end-to-end for the next fresh user."

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

A wizard that 404s mid-flow doesn't carry out any plan. The activate-page redirect bug (B1) is a soft on-ramp failure: a user with steps 1–3 done who types `/setup/activate` directly gets a 404 instead of being routed to the right next step. The chat-sync divergence (B2) means a user who finishes via `/onboarding` chat passes the gate but never sets `SetupState.activatedAt`, so downstream surfaces that read "plan is active" from SetupState get the wrong answer. Both fix §0 directly.

## Scope

### B1 — `/setup/activate` redirects to 404 on partial completion
**File**: `src/app/setup/activate/page.tsx` (line 24–26)

```ts
if (state.completedStep < 5) {
  redirect(`/setup/${state.completedStep === 0 ? "pay-schedule" : ""}`);
}
```

When `completedStep ∈ {1,2,3,4}`, the URL becomes `/setup/` → Next.js 404. **Fix**: use `stepSlug((state.completedStep + 1) as WizardStep)` to route to the actual next step.

### B2 — Chat path leaves `SetupState.activatedAt` out of sync
**File**: `src/lib/onboarding/state.ts` (`saveConversation`)

The chat at `/onboarding` calls `markOnboardingComplete` which sets `FinancialIdentity.completedAt`. The wizard's `activatePlanAction` sets `SetupState.activatedAt`. The gate accepts either, but downstream surfaces (the dashboard's "plan active" badge, the "what happens next" copy on /setup) read `SetupState.activatedAt`. **Fix**: in `saveConversation`, when `state.completedAt` is being persisted, also call `activateSetup(state.userId)`. Atomic-ish via the same call site (the upserts are idempotent).

### B3 — `/setup/page.tsx` index shows a manual Continue button instead of routing
**File**: `src/app/setup/page.tsx` (line 21–75)

When `completedStep ∈ {1,2,3,4}`, the index shows a "Continue step N" button. The spec calls this page a router that "redirects to the next incomplete step" — current code is a manual step. **Fix**: auto-redirect to `/setup/${stepSlug(nextStep)}` when `nextStep !== null` and the index isn't the all-complete CTA. Drop the manual button.

### W3 — Stale `(app)/layout.tsx` comment
**File**: `src/app/(app)/layout.tsx`

The comment block still says "redirect to /onboarding where the chat is" but the actual gate in `src/lib/onboarding/gate.ts` line 64 redirects to `/setup`. **Fix**: rewrite the comment to match the gate's actual behavior.

## Out of scope (intentional)

- **W1 / W2 / W4 / W5** from the audit: re-verified on disk and either already correct or trivial. W1 (empty bills/goals): the hidden `billId=""` is a no-op submit, and the existing actions call `markStepCompleted` after writing — empty list is handled. W2 (Plaid stub): stays as Cluster 7.37. W4 (first-time copy): `/setup` already redirects when `completedStep === 0`, so the "Pick up where you left off" card never shows for fresh users. W5 (`savePayScheduleAction` advancement): verified — calls `markStepCompleted(userId, 1)` and redirects to `/setup/accounts`. ✅
- **Real Plaid** → Cluster 7.37.
- **Policy engine** → Cluster 7.39+.
- **Chat surface UX overhaul** → out of scope; the chat stays as the parallel optional surface per the 7.36 spec.

## Files

| File | Change |
|---|---|
| `src/app/setup/activate/page.tsx` | Replace empty-slug redirect with `stepSlug(next)` |
| `src/lib/onboarding/state.ts` | Call `activateSetup` from `saveConversation` when `completedAt` is set |
| `src/app/setup/page.tsx` | Auto-redirect to next incomplete step (drop manual Continue button) |
| `src/app/(app)/layout.tsx` | Rewrite stale comment block |
| `tests/smoke-setup-wizard.mjs` | Add 3 new checks: happy-path activation, activate-redirect regression, chat-sync regression |
| `00-CLUSTER-7.38-ONBOARDING-COMPLETION.md` | This spec |
| `HANDOVER.md` | Commit-chain header refresh + new "Recent change" section |
| `COORDINATION.md` | Last update line + Status log append |

## Verification

- `pnpm tsc --noEmit` clean.
- `tests/smoke-setup-wizard.mjs`: existing checks + 3 new (happy path, B1 regression, B2 regression). Target: 100% green.
- Manual: a fresh test account walks all 5 steps → activates → lands on `/` with populated state. The pre-existing 7.16.1 change-password smoke stays green (orthogonal).

## Risks

- **B2 transactionality**: the chat `saveConversation` uses a `prisma.$transaction` for the FinancialIdentity upsert. Calling `activateSetup` (a separate `prisma.setupState.upsert`) outside that transaction means a failure between the two leaves identity completed but setup not activated. Acceptable: the gate still accepts either, so the user is never stranded, and `activateSetup` is itself idempotent — a re-run of `saveConversation` reconciles. Documented as a known-acceptable race in the cluster's HANDOVER entry.
- **Spec renumber**: 7.37 was earmarked for Plaid in the 7.36 spec but is unshipped. We use 7.38 here so future specs can keep their canonical numbers (7.37-Plaid, 7.39-policy-engine).