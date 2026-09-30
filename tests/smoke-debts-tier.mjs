/**
 * Smoke for Cluster 7.46 — Debts visible UI polish (color tier + more detail).
 *
 * xKryptic 2026-09-27 feedback: cards "all blend in together"; wants
 * color so each debt stands out + more specific info that's clearer
 * to understand. This smoke verifies the structural fix:
 *
 *   1. aprTier() helper exists + correctly buckets APRs.
 *   2. DebtCard uses tier color on the right-edge accent + donut +
 *      APR pill + monthly interest hint.
 *   3. DebtCard accepts an `account` prop and shows institution +
 *      last-4 + account-type chip when linked.
 *   4. DebtDetailExpand now has 12 stats cells (was 8) — adds Days
 *      until payment, Total cost to zero, Institution, APR tier.
 *   5. Cell labels rewritten: "Monthly interest cost",
 *      "Months to payoff at min", "Started at", "Progress to zero".
 *   6. /debts/page.tsx reads liveAccountsFromDb + builds the
 *      accountsByDebtId map.
 *
 * Server-needing check (SKIP-NO-SERVER gate per Cluster 7.38):
 * GET /debts as the smoke user, assert no [ERR] and the page renders.
 */

import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
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
  const probe = await fetch(BASE + "/api/health", {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  serverUp = probe.status > 0;
} catch {
  serverUp = false;
}

// ── Source-file checks (always run) ────────────────────────────────

// Block 1 — helper exists + correct
const tierPath = "src/lib/debt-tier.ts";
check("[0] src/lib/debt-tier.ts exists", existsSync(tierPath));
const tierSrc = readFileSync(tierPath, "utf8");
check("[1] aprTier exported from debt-tier", /export function aprTier/.test(tierSrc));
check("[2] aprTierColor exported from debt-tier", /export function aprTierColor/.test(tierSrc));
check("[3] aprTierLabel exported from debt-tier", /export function aprTierLabel/.test(tierSrc));
// Verify thresholds by importing the function (compile-time check)
// We can't import .ts directly under node — use a regex to check
// the threshold logic instead.
check(
  "[4] aprTier thresholds: ≥20% = high, 10-20% = medium, <10% = low, 0 = none",
  /pct\s*>=\s*20/.test(tierSrc) &&
    /pct\s*>=\s*10/.test(tierSrc) &&
    /pct\s*>\s*0/.test(tierSrc) &&
    /return "none"/.test(tierSrc),
);

// Block 2 — DebtCard uses tier color + accepts account prop
const cardPath = "src/components/debts/DebtCard.tsx";
const cardSrc = readFileSync(cardPath, "utf8");
check(
  "[5] DebtCard imports aprTier + aprTierColor from @/lib/debt-tier",
  cardSrc.includes("from \"@/lib/debt-tier\"") ||
    cardSrc.includes("from '@/lib/debt-tier'"),
);
check(
  "[6] DebtCard right-edge accent border uses tier color",
  /borderRight:[\s\S]*?tierColor[\s\S]{0,30}?\}[\s\S]*?,/.test(cardSrc) ||
    /borderRight:[\s\S]{0,200}?tierColor/.test(cardSrc),
);
check(
  "[7] DebtCard shows APR pill with tier color",
  /tierColor[\s\S]*?APR/.test(cardSrc),
);
check(
  "[8] DebtCard shows interest hint with yearly + monthly (7.47+ — yearly primary, monthly secondary)",
  /\/yr interest/.test(cardSrc) &&
    /\/mo\)/.test(cardSrc) &&
    /monthlyInterestCents\(debt\)/.test(cardSrc),
);
check(
  "[9] DebtCard shows institution + last-4 when account linked",
  /institutionLabel/.test(cardSrc) && /accountTypeLabel/.test(cardSrc),
);
check(
  "[10] DebtCard has AccountTypeIcon for visual variety",
  /AccountTypeIcon/.test(cardSrc) && /<svg/.test(cardSrc),
);

