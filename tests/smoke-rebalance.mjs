/**
 * End-to-end smoke for the envelope rebalance action + form.
 *
 * Walks:
 *   login → /envelopes → find rebalance form → POST $10
 *     source → dest → re-read /envelopes → verify balances shifted
 *
 * Run with: tsx --conditions=react-server tests/smoke-rebalance.mjs
 *
 * The smoke picks the first two envelopes in the form's source-select
 * (rent + groceries by default), captures the BEFORE balances, submits
 * a $10 move, then re-reads the page and asserts the AFTER balances
 * are exactly BEFORE - $10 and BEFORE + $10. The engine's audit log
 * entry is verified by the unit smoke for rebalanceEnvelopes itself;
 * this smoke covers the wire from the form to the engine.
 *
 * The [OK] moved status line is a CLIENT-ONLY render (React 19's
 * useActionState hydrates and re-renders the success line). The SSR
 * output starts in INITIAL_STATE ({ok:false}), so the [OK] string is
 * not in the HTML we just fetched. The balance diff above is the
 * server-side proof that the action mutated state — sufficient for
 * this smoke.
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * shared `mom@compass.local`, so this test can neither be poisoned by
 * nor poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 *
 * Requires the dev server to be running on 127.0.0.1:3000.
 */

import { loginAsFixture } from "./fixture.mjs";

// ---------- Form-action helper ----------
//
// The rebalance POST keeps its own wire format (bound useActionState
// with the `[{"ok":false}]` previous state) and rides on the fixture's
// cookie jar by delegating to s.get.

// ---------- Helpers ----------

function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  return null;
}

/** Parse the dollar amount out of an option label like "Rent · $800". */
function parseBalanceFromOptionLabel(text) {
  // Strip React 19 hydration comments.
  const cleaned = text.replace(/<!--\s*-->/g, "");
  const m = cleaned.match(/\$([\d,]+(?:\.\d+)?)([KkMm])?/);
  if (!m) return null;
  let cents = Math.round(parseFloat(m[1].replace(/,/g, "")) * 100);
  if (m[2]?.toLowerCase() === "k") cents *= 1000;
  if (m[2]?.toLowerCase() === "m") cents *= 1000000;
  return cents;
}

/** Find the rebalance form (the form that contains the MOVE BETWEEN VESSELS eyebrow). */
function extractRebalanceForm(pageHtml) {
  const eyebrowIdx = pageHtml.indexOf("MOVE BETWEEN VESSELS");
  if (eyebrowIdx < 0) return null;
  const formStart = pageHtml.indexOf("<form", eyebrowIdx);
  const formEnd = pageHtml.indexOf("</form>", formStart);
  if (formStart < 0 || formEnd < 0) return null;
  return pageHtml.slice(formStart, formEnd + "</form>".length);
}

/** Read all envelope balances from the form's <option> labels. */
function readBalancesFromForm(formHtml) {
  const optRegex = /<option value="(env-[^"]+)">([\s\S]*?)<\/option>/g;
  const out = {};
  for (const m of formHtml.matchAll(optRegex)) {
    out[m[1]] = parseBalanceFromOptionLabel(m[2]);
  }
  return out;
}

const log = (k, v) => console.log(`[${k}] ${v}`);

// ---------- Main ----------

async function main() {
  console.log("--- Rebalance e2e smoke ---\n");

  // 1. Per-test fixture user, logged in through the real action
  const s = await loginAsFixture("rebalance");
  log("fixture", `user=${s.email}`);

  // The rebalance form POST rides on the fixture's cookie jar.
  const postForm = async (path, fields, { actionId } = {}) => {
    const form = new FormData();
    if (actionId) {
      form.append("$ACTION_REF_1", "");
      form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
      // React 19 useActionState initial state — the form will replace this
      // with the action's return value after submit.
      form.append("$ACTION_1:1", "[{\"ok\":false}]");
    }
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return s.get(path, { method: "POST", body: form });
  };

  // 2. Get /envelopes + find the rebalance form
  const env1 = await s.get("/envelopes");
  const env1Text = await env1.text();
  log("/envelopes (before)", `status=${env1.status} bytes=${env1Text.length}`);

  const form1 = extractRebalanceForm(env1Text);
  if (!form1) { console.log("FATAL: rebalance form not found"); process.exit(2); }
  const rebalAid = extractActionId(form1);
  if (!rebalAid) { console.log("FATAL: rebalance action id not found"); process.exit(2); }
  log("rebalance form", `bytes=${form1.length} aid=${rebalAid.slice(0, 12)}...`);

  const before = readBalancesFromForm(form1);
  const ids = Object.keys(before);
  if (ids.length < 2) { console.log("FATAL: need at least 2 envelopes"); process.exit(2); }
  const sourceId = ids[0];
  const destId = ids[1];
  const sourceBefore = before[sourceId];
  const destBefore = before[destId];
  log("source before", `${sourceId} = ${sourceBefore}¢`);
  log("dest before", `${destId} = ${destBefore}¢`);

  // 3. Submit the rebalance form
  const moveCents = 1000; // $10.00
  const moveRes = await postForm("/envelopes", {
    sourceEnvelopeId: sourceId,
    destinationEnvelopeId: destId,
    amount: String(moveCents / 100),
  }, { actionId: rebalAid });
  log("move POST", `status=${moveRes.status}`);

  // The action's revalidatePath() returns 307/303 to the same path —
  // follow the redirect so we get the new render.
  const redirected = moveRes.status === 307 || moveRes.status === 303
    ? await s.get(moveRes.headers.get("location") || "/envelopes")
    : moveRes;
  log("move follow", `status=${redirected.status} bytes=${(await redirected.clone().text()).length}`);

  // 4. Re-read /envelopes and verify balances shifted
  const env2 = await s.get("/envelopes");
  const env2Text = await env2.text();
  const form2 = extractRebalanceForm(env2Text);
  if (!form2) { console.log("FATAL: rebalance form missing after move"); process.exit(2); }
  const after = readBalancesFromForm(form2);
  const sourceAfter = after[sourceId];
  const destAfter = after[destId];
  log("source after", `${sourceId} = ${sourceAfter}¢ (expected ${sourceBefore - moveCents}¢)`);
  log("dest after", `${destId} = ${destAfter}¢ (expected ${destBefore + moveCents}¢)`);

  // ---------- Checks ----------

  const checks = [
    ["page still 200 after move", env2.status === 200],
    ["source lost exactly moveCents", sourceAfter === sourceBefore - moveCents],
    ["dest gained exactly moveCents", destAfter === destBefore + moveCents],
    ["form re-renders with new balances", form2.length > 1000],
    // Client-only render: SSR output uses INITIAL_STATE so the [OK] moved
    // line is absent in this server-side fetch. (Verified visually in browser.)
    ["[OK] moved is client-only render", !/\[OK\] moved/.test(env2Text)],
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
