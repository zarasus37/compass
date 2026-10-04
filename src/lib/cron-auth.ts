/**
 * Shared bearer-token auth for /api/cron/* routes.
 *
 * - Fails CLOSED in production: if CRON_SECRET is unset the route refuses to
 *   run (these routes move money and prune audit data for every user).
 * - Only a local developer machine / CI sandbox may run without a secret.
 * - Compares SHA-256 digests with timingSafeEqual (constant time, and
 *   independent of the secret's length).
 *
 * Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when a
 * CRON_SECRET env var is set on the project.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isSandbox } from "@/lib/env/sandbox";

function digest(v: string): Buffer {
  return createHash("sha256").update(v).digest();
}

/** Returns a Response to send back if the request is NOT authorized, else null. */
export function rejectUnlessCronAuthorized(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    const lenient = process.env.NODE_ENV !== "production" || isSandbox();
    if (lenient) return null;
    console.error(
      "[cron] CRON_SECRET is not set; refusing to run cron route.",
    );
    return NextResponse.json(
      { ok: false, error: "cron not configured" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(header), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
