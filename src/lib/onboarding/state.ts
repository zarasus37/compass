/**
 * Onboarding state — Prisma-backed persistence (Cluster 5.0 Part B).
 *
 * Part A stored state in a process-local Map keyed by userId. Part B
 * replaces that with a FinancialIdentity row + 7 child tables + an
 * OnboardingMessage log so the conversation survives a dev server
 * restart and the dashboard (Cluster 5.2) can read the materialized
 * identity records instead of the seed.
 *
 * The public contract is unchanged: `OnboardingState` has the same
 * shape the agent's tool dispatcher and the chat UI (Cluster 5.1)
 * expect. What changed:
 *   - loadConversation / saveConversation / resetConversation are
 *     now async (Prisma writes).
 *   - saveConversation takes a second arg — the messages added
 *     during this turn — so we can append to OnboardingMessage
 *     instead of duplicating the history.
 *   - OnboardingState grew two new fields: `lastFellBack` and
 *     `lastErrorMessage`, which the L1 rules fallback sets when
 *     the primary LLM (Mavis / Ollama) errors and the mock fires
 *     instead. The chat UI uses these to surface "we had trouble
 *     reaching Mavis; using a backup" in the header.
 *   - The orchestrator (agent.ts) was updated to await these and
 *     to pass the new-messages list.
 *
 * Storage strategy: per-turn full rewrite of the identity row +
 * delete-and-insert of the child rows. This is simpler than
 * diffing and the writes are tiny (≤ 20 rows per entity type).
 * A future cluster can switch to per-row mutations if the
 * per-turn write cost becomes visible.
 */

import { prisma } from "@/server/db";
import type { LLMMessage, LLMToolCall } from "../llm/types";

// ──────────────────────────────────────────────────────────────────────
// Types — the public OnboardingState interface is unchanged from Part A.
// Two new fields were added: lastFellBack + lastErrorMessage. Both are
// optional / nullable in the persisted state and default to false / null
// on a fresh load.
// ──────────────────────────────────────────────────────────────────────

export interface IdentityBasics {
  ageRange: string | null;
  employmentStatus: string | null;
  location: string | null;
}

export interface IncomeSource {
  label: string;
  cadence: string | null;
  amountDollars: number | null;
  isPrimary: boolean;
}

export interface FixedExpense {
  label: string;
  amountDollars: number;
  cadence: string;
  category: string;
}

export interface DebtEntry {
  label: string;
  kind: string;
  balanceDollars: number;
  aprPercent: number;
  minPaymentDollars: number;
}

export interface AssetEntry {
  label: string;
  kind: string;
  balanceDollars: number;
}

export interface GoalEntry {
  label: string;
  targetDollars: number;
  targetDate: string | null;
  perPaycheckDollars: number | null;
  kind: string;
  goalType: string;
  priority: number;
}

export interface RiskProfile {
  timeHorizonYears: number | null;
  riskTolerance: string | null;
  notes: string | null;
}

export interface PlannedEvent {
  label: string;
  date: string | null;
  estimatedCostDollars: number;
  isFlexible: boolean;
}

export interface HouseholdMember {
  name: string;
  relationship: string;
  financiallyEntwined: boolean;
  ageRange: string | null;
}

export interface Preferences {
  aiTier: string | null;
  riskComfort: string | null;
  currency: string;
}

export interface AuditData {
  identity: string;
  findings: string;
  plan: string;
  firstStep: string;
  teaching: string;
  builtAt: string;
}

export interface OnboardingState {
  userId: string;
  messages: LLMMessage[];
  identity: IdentityBasics;
  income: IncomeSource[];
  expenses: FixedExpense[];
  debts: DebtEntry[];
  assets: AssetEntry[];
  goals: GoalEntry[];
  risk: RiskProfile;
  events: PlannedEvent[];
  household: HouseholdMember[];
  preferences: Preferences;
  audit: AuditData | null;
  completedAt: string | null;
  /** Which provider produced the last response (for logging + UI). */
  lastProvider: "mavis" | "ollama" | "mock" | null;
  /** True if the last turn fell through from the primary provider to the L1 rules engine. */
  lastFellBack: boolean;
  /** The primary provider's error message when lastFellBack=true. Null otherwise. */
  lastErrorMessage: string | null;
  /** ISO timestamp of the last state mutation. */
  lastTouchedAt: string;
  /** Has the agent produced the audit yet? (tool call, not completion.) */
  hasAudit: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Load the conversation state for a user. Returns a fresh state
 * if the user has no FinancialIdentity yet.
 *
 * Async because we hit the DB. The agent's runAgent() awaits this.
 */
export async function loadConversation(userId: string): Promise<OnboardingState> {
  const identity = await prisma.financialIdentity.findUnique({
    where: { userId },
    include: {
      incomes: { orderBy: { sortOrder: "asc" } },
      expenses: { orderBy: { sortOrder: "asc" } },
      debts: { orderBy: { sortOrder: "asc" } },
      assets: { orderBy: { sortOrder: "asc" } },
      goals: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { sortOrder: "asc" } },
      household: { orderBy: { sortOrder: "asc" } },
      messages: { orderBy: { seq: "asc" } },
    },
  });
  if (!identity) {
    return freshState(userId);
  }
  return mapIdentityToState(identity);
}

