/**
 * Smoke for Cluster 7.50 — Debts: Mobile Polish.
 *
 * xKryptic 2026-09-28 picks up pending item (8) — mobile polish
 * on `/debts`. The 3-column card layout (donut / name+meta+bar /
 * balance+min+interest) was tuned on desktop. At 320–480px the
 * right column gets squeezed and the small mono numbers become
 * unreadable. Cluster 7.50 collapses the layout at <768px.
 *
 * This smoke verifies the structural fix:
 *
 *   1. New `useMediaQuery` hook exists + SSR-safe.
 *   2. DebtListInteractive uses the hook + passes isMobile down.
 *   3. DebtCard accepts isMobile prop + uses single-column grid
 *      when isMobile is true.
 *   4. DebtDetailExpand accepts isMobile prop + collapses the
 *      4-column stats grid to 1 column when isMobile is true.
 *   5. PayoffCurve SVG uses viewBox + 100% width (no overflow
 *      at narrow viewports).
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

// Block 1 — useMediaQuery hook
const hookPath = "src/lib/use-media-query.ts";
check("[0] src/lib/use-media-query.ts exists", existsSync(hookPath));
const hookSrc = existsSync(hookPath) ? readFileSync(hookPath, "utf8") : "";
check(
  "[1] useMediaQuery hook is SSR-safe (false server snapshot)",
  // The SSR guarantee is unchanged, but it is no longer implemented as
  // `useState<boolean>(false)` plus a `typeof window` guard. The hook was
  // deliberately moved to useSyncExternalStore, whose third argument IS
  // the server snapshot — so "returns false on the server" is now
  // `() => false`, and there is no window check to grep for at all.
  // Asserting the old shape made this check unsatisfiable.
  /useSyncExternalStore/.test(hookSrc) &&
    /return useSyncExternalStore\(\s*subscribe,\s*getSnapshot,\s*\(\)\s*=>\s*false,?\s*\)/.test(
      hookSrc,
    ),
);
check(
  "[2] useMediaQuery uses matchMedia + listens for change events",
  /window\.matchMedia/.test(hookSrc) &&
    /addEventListener\("change"/.test(hookSrc),
);

// Block 2 — DebtListInteractive wires the hook
const listPath = "src/components/debts/DebtListInteractive.tsx";
const listSrc = readFileSync(listPath, "utf8");
check(
  "[3] DebtListInteractive imports useMediaQuery",
  listSrc.includes('from "@/lib/use-media-query"'),
);
check(
  "[4] DebtListInteractive detects <768px breakpoint",
  /useMediaQuery\("\(max-width: 768px\)"\)/.test(listSrc),
);
check(
  "[5] DebtListInteractive passes isMobile to DebtCard",
  /isMobile=\{isMobile\}/.test(listSrc),
);
check(
  "[6] DebtListInteractive passes isMobile to DebtDetailExpand",
  /DebtDetailExpand[\s\S]{0,400}?isMobile=\{isMobile\}/.test(listSrc),
);

// Block 3 — DebtCard responsive layout
const cardPath = "src/components/debts/DebtCard.tsx";
const cardSrc = readFileSync(cardPath, "utf8");
check(
  "[7] DebtCard accepts isMobile prop",
  /isMobile\??:\s*boolean/.test(cardSrc),
);
check(
  "[8] DebtCard uses single-column grid when isMobile",
  /isMobile\s*\?\s*"minmax\(0, 1fr\)"\s*:\s*"120px minmax\(0, 1\.2fr\) 140px"/.test(
    cardSrc,
  ),
);
check(
  "[9] DebtCard has MobileCardTopRow helper for stacked mobile view",
  /function MobileCardTopRow\(/.test(cardSrc),
);
check(
  "[10] DebtCard right column only renders on desktop (not mobile)",
  /!isMobile && \(\s*<div[\s\S]{0,200}?alignItems:\s*"flex-end"/.test(cardSrc),
);
check(
  "[11] DonutProgress accepts mobileSize prop (smaller on mobile)",
  /mobileSize\??:\s*number/.test(cardSrc) &&
    /size = mobileSize \?\? 96/.test(cardSrc),
);

// Block 4 — DebtDetailExpand responsive layout
const detailPath = "src/components/debts/DebtDetailExpand.tsx";
const detailSrc = readFileSync(detailPath, "utf8");
check(
  "[12] DebtDetailExpand accepts isMobile prop",
  /isMobile\??:\s*boolean/.test(detailSrc),
);
check(
  "[13] DebtDetailExpand 12-cell stats grid collapses to 1 col on mobile",
  /isMobile\s*\?\s*"repeat\(1, minmax\(0, 1fr\)\)"\s*:\s*"repeat\(4, 1fr\)"/.test(
    detailSrc,
  ),
);
check(
  "[14] PayoffCurve SVG uses viewBox + 100% width (responsive)",
  /viewBox=\{`0 0 \$\{W\} \$\{H\}`\}/.test(detailSrc) &&
    /maxWidth: 360/.test(detailSrc) &&
    /width:\s*"100%"/.test(detailSrc),
);

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip(
    "[15] /debts at NARROW viewport collapses the desktop right column",
    "dev server unreachable",
  );
  checkSkip(
    "[15b] /debts at WIDE viewport renders the utilization caption + rainbow",
    "dev server unreachable",
  );
  checkSkip(
    "[guard] fixture user is on-boarded (gate open, so /debts renders)",
    "dev server unreachable",
  );
} else {
  const fx = await createFixture("debts-mobile", { scenario: "minimal" });
  {
    // Real pre-condition: /debts only renders because the fixture opened
    // the onboarding gate. Without this the [ERR] assertions below would
    // pass against a gate-redirected page.
    const fxIdentity = await prisma.financialIdentity.findUnique({ where: { userId: fx.userId } });
    check("[guard] fixture user is on-boarded (gate open, so /debts renders)", !!fxIdentity);
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X
    });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', fx.email);
    await p.fill('input[name=password]', fx.password);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/debts`);
    await p.waitForLoadState("networkidle");
    const narrowHtml = await p.content();

    // [15] is named "narrow + wide" but used to capture ONLY the narrow
    // viewport and then assert on the desktop-only right column
    // (DebtCard: `{!isMobile && (...)}` holds the utilization caption).
    // So the caption could never appear at 375px and the check was
    // asserting the wrong layout's content. Measured, not assumed: the
    // caption is inside the `!isMobile` branch, the mobile top row is
    // inside the `isMobile` one.
    check(
      "[15] /debts at NARROW viewport collapses the desktop right column",
      !narrowHtml.includes("[ERR]") &&
        !narrowHtml.includes("We hit a snag") &&
        narrowHtml.includes("debt-list-interactive") &&
        narrowHtml.includes("debt-card-") &&
        // The desktop-only utilization caption must NOT be there at 375px.
        !narrowHtml.includes("% used"),
    );

    // [15b] the same page at desktop width, where that column returns.
    await p.setViewportSize({ width: 1280, height: 800 });
    await p.reload();
    await p.waitForLoadState("networkidle");
    const wideHtml = await p.content();
    check(
      "[15b] /debts at WIDE viewport renders the utilization caption + rainbow",
      !wideHtml.includes("[ERR]") &&
        !wideHtml.includes("We hit a snag") &&
        wideHtml.includes("debt-list-interactive") &&
        wideHtml.includes("% used") &&
        wideHtml.includes("linear-gradient"),
    );

    // ---- Real-value assertions -------------------------------------
    // These read the actual rows out of Postgres and require the page
    // to show those exact figures. The source-regex checks above all
    // passed while the utilization feature rendered for nobody, because
    // they never looked at a value.
    const debtRows = await assertRealDebtValues({
      prisma,
      userId: fx.userId,
      html: wideHtml,
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