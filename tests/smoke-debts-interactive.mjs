/**
 * Smoke for Cluster 7.45 — Debts interactive list (snowball hybrid).
 *
 * The user feedback 2026-09-27: the snowball simulator on /debts
 * showed only an aggregated view; mom wanted all debts listed
 * with per-debt breakdowns reachable by click. xKryptic picked
 * inline-expand + per-debt method toggle (no top-level toggle).
 *
 * This smoke proves the structural fix:
 *   1. DebtCard component exists with donut/circle progress.
 *   2. DebtDetailExpand component exists with per-debt simulator.
 *   3. DebtListInteractive is a client component.
 *   4. /debts/page.tsx uses <DebtListInteractive>, not the legacy
 *      <DebtPayoffSimulator>.
 *   5. The legacy DebtPayoffSimulator.tsx is removed (dead code).
 *   6. No top-level snowball/avalanche method toggle at page level.
 *
 * Server-needing check (SKIP-NO-SERVER gate per Cluster 7.38):
 * GET /debts as the smoke user, assert the page renders without
 * [ERR] and the per-debt cards are present.
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

// Block 1 — components exist
const cardPath = "src/components/debts/DebtCard.tsx";
const detailPath = "src/components/debts/DebtDetailExpand.tsx";
const listPath = "src/components/debts/DebtListInteractive.tsx";
const legacyPath = "src/components/debts/DebtPayoffSimulator.tsx";
const pagePath = "src/app/(app)/debts/page.tsx";

check("[0] DebtCard.tsx exists", existsSync(cardPath));
check("[1] DebtDetailExpand.tsx exists", existsSync(detailPath));
check("[2] DebtListInteractive.tsx exists", existsSync(listPath));
check(
  "[3] legacy DebtPayoffSimulator.tsx is removed (dead code)",
  !existsSync(legacyPath),
);

const cardSrc = readFileSync(cardPath, "utf8");
check(
  "[4] DebtCard renders a circular progress / donut chart (SVG)",
  /<svg[\s\S]*?<circle[\s\S]*?<\/svg>/.test(cardSrc),
);
check(
  "[5] DebtCard shows paid-down progress + balance + APR + min",
  /balanceCents/.test(cardSrc) && /aprBps/.test(cardSrc) && /minPaymentCents/.test(cardSrc),
);

const listSrc = readFileSync(listPath, "utf8");
check(
  "[6] DebtListInteractive is a client component",
  /^"use client"/m.test(listSrc),
);
check(
  "[7] DebtListInteractive owns the expansion state (useState)",
  /useState/.test(listSrc) && /expandedId/.test(listSrc),
);

const detailSrc = readFileSync(detailPath, "utf8");
check(
  "[8] DebtDetailExpand owns per-debt What-if slider state",
  /useState/.test(detailSrc) && /extraDollars/.test(detailSrc),
);
check(
  "[9] DebtDetailExpand calls applyExtraToDebt server action",
  /applyExtraToDebt/.test(detailSrc),
);
check(
  "[10] DebtDetailExpand uses existing payoffProjection with [debt]",
  /payoffProjection\(\s*\[debt\]/.test(detailSrc),
);

const pageSrc = readFileSync(pagePath, "utf8");
check(
  "[11] /debts page renders <DebtListInteractive>",
  pageSrc.includes("DebtListInteractive"),
);
check(
  "[12] /debts page does NOT import DebtPayoffSimulator",
  !/import\s+.*DebtPayoffSimulator/.test(pageSrc),
);
check(
  "[13] /debts page no longer uses the in-line debt rows (replaced by DebtCard)",
  !/d\.originalBalanceCents > 0\s*\?\s*Math\.min/.test(pageSrc),
);
// No top-level method toggle at page level — check for actual JSX
// (MethodPill component, setMethod state, or "Avalanche" button label).
// Comment text is allowed (we discuss the design choice in the header).
check(
  "[14] No top-level snowball/avalanche method toggle on /debts",
  !/MethodPill|MethodToggle|useState\(["']method["']|>\s*Avalanche\s*</.test(pageSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[15] /debts renders with per-debt cards (no [ERR])", "dev server unreachable");
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check("[15] /debts renders with per-debt cards (no [ERR])", false, "smoke user not in DB");
  } else {
    const browser = await chromium.launch({ headless: true });
    const p = await (await browser.newContext()).newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', SMOKE_USER_EMAIL);
    await p.fill('input[name=password]', SMOKE_USER_PASSWORD);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/debts`);
    await p.waitForLoadState("networkidle");
    const html = await p.content();

    check(
      "[15] /debts renders with per-debt cards (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("Debts") &&
        html.includes("//") &&
        // The new interactive list renders a data-testid on the container
        html.includes("debt-list-interactive"),
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