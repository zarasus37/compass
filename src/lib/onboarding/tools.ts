/**
 * Onboarding tool definitions — the JSON schemas the agent sees.
 *
 * Cluster 5.0 Part A. These are the *schemas* the agent reasons about.
 * The actual save logic lives in the orchestrator (agent.ts); the
 * schemas are pure data — no side effects, no I/O.
 *
 * The 12 tools map 1:1 to the 8 topic areas in the system prompt,
 * with planned events, household members, and preferences as
 * orthogonal axes. Two closing tools (`buildAudit`, `markOnboardingComplete`)
 * terminate the conversation.
 *
 * Conventions:
 * - Money is *dollars* in the tool args (not cents). The orchestrator
 *   converts to integer cents before persistence. This matches the
 *   user's mental model — they say "$1,820", not "182000 cents."
 * - Dates are ISO 8601 date strings (YYYY-MM-DD) for events and
 *   goal target dates. The orchestrator parses to Date.
 * - Cadences are constrained enums that match `PaySchedule.cadence`
 *   and the bill cadence vocabulary.
 * - Every optional field is genuinely optional. The agent shouldn't
 *   be forced to fill every slot.
 */

import type { LLMTool } from "../llm/types";

// ──────────────────────────────────────────────────────────────────────
// 1. saveIdentityBasics — the user's age, location, employment snapshot.
// ──────────────────────────────────────────────────────────────────────
export const saveIdentityBasics: LLMTool = {
  name: "saveIdentityBasics",
  description:
    "Save the user's basic identity facts: age range, employment status, and (optionally) their general location. Call this once you have a usable answer; refine later if the user volunteers more.",
  parameters: {
    type: "object",
    properties: {
      ageRange: {
        type: "string",
        enum: ["under_18", "18_24", "25_34", "35_44", "45_54", "55_64", "65_plus"],
        description:
          "The user's age range. Pick the closest band; do not ask for an exact age.",
      },
      employmentStatus: {
        type: "string",
        enum: [
          "employed_full_time",
          "employed_part_time",
          "self_employed",
          "unemployed",
          "retired",
          "student",
          "disabled",
          "other",
        ],
        description: "The user's primary employment status.",
      },
      location: {
        type: "string",
        description:
          "Optional. The user's general location — country, or US state, or just a city. Free-form; not validated.",
      },
    },
    required: ["ageRange", "employmentStatus"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 2. saveIncomeSource — one paycheck stream.
// ──────────────────────────────────────────────────────────────────────
export const saveIncomeSource: LLMTool = {
  name: "saveIncomeSource",
  description:
    "Save one income source (a paycheck, a pension, a side gig, social security). Call once per source. The user may give you the amount or the cadence first — pass whichever you have, set the other to null. The orchestrator can refine a partial record on a later call.",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description:
          'A short human-readable name. "Acme Corp salary", "Freelance writing", "Social Security". Defaults to "Primary" if omitted.',
      },
      cadence: {
        type: "string",
        enum: ["weekly", "biweekly", "semi_monthly", "monthly", "irregular"],
        description: "How often this income hits. 'irregular' for gig work that varies.",
      },
      amountDollars: {
        type: "number",
        description:
          "Take-home per pay period, in dollars (not cents). Pass null if the user gave cadence but not the amount.",
      },
      isPrimary: {
        type: "boolean",
        description:
          "True if this is the user's main income source. At most one income source per user should have isPrimary=true.",
        default: false,
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 3. saveFixedExpense — a recurring fixed cost (rent, utilities, insurance).
// ──────────────────────────────────────────────────────────────────────
export const saveFixedExpense: LLMTool = {
  name: "saveFixedExpense",
  description:
    "Save one fixed recurring expense — rent/mortgage, utilities, insurance premiums, subscriptions the user is sure of. Do NOT save debt minimums here; those have their own tool (saveDebt).",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: 'Short name. "Rent", "Spectrum internet", "Car insurance".',
      },
      amountDollars: {
        type: "number",
        description: "Amount per period, in dollars.",
      },
      cadence: {
        type: "string",
        enum: ["weekly", "biweekly", "semi_monthly", "monthly", "quarterly", "annual"],
        description: "How often the bill is due.",
      },
      category: {
        type: "string",
        enum: [
          "housing",
          "utilities",
          "insurance",
          "food",
          "transportation",
          "healthcare",
          "childcare",
          "entertainment",
          "other",
        ],
        description:
          "Which spending bucket. Used to assign the expense to a vessel later.",
        default: "other",
      },
    },
    required: ["label", "amountDollars", "cadence"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 4. saveDebt — one debt with balance, APR, and minimum payment.
// ──────────────────────────────────────────────────────────────────────
export const saveDebt: LLMTool = {
  name: "saveDebt",
  description:
    "Save one debt. The user may give you the debt in any order; pass what you have, set unknowns to 0 or null. APR is required for the avalanche/snowball choice to be meaningful — if the user doesn't know, ask once and offer to refine later.",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: 'Short name. "Chase Sapphire", "Federal student loan", "Mortgage".',
      },
      kind: {
        type: "string",
        enum: [
          "credit_card",
          "mortgage",
          "student_loan",
          "auto_loan",
          "personal_loan",
          "medical",
          "other",
        ],
        description: "The debt type. Drives the icon and the visual category.",
      },
      balanceDollars: {
        type: "number",
        description: "Current outstanding balance in dollars. 0 if unknown.",
      },
      aprPercent: {
        type: "number",
        description:
          "Annual percentage rate, in percent (e.g. 6.5 for 6.5%). 0 if unknown — the agent will ask for a best guess.",
      },
      minPaymentDollars: {
        type: "number",
        description: "Minimum monthly payment in dollars. 0 if unknown.",
      },
    },
    required: ["label", "kind"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 5. saveAsset — one account or holding the user has money in.
// ──────────────────────────────────────────────────────────────────────
export const saveAsset: LLMTool = {
  name: "saveAsset",
  description:
    "Save one asset — checking, savings, retirement, taxable investment, home equity. Use the kind field to mark the type so Compass can bucket it correctly (liquid vs. retirement, etc.).",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: 'Short name. "Chase checking", "Fidelity 401k", "Emergency savings".',
      },
      kind: {
        type: "string",
        enum: [
          "checking",
          "savings",
          "money_market",
          "401k",
          "403b",
          "traditional_ira",
          "roth_ira",
          "taxable_brokerage",
          "hsa",
          "home_equity",
          "vehicle",
          "other",
        ],
        description: "The account type.",
      },
      balanceDollars: {
        type: "number",
        description: "Current balance in dollars. Approximate is fine.",
      },
    },
    required: ["label", "kind"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 6. saveGoal — one financial goal the user is working toward.
// ──────────────────────────────────────────────────────────────────────
export const saveGoal: LLMTool = {
  name: "saveGoal",
  description:
    "Save one goal. The user typically has 1-3 goals at this stage (emergency fund + 1-2 specific targets). The agent should always save an Emergency Fund goal if the user has any unsecured debt or less than 3 months of runway.",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: 'Short name. "Emergency Fund", "House down payment", "Visit family in Italy".',
      },
      targetDollars: {
        type: "number",
        description: "Target amount in dollars. For Emergency Fund, default to 3 months of essential expenses.",
      },
      targetDate: {
        type: "string",
        description:
          "ISO 8601 date (YYYY-MM-DD) for when the user wants to hit this goal. Optional — pass null for open-ended goals.",
      },
      perPaycheckDollars: {
        type: "number",
        description:
          "How much the user wants to put toward this goal per paycheck. Optional — null if TBD.",
      },
      kind: {
        type: "string",
        enum: ["TRANSFER", "MILESTONE"],
        description:
          "TRANSFER = automatic money movement (e.g. emergency-fund sweep, savings transfer). MILESTONE = a destination amount the user is working toward (e.g. 'Debt Free', 'Visit Family').",
        default: "MILESTONE",
      },
      goalType: {
        type: "string",
        enum: ["EMERGENCY", "INVEST", "OTHER"],
        description:
          "EMERGENCY = canonical emergency fund. INVEST = long-horizon retirement/investment. OTHER = trip, purchase, custom.",
        default: "OTHER",
      },
      priority: {
        type: "number",
        description: "1 = top priority, 2 = next, etc. The Emergency Fund is usually 1.",
        default: 2,
      },
    },
    required: ["label", "targetDollars"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 7. saveRiskProfile — time horizon + risk comfort.
// ──────────────────────────────────────────────────────────────────────
export const saveRiskProfile: LLMTool = {
  name: "saveRiskProfile",
  description:
    "Save the user's time horizon (in years until their primary financial goal — usually retirement) and their risk tolerance (conservative / moderate / aggressive). Call once you have both. The investment goal uses these to recommend an allocation.",
  parameters: {
    type: "object",
    properties: {
      timeHorizonYears: {
        type: "number",
        description: "Years until the primary financial goal. 35 for a 30-year-old targeting 65.",
      },
      riskTolerance: {
        type: "string",
        enum: ["conservative", "moderate", "aggressive"],
        description:
          "How the user describes their comfort with market swings. 'Moderate' = comfortable with a 20% drawdown; 'aggressive' = comfortable holding through 40%+ drawdowns; 'conservative' = wants to protect principal.",
      },
      notes: {
        type: "string",
        description:
          "Optional free-form note. Useful when the user gave nuance (\"moderate but I can't lose more than 15%\").",
      },
    },
    required: ["timeHorizonYears", "riskTolerance"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 8. savePlannedEvent — a known upcoming dated event with a cost.
// ──────────────────────────────────────────────────────────────────────
export const savePlannedEvent: LLMTool = {
  name: "savePlannedEvent",
  description:
    "Save a planned event with a known date and known cost (wedding, medical procedure, move, tuition). The dashboard surfaces these in the Critical Timeline card.",
  parameters: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: 'Short name. "Daughter\'s wedding", "Knee surgery".',
      },
      date: {
        type: "string",
        description: "ISO 8601 date (YYYY-MM-DD) for the event.",
      },
      estimatedCostDollars: {
        type: "number",
        description: "Estimated total cost in dollars. 0 if unknown.",
      },
      isFlexible: {
        type: "boolean",
        description: "True if the date can move; false if it's locked.",
        default: false,
      },
    },
    required: ["label", "date", "estimatedCostDollars"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 9. saveHouseholdMember — anyone financially entwined with the user.
// ──────────────────────────────────────────────────────────────────────
export const saveHouseholdMember: LLMTool = {
  name: "saveHouseholdMember",
  description:
    "Save one household member. The user may or may not have any — single-person households are valid. Call once per member.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "First name or relationship label. 'Spouse', 'Son', 'Mom' all work.",
      },
      relationship: {
        type: "string",
        enum: [
          "spouse",
          "partner",
          "child",
          "parent",
          "sibling",
          "roommate",
          "dependent_other",
          "other",
        ],
        description: "The relationship to the user.",
      },
      financiallyEntwined: {
        type: "boolean",
        description:
          "True if the user shares finances with this person (joint accounts, shared bills, etc.).",
        default: false,
      },
      ageRange: {
        type: "string",
        enum: ["under_18", "18_24", "25_34", "35_44", "45_54", "55_64", "65_plus"],
        description: "Optional. Age range of the household member.",
      },
    },
    required: ["name", "relationship"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 10. savePreferences — user-facing settings they want to lock in now.
// ──────────────────────────────────────────────────────────────────────
export const savePreferences: LLMTool = {
  name: "savePreferences",
  description:
    "Save the user's explicit preferences. Call only if the user volunteers them. Default values are fine for everything; this is for when the user says 'I want aggressive AI' or 'I want conservative routing'.",
  parameters: {
    type: "object",
    properties: {
      aiTier: {
        type: "string",
        enum: ["off", "assistive", "copilot", "autonomous"],
        description:
          "The user's AI comfort. 'off' = no AI. 'assistive' = suggestions only. 'copilot' = agent can act with confirmation. 'autonomous' = agent can act silently. Default in v1 is 'assistive'.",
      },
      riskComfort: {
        type: "string",
        enum: ["conservative", "moderate", "aggressive"],
        description: "Mirrors saveRiskProfile but at the user-preferences level.",
      },
      currency: {
        type: "string",
        description: 'Default "USD". Pass if the user names a different currency.',
        default: "USD",
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────
// 11. buildAudit — close out the conversation with a structured summary.
// ──────────────────────────────────────────────────────────────────────
export const buildAudit: LLMTool = {
  name: "buildAudit",
  description:
    "Produce the final structured audit summarizing who the user is, what Compass found, and what the first action is. Call this once the eight topic areas are covered (or the user signals wrap-up). The audit becomes a permanent record on the dashboard.",
  parameters: {
    type: "object",
    properties: {
      identity: {
        type: "string",
        description:
          "One tight paragraph: who the user is, what their money looks like, what they're aiming for.",
      },
      findings: {
        type: "string",
        description:
          "Markdown bullet list (use '\\n- ') of 2-4 specific findings tied to their numbers. Not generic.",
      },
      plan: {
        type: "string",
        description:
          "Markdown bullet list (use '\\n- ') of the recommended next actions in priority order.",
      },
      firstStep: {
        type: "string",
        description:
          "One concrete action the user takes this week. Specific to their setup, not generic.",
      },
      teaching: {
        type: "string",
        description:
          "One sentence max — something the user didn't know they needed to know. Skip if nothing meaningful.",
      },
    },
    required: ["identity", "findings", "plan", "firstStep"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// 12. markOnboardingComplete — flip the flag.
// ──────────────────────────────────────────────────────────────────────
export const markOnboardingComplete: LLMTool = {
  name: "markOnboardingComplete",
  description:
    "Mark the onboarding conversation as complete. Call after buildAudit. The dashboard will pick this up on the next render and stop showing the OnboardingGate.",
  parameters: {
    type: "object",
    properties: {
      completedAt: {
        type: "string",
        description: "ISO 8601 timestamp at which the conversation ended.",
      },
    },
    required: ["completedAt"],
  },
};

// ──────────────────────────────────────────────────────────────────────
// The tool registry — exposed for the orchestrator.
// ──────────────────────────────────────────────────────────────────────
export const ONBOARDING_TOOLS: LLMTool[] = [
  saveIdentityBasics,
  saveIncomeSource,
  saveFixedExpense,
  saveDebt,
  saveAsset,
  saveGoal,
  saveRiskProfile,
  savePlannedEvent,
  saveHouseholdMember,
  savePreferences,
  buildAudit,
  markOnboardingComplete,
];

/** A lookup by tool name, for the orchestrator's tool dispatcher. */
export const ONBOARDING_TOOL_BY_NAME: Record<string, LLMTool> = Object.fromEntries(
  ONBOARDING_TOOLS.map((t) => [t.name, t]),
);
