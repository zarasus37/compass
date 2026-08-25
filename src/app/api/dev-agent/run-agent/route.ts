/**
 * Dev-only API route for the onboarding agent smoke.
 *
 * Cluster 5.0 Part A. NOT for production use — exposes the agent's
 * internal state for the smoke test, and bypasses auth on purpose
 * so the smoke can run as fast as possible. The path is
 * `/api/dev-agent/...` to signal dev-only; the route refuses to
 * run when NODE_ENV=production.
 *
 * The smoke drives a scripted conversation by POSTing:
 *   { userId, userMessage, history? }
 * and gets back the full runAgent() result.
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/onboarding/agent";
import { resetConversation, resetAllConversations } from "@/lib/onboarding/state";
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
    resetAllConversations();
    resetMockState(); // wipe every mock seed's topic tracking
  } else if (body.reset) {
    resetConversation(userId);
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
    const result = await runAgent({
      userId,
      userMessage: body.userMessage,
      // History is loaded from in-memory state if not provided.
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
      onboardingCompleted: result.onboardingCompleted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "POST only" },
    { status: 405 },
  );
}
