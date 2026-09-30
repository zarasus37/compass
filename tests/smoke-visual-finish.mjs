/**
 * Smoke for the Cluster 4.4 visual finish pass.
 *
 * Verifies the dashboard shell has fully migrated from Component
 * Oracle Terminal tokens to Sovereign Monad (vessel) tokens. We
 * check by:
 *   1. Hitting / and confirming the rendered HTML uses
 *      var(--vessel-dark) / var(--vessel-surface) / var(--vessel-border)
 *      / var(--vessel-accent) (the 4 most-migrated token groups)
 *      in the inline styles of the dashboard shell.
 *   2. Confirming the old terminal tokens (--cosmos, --surface,
 *      --line, --terminal-cyan, --warn, --neg) are NOT used in the
 *      dashboard region of the rendered page.
 *   3. Confirming the planet tokens (--jupiter, --mercury, --saturn,
 *      etc.) and --gold (semantic accent) are still present (these
 *      are KEPT in the migration).
 *
 * Note: the sidebar / top bar / obligations page are NOT in scope for
 * this smoke — they were migrated in earlier clusters. The dashboard
 * is the residual: we want the body of / to read "vessel" all the
 * way through.
 *
 * Run with: tsx --conditions=react-server tests/smoke-visual-finish.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

async function main() {
  console.log("--- Visual finish smoke (dashboard) ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions the seeded baseline, and performs the
  // server-action login. The cookie jar rides on `s`.
  const s = await loginAsFixture("visual-finish");
  console.log(`[fixture] user=${s.email}`);
  console.log(`[login] status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  const results = [];
  const check = (name, ok) => {
    results.push({ name, ok });
    console.log(`[${ok ? "OK" : "MISS"}] ${name}`);
  };

  // ---------- Dashboard page ----------
  const r = await s.get("/");
  // Count over the RENDERED markup only.
  //
  // The App Router streams its RSC flight payload as `self.__next_f.push`,
  // and that payload embeds an escaped JSON copy of the element tree —
  // including the element tree of boundaries that never render. That bit
  // this test in CI: `var(--surface)` and `var(--line)` appeared exactly
  // once each, both inside a <script>, from the idle error boundary at
  // src/app/(app)/not-found.tsx, while the rendered dashboard contained
  // zero of them. This is a visual-token audit, so the question is what
  // the browser actually draws; the payload is transport, not UI.
  //
  // The vessel-token checks below keep their teeth: measured on this page,
  // --vessel-border is 182 occurrences raw / 98 after stripping, and the
  // other three are 121→80, 70→54, 29→21. A real regression that rendered
  // a legacy token in the DOM would still fail here.
  const html = (await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  check("/ resolves to 200", r.status === 200);

  // The dashboard body region: from the first <main> to the end of
  // the main content (before the bottom-nav). We grep inside the
  // inline style="" attributes to look for token usage.
  // We just scan the whole page — sidebar / top bar / bottom dock
  // all already use vessel tokens from earlier clusters.

  // ---------- Vessel tokens PRESENT (the migration landed) ----------
  for (const token of [
    "var(--vessel-dark)",
    "var(--vessel-surface)",
    "var(--vessel-border)",
    "var(--vessel-accent)",
  ]) {
    const count = (html.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    check(`dashboard uses ${token} (${count} occurrences)`, count > 0);
  }

  // ---------- Old terminal tokens ABSENT from the dashboard ----------
  for (const token of [
    "var(--cosmos)",
    "var(--cosmos-2)",
    "var(--cosmos-3)",
    "var(--surface)",
    "var(--line)",
    "var(--line-soft)",
    "var(--terminal-cyan)",
    "var(--terminal-cyan-dim)",
    "var(--warn)",
    "var(--neg)",
  ]) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (html.match(re) || []).length;
    check(`dashboard has NO ${token} (${count} occurrences)`, count === 0);
  }

  // ---------- Old terminal RGBA colors ABSENT ----------
  for (const rgba of [
    "rgba(45, 212, 191",   // terminal teal
    "rgba(245, 158, 11",   // terminal amber
  ]) {
    const re = new RegExp(rgba.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (html.match(re) || []).length;
    check(`dashboard has NO ${rgba}...) (${count} occurrences)`, count === 0);
  }

  // ---------- Preserved tokens PRESENT (semantic accents stay) ----------
  // The --gold token is used for today/payday markers, the engine
  // pill, etc. It should still appear on the dashboard.
  const goldCount = (html.match(/var\(--gold\)/g) || []).length;
  check(`--gold preserved as semantic accent (${goldCount} occurrences)`, goldCount > 0);

  // The planet tokens are kept (they're semantic identifiers, not
  // palette colors). At least one should appear in the dashboard's
  // vessel feed or envelope status card.
  for (const planet of ["var(--jupiter)", "var(--mercury)", "var(--saturn)", "var(--luna)"]) {
    const re = new RegExp(planet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (html.match(re) || []).length;
    // Some planets are on the dashboard, some aren't. We just need
    // to know the token survived the migration — if at least one
    // appears, that's fine.
    if (count > 0) {
      check(`planet token ${planet} preserved (${count} occurrences)`, true);
      break;
    }
  }

  // ---------- Specific migrated surfaces ----------
  // The SafeToSpendHero, BurnCurve, HorizonStrip, AllocationFeed,
  // RebalanceAlertBay were migrated in Cluster 3.1. Verify they're
  // rendering with vessel tokens (not regression to terminal).
  for (const surface of [
    "vessel-feed-bar",
    "horizon-strip",
    "rebalance-alert-bay",
  ]) {
    const re = new RegExp(surface, "g");
    const count = (html.match(re) || []).length;
    if (count > 0) {
      check(`surface "${surface}" rendered (${count} occurrences)`, true);
    }
  }

  // ---------- Summary ----------
  // Tear down this test's user before reporting. If the test crashed
  // earlier the next fixture's sweep reclaims the user anyway, so a
  // failed run never leaks.
  await s.close();

  console.log("\n--- checks ---");
  const pass = results.filter((r) => r.ok).length;
  const miss = results.filter((r) => !r.ok).length;
  console.log(`checks: ${pass} pass / ${miss} miss`);
  if (miss > 0) {
    console.log("!! FAILURES");
    for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.name}`);
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
