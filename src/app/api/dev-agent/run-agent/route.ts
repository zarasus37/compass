/**
 * Dev-only API route for the onboarding agent smoke.
 *
 * Cluster 5.0 Part A. NOT for production use — exposes the agent's
 * internal state for the smoke test, and bypasses auth on purpose
 * so the smoke can run as fast as possible. The path is
 * `/api/dev-agent/...` to signal dev-only; the route refuses to
 * run when NODE_ENV=production.
 *
 * Cluster 5.0 Part B: the same POST endpoint drives runAgent() but
 * now reads/writes Prisma. The dev API also exposes a GET endpoint
 * (`?userId=...`) that returns the persisted state straight from
 * Prisma, so the smoke can verify the rows hit the DB (not just
 * the in-memory `state` echo from runAgent).
 *
 * The smoke drives a scripted conversation by POSTing:
 *   { userId, userMessage, history? }
 * and gets back the full runAgent() result. It then GETs
 * `?userId=...` to assert persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { runAgent } from "@/lib/onboarding/agent";
import {
  loadConversation,
  resetConversation,
  resetAllConversations,
} from "@/lib/onboarding/state";
import { resetMockState } from "@/lib/llm/providers/mock";
import { resetLLMConfig } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  userId?: string;
  userMessage?: string;
  history?: unknown;
  /** Dev-only: reset state for this user before running. */
  reset?: boolean;
  /** Dev-only: reset ALL state. */
  resetAll?: boolean;
}

/**
 * Dev-only helper: ensure a User row exists for the given id. In
 * production the user is always authenticated before reaching the
 * chat UI, so this never fires. The smoke uses arbitrary userIds
 * (e.g. "smoke-user-1") and the FinancialIdentity table's FK to
 * User would otherwise reject the upsert. The placeholder password
 * hash is never checked — this is purely a row-level convenience.
 */
async function ensureUserRow(userId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return;
  await prisma.user.create({
    data: {
      id: userId,
      name: `Dev user ${userId}`,
      email: `${userId}@dev.local`,
      // Placeholder; the dev API never authenticates against this.
      passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$dev-placeholder$dev-placeholder",
    },
  });
}

/**
 * Dev-only: ensure the canonical "mom" test user has a completed
 * FinancialIdentity. Most smokes (sidebar, topbar, dashboard, etc.)
 * log in as mom; the OnboardingGate (Cluster 5.1) blocks them if
 * mom has no completed identity. The onboarding smoke's resetAll
 * wipes all FinancialIdentity rows, which would break every
 * subsequent smoke. This helper re-onboards mom so the dev DB
 * always has her ready. Idempotent — no-op if she's already set.
 */
