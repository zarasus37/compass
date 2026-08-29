/**
 * GET  /api/vault/schedule — return the current user's schedule row.
 * POST /api/vault/schedule — upsert the current user's schedule row.
 *
 * Cluster 6.0 — Vault scheduler. The page on /vault/schedule reads
 * via GET, submits via POST. Both use `requireUser()` for auth
 * (the dev scheduler process at scripts/cron-dev.mjs does NOT
 * call this route — it talks to the engine directly).
 */
import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/user";
import { prisma } from "@/server/db";
import { computeNextRun } from "@/lib/vault/scheduler";

const ALLOWED_CRON_PRESETS = [
  "0 9 * * *",
  "0 9,18 * * *",
  "0 9 * * 1",
  "0 9 1 * *",
];

type UpsertBody = {
  enabled?: boolean;
  cronExpression?: string;
  timezone?: string;
  lookAheadDays?: number;
  minReserveCents?: number;
};

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  const schedule = await prisma.vaultSchedule.findUnique({
    where: { userId: user.id },
  });

  // Return null + the default values so the form can hydrate on
  // first visit (the user has never saved a schedule).
  if (!schedule) {
    return NextResponse.json({
      ok: true,
      schedule: null,
      defaults: {
        enabled: true,
        cronExpression: "0 9 * * *",
        timezone: "America/Chicago",
        lookAheadDays: 1,
        minReserveCents: 0,
      },
    });
  }

  return NextResponse.json({ ok: true, schedule });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const {
    enabled = true,
    cronExpression = "0 9 * * *",
    timezone = "America/Chicago",
    lookAheadDays = 1,
    minReserveCents = 0,
  } = body;

  // Validation. cron-parser will throw on garbage; cap the
  // look-ahead at 7 days and the reserve at the vault's current
  // available balance so the gate is always reachable.
  if (typeof cronExpression !== "string" || cronExpression.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "cronExpression is required" },
      { status: 400 },
    );
  }
  const nextRunAt = computeNextRun(cronExpression, timezone, new Date());
  if (!nextRunAt) {
    return NextResponse.json(
      {
        ok: false,
        error: `invalid cron expression: "${cronExpression}". Try one of: ${ALLOWED_CRON_PRESETS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (typeof lookAheadDays !== "number" || lookAheadDays < 0 || lookAheadDays > 7) {
    return NextResponse.json(
      { ok: false, error: "lookAheadDays must be between 0 and 7" },
      { status: 400 },
    );
  }

  if (typeof minReserveCents !== "number" || minReserveCents < 0) {
    return NextResponse.json(
      { ok: false, error: "minReserveCents must be a non-negative integer" },
      { status: 400 },
    );
  }

  // Cap minReserveCents at the vault's current settlement reserve
  // so the gate is always reachable. This is a soft cap — the
  // vault can grow over time and the user can raise the gate.
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: user.id },
    select: { settlementReserve: true },
  });
  if (vault && minReserveCents > vault.settlementReserve * 2) {
    return NextResponse.json(
      {
        ok: false,
        error: `minReserveCents (${minReserveCents}) exceeds 2x current reserve (${vault.settlementReserve}). Lower the gate.`,
      },
      { status: 400 },
    );
  }

  const schedule = await prisma.vaultSchedule.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      enabled,
      cronExpression,
      timezone,
      lookAheadDays,
      minReserveCents,
      nextRunAt,
    },
    update: {
      enabled,
      cronExpression,
      timezone,
      lookAheadDays,
      minReserveCents,
      nextRunAt,
    },
  });

  return NextResponse.json({ ok: true, schedule });
}
