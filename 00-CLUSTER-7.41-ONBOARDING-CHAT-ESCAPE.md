# Cluster 7.41 — Onboarding chat escape hatches (visible UI)

**Status**: spec, ready to build.
**Predecessor**: Cluster 7.40 (envelope read migration, shipped at `94dd126`). Cluster 7.39 (dashboard DB migration + route boundaries). Cluster 7.36 (form-first setup wizard at /setup).
**Author constraint**: xKryptic 2026-09-26 — "this is still an error" with screenshot of `/onboarding` showing the chat agent stuck repeating the cadence question after mom already answered. Per Cluster 7.36, the form wizard at `/setup` is canonical; the chat at `/onboarding` is the parallel optional surface. The bug isn't the chat existing — it's that the chat has no good escape when it gets stuck.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

If the chat agent loops forever on "how often does the money come in?" after mom answered "twice a month" twice, the financial plan never gets captured. The agent's stuck-detector eventually fires (Cluster 7.33a + 7.35b) and tells mom to use the demo data, but the demo-data escape is the wrong CTA for a real user who wants to configure her own numbers. The right CTA is "use the form wizard" — that's the deterministic path that the spec calls canonical.

## Scope

### B1 — Prominent "Use the form setup wizard instead" link on the chat

**Files**: `src/components/onboarding/OnboardingTopBar.tsx` (or `src/app/onboarding/page.tsx`)

The chat's top bar shows "SOVEREIGN MONAD // ONBOARDING" + "signed in as Mom" + "SIGN OUT". Add a third button: **"USE FORM WIZARD →"** linking to `/setup`. Always visible. Available at every point in the chat. Big enough to be obvious — secondary CTA style (border, not filled), positioned between "signed in as Mom" and "SIGN OUT".

This is the visible fix for "the chat gets stuck and there's no good way out" — mom clicks the link, lands on `/setup`, walks through 5 deterministic forms, activates. No chat agent in the way.

### B2 — Improve stuck-nudge copy to mention the wizard

**Files**: `src/lib/onboarding/stuck-detector.ts` (the `STUCK_NUDGE` constant), `src/components/onboarding/DemoModeButton.tsx` or the page layout

The current `STUCK_NUDGE`:
> "I'm not making progress with that one — let me write up what I have. If you're not sure where to start, you can skip ahead with the **Load demo data** button below and refine from the dashboard later. (Type anything to keep going.)"

New copy (Cluster 7.41):
> "I'm not making progress with that one — let me write up what I have. Two easier paths: tap **Use the form setup wizard** in the header (5 steps, no agent in the way), or **Load demo data** below to explore the dashboard with sample numbers. (Type anything to keep going.)"

The new copy surfaces BOTH escape routes at the moment the user needs them most — when the agent has given up. The wizard is the right path for "I want to configure my own numbers"; the demo data is the right path for "I just want to see the dashboard."

### B3 — Strengthen stuck detector: detect the cadence-redundancy pattern earlier

**Files**: `src/lib/onboarding/stuck-detector.ts`

The current detector (Clusters 7.33a + 7.35b) waits for 3 assistant messages or 2 consecutive no-progress turns. The screenshot shows the agent asked the cadence question twice (once at "Cadence noted — semi_monthly. What's the rough take-home per paycheck?" and again at "Tell me a bit more — what kind of work do you do, and how often does the money come in?") before the nudge fired. We can fire earlier.

**New check**: if the last 2 user messages contain semantically redundant intent (e.g., both express "twice a month" — but we don't have a real semantic matcher; a simple heuristic is "last user message is ≤10 words AND contains a numeric or time-of-period cue AND the prior assistant message asked the same cue"), surface a softer "are we stuck?" prompt one turn earlier. **Keep this lightweight** — the existing detector stays the safety net. New helper `detectRedundantAnswer(history): boolean` returns true when the latest user message is a short answer to a recent question that was already asked.

Conservative threshold: only fires once per conversation (track via a marker on the conversation state — `redundantNudgeFired: boolean`).

### B4 — Add `redundantNudgeFired` field to `OnboardingState` for B3 idempotency

**Files**: `src/lib/onboarding/state.ts`, `prisma/schema.prisma`

Add a nullable `redundantNudgeFired Boolean` field to the `OnboardingMessage` model? Or add it to `OnboardingState` (in-memory only, not persisted)?

The redundant-nudge only needs to fire once per conversation. Per-conversation state lives in `OnboardingState`. The state is serialized to JSON on save, so the field will persist across reloads automatically (same shape as `lastFellBack`, `lastErrorMessage`).

Add `redundantNudgeFired: boolean` to `OnboardingState` + the load/save/identity mappings. No schema migration needed (OnboardingState is stored as a JSON column already).

## Out of scope (intentional)

- **Removing /onboarding entirely** — the chat is the parallel optional surface per Cluster 7.36. Removing it breaks the spec. The escape hatches close the gap.
- **Training a better extractor** — beyond Cluster 7.35's reach. Defer to LLM swap or extractor rewrite if mom keeps hitting this.
- **Redirect /onboarding → /setup for fresh users** — would change the spec's "parallel optional" semantics. The escape hatches are the right surface to add; the chat can stay reachable for users who prefer it.

## Files

| File | Change |
|---|---|
| `src/components/onboarding/OnboardingTopBar.tsx` | Add "USE FORM WIZARD →" button linking to `/setup` |
| `src/lib/onboarding/stuck-detector.ts` | New `STUCK_NUDGE` copy mentioning the wizard; new `detectRedundantAnswer(history)` helper |
| `src/lib/onboarding/agent.ts` | Wire `detectRedundantAnswer` into the post-response flow (same place the existing detector runs) |
| `src/lib/onboarding/state.ts` | Add `redundantNudgeFired: boolean` to `OnboardingState` + identity mappings |
| `tests/smoke-onboarding-chat-escape.mjs` (new) | Smoke: assert the wizard link is present in the chat top bar; assert the new stuck-nudge copy mentions the wizard |
| `00-CLUSTER-7.41-ONBOARDING-CHAT-ESCAPE.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:onboarding-stuck-detector` still green (orthogonal)
- `pnpm smoke:setup-wizard` still green (orthogonal)
- New smoke checks: (a) `OnboardingTopBar` renders the wizard link with `href="/setup"`; (b) `STUCK_NUDGE` constant contains the literal string "form setup wizard"; (c) `detectRedundantAnswer(history)` returns true on the screenshot's conversation shape; (d) `redundantNudgeFired` flag exists on `OnboardingState`.
- Manual: open `/onboarding` while signed in → see "USE FORM WIZARD →" button in the header → click → land on `/setup/pay-schedule`. If mom gets stuck again, the new nudge copy mentions the wizard.

## Risks

- **The wizard link is always visible** — even on /dashboard or /goals. Some users might find it confusing ("why am I being asked to set up again?"). Mitigate by linking to `/setup` only if `SetupState.completedStep < 5`, else link to `/settings` (or just hide the button). I'll add the conditional.
- **Redundant-nudge heuristic is brittle** — word-count + cue detection can false-positive on legitimate short answers. Conservative threshold + once-per-conversation flag mitigates. If it fires too aggressively, easy to tune down.