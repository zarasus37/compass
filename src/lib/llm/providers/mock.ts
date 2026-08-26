/**
 * Mock LLM provider — deterministic stub for tests + dev-without-keys.
 *
 * Cluster 5.0 Part A. The mock matches user messages against topic
 * patterns, calls the right tool, and returns a plausible follow-up
 * question. It is NOT a CFP-grade agent — it's a deterministic
 * baseline that proves the agent pipeline works end-to-end (the
 * system prompt is loaded, the tools are registered, the message
 * loop runs, the state is persisted). The real Mavis API is what
 * makes the actual conversation intelligent.
 *
 * Same conversation history → same response, so smokes are stable.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "../types";

/**
 * Internal state keyed by a seed + the count of user messages seen
 * so far. The mock advances through 5 topics (income, debts, goals,
 * risk, audit) in order, then returns the audit. Different seeds
 * produce the same deterministic sequence — the seed is for test
 * isolation, not for variety.
 */
interface MockState {
  seed: string;
  userTurnCount: number;
  topicsCovered: Set<string>;
}

const MOCK_STATES = new Map<string, MockState>();

function getOrCreateState(seed: string): MockState {
  let s = MOCK_STATES.get(seed);
  if (!s) {
    s = { seed, userTurnCount: 0, topicsCovered: new Set() };
    MOCK_STATES.set(seed, s);
  }
  return s;
}

/** Test-only — reset all mock state between smokes. */
export function resetMockState(seed?: string): void {
  if (seed === undefined) MOCK_STATES.clear();
  else MOCK_STATES.delete(seed);
}

