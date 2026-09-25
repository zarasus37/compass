/**
 * Stuck detector — Cluster 7.33a.
 *
 * Real-user feedback from mom (2026-09-24): the LLM sometimes loops
 * the same opening question across turns when the user types low-info
 * input (e.g. "ok" / "yes"). The persistence layer correctly saves each
 * turn, but the assistant response is identical three turns in a row.
 *
 * This module is called from agent.ts after the final assistant
 * response is determined. It inspects the last N assistant messages
 * and returns a revised final response if the loop is detected.
 *
 * The "revised" response is a hand-written nudge that:
 *   1. Acknowledges the user is doing fine and we want to move ahead
 *   2. Names what we have (could be nothing — that's honest)
 *   3. Points at the demo-data escape hatch that's already on the page
 *
 * The detector is intentionally conservative — only escalates after 3
 * identical consecutive responses because legitimate re-prompts are
 * normal in conversation (e.g. "OK got it, one more question: ...").
 */

import type { LLMMessage } from "../llm/types";

/** Threshold: N consecutive identical-content assistant messages = stuck. */
export const STUCK_THRESHOLD = 3;

/**
 * Returns true when the last `STUCK_THRESHOLD` assistant messages in
 * `history` are all textually identical AND none of them contains a
 * tool call (a tool call means the agent IS making progress; it just
 * doesn't update the visible "content" text).
 */
export function detectStuckLoop(history: LLMMessage[]): boolean {
  const lastN = history
    .filter((m) => m.role === "assistant")
    .slice(-STUCK_THRESHOLD);
  if (lastN.length < STUCK_THRESHOLD) return false;
  const firstContent = lastN[0]?.content;
  const allSameContent =
    firstContent !== undefined && lastN.every((m) => m.content === firstContent);
  if (!allSameContent) return false;
  // If any of the last N messages had a tool call, we're making
  // progress — the conversation is going somewhere even if the
  // visible content is the same.
  const hasToolProgress = lastN.some(
    (m) => m.toolCalls && m.toolCalls.length > 0,
  );
  return !hasToolProgress;
}

/**
 * The nudging prompt when stuck. Designed to be short, friendly, and
 * point at the demo-data button that's always on the page.
 *
 * Cluster 7.33a — references the `DemoModeButton` rendered when the
 * user has zero user messages, but stays useful even after the user
 * has logged some answers (just redirects them to /onboarding's
 * reset-to-demo-data affordance).
 */
export const STUCK_NUDGE =
  "I'm not making progress with that one — let me write up what I have. " +
  "If you're not sure where to start, you can skip ahead with the **Load demo data** button below " +
  "and refine from the dashboard later. (Type anything to keep going.)";

/**
 * Returns the response text to use given a stuck-loop detection. If
 * `stuck` is true, returns the nudging prompt. Otherwise returns
 * the original `content` unchanged.
 */
export function maybeReviseStuckResponse(content: string, stuck: boolean): string {
  return stuck ? STUCK_NUDGE : content;
}

/**
 * Counts consecutive trailing assistant messages that did NOT make
 * progress (no tool calls). Returns 0 when the most recent assistant
 * message DID make progress, or when there are no assistant messages.
 *
 * Example:
 *   [assistant(canned), assistant(nudge), assistant(canned)] → 3
 *   [assistant(nudge), assistant(toolCall)] → 0
 *   [assistant(canned), assistant(toolCall)] → 0
 *   [user, user, user] → 0
 *
 * Cluster 7.33a — more robust than `detectStuckLoop` because it
 * triggers even after the nudge fired once and the agent is back
 * to its canned response (the loop is still stuck).
 */
export function consecutiveNoProgressTurns(history: LLMMessage[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m || m.role !== "assistant") continue;
    const hasProgress =
      m.toolCalls !== undefined && m.toolCalls.length > 0;
    if (hasProgress) return count;
    count += 1;
  }
  return count;
}

/**
 * Combined stuck check used by the agent.
 *
 * - Returns `true` if either the strict 3-identical pattern fires
 *   OR there are >= 2 consecutive no-progress assistant messages
 *   (the nudge has already fired; the loop is still stuck).
 *
 * Returns `false` when the conversation is making progress.
 */
export function shouldNudgeStuck(history: LLMMessage[]): boolean {
  if (detectStuckLoop(history)) return true;
  return consecutiveNoProgressTurns(history) >= 2;
}
