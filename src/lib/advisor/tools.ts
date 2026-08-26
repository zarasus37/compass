/**
 * Advisor tool definitions — the read-only toolset the advisor LLM can call.
 *
 * Cluster 5.3.1. The advisor is the post-onboarding "ask me anything"
 * surface. Unlike the onboarding agent (which has 12 write-tools that
 * build the FinancialIdentity), the advisor has 7 **read-only** tools
 * that look up live data — transactions, envelopes, bills, debts,
 * goals, paycheck simulation, and a spending summary.
 *
 * The advisor is intentionally read-only: the user can ask anything
 * about their money, but cannot change it through the chat. Edits to
 * income / debts / goals go through the onboarding flow (or a future
 * edit surface). The advisor's job is to surface observations and
 * answer questions, not to mutate the identity.
 *
 * Conventions (matching the onboarding tools):
 * - Money is *dollars* in the tool args (not cents). Handlers convert
 *   to integer cents before hitting the engine. The LLM thinks in
 *   dollars; the store thinks in cents.
 * - Dates are ISO 8601 date strings (YYYY-MM-DD). Handlers parse.
 * - `payeeLike` is a case-insensitive substring match (e.g. "lights"
 *   matches "Reliant Energy", "City of Lights", "LightHouse Cafe").
 * - All optional fields are genuinely optional. Handlers default
 *   sensibly when an arg is missing or null.
 *
 * Design notes:
 * - The tools are **data-tailored** (per the two-tier pattern: Mavis-
 *   grade extraction, lighter-model advisory). The advisor's value
 *   comes from smart queries against the user's data, not from
 *   general knowledge. A 1B-param model with great tool calls
 *   out-performs a 70B-param model that has to guess.
 * - Tool results are **plain JSON**, never the engine's internal
 *   shapes. The handler converts cents→dollars, Date→ISO string,
 *   and strips fields the LLM doesn't need. Smaller tokens, less
 *   parsing confusion for small models.
 * - `simulatePaycheck` is a read-only simulation — it computes the
 *   allocation plan in memory and returns the breakdown without
 *   persisting any state. The user can ask "what if I made $X" and
 *   see the plan without affecting the live rebalance engine.
 */

import type { LLMTool } from "../llm/types";