export async function callMock(req: LLMRequest): Promise<LLMResponse> {
  const seed = req.model ?? "compass-mock-1";
  const state = getOrCreateState(seed);

  // The mock only needs the latest user message to decide what to do.
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return {
      content: "I didn't catch that. Could you say more?",
      toolCalls: [],
      finishReason: "stop",
      provider: "mock" satisfies LLMProvider as "mock",
    };
  }

  // Cluster 5.3.1 — the advisor's L1 fallback seed is
  // `l1-fallback-advisor`. The advisor is read-only; it should
  // NEVER call the onboarding tools (saveIncomeSource, saveGoal,
  // etc.). The mock is hard-coded with onboarding topic patterns
  // for deterministic smoke runs, so when we're being asked from
  // the advisor path, return a simple text-only response
  // regardless of what keywords the user message contains. The
  // handler-level smoke tests exercise the advisor's 7 read-only
  // tools directly (not through the mock).
  if (seed === "l1-fallback-advisor") {
    return {
      content:
        "Here's what I see in your identity. " +
        "Ask me anything specific — like 'how much on lights past 4 months' or " +
        "'which debt should I pay off first' — and I'll dig in. (Advisor L1 mock: " +
        "set LLM_PROVIDER_ADVISOR=ollama or mavis for a real answer.)",
      toolCalls: [],
      finishReason: "stop",
      provider: "mock",
    };
  }

  state.userTurnCount += 1;
  const t = lastUser.content.toLowerCase();

  // Topic detection — order matters (most-specific first).
  if (!state.topicsCovered.has("risk") && looksLikeRiskResponse(t)) {
    state.topicsCovered.add("risk");
    return {
      content:
        "Got it — 30 with a 35-year horizon and moderate risk tolerance. That fits the typical retirement-glidepath pattern. Let me put together your audit. One moment.",
      toolCalls: [
        toolCall("saveRiskProfile", {
          timeHorizonYears: 35,
          riskTolerance: "moderate",
          notes: "30 years old, targeting retirement at 65, moderate.",
        }),
        toolCall("buildAudit", {
          identity:
            "30-year-old with a $300K mortgage, $1,820 biweekly take-home, building toward a $20K emergency fund and a long-horizon retirement at 65.",
          findings:
            "\n- Housing is 50% of take-home — above the textbook 30% line.\n- 35-year horizon at moderate risk fits a typical retirement glidepath.\n- $20K emergency fund target is right at the 3-month-of-expenses guideline.",
          plan:
            "\n- Auto-allocate $432/check to the Emergency Fund envelope (TRANSFER, priority 1).\n- Once Emergency Fund hits $20K, redirect the sweep to the investment goal.\n- Hold the mortgage on schedule; no extra payment until the Emergency Fund is funded.",
          firstStep:
            "This week: set the auto-allocate plan to $432/check into the Emergency Fund envelope. Done.",
          teaching:
            "Compass treats your savings envelope as a hard cap, not a soft target — when the Emergency Fund hits $20K, the auto-sweep stops on its own.",
        }),
        toolCall("markOnboardingComplete", {
          completedAt: new Date().toISOString(),
        }),
      ],
      finishReason: "tool_calls",
      provider: "mock",
    };
  }

  if (!state.topicsCovered.has("goal") && looksLikeGoal(t)) {
    state.topicsCovered.add("goal");
    const targetDollars = extractDollars(t) ?? 20_000; // default $20k
    return {
      content: `Emergency fund target noted. The standard guideline is 3-6 months of essential expenses — we'll fine-tune the target once we know your fixed costs. What's the rough age range you're in, and how would you describe your risk comfort — conservative, moderate, or aggressive?`,
      toolCalls: [
        toolCall("saveGoal", {
          label: "Emergency Fund",
          targetDollars,
          targetDate: null,
          perPaycheckDollars: null,
          kind: "TRANSFER",
          goalType: "EMERGENCY",
          priority: 1,
        }),
      ],
      finishReason: "tool_calls",
      provider: "mock",
    };
  }

  if (!state.topicsCovered.has("debt") && looksLikeDebt(t)) {
    state.topicsCovered.add("debt");
    const balanceDollars = extractDollars(t) ?? 300_000; // default $300k
    const aprPercent = extractAprPercent(t) ?? 6.5; // default 6.50%
    return {
      content: `Got it on the ${describeDebt(t)}. Logged it. What's the next big thing you're saving for? An emergency fund, a goal, something else?`,
      toolCalls: [
        toolCall("saveDebt", {
          label: extractDebtName(t) ?? "Mortgage",
          balanceDollars,
          aprPercent,
          minPaymentDollars: 1800,
          kind: "mortgage",
        }),
      ],
      finishReason: "tool_calls",
      provider: "mock",
    };
  }

  if (!state.topicsCovered.has("income") && looksLikeIncome(t)) {
    state.topicsCovered.add("income");
    const cadence = extractCadence(t);
    const amountDollars = extractDollars(t);
    if (cadence && amountDollars) {
      // We have both — save them together. The follow-up question
      // asks for the per-paycheck take-home if the user gave a
      // different number (e.g. "$50K/year, biweekly" — we still need
      // the actual take-home).
      return {
        content: `Got it — ${cadence}, ${formatDollars(amountDollars)}. Anything else as far as income goes — a side gig, pension, social security? If not, let's talk bills.`,
        toolCalls: [
          toolCall("saveIncomeSource", {
            label: "Primary",
            cadence,
            amountDollars,
            isPrimary: true,
          }),
        ],
        finishReason: "tool_calls",
        provider: "mock",
      };
    }
    if (cadence) {
      return {
        content: `Cadence noted — ${cadence}. What's the rough take-home per paycheck? (Doesn't have to be exact.)`,
        toolCalls: [
          toolCall("saveIncomeSource", {
            label: "Primary",
            cadence,
            amountDollars: null,
            isPrimary: true,
          }),
        ],
        finishReason: "tool_calls",
        provider: "mock",
      };
    }
    if (amountDollars) {
      return {
        content: `Got it — ${formatDollars(amountDollars)} per paycheck. How often does that hit? Weekly, biweekly, twice a month, monthly?`,
        toolCalls: [
          toolCall("saveIncomeSource", {
            label: "Primary",
            cadence: null,
            amountDollars,
            isPrimary: true,
          }),
        ],
        finishReason: "tool_calls",
        provider: "mock",
      };
    }
  }

  // Default fallback — keep the conversation moving.
  return {
    content:
      "Tell me a bit more — what kind of work do you do, and how often does the money come in?",
    toolCalls: [],
    finishReason: "stop",
    provider: "mock",
  };
}

