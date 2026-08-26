/**
 * Onboarding agent helpers — the test-only re-export of `runToolCall`.
 *
 * The dev test endpoint (/api/dev/onboarding/test-tool) needs to
 * call the orchestrator's `runToolCall` directly to exercise
 * individual tools without going through the LLM. The function
 * itself lives in `agent.ts` and isn't exported (it's an
 * internal detail of `runAgent`).
 *
 * This file re-exports it as a named export so the test endpoint
 * (and any future test surface) can call it without reaching
 * into agent.ts internals.
 *
 * Cluster 5.3.2 — added so the smoke can test the new
 * `saveSpendingHabits` tool and the extended `saveAsset` fields.
 */

export { runToolCall } from "./agent";
