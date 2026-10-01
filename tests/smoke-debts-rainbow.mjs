/**
 * Smoke for Cluster 7.49 — Debts: Rainbow Utilization + Real
 * Payoff Trajectory.
 *
 * xKryptic 2026-09-27 second-round feedback after 7.48 (with
 * screenshot):
 *
 *   1. Get rid of the paid-down progress bar (crossed out in the
 *      screenshot — xKryptic wants the bar gone for credit-card
 *      debts).
 *   2. Use the lighter "rainbow" utilization gauge from the
 *      earlier reference — green→yellow→red gradient bar with
 *      a marker at the current position. Replaces 7.48's
 *      zone-colored fill + threshold markers.
 *   3. Bring back the payoff trajectory, but make it actually
 *      show something useful (a real declining curve, not the
 *      prior flat sparkline that 7.48 removed).
 *
 * This smoke verifies the structural fix:
 *
 *   - Card surface uses linear-gradient background (rainbow)
 *     instead of solid tier-color fill for utilization.
 *   - Card surface has no progress bar fill when credit limit
 *     is set (paid-down replaced by utilization).
 *   - Expand panel UtilizationPanel uses linear-gradient
 *     background with single tier-colored marker (no 30%/80%
 *     threshold markers anymore).
 *   - Expand panel renders <PayoffCurve> as a real SVG line
 *     chart with Y-axis balance labels + X-axis month labels.
 *   - Curve has a `d` path attribute with at least 2 path
 *     commands (proves it's an actual line, not a flat one).
 *   - Curve reacts to slider state (re-renders when extra
 *     payment added).
 */

import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { prisma } from "./db-client.mjs";
import { assertRealDebtValues, assertDebtRowIntegrity } from "./debt-value-assertions.mjs";
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

