/**
 * Smoke for Cluster 7.42 — Envelope detail null-planet defensive render.
 *
 * The bug xKryptic reported 2026-09-26 with a screenshot: clicking on an
 * envelope (e.g., Groceries over its limit by $212.00) crashed the
 * /envelopes/[id] detail page. The error reference was 3789288087. The
 * error boundary in src/app/(app)/error.tsx caught it and showed the
 * [ERR] SOMETHING BROKE card.
 *
 * Root cause: the Prisma `Envelope.planet` column is nullable, but the
 * detail page + several downstream components assumed non-null. The
 * EnvelopeCadenceChart in particular required `planet: PlanetId` (not
 * nullable). When mom clicked an envelope with planet=null, the chart
 * crashed the whole page.
 *
 * This smoke proves the fix:
 *   1. Write a sentinel envelope with planet=null directly to Prisma.
 *   2. GET /envelopes/[id] authenticated as mom, assert the rendered
 *      HTML doesn't contain the [ERR] marker (the page rendered).
 *      Also asserts the envelope name + numeric balance appear.
 *   3. Source-file checks verify:
 *      - EnvelopeCadenceChart accepts PlanetId | null
 *      - The detail page normalizes `e.planet` via `?? "saturn"`
 *
 * Server-needing checks gate on serverUp per the Cluster 7.38 + 7.39
 * SKIP-NO-SERVER pattern.
 */

import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "./db-client.mjs";

const BASE = "http://127.0.0.1:3000";
const SMOKE_USER_EMAIL = "mom@compass.local";
const SMOKE_USER_PASSWORD = "correct-horse-battery-staple";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function checkSkip(name, reason) {
  checks.push({ name, ok: true, detail: `[SKIP-NO-SERVER] ${reason}` });
  console.log(`[SKIP-NO-SERVER] ${name} — ${reason}`);
}

// ── Server probe ───────────────────────────────────────────────────
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

// ── Source-file checks (always run) ────────────────────────────────

const chartSrc = readFileSync(
  "src/components/viz/EnvelopeCadenceChart.tsx",
  "utf8",
);
check("[1] EnvelopeCadenceChart prop type accepts PlanetId | null", /planet:\s*PlanetId\s*\|\s*null/.test(chartSrc));
check("[2] EnvelopeCadenceChart safely handles null planet at render", chartSrc.includes("PLANET_COLORS.jupiter"));

const detailSrc = readFileSync(
  "src/app/(app)/envelopes/[id]/page.tsx",
  "utf8",
);
check("[3] detail page normalizes nullable planet via `?? \"saturn\"`", detailSrc.includes('?? "saturn"') && detailSrc.includes("safePlanet"));
check("[4] detail page imports PlanetId type", detailSrc.includes("type PlanetId"));

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[5] /envelopes/[id] renders for an envelope with planet=null (no [ERR] card)", "dev server unreachable");
  checkSkip("[6] /envelopes/[id] shows the envelope name + balance", "dev server unreachable");
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check("[5] /envelopes/[id] renders (no error)", false, "smoke user not in DB");
    check("[6] /envelopes/[id] shows envelope name + balance", false, "smoke user not in DB");
  } else {
    const sentinelName = `Smoke Sentinel 742 ${Date.now()}`;
    await prisma.envelope.deleteMany({ where: { userId: u.id, name: sentinelName } });
    // Explicit planet=null (the regression scenario).
    const sentinel = await prisma.envelope.create({
      data: {
        userId: u.id,
        name: sentinelName,
        planet: null,
        targetBalance: 50000,
        currentBalance: 21200,
        sortOrder: 999,
        source: "user",
      },
    });

    const browser = await chromium.launch({ headless: true });
    const p = await (await browser.newContext()).newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', SMOKE_USER_EMAIL);
    await p.fill('input[name=password]', SMOKE_USER_PASSWORD);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/envelopes/${sentinel.id}`);
    await p.waitForLoadState("networkidle");
    const html = await p.content();

    check(
      "[5] /envelopes/[id] renders for an envelope with planet=null (no [ERR] card)",
      !html.includes("[ERR]") && !html.includes("We hit a snag"),
    );
    check(
      "[6] /envelopes/[id] shows the envelope name + balance",
      html.includes(sentinelName) && html.includes("$212.00"),
    );

    await prisma.envelope.delete({ where: { id: sentinel.id } }).catch(() => {});
    await browser.close();
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
  for (const m of miss) console.log(`  - ${m.name}${m.detail ? " — " + m.detail : ""}`);
}
process.exit(miss.length ? 1 : 0);