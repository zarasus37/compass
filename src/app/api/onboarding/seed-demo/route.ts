/**
 * Seed demo identity — instant-onboard the user with the canonical
 * smoke data, skipping the chat.
 *
 * Cluster 5.2. The "Use demo data" button on /onboarding posts here.
 * The endpoint upserts a completed FinancialIdentity for the
 * current user with the same canonical seed data the smokes expect
 * (and that the dev signupAction already creates). The user is
 * then redirected to the dashboard, where the new Identity Summary
 * card shows the data immediately.
 *
 * Production users go through the chat. This endpoint is a
 * convenience for "I just want to see what the dashboard looks
 * like without typing a 4-turn conversation." Both paths end at
 * the same dashboard state.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { resetConversation } from "@/lib/onboarding/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical smoke seed — what the smoke-auth.mjs flow + dev
 * signupAction shortcut both create. Kept in one place so the
 * dashboard always reflects the same shape regardless of the
 * onboarding path.
 */
function seedIdentityData(userId: string) {
  return {
    ageRange: "55_64" as const,
    employmentStatus: "employed_full_time" as const,
    location: "Texas",
    timeHorizonYears: 35,
    riskTolerance: "moderate" as const,
    riskNotes: "Seeded via 'Use demo data' button.",
    aiTierPref: "assistive" as const,
    riskComfort: "moderate" as const,
    currency: "USD",
    auditIdentity:
      "30-year-old with a $300K mortgage, $1,820 biweekly take-home, building toward a $20K emergency fund and a long-horizon retirement at 65.",
    auditFindings:
      "\n- Housing is 50% of take-home — above the textbook 30% line.\n- 35-year horizon at moderate risk fits a typical retirement glidepath.\n- $20K emergency fund target is right at the 3-month-of-expenses guideline.",
    auditPlan:
      "\n- Auto-allocate $432/check to the Emergency Fund envelope (TRANSFER, priority 1).\n- Once Emergency Fund hits $20K, redirect the sweep to the investment goal.\n- Hold the mortgage on schedule; no extra payment until the Emergency Fund is funded.",
    auditFirstStep:
      "This week: set the auto-allocate plan to $432/check into the Emergency Fund envelope. Done.",
    auditTeaching:
      "Compass treats your savings envelope as a hard cap, not a soft target — when the Emergency Fund hits $20K, the auto-sweep stops on its own.",
    completedAt: new Date(),
    lastProvider: "mock" as const,
    lastFellBack: false,
    lastErrorMessage: null as string | null,
  };
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Wipe any prior identity so the upsert creates a clean state.
  await resetConversation(user.id);

  // Lazy import to avoid pulling Prisma into the bundle for callers
  // that only need the redirect path.
  const { prisma } = await import("@/server/db");
  const data = seedIdentityData(user.id);
  const identity = await prisma.financialIdentity.create({
    data: { userId: user.id, ...data },
  });

  // Seed a couple of identity child rows so the dashboard has data
  // for the Income, Debts, and Goals columns.
  await prisma.identityIncome.create({
    data: {
      identityId: identity.id,
      label: "Primary",
      cadence: "biweekly",
      amountDollars: 1820,
      isPrimary: true,
      sortOrder: 0,
    },
  });
  await prisma.identityDebt.create({
    data: {
      identityId: identity.id,
      label: "Mortgage",
      kind: "mortgage",
      balanceDollars: 300000,
      aprPercent: 6.5,
      minPaymentDollars: 1800,
      sortOrder: 0,
    },
  });
  await prisma.identityGoal.create({
    data: {
      identityId: identity.id,
      label: "Emergency Fund",
      targetDollars: 20000,
      targetDate: null,
      perPaycheckDollars: 432,
      kind: "TRANSFER",
      goalType: "EMERGENCY",
      priority: 1,
      sortOrder: 0,
    },
  });

  // Cluster 5.2.5: project the seeded identity into the production
  // tables (Account / Bill / Goal). The demo button gives the
  // user the same "wired" state as finishing the chat.
  try {
    const { projectIdentityToProduction } = await import("@/lib/onboarding/projection");
    const { loadConversation } = await import("@/lib/onboarding/state");
    const fullState = await loadConversation(user.id);
    await projectIdentityToProduction(
      {
        income: fullState.income,
        expenses: fullState.expenses,
        debts: fullState.debts,
        assets: fullState.assets,
        goals: fullState.goals,
      },
      user.id,
    );
  } catch (err) {
    console.warn(
      "[seed-demo] projection failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
