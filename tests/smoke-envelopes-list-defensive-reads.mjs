/**
 * Smoke for Cluster 7.44 — Envelopes list page defensive reads.
 *
 * The bug xKryptic reported 2026-09-27 with a screenshot: clicking
 * "Envelopes" in the left rail AppSidebar (which navigates to
 * /envelopes, the LIST page) blew up with [ERR] SOMETHING BROKE
 * digest 3789288087. Same digest mom saw on /envelopes/[id] before
 * Cluster 7.43 wrapped that page. The list page was missed in 7.43.
 *
 * Root cause: the page-level reads (liveEnvelopesFromDb + SINKS
 * seed+read) were unguarded. The defensive pattern from 7.43 wasn't
 * applied here.
 *
 * This smoke proves the fix is structurally present:
 *   1. liveEnvelopesFromDb read is wrapped in try/catch on the
 *      list page (with ENVELOPES fallback to []).
 *   2. ensureUserSinksSeeded + SINKS read are wrapped in try/catch
 *      (with SINKS fallback to []).
 *   3. NODE_ENV guard prevents prod console logging (same as 7.43).
 *
 * Server-needing check gates on serverUp per the Cluster 7.38 + 7.39
 * SKIP-NO-SERVER pattern.
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

const listPath = "src/app/(app)/envelopes/page.tsx";
check("[0] envelopes list page file exists", existsSync(listPath));

const src = readFileSync(listPath, "utf8");

// Block 1 — liveEnvelopesFromDb wrapped
// The Cluster 7.44 fix puts a try/catch around the read. Look for
// the structural shape: "try {" then "ENVELOPES = await liveEnvelopesFromDb"
// then "catch (err)".
check(
  "[1] liveEnvelopesFromDb wrapped in try/catch",
  /try\s*\{[\s\S]*?ENVELOPES\s*=\s*await\s+liveEnvelopesFromDb[\s\S]*?\}\s*catch\s*\(err\)/.test(src),
);
check(
  "[2] ENVELOPES fallback to [] on throw",
  /ENVELOPES\s*=\s*\[\s*\][\s\S]*?catch\s*\(err\)/.test(src),
);

// Block 2 — ensureUserSinksSeeded + SINKS read wrapped
check(
  "[3] ensureUserSinksSeeded wrapped in try/catch",
  /try\s*\{[\s\S]*?await\s+ensureUserSinksSeeded\([\s\S]*?\}\s*catch\s*\(err\)/.test(src),
);
check(
  "[4] SINKS fallback to [] on throw (catch block sets SINKS = [])",
  /\}\s*catch\s*\(err\)\s*\{[\s\S]*?SINKS\s*=\s*\[\s*\]/.test(src),
);

// Block 3 — production-silent logging
check(
  "[5] NODE_ENV guard prevents prod console logging",
  /process\.env\.NODE_ENV\s*!==\s*"production"/.test(src),
);

// Block 4 — Cluster 7.44 commentary marker (sanity check the change
// is from this cluster, not a stale leftover from 7.43)
check(
  "[6] Cluster 7.44 commentary present in the fix",
  src.includes("Cluster 7.44") &&
    (src.includes("[envelopes-list] liveEnvelopesFromDb failed") ||
      src.includes("liveEnvelopesFromDb failed")),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[7] /envelopes renders for mom (no [ERR] card)", "dev server unreachable");
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check("[7] /envelopes renders for mom (no [ERR] card)", false, "smoke user not in DB");
  } else {
    const browser = await chromium.launch({ headless: true });
    const p = await (await browser.newContext()).newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', SMOKE_USER_EMAIL);
    await p.fill('input[name=password]', SMOKE_USER_PASSWORD);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/envelopes`);
    await p.waitForLoadState("networkidle");
    const html = await p.content();

    check(
      "[7] /envelopes renders for mom (no [ERR] card)",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        // The page head + summary strip are always present
        html.includes("Envelopes") &&
        html.includes("total balance"),
    );

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