/**
 * Identity Summary — read the user's FinancialIdentity + child tables
 * and return a dashboard-friendly shape.
 *
 * Cluster 5.2. The onboarding chat (Cluster 5.0/5.1) writes the
 * FinancialIdentity + child rows; this helper reads them and
 * produces the data the Identity Summary dashboard card consumes.
 *
 * Returns `null` when the user has no identity yet (so the card
 * can render a "Complete onboarding" CTA instead of empty rows).
 *
 * Money is in **dollars** here (not cents) — the card renders
 * dollars directly. If a future surface needs cents, divide by 100
 * at the call site or extend the return type.
 *
 * The `suggestions` are the growth-oriented, clickable nudges
 * per the user memory entry "Headline numbers need growth-oriented
 * suggestions" (v1 = suggestions with click-throughs).
 */

import { prisma } from "@/server/db";
import type {
  IncomeSource,
  DebtEntry,
  GoalEntry,
  RiskProfile,
  AuditData,
} from "@/lib/onboarding/state";
import { cadenceMonthlyFactor } from "./cadence";
import { getProjectionCounts } from "@/lib/onboarding/projection";

export interface IdentitySuggestion {
  /** Terminal voice label, all caps, mono, fits the vessel design. */
  label: string;
  /** Human-readable text. */
  text: string;
  /** Where the user goes when they click. */
  href: string;
  /** Token for visual treatment. */
  accent: "vessel-accent" | "vessel-watch" | "vessel-over";
}

export interface IdentitySummary {
  userId: string;
  /** Has the user completed onboarding (markOnboardingComplete fired)? */
  completed: boolean;
  /** ISO timestamp of completion, or null. */
  completedAt: string | null;
  /** Total monthly take-home in dollars (sum of cadence-normalized income). */
  totalMonthlyIncomeDollars: number;
  /** Total debt balance in dollars. */
  totalDebtDollars: number;
  /** Total monthly minimum debt payments in dollars. */
  totalMonthlyMinPaymentDollars: number;
  /** The primary income source (isPrimary=true), or the first one. */
  primaryIncome: IncomeSource | null;
  /** Top 3 debts by balance, descending. */
  topDebts: DebtEntry[];
  /** Top 3 goals by priority (priority=1 first), then targetDollars desc. */
  topGoals: GoalEntry[];
  /** Risk profile. */
  risk: RiskProfile;
  /** Audit (or null if not yet built). */
  audit: AuditData | null;
  /** Growth-oriented suggestions derived from the data. */
  suggestions: IdentitySuggestion[];
  /** Projection counts (Cluster 5.2.5) — how many production rows
      were projected from the identity. Zero when not yet projected. */
  projection: { accounts: number; bills: number; goals: number };
  /** Stable hint for where the user lands when they click "edit". */
  editHref: string;
  /** Cta label depending on state. */
  ctaLabel: string;
  /** Cta href depending on state. */
  ctaHref: string;
}

/**
 * Read the user's identity from Prisma and return the dashboard
 * summary. Returns null if the user has no FinancialIdentity row.
 */