/**
 * Save the conversation state. The orchestrator (agent.ts) calls
 * this once per turn with the post-turn state + the new messages
 * added during the turn.
 *
 * Persists:
 *   - The FinancialIdentity row (upsert).
 *   - All child rows (delete-and-insert; see top-of-file note).
 *   - The new OnboardingMessage rows (append-only).
 *
 * Idempotent for messages: if you pass the same newMessages list
 * twice, the second call duplicates them. The orchestrator is
 * responsible for computing the diff once per turn.
 */
export async function saveConversation(
  state: OnboardingState,
  newMessages: LLMMessage[],
): Promise<void> {
  if (newMessages.length === 0 && state.lastTouchedAt !== "") {
    // Cheap fast path: only the provider telemetry changed. The
    // identity row already exists; update it.
    await prisma.financialIdentity.upsert({
      where: { userId: state.userId },
      create: identityCreateFromState(state),
      update: identityUpdateFromState(state),
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Upsert the identity row.
    const identity = await tx.financialIdentity.upsert({
      where: { userId: state.userId },
      create: identityCreateFromState(state),
      update: identityUpdateFromState(state),
    });

    // 2. Delete and re-insert the child rows. Cheap because the
    //    per-identity lists are tiny (≤ ~20 rows each).
    await Promise.all([
      tx.identityIncome.deleteMany({ where: { identityId: identity.id } }),
      tx.identityExpense.deleteMany({ where: { identityId: identity.id } }),
      tx.identityDebt.deleteMany({ where: { identityId: identity.id } }),
      tx.identityAsset.deleteMany({ where: { identityId: identity.id } }),
      tx.identityGoal.deleteMany({ where: { identityId: identity.id } }),
      tx.identityEvent.deleteMany({ where: { identityId: identity.id } }),
      tx.identityHouseholdMember.deleteMany({ where: { identityId: identity.id } }),
    ]);

    if (state.income.length > 0) {
      await tx.identityIncome.createMany({
        data: state.income.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          cadence: e.cadence,
          amountDollars: e.amountDollars,
          isPrimary: e.isPrimary,
          sortOrder: i,
        })),
      });
    }
    if (state.expenses.length > 0) {
      await tx.identityExpense.createMany({
        data: state.expenses.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          amountDollars: e.amountDollars,
          cadence: e.cadence,
          category: e.category,
          sortOrder: i,
        })),
      });
    }
    if (state.debts.length > 0) {
      await tx.identityDebt.createMany({
        data: state.debts.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          kind: e.kind,
          balanceDollars: e.balanceDollars,
          aprPercent: e.aprPercent,
          minPaymentDollars: e.minPaymentDollars,
          sortOrder: i,
        })),
      });
    }
    if (state.assets.length > 0) {
      await tx.identityAsset.createMany({
        data: state.assets.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          kind: e.kind,
          balanceDollars: e.balanceDollars,
          sortOrder: i,
        })),
      });
    }
    if (state.goals.length > 0) {
      await tx.identityGoal.createMany({
        data: state.goals.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          targetDollars: e.targetDollars,
          targetDate: e.targetDate ? new Date(e.targetDate) : null,
          perPaycheckDollars: e.perPaycheckDollars,
          kind: e.kind,
          goalType: e.goalType,
          priority: e.priority,
          sortOrder: i,
        })),
      });
    }
    if (state.events.length > 0) {
      await tx.identityEvent.createMany({
        data: state.events.map((e, i) => ({
          identityId: identity.id,
          label: e.label,
          date: e.date ? new Date(e.date) : null,
          estimatedCostDollars: e.estimatedCostDollars,
          isFlexible: e.isFlexible,
          sortOrder: i,
        })),
      });
    }
    if (state.household.length > 0) {
      await tx.identityHouseholdMember.createMany({
        data: state.household.map((e, i) => ({
          identityId: identity.id,
          name: e.name,
          relationship: e.relationship,
          financiallyEntwined: e.financiallyEntwined,
          ageRange: e.ageRange,
          sortOrder: i,
        })),
      });
    }

    // 3. Append the new messages. The seq starts at the highest
    //    existing seq for this identity + 1; we read it inside the
    //    transaction so it's consistent.
    if (newMessages.length > 0) {
      const lastSeq = await tx.onboardingMessage.findFirst({
        where: { identityId: identity.id },
        orderBy: { seq: "desc" },
        select: { seq: true },
      });
      const startSeq = (lastSeq?.seq ?? -1) + 1;
      await tx.onboardingMessage.createMany({
        data: newMessages.map((m, i) => ({
          identityId: identity.id,
          role: m.role,
          content: m.content,
          toolCallId: m.role === "tool" ? m.toolCallId : null,
          toolCallsJson:
            m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0
              ? JSON.stringify(m.toolCalls)
              : null,
          seq: startSeq + i,
        })),
      });
    }
  });
}