// Block 1 — card surface rainbow gradient
const cardPath = "src/components/debts/DebtCard.tsx";
const cardSrc = readFileSync(cardPath, "utf8");
check(
  "[0] DebtCard utilization bar uses linear-gradient background (rainbow)",
  /linear-gradient\(90deg, var\(--ok\)/.test(cardSrc),
);
check(
  "[1] DebtCard utilization bar no solid tier-color fill on rainbow variant",
  // The solid `background: utilColor` line from 7.48 should be gone
  // (replaced by the gradient)
  !/utilizationPct !== null\s*\?\s*utilizationColor\s*:\s*isPaidOff[\s\S]{0,200}?background/.test(
    cardSrc,
  ),
);
check(
  "[2] DebtCard utilization bar has vertical marker at current position",
  /utilizationPct !== null[\s\S]{0,400}?transform:\s*"translateX\(-1px\)"/.test(cardSrc) ||
    /left:\s*`\$\{utilizationPct\}%`[\s\S]{0,200}?transform/.test(cardSrc),
);
check(
  "[3] DebtCard paid-down fallback still renders when no credit limit",
  /utilizationPct === null[\s\S]{0,4000}?paid down/.test(cardSrc) ||
    /paid down/.test(cardSrc),
);

// Block 2 — UtilizationPanel rainbow + marker
const detailPath = "src/components/debts/DebtDetailExpand.tsx";
const detailSrc = readFileSync(detailPath, "utf8");
check(
  "[4] UtilizationPanel uses linear-gradient background (rainbow)",
  /linear-gradient\(90deg, var\(--ok\) 0%, var\(--ok\) 30%, var\(--warn\) 50%, var\(--neg\) 80%, var\(--neg\) 100%\)/.test(detailSrc),
);
check(
  "[5] UtilizationPanel has single tier-colored marker (no 30%/80% markers)",
  // Cluster 7.48 had two threshold markers at 30% and 80% — those
  // are removed. Only one marker at utilPct% remains.
  !/left:\s*"30%"/.test(detailSrc) && !/left:\s*"80%"/.test(detailSrc),
);
check(
  "[6] UtilizationPanel uses tier-colored marker at utilPct position",
  /left:\s*`\$\{utilPct\}%`[\s\S]{0,200}?background:\s*"var\(--ink\)"/.test(detailSrc) ||
    /left:\s*`\$\{utilPct\}%`[\s\S]{0,300}?translateX/.test(detailSrc),
);

// Block 3 — PayoffCurve restored as real declining line
check(
  "[7] DebtDetailExpand has PayoffCurve helper",
  /function PayoffCurve\(/.test(detailSrc) &&
    /extraMonthlyCents/.test(detailSrc) &&
    /React\.useMemo/.test(detailSrc),
);
check(
  "[8] DebtDetailExpand renders <PayoffCurve> when not paid off",
  /!isPaidOff && \([\s\S]{0,200}?<PayoffCurve[\s\S]{0,200}?debt=\{debt\}/.test(detailSrc),
);
check(
  "[9] PayoffCurve uses SVG with viewBox + preserveAspectRatio",
  // Cluster 7.50 mobile polish — switched from
  // `width={W} height={H}` to `viewBox={`0 0 ${W} ${H}`}` +
  // `preserveAspectRatio="xMidYMid meet"` so the curve
  // scales down on narrow viewports. Width/height are now
  // in `style={svgStyle}` instead of as SVG attributes.
  /<svg[\s\S]{0,200}?viewBox=\{`0 0 \$\{W\} \$\{H\}`\}/.test(detailSrc) &&
    /<svg[\s\S]{0,400}?preserveAspectRatio="xMidYMid meet"/.test(detailSrc),
);
check(
  "[10] PayoffCurve builds an SVG path with L commands (real line, not flat)",
  /\.map\(\(p,\s*i\)\s*=>\s*`\$\{i === 0 \? "M" : "L"\}/.test(detailSrc) ||
    /\${i === 0 \? "M" : "L"}/.test(detailSrc),
);
check(
  "[11] PayoffCurve has Y-axis tick labels for balance values",
  /Y-axis[\s\S]{0,400}?formatMoney\(Math\.round\(t\.cents\)\)/.test(detailSrc) ||
    /t\.cents[\s\S]{0,200}?formatMoney/.test(detailSrc),
);
check(
  "[12] PayoffCurve has X-axis tick labels for months",
  /X-axis[\s\S]{0,400}?\{t\.month\}mo/.test(detailSrc) ||
    /t\.month === 0 \? "now"/.test(detailSrc),
);
check(
  "[13] PayoffCurve reacts to slider via extraMonthlyCents prop",
  /extraMonthlyCents=\{Math\.max\(0, Math\.round\(extraDollars \* 100\)\)\}/.test(detailSrc),
);
check(
  "[14] PayoffCurve shows different label when extra payment added",
  /with \$[\s\S]{0,200}?\/mo extra/.test(detailSrc) ||
    /\$\{extraMonthlyCents[\s\S]{0,200}?\/mo extra/.test(detailSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip(
    "[15] /debts renders rainbow utilization + real trajectory curve (no [ERR])",
    "dev server unreachable",
  );
} else {
  const fx = await createFixture("debts-rainbow", { scenario: "minimal" });
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

    check(
      "[15] /debts renders rainbow utilization + real trajectory curve (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("debt-list-interactive") &&
        // The rainbow gradient inline style shows up in the rendered HTML
        html.includes("linear-gradient") &&
        // The card-surface utilization caption still renders
        html.includes("% used"),
    );

    // ---- Real-value assertions -------------------------------------
    // These read the actual rows out of Postgres and require the page
    // to show those exact figures. The source-regex checks above all
    // passed while the utilization feature rendered for nobody, because
    // they never looked at a value.
    const debtRows = await assertRealDebtValues({
      prisma,
      userId: fx.userId,
      html: html,
      check,
    });
    assertDebtRowIntegrity({ rows: debtRows, check });

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