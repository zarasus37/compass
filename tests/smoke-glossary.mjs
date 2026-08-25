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
 * Run with: node tests/smoke-glossary.mjs
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

  // ---------- Page resolves ----------
  const r = await get("/learn/glossary");
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
