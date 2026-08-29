/**
 * POST /api/cron/vault — Vercel cron endpoint for the auto
 * bill-pay scheduler (Cluster 6.0).
 *
 * Production contract (Vercel cron):
 *   - Vercel sends a POST every minute (or whatever the schedule
 *     says) with an `Authorization: Bearer <CRON_SECRET>` header.
 *   - We iterate every VaultSchedule row where
 *     `enabled=true AND nextRunAt <= now` and call
 *     `runSchedulerForUser` for each.
 *   - Returns a JSON summary: { ok, usersProcessed, billsAffected, results }.
 *
 * Dev usage (scripts/cron-dev.mjs):
 *   - The dev process hits this same endpoint on a 30s poll.
 *   - When `CRON_SECRET` is unset (dev), the auth check is
 *     skipped — the endpoint is local-only by virtue of the
 *     process being on the dev machine.
 *
 * 401 when CRON_SECRET is set and the bearer is wrong.
 */
import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { runSchedulerForUser } from "@/lib/vault/scheduler";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;

  // Auth check (skip only when the env is unset, which is the dev
  // case). In prod, CRON_SECRET must be set.
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.vaultSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    select: { userId: true },
  });

  const results: Array<{
    userId: string;
    status: string;
    billsAffected: number;
    error?: string;
  }> = [];

  for (const sched of due) {
    try {
      const r = await runSchedulerForUser(sched.userId, now);
      results.push({
        userId: sched.userId,
        status: r.status,
        billsAffected: r.billsAffected,
        ...(r.error ? { error: r.error } : {}),
      });
    } catch (err) {
      results.push({
        userId: sched.userId,
        status: "ERROR",
        billsAffected: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: results.length,
    billsAffected: results.reduce((acc, r) => acc + r.billsAffected, 0),
    results,
    now: now.toISOString(),
  });
}

// GET is also useful for ops debugging.
export async function GET() {
  const due = await prisma.vaultSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    select: { userId: true, cronExpression: true, timezone: true, nextRunAt: true },
  });
  return NextResponse.json({ ok: true, dueCount: due.length, due });
}
