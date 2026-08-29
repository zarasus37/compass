import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getAiProvider } from "@/plugins/ai";

/**
 * Health endpoint.
 *
 * Cluster: Production deploy prep (2026-08-28) — extended from
 * "ping DB + probe AI" to a deploy-readiness dashboard. Production
 * load balancers / uptime monitors can hit `/api/health` and
 * surface every subsystem at once.
 *
 * Returns:
 *   - 200 when every subsystem is green
 *   - 503 when any subsystem is red or yellow
 *
 * Each subsystem reports:
 *   - `ok: true|false` — does it respond?
 *   - Plus a per-subsystem payload (latency, model, chainId, etc.)
 *
 * Subsystems:
 *   - `db`           — `prisma.$queryRaw` ping + migration status
 *   - `ai`           — provider health probe (model + latency)
 *   - `env`          — production env validation (`validateProdEnv`)
 *   - `vault`        — vault chain + signer config (prod only)
 */
export async function GET() {
  const [dbPing, dbMigrations, ai] = await Promise.all([
    prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
    // `prisma.$queryRaw` against `_prisma_migrations` returns rows
    // for `migrate dev` / `migrate deploy`. When the schema was
    // pushed via `db push` (no migrations table) this returns []
    // and we report "pushed" instead of "current".
    checkMigrationStatus(),
    getAiProvider().health(),
  ]);

  // Validate env only when we're actually in production. Dev /
  // smoke runs should not block on prod env.
  let envCheck: { ok: boolean; issues: string[] };
  if (process.env.NODE_ENV === "production") {
    const { validateProdEnv } = await import("@/lib/env/prod");
    const r = validateProdEnv();
    envCheck = r.ok
      ? { ok: true, issues: [] }
      : { ok: false, issues: r.issues.map((i) => `${i.key}: ${i.message}`) };
  } else {
    envCheck = { ok: true, issues: [] };
  }

  // Vault subsystem. In production the signer MUST be configured
  // (and not the MOCK placeholder). In dev the signer is optional —
  // the page is fully usable in the simulated state without one.
  const isProd = process.env.NODE_ENV === "production";
  const hasRealSigner =
    !!process.env.VAULT_SIGNER_KEY && process.env.VAULT_SIGNER_KEY !== "0xMOCK";
  const vaultCheck = {
    ok: !!process.env.VAULT_CHAIN_ID,
    chainId: process.env.VAULT_CHAIN_ID
      ? parseInt(process.env.VAULT_CHAIN_ID, 10)
      : null,
    rpcUrl: process.env.VAULT_CHAIN_RPC_URL ?? null,
    signerConfigured: hasRealSigner,
    // In dev we don't require a real signer; in prod we do.
    prodReady: isProd ? hasRealSigner : true,
  };

  const checks = {
    db: {
      ok: dbPing,
      migrationStatus: dbMigrations.status,
      appliedMigrations: dbMigrations.applied,
    },
    ai: {
      ok: ai.ok,
      providerId: getAiProvider().id,
      latencyMs: ai.latencyMs,
      message: ai.message,
      model: ai.model,
    },
    env: envCheck,
    vault: vaultCheck,
  };

  // In prod every check must be green. In dev we only require the
  // DB ping (the AI provider can be down — e.g. Ollama not running —
  // and that's not a deploy-blocker for local dev).
  const allOk = isProd
    ? dbPing && ai.ok && envCheck.ok && vaultCheck.ok && vaultCheck.prodReady
    : dbPing;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      service: "compass",
      env: process.env.NODE_ENV ?? "development",
      chain: process.env.VAULT_CHAIN_ID ?? null,
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}

type MigrationStatus = { status: "current" | "pushed" | "drift"; applied: number };
async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name
    `;
    return { status: "current", applied: rows.length };
  } catch {
    // No migrations table — schema was pushed via `prisma db push`.
    // That means we have no versioned migrations to drift from, but
    // we can still report that the schema is "pushed" (managed out
    // of band). Production should switch to `migrate deploy` for
    // real versioning.
    return { status: "pushed", applied: 0 };
  }
}