async function ensureMomOnboarded(): Promise<void> {
  const mom = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!mom) return; // smoke-auth.mjs will create her on its next run
  const existing = await prisma.financialIdentity.findUnique({
    where: { userId: mom.id },
  });
  if (existing?.completedAt) return; // already onboarded
  const identity = await prisma.financialIdentity.upsert({
    where: { userId: mom.id },
    create: {
      userId: mom.id,
      ageRange: "55_64",
      employmentStatus: "employed_full_time",
      location: "Texas",
      timeHorizonYears: 35,
      riskTolerance: "moderate",
      riskNotes: "Dev seed for mom (canonical test user).",
      aiTierPref: "assistive",
      riskComfort: "moderate",
      currency: "USD",
      auditIdentity: "30-year-old with a $300K mortgage, $1,820 biweekly take-home.",
      auditFindings: "\n- Housing is 50% of take-home.\n- 35-year horizon at moderate risk.",
      auditPlan: "\n- Auto-allocate $432/check to the Emergency Fund.",
      auditFirstStep: "Set the auto-allocate plan to $432/check into Emergency Fund.",
      auditTeaching: "Compass treats your savings envelope as a hard cap.",
      auditBuiltAt: new Date(),
      completedAt: new Date(),
      lastProvider: "mock",
      lastFellBack: false,
      lastErrorMessage: null,
    },
    update: { completedAt: new Date() },
  });
  // Seed income/debt/goal so the dashboard isn't empty.
  await prisma.identityIncome.upsert({
    where: { id: `${identity.id}-dev-income-1` },
    create: {
      id: `${identity.id}-dev-income-1`,
      identityId: identity.id,
      label: "Primary",
      cadence: "biweekly",
      amountDollars: 1820,
      isPrimary: true,
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.identityDebt.upsert({
    where: { id: `${identity.id}-dev-debt-1` },
    create: {
      id: `${identity.id}-dev-debt-1`,
      identityId: identity.id,
      label: "Mortgage",
      kind: "mortgage",
      balanceDollars: 300000,
      aprPercent: 6.5,
      minPaymentDollars: 1800,
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.identityGoal.upsert({
    where: { id: `${identity.id}-dev-goal-1` },
    create: {
      id: `${identity.id}-dev-goal-1`,
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
    update: {},
  });
}

export async function POST(req: NextRequest) {
  // Dev-only guard: refuse to run in production.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "_dev routes are disabled in production" },
      { status: 404 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const userId = body.userId ?? "smoke-user";
  if (body.resetAll) {
    await resetAllConversations();
    resetMockState(); // wipe every mock seed's topic tracking
  } else if (body.reset) {
    await resetConversation(userId);
    resetMockState();
  }
  // Always re-read env so a smoke that flips LLM_PROVIDER between
  // runs (or runs after a manual env change) picks up the new
  // provider instead of the cached one.
  resetLLMConfig();

  // Dev-only: keep the canonical "mom" test user in a fully-onboarded
  // state so the other smokes (sidebar, topbar, dashboard, period,
  // etc.) that log in as her can hit the dashboard without being
  // redirected to /onboarding by the gate. This is a no-op when mom
  // is already onboarded; only re-fires when the onboarding smoke's
  // resetAll has wiped her identity.
  await ensureMomOnboarded();

  if (typeof body.userMessage !== "string") {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  try {
    // Dev-only: ensure the FK target exists. The production code
    // path (chat UI in Cluster 5.1) never hits this because the
    // session is established before the user can start a chat.
    await ensureUserRow(userId);

    const result = await runAgent({
      userId,
      userMessage: body.userMessage,
      // History is loaded from persisted state if not provided.
    });
    return NextResponse.json({
      agentMessage: result.agentMessage,
      toolCalls: result.toolCalls.map((tc) => ({
        name: tc.name,
        args: tc.args,
        result: tc.result,
      })),
      state: result.state,
      rounds: result.rounds,
      provider: result.provider,
      fellBack: result.fellBack,
      fallbackError: result.fallbackError,
      onboardingCompleted: result.onboardingCompleted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

/**
 * GET ?userId=... — return the persisted state straight from
 * Prisma. Used by the smoke to verify that what was returned in
 * the runAgent() response is actually in the DB (and not just
 * an in-memory echo). Returns 404 if the user has no identity.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "_dev routes are disabled in production" },
      { status: 404 },
    );
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? "smoke-user";
  try {
    await ensureUserRow(userId);
    // 404 if the user has no FinancialIdentity row at all. The smoke
    // uses this to verify that `reset` actually wiped the row. After
    // a reset, any subsequent POST will create a fresh row.
    const exists = await prisma.financialIdentity.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "no identity for user", userId }, { status: 404 });
    }
    const state = await loadConversation(userId);
    return NextResponse.json({
      userId,
      messageCount: state.messages.length,
      lastProvider: state.lastProvider,
      lastFellBack: state.lastFellBack,
      lastErrorMessage: state.lastErrorMessage,
      incomeCount: state.income.length,
      expenseCount: state.expenses.length,
      debtCount: state.debts.length,
      assetCount: state.assets.length,
      goalCount: state.goals.length,
      eventCount: state.events.length,
      householdCount: state.household.length,
      completedAt: state.completedAt,
      hasAudit: state.hasAudit,
      // Echo key scalar + summary fields so the smoke can deep-check.
      identity: state.identity,
      risk: state.risk,
      preferences: state.preferences,
      income: state.income,
      debts: state.debts,
      goals: state.goals,
      audit: state.audit,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
