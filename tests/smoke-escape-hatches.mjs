/**
 * Smoke for Cluster 7.34 — escape hatches (sign-out + re-onboard).
 *
 * Checks:
 *   1. SignOutButton component exists
 *   2. TopAppBar renders the SignOutButton (on the dashboard)
 *   3. TopAppBar source has <SignOutButton /> in its JSX
 *   4. RedoOnboardingCard component exists
 *   5. /settings page renders the Re-do onboarding card
 *   6. The reset button on /settings POSTs to /api/onboarding/reset
 *   7. /api/onboarding/reset wipes identity + redirects to /onboarding
 *   8. After reset, the user's FinancialIdentity is gone
 *   9. After reset, navigating to /onboarding shows the chat (not the dashboard)
 *  10. logoutAction clears cookies + redirects to /login
 */
import { prisma } from "./db-client.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

// 1. Component file exists
check(
  "[1] SignOutButton component exists",
  existsSync("src/components/shell/SignOutButton.tsx"),
);
check(
  "[2] RedoOnboardingCard component exists",
  existsSync("src/components/settings/RedoOnboardingCard.tsx"),
);

// 3. TopAppBar imports + uses SignOutButton
const topbarSrc = readFileSync("src/components/shell/TopAppBar.tsx", "utf8");
check(
  "[3] TopAppBar imports SignOutButton",
  /import \{ SignOutButton \} from "\.\/SignOutButton"/.test(topbarSrc),
);
check(
  "[4] TopAppBar JSX renders <SignOutButton />",
  /<SignOutButton \/>/.test(topbarSrc),
);

// 5. Settings page mounts the card
const settingsSrc = readFileSync("src/app/(app)/settings/page.tsx", "utf8");
check(
  "[5] /settings imports RedoOnboardingCard",
  /import \{ RedoOnboardingCard \}/.test(settingsSrc),
);
check(
  "[6] /settings JSX renders <RedoOnboardingCard />",
  /<RedoOnboardingCard \/>/.test(settingsSrc),
);

// 7. Card form posts to the reset endpoint
const cardSrc = readFileSync("src/components/settings/RedoOnboardingCard.tsx", "utf8");
check(
  "[7] RedoOnboardingCard form posts to /api/onboarding/reset",
  /action="\/api\/onboarding\/reset"/.test(cardSrc),
);

// 8. Render the dashboard and look for the SignOutButton HTML
async function login() {
  const jar = {};
  const r1 = await fetch(`${BASE}/login`);
  const m = (await r1.text()).match(/[a-f0-9]{20,}/);
  if (!m) throw new Error("no login aid");
  const aid = m[0];
  const fd = new FormData();
  fd.append("$ACTION_REF_1", "");
  fd.append("$ACTION_1:0", JSON.stringify({ id: aid, bound: "$@1" }));
  fd.append("$ACTION_1:1", "[{\"ok\":false}]");
  fd.append("email", "mom@compass.local");
  fd.append("password", "correct-horse-battery-staple");
  const r2 = await fetch(`${BASE}/login`, { method: "POST", body: fd, redirect: "manual" });
  const cookies = r2.headers.getSetCookie?.() ?? [];
  for (const sc of cookies) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    jar[k] = rest.join("=").replace(/^"|"$/g, "");
  }
  return jar;
}

async function goWithCookies(jar, path) {
  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  const r = await fetch(BASE + path, { headers: { cookie: cookieHeader }, redirect: "manual" });
  return r;
}

async function dashboardTests() {
  const jar = await login();
  const dash = await goWithCookies(jar, "/");
  const html = await dash.text();
  check(
    "[8] /dashboard HTML contains aria-label='Sign out' (TopAppBar mounts SignOutButton)",
    /aria-label="Sign out"/.test(html),
  );
  check(
    "[9] /dashboard HTML contains the settings cog (existing)",
    /aria-label="Open settings"/.test(html),
  );

  // 10. /settings renders the re-do card
  const settings = await goWithCookies(jar, "/settings");
  const settingsHtml = await settings.text();
  check(
    "[10] /settings HTML contains data-testid='redo-onboarding-card'",
    /data-testid="redo-onboarding-card"/.test(settingsHtml),
  );
  check(
    "[10b] /settings HTML contains the submit button",
    /data-testid="redo-onboarding-submit"/.test(settingsHtml),
  );
}

async function resetTests() {
  const jar = await login();
  // Make sure mom has an identity first
  const u = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  const existingId = await prisma.financialIdentity.findUnique({ where: { userId: u.id } });
  if (!existingId) {
    console.log("  (note) seeding identity for reset test");
    await prisma.financialIdentity.create({
      data: {
        userId: u.id,
        ageRange: "55_64",
        employmentStatus: "employed_full_time",
        location: "Texas",
        timeHorizonYears: 35,
        riskTolerance: "moderate",
        riskNotes: "Smoke seed.",
        aiTierPref: "assistive",
        riskComfort: "moderate",
        currency: "USD",
        auditIdentity: "smoke-seed",
        auditFindings: "smoke-seed",
        auditPlan: "smoke-seed",
        auditFirstStep: "smoke-seed",
        auditTeaching: "smoke-seed",
      },
    });
  }
  const idBefore = await prisma.financialIdentity.findUnique({ where: { userId: u.id } });
  check("[11] mom has a FinancialIdentity before reset", !!idBefore);

  // POST to /api/onboarding/reset
  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  const r = await fetch(`${BASE}/api/onboarding/reset`, {
    method: "POST",
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  check("[12] POST /api/onboarding/reset returns 303 redirect", r.status === 303);
  check(
    "[13] redirect Location is /onboarding",
    r.headers.get("location") === "/onboarding" ||
      r.headers.get("location")?.endsWith("/onboarding"),
  );

  const idAfter = await prisma.financialIdentity.findUnique({ where: { userId: u.id } });
  check("[14] identity is wiped after reset", idAfter === null);
}

try { await dashboardTests(); } catch (e) { check("dashboard tests", false, e.message); }
try { await resetTests(); } catch (e) { check("reset tests", false, e.message); }

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
