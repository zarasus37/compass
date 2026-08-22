import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getAiProvider } from "@/plugins/ai";

/**
 * Health endpoint.
 * - 200: all systems go.
 * - 503: a subsystem is degraded (DB or AI provider unreachable).
 *
 * The endpoint is intentionally cheap: one DB ping + one AI health probe.
 * Both have short timeouts in the providers themselves.
 */
export async function GET() {
  const [dbOk, ai] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getAiProvider().health(),
  ]);

  const checks = {
    db: { ok: dbOk },
    ai: {
      ok: ai.ok,
      providerId: getAiProvider().id,
      latencyMs: ai.latencyMs,
      message: ai.message,
      model: ai.model,
    },
  };
  const allOk = dbOk && ai.ok;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      service: "compass",
      stage: "2-scaffold",
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
