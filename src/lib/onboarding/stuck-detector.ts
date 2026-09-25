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
 * Cluster 7.35b — minimum number of user turns before the detector
 * can fire. Mom said "i currently get paid twice a month..." (TURN 1
 * data) and the agent called saveIncomeSource with cadence-only.
 * Then mom said "every check i receive 2,000" (TURN 2 data) but the
 * extractor missed it and the agent fell through to the canned
 * fallback. The detector was firing on TURN 3 ("ok" or "what do
 * you need to know") because the agent's TURN 2 + TURN 3 assistant
 * messages were both canned fallbacks.
 *
 * But mom was still mid-conversation. The 7.35 fix to the mock
 * extractor resolves the root cause; the floor here is a safety net
 * for any future extractor misses — give the user at least 2 turns
 * of trying before we tell them to bail to demo data.
 */
export const MIN_TURNS_BEFORE_DETECT = 2;

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
 * Cluster 7.35b — "agent asked a specific question last" check.
 *
 * If the most recent assistant message ended with a question mark,
 * the agent is mid-flow asking for specific info — even if the
 * question looks canned, the user is more likely to be answering
 * than to be stuck. The detector should wait for the next user
 * message + a follow-up assistant response before firing.
 */
export function lastAssistantAskedQuestion(history: LLMMessage[]): boolean {
  const lastAssistant = [...history]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) return false;
  // Cluster 7.35b — look for "?" anywhere in the content, not just
  // at the end. The agent's follow-up questions often end with a
  // parenthetical aside ("What\'s the rough take-home per paycheck?
  // (Doesn\'t have to be exact.)") which puts a period after the
  // question mark. We want to detect "this is a question", not
  // "ends with a question mark".
  return /[?？]/.test(lastAssistant.content);
}

/**
 * Combined stuck check used by the agent.
 *
 * - Returns `false` when the agent's most recent message asked a
 *   specific question (caller is mid-flow, not stuck).
 * - Returns `false` when fewer than `MIN_TURNS_BEFORE_DETECT` user
 *   turns have occurred (need at least 2 attempts before bailing).
 * - Returns `true` if either the strict 3-identical pattern fires
 *   OR there are >= 2 consecutive no-progress assistant messages
 *   (the nudge has already fired; the loop is still stuck).
 */
export function shouldNudgeStuck(history: LLMMessage[]): boolean {
  const userTurns = history.filter((m) => m.role === "user").length;
  if (userTurns < MIN_TURNS_BEFORE_DETECT) return false;
  if (detectStuckLoop(history)) return true;
  // Cluster 7.35b — only treat the "agent asked a question" check
  // as a bail-out guard when the agent's CURRENT question differs
  // from its PREVIOUS question. If the agent asked the same
  // canned question on two consecutive turns, the loop is still
  // stuck even if both questions end with "?".
  if (lastAssistantAskedQuestion(history) && !lastQuestionRepeated(history) && !postNudgeRegression(history)) return false;
  return consecutiveNoProgressTurns(history) >= 2;
}

/**
 * Cluster 7.35b — true when the last 2 assistant messages have
 * identical text content. Used to distinguish "agent asked a new
 * question" (don't bail) from "agent asked the same canned question
 * twice" (still stuck, do bail).
 */
function lastQuestionRepeated(history: LLMMessage[]): boolean {
  const assistants = history.filter((m) => m.role === "assistant");
  if (assistants.length < 2) return false;
  const last = assistants[assistants.length - 1]?.content ?? "";
  const prev = assistants[assistants.length - 2]?.content ?? "";
  return last === prev && last.trim().length > 0;
}

/**
 * Cluster 7.35b — true when the agent is back to asking a canned
 * question that it asked before the nudge fired. Handles the
 * "post-nudge regression" case where the nudge went out, the user
 * said something, and the agent returned to the canned opener.
 */
function postNudgeRegression(history: LLMMessage[]): boolean {
  const assistants = history.filter((m) => m.role === "assistant");
  if (assistants.length < 3) return false;
  const last = assistants[assistants.length - 1]?.content ?? "";
  // Has a nudge fired earlier in the conversation?
  const nudgeFiredEarlier = assistants.some(
    (m) => m.content.includes("not making progress") || m.content.includes("skip ahead"),
  );
  if (!nudgeFiredEarlier) return false;
  // The agent is back to asking a question that came BEFORE the nudge.
  const beforeNudge = assistants.findIndex(
    (m) => m.content.includes("not making progress") || m.content.includes("skip ahead"),
  );
  for (let i = 0; i < beforeNudge; i++) {
    const a = assistants[i];
    if (a && a.content === last) return true;
  }
  return false;
}
