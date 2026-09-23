/**
 * Smoke for scripts/spawn-test-account.mjs (Cluster 7.30a helper).
 *
 * Verifies:
 *  1. With --gen-password, creates a user with a generated pw, returns exit 0
 *  2. Re-running with same email + different password: idempotent (no overwrite)
 *  3. With --overwrite, updates password + invalidates sessions
 *  4. With --dry-run, runs without writing
 *  5. With missing --email: errors non-zero with help text
 *  6. With --gen-password, the printed password is 43 chars base64url
 *  7. Cleans up the test user at the end
 */
import { spawnSync } from "node:child_process";
import { prisma } from "./db-client.mjs";

const BASE = "scripts/spawn-test-account.mjs";
const TEST_EMAIL = `test-spawn-${Date.now()}@compass.local`;

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

function run(script, args, env = {}) {
  return spawnSync("node", [script, ...args], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, ...env, NODE_ENV: "development" },
  });
}

function failCleanup(e) {
  console.error("CRASH:", e.message);
  // Best-effort cleanup
  prisma.user.deleteMany({ where: { email: TEST_EMAIL } })
    .catch(() => {})
    .finally(() => process.exit(1));
}

async function main() {
  // 1. Create with --gen-password
  const r1 = run(BASE, ["--email", TEST_EMAIL, "--name", "Smoke Test", "--gen-password"], {
    DATABASE_URL: process.env.DATABASE_URL,
  });
  const createdPwMatch = r1.stdout.match(/password:\s+(\S+)/);
  check("[1] create with --gen-password: exit 0", r1.status === 0);
  check("[1] create with --gen-password: prints a password", !!createdPwMatch);
  const createdPw = createdPwMatch ? createdPwMatch[1] : null;
  check(
    "[6] generated password is 43 chars base64url",
    !!createdPw && createdPw.length === 43 && /^[A-Za-z0-9_-]+$/.test(createdPw),
    `got len=${createdPw?.length}`,
  );

  // Verify the user exists in DB
  const u = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  check("[1] user row exists in DB after create", !!u);

  // 2. Re-run idempotent (same email, different password)
  const r2 = run(BASE, [
    "--email", TEST_EMAIL,
    "--name", "Smoke Test",
    "--password", "this-password-will-not-be-applied",
  ], { DATABASE_URL: process.env.DATABASE_URL });
  const alreadyMsg = /already exists/.test(r2.stdout);
  check("[2] idempotent: prints 'already exists'", alreadyMsg);

  // 3. --overwrite resets the password
  const r3 = run(BASE, [
    "--email", TEST_EMAIL,
    "--name", "Smoke Test",
    "--password", "overwritten-password-1234",
    "--overwrite",
  ], { DATABASE_URL: process.env.DATABASE_URL });
  check("[3] --overwrite: exit 0", r3.status === 0);
  check("[3] --overwrite: prints sessions invalidated", /invalidated/i.test(r3.stdout));

  // 4. --dry-run exits without writing
  const dryEmail = `${TEST_EMAIL}-dryrun`;
  const r4 = run(BASE, [
    "--email", dryEmail,
    "--name", "Dry Run",
    "--password", "should-not-be-created-2026",
    "--dry-run",
  ], { DATABASE_URL: process.env.DATABASE_URL });
  check("[4] --dry-run: exit 0", r4.status === 0);
  const dryUser = await prisma.user.findUnique({ where: { email: dryEmail } });
  check("[4] --dry-run: did NOT create user", !dryUser);

  // 5. missing --email
  const r5 = run(BASE, ["--name", "X"], { DATABASE_URL: process.env.DATABASE_URL });
  check("[5] missing --email: non-zero exit", r5.status !== 0);
  check("[5] missing --email: prints help", /usage/i.test(r5.stdout + r5.stderr));

  // Cleanup
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

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
}

main().catch(failCleanup);
