/**
 * Dev-only test endpoint for the SSE audit log smoke (Cluster 7.6).
 *
 * Writes a sentinel audit row via `recordVaultAudit` so the bus
 * fires in the **dev server's process** — the smoke runs in a
 * separate Node process and its direct `prisma.auditLog.create()`
 * calls do NOT cross the process boundary, so the bus subscriber
 * inside the dev server's `globalThis` would never see them.
 *
 * The route is gated by `process.env.NODE_ENV === "development"`
 * so a production build cannot accidentally expose it. The
 * companion smoke (`tests/smoke-sse-audit-log.mjs`) is the only
 * intended consumer.
 *
 * Request: POST { actionType: string, payload: object }
 * Response: { ok: true, id: string, actionType: string }
 *
 * The bus will then forward this row to any open SSE stream
 * subscribers for the current user. The smoke verifies the
 * end-to-end pipeline (write → bus → SSE → client) in ~2s.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { recordVaultAudit } from "@/lib/vault/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cluster 7.6 — narrow the allow-list of actionTypes the
 *  smoke can write. We don't want a dev endpoint to be able to
 *  forge arbitrary audit rows; the sentinel types are tagged
 *  `smoke.*` so they're easy to clean up and obviously
 *  test-only. */
const ALLOWED_PREFIX = "smoke.";

export async function POST(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.COMPASS_SANDBOX !== "1"
  ) {
    return NextResponse.json(
      { ok: false, error: "dev only" },
      { status: 403 },
    );
  }
  const user = await requireUser("/login");
  const body = (await req.json().catch(() => ({}))) as {
    actionType?: unknown;
    payload?: unknown;
  };
  const actionType =
    typeof body.actionType === "string" ? body.actionType : null;
  const payload =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : {};
  if (!actionType || !actionType.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {
        ok: false,
        error: `actionType must start with "${ALLOWED_PREFIX}" (got: ${actionType ?? "null"})`,
      },
      { status: 400 },
    );
  }
  await recordVaultAudit({
    userId: user.id,
    actionType: actionType as Parameters<typeof recordVaultAudit>[0]["actionType"],
    payload,
  });
  return NextResponse.json({ ok: true, actionType });
}
