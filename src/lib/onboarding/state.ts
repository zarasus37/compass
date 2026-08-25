/**
 * Onboarding in-memory state — keyed by user id.
 *
 * Cluster 5.0 Part A. v1 keeps state in process memory (a Map
 * pinned on globalThis so HMR preserves it). Part B replaces
 * this with Prisma (FinancialIdentity + OnboardingConversation
 * tables). The shape is designed so the public surface (load /
 * save / state) is stable; the persistence swap is a single
 * module replacement.
 *
 * Why a Map keyed by userId, not module-level state? Multi-user
 * ready (D7 has been a multi-user target since day one; v1
 * happens to be single-user but the schema is multi-user).
 */

import type { LLMMessage } from "../llm/types";

// ──────────────────────────────────────────────────────────────────────
// Types
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
  /** Which provider produced the last response (for logging). */
  lastProvider: "mavis" | "ollama" | "mock" | null;
  /** ISO timestamp of the last state mutation. */
  lastTouchedAt: string;
  /** Has the agent produced the audit yet? (tool call, not completion.) */
  hasAudit: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// The store
// ──────────────────────────────────────────────────────────────────────

interface OnboardingStore {
  byUser: Map<string, OnboardingState>;
}

const GLOBAL_KEY = "__COMPASS_ONBOARDING_STORE__";

function getStore(): OnboardingStore {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: OnboardingStore };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { byUser: new Map() };
  }
  return g[GLOBAL_KEY]!;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

export function loadConversation(userId: string): OnboardingState {
  const store = getStore();
  let s = store.byUser.get(userId);
  if (!s) {
    s = freshState(userId);
    store.byUser.set(userId, s);
  }
  return s;
}

export function saveConversation(state: OnboardingState): void {
  const store = getStore();
  store.byUser.set(state.userId, state);
}

/** Test-only — wipe all state. Used by the smoke between scenarios. */
export function resetAllConversations(): void {
  const store = getStore();
  store.byUser.clear();
}

/** Test-only — wipe state for a single user. */
export function resetConversation(userId: string): void {
  const store = getStore();
  store.byUser.delete(userId);
}

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
    lastTouchedAt: new Date().toISOString(),
    hasAudit: false,
  };
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
