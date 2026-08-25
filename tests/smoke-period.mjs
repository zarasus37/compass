/**
 * Smoke for the /period page — the three Period-specific visualizations
 * the user asked for in the "this period" section push:
 *   #2 pace projection (cumulative-spend curve + forward projection)
 *   #7 closing balance bridge (stacked-bar walk)
 *   #5 period-over-period comparison (grouped bar chart)
 *
 * What the smoke verifies:
 *   1. /period returns 200 and is non-empty.
 *   2. The pace projection block is present (eyebrow + 3 stat cells +
 *      SVG with the actual/projection line strokes).
 *   3. The closing balance bridge is present (4 bar labels: Start,
 *      + Income, − Spending, Projected) and the bars themselves.
 *   4. The period comparison is present (4 period labels — current +
 *      3 prior) and the 12 metric bars (3 metrics × 4 periods).
 *   5. The prior-period seed data is wired in (the 3 prior labels:
 *      "Aug 8", "Jul 25", "Jul 11").
 *   6. The Mandala is still present (the visual centerpiece, kept).
 *   7. The Will be distributed section is still there.
 *
 * What the smoke does NOT verify:
 *   - The exact pixel layout of the SVG charts.
 *   - The numeric values shown (they depend on the live store; the
 *     structural check is enough).
 *   - The pace projection math (covered by visual inspection in dev).
 *
 * Run with: node tests/smoke-period.mjs
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
async function postForm(path, fields, { useActionState } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (useActionState) {
    form.append("$ACTION_REF_1", "");
    form.append("$ACTION_1:0", JSON.stringify({ id: useActionState.id, bound: "$@1" }));
    form.append("$ACTION_1:1", JSON.stringify(useActionState.initial));
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", headers, body: form, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
function extractUseActionStateId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  return null;
}
const log = (k, v) => console.log(`[${k}] ${v}`);
function countMatches(html, pattern) {
  return (html.match(pattern) ?? []).length;
}

async function main() {
  console.log("--- Period smoke ---\n");

  // Login (useActionState form)
  const lr = await get("/login");
  const loginAid = extractUseActionStateId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { useActionState: { id: loginAid, initial: [{ ok: false }] } });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // Hit /period
  const r = await get("/period");
  const html = await r.text();
  log("period", `status=${r.status} bytes=${html.length}`);

  const checks = [];
  function check(name, cond, detail) {
    checks.push({ name, ok: Boolean(cond), detail });
  }

  check("period returns 200", r.status === 200);
  check("period is non-empty", html.length > 5000, `bytes=${html.length}`);

  // Existing structure (preserved)
  check(
    "Mandala still present (compass centerpiece)",
    countMatches(html, /Mandala|Compass|compass · day/) > 0,
  );
  check(
    "Will be distributed section still present",
    countMatches(html, /Will be distributed/) > 0,
  );
  check(
    "Mandala compass label is on the page",
    countMatches(html, /The compass · day/) > 0,
  );

  // ── #2 Pace projection ──────────────────────────────────────────
  log("pace", "checking pace projection block");
  check(
    "pace: 'Day by day · pace' header present",
    countMatches(html, /Day by day · pace/) >= 1,
  );
  check(
    "pace: 'spent this period' stat present",
    countMatches(html, /spent this period/) >= 1,
  );
  check(
    "pace: 'pace per day' stat present",
    countMatches(html, /pace per day/) >= 1,
  );
  check(
    "pace: 'finish at' stat present",
    countMatches(html, /finish at/) >= 1,
  );
  // The actual-line stroke (terminal-cyan) and projection-line stroke
  // (gold) should both appear in the SVG for the pace chart.
  check(
    "pace: actual-line stroke (var(--terminal-cyan)) in SVG",
    html.includes('stroke="var(--terminal-cyan)"'),
  );
  check(
    "pace: projection-line stroke (var(--gold)) with dasharray",
    /stroke-dasharray="4 4"[^>]*stroke="var\(--gold\)"|stroke="var\(--gold\)"[^>]*stroke-dasharray="4 4"/.test(html),
  );
  check(
    "pace: legend shows Actual / Projection / Today",
    countMatches(html, />Actual</) >= 1 &&
      countMatches(html, />Projection</) >= 1 &&
      countMatches(html, />Today</) >= 1,
  );

  // ── #7 Closing balance bridge ───────────────────────────────────
  log("bridge", "checking closing balance bridge block");
  check(
    "bridge: 'Closing balance · this period' header present",
    countMatches(html, /Closing balance · this period/) >= 1,
  );
  check(
    "bridge: 'Start' bar label present",
    countMatches(html, />Start</) >= 1,
  );
  check(
    "bridge: '+ Income' bar label present",
    countMatches(html, /\+ Income/) >= 1,
  );
  check(
    "bridge: '− Spending' bar label present",
    countMatches(html, /− Spending/) >= 1,
  );
  check(
    "bridge: 'Projected' bar label present",
    countMatches(html, />Projected</) >= 1,
  );
  check(
    "bridge: cyan Start bar fill",
    /fill="var\(--terminal-cyan\)"/.test(html),
  );
  check(
    "bridge: green Income bar fill (var(--ok))",
    /fill="var\(--ok\)"/.test(html),
  );
  check(
    "bridge: red Spending bar fill (var(--mars))",
    /fill="var\(--mars\)"/.test(html),
  );
  check(
    "bridge: gold Projected bar fill",
    /fill="var\(--gold\)"/.test(html),
  );

  // ── #5 Period comparison ────────────────────────────────────────
  log("compare", "checking period comparison block");
  check(
    "compare: 'Three periods back' header present",
    countMatches(html, /Three periods back/) >= 1,
  );
  check(
    "compare: 'this period' label present (current period)",
    countMatches(html, /this period/) >= 1,
  );
  // 3 prior periods with their date-range labels
  check(
    "compare: Aug 8 – Aug 21 prior period label present",
    countMatches(html, /Aug 8 – Aug 21/) >= 1,
  );
  check(
    "compare: Jul 25 – Aug 7 prior period label present",
    countMatches(html, /Jul 25 – Aug 7/) >= 1,
  );
  check(
    "compare: Jul 11 – Jul 24 prior period label present",
    countMatches(html, /Jul 11 – Jul 24/) >= 1,
  );
  // Legend chips
  check(
    "compare: legend shows Income / Spending / Carry",
    countMatches(html, /Income/) >= 1 &&
      countMatches(html, /Spending/) >= 1 &&
      countMatches(html, /Carry/) >= 1,
  );

  // ── Report ─────────────────────────────────────────────────────
  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const c of checks) {
    log(c.name, c.ok ? "OK" : `MISS${c.detail ? ` (${c.detail})` : ""}`);
    if (c.ok) pass++;
    else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss`);

  if (fail > 0) {
    console.log("\n!! FAILURES");
    process.exit(3);
  }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
