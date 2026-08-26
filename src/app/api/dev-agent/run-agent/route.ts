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
