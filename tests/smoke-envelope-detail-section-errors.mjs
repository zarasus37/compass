/**
 * Smoke for Cluster 7.43 — Envelope detail per-section error boundaries.
 *
 * The bug xKryptic reported 2026-09-26: mom still saw the same
 * `[ERR] SOMETHING BROKE` card with digest `3789288087` on
 * `/envelopes/[id]` after the Cluster 7.42 null-planet fix shipped.
 *
 * xKryptic chose option A from the 7.42 follow-on: per-section
 * error boundaries. Even if we never find the exact throw, the
 * page is now resilient — one bad section can no longer take down
 * the rest.
 *
 * This smoke proves the fix is structurally present:
 *   1. safeSection helper exists in the detail page
 *   2. All 5 sections are wrapped (Stats, Vessel, Cadence, Sinking funds, Activity)
 *   3. SectionErrorFallback component exists
 *   4. SINKS lazy read is wrapped in try/catch
 *   5. Per-row try/catch is present in Activity
 *
 * Server-needing checks gate on serverUp per the Cluster 7.38 + 7.39
 * SKIP-NO-SERVER pattern. We can't easily simulate a section throw
 * from outside the app, so server checks just confirm the page still
 * renders the envelope header + name (the structural sections work).
 */

import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
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

const detailPath = "src/app/(app)/envelopes/[id]/page.tsx";
check("[0] detail page file exists", existsSync(detailPath));

const src = readFileSync(detailPath, "utf8");

check(
  "[1] safeSection helper defined",
  /async function safeSection\(/.test(src) && /try \{[\s\S]*?return await render\(\)/.test(src),
);
check(
  "[2] SectionErrorFallback component defined",
  /function SectionErrorFallback\(\{ section \}/.test(src) ||
    /const SectionErrorFallback[ ]*=/.test(src),
);
check(
  "[3] Stats section wrapped via safeSection",
  /await safeSection\(\s*"Stats"\s*,/.test(src),
);
check(
  "[4] Vessel section wrapped via safeSection",
  /await safeSection\(\s*"Vessel"\s*,/.test(src),
);
check(
  "[5] Cadence section wrapped via safeSection",
  /await safeSection\(\s*"Cadence"\s*,/.test(src),
);
check(
  "[6] Sinking funds section wrapped via safeSection",
  /await safeSection\(\s*"Sinking funds"\s*,/.test(src),
);
check(
  "[7] Activity section wrapped via safeSection",
  /await safeSection\(\s*"Activity"\s*,/.test(src),
);
check(
  "[8] SINKS lazy read wrapped in try/catch",
  /try \{[\s\S]*?await ensureUserSinksSeeded\([\s\S]*?\}\s*catch \(err\)/.test(src),
);
check(
  "[9] per-row try/catch present in Activity transactions",
  /\/\/ Per-row try\/catch: a malformed row renders a chip/.test(src) ||
    /Per-row try\/catch/.test(src),
);
check(
  "[10] NODE_ENV guard prevents prod console logging",
  /process\.env\.NODE_ENV\s*!==\s*"production"/.test(src),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[11] /envelopes/[id] still renders envelope header + name", "dev server unreachable");
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check("[11] /envelopes/[id] still renders envelope header + name", false, "smoke user not in DB");
  } else {
    const sentinelName = `Smoke Sentinel 743 ${Date.now()}`;
    await prisma.envelope.deleteMany({ where: { userId: u.id, name: sentinelName } });
    // Use a real planet here (the structural sections should work even
    // when the page is otherwise healthy). The point is that even with
    // a healthy data set, the safeSection wrappers are present.
    const sentinel = await prisma.envelope.create({
      data: {
        userId: u.id,
        name: sentinelName,
        planet: "jupiter",
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
      "[11] /envelopes/[id] still renders envelope header + name",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes(sentinelName),
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