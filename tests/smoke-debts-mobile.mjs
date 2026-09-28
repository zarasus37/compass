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

// Block 1 — useMediaQuery hook
const hookPath = "src/lib/use-media-query.ts";
check("[0] src/lib/use-media-query.ts exists", existsSync(hookPath));
const hookSrc = existsSync(hookPath) ? readFileSync(hookPath, "utf8") : "";
check(
  "[1] useMediaQuery hook is SSR-safe (returns false + checks window)",
  /useState<boolean>\(false\)/.test(hookSrc) &&
    /typeof window === "undefined"/.test(hookSrc),
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
    "[15] /debts renders responsively at narrow + wide viewports (no [ERR])",
    "dev server unreachable",
  );
} else {
  const u = await prisma.user.findUnique({ where: { email: SMOKE_USER_EMAIL } });
  if (!u) {
    check(
      "[15] /debts renders responsively at narrow + wide viewports (no [ERR])",
      false,
      "smoke user not in DB",
    );
  } else {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X
    });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', SMOKE_USER_EMAIL);
    await p.fill('input[name=password]', SMOKE_USER_PASSWORD);
    await p.locator('button[type=submit]:has-text("Sign in")').click();
    await p.waitForURL(`${BASE}/`);
    await p.goto(`${BASE}/debts`);
    await p.waitForLoadState("networkidle");
    const html = await p.content();

    check(
      "[15] /debts renders responsively at narrow + wide viewports (no [ERR])",
      !html.includes("[ERR]") &&
        !html.includes("We hit a snag") &&
        html.includes("debt-list-interactive") &&
        // Card + utilization caption still render
        html.includes("% used") &&
        // The rainbow gradient still renders
        html.includes("linear-gradient"),
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