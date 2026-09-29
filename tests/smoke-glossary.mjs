/**
 * Smoke for the // Learn · Glossary page (Cluster 4.1).
 *
 * Verifies:
 *   - /learn/glossary resolves to 200
 *   - All 12 term anchors (id="period", "safe-to-spend", etc.) are
 *     in the rendered HTML — catches any regression where a term
 *     is silently removed
 *   - The page has the chapter sections (// overview, // ledger, // aims)
 *   - The page does NOT have the COMING SOON stub (Cluster 4.0
 *     artifact) or the "planned terms" callout (Cluster 4.0 stub)
 *   - Each term has a "where it shows up" deep link, so the glossary
 *     is also a navigator
 *
 * Run with: tsx --conditions=react-server tests/smoke-glossary.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

const TERM_IDS = [
  // overview (4)
  "period",
  "safe-to-spend",
  "paycheck-simulator",
  "trajectory",
  // ledger (7)
  "envelope",
  "vessel",
  "allocation",
  "allocation-plan",
  "auto-allocate",
  "overflow",
  "age-of-money",
  // aims (1)
  "goal",
];

const CHAPTERS = [
  { id: "overview", title: "The current state" },
  { id: "ledger", title: "The mechanics" },
  { id: "aims", title: "The targets" },
];

const SEE_ALSO_DEEP_LINKS = [
  "/period",
  "/",
  "/envelopes",
  "/allocation",
  "/goals",
  "/insights",
  "/learn/your-numbers",
  "/learn/field-guide",
];

async function main() {
  console.log("--- Glossary smoke ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions the seeded baseline, and performs the
  // server-action login. The cookie jar rides on `s`.
  const s = await loginAsFixture("glossary");
  console.log(`[fixture] user=${s.email}`);
  console.log(`[login] status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  const results = [];
  const check = (name, ok) => {
    results.push({ name, ok });
    console.log(`[${ok ? "OK" : "MISS"}] ${name}`);
  };

  // ---------- Page resolves ----------
  const r = await s.get("/learn/glossary");
  check("/learn/glossary resolves to 200", r.status === 200);

  const html = await r.text();

  // ---------- 12 term anchors ----------
  for (const id of TERM_IDS) {
    const re = new RegExp(`id="${id}"`);
    check(`term anchor id="${id}" present`, re.test(html));
  }

  // ---------- Chapter sections ----------
  for (const ch of CHAPTERS) {
    const re = new RegExp(`id="${ch.id}"`);
    check(`chapter section id="${ch.id}" present`, re.test(html));
    check(`chapter title "${ch.title}" present`, html.includes(ch.title));
  }

  // ---------- Stub artifacts removed ----------
  check("COMING SOON stub is gone (Cluster 4.0 artifact)", !/COMING SOON/.test(html));
  check("'planned terms' callout is gone (Cluster 4.0 stub)", !/planned terms/i.test(html));

  // ---------- "Where it shows up" deep links ----------
  for (const href of SEE_ALSO_DEEP_LINKS) {
    const re = new RegExp(`href="${href.replace(/\//g, "\\/")}"`);
    check(`see-also deep link "${href}" present`, re.test(html));
  }

  // ---------- Search box present ----------
  check("search input present (filter by term)", /placeholder="[^"]*Filter terms/i.test(html));

  // ---------- Headline strip ----------
  // The StatCell renders "//" in a separate span, then the label
  // ("terms") as a text node. Just check for the value "12" near
  // the label "terms".
  const headlineOk = /\/[\s\S]{0,80}terms[\s\S]{0,200}>12</.test(html);
  check("headline strip '12 terms' present", headlineOk);

  // ---------- Colophon ----------
  check("colophon 'glossary · colophon' present", /glossary\s*·\s*colophon/i.test(html));

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
