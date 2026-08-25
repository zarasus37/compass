/**
 * Onboarding agent orchestrator — `runAgent` for v1.
 *
 * Cluster 5.0 Part A. In-memory state keyed by user; persistence
 * (FinancialIdentity + OnboardingConversation tables) lands in
 * Part B. The orchestrator handles the full per-turn loop:
 *
 *   userMessage + history → LLM call → tool calls? → run tools →
 *   feed results back → LLM call again → ... → final response
 *
 * The caller (the chat UI in Cluster 5.1) hands us the latest
 * user message + the full history; we return:
 *   - the final assistant text (what the user sees)
 *   - the list of tool calls that were made and their results
 *   - the current snapshot of in-memory state (so the caller
 *     can persist it on its way out)
 *
 * For the smoke, the caller just runs `runAgent` once per turn
 * and asserts the state advances as expected.
 */

import type { LLMMessage, LLMRequest, LLMResponse, LLMToolCall } from "../llm/types";
import { callLLM } from "../llm";
import { ONBOARDING_SYSTEM_PROMPT } from "./system-prompt";
import { ONBOARDING_TOOLS } from "./tools";
import {
  loadConversation,
  saveConversation,
  snapshotState,
  type OnboardingState,
  type ToolResult,
  type SaveResult,
} from "./state";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export interface RunAgentInput {
  userId: string;
  /** The latest user message. Appended to the conversation history. */
  userMessage: string;
  /**
   * Optional pre-loaded history. If absent, we read from the
   * in-memory state (for v1). The chat UI will pass its own
   * loaded history once persistence is wired.
   */
  history?: LLMMessage[];
}

export interface RunAgentResult {
  /** The final assistant text the user sees. */
  agentMessage: string;
  /** Every tool call the agent made, in order, with its result. */
  toolCalls: Array<LLMToolCall & { result: ToolResult }>;
  /** The conversation state after the turn. */
  state: OnboardingState;
  /** How many LLM round-trips this turn took (1 if no tool calls). */
  rounds: number;
  /** The provider that produced the final response. */
  provider: "mavis" | "ollama" | "mock";
  /** True if the agent called markOnboardingComplete during this turn. */
  onboardingCompleted: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// The agent
// ──────────────────────────────────────────────────────────────────────

/** Hard cap on LLM round-trips per user turn. Prevents infinite tool loops. */
const MAX_ROUNDS = 6;

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const state = loadConversation(input.userId);
  const history: LLMMessage[] = input.history ?? state.messages;

  // Append the new user message to the history.
  const nextHistory: LLMMessage[] = [
    ...history,
    { role: "user", content: input.userMessage },
  ];

  const allToolCalls: Array<LLMToolCall & { result: ToolResult }> = [];
  let rounds = 0;
  let finalResponse: LLMResponse | null = null;
  let onboardingCompleted = false;

  // Per-turn tool loop. The agent may call tools, get results, and
  // call more tools. We cap the rounds so a runaway agent can't loop
  // forever; the LLM's `finishReason: "length"` or `"error"` also
  // breaks the loop.
  let workingHistory: LLMMessage[] = nextHistory;
  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    const req: LLMRequest = {
      systemPrompt: ONBOARDING_SYSTEM_PROMPT,
      messages: workingHistory,
      tools: ONBOARDING_TOOLS,
      temperature: 0.7,
      maxTokens: 1500,
    };

    const res = await callLLM(req);

