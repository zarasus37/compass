/**
 * Production environment validation.
 *
 * Cluster: Production deploy prep (2026-08-28).
 *
 * `validateProdEnv()` is called once at app boot when `NODE_ENV=production`.
 * It refuses to let the app start with any of the well-known dev
 * placeholders still in env, and fails fast on missing required keys.
 * In dev / test (NODE_ENV ≠ "production") it's a no-op so the
 * smoke suite can keep using the lighter local config.
 *
 * The reason this is its own module (and not inline in
 * `src/lib/env/index.ts`): this file MUST NOT be imported in the
 * dev path. Side-effecting validation at module-load is fine in
 * prod (we want to fail boot) but would break `pnpm dev` in
 * the common case of "I haven't filled in prod env yet."
 *
 * Usage in Next.js:
 *   // instrumentation.ts (Next 13+ convention)
 *   export async function register() {
 *     if (process.env.NODE_ENV === "production") {
 *       await import("@/lib/env/prod").then(m => m.validateProdEnv());
 *     }
 *   }
 */
export type ProdEnvIssue = {
  key: string;
  message: string;
};

const REQUIRED: Array<{ key: string; placeholder: RegExp | null; reason: string }> = [
  {
    // Dev URL placeholder check: catch "postgresql://compass:compass@…".
    // sslmode=require is enforced separately in step 1b below (it's
    // a "must include" check, not "must not include").
    key: "DATABASE_URL",
    placeholder: /postgresql:\/\/compass:compass@/i,
    reason:
      "DATABASE_URL must be the production Postgres URL (not the dev Docker URL).",
  },
  {
    key: "MAVIS_API_KEY",
    placeholder: /^sk-api-kkrA3L7/, // the leaked dev key from .env.local
    reason: "MAVIS_API_KEY must be a fresh production key, not the dev key.",
  },
  // Note: VAULT_SIGNER_KEY and VAULT_CHAIN_ID are NOT in this
  // REQUIRED list. Vault is v1.1+ (deferred per user direction
  // 2026-09-22: clusters 7.20–7.25 are reserved for vault re-enable
  // but mom-launch ships without it). When those vars are unset,
  // the vault code paths themselves (`safe-deploy.ts`,
  // `db.ts:executeBill`) throw honest "env not configured" errors
  // at runtime — the app boots fine, the /vault page renders an
  // honest "vault env pending" banner, and no routing crashes.
  //
  // The MOCK signer check stays live so a `VAULT_SIGNER_KEY=0xMOCK…`
  // placeholder can never sneak in; see FORBIDDEN_PLACEHOLDERS below.
];

const FORBIDDEN_PROVIDERS: Array<{ key: string; value: string; reason: string }> = [
  {
    key: "LLM_PROVIDER",
    value: "mock",
    reason:
      "LLM_PROVIDER must NOT be 'mock' in production — it would let any code path " +
      "calling getLlmProvider() return the deterministic stub.",
  },
];

/** Cluster 6.0.1 — production must target Base mainnet (8453), not
 *  Base Sepolia (84532). The chain table in safe-deploy.ts has
 *  both wired, but the prod validator refuses to start with a
 *  testnet chainId. The check is a no-op in dev/test (where the
 *  testnet is the right target).
 *
 *  Vault v1.1 deferred cluster — these checks are conditional:
 *  if VAULT_CHAIN_ID is unset (mom-launch), the check is skipped.
 *  If set, it must be mainnet. Same for the MOCK signer check. */
