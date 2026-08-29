/**
 * POST /api/vault/schedule/run-now — manual override. Bypasses
 * the cron gate and immediately calls runSchedulerForUser with
 * now. The /vault/schedule page surfaces this as a "Run now"
 * button next to the next-run indicator.
 */
import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/user";
import { runSchedulerForUser } from "@/lib/vault/scheduler";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  const result = await runSchedulerForUser(user.id, new Date());
  return NextResponse.json({ ok: true, result });
}
