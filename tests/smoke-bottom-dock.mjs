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
 * Run with: node tests/smoke-bottom-dock.mjs
 */

const BASE = "http://127.0.0.1:3000";

const jar = {};
function applyCookies(headers) {
  const cookies = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookies) headers.set("cookie", cookies);
}
function captureSetCookies(headers) {
  const list = headers.getSetCookie?.() ?? [];
  for (const sc of list) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    if (!k) continue;
    const v = rest.join("=").replace(/^"|"$/g, "");
    if (v === "" || /Expires=.*1970/i.test(sc)) delete jar[k];
    else jar[k] = v;
  }
}
async function get(path) {
  const headers = new Headers();
  applyCookies(headers);
  const r = await fetch(BASE + path, { headers, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
async function postForm(path, fields, { actionId } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (actionId) {
    form.append("$ACTION_REF_1", "");
    form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
    form.append("$ACTION_1:1", "[\"$undefined\"]");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", headers, body: form, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  return null;
}
const log = (k, v) => console.log(`[${k}] ${v}`);

const FOUR_TABS = [
  { label: "Dashboard",          fullName: "Dashboard Hub",     glyph: "◉" },
  { label: "Quick Entry",        fullName: "Ledger Input",      glyph: "⊕" },
  { label: "Advanced Analytics", fullName: "Macro Analytics",   glyph: "◍" },
  { label: "Settings",           fullName: "System Blueprint",  glyph: "⚙" },
];

async function main() {
  console.log("--- Base Navigation Dock smoke ---\n");

  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

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
    const r = await get(p.path);
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