// ──────────────────────────────────────────────────────────────────────
// Topic detection — order matters; the first match wins.
// ──────────────────────────────────────────────────────────────────────

function looksLikeIncome(text: string): boolean {
  return /\b(paycheck|paid|salary|income|every\s+(week|two\s*weeks|2\s*weeks|month)|biweekly|monthly|weekly|per\s+paycheck|per\s+month|take[- ]home)\b/.test(
    text,
  );
}

function looksLikeDebt(text: string): boolean {
  return /\b(mortgage|loan|credit\s*card|debt|owe|balance|apr|interest\s*rate|car\s*loan|student\s*loan)\b/.test(
    text,
  );
}

function looksLikeGoal(text: string): boolean {
  return /\b(save|saving|goal|emergency\s*fund|target|fund|retirement|invest|down\s*payment|trip)\b/.test(
    text,
  );
}

function looksLikeRiskResponse(text: string): boolean {
  return (
    /\b(conservative|moderate|aggressive|risk\s*comfort|risk\s*tolerance)\b/.test(text) &&
    (/\b\d{2}\b/.test(text) || /\b(retire|age|horizon)\b/.test(text))
  );
}

// ──────────────────────────────────────────────────────────────────────
// Extraction helpers
// ──────────────────────────────────────────────────────────────────────

function extractDollars(text: string): number | null {
  // Match "$300K", "$300,000", "300000", "2,000", etc. Returns DOLLARS.
  const m =
    text.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([kKmM]?)\b/) ??
    text.match(/\b(\d{1,3}(?:,\d{3})*)\b\s*(?:dollars?|bucks?)/i);
  if (!m || m[1] === undefined) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(num)) return null;
  const suffix = m[2] ?? "";
  // "$300K" → 300_000 dollars
  // If "k", the number is in thousands of dollars.
  // If no suffix, the number is in dollars.
  // For "M" suffix: number is in millions of dollars.
  if (suffix === "k" || suffix === "K") return Math.round(num * 1_000);
  if (suffix === "m" || suffix === "M") return Math.round(num * 1_000_000);
  return Math.round(num);
}

function extractAprPercent(text: string): number | null {
  // "6.5%" → 6.5. "6.5 %" same. "6.5 percent" same.
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  if (!m || m[1] === undefined) return null;
  return parseFloat(m[1]);
}

function extractCadence(text: string): "weekly" | "biweekly" | "semi_monthly" | "monthly" | null {
  if (/\b(weekly|every\s+week|once\s+a\s+week)\b/.test(text)) return "weekly";
  if (/\b(biweekly|every\s+(other\s+)?two\s*weeks|every\s+2\s*weeks|fortnightly|every\s+other\s+week)\b/.test(
    text,
  ))
    return "biweekly";
  if (/\b(semi[- ]monthly|twice\s+a\s+month|every\s+two\s+weeks\b.*(1st|15th)|1st.*15th)\b/.test(text))
    return "semi_monthly";
  if (/\b(monthly|every\s+month|once\s+a\s+month)\b/.test(text)) return "monthly";
  return null;
}

function extractDebtName(text: string): string | null {
  if (/\bmortgage\b/.test(text)) return "Mortgage";
  if (/\b(student\s+loan)\b/.test(text)) return "Student Loan";
  if (/\b(car\s+loan|auto\s+loan)\b/.test(text)) return "Car Loan";
  if (/\bcredit\s*card\b/.test(text)) return "Credit Card";
  return null;
}

function describeDebt(text: string): string {
  const name = extractDebtName(text) ?? "debt";
  return name.toLowerCase();
}

function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ──────────────────────────────────────────────────────────────────────
// Tool call helper
// ──────────────────────────────────────────────────────────────────────

let _toolCallCounter = 0;
function toolCall(name: string, args: Record<string, unknown>): LLMToolCall {
  _toolCallCounter += 1;
  return {
    id: `mock_tc_${_toolCallCounter}`,
    name,
    args,
  };
}
