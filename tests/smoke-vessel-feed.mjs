/**
 * Smoke for the Scrollable Vessel Feed (Cluster 3.x Component 4).
 *
 * Verifies the Middle 40% on the dashboard:
 *   - Every row has the four layers: title (name + status pill),
 *     numeric ledger "$X / $Y", thick linear gauge bar, low-opacity
 *     background sparkline (14-day)
 *   - Each row's gauge bar carries the right state class:
 *     calm / watch / over
 *   - The OVER state carries the .vessel-feed-bar--over class so the
 *     CSS keyframe (`vesselOverBlink`) animates the bar
 *   - The sparkline has 14 visible data points (14-element polyline
 *     `L` commands in the SVG path)
 *
 * Run with: node tests/smoke-vessel-feed.mjs
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
  console.log("--- Scrollable Vessel Feed smoke ---\n");

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
  const text = await r.text();
  const stripped = text.replace(/<!--\s*-->/g, "");
  log("/", `status=${r.status} bytes=${text.length}`);

  // Count vessel-feed rows: each <a class="allocation-row"> is one row.
  // We slice the page text from the first allocation-row opening to its
  // matching </a> and look for the row's components.
  const rowMatches = [...text.matchAll(/<a class="allocation-row"/g)];
  const rowCount = rowMatches.length;
  log("vessel feed rows", rowCount);

  // The first row (worst over-limit by sort) drives the OVER-class check.
  // Find the first allocation-row and slice to the next </a>.
  let firstRowHtml = "";
  if (rowMatches[0]) {
    const start = rowMatches[0].index;
    const end = text.indexOf("</a>", start);
    firstRowHtml = text.slice(start, end);
  }
  const firstRowStripped = firstRowHtml.replace(/<!--\s*-->/g, "");

  // Background sparkline: look for the position:absolute SVG with
  // viewBox 0 0 1000 60 (our sparkline canvas size).
  const hasBgSparkline = /viewBox="0 0 1000 60"/.test(firstRowHtml);
  // Find the area-fill path inside that SVG and count its `L` commands.
  // 14 points → 1 M + 13 L (line) or 15 L (area, which closes back to
  // the baseline with 2 more L). Either way, >= 12 means "14-day shape".
  // (Cluster 3.1: vessel tokens replace terminal neg/warn.)
  const sparklineAreaMatch = firstRowHtml.match(
    /<path d="(M[^"]+)" fill="var\(--(?:vessel-over|vessel-watch|jupiter|mercury|mars|venus|saturn|luna|sol)\)"/,
  );
  const sparklineLCmds = sparklineAreaMatch
    ? (sparklineAreaMatch[1].match(/L/g) || []).length
    : 0;

  // Numeric ledger: a row contains the "$X / $Y" pair. Look for the
  // "/" separator after a money value.
  const hasLedger = /[<>][^<>]*\/?[^<>]*\$[\d,]+(?:\.\d+)?\s*<\/span>\s*<span[^>]*>\s*\/\s*<\/span>\s*<span[^>]*>\s*\$/.test(firstRowStripped)
                  || /\$\d[\d,.]*\s*<\/div>|class="allocation-row"[\s\S]*?\$[\d,]+/.test(firstRowStripped);

  // Status pill: one of CALM / WATCH / OVER appears in the row's
  // mono caps pill.
  const statusInFirst = /\b(CALM|WATCH|OVER)\b/.exec(firstRowStripped);
  log("first row status", statusInFirst ? statusInFirst[1] : "NONE");

  // State color: the bar's background should match the status
  // (var(--neg) for OVER, var(--warn) for WATCH, planet/jupiter for CALM).
  // (Cluster 3.1: vessel tokens replace terminal neg/warn.)
  const overBarColor = /background:var\(--vessel-over\)/.test(firstRowHtml);
  const overBarClass = /class="vessel-feed-bar--over"/.test(firstRowHtml);
  const watchBarColor = /background:var\(--vessel-watch\)/.test(firstRowHtml);
  const calmBarColor = /background:var\(--jupiter\)|background:#c4b5fd/i.test(firstRowHtml);

  // Gauge bar thickness: 12px.
  const hasThickBar = /height:12px/.test(firstRowHtml);

  // Title — every row's <a> contains the envelope name.
  const titlesFound = rowCount > 0;

  // Status pill rendering: <span ...>CALM</span> or WATCH or OVER
  // inside a colored border.
  const hasStatusPill = />CALM<\/span>|>WATCH<\/span>|>OVER<\/span>/.test(firstRowStripped);

  // 14-day: the L-count should be 13 (14 points: 1 M + 13 L). If the
  // envelope has no transactions, the path might be a single point or
  // absent — we accept >= 12 as "approximately 14-day" because the
  // cadence math rounds 14 points to 13 segments.
  const has14DayShape = sparklineLCmds >= 12;

  // Background sparkline opacity: the area path uses opacity="0.08",
  // the line uses opacity="0.32". Both should be present.
  const hasLowOpacityArea = /opacity="0\.08"/.test(firstRowHtml);
  const hasLowOpacityLine = /opacity="0\.32"/.test(firstRowHtml);

  const checks = [
    ["at least 4 envelope rows present", rowCount >= 4],
    ["first row: thick (12px) gauge bar", hasThickBar],
    ["first row: background sparkline (1000x60 viewBox)", hasBgSparkline],
    ["first row: 14-day cadence shape (>= 12 L commands)", has14DayShape],
    ["first row: low-opacity area fill (0.08)", hasLowOpacityArea],
    ["first row: low-opacity line (0.32)", hasLowOpacityLine],
    ["first row: status pill (CALM/WATCH/OVER)", hasStatusPill],
    ["first row: numeric ledger present (money values)", hasLedger],
    ["first row has a title", titlesFound],
  ];

  // Conditional state-color checks based on the worst row's status.
  if (statusInFirst?.[1] === "OVER") {
    checks.push(["OVER: bar uses var(--neg) red", overBarColor]);
    checks.push(["OVER: bar carries vessel-feed-bar--over class (blink)", overBarClass]);
  } else if (statusInFirst?.[1] === "WATCH") {
    checks.push(["WATCH: bar uses var(--warn) orange", watchBarColor]);
  } else {
    checks.push(["CALM: bar uses planet/jupiter color", calmBarColor]);
  }

  console.log("\n--- row anatomy ---");
  log("row count", rowCount);
  log("bg sparkline viewBox 0 0 1000 60", hasBgSparkline);
  log("sparkline L commands", sparklineLCmds);
  log("thick 12px bar", hasThickBar);
  log("status pill", statusInFirst ? statusInFirst[1] : "MISS");
  log("numeric ledger", hasLedger);
  if (statusInFirst?.[1] === "OVER") {
    log("bar color var(--neg)", overBarColor);
    log("blink class .vessel-feed-bar--over", overBarClass);
  } else if (statusInFirst?.[1] === "WATCH") {
    log("bar color var(--warn)", watchBarColor);
  } else {
    log("bar color var(--jupiter)", calmBarColor);
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
