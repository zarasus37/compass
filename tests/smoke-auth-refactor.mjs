/**
 * Smoke for Cluster 7.32a — auth refactor cleanup.
 *
 * Verifies the structural changes from the multi-user plan without
 * changing observable behavior. 7.32a made the refactor safe; 7.32b
 * then dropped the countUsers guard to actually open signup (see the
 * [10] checks at the bottom, which now assert the OPEN behaviour):
 *  1. src/lib/auth/password-policy.ts exists and exports isWeakPassword
 *  2. isWeakPassword rejects "password..." (dictionary-weak pattern)
 *  3. isWeakPassword accepts a 32-char random base64url password
 *  4. Email local-part echo is caught ("user@example.com" + "user12345...")
 *  5. Length minimum — dev (8) vs production (12)
 *  6. signupAction uses the shared policy (grep for isWeakPassword in actions.ts)
 *  7. seed-admin.mjs imports the shared policy (no duplicated WEAK_PATTERNS list)
 *  8. countUsers() still exists in src/server/auth/user.ts (used by the /login page)
 *  9. findFirst({}) without `where:` is absent from the runtime source
 * 10. signupAction accepts a strong password, /welcome stays open
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isWeakPassword } from "../src/lib/auth/password-policy.ts";

const ROOT = process.cwd();
const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

function readFile(path) {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf8");
}

// 1. password-policy module exists
const policySrc = readFile("src/lib/auth/password-policy.ts");
check("[1] src/lib/auth/password-policy.ts exists", !!policySrc);
check("[1] exports isWeakPassword", !!policySrc?.includes("export function isWeakPassword"));

// 2. isWeakPassword rejects the WEAK_PATTERNS list
const weakCases = [
  "password123456789",
  "Password12345",
  "mom12345",
  "admin1234",
  "compass123",
  "12345678",
  "qwerty1234",
  "letmein1234",
  "user123456",
  "test1234",
  "abc12345",
  "iloveyou123",
];
let weakRejects = 0;
for (const p of weakCases) {
  if (isWeakPassword(p, "development") !== null) weakRejects++;
}
check("[2] isWeakPassword rejects all known weak patterns", weakRejects === weakCases.length, `rejected ${weakRejects}/${weakCases.length}`);

// 3. accepts a strong random
const STRONG = "Vj7K3p9L2qR8tY1uB4nH7xZ0cM6dG5eF8kP3aQ9w";
check("[3] isWeakPassword accepts a 32-char random base64url", isWeakPassword(STRONG, "production") === null);

// 4. email local-part echo is caught
const weakEmail = "user@example.com";
const weakPw = "user12345678";
check("[4] email local-part echo is caught", isWeakPassword(weakPw, "production", weakEmail) !== null);

// 5. length minimum: dev (8) vs prod (12)
check("[5a] dev minimum accepts 8 chars", isWeakPassword("abcdefgh", "development") === null);
check("[5b] dev minimum rejects 7 chars", isWeakPassword("abcdefg", "development") !== null);
check("[5c] prod minimum accepts 12 chars", isWeakPassword("abcdefghijkl", "production") === null);
check("[5d] prod minimum rejects 11 chars", isWeakPassword("abcdefghijk", "production") !== null);

// 6. signupAction uses the shared policy
const actionsSrc = readFile("src/app/(auth)/actions.ts");
check("[6] signupAction imports isWeakPassword", !!actionsSrc?.includes('isWeakPassword'));

// 7. seed-admin uses shared policy (no duplicated WEAK_PATTERNS list)
const seedAdminSrc = readFile("scripts/seed-admin.mjs");
check("[7] seed-admin imports isWeakPassword", !!seedAdminSrc?.includes('isWeakPassword'));
check("[7b] seed-admin no longer declares its own WEAK_PATTERNS", !/^const WEAK_PATTERNS/m.test(seedAdminSrc || ""));

// 8. countUsers still exists in src/server/auth/user.ts (kept for 7.32b's guard work)
const userSrc = readFile("src/server/auth/user.ts");
check("[8] countUsers helper still exists", !!userSrc?.includes("export async function countUsers"));

// 9. findFirst() without where: is absent (the latent bug we ruled out)
const srcdump = ["src/lib", "src/server", "src/app"].map(d => readFile(`${d}/foo.ts`)).filter(Boolean);
const allSrc = ["src/lib", "src/server", "src/app"].flatMap(d => {
  const res = [];
  const walk = (path) => {
    try {
      // `statSync`/`readdirSync` come from the top-level `node:fs`
      // import. This previously called `require("node:fs")` here,
      // which throws ReferenceError in an ESM module — the throw was
      // swallowed by the catch below, so `allSrc` came back EMPTY and
      // check [9] reported success having inspected zero files.
      const stat = statSync(path);
      if (stat.isDirectory()) {
        readdirSync(path).forEach(name => walk(`${path}/${name}`));
      } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
        res.push(path);
      }
    } catch (e) {}
  };
  walk(`${ROOT}/${d}`);
  return res;
});
// Guard the guard: a file-walking check that scans 0 files must FAIL,
// not pass. This is what let the `require` bug hide for so long.
check("[9a] the source walk actually found files", allSrc.length > 0, `found ${allSrc.length}`);
const fileCount = allSrc.length;
const findFirstNoWhere = allSrc.filter(p => {
  const src = readFileSync(p, "utf8");
  // Look for findFirst({ without where
  const matches = src.match(/findFirst\(\s*\{[^w]*\}\s*\)/g);
  // Exclude noisy: comments + actually-having-where
  return matches && matches.some(m => !/where\s*:/.test(m));
});
check("[9] No findFirst({}) without `where:` in src/{lib,server,app}", findFirstNoWhere.length === 0, `found ${findFirstNoWhere.length} across ${fileCount} files`);

// 10. Live functional test via the server: hit /login + /welcome, expect 200 each (status quo)
async function httpGet(p) {
  const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
  return { status: r.status, body: await r.text() };
}
const BASE = "http://127.0.0.1:3000";
const rL = await httpGet("/login");
const rW = await httpGet("/welcome");
check("[10] /login still 200 in status quo", rL.status === 200);
// Cluster 7.32b — signup is public now. /welcome no longer redirects to
// /login once a user exists; it always serves the registration form.
// Asserting the old 307 here would pin the single-user bootstrap shut.
check("[10] /welcome serves the signup form even when users > 0", rW.status === 200);
check(
  "[10] /login offers a route to registration",
  rL.body.includes("/welcome"),
  "login must link to /welcome or public signup is undiscoverable",
);

// Final
console.log("\n--- checks ---");
const pass = checks.filter(c => c.ok).length;
const miss = checks.length - pass;
console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
if (miss > 0) {
  console.log("\nFAILED checks:");
  for (const c of checks) if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  process.exit(1);
}
console.log("ALL GREEN");
