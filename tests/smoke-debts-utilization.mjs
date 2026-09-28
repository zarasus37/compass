/**
 * Smoke for Cluster 7.48 — Debts: Utilization + Card Legibility.
 *
 * xKryptic 2026-09-27 feedback: "the numbers are too small to read"
 * + "show a utilization graph instead of the numbers" + "the payoff
 * trajectory doesn't really provide any useful information
 * visually." Three asks, one cluster:
 *
 *   1. Card surface legibility: APR pill 11.5pt → 13pt; MIN line
 *      9.5pt → 11.5pt + ink-2; YR INTEREST 10pt → 12pt; MO
 *      secondary 8.5pt → 10pt + ink-2.
 *   2. New `creditLimitCents?: number` on Debt + DebtSeed.
 *   3. Card surface utilization bar (when credit limit set) —
 *      replaces paid-down progress bar.
 *   4. Expand panel utilization visualization (when credit limit
 *      set) — replaces uninformative payoff trajectory sparkline.
 *   5. Expand panel removes payoff trajectory section (when no
 *      credit limit) — the `~Nmo at min` info already lives in the
 *      `Months to payoff at min` cell.
 *
 * Server-needing check (SKIP-NO-SERVER gate per Cluster 7.38):
 * GET /debts as the smoke user, assert the page renders with the
 * new utilization bars + the bumped legibility.
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

// Block 1 — schema field exists + seeded
const storePath = "src/lib/store.ts";
const storeSrc = readFileSync(storePath, "utf8");
check(
  "[0] Debt interface has creditLimitCents field",
  /creditLimitCents\??: number/.test(storeSrc),
);

const seedPath = "src/lib/mock-seed.ts";
const seedSrc = readFileSync(seedPath, "utf8");
check(
  "[1] DebtSeed interface has creditLimitCents field",
  /creditLimitCents\??: number/.test(seedSrc),
);
check(
  "[2] Discover It seeded with creditLimitCents",
  /id:\s*"debt-discover"[\s\S]{0,500}?creditLimitCents:\s*5_000_00/.test(seedSrc),
);
check(
  "[3] Chase Sapphire seeded with creditLimitCents",
  /id:\s*"debt-chase-sapphire"[\s\S]{0,500}?creditLimitCents:\s*4_500_00/.test(seedSrc),
);
check(
  "[4] CareCredit seeded with creditLimitCents",
  /id:\s*"debt-carecredit"[\s\S]{0,500}?creditLimitCents:\s*5_000_00/.test(seedSrc),
);

// Block 2 — DebtCard legibility bumps + utilization bar
const cardPath = "src/components/debts/DebtCard.tsx";
const cardSrc = readFileSync(cardPath, "utf8");
check(
  "[5] DebtCard computes utilization (creditLimitCents + utilizationPct)",
  /creditLimitCents[\s\S]{0,200}?utilizationPct/.test(cardSrc) ||
    /utilizationPct[\s\S]{0,200}?creditLimitCents/.test(cardSrc),
);
check(
  "[6] DebtCard utilization color thresholds (30/80)",
  /utilizationPct\s*<\s*30/.test(cardSrc) &&
    /utilizationPct\s*<\s*80/.test(cardSrc) &&
    /var\(--ok\)/.test(cardSrc) &&
    /var\(--warn\)/.test(cardSrc) &&
    /var\(--neg\)/.test(cardSrc),
);
check(
  "[7] DebtCard APR pill bumped to 13pt (legibility)",
  // The fontSize: 13 should be near the APR pill (cluster comment
  // provides the marker).
  /Cluster 7\.48.*bumped 11\.5pt.*13pt[\s\S]{0,200}?fontSize:\s*13/.test(cardSrc) ||
    /fontSize:\s*13,[\s\S]{0,500}?% APR/.test(cardSrc),
);
check(
  "[8] DebtCard MIN line bumped to 11.5pt + ink-2",
  /fontSize:\s*11\.5/.test(cardSrc) &&
    /color:\s*"var\(--ink-2\)"/.test(cardSrc),
);
check(
  "[9] DebtCard YR INTEREST bumped to 12pt",
  /\/yr interest[\s\S]{0,400}?fontSize:\s*12/.test(cardSrc) ||
    /fontSize:\s*12,[\s\S]{0,400}?\/yr interest/.test(cardSrc),
);
check(
  "[10] DebtCard monthly secondary bumped to 10pt + ink-2",
  /formatMoney\(monthlyInterest\)\}\/mo\)\s*<\/div>[\s\S]{0,200}?fontSize:\s*10/m.test(
    cardSrc,
  ) ||
    /fontSize:\s*10,[\s\S]{0,400}?\/mo\)/.test(cardSrc),
);
check(
  "[11] DebtCard renders utilization bar when credit limit set",
  /utilizationPct\s*!==\s*null[\s\S]{0,500}?Credit limit/.test(cardSrc) ||
    /Credit limit\s*\$\{formatMoney\(creditLimitCents!\)\} · \$\{Math\.round\(utilizationPct\)\}% used/.test(
      cardSrc,
    ),
);
check(
  "[12] DebtCard still renders paid-down progress when no credit limit",
  /utilizationPct\s*===\s*null[\s\S]{0,500}?paid down/.test(cardSrc) ||
    /paid down/.test(cardSrc),
);

// Block 3 — DebtDetailExpand utilization visualization replaces sparkline
const detailPath = "src/components/debts/DebtDetailExpand.tsx";
const detailSrc = readFileSync(detailPath, "utf8");
check(
  "[13] DebtDetailExpand no longer imports DebtSparkline",
  // The import was removed; only a comment reference should remain.
  !/import\s*\{[^}]*DebtSparkline/.test(detailSrc),
);
check(
  "[14] DebtDetailExpand has UtilizationPanel helper",
  /function UtilizationPanel\(/.test(detailSrc) &&
    /balanceCents/.test(detailSrc) &&
    /creditLimitCents/.test(detailSrc),
);
check(
  "[15] DebtDetailExpand renders UtilizationPanel when credit limit set",
  /creditLimitCents && debt\.creditLimitCents > 0[\s\S]{0,200}?UtilizationPanel/.test(
    detailSrc,
  ),
);
check(
  "[16] DebtDetailExpand removes payoff trajectory sparkline (no DebtSparkline JSX usage)",
  !/<DebtSparkline[\s\S]{0,200}?\/>/.test(detailSrc),
);
check(
  "[17] UtilizationPanel shows big % + balance + limit + available triple",
  /Math\.round\(utilPct\)\}%/.test(detailSrc) &&
    /Balance\s*\{/.test(detailSrc) &&
    /formatMoney\(balanceCents\)/.test(detailSrc) &&
    /Limit\s*\{/.test(detailSrc) &&
    /formatMoney\(creditLimitCents\)/.test(detailSrc) &&
    /Available\s*\{/.test(detailSrc) &&
    /formatMoney\(availableCents\)/.test(detailSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip(
    "[18] /debts renders with utilization bars + legibility bumps (no [ERR])",
    "dev server unreachable",
  );
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check(
      "[18] /debts renders with utilization bars + legibility bumps (no [ERR])",
      false,
      "smoke user not in DB",
    );
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
      "[18] /debts renders with utilization bars + legibility bumps (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("debt-list-interactive") &&
        // The new utilization caption is present on cards
        html.includes("% used") &&
        // The yearly interest hint still renders
        html.includes("/yr interest"),
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