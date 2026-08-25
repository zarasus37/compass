/**
 * Smoke for the /goals page goal-type filtering (Cluster 4.2).
 *
 * Verifies:
 *   - /goals resolves to 200 and shows all 4 seeded goals
 *     (Emergency, Investment, Debt Free, Visit Family)
 *   - /goals?kind=emergency shows only the Emergency Fund goal,
 *     with the EMERGENCY badge in the rendered card
 *   - /goals?kind=invest shows only the Investment goal,
 *     with the INVEST badge in the rendered card
 *   - The 3-tab switcher (All / Emergency / Invest) renders with
 *     the right active state and counts
 *   - The 308 redirect from /emergency → /goals?kind=emergency
 *     and /invest → /goals?kind=invest still works
 *   - The trajectory chart header is present (it's the read of
 *     all goals, not the filtered set)
 *
 * Run with: node tests/smoke-goals.mjs
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

// Each goal has a unique description that's only in the goal card
// body (NOT in the trajectory chart legend). Use these to check
// for the goal's actual presence in the filtered list.
const GOAL_SIGNATURES = {
  emergency: "Your safety net. Three months of expenses",
  invest: "The long-horizon money. Compounding does most of the work",
  debt: "One debt at a time. The weight of past spending",
  visit: "A trip to the kids in Austin",
};
// The name appears in the chart legend too, so we use it loosely
// (just to confirm the chart is rendering all goals).
const GOAL_NAMES = ["Emergency Fund", "Investment Goal", "Debt Free", "Visit Family"];

async function main() {
  console.log("--- /goals goal-type filtering smoke ---\n");

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

  // ---------- 308 redirects from old routes ----------
  for (const rd of [
    { from: "/emergency", to: "/goals?kind=emergency" },
    { from: "/invest", to: "/goals?kind=invest" },
  ]) {
    const r = await get(rd.from);
    const loc = r.headers.get("location") || "";
    const ok = r.status === 308 && (loc === rd.to || loc.startsWith(rd.to));
    check(`redirect ${rd.from} → ${rd.to} (308)`, ok);
  }

  // ---------- /goals (no filter) ----------
  const all = await get("/goals");
  const allHtml = await all.text();
  check("/goals resolves to 200", all.status === 200);
  for (const name of GOAL_NAMES) {
    check(`/goals shows goal "${name}" (in list)`, allHtml.includes(name));
  }
  // The 4 goal descriptions are present in the list (chart legend
  // doesn't show descriptions, so this is a strict "in list" check).
  for (const [k, sig] of Object.entries(GOAL_SIGNATURES)) {
    check(`/goals shows ${k} goal's description in list`, allHtml.includes(sig));
  }
  check("/goals shows 'All' tab with aria-current", /aria-current="page"[^>]*href="\/goals"/.test(allHtml) || /href="\/goals"[^>]*aria-current="page"/.test(allHtml));
  check("/goals 'showing 4 of 4' header present", /showing[\s\S]{0,30}4[\s\S]{0,30}of[\s\S]{0,30}4/.test(allHtml));

  // ---------- /goals?kind=emergency ----------
  const em = await get("/goals?kind=emergency");
  const emHtml = await em.text();
  check("/goals?kind=emergency resolves to 200", em.status === 200);
  check("/goals?kind=emergency shows Emergency Fund description in list", emHtml.includes(GOAL_SIGNATURES.emergency));
  check("/goals?kind=emergency HIDES Investment Goal description from list", !emHtml.includes(GOAL_SIGNATURES.invest));
  check("/goals?kind=emergency HIDES Debt Free description from list", !emHtml.includes(GOAL_SIGNATURES.debt));
  check("/goals?kind=emergency HIDES Visit Family description from list", !emHtml.includes(GOAL_SIGNATURES.visit));
  check("/goals?kind=emergency has Emergency tab aria-current", /href="\/goals\?kind=emergency"[^>]*aria-current="page"/.test(emHtml) || /aria-current="page"[^>]*href="\/goals\?kind=emergency"/.test(emHtml));
  check("/goals?kind=emergency 'showing 1 of 4' header present", /showing[\s\S]{0,30}1[\s\S]{0,30}of[\s\S]{0,30}4/.test(emHtml));
  check("/goals?kind=emergency has the safety-net explanation", /safety net/i.test(emHtml));
  check("/goals?kind=emergency page header mentions emergency", /\/\/ aims[\s\S]{0,200}goals[\s\S]{0,100}emergency/i.test(emHtml));

  // ---------- /goals?kind=invest ----------
  const inv = await get("/goals?kind=invest");
  const invHtml = await inv.text();
  check("/goals?kind=invest resolves to 200", inv.status === 200);
  check("/goals?kind=invest shows Investment Goal description in list", invHtml.includes(GOAL_SIGNATURES.invest));
  check("/goals?kind=invest HIDES Emergency Fund description from list", !invHtml.includes(GOAL_SIGNATURES.emergency));
  check("/goals?kind=invest HIDES Debt Free description from list", !invHtml.includes(GOAL_SIGNATURES.debt));
  check("/goals?kind=invest HIDES Visit Family description from list", !invHtml.includes(GOAL_SIGNATURES.visit));
  check("/goals?kind=invest has Invest tab aria-current", /href="\/goals\?kind=invest"[^>]*aria-current="page"/.test(invHtml) || /aria-current="page"[^>]*href="\/goals\?kind=invest"/.test(invHtml));
  check("/goals?kind=invest 'showing 1 of 4' header present", /showing[\s\S]{0,30}1[\s\S]{0,30}of[\s\S]{0,30}4/.test(invHtml));
  check("/goals?kind=invest has the long-horizon explanation", /long-horizon|long.horizon/i.test(invHtml));
  check("/goals?kind=invest page header mentions invest", /\/\/ aims[\s\S]{0,200}goals[\s\S]{0,100}invest/i.test(invHtml));

  // ---------- Empty state for an unfiltered kind ----------
  // (Skipped: every seeded goal has a kind OR a null. The kind=all
  //  filter shows everything, so no empty state there. The kind=
  //  emergency/invest filters both have at least one match in the
  //  seed. Empty state is reachable only if the seed is empty for
  //  a category — not testable here without mutating state.)

  // ---------- Trajectory chart always shows all goals ----------
  // The chart's data is the same regardless of the ?kind= filter.
  // We verify the section header is still present in the filtered view.
  check("/goals?kind=emergency keeps the Trajectory section", emHtml.includes("The Trajectory"));
  check("/goals?kind=invest keeps the Trajectory section", invHtml.includes("The Trajectory"));

  // ---------- Counts on the tab chips ----------
  // The tab count renders as [<!-- -->N<!-- -->] in the SSR output
  // (React inserts the comment between text nodes).
  check("/goals All tab shows [4] count", /\/\/ All[\s\S]{0,120}\[<!--\s*-->\s*4\s*<!--\s*-->\s*\]/.test(allHtml));
  check("/goals Emergency tab shows [1] count", /\/\/ Emergency[\s\S]{0,120}\[<!--\s*-->\s*1\s*<!--\s*-->\s*\]/.test(allHtml));
  check("/goals Invest tab shows [1] count", /\/\/ Invest[\s\S]{0,120}\[<!--\s*-->\s*1\s*<!--\s*-->\s*\]/.test(allHtml));

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