// ──────────────────────────────────────────────────────────────────────
// 1. queryTransactions — look up recent transactions with filters.
// ──────────────────────────────────────────────────────────────────────
export const queryTransactions: LLMTool = {
  name: "queryTransactions",
  description:
    "Look up recent transactions. All filters are optional and combine with AND. " +
    "Use `payeeLike` to find a specific merchant (case-insensitive substring; 'lights' matches 'Reliant Energy', 'City of Lights', etc.). " +
    "Use `envelopeId` to scope to a single vessel (e.g. 'env-groceries'). " +
    "Use `since` / `until` (ISO dates, inclusive) to bound the time window. " +
    "Use `groupBy` to roll up: 'month' (totals per month), 'envelope' (totals per vessel), 'payee' (totals per merchant). " +
    "When `groupBy` is set, the response is a list of buckets with totals instead of raw rows. " +
    "Returns at most 50 raw rows or 30 buckets (whichever is smaller); if the user needs more, narrow the filter.",
  parameters: {
    type: "object",
    properties: {
      payeeLike: {
        type: "string",
        description:
          "Case-insensitive substring match against the payee name. Omit to match all payees.",
      },
      envelopeId: {
        type: "string",
        description:
          "Restrict to transactions in this envelope (e.g. 'env-groceries'). Omit to match all envelopes.",
      },
      since: {
        type: "string",
        description:
          "ISO 8601 date (YYYY-MM-DD). Only include transactions on or after this date.",
      },
      until: {
        type: "string",
        description:
          "ISO 8601 date (YYYY-MM-DD). Only include transactions on or before this date.",
      },
      groupBy: {
        type: "string",
        enum: ["month", "envelope", "payee"],
        description:
          "Roll up the results. Omit for raw rows. 'month' groups by calendar month; 'envelope' by envelope id; 'payee' by merchant name.",
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 2. queryEnvelopes — read the user's vessels (current + target).
// ──────────────────────────────────────────────────────────────────────
export const queryEnvelopes: LLMTool = {
  name: "queryEnvelopes",
  description:
    "Read the user's envelopes (vessels). Returns the current balance and the target for each. " +
    "Use this to ground any 'how much do I have in X' or 'which envelopes are nearly full' question. " +
    "The list is the canonical 7 planetary vessels seeded on signup, plus any user-added envelopes. " +
    "No filters — the list is small.",
  parameters: {
    type: "object",
    properties: {},
  },
};

// ──────────────────────────────────────────────────────────────────────
// 3. queryBills — read recurring bills, optionally filtered.
// ──────────────────────────────────────────────────────────────────────
export const queryBills: LLMTool = {
  name: "queryBills",
  description:
    "Read the user's recurring bills. " +
    "Use `dueWithin` (integer days) to scope to bills due in the next N days (e.g. 14 for 'the next two weeks'). " +
    "Use `unpaidOnly: true` to skip bills that have already been paid this period. " +
    "Returns name, amount, due day, autopay, paid status, and the linked envelope. " +
    "Use this for 'what bills are coming up' or 'how much is due before payday'.",
  parameters: {
    type: "object",
    properties: {
      dueWithin: {
        type: "integer",
        description:
          "Only include bills due in the next N days. Omit for all bills (paid and unpaid).",
      },
      unpaidOnly: {
        type: "boolean",
        description:
          "True to skip bills that have been paid this period. False to include all. Default false.",
        default: false,
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 4. queryDebts — read debts, optionally sorted.
// ──────────────────────────────────────────────────────────────────────
export const queryDebts: LLMTool = {
  name: "queryDebts",
  description:
    "Read the user's debts. " +
    "Use `orderBy` to sort: 'apr' (highest first — the avalanche order, saves the most interest), " +
    "'balance' (largest first — useful for 'biggest debt' questions), " +
    "'minPayment' (highest minimum first — useful for 'which eats the most cash flow'). " +
    "Default order is the user's custom sort order. " +
    "Each row has name, balance, APR, minimum payment, and due day. " +
    "Use this for 'which debt should I pay off first' or 'how much do I owe at >20% APR'.",
  parameters: {
    type: "object",
    properties: {
      orderBy: {
        type: "string",
        enum: ["apr", "balance", "minPayment"],
        description: "Sort order. Omit for the user's custom order.",
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 5. queryGoals — read goals, optionally filtered.
// ──────────────────────────────────────────────────────────────────────
export const queryGoals: LLMTool = {
  name: "queryGoals",
  description:
    "Read the user's financial goals. " +
    "Use `priority` to filter: 1 (top priority), 2 (next), etc. " +
    "Use `kind` to filter: 'EMERGENCY' (the emergency-fund goal), 'INVEST' (long-horizon investment), 'OTHER' (custom goals like trips, purchases). " +
    "Each row has label, target, current amount, target date, per-paycheck contribution, and the linked envelope. " +
    "Use this for 'how much do I need to save by X date' or 'what's my top-priority goal'.",
  parameters: {
    type: "object",
    properties: {
      priority: {
        type: "integer",
        description: "Filter to goals with this priority (1 = top). Omit for all.",
      },
      kind: {
        type: "string",
        enum: ["EMERGENCY", "INVEST", "OTHER"],
        description: "Filter to a kind. Omit for all.",
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 6. simulatePaycheck — read-only rebalance simulation.
// ──────────────────────────────────────────────────────────────────────
export const simulatePaycheck: LLMTool = {
  name: "simulatePaycheck",
  description:
    "Simulate a paycheck of the given amount through the user's allocation plan, returning the breakdown by envelope WITHOUT mutating any state. " +
    "Use this for 'what if I made $5,000 next check' or 'how much would go to savings on $4,000'. " +
    "The result is a list of { envelopeName, allocatedCents } buckets, plus the unallocated remainder. " +
    "Pure read-only: nothing is saved, no audit row, no balance change.",
  parameters: {
    type: "object",
    properties: {
      amountDollars: {
        type: "number",
        description: "Paycheck amount in dollars. Pass the take-home figure the user mentions.",
      },
    },
    required: ["amountDollars"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 7. summarizeSpending — aggregate transactions over a window.
// ──────────────────────────────────────────────────────────────────────
export const summarizeSpending: LLMTool = {
  name: "summarizeSpending",
  description:
    "Summarize the user's spending over a time window. " +
    "Use `since` (ISO date) to bound the window; default is the last 90 days. " +
    "Use `by` to pick the dimension: 'envelope' (which vessels got the most), 'payee' (which merchants got the most). " +
    "Returns the top 10 buckets with count + total. " +
    "Use this for 'where is most of my money going' or 'which subscriptions can I cut' or 'am I spending more on dining than I used to'.",
  parameters: {
    type: "object",
    properties: {
      since: {
        type: "string",
        description:
          "ISO 8601 date (YYYY-MM-DD). Only include transactions on or after this date. Default: 90 days ago.",
      },
      by: {
        type: "string",
        enum: ["envelope", "payee"],
        description: "Aggregation dimension. Default 'envelope'.",
        default: "envelope",
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// The full tool registry — what the LLM sees.
// ──────────────────────────────────────────────────────────────────────
export const ADVISOR_TOOLS: LLMTool[] = [
  queryTransactions,
  queryEnvelopes,
  queryBills,
  queryDebts,
  queryGoals,
  simulatePaycheck,
  summarizeSpending,
];
