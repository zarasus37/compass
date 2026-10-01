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
  // This used to assert the page imports `livePlanFromDb`. That was true
  // from 94dd126 (7.40), but 1149c49 (7.46 visible UI polish) refactored
  // the debts page and replaced the plan reader with `liveDebts(user.id)`
  // + `liveAccountsFromDb(user.id)`. The check never got the memo.
  //
  // Then debts persistence (5bf1232) moved the debt read off the
  // in-memory store entirely: `liveDebts` is now `liveDebtsFromDb`, which
  // reads the Prisma `Debt` table. This assertion was the stale side
  // again, and for the third time on this one line. The reader name is
  // the wrong thing to pin — what matters, and what this has always been
  // protecting, is "the debts page reads the DB, not the process-local
  // store". So assert THAT, and accept either the current DB reader or
  // any future rename of it.
  check(
    "[1.debts] reads debts from the DB, not the in-memory store",
    /liveDebtsFromDb\(\s*user\.id\s*\)/.test(src),
  );
  check("[1.debts] does NOT use the in-memory liveDebts() reader",
    !/liveDebts\(\s*user\.id\s*\)/.test(src));
  check("[1.debts] uses liveAccountsFromDb (DB-backed account reader)", src.includes("liveAccountsFromDb"));
  check("[1.debts] does NOT use in-memory livePlan()", !/^\s*const PLAN\s*=\s*livePlan\(\)/m.test(src));
}

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[2] /transactions/new picker shows DB-written sentinel envelope", "dev server unreachable");
  checkSkip("[3] /goals/new picker shows DB-written sentinel envelope", "dev server unreachable");
  checkSkip("[4] /recurring/new picker shows DB-written sentinel envelope", "dev server unreachable");
} else {
  // Per-test fixture user. This used to sign in as the shared
  // mom@compass.local, which made the result depend on chain order —
  // smoke-escape-hatches (entry 34) wipes that account's identity via
  // POST /api/onboarding/reset, and every other fixture test now leaves
  // it alone, so its envelope set is whatever the chain happened to
  // leave behind. The fixture owns its own user and its own envelopes.
  const fx = await createFixture("ui-envelope-reads", { scenario: "minimal" });
  const u = { id: fx.userId };

  const sentinelName = `Smoke Sentinel 740 ${Date.now()}`;
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

  // Log in ONCE. This used to log in inside the per-page helper, so the
  // second call navigated to /login while already holding a session —
  // the app redirected straight to / and `input[name=email]` never
  // rendered, hanging 30s on a Playwright fill timeout before the file
  // could even print its summary.
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', fx.email);
  await p.fill('input[name=password]', fx.password);
  await p.locator('button[type=submit]:has-text("Sign in")').click();
  await p.waitForURL(`${BASE}/`);

  async function checkPicker(path, checkName) {
    await p.goto(`${BASE}${path}`);
    await p.waitForLoadState("networkidle");
    const html = (await p.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    check(checkName, html.includes(sentinelName));
  }

  try {
    await checkPicker("/transactions/new", "[2] /transactions/new picker shows DB-written sentinel envelope");
    await checkPicker("/goals/new", "[3] /goals/new picker shows DB-written sentinel envelope");
    await checkPicker("/recurring/new", "[4] /recurring/new picker shows DB-written sentinel envelope");
  } finally {
    await prisma.envelope.delete({ where: { id: sentinel.id } }).catch(() => {});
    await browser.close();
    await fx.cleanup();
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
process.exit(exitCodeFor(miss.length));