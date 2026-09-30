/**
 * Smoke for Cluster 7.34 — escape hatches (sign-out + re-onboard).
 *
 * ⚠️ THIS FILE USED TO BE THE LANDMINE. It signed in as the shared
 * `mom@compass.local` and then called POST /api/onboarding/reset on that
 * account, which wipes its `FinancialIdentity`. Every LATER chain entry
 * that still signed in as mom then sat behind the onboarding gate, so its
 * pages never rendered and its assertions missed on data that was never
 * there. That single test caused FIVE separate walls in a row
 * (smoke-ui-envelope-reads, -envelope-detail-null-planet,
 * -envelope-detail-section-errors, -envelopes-list-defensive-reads and
 * smoke-client-error-capture) — each one had to be diagnosed and migrated
 * separately, because each failed for a reason that had nothing to do
 * with what it was actually testing.
 *
 * It now runs against per-test fixture users, so the destructive reset
 * can only ever touch a throwaway account.
 *
 * Checks:
 *   1-7. Structural (source-regex) checks — unchanged.
 *   8-10b. Live dashboard + /settings render checks, on a fixture user.
 *   11-14. The reset endpoint, on a SEPARATE fixture user, because
 *          check 14 destroys the identity by design.
 */
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "./db-client.mjs";
import { loginAsFixture } from "./fixture.mjs";
import { exitCodeFor, recordSkip } from "./skip-guard.mjs";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}
function checkSkip(name, reason) {
  recordSkip();
  checks.push({ name, ok: true, detail: `[SKIP-NO-SERVER] ${reason}` });
  console.log(`[SKIP-NO-SERVER] ${name} — ${reason}`);
}

// ── Server probe ───────────────────────────────────────────────────
// Probe /api/health, not /login. A dev server compiles /login on demand,
// and a cold first compile comfortably exceeds a 2s budget — which makes
// the test skip a perfectly healthy server (measured: health 200 while
// this probe reported unreachable). /api/health is a trivial always-warm
// route, so it answers "is the server up" without racing the compiler.
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

// 1. Component files exist
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
  /\bRedoOnboardingCard\b[^;]*from\s+["']@\/components\/settings\/RedoOnboardingCard["']/.test(
    settingsSrc,
  ),
);
check(
  "[6] /settings JSX renders <RedoOnboardingCard />",
  /<RedoOnboardingCard \/>/.test(settingsSrc),
);

// 6. Card form posts to the reset endpoint
const cardSrc = readFileSync("src/components/settings/RedoOnboardingCard.tsx", "utf8");
check(
  "[7] RedoOnboardingCard form posts to /api/onboarding/reset",
  /action="\/api\/onboarding\/reset"/.test(cardSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[8] /dashboard HTML contains aria-label='Sign out'", "dev server unreachable");
  checkSkip("[9] /dashboard HTML contains the settings cog", "dev server unreachable");
  checkSkip("[10] /settings renders the re-do card", "dev server unreachable");
  checkSkip("[10b] /settings renders the submit button", "dev server unreachable");
  checkSkip("[11] fixture user has a FinancialIdentity before reset", "dev server unreachable");
  checkSkip("[12] POST /api/onboarding/reset returns 303 redirect", "dev server unreachable");
  checkSkip("[13] redirect Location is /onboarding", "dev server unreachable");
  checkSkip("[14] identity is wiped after reset", "dev server unreachable");
} else {
  // ── Dashboard + settings render ──────────────────────────────────
  // "minimal" is enough: these checks only need the app chrome and the
  // /settings card, not a month of transactions.
  const dash = await loginAsFixture("escape-hatches-dash", { scenario: "minimal" });
  try {
    const dashRes = await dash.get("/");
    const html = await dashRes.text();

    // Guard before the content assertions. A gate redirect to /setup or
    // /login still returns markup, so without this the checks below could
    // pass against a page that never rendered the app at all.
    check(
      "[8a] /dashboard actually rendered (not redirected)",
      dashRes.status === 200,
      `status=${dashRes.status}`,
    );
    check(
      "[8] /dashboard HTML contains aria-label='Sign out' (TopAppBar mounts SignOutButton)",
      dashRes.status === 200 && /aria-label="Sign out"/.test(html),
    );
    check(
      "[9] /dashboard HTML contains the settings cog (existing)",
      dashRes.status === 200 && /aria-label="Open settings"/.test(html),
    );

    // /settings renders the re-do card
    const settingsRes = await dash.get("/settings");
    const settingsHtml = await settingsRes.text();
    check(
      "[10a] /settings actually rendered (not redirected)",
      settingsRes.status === 200,
      `status=${settingsRes.status}`,
    );
    check(
      "[10] /settings HTML contains data-testid='redo-onboarding-card'",
      settingsRes.status === 200 && /data-testid="redo-onboarding-card"/.test(settingsHtml),
    );
    check(
      "[10b] /settings HTML contains the submit button",
      settingsRes.status === 200 && /data-testid="redo-onboarding-submit"/.test(settingsHtml),
    );
  } finally {
    await dash.close();
  }

  // ── The reset endpoint ───────────────────────────────────────────
  // A SEPARATE fixture user, because check [14] wipes the identity by
  // design. Sharing one user with the block above would leave a gated
  // account behind and reintroduce exactly the bug this file caused.
  const reset = await loginAsFixture("escape-hatches-reset", { scenario: "minimal" });
  try {
    // The fixture provisions a FinancialIdentity with completedAt set, so
    // this is a real assertion about the fixture as well as the product.
    const idBefore = await prisma.financialIdentity.findUnique({
      where: { userId: reset.userId },
    });
    check("[11] fixture user has a FinancialIdentity before reset", !!idBefore);

    // The route takes no body params (it derives userId from the session
    // cookie, deliberately, to prevent CSRF), so an empty form POST is
    // exactly what the <form action=...> on /settings sends.
    const r = await reset.post("/api/onboarding/reset", {});
    check("[12] POST /api/onboarding/reset returns 303 redirect", r.status === 303);
    check(
      "[13] redirect Location is /onboarding",
      r.headers.get("location") === "/onboarding" ||
        r.headers.get("location")?.endsWith("/onboarding"),
    );

    const idAfter = await prisma.financialIdentity.findUnique({
      where: { userId: reset.userId },
    });
    check("[14] identity is wiped after reset", idAfter === null);
  } finally {
    await reset.close();
  }
}

// ── Summary ────────────────────────────────────────────────────────
await prisma.$disconnect();

console.log("\n--- checks ---");
const pass = checks.filter((c) => c.ok).length;
const miss = checks.filter((c) => !c.ok);
console.log(`checks: ${pass} pass / ${miss.length} miss (${checks.length} total)`);
if (miss.length) {
  console.log("\nFAILED checks:");
  for (const c of miss) console.log(`  - ${c.name}${c.detail ? "  — " + c.detail : ""}`);
}
process.exit(exitCodeFor(miss.length));
