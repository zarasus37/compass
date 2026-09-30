/**
 * Smoke for Cluster 7.39 — Dashboard DB migration.
 *
 * Pre-7.39, the dashboard at /app/page.tsx read envelopes/goals/plan from
 * in-memory mock seeds. Mom created a real envelope via /envelopes/new, then
 * opened the dashboard, and saw the seed. This smoke proves the fix:
 *
 *   1. Write a sentinel envelope directly to Prisma.
 *   2. GET /authenticated and assert the rendered HTML contains the
 *      sentinel envelope name.
 *   3. Assert the in-memory seed is NOT rendered (the sentinel's planet
 *      string differs from the seed's, so a substring check on the planet
 *      disambiguates).
 *
 * Also covers:
 *   - Source-file checks: page.tsx imports liveEnvelopesFromDb / liveGoalsFromDb /
 *     livePlanFromDb; NOT liveEnvelopes / liveGoals / livePlan.
 *   - Source-file checks: error.tsx + loading.tsx + not-found.tsx exist
 *     in (app)/.
 *
 * Server-needing checks (the GET + DOM check) gate on serverUp per the
 * Cluster 7.38 SKIP-NO-SERVER pattern.
 */

import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "./db-client.mjs";
import { createFixture } from "./fixture.mjs";
import { exitCodeFor, recordSkip } from "./skip-guard.mjs";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function checkSkip(name, reason) {
  recordSkip();
  checks.push({ name, ok: true, detail: `[SKIP-NO-SERVER] ${reason}` });
  console.log(`[SKIP-NO-SERVER] ${name} — ${reason}`);
}

// ── Server probe (Cluster 7.38 pattern) ─────────────────────────────
let serverUp = false;
try {
  const probe = await fetch(BASE + "/login", {
    redirect: "manual",
    signal: AbortSignal.timeout(2000),
  });
  serverUp = probe.status > 0;
} catch {
  serverUp = false;
}

// ── Static / source-file checks (always run) ────────────────────────

check("[1] dashboard reads liveEnvelopesFromDb (was liveEnvelopes)", (() => {
  const src = readFileSync("src/app/page.tsx", "utf8");
  return src.includes("liveEnvelopesFromDb(user.id)") && !src.match(/^\s*const ENVELOPES = liveEnvelopes\(\)/m);
})());

check("[2] dashboard reads liveGoalsFromDb (was liveGoals)", (() => {
  const src = readFileSync("src/app/page.tsx", "utf8");
  return src.includes("liveGoalsFromDb(user.id)") && !src.match(/^\s*const GOALS = liveGoals\(\)/m);
})());

check("[3] dashboard reads livePlanFromDb (was livePlan)", (() => {
  const src = readFileSync("src/app/page.tsx", "utf8");
  return src.includes("livePlanFromDb(user.id)") && !src.match(/^\s*const PLAN = livePlan\(\)/m);
})());

check("[4] (app)/error.tsx exists", existsSync("src/app/(app)/error.tsx"));
// The group-root loading.tsx was deliberately REMOVED in daabae5: a
// loading file at the (app) group root made the whole group one Suspense
// boundary, so Next flushed a 200 shell and no page under (app) could ever
// return 404. The shell moved to components and each nav segment carries
// its own one-line re-export. Assert the current contract, not the file
// that used to be there.
check("[5] loading shell lives in components, not the (app) group root",
  existsSync("src/components/shell/AppLoadingShell.tsx") &&
  !existsSync("src/app/(app)/loading.tsx"));
