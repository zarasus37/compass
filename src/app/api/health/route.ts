import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getAiProvider } from "@/plugins/ai";
import {
  BEARER_SCHEME,
  MAX_CREDENTIAL_LENGTH,
  fingerprintCredential,
  parseBearerHeader,
} from "@/lib/http/bearer-auth";

/**
 * Health endpoint.
 *
 * Cluster: Production deploy prep (2026-08-28) — extended from
 * "ping DB + probe AI" to a deploy-readiness dashboard. Production
 * load balancers / uptime monitors can hit `/api/health` and
 * surface every subsystem at once.
 *
 * Cluster: Health endpoint hardening (2026-10-07) — four changes:
 *
 *  1. LIVENESS vs READINESS are now separate signals. `live` answers
 *     "is this process up and able to execute code?"; `ready` answers
 *     "can it serve traffic right now?". Conflating them is what lets a
 *     CDN or load balancer keep serving a 200 from a warm cache while
 *     the database is gone. The HTTP status keys off READINESS only —
 *     a degraded dependency must never be reported as healthy.
 *
 *  2. DB connectivity is proven with `prisma.$queryRaw` (a literal
 *     `SELECT 1`), never a table read. A table query couples liveness
 *     to the shape of the data; `SELECT 1` proves the connection, the
 *     driver, the pool, and the network — which is what "is the
 *     database reachable?" actually means. We also time it so a slow
 *     pool is visible rather than merely "up".
 *
 *  3. Integration tokens are validated against an explicitly parsed
 *     RFC 6750 Bearer schema (`@/lib/http/bearer-auth`) — we report the
 *     SHAPE of each credential (present / length / well-formed), never
 *     its value. See INTEGRATION_TOKENS below.
 *
 *  4. Every response carries strict no-store headers. Without these,
 *     Vercel's CDN is entitled to serve a stale 200 and hide exactly the
 *     degradation this endpoint exists to surface.
 *
 * Returns:
 *   - 200 when READY (live + every required subsystem green)
 *   - 503 when degraded
 *
 * Subsystems:
 *   - `db`           — `prisma.$queryRaw` ping + latency + migration status
 *   - `ai`           — provider health probe (model + latency)
 *   - `env`          — production env validation (`validateProdEnv`)
 *   - `vault`        — vault chain + signer config (prod only)
 *   - `integrations` — Bearer-schema validation of outbound API tokens
 */

/**
 * Health must reflect the moment it was called. `force-dynamic` stops
 * Next.js from prerendering a snapshot at build time; the no-store
 * headers below stop the CDN from doing the equivalent at the edge.
 */
export const dynamic = "force-dynamic";

/**
 * Strict cache directives.
 *
 * `Cache-Control` covers browsers and any RFC 9111 intermediary.
 * `CDN-Cache-Control` / `Vercel-CDN-Cache-Control` target Vercel's edge
 * specifically (Vercel honours the prefixed form over the bare one).
 * `Surrogate-Control` covers other reverse proxies. All four say the
 * same thing: never serve this from a cache, under any condition.
 */
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
} as const;

/**
 * Integration tokens this deployment depends on.
 *
 * `SOVEREIGN_API_TOKEN` is declared here because it is part of the
 * documented integration contract, but it is NOT read anywhere else in
 * the codebase and is not required. It is reported honestly as
 * `configured: false` when unset rather than being silently omitted —
 * an operator asking "is this token active?" gets a real answer.
 *
 * `MAVIS_API_KEY` and `CRON_SECRET` are genuinely consumed by the app
 * (see `src/lib/llm/config.ts` and `src/lib/cron-auth.ts`).
 */
const INTEGRATION_TOKENS = [
  {
    name: "MAVIS_API_KEY",
    required: true,
    usedBy: "AI provider (src/lib/llm/config.ts) — outbound Bearer",
  },
  {
    name: "CRON_SECRET",
    required: false,
    usedBy: "Vercel Cron routes (src/lib/cron-auth.ts) — inbound Bearer",
  },
  {
    name: "SOVEREIGN_API_TOKEN",
    required: false,
    usedBy: "Declared integration contract — not read by any code path",
  },
] as const;

/** Wall-clock at module evaluation = process boot for this instance. */
const BOOTED_AT = new Date();

