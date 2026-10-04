# Cluster 7.33 — Onboarding UX bugs (real-user feedback from mom)

**Status (2026-09-24): SPEC + FIX.** Two bugs reported by mom after the live Compass-rose logo shipped.

## Bug 1 — Onboarding "stuck on same question" loop (Cluster 7.33a)

**Symptom**: Mom types "ok" / "yes" repeatedly. The agent re-asks the exact same question every turn ("Tell me a bit more — what kind of work do you do, and how often does the money come in?").

**Reproduced in sandbox** (`scripts/auth-test/login-and-test.mjs`): 5 turns of "ok" input → 5 identical agent responses. No tool calls in any turn. The `OnboardingMessage` log shows `[0] user: ok / [1] assistant: <same> / [2] user: ok / ...` — no progress.

**Root cause**:
- The mock LLM's default fallback (when no keywords in the input match canned responses) returns the same hard-coded question every time: `"Tell me a bit more — what kind of work do you do, and how often does the money come in?"`
- In production with Mavis, this manifests as the LLM looping on a generic "I don't have enough info" question when the user says anything non-substantive.
- The agent's persistence + state are correct (no actual loss of conversation history); the bug is purely behavioral.

**Fix**:
- Detect "stuck" state in `agent.ts::runAgent`: if the last N assistant messages in history are identical (or no tool calls in last N turns), inject a "let me know when you have info, or pick a starting topic" message and pick a different topic based on what's still empty in state.
- Add a visible "Skip ahead" button on `/onboarding` (and `ChatSurface`) labeled "I don't know — load demo data" that hits `/api/onboarding/seed-demo` (already exists, used by `DemoModeButton`).
- Add a server-side smoke that catches "stuck after N turns" and fails fast.

## Bug 2 — Envelope detail page 404 in production (Cluster 7.33b)

**Symptom**: Mom clicks an envelope from `/envelopes`. The detail page `(/envelopes/[id])` shows an error page (notFound).

**Cannot reproduce in sandbox** (single-process Next.js keeps in-memory store stable).

**Root cause hypothesis** (production-only):
- `src/app/(app)/envelopes/[id]/page.tsx` reads `liveEnvelopes()` — in-memory mock state seeded from `mock-seed.ts`.
- The `/envelopes` list page and the dashboard widgets were switched to `liveEnvelopesFromDb(user.id)` in Cluster 5.2.6. The `[id]/page.tsx` was missed.
- In Vercel production (serverless), the in-memory store is **per-invocation** and can be empty between requests. The detail page would then `notFound()` even though the Prisma row exists.
- Sandbox doesn't repro because the single long-running Next.js process keeps the in-memory state stable across requests.

**Fix**:
- Switch `src/app/(app)/envelopes/[id]/page.tsx` from `liveEnvelopes()` to `liveEnvelopesFromDb(user.id)`. Same pattern as Cluster 5.2.6.
- Add a smoke that hits the envelope detail page after restarting the server process — must succeed when the env exists in Prisma.

## Out of scope

- Migrating `updateEnvelope` (server action) to write to Prisma instead of in-memory. This is a separate architectural concern (Cluster 5.2.6 widget-cutover follow-ups). Bug 2 doesn't require it; Bug 2 only fixes the read side.
- LLM response-quality improvements. The bug is about repetition; the LLM quality itself is out of scope for this turn.

## Files (planned)

| File | Change |
|---|---|
| `src/lib/onboarding/agent.ts` | Stuck detection — count consecutive identical-assistant messages, when ≥3 emit a different prompt + advance to next empty topic |
| `src/lib/onboarding/prompts.ts` (new, ~50 LOC) | "Stuck fallback" prompt + topic rotation list |
| `src/components/onboarding/ChatSurface.tsx` | Inline "Load demo data" button when stuck counter ≥2 |
| `src/app/(app)/envelopes/[id]/page.tsx` | Replace `liveEnvelopes()` with `liveEnvelopesFromDb(user.id)` |
| `tests/smoke-onboarding-stuck-detector.mjs` | ~6 checks: agent detects stuck, falls back to next topic, demo-data button works |
| `tests/smoke-envelope-detail-db.mjs` | ~4 checks: detail page reads from Prisma, doesn't error after fresh-process restart |
