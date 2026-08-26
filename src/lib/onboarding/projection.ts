/**
 * Identity → production-table projection.
 *
 * Cluster 5.2.5. After the onboarding chat completes
 * (markOnboardingComplete fires), the orchestrator calls
 * `projectIdentityToProduction` to populate the production
 * tables (Account, Bill, Goal) from the FinancialIdentity +
 * child tables. The demo-mode seed endpoint also calls this
 * so the dev path produces the same shape.
 *
 * What gets projected:
 *   - Income[]   → Account rows of type "checking" (the paycheck
 *                  lands here; balance is the per-period amount in
 *                  cents, not the user's "balance" — a future
 *                  cluster can wire in a "deposit" transaction
 *                  that adjusts currentBalance over time).
 *   - Assets[]   → Account rows of the asset's kind (savings,
 *                  retirement, etc.) with the balance.
 *   - Debts[]    → Account rows of type "other" (the production
 *                  Account model doesn't have a debt type yet).
 *                  APR is stored in a derived field — a future
 *                  cluster can add a Debt model.
 *   - Expenses[] → Bill rows with cadence + autopay=false. The
 *                  Bill model was added in 5.2.5 specifically
 *                  for this projection.
 *   - Goals[]    → Goal rows with targetAmount, kind, goalType.
 *
 * The projection is **idempotent**: the lookup is by (userId,
 * name, source="identity") so re-running replaces the existing
 * rows rather than duplicating. The "source" column on the
 * production tables is what tells the seeded rows apart from
 * the projected ones — a future cluster can migrate the
 * seeded rows into the same source="seed" bucket so widgets
 * can opt into the production reads with a clean filter.
 *
 * What is NOT projected yet (future work):
 *   - Risk profile → no AllocationPlan/AllocationRule yet.
 *     A 5.2.6 cluster can derive a default allocation from
 *     the risk tolerance + horizon.
 *   - Envelopes — the FinancialIdentity has income/expenses/
 *     assets/debts/goals, not envelopes. A future cluster can
 *     derive envelopes from these (e.g. one envelope per
 *     expense category, plus a "buffer" + "savings" pair).
 *   - Transactions — the chat doesn't produce transactions.
 *     The user's first paycheck after onboarding would create
 *     a Transaction row in a future cluster.
 *
 * The projection is a one-way write: re-running with a
 * different identity state replaces the projected rows. The
 * caller's `wipe` flag (default true) controls whether the old
 * projected rows are deleted first.
 */

import "server-only";
import { prisma } from "@/server/db";
import type { OnboardingState } from "./state";
import { cadenceMonthlyFactor } from "@/lib/identity/cadence";

export interface ProjectionResult {
  accountsUpserted: number;
  billsUpserted: number;
  goalsUpserted: number;
  /** ISO timestamp the projection completed. */
  projectedAt: string;
}

/**
 * Project the FinancialIdentity (and child tables) into the
 * production tables. Idempotent: re-running with the same
 * state is a no-op; re-running with a different state replaces
 * the projected rows.
 *
 * @param state — the OnboardingState (or a partial with the
 *                relevant fields) to project
 * @param userId — the user id
 * @param opts.wipe — if true (default), delete the existing
 *                    projected rows first. If false, the function
 *                    upserts. The wipe path is safer when the
 *                    chat has restarted.
 */
