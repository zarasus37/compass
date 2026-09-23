#!/usr/bin/env node
/**
 * spawn-test-account — Cluster 7.30a helper.
 *
 * Creates an extra user row in the database so the operator can test
 * without touching mom's data. Wraps `seed-admin.mjs` with:
 *   - argparse --email/--name/--password (or --gen-password)
 *   - default DATABASE_URL loaded from .env / .env.local
 *   - prints a clear "log in here" message at the end
 *
 * Idempotent: if the email exists, no-ops (use --overwrite to reset).
 * Refuses to overwrite mom's row in prod unless --overwrite is passed.
 *
 * Usage (typical):
 *
 *   DATABASE_URL="postgresql://..." \
 *     pnpm tsx scripts/spawn-test-account.mjs \
 *       --email=test@xkryptic.local \
 *       --name="Test"
 *   # (--password is generated; printed at the end)
 *
 *   # Or full control:
 *   pnpm tsx scripts/spawn-test-account.mjs \
 *     --email=test@xkryptic.local --name="Test" \
 *     --password="a-strong-random" --overwrite
 *
 *   # Without pnpm:
 *   DATABASE_URL="..." node scripts/spawn-test-account.mjs \
 *     --email=test@xkryptic.local --name="Test" --gen-password
 *     # If node eats --email=, use -- between node and the rest:
 *     # node scripts/spawn-test-account.mjs -- --email=test@x --name=T --gen-password
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

function printHelp() {
  console.log(`spawn-test-account — Cluster 7.30a helper

Usage:
  DATABASE_URL="postgresql://..." \\
    node scripts/spawn-test-account.mjs \\
      --email=test@xkryptic.local \\
      --name="Test" \\
      [--password=STR] \\
      [--gen-password] \\
      [--overwrite] \\
      [--dry-run]

Behavior:
  - Either --password or --gen-password is required.
  - --overwrite will reset the password if the user already exists.
  - --dry-run prints what would happen and exits 0.

Required env:
  DATABASE_URL    Postgres connection string (also read from .env.local)

Notes:
  - Args can be passed as --flag value OR --flag=value.
  - On bash: pnpm tsx scripts/spawn-test-account.mjs --email=a@b --name=x --gen-password
  - On raw node: node scripts/spawn-test-account.mjs -- --email=a@b --name=x
    (the leading -- stops node from interpreting --email as a node option)
`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    // Skip a stray "--" separator some shells insert
    if (a === "--") continue;

    // Help flags
    if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    }

    if (!a.startsWith("--")) continue;
    const stripped = a.slice(2);
    if (!stripped) continue;

    // Bool flags (--foo with no =)
    const BOOL_FLAGS = new Set(["gen-password", "overwrite", "dry-run", "help"]);
    if (BOOL_FLAGS.has(stripped)) {
      out[stripped] = true;
      continue;
    }

    // --flag=value form
    const eq = stripped.indexOf("=");
    if (eq !== -1) {
      const key = stripped.slice(0, eq);
      const val = stripped.slice(eq + 1);
      if (key) out[key] = val;
      continue;
    }

    // --flag value form — value is the next arg unless it's another flag
    const key = stripped;
    const next = argv[i + 1];
    if (next === undefined || next === "--" || next.startsWith("--")) {
      // No value provided; treat as boolean (no-op for required flags, but
      // the missing-required check below will catch this)
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.email || typeof args.email !== "string") {
  console.error(`[spawn-test-account] missing required --email`);
  printHelp();
  process.exit(1);
}
if (!args.name || typeof args.name !== "string") {
  console.error(`[spawn-test-account] missing required --name`);
  printHelp();
  process.exit(1);
}

if (!args.password) {
  if (!args["gen-password"]) {
    console.error(`[spawn-test-account] either --password or --gen-password is required`);
    process.exit(1);
  }
  args.password = randomBytes(32).toString("base64url");
  args.passwordGenerated = true;
}

if (typeof args.password !== "string") {
  console.error(`[spawn-test-account] --password must be a string value`);
  process.exit(1);
}

process.env.ADMIN_EMAIL = args.email;
process.env.ADMIN_NAME = args.name;
process.env.ADMIN_PASSWORD = args.password;
if (args.overwrite) process.env.ADMIN_ALLOW_OVERWRITE = "1";
if (args["dry-run"]) process.env.ADMIN_DRY_RUN = "1";

console.log(`[spawn-test-account] target: ${args.email} (${args.name})`);
console.log(`[spawn-test-account] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);

const SCRIPT_PATH = "./scripts/seed-admin.mjs";
if (!existsSync(SCRIPT_PATH)) {
  console.error(`[spawn-test-account] missing: ${SCRIPT_PATH}`);
  process.exit(2);
}

const child = spawn(process.execPath, [SCRIPT_PATH], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[spawn-test-account] seed-admin exited with code ${code}`);
    process.exit(code ?? 1);
  }
  console.log("");
  console.log("=".repeat(60));
  console.log(`[spawn-test-account] DONE — log in at https://compass-mom.vercel.app/login`);
  console.log(`  email:    ${args.email}`);
  if (args.passwordGenerated) {
    console.log(`  password: ${args.password}`);
    console.log(`  (generated just now; copy it — won't show again)`);
  } else {
    console.log(`  password: (the one you passed via --password)`);
  }
  console.log(`  on phone: open Compass PWA → log out mom if needed → log in here`);
  console.log("=".repeat(60));
  process.exit(0);
});
child.on("error", (err) => {
  console.error(`[spawn-test-account] failed to spawn seed-admin:`, err);
  process.exit(2);
});
