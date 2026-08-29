/**
 * GET /api/vault/schedule/history — last 20 scheduler-run audit
 * entries for the current user. Powers the run history table on
 * /vault/schedule.
 */
import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/user";
import { prisma } from "@/server/db";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  const rows = await prisma.auditLog.findMany({
    where: { userId: user.id, actionType: "vault.scheduler_run" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const runs = rows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      id: r.id,
      createdAt: r.createdAt,
      billId: typeof payload.billId === "string" ? payload.billId : null,
      skipped: payload.skipped === true,
      skipReason: typeof payload.reason === "string" ? payload.reason : null,
      error: typeof payload.error === "string" ? payload.error : null,
    };
  });

  return NextResponse.json({ ok: true, runs });
}
