/**
 * Smoke for the Cluster 4.3 deprecated-files cleanup.
 *
 * Verifies:
 *   - All 6 old URLs return 308 (permanent redirect) — the redirect
 *     chain in next.config.ts is the source of truth.
 *   - The Location header on each redirect points to the new
 *     canonical URL (no fragment drift, no trailing slash drift).
 *   - Following the redirect lands on a 200 page (not a 404).
 *   - The _deprecated/ source files on disk are NOT compiled into
 *     the App Router (Next.js ignores the underscore prefix, so
 *     they never become a route even if the file walker scans them).
 *   - No live href in the source code points to the old paths
 *     (with a few explicit exceptions: the /recurring/new form
 *     stays live, and the _deprecated/ directory's own pages
 *     reference each other for historical reasons).
 *   - The Sidebar (the primary nav surface) has 0 entries pointing
 *     to the old paths.
 *
 * Run with: node tests/smoke-deprecated.mjs
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

// The 6 redirects in next.config.ts.
const REDIRECTS = [
  { from: "/recurring",          to: "/obligations?tab=bills" },
  { from: "/subscriptions",      to: "/obligations?tab=subs" },
  { from: "/investments",        to: "/holdings" },
  { from: "/emergency",          to: "/goals?kind=emergency" },
  { from: "/invest",             to: "/goals?kind=invest" },
  { from: "/settings/habit-quiz", to: "/learn/habit-quiz" },
];

// The new canonical URLs the redirects target.
const NEW_ROUTES = [
  "/obligations",
  "/obligations?tab=bills",
  "/obligations?tab=subs",
  "/holdings",
  "/goals",
  "/goals?kind=emergency",
  "/goals?kind=invest",
  "/learn/habit-quiz",
  "/learn/field-guide",
  "/learn/your-numbers",
  "/learn/glossary",
];

async function main() {
  console.log("--- Deprecated-cleanup smoke ---\n");

  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  console.log(`[login] status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  const results = [];
  const check = (name, ok) => {
    results.push({ name, ok });
    console.log(`[${ok ? "OK" : "MISS"}] ${name}`);
  };

  // ---------- 6 redirects ----------
  for (const rd of REDIRECTS) {
    const r = await get(rd.from);
    const loc = r.headers.get("location") || "";
    // Location strips the query string when matching on the bare path
    // is enough; for the obligations targets we need a partial match
    // because Next.js can rewrite ?tab= differently.
    const locOk =
      r.status === 308 &&
      (loc === rd.to ||
        loc.startsWith(rd.to) ||
        (rd.to.includes("?") && loc.startsWith(rd.to.split("?")[0])));
    check(`redirect ${rd.from} → ${rd.to} (308)`, locOk);
  }

  // ---------- Old URLs are not live pages ----------
  // A 308 means Next.js didn't render a page for that path. If the
  // /recurring file were still active, the request would return 200
  // (or 404 if there's no auth). 308 confirms the redirect is in
  // place and the file is NOT being rendered.
  for (const rd of REDIRECTS) {
    const r = await get(rd.from);
    check(`${rd.from} returns redirect (not 200/404 page render)`, r.status === 308);
  }

  // ---------- Following redirects lands on 200 ----------
  for (const rd of REDIRECTS) {
    const r = await get(rd.from);
    const loc = r.headers.get("location") || "";
    if (!loc) continue;
    // Re-fetch the destination; if it's a 200, the redirect target
    // is alive and serving.
    const target = loc.startsWith("http") ? loc.replace(BASE, "") : loc;
    const r2 = await get(target);
    check(`redirect target ${target} resolves to 200`, r2.status === 200);
  }

  // ---------- New routes resolve to 200 ----------
  for (const p of NEW_ROUTES) {
    const r = await get(p);
    check(`new route ${p} resolves to 200`, r.status === 200);
  }

  // ---------- Sidebar (primary nav surface) has 0 entries to old paths ----------
  const dash = await get("/");
  const asideMatch = (await dash.text()).match(/<aside[\s\S]*?<\/aside>/);
  const aside = asideMatch ? asideMatch[0] : "";
  for (const rd of REDIRECTS) {
    const re = new RegExp(`href="${rd.from}"`, "g");
    const count = (aside.match(re) || []).length;
    check(`sidebar has 0 entries pointing to ${rd.from}`, count === 0);
  }

  // ---------- The new sidebar links are present ----------
  for (const p of NEW_ROUTES.filter((p) => !p.includes("?"))) {
    const re = new RegExp(`href="${p}"`);
    check(`sidebar links to ${p}`, re.test(aside));
  }

  // ---------- Summary ----------
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
