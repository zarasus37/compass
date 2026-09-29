/**
 * Smoke for the engine toggle action + SystemSettings persistence.
 *
 * Verifies the TopAppBar's L1 ↔ L2 toggle:
 *   - Reads L1 by default (the SystemSettings row's default)
 *   - Clicking the engine button flips the state to L2
 *   - The pill label changes from "RULES ENGINE" to "AI ENGINE"
 *   - Clicking again flips back to L1
 *   - The change persists across page navigations
 *
 * Wire format note (React 19, plain server action — no useActionState):
 *   - The form has a hidden input named "$ACTION_ID_<40char hex>" set to "".
 *   - POST FormData needs: $ACTION_REF_1="" and the matching $ACTION_ID_xxx="".
 *   - No $ACTION_1:0 / $ACTION_1:1 (those are the useActionState wire format).
 *
 * Run with: tsx --conditions=react-server tests/smoke-engine-toggle.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * shared `mom@compass.local`, so this test can neither be poisoned by
 * nor poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

/**
 * Plain server-action POST: ONLY the $ACTION_ID_<hex> hidden input.
 * (No $ACTION_REF_1 — that's only for useActionState forms which also
 * have a $ACTION_1:0 action-descriptor field. Plain MPA forms don't.)
 * Rides on the fixture's cookie jar by delegating to s.get.
 */
async function postPlainAction(s, path, actionId) {
  const form = new FormData();
  form.append(`$ACTION_ID_${actionId}`, "");
  return s.get(path, { method: "POST", body: form });
}
function extractPlainActionId(html) {
  // The $ACTION_ID_<hex> hidden input. The hex is a SHA-1-shaped digest
  // (40+ chars in practice; we observed 42 in this app). Match any hex
  // run and let the call site validate if needed.
  const m = html.match(/\$ACTION_ID_([a-f0-9]+)/);
  return m ? m[1] : null;
}
function extractEngineForm(html) {
  // Find the form that contains the top-app-bar-engine button.
  // Use a non-greedy match: <form...>...top-app-bar-engine...</form>
  const m = html.match(/<form[^>]*>(?:(?!<\/form>).)*?top-app-bar-engine(?:(?!<\/form>).)*?<\/form>/s);
  return m ? m[0] : null;
}
function readEngineLabel(html) {
  // The button's aria-label carries the human label:
  //   "Current engine: ⚙ L1 RULES ENGINE. Click to toggle."  (L1, post-vessel)
  //   "Current engine: ⚡ L2 AI ENGINE. Click to toggle."     (L2, post-vessel)
  // We strip any leading glyph emoji and return just "L1 RULES ENGINE" / "L2 AI ENGINE"
  // so the rest of the smoke can compare consistently across rebrands.
  const m = html.match(/<button[^>]*aria-label="Current engine: ([^.]+)\. Click to toggle\."/);
  if (!m) return null;
  const raw = m[1].trim();
  // Drop any leading non-alphanumeric emoji/glyph + space.
  return raw.replace(/^[^\w]+/, "").trim();
}
const log = (k, v) => console.log(`[${k}] ${v}`);

async function main() {
  console.log("--- Engine toggle smoke ---\n");

  // ── 1. Per-test fixture user, logged in through the real action ──
  const s = await loginAsFixture("engine-toggle");
  log("fixture", `user=${s.email}`);

  // --- Step 1: read dashboard, find engine form, read current label ---
  const r1 = await s.get("/");
  const html1 = await r1.text();
  const engineForm1 = extractEngineForm(html1);
  if (!engineForm1) { console.log("FATAL: engine form not found"); process.exit(2); }
  const engineAid1 = extractPlainActionId(engineForm1);
  if (!engineAid1) { console.log("FATAL: engine plain-action id not found"); process.exit(2); }
  log("engine aid", engineAid1.slice(0, 16) + "...");

  const startLabel = readEngineLabel(html1);
  log("start label", startLabel);
  if (startLabel !== "L1 RULES ENGINE" && startLabel !== "L2 AI ENGINE") {
    console.log("FATAL: start label not in {L1 RULES ENGINE, L2 AI ENGINE}");
    process.exit(2);
  }

  // --- Step 2: POST the toggle (plain server action) ---
  const targetLabel = startLabel === "L1 RULES ENGINE" ? "L2 AI ENGINE" : "L1 RULES ENGINE";
  const toggleRes = await postPlainAction(s, "/", engineAid1);
  log("toggle POST", `status=${toggleRes.status}`);

  // --- Step 3: re-read the dashboard, confirm the label flipped ---
  const r2 = await s.get("/");
  const html2 = await r2.text();
  const afterToggle = readEngineLabel(html2);
  log("after toggle", afterToggle);

  // --- Step 4: toggle back ---
  const engineForm2 = extractEngineForm(html2);
  const engineAid2 = engineForm2 ? extractPlainActionId(engineForm2) : null;
  if (!engineAid2) { console.log("FATAL: engine action id not found on second fetch"); process.exit(2); }
  const toggleRes2 = await postPlainAction(s, "/", engineAid2);
  log("toggle back POST", `status=${toggleRes2.status}`);
  const r3 = await s.get("/");
  const html3 = await r3.text();
  const afterToggle2 = readEngineLabel(html3);
  log("after toggle back", afterToggle2);

  // --- Step 5: persistence check — navigate to a different page, then back ---
  // (the cookie session and the SystemSettings row are independent of the URL;
  //  we just confirm the label sticks across a navigation, not just within "/".)
  const r4 = await s.get("/envelopes");
  const html4 = await r4.text();
  const onEnvelopes = readEngineLabel(html4);
  log("on /envelopes", onEnvelopes);
  const r5 = await s.get("/");
  const html5 = await r5.text();
  const backOnDashboard = readEngineLabel(html5);
  log("back on /", backOnDashboard);

  // --- checks ---
  const checks = [
    ["start label is L1 RULES ENGINE or L2 AI ENGINE", startLabel === "L1 RULES ENGINE" || startLabel === "L2 AI ENGINE"],
    ["toggle POST returns 200/303", toggleRes.status === 200 || toggleRes.status === 303 || toggleRes.status === 307],
    [`after toggle: label is ${targetLabel}`, afterToggle === targetLabel],
    ["toggle back POST returns 200/303", toggleRes2.status === 200 || toggleRes2.status === 303 || toggleRes2.status === 307],
    [`after toggle back: label is ${startLabel}`, afterToggle2 === startLabel],
    [`persistence on /envelopes: label still ${startLabel}`, onEnvelopes === startLabel],
    [`persistence back on /: label still ${startLabel}`, backOnDashboard === startLabel],
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
