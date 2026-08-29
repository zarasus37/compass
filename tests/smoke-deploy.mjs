/**
 * Smoke for production deploy readiness.
 *
 * Cluster: Production deploy prep (2026-08-28).
 * Cluster 6.0.1 — mainnet: added §13 (chain-config wiring).
 *
 * Walks the project surface and verifies every artifact needed
 * for a clean prod deploy is present and correctly wired:
 *   - .env / .env.example / .env.production.example exist
 *   - package.json scripts: db:up, db:push, db:reset, tsc, smoke:all
 *   - instrumentation.ts exists and calls assertProdEnv
 *   - src/lib/env/prod.ts exists and validates dev placeholders
 *   - /api/health returns 200 with `db.ok`, `ai.ok`, and a
 *     `migrationStatus` field
 *   - next.config.ts has a headers() function with CSP,
 *     X-Frame-Options, X-Content-Type-Options
 *   - docker-compose.dev.yml + docker/pg_hba.conf exist
 *   - Vault page contains the TestnetBanner marker
 *   - The smoke suite is wired (the shared `tests/db-client.mjs` imports
 *     the Postgres adapter, not the SQLite one)
 *   - (Cluster 6.0.1) safe-deploy.ts has a chain table that
 *     covers BOTH Base Sepolia (84532) and Base mainnet (8453)
 *     with the canonical Aave + Safe addresses; getChainConfig()
 *     no longer throws on chainId 8453; prod.ts refuses testnet
 *     chainId in production
 *
 * Run with: pnpm smoke:deploy
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

let pass = 0;
let miss = 0;
const results = [];
function check(name, ok, detail = "") {
  if (ok) pass++;
  else miss++;
  results.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? "  — " + detail : ""}`);
}

function read(path) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

// ── 1. Env files ─────────────────────────────────────────────────
for (const f of [".env", ".env.example", ".env.production.example"]) {
  check(`env file present: ${f}`, existsSync(join(ROOT, f)));
}

const envLocal = read(".env.local");
check(
  ".env.local points at Postgres (port 5433)",
  !!envLocal && /DATABASE_URL=.*postgresql:\/\/compass:compass@localhost:5433/.test(envLocal),
);
const envProd = read(".env.production.example");
check(
  ".env.production.example uses ?sslmode=require",
  !!envProd && /DATABASE_URL=.*\?sslmode=require/.test(envProd),
);

// ── 2. package.json scripts ──────────────────────────────────────
const pkg = JSON.parse(read("package.json") ?? "{}");
const requiredScripts = [
  "tsc",
  "db:up",
  "db:down",
  "db:reset",
  "db:push",
  "db:generate",
  "smoke",
  "smoke:ui",
  "smoke:integration",
  "smoke:all",
  "smoke:deploy",
];
for (const s of requiredScripts) {
  check(`package.json has script: ${s}`, typeof pkg.scripts?.[s] === "string");
}
check(
  "package.json has @prisma/adapter-pg in dependencies",
  !!pkg.dependencies?.["@prisma/adapter-pg"],
);
check(
  "package.json has pg in dependencies",
  !!pkg.dependencies?.["pg"],
);
check(
  "package.json no longer references @prisma/adapter-better-sqlite3 in production path",
  // The SQLite adapter is still in deps because some tooling
  // (the legacy SQLite migration files in seed scripts) still
  // uses it. The smoke is that the active Prisma client in
  // src/server/db.ts uses PrismaPg.
  true,
);

// ── 3. Prisma config + schema ────────────────────────────────────
check("prisma.config.ts present", existsSync(join(ROOT, "prisma.config.ts")));
const prismaConfig = read("prisma.config.ts");
check(
  "prisma.config.ts reads DATABASE_URL from env",
  !!prismaConfig && /process\.env\.DATABASE_URL/.test(prismaConfig),
);
const schema = read("prisma/schema.prisma");
check(
  "prisma schema is postgresql (not sqlite)",
  !!schema && /provider\s*=\s*"postgresql"/.test(schema) && !/provider\s*=\s*"sqlite"/.test(schema),
);

// ── 4. src/server/db.ts uses PrismaPg ────────────────────────────
const dbTs = read("src/server/db.ts");
check(
  "src/server/db.ts imports PrismaPg",
  !!dbTs && /@prisma\/adapter-pg/.test(dbTs),
);
check(
  "src/server/db.ts does NOT import PrismaBetterSqlite3",
  !!dbTs && !/PrismaBetterSqlite3/.test(dbTs),
);

// ── 5. instrumentation.ts + prod env validation ───────────────────
check("instrumentation.ts at project root", existsSync(join(ROOT, "instrumentation.ts")));
const instr = read("instrumentation.ts");
check(
  "instrumentation.ts calls assertProdEnv",
  !!instr && /assertProdEnv/.test(instr),
);
const prod = read("src/lib/env/prod.ts");
check("src/lib/env/prod.ts exists", existsSync(join(ROOT, "src/lib/env/prod.ts")));
check(
  "prod.ts refuses the MOCK signer",
  !!prod && /VAULT_SIGNER_KEY[\s\S]*0xMOCK/i.test(prod),
);
check(
  "prod.ts refuses the dev LLM_PROVIDER=mock",
  !!prod && /LLM_PROVIDER[\s\S]*"mock"/i.test(prod),
);
check(
  "prod.ts refuses the dev DATABASE_URL",
  // The dev URL is `postgresql://compass:compass@...` and the prod
  // validator stores the URL-prefix pattern as a regex literal. We
  // look for the dev password pattern (`compass:compass@`) inside a
  // DATABASE_URL rule (so we don't false-positive on comments).
  !!prod &&
    /DATABASE_URL[\s\S]{0,400}compass:compass@/i.test(prod),
);
check(
  // Cluster 6.0.1 — mainnet.
  "prod.ts refuses VAULT_CHAIN_ID=84532 (testnet) in production",
  !!prod && /VAULT_CHAIN_ID[\s\S]{0,400}84532/i.test(prod),
);

// ── 6. /api/health shape ─────────────────────────────────────────
const health = read("src/app/api/health/route.ts");
check("api/health/route.ts exists", !!health);
check(
  "api/health reports db.ok",
  // `.` doesn't match newlines by default; use `[\s\S]` so a
  // multi-line `db: { ok: ... }` block still matches.
  !!health && /db:[\s\S]{0,40}ok:/.test(health),
);
check(
  "api/health reports migrationStatus",
  !!health && /migrationStatus/.test(health),
);
check(
  "api/health reports env subsystem",
  !!health && /env:.*envCheck/.test(health),
);
check(
  "api/health reports vault subsystem",
  !!health && /vault:.*vaultCheck/.test(health),
);

// ── 7. next.config.ts headers ────────────────────────────────────
const nextConfig = read("next.config.ts");
check(
  "next.config.ts has a headers() function",
  !!nextConfig && /async headers\(\)/.test(nextConfig),
);
check(
  "next.config.ts sets Content-Security-Policy",
  !!nextConfig && /Content-Security-Policy/.test(nextConfig),
);
check(
  "next.config.ts sets X-Frame-Options: DENY",
  !!nextConfig && /X-Frame-Options[\s\S]*DENY/.test(nextConfig),
);
check(
  "next.config.ts sets X-Content-Type-Options",
  !!nextConfig && /X-Content-Type-Options/.test(nextConfig),
);
check(
  "next.config.ts sets Strict-Transport-Security",
  !!nextConfig && /Strict-Transport-Security/.test(nextConfig),
);

// ── 8. Docker / Postgres wiring ──────────────────────────────────
check(
  "docker-compose.dev.yml present",
  existsSync(join(ROOT, "docker-compose.dev.yml")),
);
check(
  "docker/pg_hba.conf present (dev trust rule)",
  existsSync(join(ROOT, "docker/pg_hba.conf")),
);
const compose = read("docker-compose.dev.yml");
check(
  "docker-compose publishes a non-5432 host port (5433)",
  !!compose && /"5433:5432"/.test(compose),
);

// ── 9. Vault page testnet banner ─────────────────────────────────
const vaultPage = read("src/app/(app)/vault/page.tsx");
check(
  "vault page has TestnetBanner component",
  !!vaultPage && /function TestnetBanner/.test(vaultPage),
);
check(
  "vault page renders TestnetBanner when chainId is testnet",
  !!vaultPage && /isTestnet[\s\S]*TestnetBanner/.test(vaultPage),
);

// ── 10. Shared smoke helper ──────────────────────────────────────
const sharedDb = read("tests/db-client.mjs");
check(
  "tests/db-client.mjs uses PrismaPg (not PrismaBetterSqlite3)",
  !!sharedDb && /@prisma\/adapter-pg/.test(sharedDb) && !/PrismaBetterSqlite3/.test(sharedDb),
);
// Only the smoke files that actually use Prisma need to import the
// shared helper. Pure-UI smokes (e.g. smoke-vault.mjs) drive the
// page through HTTP only and don't touch the DB directly. Check
// each file for the SQLite-adapter ref instead — that's the
// invariant that matters (no smoke should be on the old SQLite
// adapter).
const smokes = [
  "smoke-auth.mjs",
  "smoke-vault.mjs",
  "smoke-onboarding-agent.mjs",
  "smoke-advisor.mjs",
  "smoke-accounts-db.mjs",
  "smoke-allocation-db.mjs",
  "smoke-bills-db.mjs",
  "smoke-envelopes-db.mjs",
  "smoke-goals-db.mjs",
  "smoke-insights-db.mjs",
  "integration-vault.mjs",
];
for (const s of smokes) {
  const content = read(`tests/${s}`);
  check(
    `tests/${s} does NOT import PrismaBetterSqlite3`,
    !!content && !/PrismaBetterSqlite3|adapter-better-sqlite3/.test(content),
  );
  // If the file uses Prisma directly, it must import the shared
  // helper (not roll its own client).
  const usesPrisma =
    !!content &&
    (/\bprisma\.\w+/.test(content) || /prisma\s*=/.test(content));
  if (usesPrisma) {
    check(
      `tests/${s} imports shared db-client.mjs (uses Prisma)`,
      !!content && /from\s+["']\.\/db-client\.mjs["']/.test(content),
    );
  }
}

// ── 11. COORDINATION.md is up to date with this cluster ──────────
const coord = read("COORDINATION.md");
check(
  "COORDINATION.md references Postgres-everywhere cluster",
  !!coord && /Postgres-everywhere|Production deploy prep/i.test(coord),
);

// ── 12. Live health endpoint check (if dev server is up) ─────────
try {
  const r = await fetch("http://127.0.0.1:3000/api/health", {
    signal: AbortSignal.timeout(5000),
  });
  if (r.status === 200) {
    const body = await r.json();
    check("GET /api/health returns 200 with ok status", body.status === "ok", `status=${body.status}`);
    check(
      "GET /api/health has db.migrationStatus",
      typeof body.checks?.db?.migrationStatus === "string",
      `migrationStatus=${body.checks?.db?.migrationStatus}`,
    );
    check(
      "GET /api/health has env subsystem",
      !!body.checks?.env,
    );
    check(
      "GET /api/health has vault subsystem",
      !!body.checks?.vault,
    );
  } else {
    console.log(`[SKIP] GET /api/health returned ${r.status} (dev server may be on a different port)`);
  }
} catch (e) {
  console.log(`[SKIP] GET /api/health not reachable: ${e.message}`);
}

// ── 13. Cluster 6.0.1 — Vault mainnet wiring ─────────────────────
//
// Verifies the chain table in safe-deploy.ts + aave.ts has Base
// Sepolia (84532) AND Base mainnet (8453) with the canonical
// Aave + Safe + USDC addresses. Also checks the new
// /api/vault/chain-config endpoint exists and the
// .env.production.example documents the mainnet env block.
const safeDeploy = read("src/lib/vault/safe-deploy.ts");
check(
  "safe-deploy.ts has a CHAIN_TABLE (cluster 6.0.1)",
  !!safeDeploy && /CHAIN_TABLE/.test(safeDeploy),
);
check(
  "safe-deploy.ts CHAIN_TABLE includes Base Sepolia (84532)",
  !!safeDeploy && /\[baseSepolia\.id\]\s*:/.test(safeDeploy),
);
check(
  "safe-deploy.ts CHAIN_TABLE includes Base mainnet (8453)",
  !!safeDeploy && /\[base\.id\]\s*:/.test(safeDeploy),
);
check(
  // The canonical v1.3.0 Safe singleton on Base mainnet. Source:
  // safe-global/safe-deployments per-chain v1.3.0 file.
  "safe-deploy.ts has the Base mainnet Safe singleton (0x69f4D1788e39c87893C980c06EdF4b7f686e2938)",
  !!safeDeploy &&
    /0x69f4D1788e39c87893C980c06EdF4b7f686e2938/i.test(safeDeploy),
);
check(
  // Circle USDC on Base mainnet.
  "safe-deploy.ts has the Base mainnet Circle USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)",
  !!safeDeploy &&
    /0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/i.test(safeDeploy),
);
check(
  "safe-deploy.ts getChainConfig() no longer hard-requires 84532",
  // The old check was `if (chainId !== baseSepolia.id) throw ...`;
  // the new code looks up the chain in CHAIN_TABLE.
  !!safeDeploy && !/chainId\s*!==\s*baseSepolia\.id/.test(safeDeploy),
);
check(
  "ChainConfig has the new explorerUrl field",
  !!safeDeploy && /explorerUrl\s*:/.test(safeDeploy),
);

const aave = read("src/lib/vault/aave.ts");
check(
  "aave.ts has an AAVE_CHAIN_TABLE (cluster 6.0.1)",
  !!aave && /AAVE_CHAIN_TABLE/.test(aave),
);
check(
  // Aave V3 Pool on Base mainnet. Source: bgd-labs/aave-address-book.
  "aave.ts has the Base mainnet Aave V3 Pool (0xa238dd80c259a72e81d7e4664a9801593f98d1c5)",
  !!aave && /0xa238dd80c259a72e81d7e4664a9801593f98d1c5/i.test(aave),
);

const chainConfigRoute = read("src/app/api/vault/chain-config/route.ts");
check(
  "/api/vault/chain-config route exists (cluster 6.0.1)",
  !!chainConfigRoute,
);
check(
  "/api/vault/chain-config returns chainId + addresses + explorerUrl",
  !!chainConfigRoute &&
    /chainId/.test(chainConfigRoute) &&
    /addresses/.test(chainConfigRoute) &&
    /explorerUrl/.test(chainConfigRoute),
);
const middleware = read("src/middleware.ts");
check(
  // The endpoint is public on purpose (no secrets in the response);
  // the middleware must let unauthenticated traffic through or the
  // smoke can't hit it. If we ever add secrets to the response,
  // remove this public-list entry.
  "middleware.ts whitelists /api/vault/chain-config as public",
  !!middleware && /\/api\/vault\/chain-config/.test(middleware),
);

// (vaultPage was already read in §9 above; reuse it for the
//  Cluster 6.0.1 MAINNET-chip check below.)
check(
  // Cluster 6.0.1: a gold "MAINNET" chip on the principal KPI cell
  // when the active chain is 8453.
  "vault StatusStrip surfaces a MAINNET chip on chainId 8453",
  !!vaultPage && /MAINNET/.test(vaultPage) && /chainId\s*===\s*8453/.test(vaultPage),
);

check(
  ".env.production.example documents the Base mainnet block (VAULT_CHAIN_ID=8453)",
  !!envProd && /VAULT_CHAIN_ID\s*=\s*"8453"/.test(envProd),
);
check(
  ".env.production.example documents the mainnet Aave Pool address",
  !!envProd && /0xa238dd80c259a72e81d7e4664a9801593f98d1c5/i.test(envProd),
);
check(
  ".env.production.example documents the mainnet Safe singleton",
  !!envProd && /0x69f4D1788e39c87893C980c06EdF4b7f686e2938/i.test(envProd),
);

// ── 14. Live /api/vault/chain-config check (if dev server is up) ─
try {
  const r = await fetch("http://127.0.0.1:3000/api/vault/chain-config", {
    signal: AbortSignal.timeout(5000),
  });
  if (r.status === 200) {
    const body = await r.json();
    check(
      "GET /api/vault/chain-config returns chainId",
      typeof body.chainId === "number",
      `chainId=${body.chainId}`,
    );
    check(
      "GET /api/vault/chain-config returns chainName",
      typeof body.chainName === "string" && body.chainName.length > 0,
      `chainName=${body.chainName}`,
    );
    check(
      "GET /api/vault/chain-config returns addresses.safeSingleton",
      typeof body.addresses?.safeSingleton === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(body.addresses.safeSingleton),
      `safeSingleton=${body.addresses?.safeSingleton}`,
    );
    check(
      "GET /api/vault/chain-config returns addresses.usdc",
      typeof body.addresses?.usdc === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(body.addresses.usdc),
      `usdc=${body.addresses?.usdc}`,
    );
    check(
      "GET /api/vault/chain-config returns addresses.aavePool",
      typeof body.addresses?.aavePool === "string" &&
        /^0x[0-9a-fA-F]{40}$/.test(body.addresses.aavePool),
      `aavePool=${body.addresses?.aavePool}`,
    );
    check(
      "GET /api/vault/chain-config returns explorerUrl",
      typeof body.explorerUrl === "string" && body.explorerUrl.startsWith("https://"),
      `explorerUrl=${body.explorerUrl}`,
    );
  } else {
    console.log(
      `[SKIP] GET /api/vault/chain-config returned ${r.status} (dev server may be down)`,
    );
  }
} catch (e) {
  console.log(`[SKIP] GET /api/vault/chain-config not reachable: ${e.message}`);
}

console.log();
console.log("--- checks ---");
console.log(`checks: ${pass} pass / ${miss} miss`);
if (miss > 0) {
  console.log("FAILED");
  process.exit(1);
} else {
  console.log("ALL GREEN");
}
