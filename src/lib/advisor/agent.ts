/**
 * Advisor agent orchestrator — `runAdvisor` for v1.
 *
 * Cluster 5.3. The post-onboarding "ask me anything" surface. Single
 * LLM call per user turn, no tool loop, no state mutation beyond
 * appending to the chat log.
 *
 * What's different from the onboarding agent (`onboarding/agent.ts`):
 *
 *   - **No tools.** The advisor is read-only. The identity is
 *     prepended to the system prompt as a deterministic summary;
 *     the LLM answers questions about it without needing to look
 *     anything up.
 *   - **Single LLM round.** The onboarding agent loops up to 6
 *     rounds (because the LLM may call multiple tools before
 *     producing the final answer). The advisor doesn't, so one
 *     call is enough.
 *   - **Shared history with onboarding.** The advisor and the
 *     onboarding chat both write to the same OnboardingMessage
 *     log. The user can ask a question during onboarding, then
 *     continue in /advisor — the history is one thread. The
 *     FinancialIdentity is the single source of truth, and the
 *     OnboardingMessage log is the single conversation log.
 *   - **Read-only identity.** The agent's `runAdvisor` never
 *     mutates the identity, the goals, or any production table.
 *     The chat history is the only side effect.
 *
 * The L1 rules fallback (Mavis / Ollama error → mock) still
 * applies — the dispatcher in `lib/llm` handles it, and we surface
 * `meta.fellBack` on the result so the chat UI can show a banner.
 * The mock's deterministic seed becomes the same per-conversation
 * `advisor-<userId>` so a user who flips providers mid-conversation
 * keeps the same context.
 */

import "server-only";
import type { LLMMessage, LLMRequest, LLMResponse } from "../llm/types";
import { callLLM } from "../llm";
import { buildAdvisorSystemPrompt, type AdvisorIdentitySummary } from "./system-prompt";
import { loadConversation, saveConversation, type OnboardingState } from "../onboarding/state";

// ───────────────────────────────────────────────────────────────────────
// Public types
// ───────────────────────────────────────────────────────────────────────

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
  /** The conversation state after the turn. */
  state: OnboardingState;
  /** The provider that produced the final response. */
  provider: "mavis" | "ollama" | "mock";
  /** True if the LLM primary errored and the L1 rules fallback ran. */
  fellBack: boolean;
  /** The primary provider's error message when fellBack=true. */
  fallbackError: string | null;
}

// ───────────────────────────────────────────────────────────────────────
// The agent
// ───────────────────────────────────────────────────────────────────────

/**
 * Run one advisor turn. Loads the user's identity + history, builds
 * a system prompt with the identity inline, makes a single LLM call,
 * and saves the new messages back to the OnboardingMessage log.
 *
 * Requires the user to have a completed identity (the advisor
 * answers questions about the identity — if it's empty, the user
 * should finish onboarding first). The function does NOT enforce
 * that gate; the API route /api/advisor/run checks it before
 * calling runAdvisor (so the chat UI can render a helpful "go
 * finish onboarding" message instead of an exception).
 */
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

  const req: LLMRequest = {
    systemPrompt: buildAdvisorSystemPrompt({ context: summary }),
    messages: nextHistory,
    // No tools in v1 — the identity is inline, the LLM answers
    // from context. A future cluster can add a single read-only
    // tool (e.g. `querySnapshot` for current balances) if the
    // context-window budget can't fit the identity.
    tools: [],
    temperature: 0.6, // slightly lower than onboarding (0.7) — the advisor is more factual
    maxTokens: 800,   // shorter replies (the advisor is conversational, not a long-form intake)
  };

  const res: LLMResponse = await callLLM(req);

  // The L1 rules fallback (real provider errored) is reported via
  // res.meta.fellBack. We surface it on the result so the chat UI
  // can show a "we had trouble reaching Mavis; using a backup"
  // banner, matching the onboarding flow's behavior.
  const fellBack = res.meta?.fellBack === true;
  const fallbackError =
    (res.meta?.l1Error as string | undefined) ?? null;

  // Append the assistant's final response to the working history.
  const workingHistory: LLMMessage[] = [
    ...nextHistory,
    { role: "assistant", content: res.content },
  ];

  // Persist the new messages. The orchestrator computes the diff
  // (everything past the loaded `history`) and the storage layer
  // appends to OnboardingMessage in a single transaction.
  const newMessages = workingHistory.slice(history.length);
  const updatedState: OnboardingState = {
    ...state,
    messages: workingHistory,
    lastProvider: res.provider,
    lastFellBack: fellBack,
    lastErrorMessage: fallbackError,
    lastTouchedAt: new Date().toISOString(),
  };
  await saveConversation(updatedState, newMessages);

  return {
    agentMessage: res.content,
    state: updatedState,
    provider: res.provider,
    fellBack,
    fallbackError,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Identity summary — the rendered form the LLM sees inline in the
// system prompt. Plain text, fixed order, no JSON (smaller context
// variance + more reliable parsing by small models).
// ───────────────────────────────────────────────────────────────────────

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
