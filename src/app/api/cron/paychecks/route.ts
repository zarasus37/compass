/**
 * GET/POST /api/cron/paychecks — Vercel cron endpoint that applies the
 * armed allocation plan when a paycheck arrives.
 *
 * Mirrors `/api/cron/vault` exactly: same CRON_SECRET bearer contract,
 * same GET-aliases-POST behaviour (Vercel cron sends GET), same JSON
 * summary shape.
 *
 * Idempotency is inherited from `PaycheckRun`, so a cron that fires
 * twice, or a cron plus the dashboard's manual button, cannot
 * double-allocate. See `src/lib/paycheck-scheduler.ts`.
 */
import { NextResponse } from "next/server";

import { runAutoPaychecks } from "@/lib/paycheck-scheduler";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;

  // Auth check, skipped only when the env var is unset (the dev case).
  // In prod, CRON_SECRET must be set.
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const results = await runAutoPaychecks(now);

  const applied = results.filter((r) => r.status === "applied").length;
  const already = results.filter((r) => r.status === "already_applied").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    ok: errors === 0,
    usersProcessed: results.length,
    applied,
    alreadyApplied: already,
    errors,
    results,
    now: now.toISOString(),
  });
}

export async function GET(req: Request) {
  return POST(req);
}
