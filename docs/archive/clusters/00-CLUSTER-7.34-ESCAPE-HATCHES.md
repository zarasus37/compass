# Cluster 7.34 — Escape hatches for mom (sign-out + re-onboard)

**Status (2026-09-24): SPEC.** Mom's two missing escape hatches on the main app shell.

## Background — Mom's report

Two pieces of feedback from mom testing:
1. "How do I exit demo mode, to return back to the onboarding process?"
2. "…as well as a sign-out button"

After Cluster 5.1, the `OnboardingTopBar` on `/onboarding` has a sign-out button + a "Start over" button (only visible after `markOnboardingComplete`). But the main app shell (the `(app)` route group's `TopAppBar`) has neither. Once mom enters the dashboard, she has no UI path to:
- Sign out (the only sign-out form is on `/onboarding`).
- Re-enter the chat (the only "Start over" button is on `/onboarding`, and the dashboard widgets don't link to `/onboarding` for completed users).

Both work via existing endpoints; just no UI surfaces them.

## Fix

### 1. Sign-out button on TopAppBar

Add a small `<form action={logoutAction}>` button next to the settings cog. Mirrors the OnboardingTopBar pattern. JetBrains Mono caps, mono border, "Sign out" label.

### 2. "Re-do onboarding" card on /settings

Add a card on the settings page titled "Onboarding" with a short description + a "Re-do onboarding" form button that POSTs to `/api/onboarding/reset` (already exists, used by the existing "Start over" button on `/onboarding`). The button shows a confirm dialog before submitting (JS) and reverts to a no-JS form with an intermediate "Are you sure?" POST → confirm page if JS is off.

### Out of scope

- Profile dropdown / account menu. Mom only has one account; a dropdown is overkill. A direct sign-out button is the simpler solution.
- "Switch account" flow. That's Cluster 7.32b (operator-approved, deferred).
- Multi-user switching UI. Same.

## Files

| File | Change |
|---|---|
| `src/components/shell/TopAppBar.tsx` | Add `<form action={logoutAction}>` next to settings cog. ~30 LOC. |
| `src/components/shell/SignOutButton.tsx` (new) | Tiny client component with confirm dialog (window.confirm). Mirrors the OnboardingTopBar pattern. ~25 LOC. |
| `src/app/(app)/settings/page.tsx` | New "Onboarding" card with "Re-do onboarding" form (POSTs to `/api/onboarding/reset`). ~40 LOC. |
| `tests/smoke-escape-hatches.mjs` (new, ~10 checks) | Sign-out form exists in TopAppBar, /settings renders the Onboarding card, /api/onboarding/reset wipes identity, redirect-after-reset lands on /onboarding. |

## Verification

- `pnpm tsc` clean
- Sign-out: click button in TopAppBar → cookies cleared → redirect to /login
- Re-onboard: click button on /settings → confirm dialog → POST /api/onboarding/reset → redirect to /onboarding with empty state
- Smoke: `tests/smoke-escape-hatches.mjs` 10+ checks, all green
