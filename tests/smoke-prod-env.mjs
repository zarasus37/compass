/**
 * Smoke for the production environment validator (src/lib/env/prod.ts).
 *
 * Verifies the boundary conditions of the validator by spawning
 * tsx subprocesses with synthesized env. These conditions are too
 * dangerous to verify with real prod env (mismatches can boot-block
 * a deploy), so the smoke isolates each test via `tsx -e`.
 *
 * Run: node tests/smoke-prod-env.mjs
 *
 * Requires: tsx on PATH (already required by tests/integration-vault.mjs).
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

function runValidator(env) {
  // Spawn tsx with the env passed through + a small wrapper that
  // imports the validator and prints JSON.
  //
  // The import specifier is resolved from the invocation directory and
  // encoded as a file:// URL — a bare `C:\…` path is parsed as a URL
  // with scheme `c:` and rejected by the ESM loader. This used to be a
  // hardcoded `/workspace/compass/...` sandbox path, which does not
  // exist on this machine and made the child exit non-zero — the
  // assertions then read as MISS for a reason that had nothing to do
  // with the validator.
  const validatorUrl = pathToFileURL(
    join(process.cwd(), "src/lib/env/prod.ts"),
  ).href;
  const code = `
    import { validateProdEnv } from ${JSON.stringify(validatorUrl)};
    const r = validateProdEnv();
    process.stdout.write(JSON.stringify(r));
  `;
  // Strip ALL the testable vars from inherited env so test isolation
  // is hermetic. We don't want the dev server's LLM_PROVIDER or
  // MAVIS_API_KEY to leak into the child.
  const cleanEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (
      [
        "COMPASS_SANDBOX",
        "DATABASE_URL",
        "MAVIS_API_KEY",
        "SESSION_SECRET",
        "LLM_PROVIDER",
        "VAULT_CHAIN_ID",
        "VAULT_SIGNER_KEY",
        "NODE_ENV",
      ].includes(k)
    ) {
      continue;
    }
    cleanEnv[k] = v;
  }
  // Run tsx through Node's own loader hook rather than shelling out to
  // the `tsx` shim. Three reasons, all hit on Windows:
  //   1. `spawnSync("tsx", …)` cannot resolve the `.cmd` shim without a
  //      shell, and failed with status=null and no stderr — surfacing
  //      as `tsx exit=null stderr=undefined` instead of a real result.
  //   2. With `shell: true` the shim resolves, but the repo path
  //      contains spaces ("OneDrive - Southern Careers Institute"), so
  //      the unquoted command line broke again.
  //   3. `--import tsx` needs no PATH entry at all, so this also works
  //      when the file is run directly as `node tests/smoke-prod-env.mjs`
  //      rather than through a `pnpm` script.
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", code],
    {
      cwd: process.cwd(),
      env: { ...cleanEnv, ...env },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  if (result.error) {
    throw new Error(`tsx failed to spawn: ${result.error.message}`);
  }
  if (result.status !== 0) {
    console.error("tsx stderr:", result.stderr);
    throw new Error(`tsx exit=${result.status} stderr=${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

// Helper to run tsx with optional env tweaks (delete = unset)
function makeEnv(extra) {
  // Start from a clean ENV — strip all the vars we care about so
  // we have a deterministic baseline.
  const baseEnv = { ...process.env };
  for (const k of [
    "COMPASS_SANDBOX",
    "VAULT_CHAIN_ID",
    "VAULT_SIGNER_KEY",
    "MAVIS_API_KEY",
    "SESSION_SECRET",
    "LLM_PROVIDER",
    // VERCEL must be stripped too: validateProdEnv() now hard-fails when
    // COMPASS_SANDBOX=1 is combined with VERCEL, so a stray VERCEL in the
    // ambient shell env would make Phase 9 fail for the wrong reason.
    "VERCEL",
  ]) {
    delete baseEnv[k];
  }
  return { ...baseEnv, ...extra };
}

const REQUIRED = {
  DATABASE_URL: "postgresql://prod:strongpass@db.prod.example.com:5432/compass_prod?sslmode=require",
  MAVIS_API_KEY: "sk-abcdef1234567890abcdef1234567890",
  SESSION_SECRET: "a".repeat(64),
  LLM_PROVIDER: "mavis",
};

// ============================================================
// Phase 1: mom-launch baseline (no vault) — must pass
// ============================================================
{
  const env = makeEnv({ ...REQUIRED, NODE_ENV: "production" });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  const r = runValidator(env);
  check(
    "mom-launch (no vault vars) — validator ok",
    r.ok === true,
    `got ok=${r.ok} issues=${JSON.stringify(r.issues ?? [])}`,
  );
}

// ============================================================
// Phase 2: LLM_PROVIDER=mock — must fail
// ============================================================
{
  const env = makeEnv({ ...REQUIRED, LLM_PROVIDER: "mock", NODE_ENV: "production" });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  const r = runValidator(env);
  check(
    "LLM_PROVIDER=mock in production — fails",
    r.ok === false && r.issues.some((i) => i.key === "LLM_PROVIDER"),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 3: dev DATABASE_URL placeholder (compass:compass@localhost)
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    DATABASE_URL: "postgresql://compass:compass@localhost:5432/compass_dev",
    NODE_ENV: "production",
  });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  const r = runValidator(env);
  check(
    "DATABASE_URL with compass:compass placeholder — fails",
    r.ok === false &&
      r.issues.some((i) => i.key === "DATABASE_URL" && /production Postgres URL/.test(i.message)),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 4: DATABASE_URL without sslmode=require
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    DATABASE_URL: "postgresql://prod:realpass@db.prod.example.com:5432/compass_prod",
    NODE_ENV: "production",
  });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  const r = runValidator(env);
  check(
    "DATABASE_URL without sslmode=require — fails",
    r.ok === false && r.issues.some((i) => i.key === "DATABASE_URL" && /sslmode=require/.test(i.message) && /production Postgres/.test(i.message)),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 5: MAVIS_API_KEY = leaked dev key
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    MAVIS_API_KEY: "sk-api-kkrA3L7abcdef0123456789ABCDEF",
    NODE_ENV: "production",
  });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  const r = runValidator(env);
  check(
    "MAVIS_API_KEY = leaked dev key — fails",
    r.ok === false &&
      r.issues.some((i) => i.key === "MAVIS_API_KEY" && /dev key/.test(i.message)),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 6: VAULT_CHAIN_ID=84532 (testnet in prod)
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    VAULT_CHAIN_ID: "84532",
    VAULT_SIGNER_KEY: "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    NODE_ENV: "production",
  });
  const r = runValidator(env);
  check(
    "VAULT_CHAIN_ID=84532 (testnet) in prod — fails",
    r.ok === false &&
      r.issues.some((i) => i.key === "VAULT_CHAIN_ID" && /mainnet/.test(i.message)),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 7: VAULT_SIGNER_KEY=0xMOCK… (mock signer)
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    VAULT_CHAIN_ID: "8453",
    VAULT_SIGNER_KEY: "0xMOCKabcdef0123456789",
    NODE_ENV: "production",
  });
  const r = runValidator(env);
  check(
    "VAULT_SIGNER_KEY=0xMOCK… in prod — fails",
    r.ok === false &&
      r.issues.some((i) => i.key === "VAULT_SIGNER_KEY" && /mock/i.test(i.message)),
    `got issues=${r.issues?.map((i) => i.key).join(",")}`,
  );
}

// ============================================================
// Phase 8: Full prod stack (mainnet vault) — must pass
// ============================================================
{
  const env = makeEnv({
    ...REQUIRED,
    VAULT_CHAIN_ID: "8453",
    VAULT_SIGNER_KEY: "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    NODE_ENV: "production",
  });
  const r = runValidator(env);
  check(
    "Full prod stack (mainnet vault) — ok",
    r.ok === true,
    `got ok=${r.ok} issues=${JSON.stringify(r.issues ?? [])}`,
  );
}

// ============================================================
// Phase 9: COMPASS_SANDBOX=1 bypass
// ============================================================
{
  const env = makeEnv({
    LLM_PROVIDER: "mock",
    NODE_ENV: "production",
    COMPASS_SANDBOX: "1",
  });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  delete env.MAVIS_API_KEY;
  delete env.SESSION_SECRET;
  const r = runValidator(env);
  check(
    "COMPASS_SANDBOX=1 bypasses validator",
    r.ok === true,
    `got ok=${r.ok}`,
  );
}

// ============================================================
// Phase 9b: COMPASS_SANDBOX=1 is FORBIDDEN on Vercel
//
// The negative half of Phase 9. Phase 9 proves the flag still works
// for the local smoke runner; this proves the flag can no longer open
// the bypass on a real deploy. Vercel always sets VERCEL, so this is
// the exact shape of the mistake this guards against.
// ============================================================
{
  const env = makeEnv({
    LLM_PROVIDER: "mock",
    NODE_ENV: "production",
    COMPASS_SANDBOX: "1",
    VERCEL: "1",
  });
  delete env.VAULT_CHAIN_ID;
  delete env.VAULT_SIGNER_KEY;
  delete env.MAVIS_API_KEY;
  delete env.SESSION_SECRET;
  const r = runValidator(env);
  check(
    "COMPASS_SANDBOX=1 is rejected on Vercel",
    r.ok === false &&
      Array.isArray(r.issues) &&
      r.issues.some((i) => i.key === "COMPASS_SANDBOX"),
    `got ok=${r.ok} issues=${JSON.stringify(r.issues ?? [])}`,
  );
}

// ----- Final -----
console.log("\n--- checks ---");
const pass = checks.filter((c) => c.ok).length;
const miss = checks.length - pass;
console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
if (miss > 0) {
  console.log("\nFAILED checks:");
  for (const c of checks) if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  process.exit(1);
}
console.log("ALL GREEN");
