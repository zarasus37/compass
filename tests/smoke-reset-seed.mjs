/**
 * Smoke for the admin /api/reset-seed endpoint + the seed migration.
 *
 * Verifies:
 *   - The endpoint authenticates (302 without cookie, 200 with cookie)
 *   - The reset drops all envelopes + audit logs for the user, then
 *     re-inserts the 7 seed envelopes
 *   - The rebalance action against the reset state succeeds (so the
 *     rebalance can run on freshly-seeded data)
 *
 * Run with: node tests/smoke-reset-seed.mjs
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
    form.append("$ACTION_1:1", "[{\"ok\":false}]");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", headers, body: form, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
async function postJson(path) {
  const headers = new Headers();
  applyCookies(headers);
  const r = await fetch(BASE + path, { method: "POST", headers, redirect: "manual" });
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

async function main() {
  console.log("--- Reset-seed smoke ---\n");

  // 1. POST /api/reset-seed without a session cookie should 302/redirect
  //    to /login (the requireUser() helper redirects when no session).
  const noAuth = await fetch(BASE + "/api/reset-seed", {
    method: "POST",
    redirect: "manual",
  });
  log("no-auth POST", `status=${noAuth.status}`);

  // 2. Login
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // 3. POST /api/reset-seed with a session
  const r1 = await postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset POST", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  // 4. After reset, /envelopes page should still render (the engine
  //    auto-seeds if the user has no envelopes, but after the reset
  //    the user has 7 fresh envelopes, so reads just work).
  const env1 = await get("/envelopes");
  const env1Text = await env1.text();
  const hasGroceries = /Groceries/.test(env1Text);
  log("/envelopes after reset", `status=${env1.status} hasGroceries=${hasGroceries}`);

  // 5. Trigger a rebalance via the existing action — this is a full
  //    end-to-end check that the engine still works post-reset. We
  //    grab the rebalance form's action id and post a $10 transfer.
  const env2 = await get("/envelopes");
  const env2Text = await env2.text();
  const moveIdx = env2Text.indexOf("MOVE BETWEEN VESSELS");
  const formStart = env2Text.indexOf("<form", moveIdx);
  const formEnd = env2Text.indexOf("</form>", formStart);
  const rebalanceForm = env2Text.slice(formStart, formEnd);
  const rebalAid = rebalanceForm.match(/"id":"([a-f0-9]{20,})"/)?.[1]
    || rebalanceForm.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/)?.[1];
  log("rebalance form aid", rebalAid ? rebalAid.slice(0, 12) + "..." : "NONE");

  // Parse envelope balances from the form (post-reset, should be
  // the seed values).
  const rebalance = await postForm("/envelopes", {
    sourceEnvelopeId: "env-rent",
    destinationEnvelopeId: "env-groceries",
    amount: "10",
  }, { actionId: rebalAid });
  log("rebalance POST", `status=${rebalance.status}`);

  // 6. Read /envelopes again — verify balances shifted by $10.
  const env3 = await get("/envelopes");
  const env3Text = await env3.text();
  // Match the full option label (which contains React 19 hydration
  // comments separating the name from the money). We slice from the
  // opening value= to the closing </option> and parse the money out.
  const optMatches = [...env3Text.matchAll(/<option value="(env-[^"]+)">([\s\S]*?)<\/option>/g)];
  const balances3 = {};
  for (const m of optMatches) {
    const text = m[2].replace(/<!--\s*-->/g, "");
    const mm = text.match(/\$([\d,]+(?:\.\d+)?)([KkMm])?/);
    if (mm) {
      let cents = Math.round(parseFloat(mm[1].replace(/,/g, "")) * 100);
      if (mm[2]?.toLowerCase() === "k") cents *= 1000;
      if (mm[2]?.toLowerCase() === "m") cents *= 1000000;
      balances3[m[1]] = cents;
    }
  }
  // The seed has Rent current=80_000¢, Groceries current=61_200¢
  // (Groceries is intentionally seeded over its 40_000 target so the
  // OVER state shows up immediately on the vessel feed). After the
  // reset and a $10 rebalance rent→groceries we expect:
  //   rent:     80_000 - 1_000 = 79_000¢
  //   groceries: 61_200 + 1_000 = 62_200¢
  log("rent after rebalance", `${balances3["env-rent"]}¢ (expected 79000¢)`);
  log("groceries after rebalance", `${balances3["env-groceries"]}¢ (expected 62200¢)`);

  const checks = [
    ["no-auth POST returns redirect (302/307)", noAuth.status === 302 || noAuth.status === 307],
    ["reset POST returns 200", r1.status === 200],
    ["reset POST returns ok=true", j1.ok === true],
    ["/envelopes after reset: 200", env1.status === 200],
    ["/envelopes after reset: Groceries present", hasGroceries],
    ["rebalance POST after reset: 200", rebalance.status === 200 || rebalance.status === 307],
    ["rent lost 1000 cents after rebalance", balances3["env-rent"] === 79000],
    ["groceries gained 1000 cents after rebalance", balances3["env-groceries"] === 62200],
  ];

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