/** Test-only — wipe state for a single user. */
export async function resetConversation(userId: string): Promise<void> {
  // Cascade-deletes child rows + messages.
  await prisma.financialIdentity.deleteMany({ where: { userId } });
}

/** Test-only — wipe ALL state. Used by the smoke between scenarios. */
export async function resetAllConversations(): Promise<void> {
  await prisma.financialIdentity.deleteMany({});
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function freshState(userId: string): OnboardingState {
  return {
    userId,
    messages: [],
    identity: { ageRange: null, employmentStatus: null, location: null },
    income: [],
    expenses: [],
    debts: [],
    assets: [],
    goals: [],
    risk: { timeHorizonYears: null, riskTolerance: null, notes: null },
    events: [],
    household: [],
    preferences: { aiTier: null, riskComfort: null, currency: "USD" },
    audit: null,
    completedAt: null,
    lastProvider: null,
    lastFellBack: false,
    lastErrorMessage: null,
    lastTouchedAt: new Date().toISOString(),
    hasAudit: false,
  };
}

/**
 * The Prisma include shape we use for loadConversation. Defining
 * it as a type so the map function is type-safe.
 */
type IdentityWithChildren = NonNullable<
  Awaited<ReturnType<typeof loadIdentityRaw>>
>;

async function loadIdentityRaw(userId: string) {
  return prisma.financialIdentity.findUnique({
    where: { userId },
    include: {
      incomes: { orderBy: { sortOrder: "asc" } },
      expenses: { orderBy: { sortOrder: "asc" } },
      debts: { orderBy: { sortOrder: "asc" } },
      assets: { orderBy: { sortOrder: "asc" } },
      goals: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { sortOrder: "asc" } },
      household: { orderBy: { sortOrder: "asc" } },
      messages: { orderBy: { seq: "asc" } },
    },
  });
}

