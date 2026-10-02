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
 * Run with: tsx --conditions=react-server tests/smoke-reset-seed.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * shared `mom@compass.local`, so this test can neither be poisoned by
 * nor poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 *
 * KNOWN HAZARD (deliberately not fixed here — see the report):
 * /api/reset-seed calls resetUserEnvelopesToSeed (src/lib/store.ts),
 * which deleteMany's ALL of the caller's envelopes and re-inserts the
 * 7 seed envelopes under GLOBAL fixed primary keys ("env-rent", …).
 * The same route's ensureUser*Seeded calls insert "acct-chase",
 * "bill-rent", "goal-emergency", "plan-default" under global pkeys, so
 * if any other user already holds those keys the route's transaction
 * dies on a pkey violation and returns 500. The call is kept verbatim
 * because removing it would change what this test verifies.
 */

import { loginAsFixture } from "./fixture.mjs";
import { seededId } from "../src/lib/seed-ids.ts";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
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

  // 2. Per-test fixture user, logged in through the real action ──
  const s = await loginAsFixture("reset-seed");
  log("fixture", `user=${s.email}`);

  // 3. POST /api/reset-seed with a session
  const r1 = await s.postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset POST", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  // 4. After reset, /envelopes page should still render (the engine
  //    auto-seeds if the user has no envelopes, but after the reset
  //    the user has 7 fresh envelopes, so reads just work).
  const env1 = await s.get("/envelopes");
  const env1Text = await env1.text();
  const hasGroceries = /Groceries/.test(env1Text);
  log("/envelopes after reset", `status=${env1.status} hasGroceries=${hasGroceries}`);

  // 5. Trigger a rebalance via the existing action — this is a full
  //    end-to-end check that the engine still works post-reset. We
  //    grab the rebalance form's action id and post a $10 transfer.
  const env2 = await s.get("/envelopes");
  const env2Text = await env2.text();
  const moveIdx = env2Text.indexOf("MOVE BETWEEN VESSELS");
  const formStart = env2Text.indexOf("<form", moveIdx);
  const formEnd = env2Text.indexOf("</form>", formStart);
  const rebalanceForm = env2Text.slice(formStart, formEnd);
  const rebalAid = rebalanceForm.match(/"id":"([a-f0-9]{20,})"/)?.[1]
    || rebalanceForm.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/)?.[1];
  log("rebalance form aid", rebalAid ? rebalAid.slice(0, 12) + "..." : "NONE");

  // The rebalance POST keeps its own bound-useActionState wire format
  // and rides on the fixture's cookie jar by delegating to s.get.
  const postForm = async (path, fields, { actionId } = {}) => {
    const form = new FormData();
    if (actionId) {
      form.append("$ACTION_REF_1", "");
      form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
      form.append("$ACTION_1:1", "[{\"ok\":false}]");
    }
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return s.get(path, { method: "POST", body: form });
  };

  // Envelope ids are namespaced per user by the product
  // (src/lib/seed-ids.ts), and /api/reset-seed now re-seeds the CALLER's
  // own namespaced rows. Derive the ids the same way the app does.
  const RENT = seededId(s.userId, 'env-rent');
  const GROCERIES = seededId(s.userId, 'env-groceries');
  const rebalance = await postForm("/envelopes", {
    sourceEnvelopeId: RENT,
    destinationEnvelopeId: GROCERIES,
    amount: "10",
  }, { actionId: rebalAid });
  log("rebalance POST", `status=${rebalance.status}`);

  // 6. Read /envelopes again — verify balances shifted by $10.
  const env3 = await s.get("/envelopes");
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
  // reset and a $10 rebalance rentâ†’groceries we expect:
  //   rent:     80_000 - 1_000 = 79_000¢
  //   groceries: 61_200 + 1_000 = 62_200¢
  log("rent after rebalance", `${balances3[RENT]}¢ (expected 79000¢)`);
  log("groceries after rebalance", `${balances3[GROCERIES]}¢ (expected 62200¢)`);

  const checks = [
    ["no-auth POST returns redirect (302/307)", noAuth.status === 302 || noAuth.status === 307],
    ["reset POST returns 200", r1.status === 200],
    ["reset POST returns ok=true", j1.ok === true],
    ["/envelopes after reset: 200", env1.status === 200],
    ["/envelopes after reset: Groceries present", hasGroceries],
    ["rebalance POST after reset: 200", rebalance.status === 200 || rebalance.status === 307],
    ["rent lost 1000 cents after rebalance", balances3[RENT] === 79000],
    ["groceries gained 1000 cents after rebalance", balances3[GROCERIES] === 62200],
  ];

  // Tear down this test's fixture user before the summary.
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

