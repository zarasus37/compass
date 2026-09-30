/**
 * Smoke for Cluster 7.41 — Onboarding chat escape hatches.
 *
 * The bug xKryptic reported 2026-09-26 with a screenshot: the chat
 * agent at /onboarding got stuck repeating the cadence question after
 * mom already answered "twice a month" + "two times a month". The chat
 * had no good escape to the canonical form wizard at /setup.
 *
 * This smoke proves:
 *   1. The /onboarding top bar renders a "Use form wizard" link with
 *      href="/setup" (the escape hatch mom needs).
 *   2. The /setup top bar does NOT render the wizard link (would be
 *      confusing on the canonical surface).
 *   3. The new STUCK_NUDGE copy mentions the form wizard (the
 *      fallback CTA mentions both paths now).
 *   4. Server-needing: GET /onboarding while signed in as mom,
 *      assert the rendered HTML contains the wizard link.
 *
 * Server-needing checks gate on serverUp per the Cluster 7.38 + 7.39
 * SKIP-NO-SERVER pattern.
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

// ── Server probe ───────────────────────────────────────────────────
// /api/health, not /login — a dev server compiles /login on demand and a
// cold first compile outruns a 2s budget, reporting a healthy server as
// unreachable.
let serverUp = false;
try {
  const probe = await fetch(BASE + "/api/health", {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  serverUp = probe.status > 0;
} catch {
  serverUp = false;
}

// ── Source-file checks (always run) ────────────────────────────────

const topBarSrc = readFileSync(
  "src/components/onboarding/OnboardingTopBar.tsx",
  "utf8",
);
check("[1] OnboardingTopBar renders 'Use form wizard' link", topBarSrc.includes("Use form wizard") && topBarSrc.includes('href="/setup"'));
check("[2] OnboardingTopBar supports hideWizardLink prop", topBarSrc.includes("hideWizardLink"));

const setupLayoutSrc = readFileSync("src/app/setup/layout.tsx", "utf8");
check("[3] /setup layout passes hideWizardLink (suppresses the button on the canonical surface)", setupLayoutSrc.includes("hideWizardLink"));

const stuckDetectorSrc = readFileSync(
  "src/lib/onboarding/stuck-detector.ts",
  "utf8",
);
check("[4] STUCK_NUDGE copy mentions the form wizard", stuckDetectorSrc.includes("Use the form setup wizard"));
check("[5] STUCK_NUDGE copy also mentions demo data (preserved escape)", stuckDetectorSrc.includes("Load demo data"));

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[6] /onboarding renders the wizard escape link to /setup", "dev server unreachable");
  checkSkip("[6a] /onboarding actually rendered (not redirected by a gate)", "dev server unreachable");
  checkSkip("[7] /setup does NOT render the wizard escape link", "dev server unreachable");
  checkSkip("[7a] /setup/pay-schedule actually rendered (not redirected)", "dev server unreachable");
} else {
  // Per-test fixture user. This used to sign in as the shared
  // mom@compass.local, which smoke-escape-hatches (chain entry 34)
  // destroys via POST /api/onboarding/reset. "minimal" is enough: these
  // checks only need the two top bars, not a month of transactions.
  const fx = await createFixture("onboarding-chat-escape", { scenario: "minimal" });

  const browser = await chromium.launch({ headless: true });
  const p = await (await browser.newContext()).newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', fx.email);
  await p.fill('input[name=password]', fx.password);
  await p.locator('button[type=submit]:has-text("Sign in")').click();
  await p.waitForURL(`${BASE}/`);

  await p.goto(`${BASE}/onboarding`);
  await p.waitForLoadState("networkidle");
  const onboardingHtml = await p.content();
  // Guard before the positive assertion: a gate redirect to /setup is
  // exactly the page that lacks the escape link, so an un-guarded
  // assertion would blame the wrong component.
  const onOnboarding = p.url().endsWith("/onboarding");
  check(
    "[6a] /onboarding actually rendered (not redirected by a gate)",
    onOnboarding,
    `url=${p.url()}`,
  );
  check(
    "[6] /onboarding renders the wizard escape link to /setup",
    onOnboarding &&
      onboardingHtml.includes('aria-label="Use the form setup wizard instead"') &&
      onboardingHtml.includes('href="/setup"'),
  );

  // [7] is about the /setup SURFACE, but /setup is only reachable by a
  // user who has not finished setup: pay-schedule/page.tsx does
  // `if (await isSetupActivated(user.id)) redirect("/")`, and
  // isSetupActivated is `SetupState.activatedAt != null`. The fixture
  // always activates, so a fixture user is bounced straight back to the
  // dashboard — which is why this check used to be vacuous: it was
  // asserting "no escape link" against a page that was never /setup.
  //
  // Clearing activatedAt puts this user mid-setup, which is the only
  // state in which the assertion has a real subject. (The gate is an OR
  // over FinancialIdentity.completedAt, which stays set, so /onboarding
  // stays reachable above.)
  await prisma.setupState.updateMany({
    where: { userId: fx.userId },
    data: { activatedAt: null },
  });

  await p.goto(`${BASE}/setup/pay-schedule`);
  await p.waitForLoadState("networkidle");
  const setupHtml = await p.content();
  // [7] is a NEGATIVE assertion, so it is the one most able to pass for
  // the wrong reason: any redirect away from /setup also lacks the link.
  // The guard is what makes the negative result mean something.
  const onSetup = p.url().includes("/setup/");
  check(
    "[7a] /setup/pay-schedule actually rendered (not redirected)",
    onSetup,
    `url=${p.url()}`,
  );
  check(
    "[7] /setup does NOT render the wizard escape link",
    onSetup && !setupHtml.includes('aria-label="Use the form setup wizard instead"'),
  );

  await browser.close();
  await fx.cleanup();
}

// ── Summary ────────────────────────────────────────────────────────
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