check("[5b] the 14 primary nav segments re-export the shell", (() => {
  const segs = ["period","calendar","insights","accounts","allocation","obligations",
    "holdings","recurring","settings","debts","transactions","vault","advisor","learn"];
  const missing = segs.filter((s) => !existsSync(`src/app/(app)/${s}/loading.tsx`));
  return missing.length === 0;
})());
check("[6] (app)/not-found.tsx exists", existsSync("src/app/(app)/not-found.tsx"));
check("[6b] root app/not-found.tsx exists (unknown URLs get the calm 404)", existsSync("src/app/not-found.tsx"));

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[7] dashboard renders DB-written envelope name (proves the migration)", "dev server unreachable");
  checkSkip("[8] dashboard renders the DB row's data, not the in-memory seed", "dev server unreachable");
  checkSkip("[9] /not-a-real-route renders the app not-found component", "dev server unreachable");
} else {
  // Per-test fixture user. This used to sign in as the shared
  // mom@compass.local, which made the result depend on chain order:
  // smoke-escape-hatches runs a few entries earlier and wipes mom's
  // FinancialIdentity via POST /api/onboarding/reset, so by the time we
  // get here the shared account is not the account the assertion was
  // written against. The fixture owns its own gate-open user instead.
  const fx = await createFixture("ui-dashboard-db", { scenario: "minimal" });
  const u = { id: fx.userId };

  // Start from ONLY the sentinel, so "the dashboard is reading this
  // user's rows" is a statement with real force. That is also the CI
  // condition: after 8ae8912 the read paths no longer seed, so a real
  // account legitimately has nothing until something creates a row.
  await prisma.envelope.deleteMany({ where: { userId: u.id } });

  const sentinelPlanet = `smoke_${Date.now()}`;
  const sentinelName = `Smoke Sentinel ${Date.now()}`;
  await prisma.envelope.create({
    data: {
      userId: u.id,
      name: sentinelName,
      planet: sentinelPlanet,
      targetBalance: 100000,
      currentBalance: 0,
      sortOrder: 999,
      source: "user",
    },
  });

  const browser = await chromium.launch({ headless: true });
  const p = await (await browser.newContext()).newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', fx.email);
  await p.fill('input[name=password]', fx.password);
  await p.locator('button[type=submit]:has-text("Sign in")').click();
  await p.waitForURL(`${BASE}/`);
  await p.waitForLoadState("networkidle");
  // Strip <script> before matching: the RSC flight payload embeds an
  // escaped second copy of the same text and can match first.
  const html = (await p.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  check("[7] dashboard renders DB-written envelope name (proves the migration)", html.includes(sentinelName));

  // The previous [8] asserted the sentinel's `planet` string appeared on
  // the page. It never does — measured on a clean account, the planet is
  // absent from the raw response AND from the script-stripped markup.
  // The column is a visual glyph source, not a rendered string, so that
  // check could never pass no matter what the product did.
  // What the check was FOR — "the dashboard reads the DB, not the
  // in-memory seed" — is testable: Utilities, Dining and Savings are 0
  // occurrences on a page whose only vessel is the sentinel.
  const seedLeaks = ["Utilities", "Dining", "Savings"].filter((s) => html.includes(s));
  check("[8] dashboard renders the DB row's data, not the in-memory seed",
    seedLeaks.length === 0,
    seedLeaks.length ? `seed vessels leaked: ${seedLeaks.join(", ")}` : "");

  // Check the not-found route renders our component
  await p.goto(`${BASE}/some-route-that-does-not-exist-7-39`);
  await p.waitForLoadState("networkidle");
  const notFoundHtml = (await p.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  check("[9] /not-a-real-route renders the app not-found component",
    notFoundHtml.includes("[404] not found") && notFoundHtml.includes("Back to dashboard"));

  await browser.close();
  await fx.cleanup();
}

// ── Cleanup + summary ───────────────────────────────────────────────
await prisma.$disconnect();

console.log("\n--- checks ---");
const pass = checks.filter((c) => c.ok).length;
const miss = checks.filter((c) => !c.ok);
console.log(`checks: ${pass} pass / ${miss.length} miss (${checks.length} total)`);
if (miss.length) {
  console.log("\nFAILED checks:");
  for (const m of miss) console.log(`  - ${m.name}${m.detail ? " — " + m.detail : ""}`);
}
process.exit(exitCodeFor(miss.length));