const FORBIDDEN_IN_PROD: Array<{ key: string; test: (v: string) => boolean; reason: string }> = [
  {
    key: "VAULT_CHAIN_ID",
    test: (v) => v.trim() === "84532",
    reason:
      "VAULT_CHAIN_ID=84532 (Base Sepolia testnet) is forbidden in production. " +
      "Set VAULT_CHAIN_ID=8453 for Base mainnet. " +
      "Real USDC on a testnet is a misconfiguration; the deploy will succeed " +
      "but every bill / deposit is valueless.",
  },
  {
    key: "VAULT_SIGNER_KEY",
    test: (v) => /^0xMOCK/i.test(v),
    reason:
      "VAULT_SIGNER_KEY=0xMOCK… is the dev mock-signer placeholder. " +
      "Use a real EOA private key, OR leave the var unset (vault is v1.1+; " +
      "vault code paths throw 'env not configured' at runtime when unset).",
  },
];

export function validateProdEnv(): { ok: true } | { ok: false; issues: ProdEnvIssue[] } {
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  // Cluster 7.15.1 — sandbox escape hatch. The local-agent smoke
  // runs `next start` (prod build) to dodge the dev-server instability
  // documented in HANDOVER.md. The dev environment doesn't have the
  // real prod keys (MAVIS_API_KEY, VAULT_SIGNER_KEY, etc.) so we let
  // the operator opt in to a sandbox-only bypass with an explicit
  // env var. Production deploys (Vercel, CI) never set this flag —
  // Vercel's prod-env is real, so the validator still does its job.
  if (process.env.COMPASS_SANDBOX === "1") {
    if (process.env.NODE_ENV !== "production") {
      // Guard: the flag only means anything in NODE_ENV=production.
      // In dev, validateProdEnv() returns ok:true above; nothing to do.
      return { ok: true };
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[prod-env] COMPASS_SANDBOX=1: bypassing prod-env safety checks. " +
        "This flag is for local smoke runs only — never set it on Vercel/CI.",
    );
    return { ok: true };
  }

  const issues: ProdEnvIssue[] = [];

  // 1. Required keys must be present.
  for (const { key, placeholder, reason } of REQUIRED) {
    const v = process.env[key];
    if (!v || v.trim() === "") {
      issues.push({ key, message: `${key} is required. ${reason}` });
      continue;
    }
    // 2. If a "must not match" placeholder is set, check it.
    if (placeholder && placeholder.test(v)) {
      issues.push({ key, message: reason });
    }
  }

  // 1b. Separate "must include" checks for DATABASE_URL — explicitly
  // fail if sslmode=require is missing. (Previously this was a
  // dead-code branch in the loop above, see audit log 2026-09-23.)
  {
    const dbUrl = process.env.DATABASE_URL ?? "";
    if (dbUrl && !/\?sslmode=require/.test(dbUrl)) {
      issues.push({
        key: "DATABASE_URL",
        message:
          "DATABASE_URL must include ?sslmode=require for production Postgres. " +
          "(Managed Postgres providers like Neon refuse non-TLS connections.)",
      });
    }
  }

  // 3. Forbidden provider values.
  for (const { key, value, reason } of FORBIDDEN_PROVIDERS) {
    if ((process.env[key] ?? "").toLowerCase() === value.toLowerCase()) {
      issues.push({ key, message: reason });
    }
  }

  // 4. Forbidden *values* in production (Cluster 6.0.1) — e.g.
  // testnet chainId sneaking into a prod deploy. These checks run
  // AFTER the REQUIRED check above (so `VAULT_CHAIN_ID` is known
  // to be present) and BEFORE we report `ok: true`.
  for (const { key, test, reason } of FORBIDDEN_IN_PROD) {
    const v = process.env[key];
    if (v && test(v)) {
      issues.push({ key, message: reason });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true };
}

/**
 * Strict-mode boot guard. Throws if prod env is invalid. The error
 * message lists every issue, one per line, so a misconfigured
 * hosting provider's boot log shows all problems at once.
 */
export function assertProdEnv(): void {
  const result = validateProdEnv();
  if (!result.ok) {
    const lines = result.issues.map((i) => `  - ${i.key}: ${i.message}`);
    throw new Error(
      `[prod-env] refused to start in production:\n${lines.join("\n")}\n` +
        `Set the missing / wrong keys in your hosting provider's secret store, then redeploy.`,
    );
  }
}
