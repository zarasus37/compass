/**
 * Smoke for Cluster 7.51 — Debts: Cross-Debt "Where to Put Extra" View.
 *
 * xKryptic 2026-09-28 picks up pending item (5) — bring the
 * cross-debt math from the dashboard's Pay My Next Check card
 * to `/debts`. Renders a `<CrossDebtExtraPanel>` above the
 * existing 7.47 wasted-interest banner with:
 *
 *   - SNOWBALL / AVALANCHE method toggle
 *   - $0–$500/mo extra slider
 *   - Savings vs baseline + debt-free total + payoff order
 *
 * Verification:
 *
 *   1. CrossDebtExtraPanel imports + uses payoffProjection.
 *   2. Renders nothing when there are <2 active debts.
 *   3. Method toggle changes between snowball and avalanche.
 *   4. Slider state updates the savings + total months.
 *   5. Payoff order is sorted by monthsToPayoff ascending.
 *   6. DebtListInteractive renders the panel above the banner.
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

// Block 1 — CrossDebtExtraPanel exists + uses payoffProjection
const panelPath = "src/components/debts/CrossDebtExtraPanel.tsx";
check("[0] src/components/debts/CrossDebtExtraPanel.tsx exists", existsSync(panelPath));
const panelSrc = existsSync(panelPath) ? readFileSync(panelPath, "utf8") : "";
check(
  "[1] CrossDebtExtraPanel imports payoffProjection",
  panelSrc.includes('from "@/lib/payoff-projection"'),
);
check(
  "[2] CrossDebtExtraPanel runs baseline + slider projections (useMemo)",
  /payoffProjection\([\s\S]*?,\s*method,\s*0[\s\S]*?payoffProjection\([\s\S]*?,\s*method,\s*Math\.max/.test(
    panelSrc,
  ),
);
check(
  "[3] CrossDebtExtraPanel saves = baseline - withExtra (interest)",
  /baseline\.totalInterestCents\s*-\s*withExtra\.totalInterestCents/.test(
    panelSrc,
  ),
);
check(
  "[4] CrossDebtExtraPanel has SNOWBALL + AVALANCHE method toggle",
  /"SNOWBALL"/.test(panelSrc) &&
    /"AVALANCHE"/.test(panelSrc) &&
    /useState<Method>/.test(panelSrc),
);
check(
  "[5] CrossDebtExtraPanel slider goes $0-$500 step $5",
  /min=\{0\}[\s\S]{0,200}?max=\{500\}[\s\S]{0,200}?step=\{5\}/.test(panelSrc),
);
check(
  "[6] CrossDebtExtraPanel sorts payoff order by monthsToPayoff ascending",
  /monthsToPayoff[\s\S]{0,200}?sort\([\s\S]{0,200}?monthsToPayoff/.test(panelSrc),
);
check(
  "[7] CrossDebtExtraPanel returns null when activeCount < 2",
  /!hasMultiple return null/.test(panelSrc) ||
    /if \(!hasMultiple\) return null/.test(panelSrc),
);
check(
  "[8] CrossDebtExtraPanel renders payoff order with at least one row",
  /payoffOrder\.map\(/.test(panelSrc) &&
    /row\.debtId/.test(panelSrc) &&
    /row\.debtName/.test(panelSrc) &&
    /row\.startingBalanceCents/.test(panelSrc) &&
    /row\.monthsToPayoff/.test(panelSrc),
);

// Block 2 — DebtListInteractive renders the panel
const listPath = "src/components/debts/DebtListInteractive.tsx";
const listSrc = readFileSync(listPath, "utf8");
check(
  "[9] DebtListInteractive imports CrossDebtExtraPanel",
  listSrc.includes('from "./CrossDebtExtraPanel"'),
);
check(
  "[10] DebtListInteractive renders <CrossDebtExtraPanel debts={debts} anchor={anchor} />",
  /<CrossDebtExtraPanel[\s\S]{0,200}?debts=\{debts\}[\s\S]{0,200}?anchor=\{anchor\}/.test(
    listSrc,
  ),
);
check(
  "[11] CrossDebtExtraPanel is rendered BEFORE the [WARN] banner (7.47)",
  // Both must appear in the file; CrossDebtExtraPanel must come first.
  (() => {
    const idx = listSrc.indexOf("<CrossDebtExtraPanel");
    const bannerIdx = listSrc.indexOf('data-testid="debt-list-banner"');
    return idx >= 0 && bannerIdx > idx;
  })(),
);

// Block 3 — savings + debt-free data-testids for verification
check(
  "[12] Savings cell has data-testid='cross-debt-savings'",
  /data-testid="cross-debt-savings"/.test(panelSrc),
);
check(
  "[13] Total-months cell has data-testid='cross-debt-total-months'",
  /data-testid="cross-debt-total-months"/.test(panelSrc),
);
check(
  "[14] Payoff order has data-testid='cross-debt-payoff-order'",
  /data-testid="cross-debt-payoff-order"/.test(panelSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip(
    "[15] /debts renders cross-debt panel + method toggle + payoff order (no [ERR])",
    "dev server unreachable",
  );
} else {
  const fx = await createFixture("debts-cross-extra", { scenario: "minimal" });
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
      "[15] /debts renders cross-debt panel + method toggle + payoff order (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("debt-list-interactive") &&
        // The cross-debt panel renders (3 seeded debts → active
        // count = 3, so the panel renders)
        html.includes("cross-debt-extra-panel") &&
        html.includes("SNOWBALL") &&
        html.includes("AVALANCHE") &&
        html.includes("Payoff order"),
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