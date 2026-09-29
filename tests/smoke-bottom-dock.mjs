/**
 * Smoke for the Base Navigation Dock (Cluster 3.x Component 5).
 *
 * Verifies the 4-tab bottom nav:
 *   - All 4 tabs render on every signed-in page
 *   - The right tab is active on each of the 4 main pages
 *   - The full-name aria-label is present (so screen readers say
 *     "Dashboard Hub" not "DASHBOARD")
 *   - Sub-pages (e.g. /envelopes) show no active tab
 *
 * Run with: tsx --conditions=react-server tests/smoke-bottom-dock.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

const log = (k, v) => console.log(`[${k}] ${v}`);

const FOUR_TABS = [
  { label: "Dashboard",          fullName: "Dashboard Hub",     glyph: "◉" },
  { label: "Quick Entry",        fullName: "Ledger Input",      glyph: "⊕" },
  { label: "Advanced Analytics", fullName: "Macro Analytics",   glyph: "◍" },
  { label: "Settings",           fullName: "System Blueprint",  glyph: "⚙" },
];

async function main() {
  console.log("--- Base Navigation Dock smoke ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions the seeded baseline, and performs the
  // server-action login. The cookie jar rides on `s`.
  const s = await loginAsFixture("bottom-dock");
  log("fixture", `user=${s.email}`);
  log("login", `status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  // ---------- Page-by-page: which tab is active? ----------
  const PAGES = [
    { path: "/",                   expectedActive: "Dashboard" },
    { path: "/transactions/new",   expectedActive: "Quick Entry" },
    { path: "/insights",           expectedActive: "Advanced Analytics" },
    { path: "/settings",           expectedActive: "Settings" },
    { path: "/envelopes",          expectedActive: null       }, // sub-page, no active tab
  ];

  const results = [];
  for (const p of PAGES) {
    const r = await s.get(p.path);
    const text = await r.text();
    const stripped = text.replace(/<!--\s*-->/g, "");

    // Find the bottom-nav region. The nav has aria-label="Primary
    // navigation dock" and contains the 4 <a class="bottom-nav-tab">.
    const navMatch = text.match(/<nav aria-label="Primary navigation dock"[\s\S]*?<\/nav>/);
    const navHtml = navMatch ? navMatch[0] : "";

    // Count tabs in the nav. The center "Quick Entry" tab carries
    // both `bottom-nav-tab` and `bottom-nav-tab--center` in its class
    // attribute; the regex allows extra class names.
    const tabMatches = [
      ...navHtml.matchAll(/<a [^>]*class="bottom-nav-tab(?:\s+[^"]*)?"/g),
    ];
    const tabCount = tabMatches.length;

    // For each expected tab, check it renders in the nav.
    const tabPresence = {};
    for (const t of FOUR_TABS) {
      const hasLabel = new RegExp(`>${t.label}</`).test(stripped);
      const hasGlyph = navHtml.includes(`>${t.glyph}</span>`) || navHtml.includes(`>${t.glyph}<`);
      const hasFullName = navHtml.includes(`aria-label="${t.fullName}"`);
      tabPresence[t.label] = {
        label: hasLabel,
        glyph: hasGlyph,
        fullName: hasFullName,
      };
    }

    // The active tab has aria-current="page" on its <a>. The aria-label
    // appears first in the rendered HTML, so we read it from any <a>
    // that has both class="bottom-nav-tab*" and aria-current="page".
    // (The center tab also carries the "bottom-nav-tab--center" modifier.)
    const classRe = /class="bottom-nav-tab(?:\s+[^"]*)?"/;
    const activeMatch = navHtml.match(
      new RegExp(
        `<a [^>]*aria-label="([^"]+)"[^>]*aria-current="page"[^>]*${classRe.source}` +
        `|<a [^>]*aria-current="page"[^>]*aria-label="([^"]+)"[^>]*${classRe.source}` +
        `|<a [^>]*aria-label="([^"]+)"[^>]*${classRe.source}[^>]*aria-current="page"`,
      ),
    );
    const activeTab = activeMatch ? (activeMatch[1] || activeMatch[2] || activeMatch[3]) : null;
    // The active tab's label (DASHBOARD / LEDGER / ...) is the one
    // whose fullName is in activeTab.
    const activeLabel = FOUR_TABS.find((t) => t.fullName === activeTab)?.label ?? null;

    // Verify: 4 tabs in the nav, all 4 with the right label + glyph
    // + aria-label, and the right one is active (or none, for /envelopes).
    const expected = p.expectedActive;
    const activeOK = expected === null ? activeLabel === null : activeLabel === expected;
    results.push({ path: p.path, expected, activeLabel, activeOK, tabCount, tabPresence });

    log(p.path, `tab count=${tabCount} active=${activeLabel ?? "(none)"} expected=${expected ?? "(none)"} ${activeOK ? "OK" : "MISS"}`);
  }

  // ---------- Checks ----------
  const checks = [];
  for (const r of results) {
    checks.push([`${r.path}: 4 tabs in dock`, r.tabCount === 4]);
    for (const t of FOUR_TABS) {
      checks.push([`${r.path}: ${t.label} tab label present`, r.tabPresence[t.label].label]);
      checks.push([`${r.path}: ${t.label} tab glyph present`, r.tabPresence[t.label].glyph]);
      checks.push([`${r.path}: ${t.label} aria-label (${t.fullName})`, r.tabPresence[t.label].fullName]);
    }
    checks.push([`${r.path}: active tab matches expected (${r.expected ?? "(none)"})`, r.activeOK]);
  }

  console.log("\n--- per-tab presence on / ---");
  const first = results[0];
  for (const t of FOUR_TABS) {
    const p = first.tabPresence[t.label];
    log(t.label, `label=${p.label} glyph=${p.glyph} aria=${p.fullName}`);
  }

  // Tear down this test's user before reporting. If the test crashed
  // earlier the next fixture's sweep reclaims the user anyway, so a
  // failed run never leaks.
  await s.close();

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
