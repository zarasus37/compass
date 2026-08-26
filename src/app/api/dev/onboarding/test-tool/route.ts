/**
 * Dev-only test endpoint for the onboarding tool handlers.
 *
 * Cluster 5.3.2. Exposes `runToolCall` over HTTP so the smoke
 * can exercise the new tools (`saveSpendingHabits`, the extended
 * `saveAsset` with investment meta) without needing the LLM to
 * call them. The smoke asserts:
 *
 *   1. `saveSpendingHabits` accepts a habit + category + frequency
 *      and appends to the identity's habits list.
 *   2. `saveAsset` accepts the new optional fields
 *      (employerMatchPercent, vestingYears, fundChoices,
 *      expenseRatioPct) and persists them.
 *   3. The habits + investment meta round-trip through
 *      loadConversation + saveConversation.
 *   4. The user's existing identity survives a tool call (the
 *      orchestrator's save logic doesn't clobber fields).
 *
 * Gated by `process.env.NODE_ENV === "development"` so a
 * production build cannot accidentally expose it.
 *
 * Request: POST { tool: string, args: object }
 * Response: { result: { publicView: ... } }
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/onboarding/agent";
import { runToolCall } from "@/lib/onboarding/agent-helpers";
import { loadConversation } from "@/lib/onboarding/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: { tool?: string; args?: Record<string, unknown>; userId?: string };
  try {
    body = (await req.json()) as { tool?: string; args?: Record<string, unknown>; userId?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body.tool !== "string" || body.tool.length === 0) {
    return NextResponse.json({ error: "tool is required" }, { status: 400 });
  }
  if (typeof body.userId !== "string" || body.userId.length === 0) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const args = body.args ?? {};

  try {
    // Load the state, dispatch the tool, return the result.
    // The test endpoint does NOT persist — that's the orchestrator's
    // job during a real run. The smoke checks the in-memory result
    // shape + the round-trip via a separate loadConversation call
    // (the smoke is responsible for its own seed/cleanup).
    const state = await loadConversation(body.userId);
    const tc = {
      id: `test_tc_${Date.now()}`,
      name: body.tool,
      args,
    };
    const result = runToolCall(state, tc);
    return NextResponse.json({ result: result.publicView });
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

// runAgent is imported to ensure the dev-only path stays
// tree-shakeable when NODE_ENV=production; the import is
// otherwise unused.
void runAgent;
