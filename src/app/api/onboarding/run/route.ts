/**
 * Production chat endpoint for the onboarding agent.
 *
 * Cluster 5.1. The chat UI on /onboarding calls this endpoint per
 * turn. The endpoint requires auth (the session cookie resolves to
 * a User), calls runAgent, and returns the full result.
 *
 * Why a real API route (not just the dev /api/dev-agent/run-agent):
 * - /api/dev-agent refuses to run in production. The chat needs a
 *   real route in production.
 * - The dev API auto-creates a User row for the smoke's arbitrary
 *   userId. The production route uses the session-derived userId
 *   (always a real row, never needs auto-create).
 * - The dev API is a test harness. The production route is the
 *   user-facing surface.
 *
 * Response shape mirrors the dev API so the chat UI can be
 * shape-agnostic. The chat sends { userMessage } and gets back
 * the full RunAgentResult.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { runAgent } from "@/lib/onboarding/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  userMessage?: string;
}

export async function POST(req: NextRequest) {
  // Auth gate — get the current user from the session cookie.
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body.userMessage !== "string" || body.userMessage.trim() === "") {
    return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
  }

  try {
    const result = await runAgent({
      userId: user.id,
      userMessage: body.userMessage,
    });
    return NextResponse.json({
      agentMessage: result.agentMessage,
      toolCalls: result.toolCalls.map((tc) => ({
        name: tc.name,
        args: tc.args,
        result: tc.result.publicView,
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

export async function GET() {
  return NextResponse.json({ error: "POST only" }, { status: 405 });
}
