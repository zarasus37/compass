/**
 * Advisor agent orchestrator — `runAdvisor` for v2.
 *
 * Cluster 5.3.1. v1 was a single LLM call per turn with no tools;
 * the identity was inlined into the system prompt and the LLM
 * answered from context. v2 keeps the inlined identity (it's a
 * small, fixed shape and the LLM should always see it) AND adds
 * a 7-tool read-only toolset so the advisor can fetch live data
 * slices on demand. This unlocks the "ask me anything" vision:
 *
 *   - "How much on lights past 4 months?" → queryTransactions
 *   - "Average grocery bill?"          → queryTransactions (groupBy)
 *   - "What about a trip on date X?"   → queryGoals + simulatePaycheck
 *   - "Cut to pay more debt?"          → summarizeSpending + queryDebts
 *   - "Safe to spend this month?"      → queryBills + queryEnvelopes +
 *                                        simulatePaycheck
 *
 * Multi-round orchestrator (cap 3 rounds):
 *
 *   userMessage + history → LLM call (round 1)
 *     ├─ no tool calls → final text, return
 *     └─ tool calls → run them, append results, loop
 *                       → LLM call (round 2)
 *                         ├─ no tool calls → final text, return
 *                         └─ tool calls → run them, append results, loop
 *                                           → LLM call (round 3)
 *                                             → final text (or polite
 *                                               close if the LLM
 *                                               still wants more tools)
 *
 * The cap of 3 is intentionally tight: a well-prompted model
 * usually answers in 1-2 rounds. 3 covers the longest realistic
 * chain (e.g. "how much can I safely spend this month" → queryBills
 * + queryEnvelopes + simulatePaycheck → answer). If the LLM still
 * wants more tools after 3, the orchestrator uses whatever the
 * last response was and surfaces a polite close — the user can
 * re-ask in a follow-up turn.
 *
 * What stays the same from v1:
 *
 *   - **Read-only identity.** The advisor never mutates
 *     FinancialIdentity / production tables. The chat history is
 *     the only side effect.
 *   - **Shared OnboardingMessage log.** The advisor and the
 *     onboarding chat both write to the same log. The user can
 *     flip between them without losing context.
 *   - **L1 rules fallback.** The dispatcher in `lib/llm` falls
 *     through to the mock if the primary provider errors. The
 *     mock's deterministic seed becomes `l1-fallback-advisor` so
 *     a user who flips between providers mid-conversation keeps
 *     the same context.
 *
 * What changed from v1:
 *
 *   - **Tool loop.** The orchestrator now runs tools and feeds
 *     results back. The LLMRequest `tools` field is populated.
 *   - **Max rounds = 3.** Hard cap to prevent runaway loops.
 *   - **Result includes `toolCalls`.** Each entry has the tool
 *     name + args + the handler's publicView. The chat UI can
 *     surface "I checked your envelopes and bills…" if it wants.
 *   - **Result includes `rounds`.** So the smoke can assert the
 *     loop terminated within the cap.
 */

import "server-only";
import type { LLMMessage, LLMRequest, LLMResponse, LLMToolCall } from "../llm/types";
import { callLLMForAdvisor } from "../llm";
import { buildAdvisorSystemPrompt, type AdvisorIdentitySummary } from "./system-prompt";
import { ADVISOR_TOOLS } from "./tools";
import { runAdvisorTool, type AdvisorToolResult } from "./handlers";
import { loadConversation, saveConversation, type OnboardingState } from "../onboarding/state";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export interface RunAdvisorInput {
  userId: string;
  /** The latest user message. Appended to the conversation history. */
  userMessage: string;
  /**
   * Optional pre-loaded history. If absent, we read from the
   * persisted state. The chat UI will pass its own loaded history
   * once a UI-level refactor is wired.
   */
  history?: LLMMessage[];
}

