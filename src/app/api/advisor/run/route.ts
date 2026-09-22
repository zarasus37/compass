/**
 * Production chat endpoint for the advisor agent.
 *
 * Cluster 5.3. The /advisor chat UI calls this endpoint per turn.
 * Mirrors the /api/onboarding/run contract (auth, JSON request,
 * JSON response) so the two chat surfaces share shape.
 *
 * Differences from /api/onboarding/run:
 *
 *   - **Requires a completed identity.** The advisor answers
 *     questions about the user's identity; if the user hasn't
 *     finished onboarding, the route returns a 409 with a
 *     `redirectTo: "/onboarding"` hint. The chat UI can render
 *     a helpful "go finish onboarding" panel instead of a raw
 *     error.
 *   - **No tool calls.** The advisor is read-only — the route
 *     just runs the agent and returns the result.
 *
 * Response shape mirrors the onboarding run endpoint so any
 * future shared client can be shape-agnostic. The chat sends
 * `{ userMessage }` and gets back the full RunAdvisorResult.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { runAdvisor } from "@/lib/advisor/agent";
import { loadConversation } from "@/lib/onboarding/state";

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

  // Identity-completed gate. The advisor can't answer questions
  // about an empty / half-formed identity. We return a structured
  // 409 with a `redirectTo` hint so the chat UI can render a
  // helpful panel (and a "Finish onboarding" CTA) rather than
  // a raw error.
  const state = await loadConversation(user.id);
  // Cluster 7.15.1 — sandbox bypass. See src/lib/onboarding/gate.ts
  // for the rationale; production deploys (Vercel, CI) never set
  // the flag, so the gate stays active in real prod.
  if (!state.completedAt && process.env.COMPASS_SANDBOX !== "1") {
    return NextResponse.json(
      {
        error: "onboarding_incomplete",
        message:
          "Finish onboarding first — the advisor answers questions about your identity, and it doesn't have one yet.",
        redirectTo: "/onboarding",
      },
      { status: 409 },
    );
  }

  try {
    const result = await runAdvisor({
      userId: user.id,
      userMessage: body.userMessage,
    });
    return NextResponse.json({
      agentMessage: result.agentMessage,
      // Cluster 5.3.1 — surface the tool calls + rounds so the
      // chat UI can show "I checked your envelopes and bills…"
      // and so the smoke can assert the multi-round loop fired
      // (or stayed in a single round when no tools were needed).
      toolCalls: result.toolCalls,
      rounds: result.rounds,
      state: result.state,
      provider: result.provider,
      fellBack: result.fellBack,
      fallbackError: result.fallbackError,
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
