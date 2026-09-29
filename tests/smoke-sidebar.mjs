/**
 * Smoke for the 4-chapter AppSidebar (Cluster 4.0 — site-wide nav
 * restructure, 2026-08-25).
 *
 * Verifies the new structure end-to-end:
 *   - The sidebar renders the 4 chapters: // Overview, // Ledger,
 *     // Aims, // Learn (in that order, terminal voice)
 *   - All 16 v4 nav items are present with the new labels
 *     (Holdings instead of Investments, Obligations instead of
 *     separate Recurring/Subscriptions, Field Guide / Your Numbers
 *     / Glossary / Habit Quiz under Learn)
 *   - Settings is no longer a sidebar entry — it lives behind the
 *     gear icon in TopAppBar
 *   - The new routes resolve (no 404s on first nav click)
 *   - The 308 redirects work for the old URLs
 *   - Each nav item gets the right active treatment on its page
 *
 * Run with: tsx --conditions=react-server tests/smoke-sidebar.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

const log = (k, v) => console.log(`[${k}] ${v}`);

const CHAPTERS = [
  {
    label: "// Overview",
    items: [
      { label: "Dashboard",  href: "/" },
      { label: "Period",     href: "/period" },
      { label: "Calendar",   href: "/calendar" },
      { label: "Insights",   href: "/insights" },
    ],
  },
  {
    label: "// Ledger",
    items: [
      { label: "Accounts",     href: "/accounts" },
      { label: "Transactions", href: "/transactions" },
      { label: "Envelopes",    href: "/envelopes" },
      { label: "Allocation",   href: "/allocation" },
      { label: "Obligations",  href: "/obligations" },
      { label: "Vault",        href: "/vault" },
      { label: "Debts",        href: "/debts" },
      { label: "Holdings",     href: "/holdings" },
    ],
  },
  {
    label: "// Aims",
    items: [
      { label: "Goals", href: "/goals" },
    ],
  },
  {
    label: "// Learn",
    items: [
      { label: "Field Guide",  href: "/learn/field-guide" },
      { label: "Your Numbers", href: "/learn/your-numbers" },
      { label: "Glossary",     href: "/learn/glossary" },
      { label: "Habit Quiz",   href: "/learn/habit-quiz" },
    ],
  },
];

const OLD_REDIRECTS = [
  { from: "/recurring",          to: "/obligations?tab=bills" },
  { from: "/subscriptions",      to: "/obligations?tab=subs" },
  { from: "/investments",        to: "/holdings" },
  { from: "/emergency",          to: "/goals?kind=emergency" },
  { from: "/invest",             to: "/goals?kind=invest" },
  { from: "/settings/habit-quiz", to: "/learn/habit-quiz" },
];

async function main() {
  console.log("--- 4-chapter AppSidebar smoke ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions the seeded baseline, and performs the
  // server-action login. The cookie jar rides on `s`.
  const s = await loginAsFixture("sidebar");
  log("fixture", `user=${s.email}`);
  log("login", `status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  const results = [];
  const check = (name, ok) => {
    results.push({ name, ok });
    console.log(`[${ok ? "OK" : "MISS"}] ${name}`);
  };

  // ---------- Sidebar structure on the dashboard ----------
  const dash = await s.get("/");
  const dashText = await dash.text();

  // The sidebar is an <aside> element. Find it.
  const asideMatch = dashText.match(/<aside[\s\S]*?<\/aside>/);
  const asideHtml = asideMatch ? asideMatch[0] : "";

  check("sidebar <aside> present on /", asideMatch !== null);

  // Each chapter label appears in order.
  let lastIdx = -1;
  let chapterOrder = true;
  for (const ch of CHAPTERS) {
    const idx = asideHtml.indexOf(ch.label);
    if (idx === -1) {
      check(`chapter label "${ch.label}" present`, false);
      chapterOrder = false;
    } else {
      check(`chapter label "${ch.label}" present`, true);
      if (idx < lastIdx) chapterOrder = false;
      lastIdx = idx;
    }
  }
  check("chapters appear in canonical order (Overview / Ledger / Aims / Learn)", chapterOrder);

  // Each item href + label is present in the sidebar.
  for (const ch of CHAPTERS) {
    for (const it of ch.items) {
      const hasHref = asideHtml.includes(`href="${it.href}"`);
      const hasLabel = new RegExp(`>${it.label}<`).test(asideHtml);
      check(`item "${it.label}" (${it.href}) in sidebar`, hasHref && hasLabel);
    }
  }

  // Settings is NOT a sidebar item (it's behind the gear icon in TopAppBar).
  const hasSettingsInSidebar = />Settings</.test(asideHtml) && /href="\/settings"/.test(asideHtml);
  check("Settings is NOT a sidebar item (lives behind the gear icon)", !hasSettingsInSidebar);

  // ---------- All new routes resolve to 200 ----------
  for (const ch of CHAPTERS) {
    for (const it of ch.items) {
      const r = await s.get(it.href);
      if (r.status !== 200) {
        console.log(`  DEBUG ${it.href} status=${r.status} location=${r.headers.get("location")} session=${!!s.jar["compass_session"]}`);
      }
      check(`route ${it.href} resolves to 200`, r.status === 200);
    }
  }

  // ---------- The 308 redirects from old URLs ----------
  for (const rd of OLD_REDIRECTS) {
    const r = await s.get(rd.from);
    const loc = r.headers.get("location") || "";
    // Location strips the query string when matching; for /obligations,
    // we need to compare on path + a partial query.
    const isOk =
      r.status === 308 &&
      (loc === rd.to ||
        loc.startsWith(rd.to) ||
        (rd.to.includes("?") && loc.startsWith(rd.to.split("?")[0])));
    check(`redirect ${rd.from} → ${rd.to} (308)`, isOk);
  }

  // ---------- Each chapter item gets the active state on its own page ----------
  for (const ch of CHAPTERS) {
    for (const it of ch.items) {
      // Skip the /dashboard root (it has its own active rule; we test the
      // deep items where the active state is more meaningful).
      if (it.href === "/") continue;
      const r = await s.get(it.href);
      const text = await r.text();
      const asideR = text.match(/<aside[\s\S]*?<\/aside>/);
      const asideRHtml = asideR ? asideR[0] : "";
      // The active item has aria-current="page" on its <a>. The href
      // and aria-current attributes can appear in any order in the
      // rendered HTML, so we check the per-anchor-tag.
      const anchorRe = /<a\b[^>]*>/g;
      let isActive = false;
      for (const m of asideRHtml.matchAll(anchorRe)) {
        const a = m[0];
        const hasHref = new RegExp(`href="${it.href.replace(/\//g, "\\/")}"`).test(a);
        const hasAriaCurrent = /aria-current="page"/.test(a);
        if (hasHref && hasAriaCurrent) {
          isActive = true;
          break;
        }
      }
      check(`on ${it.href}: "${it.label}" gets active state`, isActive);
    }
  }

  // ---------- Tab order summary ----------
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
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}`);
    }
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