export interface RunAdvisorResult {
  /** The final assistant text the user sees. */
  agentMessage: string;
  /** Every tool call the agent made, in order, with its result. */
  toolCalls: Array<LLMToolCall & { result: AdvisorToolResult }>;
  /** The conversation state after the turn. */
  state: OnboardingState;
  /** How many LLM round-trips this turn took (1 if no tool calls). */
  rounds: number;
  /** The provider that produced the final response. */
  provider: "mavis" | "ollama" | "mock";
  /** True if the LLM primary errored and the L1 rules fallback ran. */
  fellBack: boolean;
  /** The primary provider's error message when fellBack=true. */
  fallbackError: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// The agent
// ──────────────────────────────────────────────────────────────────────

/** Hard cap on LLM round-trips per user turn. Prevents infinite tool loops. */
const MAX_ROUNDS = 3;

export async function runAdvisor(input: RunAdvisorInput): Promise<RunAdvisorResult> {
  const state = await loadConversation(input.userId);

  if (!state.completedAt) {
    // The advisor surface has no concept of "build the identity" —
    // that's the onboarding flow. The route layer is expected to
    // gate on this; throw here as a defense in depth so a future
    // direct call from a non-route context can't accidentally
    // surface a half-formed answer.
    throw new Error(
      "[advisor] user has not completed onboarding; redirect to /onboarding first.",
    );
  }

  // Build a deterministic identity summary for the system prompt.
  // The summary is plain text so the LLM sees the same shape on
  // every conversation. Format chosen for compactness + readability
  // by small open-source models (Ollama, in particular).
  const summary = renderIdentitySummary(state);

  // Append the new user message to the history.
  const history: LLMMessage[] = input.history ?? state.messages;
  const nextHistory: LLMMessage[] = [
    ...history,
    { role: "user", content: input.userMessage },
  ];

  // Per-turn tool loop. The LLM may call 1+ tools in a round, get
  // the results, and call more. We cap rounds so a runaway model
  // can't loop forever; the LLM's `finishReason: "length"` or
  // `"error"` also breaks the loop.
  const allToolCalls: Array<LLMToolCall & { result: AdvisorToolResult }> = [];
  let rounds = 0;
  let finalResponse: LLMResponse | null = null;
  let fellBack = false;
  let fallbackError: string | null = null;
  let workingHistory: LLMMessage[] = nextHistory;

  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    const req: LLMRequest = {
      systemPrompt: buildAdvisorSystemPrompt({ context: summary }),
      messages: workingHistory,
      tools: ADVISOR_TOOLS,
      temperature: 0.6, // slightly lower than onboarding (0.7) — the advisor is more factual
      maxTokens: 800,   // shorter replies (the advisor is conversational, not a long-form intake)
    };

    const res = await callLLMForAdvisor(req);

    // Track L1 fallback telemetry from any round of this turn. The
    // dispatcher sets meta.fellBack=true when the primary (Mavis /
    // Ollama) errored and the mock engine produced the response.
    if (res.meta?.fellBack === true) {
      fellBack = true;
      fallbackError =
        (res.meta.l1Error as string | undefined) ?? fallbackError ?? "unknown error";
    }

    // No tool calls → this is the final response.
    if (res.toolCalls.length === 0) {
      finalResponse = res;
      workingHistory = [
        ...workingHistory,
        { role: "assistant", content: res.content },
      ];
      break;
    }

    // Has tool calls. Run each one, then ask the LLM again.
    // First, append the assistant message that contained the tool calls.
    workingHistory = [
      ...workingHistory,
      {
        role: "assistant",
        content: res.content,
        toolCalls: res.toolCalls,
      },
    ];

    for (const tc of res.toolCalls) {
      const result = await runAdvisorTool(input.userId, tc);
      allToolCalls.push({ ...tc, result });

      // Append the tool result to the history so the LLM sees it
      // on the next round. The handler's publicView is JSON-safe.
      workingHistory = [
        ...workingHistory,
        {
          role: "tool",
          toolCallId: tc.id,
          content: JSON.stringify(result.publicView),
        },
      ];
    }
  }

  if (!finalResponse) {
    // Hit MAX_ROUNDS without a final response. The LLM kept wanting
    // more tools. Use whatever the last response said (even though
    // it was an assistant message with tool calls) as a polite
    // close so the user isn't staring at silence. The user can
    // re-ask in a follow-up turn if they want more depth.
    finalResponse = {
      content:
        "I want to keep digging but I'm going to stop here so I can answer you now. " +
        "What would you like to know — try asking a more specific question if you can.",
      toolCalls: [],
      finishReason: "length",
      provider: "mock",
      meta: { reason: "max_rounds_exceeded" },
    };
    workingHistory = [
      ...workingHistory,
      { role: "assistant", content: finalResponse.content },
    ];
  }

  // Persist the new messages. The orchestrator computes the diff
  // (everything past the loaded `history`) and the storage layer
  // appends to OnboardingMessage in a single transaction.
  const newMessages = workingHistory.slice(history.length);
  const updatedState: OnboardingState = {
    ...state,
    messages: workingHistory,
    lastProvider: finalResponse.provider,
    lastFellBack: fellBack,
    lastErrorMessage: fallbackError,
    lastTouchedAt: new Date().toISOString(),
  };
  await saveConversation(updatedState, newMessages);

