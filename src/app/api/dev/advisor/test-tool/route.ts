/**
 * Dev-only test endpoint for the advisor tool handlers.
 *
 * Cluster 5.3.1. Exposes `runAdvisorTool` over HTTP so the smoke
 * can exercise each of the 7 read-only tools without needing the
 * LLM to call them. The smoke asserts:
 *
 *   1. Each handler returns `{ ok: true, tool, data, note? }` for
 *      valid args.
 *   2. The handler's data shape matches the LLM-facing contract
 *      (cents → dollars, Date → ISO string, etc.).
 *   3. Filter args narrow the result (e.g. `payeeLike: "lights"`
 *      excludes non-matching transactions).
 *   4. Errors come back as `{ ok: false, tool, error }` rather
 *      than throwing.
 *
 * The route is gated by `process.env.NODE_ENV === "development"`
 * so a production build cannot accidentally expose it. The
 * companion smoke (`tests/smoke-advisor.mjs`) is the only
 * intended consumer.
 *
 * Request: POST { tool: string, args: object }
 * Response: { result: { publicView: ... } }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { runAdvisorTool } from "@/lib/advisor/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.COMPASS_SANDBOX !== "1"
  ) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tool?: string; args?: Record<string, unknown> };
  try {
    body = (await req.json()) as { tool?: string; args?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body.tool !== "string" || body.tool.length === 0) {
    return NextResponse.json({ error: "tool is required" }, { status: 400 });
  }
  const args = body.args ?? {};

  // Construct a synthetic tool call. The handler uses `tc.name` to
  // dispatch and `tc.args` to read parameters; the `id` is ignored.
  const tc = {
    id: `test_tc_${Date.now()}`,
    name: body.tool,
    args,
  };
  try {
    const result = await runAdvisorTool(user.id, tc);
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