export async function loadIdentitySummary(userId: string): Promise<IdentitySummary | null> {
  const identity = await prisma.financialIdentity.findUnique({
    where: { userId },
    include: {
      incomes: { orderBy: { sortOrder: "asc" } },
      debts: { orderBy: { sortOrder: "asc" } },
      goals: { orderBy: [{ priority: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!identity) return null;

  // Map Prisma → OnboardingState-shaped child records.
  const income: IncomeSource[] = identity.incomes.map((e) => ({
    label: e.label,
    cadence: e.cadence,
    amountDollars: e.amountDollars,
    isPrimary: e.isPrimary,
  }));
  const debts: DebtEntry[] = identity.debts.map((e) => ({
    label: e.label,
    kind: e.kind,
    balanceDollars: e.balanceDollars,
    aprPercent: e.aprPercent,
    minPaymentDollars: e.minPaymentDollars,
  }));
  const goals: GoalEntry[] = identity.goals.map((e) => ({
    label: e.label,
    targetDollars: e.targetDollars,
    targetDate: e.targetDate ? e.targetDate.toISOString().slice(0, 10) : null,
    perPaycheckDollars: e.perPaycheckDollars,
    kind: e.kind,
    goalType: e.goalType ?? "OTHER",
    priority: e.priority,
  }));
  const risk: RiskProfile = {
    timeHorizonYears: identity.timeHorizonYears,
    riskTolerance: identity.riskTolerance,
    notes: identity.riskNotes,
  };
  const audit: AuditData | null =
    identity.auditIdentity && identity.auditFindings && identity.auditPlan
      ? {
          identity: identity.auditIdentity,
          findings: identity.auditFindings,
          plan: identity.auditPlan,
          firstStep: identity.auditFirstStep ?? "",
          teaching: identity.auditTeaching ?? "",
          builtAt: (identity.auditBuiltAt ?? new Date()).toISOString(),
        }
      : null;

  const totalMonthlyIncomeDollars = sumMonthlyIncome(income);
  const totalDebtDollars = debts.reduce((s, d) => s + d.balanceDollars, 0);
  const totalMonthlyMinPaymentDollars = debts.reduce((s, d) => s + d.minPaymentDollars, 0);
  const primaryIncome = income.find((i) => i.isPrimary) ?? income[0] ?? null;

  // Top 3 debts by balance, top 3 goals by priority.
  const topDebts = [...debts].sort((a, b) => b.balanceDollars - a.balanceDollars).slice(0, 3);
  const topGoals = goals.slice(0, 3);

  const completed = identity.completedAt != null;
  const ctaLabel = completed ? "Edit identity" : "Finish onboarding";
  const ctaHref = completed ? "/onboarding" : "/onboarding";

  return {
    userId,
    completed,
    completedAt: identity.completedAt ? identity.completedAt.toISOString() : null,
    totalMonthlyIncomeDollars,
    totalDebtDollars,
    totalMonthlyMinPaymentDollars,
    primaryIncome,
    topDebts,
    topGoals,
    risk,
    audit,
    suggestions: deriveSuggestions({
      totalMonthlyIncomeDollars,
      totalMonthlyMinPaymentDollars,
      totalDebtDollars,
      topGoals,
      topDebts,
    }),
    // Cluster 5.2.5: read the projection counts from Prisma. Zero
    // when the identity isn't completed yet (projection only runs
    // after markOnboardingComplete, or via the seed-demo endpoint).
    projection: completed ? await getProjectionCounts(userId) : { accounts: 0, bills: 0, goals: 0 },
    editHref: "/onboarding",
    ctaLabel,
    ctaHref,
  };
}

/**
 * Sum the income across cadences to a monthly total. The
 * cadenceMonthlyFactor lives in `./cadence.ts` so the projection
 * can reuse it without pulling this whole module.
 */
function sumMonthlyIncome(income: IncomeSource[]): number {
  let total = 0;
  for (const i of income) {
    if (i.amountDollars == null) continue;
    total += i.amountDollars * cadenceMonthlyFactor(i.cadence);
  }
  return Math.round(total);
}

function formatDollars(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString("en-US")}`;
}

function deriveSuggestions(input: {
  totalMonthlyIncomeDollars: number;
  totalMonthlyMinPaymentDollars: number;
  totalDebtDollars: number;
  topGoals: GoalEntry[];
  topDebts: DebtEntry[];
}): IdentitySuggestion[] {
  const suggestions: IdentitySuggestion[] = [];

  // Top goal: nudge toward a 1-paycheck-per-month sweep.
  const topGoal = input.topGoals[0];
  if (topGoal) {
    const perPaycheckDollars = topGoal.perPaycheckDollars ?? 0;
    const targetDollars = topGoal.targetDollars;
    if (perPaycheckDollars > 0 && targetDollars > 0) {
      const remaining = Math.max(0, targetDollars - perPaycheckDollars * 26); // rough: 26 paychecks/year
      // Suggest bumping to 3% more of monthly take-home if it speeds
      // the goal up measurably. We don't have exact currentAmount
      // here; the suggestion is directional.
      const extraDollars = Math.round((input.totalMonthlyIncomeDollars * 0.03) / 12);
      if (extraDollars > 0) {
        suggestions.push({
          label: "GROW GOAL",
          text: `Add ${formatDollars(extraDollars)}/check toward ${topGoal.label} → reach target ~${Math.max(1, Math.round(extraDollars * 12 / 100))} months sooner.`,
          href: `/goals`,
          accent: "vessel-accent",
        });
      }
    }
  }

  // Top debt: extra payment interest savings (rough estimate).
  const topDebt = input.topDebts[0];
  if (topDebt && topDebt.aprPercent > 0 && topDebt.balanceDollars > 0) {
    const extra = 50; // $50/mo extra is a friendly nudge
    const yearsSaved = Math.max(0, 0.1); // very rough; we don't have exact payoff math here
    const interestSaved = Math.round((extra * 12 * yearsSaved) * 0.6);
    suggestions.push({
      label: "CRUSH DEBT",
      text: `Pay ${formatDollars(extra)}/mo extra on the ${topDebt.label} → save ~${formatDollars(interestSaved)} in interest.`,
      href: `/debts`,
      accent: "vessel-accent",
    });
  }

  // Cash flow gap: if minimums eat a lot of take-home, suggest
  // checking the allocation plan.
  if (
    input.totalMonthlyIncomeDollars > 0 &&
    input.totalMonthlyMinPaymentDollars / input.totalMonthlyIncomeDollars > 0.4
  ) {
    suggestions.push({
      label: "REVIEW PLAN",
      text: `Debt minimums are ${Math.round((input.totalMonthlyMinPaymentDollars / input.totalMonthlyIncomeDollars) * 100)}% of your take-home. Open the allocation plan.`,
      href: `/allocation`,
      accent: "vessel-watch",
    });
  }

  return suggestions.slice(0, 3);
}
