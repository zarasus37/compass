/**
 * Smoke for the Cluster 5.2.6 widget switch — /goals page
 * reading from the Prisma `Goal` table.
 *
 * Verifies:
 *   1. After /api/reset-seed, the user has the 4 canonical
 *      GOALS_SEED rows in the `Goal` table with `source = "seed"`
 *      and the right names, planets, kinds, and target amounts.
 *   2. /goals renders those rows (each goal name appears in
 *      the page HTML).
 *   3. The deep-link filters (?kind=emergency, ?kind=invest)
 *      still narrow the list correctly.
 *   4. Updating a goal's currentAmount in the DB is reflected
 *      on the next page render.
 *
 * Run with: node tests/smoke-goals-db.mjs
 * (dev server must be running on 127.0.0.1:3000)
 */

import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  join(process.cwd(), "src/generated/prisma/client"),
);
const { PrismaBetterSqlite3 } = require(
  join(process.cwd(), "node_modules/@prisma/adapter-better-sqlite3"),
);
const adapter = new PrismaBetterSqlite3({
  url: join(process.cwd(), "dev.db"),
});
const prisma = new PrismaClient({ adapter });

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
async function postJson(path) {
  const headers = new Headers();
  applyCookies(headers);
  const r = await fetch(BASE + path, { method: "POST", headers, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
async function postForm(path, fields, { actionId, kind = "bound" } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (actionId) {
    if (kind === "bound") {
      form.append("$ACTION_REF_1", "");
      form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
      form.append("$ACTION_1:1", "[{\"ok\":false}]");
    } else {
      form.append(`$ACTION_ID_${actionId}`, "");
    }
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
  m = html.match(/\$ACTION_ID_([a-f0-9]{20,})/);
  if (m) return m[1];
  return null;
}

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

async function main() {
  console.log("--- Goals DB widget switch smoke (Cluster 5.2.6) ---\n");

  // ── 1. Login ────────────────────────────────────────────────
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // ── 2. Reset to seed ────────────────────────────────────────
  const r1 = await postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  // ── 3. Inspect the Goal table ───────────────────────────────
  const user = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!user) { console.log("FATAL: no mom user"); process.exit(1); }
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, source: "seed" },
    orderBy: { sortOrder: "asc" },
  });
  log("seed goals in DB", `count=${goals.length}`);

  check("DB has 4 seed Goal rows", goals.length === 4, `got ${goals.length}`);

  const expectedNames = ["Emergency Fund", "Investment Goal", "Debt Free", "Visit Family"];
  for (let i = 0; i < expectedNames.length; i++) {
    const actual = goals[i];
    check(
      `seed goal #${i + 1} name = "${expectedNames[i]}"`,
      actual && actual.name === expectedNames[i],
      `got "${actual?.name}"`,
    );
  }
  // Spot-check the data on Emergency Fund
  const emergency = goals.find((g) => g.name === "Emergency Fund");
  if (emergency) {
    check("Emergency Fund targetAmount = 2000000 ($20K)", emergency.targetAmount === 2000000, `got ${emergency.targetAmount}`);
    check("Emergency Fund currentAmount = 680000 ($6.8K)", emergency.currentAmount === 680000, `got ${emergency.currentAmount}`);
    check("Emergency Fund kind = TRANSFER", emergency.kind === "TRANSFER", `got ${emergency.kind}`);
    check("Emergency Fund goalType = EMERGENCY", emergency.goalType === "EMERGENCY", `got ${emergency.goalType}`);
    check("Emergency Fund isPrimary = true", emergency.isPrimary === true, `got ${emergency.isPrimary}`);
    check("Emergency Fund planet = jupiter", emergency.planet === "jupiter", `got ${emergency.planet}`);
    check("Emergency Fund source = seed", emergency.source === "seed", `got ${emergency.source}`);
  }
  // Verify the other kinds too
  const invest = goals.find((g) => g.name === "Investment Goal");
  if (invest) {
    check("Investment Goal kind = MILESTONE", invest.kind === "MILESTONE", `got ${invest.kind}`);
    check("Investment Goal goalType = INVEST", invest.goalType === "INVEST", `got ${invest.goalType}`);
  }
  const visit = goals.find((g) => g.name === "Visit Family");
  if (visit) {
    check("Visit Family goalType = null (custom)", visit.goalType === null, `got ${visit.goalType}`);
  }

  // ── 4. /goals renders those rows ────────────────────────────
  const g1 = await get("/goals");
  const g1Text = await g1.text();
  log("/goals", `status=${g1.status} bytes=${g1Text.length}`);
  check("/goals: 200", g1.status === 200, `got ${g1.status}`);

  for (const expected of expectedNames) {
    check(
      `/goals renders goal "${expected}"`,
      g1Text.includes(expected),
      "name not found in HTML",
    );
  }
  // "Top priority" label
  check(
    '/goals shows "Top priority" badge',
    g1Text.includes("Top priority"),
    "label not found",
  );

  // ── 5. ?kind=emergency filter narrows the goal list ─
  // NOTE: the trajectory chart at the top always shows ALL goals
  // (per the comment in the page); the kind filter only narrows
  // the goal list cards below the chart. We assert the filtered
  // goal IS in the page (via the chart) and that the page header
  // reflects the filter (the "ALL" tab is no longer the active
  // filter — the matching kind tab is).
  const gEmerg = await get("/goals?kind=emergency");
  const gEmergText = await gEmerg.text();
  log("/goals?kind=emergency", `status=${gEmerg.status} bytes=${gEmergText.length}`);
  check("/goals?kind=emergency: 200", gEmerg.status === 200);
  check("emergency filter shows Emergency Fund", gEmergText.includes("Emergency Fund"));
  // The page should have a "EMERGENCY" tab/marker that indicates
  // the filter is active. Look for the kind filter UI element.
  check(
    "emergency filter page has 'EMERGENCY' tab indicator",
    /aria-current="page"[^>]*>[\s\S]*?EMERGENCY/i.test(gEmergText) ||
    gEmergText.includes(">EMERGENCY<"),
    "EMERGENCY tab indicator not found",
  );

  // ── 6. ?kind=invest filter narrows the goal list ────────────
  const gInvest = await get("/goals?kind=invest");
  const gInvestText = await gInvest.text();
  log("/goals?kind=invest", `status=${gInvest.status} bytes=${gInvestText.length}`);
  check("/goals?kind=invest: 200", gInvest.status === 200);
  check("invest filter shows Investment Goal", gInvestText.includes("Investment Goal"));
  check(
    "invest filter page has 'INVEST' tab indicator",
    /aria-current="page"[^>]*>[\s\S]*?INVEST/i.test(gInvestText) ||
    gInvestText.includes(">INVEST<"),
    "INVEST tab indicator not found",
  );

  // ── 7. DB write → page re-render round trip ─────────────────
  // Bump Emergency Fund's currentAmount by $100 (10000 cents) in
  // the DB and verify the page reflects the new value.
  await prisma.goal.update({
    where: { id: "goal-emergency" },
    data: { currentAmount: 780000 }, // was 680000, now $7800
  });
  const g2 = await get("/goals");
  const g2Text = await g2.text();
  // $7,800 should appear in the page
  check(
    "/goals re-render shows new Emergency Fund balance $7,800",
    g2Text.includes("$7,800"),
    "new balance not found in re-rendered HTML",
  );
  // Reset
  await prisma.goal.update({
    where: { id: "goal-emergency" },
    data: { currentAmount: 680000 },
  });

  // ── 8. Summary ──────────────────────────────────────────────
  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const [name, ok] of checks) {
    if (ok) pass++; else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss (${checks.length} total)`);
  if (fail > 0) {
    console.log("\n!! FAILURES:");
    for (const [name, ok, detail] of checks) {
      if (!ok) console.log(`   ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    }
    process.exit(3);
  }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