    // No tool calls → this is the final response.
    if (res.toolCalls.length === 0) {
      finalResponse = res;
      // Append the assistant's final message to history.
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
      const result = runToolCall(state, tc);
      allToolCalls.push({ ...tc, result });

      if (tc.name === "markOnboardingComplete") {
        onboardingCompleted = true;
      }

      // Append the tool result to the history so the LLM sees it
      // on the next round.
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
    // Hit MAX_ROUNDS without a final response. Fall back to a polite
    // close so the user isn't staring at silence.
    finalResponse = {
      content:
        "I'm going to write up what I have so far — give me a moment. " +
        "We'll pick up the rest on the dashboard.",
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

  // Persist the updated state.
  const updatedState: OnboardingState = {
    ...state,
    messages: workingHistory,
    lastProvider: finalResponse.provider,
    lastTouchedAt: new Date().toISOString(),
  };
  saveConversation(updatedState);

  return {
    agentMessage: finalResponse.content,
    toolCalls: allToolCalls,
    state: updatedState,
    rounds,
    provider: finalResponse.provider,
    onboardingCompleted,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Tool dispatcher — turns the LLM's tool calls into state mutations.
// ──────────────────────────────────────────────────────────────────────

function runToolCall(state: OnboardingState, tc: LLMToolCall): ToolResult {
  const a = tc.args as Record<string, unknown>;
  switch (tc.name) {
    case "saveIdentityBasics":
      return saveIdentityBasicsImpl(state, a);
    case "saveIncomeSource":
      return saveIncomeSourceImpl(state, a);
    case "saveFixedExpense":
      return saveFixedExpenseImpl(state, a);
    case "saveDebt":
      return saveDebtImpl(state, a);
    case "saveAsset":
      return saveAssetImpl(state, a);
    case "saveGoal":
      return saveGoalImpl(state, a);
    case "saveRiskProfile":
      return saveRiskProfileImpl(state, a);
    case "savePlannedEvent":
      return savePlannedEventImpl(state, a);
    case "saveHouseholdMember":
      return saveHouseholdMemberImpl(state, a);
    case "savePreferences":
      return savePreferencesImpl(state, a);
    case "buildAudit":
      return buildAuditImpl(state, a);
    case "markOnboardingComplete":
      return markOnboardingCompleteImpl(state, a);
    default:
      return {
        publicView: { ok: false, error: `Unknown tool: ${tc.name}` },
      };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Per-tool implementations. v1 mutates the in-memory state object.
// In Part B, these become Prisma writes; the publicView shapes stay
// the same so the agent's view of the world doesn't change.
// ──────────────────────────────────────────────────────────────────────

function saveIdentityBasicsImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  state.identity.ageRange = (a.ageRange as string | undefined) ?? state.identity.ageRange;
  state.identity.employmentStatus =
    (a.employmentStatus as string | undefined) ?? state.identity.employmentStatus;
  if (a.location) state.identity.location = a.location as string;
  return ack(state, "identity basics saved");
}

function saveIncomeSourceImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Primary",
    cadence: (a.cadence as string | undefined) ?? null,
    amountDollars: (a.amountDollars as number | undefined) ?? null,
    isPrimary: a.isPrimary === true,
  };
  state.income.push(entry);
  return ack(state, "income source saved", { count: state.income.length });
}

function saveFixedExpenseImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Expense",
    amountDollars: numberOrZero(a.amountDollars),
    cadence: (a.cadence as string | undefined) ?? "monthly",
    category: (a.category as string | undefined) ?? "other",
  };
  state.expenses.push(entry);
  return ack(state, "fixed expense saved", { count: state.expenses.length });
}

function saveDebtImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Debt",
    kind: (a.kind as string | undefined) ?? "other",
    balanceDollars: numberOrZero(a.balanceDollars),
    aprPercent: numberOrZero(a.aprPercent),
    minPaymentDollars: numberOrZero(a.minPaymentDollars),
  };
  state.debts.push(entry);
  return ack(state, "debt saved", { count: state.debts.length });
}

function saveAssetImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Asset",
    kind: (a.kind as string | undefined) ?? "other",
    balanceDollars: numberOrZero(a.balanceDollars),
  };
  state.assets.push(entry);
  return ack(state, "asset saved", { count: state.assets.length });
}

function saveGoalImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Goal",
    targetDollars: numberOrZero(a.targetDollars),
    targetDate: (a.targetDate as string | undefined) ?? null,
    perPaycheckDollars: (a.perPaycheckDollars as number | undefined) ?? null,
    kind: (a.kind as string | undefined) ?? "MILESTONE",
    goalType: (a.goalType as string | undefined) ?? "OTHER",
    priority: typeof a.priority === "number" ? a.priority : 2,
  };
  state.goals.push(entry);
  return ack(state, "goal saved", { count: state.goals.length });
}

function saveRiskProfileImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  state.risk = {
    timeHorizonYears: typeof a.timeHorizonYears === "number" ? a.timeHorizonYears : null,
    riskTolerance: (a.riskTolerance as string | undefined) ?? null,
    notes: (a.notes as string | undefined) ?? null,
  };
  return ack(state, "risk profile saved");
}

function savePlannedEventImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    label: (a.label as string | undefined) ?? "Event",
    date: (a.date as string | undefined) ?? null,
    estimatedCostDollars: numberOrZero(a.estimatedCostDollars),
    isFlexible: a.isFlexible === true,
  };
  state.events.push(entry);
  return ack(state, "planned event saved", { count: state.events.length });
}

function saveHouseholdMemberImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  const entry = {
    name: (a.name as string | undefined) ?? "Member",
    relationship: (a.relationship as string | undefined) ?? "other",
    financiallyEntwined: a.financiallyEntwined === true,
    ageRange: (a.ageRange as string | undefined) ?? null,
  };
  state.household.push(entry);
  return ack(state, "household member saved", { count: state.household.length });
}

function savePreferencesImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  if (a.aiTier) state.preferences.aiTier = a.aiTier as string;
  if (a.riskComfort) state.preferences.riskComfort = a.riskComfort as string;
  if (a.currency) state.preferences.currency = a.currency as string;
  return ack(state, "preferences saved");
}

function buildAuditImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  state.audit = {
    identity: (a.identity as string | undefined) ?? "",
    findings: (a.findings as string | undefined) ?? "",
    plan: (a.plan as string | undefined) ?? "",
    firstStep: (a.firstStep as string | undefined) ?? "",
    teaching: (a.teaching as string | undefined) ?? "",
    builtAt: new Date().toISOString(),
  };
  return ack(state, "audit built", { hasIdentity: !!state.audit.identity });
}

function markOnboardingCompleteImpl(state: OnboardingState, a: Record<string, unknown>): ToolResult {
  state.completedAt = (a.completedAt as string | undefined) ?? new Date().toISOString();
  return ack(state, "onboarding complete", { completedAt: state.completedAt });
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function numberOrZero(v: unknown): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  return 0;
}

function ack(state: OnboardingState, message: string, extra?: Record<string, unknown>): ToolResult {
  const result: SaveResult = { ok: true, message, ...(extra ?? {}) };
  // Some tools want to inspect the post-save state snapshot.
  return { publicView: result, stateSnapshot: snapshotState(state) };
}
