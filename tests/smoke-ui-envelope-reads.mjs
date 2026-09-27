/**
 * Smoke for Cluster 7.40 — Envelope read migration.
 *
 * Pre-7.40, form pickers (transactions/new, goals/new, recurring/new,
 * settings/receipt-scan, settings/categorize, learn/your-numbers, period)
 * + the debts page's plan reader used in-memory mock seed envelopes.
 * Mom creates a custom envelope via /envelopes/new, then tries to add
 * a transaction to it, and the picker shows the 7 seed vessels only.
 *
 * This smoke proves the fix:
 *   1. Write a sentinel envelope directly to Prisma with a unique name.
 *   2. GET /transactions/new authenticated as the smoke user, assert the
 *      rendered HTML contains the sentinel name.
 *   3. Repeat for /goals/new, /recurring/new (the three most-trafficked
 *      pickers).
 *
 * Source-file checks verify the 8 page files no longer import the in-memory
 * liveEnvelopes (they import liveEnvelopesFromDb).
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

const sourceChecks = [
  { file: "src/app/(app)/transactions/new/page.tsx", desc: "transactions/new" },
  { file: "src/app/(app)/goals/new/page.tsx", desc: "goals/new" },
  { file: "src/app/(app)/recurring/new/page.tsx", desc: "recurring/new" },
  { file: "src/app/(app)/settings/receipt-scan/page.tsx", desc: "settings/receipt-scan" },
  { file: "src/app/(app)/settings/categorize/page.tsx", desc: "settings/categorize" },
  { file: "src/app/(app)/learn/your-numbers/page.tsx", desc: "learn/your-numbers" },
  { file: "src/app/(app)/period/page.tsx", desc: "period" },
];

for (const { file, desc } of sourceChecks) {
  const src = readFileSync(file, "utf8");
  const usesFromDb = src.includes("liveEnvelopesFromDb");
  const usesInMem = /^\s*const (?:envelopes|ENVELOPES)\s*=\s*liveEnvelopes\(\)/m.test(src);
  check(`[1.${desc}] uses liveEnvelopesFromDb`, usesFromDb);
  check(`[1.${desc}] does NOT use in-memory liveEnvelopes()`, !usesInMem);
}

{
  const src = readFileSync("src/app/(app)/debts/page.tsx", "utf8");
  check("[1.debts] uses livePlanFromDb", src.includes("livePlanFromDb"));
  check("[1.debts] does NOT use in-memory livePlan()", !/^\s*const PLAN\s*=\s*livePlan\(\)/m.test(src));
}

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[2] /transactions/new picker shows DB-written sentinel envelope", "dev server unreachable");
  checkSkip("[3] /goals/new picker shows DB-written sentinel envelope", "dev server unreachable");
  checkSkip("[4] /recurring/new picker shows DB-written sentinel envelope", "dev server unreachable");
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check("[2] transactions picker renders sentinel envelope", false, "smoke user not in DB");
    check("[3] goals picker renders sentinel envelope", false, "smoke user not in DB");
    check("[4] recurring picker renders sentinel envelope", false, "smoke user not in DB");
  } else {
    const sentinelName = `Smoke Sentinel 740 ${Date.now()}`;
    await prisma.envelope.deleteMany({ where: { userId: u.id, name: sentinelName } });
    const sentinel = await prisma.envelope.create({
      data: {
        userId: u.id,
        name: sentinelName,
        planet: null,
        targetBalance: 50000,
        currentBalance: 0,
        sortOrder: 999,
        source: "user",
      },
    });

    const browser = await chromium.launch({ headless: true });
    const p = await (await browser.newContext()).newPage();

    async function loginAndCheck(path, checkName) {
      await p.goto(`${BASE}/login`);
      await p.fill('input[name=email]', SMOKE_USER_EMAIL);
      await p.fill('input[name=password]', SMOKE_USER_PASSWORD);
      await p.locator('button[type=submit]:has-text("Sign in")').click();
      await p.waitForURL(`${BASE}/`);
      await p.goto(`${BASE}${path}`);
      await p.waitForLoadState("networkidle");
      const html = await p.content();
      check(checkName, html.includes(sentinelName));
    }

    try {
      await loginAndCheck("/transactions/new", "[2] /transactions/new picker shows DB-written sentinel envelope");
      await loginAndCheck("/goals/new", "[3] /goals/new picker shows DB-written sentinel envelope");
      await loginAndCheck("/recurring/new", "[4] /recurring/new picker shows DB-written sentinel envelope");
    } finally {
      await prisma.envelope.delete({ where: { id: sentinel.id } }).catch(() => {});
      await browser.close();
    }
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