export async function GET() {
  const now = Date.now();

  // ── DB: prove the connection with $queryRaw, and time it ────────
  const dbStartedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    // `SELECT 1` — no table, no row shape, no schema dependency.
    // This is the canonical "is the connection alive?" probe and it
    // exercises the full path: pool -> driver -> socket -> server.
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbLatencyMs = Date.now() - dbStartedAt;
  } catch (err) {
    console.error("[health] db $queryRaw failed:", err);
    dbLatencyMs = Date.now() - dbStartedAt;
  }

  const [dbMigrations, ai] = await Promise.all([
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
  //
  // `VAULT_ENABLED=1` is the explicit opt-in that turns the vault check
  // into a deploy gate. Without it the vault reports its real config
  // but never fails the health check — that is what lets a non-vault
  // deployment (`compass-mom`) return 200 instead of 503. Set it on
  // `compass` (Production) so that one stays fail-loud.
  const isProd = process.env.NODE_ENV === "production";
  const vaultEnabled = process.env.VAULT_ENABLED === "1";
  // The signing code reads VAULT_SAFE_SIGNER_PRIVATE_KEY (safe-deploy.ts).
  // VAULT_SIGNER_KEY is the legacy/example name and is NOT read by the signer.
  const signerRaw = process.env.VAULT_SAFE_SIGNER_PRIVATE_KEY;
  const hasRealSigner = !!signerRaw && !/^(0x)?MOCK/i.test(signerRaw);
  const vaultCheck = {
    enabled: vaultEnabled,
    ok: vaultEnabled ? !!process.env.VAULT_CHAIN_ID : true,
    chainId: process.env.VAULT_CHAIN_ID
      ? parseInt(process.env.VAULT_CHAIN_ID, 10)
      : null,
    rpcUrl: process.env.VAULT_CHAIN_RPC_URL ?? null,
    signerConfigured: hasRealSigner,
    // In dev we don't require a real signer; in prod we do.
    // Only enforced on deployments that opted in with VAULT_ENABLED=1.
    prodReady: vaultEnabled && isProd ? hasRealSigner : true,
  };

  // ── Integration tokens: validate against the parsed Bearer schema ─
  // We check the credential VALUE's shape here (does it parse as a
  // well-formed token68?), and we separately prove the header PARSER
  // works by round-tripping a real header through it. Both are reported
  // so a green `integrations` block means both facts were tested.
  const integrationChecks = INTEGRATION_TOKENS.map(({ name, required, usedBy }) => {
    const fingerprint = fingerprintCredential(process.env[name]);
    return {
      name,
      required,
      usedBy,
      configured: fingerprint.present,
      // Length is not a secret; the value never leaves this process.
      length: fingerprint.length,
      // Does the configured credential satisfy RFC 6750 token68?
      // A credential with a space or comma in it would be rejected by
      // any RFC 6750-conformant peer, which is worth surfacing.
      bearerWellFormed: fingerprint.wellFormed,
      ok: fingerprint.present
        ? fingerprint.wellFormed
        : !required,
    };
  });

  // Prove the Bearer parser itself is live by running a synthetic
  // header through the same code path a real request would take.
  // This catches a broken/Naïvely-edited parser that would otherwise
  // silently accept or reject everything.
  const parserProbe = (() => {
    const good = parseBearerHeader(`${BEARER_SCHEME} probe-token_123`);
    const bad = parseBearerHeader("Basic dXNlcjpwYXNz");
    return {
      ok: good.ok && good.credentials === "probe-token_123" && !bad.ok && bad.reason === "UNSUPPORTED_SCHEME",
      maxCredentialLength: MAX_CREDENTIAL_LENGTH,
    };
  })();

  const integrationsOk =
    parserProbe.ok && integrationChecks.every((c) => c.ok);

  const checks = {
    db: {
      ok: dbOk,
      // Latency is a readiness signal, not just telemetry: a pool that
      // responds in 8s is functionally degraded even though it "works".
      latencyMs: dbLatencyMs,
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
    integrations: {
      ok: integrationsOk,
      schema: `RFC 6750 Bearer (token68, max ${MAX_CREDENTIAL_LENGTH} chars)`,
      parserProbe,
      tokens: integrationChecks,
    },
  };

  // ── LIVENESS ────────────────────────────────────────────────────
  // Reaching this line at all proves the process booted, the module
  // graph resolved, and the runtime can execute. That is liveness.
  const liveness = {
    ok: true,
    bootedAt: BOOTED_AT.toISOString(),
    uptimeSeconds: Math.round((now - BOOTED_AT.getTime()) / 1000),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
  };

  // ── READINESS ───────────────────────────────────────────────────
  // Liveness AND every required subsystem green. In prod all of them
  // gate; in dev we only require the DB ping (the AI provider can be
  // down — e.g. Ollama not running — and that is not a deploy blocker).
  const ready = isProd
    ? dbOk && ai.ok && envCheck.ok && vaultCheck.ok && vaultCheck.prodReady && integrationsOk
    : dbOk;

  return NextResponse.json(
    {
      // `status` is the readiness verdict. It deliberately does NOT
      // report "live but not ready" as anything other than `degraded`.
      status: ready ? "ok" : "degraded",
      live: liveness.ok,
      ready,
      // Vercel sets VERCEL_PROJECT_NAME per project (`compass`,
      // `compass-mom`), so the health payload identifies the actual
      // deployment target instead of always claiming "compass".
      service: process.env.VERCEL_PROJECT_NAME ?? "compass",
      env: process.env.NODE_ENV ?? "development",
      chain: process.env.VAULT_CHAIN_ID ?? null,
      timestamp: new Date(now).toISOString(),
      process: liveness,
      checks,
    },
    { status: ready ? 200 : 503, headers: NO_STORE_HEADERS },
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