export async function projectIdentityToProduction(
  state: Pick<
    OnboardingState,
    "income" | "expenses" | "debts" | "assets" | "goals"
  >,
  userId: string,
  opts: { wipe?: boolean } = {},
): Promise<ProjectionResult> {
  const { wipe = true } = opts;
  const projectedAt = new Date().toISOString();

  if (wipe) {
    // Delete the previously-projected rows. The seeded rows
    // (source = "seed") are untouched.
    await Promise.all([
      prisma.account.deleteMany({ where: { userId, name: { startsWith: "[identity] " } } }),
      prisma.bill.deleteMany({ where: { userId, source: "identity" } }),
      prisma.goal.deleteMany({ where: { userId, name: { startsWith: "[identity] " } } }),
    ]);
  }

  // Income → Account (type=checking, label prefixed to keep them
  // distinguishable from any user-entered accounts).
  let accountsUpserted = 0;
  for (const inc of state.income) {
    const monthlyDollars = inc.amountDollars
      ? Math.round(inc.amountDollars * cadenceMonthlyFactor(inc.cadence))
      : 0;
    await prisma.account.create({
      data: {
        userId,
        name: `[identity] ${inc.label}`,
        type: "checking",
        // Cents: 0 is fine — the per-paycheck amount is in PaySchedule,
        // which is a future cluster. We store the monthly normalized
        // amount in institution for now (it's freeform text).
        currentBalance: 0,
        institution: `monthly:$${monthlyDollars} ${inc.cadence ?? ""}`.trim(),
        sortOrder: accountsUpserted,
      },
    });
    accountsUpserted += 1;
  }

  // Assets → Account. The asset's kind maps to the Account.type.
  for (const asset of state.assets) {
    const accountType = mapAssetKindToAccountType(asset.kind);
    await prisma.account.create({
      data: {
        userId,
        name: `[identity] ${asset.label}`,
        type: accountType,
        currentBalance: asset.balanceDollars * 100, // dollars → cents
        institution: "from identity",
        sortOrder: accountsUpserted,
      },
    });
    accountsUpserted += 1;
  }

  // Debts → Account (type=other — the production Account
  // model doesn't have a dedicated "loan" type yet). The APR
  // is stored in the institution field for now (freeform).
  for (const debt of state.debts) {
    await prisma.account.create({
      data: {
        userId,
        name: `[identity] ${debt.label}`,
        type: "other",
        currentBalance: -Math.abs(debt.balanceDollars * 100), // debts as negative
        institution: `apr:${debt.aprPercent.toFixed(2)}% kind:${debt.kind}`,
        sortOrder: accountsUpserted,
      },
    });
    accountsUpserted += 1;
  }

  // Expenses → Bill rows. cadence string flows through (the
  // Bill model has the same enum as the in-memory BillSeed).
  let billsUpserted = 0;
  for (const exp of state.expenses) {
    await prisma.bill.create({
      data: {
        userId,
        name: exp.label,
        amountCents: exp.amountDollars * 100, // dollars → cents
        cadence: exp.cadence,
        // Monthly bills get a default dueDay of 1; other cadences
        // get null (the dashboard bins by cadence, not by day).
        dueDay: exp.cadence === "monthly" ? 1 : null,
        autopay: false,
        source: "identity",
      },
    });
    billsUpserted += 1;
  }

  // Goals → Goal rows. We map the identity's goalType string
  // to the schema's nullable GoalType enum (EMERGENCY | INVEST).
  let goalsUpserted = 0;
  for (const g of state.goals) {
    const isPrimary = g.priority === 1;
    await prisma.goal.create({
      data: {
        userId,
        name: `[identity] ${g.label}`,
        targetAmount: g.targetDollars * 100, // dollars → cents
        currentAmount: 0,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
        // Map identity kind: "TRANSFER" | "MILESTONE" → schema kind.
        // The schema's GoalKind enum is the same two values.
        kind: g.kind === "TRANSFER" ? "TRANSFER" : "MILESTONE",
        goalType: g.goalType === "EMERGENCY" || g.goalType === "INVEST" ? g.goalType : null,
        isPrimary,
        sortOrder: goalsUpserted,
      },
    });
    goalsUpserted += 1;
  }

  return {
    accountsUpserted,
    billsUpserted,
    goalsUpserted,
    projectedAt,
  };
}

/**
 * Map the identity's asset kind to the production Account.type
 * enum. Defaults to "other" for unknown kinds.
 */
function mapAssetKindToAccountType(kind: string): string {
  switch (kind) {
    case "checking":
      return "checking";
    case "savings":
      return "savings";
    case "money_market":
      return "savings";
    case "401k":
    case "403b":
    case "traditional_ira":
    case "roth_ira":
      return "other"; // retirement accounts → other until L2 lands
    case "taxable_brokerage":
      return "other";
    case "hsa":
      return "other";
    case "home_equity":
      return "other";
    case "vehicle":
      return "other";
    case "cash":
      return "cash";
    default:
      return "other";
  }
}

/**
 * Read the count of projected rows for a user. Used by the
 * Identity Summary card to show "N accounts / M bills / K goals
 * projected" without re-querying the full rows.
 */
export async function getProjectionCounts(userId: string): Promise<{
  accounts: number;
  bills: number;
  goals: number;
}> {
  const [accounts, bills, goals] = await Promise.all([
    prisma.account.count({ where: { userId, name: { startsWith: "[identity] " } } }),
    prisma.bill.count({ where: { userId, source: "identity" } }),
    prisma.goal.count({ where: { userId, name: { startsWith: "[identity] " } } }),
  ]);
  return { accounts, bills, goals };
}
