/**
 * Smoke for the TopAppBar (Sovereign Monad / vessel design system).
 *
 * Walks: login → fetch a list of pages → assert the bar's three
 * regions are present on each.
 *
 * The bar's elements (vessel redesign):
 *   - Brand: pulsing accent dot + "Sovereign Monad" wordmark
 *   - Cycle: "CYCLE: AUG 15 ↔ AUG 29" chip with a thin progress
 *     rail on the right edge
 *   - Engine: a <form action={toggleEngineAction}> with a
 *     <button aria-label="Current engine: ⚙ L1 RULES ENGINE. Click
 *     to toggle."> pill + a separate <a href="/settings"> cog
 *
 * The aria-label still encodes the engine state so screen readers
 * and the engine-toggle smoke can both detect it. The visual label
 * carries a leading glyph (⚙ L1 / ⚡ L2) for high-contrast reading.
 *
 * Run with: tsx --conditions=react-server tests/smoke-topbar.mjs
 * (dev server must be running on 127.0.0.1:3000)
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

const log = (k, v) => console.log(`[${k}] ${v}`);

// ---------- Pages to verify ----------

const PAGES = [
  { path: "/",              label: "dashboard"    },
  { path: "/envelopes",     label: "envelopes"    },
  { path: "/period",        label: "period"       },
  { path: "/insights",      label: "insights"     },
  { path: "/settings",      label: "settings"     },
  { path: "/transactions",  label: "transactions" },
];

// ---------- Main ----------

async function main() {
  console.log("--- TopAppBar smoke (vessel) ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions the seeded baseline, and performs the
  // server-action login. The cookie jar rides on `s`, so every page
  // read below is authenticated for the whole test.
  const s = await loginAsFixture("topbar");
  log("fixture", `user=${s.email}`);
  log("login", `status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  // Walk every page; for each, check the bar's elements.
  const results = [];
  for (const p of PAGES) {
    const r = await s.get(p.path);
    const html = await r.text();
    // Strip React 19 hydration comments so adjacent <span> children
    // are matched as one continuous chunk.
    const stripped = html.replace(/<!--\s*-->/g, "");

    // === Bar surface ===
    const hasBar = /class="top-app-bar"/.test(html);
    const hasBarAria = /aria-label="Sovereign Monad — top bar"/.test(html);

    // === Brand region ===
    const hasBrandAria = /aria-label="Sovereign Monad — home"/.test(html);
    const hasWordmark = />Sovereign Monad</.test(stripped);
    const hasAccentDot =
      /background:var\(--vessel-accent\)/.test(html) &&
      /border-radius:50%/.test(html);

    // === Cycle region ===
    const hasCycleLabel = />CYCLE:</.test(stripped);
    // The cycle chip shows the date range like "AUG 15 ↔ AUG 29".
    // We look for two MONTH-DAY chunks separated by the ↔ glyph.
    const hasCycleRange = /[A-Z]{3} \d+[\s\S]*?↔[\s\S]*?[A-Z]{3} \d+/.test(stripped);
    // The cycle chip's parent <div> applies `color: var(--vessel-accent)`;
    // the inner date <span> inherits the color rather than redeclaring it.
    // The chip carries the class "top-app-bar-cycle" — anchor the regex on it.
    const hasCycleColor =
      /class="top-app-bar-cycle"[^>]*color:var\(--vessel-accent\)/.test(html);
    // The mini progress rail (60×2 px accent fill) lives inside the chip.
    // The fill width is a decimal percentage (e.g. 21.4285…%), so allow
    // \d+ with an optional fraction.
    const hasCycleProgress =
      /position:absolute;inset:0 auto 0 0;width:\d+(?:\.\d+)?%;background:var\(--vessel-accent\)/.test(html);

    // === Engine region ===
    const hasEngineBtn =
      /aria-label="Current engine: [^"]+Click to toggle\."/.test(html);
    // The visible label is "⚙ L1 RULES ENGINE" or "⚡ L2 AI ENGINE".
    const hasEngineLabel =
      /(⚙|⚡)\s*(L1 RULES ENGINE|L2 AI ENGINE)/.test(stripped);
    // Engine level text (L1 or L2) somewhere in the bar.
    const hasEngineLevel = /L1 RULES ENGINE|L2 AI ENGINE/.test(stripped);
    // Cog links to /settings.
    const hasEngineCog =
      /<a[^>]*aria-label="Open settings"[^>]*href="\/settings"/.test(html);

    // === Form/action (toggled via server-action form) ===
    const hasForm =
      /<form action="" encType="multipart\/form-data" method="POST"/.test(html) ||
      /<form[^>]*method="POST"[^>]*>/.test(html);

    // === Vessel styling markers ===
    const hasVesselBg = /background:var\(--vessel-dark\)/.test(html);
    const hasVesselBorder = /border-bottom:1px solid var\(--vessel-border\)/.test(html);

    results.push({
      label: p.label,
      status: r.status,
      hasBar, hasBarAria,
      hasBrandAria, hasWordmark, hasAccentDot,
      hasCycleLabel, hasCycleRange, hasCycleColor, hasCycleProgress,
      hasEngineBtn, hasEngineLabel, hasEngineLevel, hasEngineCog,
      hasForm,
      hasVesselBg, hasVesselBorder,
    });
    log(
      p.label,
      `bar=${hasBar} brand=${hasBrandAria} cycle=${hasCycleRange} ` +
      `engineBtn=${hasEngineBtn} cog=${hasEngineCog} ` +
      `vessel=${hasVesselBg && hasVesselBorder}`,
    );
  }

  // ---------- Checks ----------

  // Tear down this test's user before reporting. If the test crashed
  // earlier the next fixture's sweep reclaims the user anyway, so a
  // failed run never leaks.
  await s.close();

  const checks = [];
  for (const r of results) {
    checks.push([`${r.label}: 200`, r.status === 200]);
    checks.push([`${r.label}: top-app-bar class present`, r.hasBar]);
    checks.push([`${r.label}: bar aria-label (Sovereign Monad)`, r.hasBarAria]);
    checks.push([`${r.label}: brand link aria-label`, r.hasBrandAria]);
    checks.push([`${r.label}: wordmark "Sovereign Monad" present`, r.hasWordmark]);
    checks.push([`${r.label}: pulsing accent dot present`, r.hasAccentDot]);
    checks.push([`${r.label}: CYCLE: label present`, r.hasCycleLabel]);
    checks.push([`${r.label}: CYCLE range (MONTH DAY ↔ MONTH DAY) present`, r.hasCycleRange]);
    checks.push([`${r.label}: CYCLE date in vessel-accent`, r.hasCycleColor]);
    checks.push([`${r.label}: cycle progress rail present`, r.hasCycleProgress]);
    checks.push([`${r.label}: engine toggle button present`, r.hasEngineBtn]);
    checks.push([`${r.label}: engine toggle label (L1 RULES / L2 AI) present`, r.hasEngineLabel]);
    checks.push([`${r.label}: engine level text present`, r.hasEngineLevel]);
    checks.push([`${r.label}: engine cog links to /settings`, r.hasEngineCog]);
    checks.push([`${r.label}: engine toggle is a <form> (POST)`, r.hasForm]);
    checks.push([`${r.label}: vessel-dark background applied`, r.hasVesselBg]);
    checks.push([`${r.label}: vessel-border applied`, r.hasVesselBorder]);
  }

  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const [name, cond] of checks) {
    const ok = Boolean(cond);
    log(name, ok ? "OK" : "MISS");
    if (ok) pass++; else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss`);

  if (fail > 0) { console.log("\n!! FAILURES"); process.exit(3); }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