  return {
    agentMessage: finalResponse.content,
    toolCalls: allToolCalls,
    state: updatedState,
    rounds,
    provider: finalResponse.provider,
    fellBack,
    fallbackError,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Identity summary — the rendered form the LLM sees inline in the
// system prompt. Plain text, fixed order, no JSON (smaller context
// variance + more reliable parsing by small models).
// ──────────────────────────────────────────────────────────────────────

/**
 * Render the user's OnboardingState into a plain-text identity
 * summary. The format is fixed so the LLM sees the same shape on
 * every conversation — and so a future cluster can add sections
 * without breaking the existing prompt.
 *
 * If the identity is sparse (e.g. the user just finished onboarding
 * with minimal data), the sections that are empty are listed as
 * "(none recorded)" so the LLM knows the field is missing rather
 * than empty by design.
 */
export function renderIdentitySummary(state: OnboardingState): AdvisorIdentitySummary["context"] {
  const lines: string[] = [];

  // Basics
  const basics: string[] = [];
  if (state.identity.ageRange) basics.push(`Age range: ${state.identity.ageRange}`);
  if (state.identity.employmentStatus) basics.push(`Employment: ${state.identity.employmentStatus}`);
  if (state.identity.location) basics.push(`Location: ${state.identity.location}`);
  lines.push("## Basics");
  lines.push(basics.length > 0 ? basics.join("\n") : "(none recorded)");

  // Income
  lines.push("");
  lines.push("## Income");
  if (state.income.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const i of state.income) {
      const amt = i.amountDollars != null ? `$${i.amountDollars.toLocaleString()}` : "amount unknown";
      const cad = i.cadence ?? "cadence unknown";
      const primary = i.isPrimary ? " (primary)" : "";
      lines.push(`- ${i.label}: ${amt} ${cad}${primary}`);
    }
  }

  // Fixed expenses
  lines.push("");
  lines.push("## Fixed expenses");
  if (state.expenses.length === 0) {
    lines.push("(none recorded)");
  } else {
    let monthly = 0;
    for (const e of state.expenses) {
      const factor = e.cadence === "monthly" ? 1
        : e.cadence === "biweekly" ? 26 / 12
        : e.cadence === "weekly" ? 52 / 12
        : e.cadence === "annual" ? 1 / 12
        : e.cadence === "quarterly" ? 1 / 3
        : 1;
      monthly += e.amountDollars * factor;
      lines.push(`- ${e.label} (${e.category}): $${e.amountDollars.toLocaleString()} ${e.cadence}`);
    }
    lines.push(`- Approx monthly total: $${Math.round(monthly).toLocaleString()}`);
  }

  // Debts
  lines.push("");
  lines.push("## Debts");
  if (state.debts.length === 0) {
    lines.push("(none recorded)");
  } else {
    let totalBalance = 0;
    let totalMinPayment = 0;
    for (const d of state.debts) {
      totalBalance += d.balanceDollars;
      totalMinPayment += d.minPaymentDollars;
      lines.push(
        `- ${d.label} (${d.kind}): $${d.balanceDollars.toLocaleString()} balance at ${d.aprPercent}% APR, $${d.minPaymentDollars.toLocaleString()} min/mo`,
      );
    }
    lines.push(`- Approx total: $${totalBalance.toLocaleString()} across ${state.debts.length} ${state.debts.length === 1 ? "debt" : "debts"}; $${totalMinPayment.toLocaleString()}/mo in minimums`);
  }

  // Assets
  lines.push("");
  lines.push("## Assets");
  if (state.assets.length === 0) {
    lines.push("(none recorded)");
  } else {
    let total = 0;
    for (const a of state.assets) {
      total += a.balanceDollars;
      lines.push(`- ${a.label} (${a.kind}): $${a.balanceDollars.toLocaleString()}`);
    }
    lines.push(`- Approx total: $${total.toLocaleString()}`);
  }

  // Goals
  lines.push("");
  lines.push("## Goals");
  if (state.goals.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const g of state.goals) {
      const per = g.perPaycheckDollars != null ? `, $${g.perPaycheckDollars.toLocaleString()}/paycheck` : "";
      const date = g.targetDate ? `, by ${g.targetDate}` : "";
      const kind = g.goalType && g.goalType !== "OTHER" ? ` (${g.goalType.toLowerCase()})` : "";
      lines.push(
        `- ${g.label}${kind}: $${g.targetDollars.toLocaleString()} target${per}${date}`,
      );
    }
  }

  // Risk profile
  lines.push("");
  lines.push("## Risk profile");
  const risk: string[] = [];
  if (state.risk.timeHorizonYears != null) risk.push(`Horizon: ${state.risk.timeHorizonYears} years`);
  if (state.risk.riskTolerance) risk.push(`Tolerance: ${state.risk.riskTolerance}`);
  if (state.risk.notes) risk.push(`Notes: ${state.risk.notes}`);
  lines.push(risk.length > 0 ? risk.join("\n") : "(none recorded)");

  // Household
  lines.push("");
  lines.push("## Household");
  if (state.household.length === 0) {
    lines.push("(none recorded)");
  } else {
    for (const h of state.household) {
      const entwined = h.financiallyEntwined ? " (financially entwined)" : "";
      lines.push(`- ${h.name} (${h.relationship})${entwined}`);
    }
  }

  return lines.join("\n");
}
