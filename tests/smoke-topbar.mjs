/**
 * Smoke for the TopAppBar — verify it renders on every signed-in page.
 *
 * Walks: login → fetch a list of pages (dashboard, envelopes, period,
 * insights, settings, transactions) → assert the bar's three elements
 * are present on each.
 *
 * Run with: node tests/smoke-topbar.mjs
 *
 * The bar's elements:
 *   - Brand link (☉ + COMPASS + version chip)
 *   - Pay period window (left bracket + date range + right bracket)
 *   - Day-of-period count (DAY n / total)
 *   - Mini progress bar (in the sub-row)
 *   - Engine toggle (● L1 | RULES ENGINE ⚙ → /settings)
 *
 * The bracket characters and "DAY" text are split by React 19
 * hydration comments in the SSR output, so the checks look for
 * adjacent <span>s and the date text in the cyan-colored span.
 * The bracket-styled span is matched on its exact color/style
 * signature so a future color change is caught.
 *
 * Requires the dev server to be running on 127.0.0.1:3000.
 */

const BASE = "http://127.0.0.1:3000";

// ---------- Cookie jar ----------

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
  console.log("--- TopAppBar smoke ---\n");

  // Login
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // Walk every page; for each, check the bar's elements.
  const results = [];
  for (const p of PAGES) {
    const r = await get(p.path);
    const html = await r.text();
    const hasBar             = /class="top-app-bar"/.test(html);
    const hasCompass         = /aria-label="Compass — home"/.test(html);
    const hasPeriodBracketL  = /<span aria-hidden="true" style="color:var\(--ink-4\);font-size:14px;line-height:1">\[<\/span>/.test(html);
    const hasPeriodBracketR  = /<span aria-hidden="true" style="color:var\(--ink-4\);font-size:14px;line-height:1">\]<\/span>/.test(html);
    const hasPeriodDate      = /color:var\(--terminal-cyan\)">[A-Z]{3} \d+/.test(html);
    const hasEngine          = /RULES ENGINE/.test(html);
    // React 19 hydration comments ("<!-- -->") sit between the literal
    // "DAY" and the digit, so the regex has to span those markers.
    // We strip them first, then look for the canonical "DAY <n>".
    const stripped = html.replace(/<!--\s*-->/g, "");
    const hasDayCount        = /DAY \d+/.test(stripped);
    const hasProgressBar     = /class="top-app-bar-sub"/.test(html);
    const hasEngineLink      = /aria-label="Open settings — current engine: RULES ENGINE"/.test(html);
    results.push({ label: p.label, status: r.status, hasBar, hasCompass, hasPeriodBracketL, hasPeriodBracketR, hasPeriodDate, hasEngine, hasDayCount, hasProgressBar, hasEngineLink });
    log(p.label, `status=${r.status} bar=${hasBar} brand=${hasCompass} period=${hasPeriodBracketL && hasPeriodBracketR && hasPeriodDate} engine=${hasEngine} day=${hasDayCount} progress=${hasProgressBar}`);
  }

  // ---------- Checks ----------

  const checks = [];
  for (const r of results) {
    checks.push([`${r.label}: 200`, r.status === 200]);
    checks.push([`${r.label}: top-app-bar class present`, r.hasBar]);
    checks.push([`${r.label}: brand link present`, r.hasCompass]);
    checks.push([`${r.label}: pay period left bracket`, r.hasPeriodBracketL]);
    checks.push([`${r.label}: pay period right bracket`, r.hasPeriodBracketR]);
    checks.push([`${r.label}: pay period date in cyan`, r.hasPeriodDate]);
    checks.push([`${r.label}: engine toggle label present`, r.hasEngine]);
    checks.push([`${r.label}: day-of-period count present`, r.hasDayCount]);
    checks.push([`${r.label}: mini progress bar present`, r.hasProgressBar]);
    checks.push([`${r.label}: engine toggle links to /settings`, r.hasEngineLink]);
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
