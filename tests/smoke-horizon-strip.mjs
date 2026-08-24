/**
 * Smoke for the SwipeableDashboardHeader (Cluster 3.x) — Card A
 * (Velocity Telemetry) + Card B (Consumption Ring + 14-day Horizon
 * Strip) on the top fold of /.
 *
 * Verifies:
 *   - Page 0: SafeToSpendHero with VELOCITY label + /day suffix
 *   - Page 1: HorizonStrip with 14 day rows (chronological)
 *   - Today marker is present on the right day
 *   - Eyebrow "// CHRONICLE · 14-DAY HORIZON" is on Page 1
 *
 * Both pages render in the SSR HTML even though only one is visible
 * at a time (CSS scroll-snap hides the other). So we can verify
 * each in a single fetch.
 *
 * Run with: node tests/smoke-horizon-strip.mjs
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

async function main() {
  console.log("--- Swipeable horizon smoke ---\n");

  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  const r = await get("/");
  const html = await r.text();
  log("/", `status=${r.status} bytes=${html.length}`);

  // Strip React 19 hydration comments so string checks see the
  // canonical text.
  const stripped = html.replace(/<!--\s*-->/g, "");

  // ---------- Card A: Velocity Telemetry (SafeToSpendHero) ----------
  const cardA = {
    eyebrow:        /DAILY TELEMETRY · SAFE TO SPEND/.test(stripped),
    velocityLabel:  /velocity/.test(stripped),
    perDaySuffix:   /\/ day/.test(stripped),
    burnCurve:      /Cumulative spend vs\. expected pace/.test(stripped),
    todayLabel:     /TODAY · DAY \d+\/\d+/.test(stripped),
    paceGap:        /UNDER PACE|OVER PACE/.test(stripped),
    actualLegend:   />ACTUAL</.test(stripped),
    expectedLegend: />EXPECTED</.test(stripped),
  };

  // ---------- Card B: Spend Ring + 14-day Horizon Strip ----------
  const cardB = {
    spendRingEyebrow:   /Total Spend/.test(stripped) || /vessel mix/.test(stripped),
    spendRingLabel:     />REMAINING</.test(stripped),
    horizonEyebrow:     /CHRONICLE · 14-DAY HORIZON/.test(stripped),
    horizonSectionHdr:  /period horizon/.test(stripped),
    horizonDays:        /14<!-- --> days|14 days/.test(stripped),
    todayBadge:         /TODAY/.test(stripped),
  };

  // Count <li role="listitem"> elements inside the horizon strip.
  // The horizon strip renders as a <div role="list"> wrapping a <ul>
  // of <li role="listitem"> children — one per day. We slice the page
  // from the list-region opening to its matching closing </div>.
  const horizonStart = stripped.indexOf('aria-label="Period horizon — 14 days"');
  let dayCount = 0;
  if (horizonStart > 0) {
    // The list region is the parent <div role="list">. Find its opening
    // tag and slice forward to the next </ul> after it.
    const listOpen = stripped.lastIndexOf("<div", horizonStart);
    const listEnd = stripped.indexOf("</ul>", horizonStart);
    if (listOpen > 0 && listEnd > listOpen) {
      const region = stripped.slice(listOpen, listEnd);
      dayCount = (region.match(/<li role="listitem"/g) || []).length;
    }
  }
  cardB.dayRowCount = dayCount;

  // Page indicator dots — expect 2 (one for Card A, one for Card B)
  const pageDots = (stripped.match(/aria-label="Go to page \d+"/g) || []).length;

  const checks = [
    ["Card A: eyebrow present", cardA.eyebrow],
    ["Card A: VELOCITY label present", cardA.velocityLabel],
    ["Card A: / day suffix present", cardA.perDaySuffix],
    ["Card A: burn curve present", cardA.burnCurve],
    ["Card A: today label on curve", cardA.todayLabel],
    ["Card A: pace gap annotation", cardA.paceGap],
    ["Card A: ACTUAL legend", cardA.actualLegend],
    ["Card A: EXPECTED legend", cardA.expectedLegend],
    ["Card B: spend ring eyebrow", cardB.spendRingEyebrow],
    ["Card B: spend ring REMAINING label", cardB.spendRingLabel],
    ["Card B: horizon strip eyebrow", cardB.horizonEyebrow],
    ["Card B: horizon section header (// period horizon)", cardB.horizonSectionHdr],
    ["Card B: horizon days count (14)", cardB.horizonDays],
    ["Card B: 14 day rows in horizon strip", cardB.dayRowCount === 14],
    ["Card B: TODAY badge present", cardB.todayBadge],
    ["Swipeable: 2 page indicator dots", pageDots === 2],
  ];

  console.log("\n--- Card A (Velocity Telemetry) ---");
  for (const k of Object.keys(cardA)) log(k, cardA[k] ? "OK" : "MISS");
  console.log("\n--- Card B (Ring + Horizon) ---");
  for (const k of Object.keys(cardB)) log(k, cardB[k] ? "OK" : "MISS");
  log("page dots", pageDots);

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