function mapIdentityToState(identity: IdentityWithChildren): OnboardingState {
  const messages: LLMMessage[] = identity.messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", toolCallId: m.toolCallId ?? "", content: m.content };
    }
    if (m.role === "assistant") {
      let toolCalls: LLMToolCall[] | undefined;
      if (m.toolCallsJson) {
        try {
          toolCalls = JSON.parse(m.toolCallsJson) as LLMToolCall[];
        } catch {
          toolCalls = undefined;
        }
      }
      return { role: "assistant", content: m.content, toolCalls };
    }
    return { role: "user", content: m.content };
  });

  return {
    userId: identity.userId,
    messages,
    identity: {
      ageRange: identity.ageRange,
      employmentStatus: identity.employmentStatus,
      location: identity.location,
    },
    income: identity.incomes.map((e) => ({
      label: e.label,
      cadence: e.cadence,
      amountDollars: e.amountDollars,
      isPrimary: e.isPrimary,
    })),
    expenses: identity.expenses.map((e) => ({
      label: e.label,
      amountDollars: e.amountDollars,
      cadence: e.cadence,
      category: e.category,
    })),
    debts: identity.debts.map((e) => ({
      label: e.label,
      kind: e.kind,
      balanceDollars: e.balanceDollars,
      aprPercent: e.aprPercent,
      minPaymentDollars: e.minPaymentDollars,
    })),
    assets: identity.assets.map((e) => ({
      label: e.label,
      kind: e.kind,
      balanceDollars: e.balanceDollars,
    })),
    goals: identity.goals.map((e) => ({
      label: e.label,
      targetDollars: e.targetDollars,
      targetDate: e.targetDate ? e.targetDate.toISOString().slice(0, 10) : null,
      perPaycheckDollars: e.perPaycheckDollars,
      kind: e.kind,
      goalType: e.goalType ?? "OTHER",
      priority: e.priority,
    })),
    events: identity.events.map((e) => ({
      label: e.label,
      date: e.date ? e.date.toISOString().slice(0, 10) : null,
      estimatedCostDollars: e.estimatedCostDollars,
      isFlexible: e.isFlexible,
    })),
    household: identity.household.map((e) => ({
      name: e.name,
      relationship: e.relationship,
      financiallyEntwined: e.financiallyEntwined,
      ageRange: e.ageRange,
    })),
    risk: {
      timeHorizonYears: identity.timeHorizonYears,
      riskTolerance: identity.riskTolerance,
      notes: identity.riskNotes,
    },
    preferences: {
      aiTier: identity.aiTierPref,
      riskComfort: identity.riskComfort,
      currency: identity.currency,
    },
    audit:
      identity.auditIdentity && identity.auditFindings && identity.auditPlan
        ? {
            identity: identity.auditIdentity,
            findings: identity.auditFindings,
            plan: identity.auditPlan,
            firstStep: identity.auditFirstStep ?? "",
            teaching: identity.auditTeaching ?? "",
            builtAt: (identity.auditBuiltAt ?? new Date()).toISOString(),
          }
        : null,
    completedAt: identity.completedAt ? identity.completedAt.toISOString() : null,
    lastProvider: (identity.lastProvider as "mavis" | "ollama" | "mock" | null) ?? null,
    lastFellBack: identity.lastFellBack,
    lastErrorMessage: identity.lastErrorMessage,
    lastTouchedAt: identity.updatedAt.toISOString(),
    hasAudit: identity.auditBuiltAt !== null,
  };
}

function identityCreateFromState(state: OnboardingState) {
  return {
    userId: state.userId,
    ageRange: state.identity.ageRange,
    employmentStatus: state.identity.employmentStatus,
    location: state.identity.location,
    timeHorizonYears: state.risk.timeHorizonYears,
    riskTolerance: state.risk.riskTolerance,
    riskNotes: state.risk.notes,
    aiTierPref: state.preferences.aiTier,
    riskComfort: state.preferences.riskComfort,
    currency: state.preferences.currency,
    auditIdentity: state.audit?.identity,
    auditFindings: state.audit?.findings,
    auditPlan: state.audit?.plan,
    auditFirstStep: state.audit?.firstStep,
    auditTeaching: state.audit?.teaching,
    auditBuiltAt: state.audit?.builtAt ? new Date(state.audit.builtAt) : null,
    completedAt: state.completedAt ? new Date(state.completedAt) : null,
    lastProvider: state.lastProvider,
    lastFellBack: state.lastFellBack,
    lastErrorMessage: state.lastErrorMessage,
  };
}

function identityUpdateFromState(state: OnboardingState) {
  // Same shape as create — the only difference is `where: { userId }`
  // on the upsert. We don't need to set userId in the update payload.
  const { userId: _userId, ...rest } = identityCreateFromState(state);
  void _userId;
  return rest;
}

// ──────────────────────────────────────────────────────────────────────
// Tool result type
// ──────────────────────────────────────────────────────────────────────

/**
 * The shape of every tool's return value. `publicView` is what the
 * LLM sees (serialized as JSON and sent back as a tool message).
 * `stateSnapshot` is the in-memory state after the save — for the
 * orchestrator's own use (logging, smoke assertions), not exposed
 * to the LLM.
 */
export interface ToolResult {
  publicView: SaveResult | { ok: false; error: string };
  stateSnapshot?: OnboardingState;
}

export interface SaveResult {
  ok: true;
  message: string;
  [key: string]: unknown;
}

/**
 * Take a state snapshot for the orchestrator. The state object is
 * a live reference; this returns a shallow clone so a later
 * mutation doesn't leak into the snapshot.
 */
export function snapshotState(state: OnboardingState): OnboardingState {
  return {
    ...state,
    identity: { ...state.identity },
    income: state.income.map((e) => ({ ...e })),
    expenses: state.expenses.map((e) => ({ ...e })),
    debts: state.debts.map((e) => ({ ...e })),
    assets: state.assets.map((e) => ({ ...e })),
    goals: state.goals.map((e) => ({ ...e })),
    risk: { ...state.risk },
    events: state.events.map((e) => ({ ...e })),
    household: state.household.map((e) => ({ ...e })),
    preferences: { ...state.preferences },
    audit: state.audit ? { ...state.audit } : null,
    messages: [...state.messages],
  };
}