// Block 3 — DebtDetailExpand has 12 stats cells with rewritten labels
const detailPath = "src/components/debts/DebtDetailExpand.tsx";
const detailSrc = readFileSync(detailPath, "utf8");
check(
  "[11] DebtDetailExpand imports aprTier + aprTierColor + aprTierLabel",
  detailSrc.includes("from \"@/lib/debt-tier\"") ||
    detailSrc.includes("from '@/lib/debt-tier'"),
);
check(
  "[12] DebtDetailExpand shows 'Days until payment' cell",
  /"Days until payment"/.test(detailSrc) && /daysUntilDue/.test(detailSrc),
);
check(
  "[13] DebtDetailExpand shows 'Total cost to zero' cell",
  /"Total cost to zero"/.test(detailSrc) && /totalCostAtMinCents/.test(detailSrc),
);
check(
  "[14] DebtDetailExpand shows 'Institution' cell",
  /"Institution"/.test(detailSrc) &&
    /account.*?institution|institution.*?account/.test(detailSrc),
);
check(
  "[15] DebtDetailExpand shows 'APR tier' badge",
  /"APR tier"/.test(detailSrc) && /aprTierLabel/.test(detailSrc),
);
check(
  "[16] Cell labels rewritten: 'Monthly interest', 'Months to payoff at min', 'Started at', 'Progress to zero' (7.47 shortened 'Monthly interest cost' → 'Monthly interest')",
  /"Monthly interest"/.test(detailSrc) &&
    !/"Monthly interest cost"/.test(detailSrc) &&
    /"Months to payoff at min"/.test(detailSrc) &&
    /"Started at"/.test(detailSrc) &&
    /"Progress to zero"/.test(detailSrc),
);
check(
  "[17] Tier color applied to Monthly Interest cost cell",
  /accent=\{isUnpayableAtMin\s*\?\s*"neg"\s*:[\s\S]{0,200}?tier === "high"/.test(detailSrc) ||
    // Same StatCell + the label is somewhere nearby
    (detailSrc.includes('"Monthly interest cost"') &&
      detailSrc.includes('tier === "high"') &&
      detailSrc.includes("neg")),
);
check(
  "[18] Tier color applied to APR cell",
  /"APR"[\s\S]{0,200}?tier === "high"/.test(detailSrc) ||
    /tier === "high"[\s\S]{0,200}?"APR"/.test(detailSrc),
);

// Block 4 — /debts/page.tsx reads accounts + builds map
const pagePath = "src/app/(app)/debts/page.tsx";
const pageSrc = readFileSync(pagePath, "utf8");
check(
  "[19] /debts page reads liveAccountsFromDb",
  pageSrc.includes("liveAccountsFromDb"),
);
check(
  "[20] /debts page builds accountsByDebtId map",
  /accountsByDebtId/.test(pageSrc) && /new Map/.test(pageSrc),
);
check(
  "[21] /debts page defensively .catch() on the accounts read",
  /liveAccountsFromDb[\s\S]{0,200}?\.catch/.test(pageSrc),
);
check(
  "[22] /debts page passes accountsByDebtId to <DebtListInteractive>",
  /accountsByDebtId=\{accountsByDebtId\}/.test(pageSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[23] /debts renders with tier-colored cards (no [ERR])", "dev server unreachable");
  checkSkip("[23b] expanding a debt card reveals the detail labels", "dev server unreachable");
  checkSkip("[guard] fixture user is on-boarded (gate open, so /debts renders)", "dev server unreachable");
} else {
  const fx = await createFixture("debts-tier", { scenario: "minimal" });
  {
    // Real pre-condition: /debts only renders because the fixture opened
    // the onboarding gate. Without this the [ERR] assertions below would
    // pass against a gate-redirected page.
    const fxIdentity = await prisma.financialIdentity.findUnique({ where: { userId: fx.userId } });
    check("[guard] fixture user is on-boarded (gate open, so /debts renders)", !!fxIdentity);
    const browser = await chromium.launch({ headless: true });
    const p = await (await browser.newContext()).newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', fx.email);
    await p.fill('input[name=password]', fx.password);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/debts`);
    await p.waitForLoadState("networkidle");
    const html = await p.content();

    // [23] is about the COLLAPSED list. The detail labels below live in
    // DebtDetailExpand, which DebtListInteractive renders only when a card
    // is expanded (`expandedId` starts null; `{isExpanded && <DebtDetailExpand/>}`).
    // Asserting them on a collapsed page was unsatisfiable — measured, not assumed.
    check(
      "[23] /debts renders with tier-colored cards (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("debt-list-interactive") &&
        html.includes("Balance"),
    );

    // [23b] expand a card the way a user would, then assert the detail
    // labels. "Monthly interest" is the current label: bfcaa39 (7.47)
    // deliberately shortened it from "Monthly interest cost", which is
    // what this assertion used to require.
    const firstCard = p.locator('[aria-controls^="debt-detail-"]').first();
    await firstCard.click();
    await p.waitForSelector('[data-testid^="debt-detail-expand-"]', { timeout: 10000 });
    const expandedHtml = await p.content();
    check(
      "[23b] expanding a debt card reveals the detail labels",
      !expandedHtml.includes("[ERR]") &&
        expandedHtml.includes("Monthly interest") &&
        expandedHtml.includes("Total cost to zero") &&
        expandedHtml.includes("APR tier"),
    );

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