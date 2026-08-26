/**
 * Smoke for the Cluster 5.2.6 widget switch — /envelopes page
 * reading from the Prisma `Envelope` table.
 *
 * Verifies:
 *   1. After /api/reset-seed, the user has the 7 canonical
 *      ENVELOPES_SEED rows in the `Envelope` table with
 *      `source = "seed"` and the right names, planets, and
 *      current/target balances.
 *   2. /envelopes renders those rows (each vessel name appears
 *      in the page HTML).
 *   3. A balance change via rebalance persists to the DB and the
 *      page reflects it on the next render.
 *
 * Run with: node tests/smoke-envelopes-db.mjs
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

// ── HTTP helpers ────────────────────────────────────────────────────────
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
  console.log("--- Envelopes DB widget switch smoke (Cluster 5.2.6) ---\n");

  // ── 1. Login as mom@compass.local ─────────────────────────────
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // ── 2. Reset to seed ──────────────────────────────────────────
  const r1 = await postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  // ── 3. Find the user + check the Envelope table ───────────────
  const user = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!user) { console.log("FATAL: no mom user"); process.exit(1); }
  const envelopes = await prisma.envelope.findMany({
    where: { userId: user.id, source: "seed" },
    orderBy: { sortOrder: "asc" },
  });
  log("seed envelopes in DB", `count=${envelopes.length}`);

  // Expect 7 canonical vessels
  check("DB has 7 seed Envelope rows", envelopes.length === 7, `got ${envelopes.length}`);

  // Verify the names
  const expectedNames = ["Rent", "Groceries", "Utilities", "Dining & Joy", "Buffer", "Savings", "Debt"];
  for (let i = 0; i < expectedNames.length; i++) {
    const actual = envelopes[i];
    check(
      `seed envelope #${i + 1} name = "${expectedNames[i]}"`,
      actual && actual.name === expectedNames[i],
      `got "${actual?.name}"`,
    );
  }
  // Spot-check the data on Rent + Savings
  const rent = envelopes.find((e) => e.name === "Rent");
  if (rent) {
    check("Rent planet = sol", rent.planet === "sol", `got "${rent.planet}"`);
    check("Rent currentBalance = 80000 cents", rent.currentBalance === 80000, `got ${rent.currentBalance}`);
    check("Rent targetBalance = 80000 cents", rent.targetBalance === 80000, `got ${rent.targetBalance}`);
    check("Rent source = seed", rent.source === "seed", `got ${rent.source}`);
  }
  const savings = envelopes.find((e) => e.name === "Savings");
  if (savings) {
    check("Savings planet = jupiter", savings.planet === "jupiter", `got "${savings.planet}"`);
    check("Savings currentBalance = 136000", savings.currentBalance === 136000, `got ${savings.currentBalance}`);
    check("Savings targetBalance = 400000", savings.targetBalance === 400000, `got ${savings.targetBalance}`);
  }

  // ── 4. /envelopes renders those rows ──────────────────────────
  const e1 = await get("/envelopes");
  const e1Text = await e1.text();
  log("/envelopes", `status=${e1.status} bytes=${e1Text.length}`);
  check("/envelopes: 200", e1.status === 200, `got ${e1.status}`);

  for (const expected of expectedNames) {
    // The "&" in "Dining & Joy" gets HTML-escaped to "&amp;" in the
    // rendered page; check both forms.
    const variants = expected === "Dining & Joy"
      ? ["Dining &amp; Joy", "Dining & Joy"]
      : [expected];
    const found = variants.some((v) => e1Text.includes(v));
    check(
      `/envelopes renders envelope "${expected}"`,
      found,
      "name not found in HTML",
    );
  }
  // "Move between vessels" section header
  check(
    '/envelopes shows "Move between vessels"',
    e1Text.includes("Move between vessels"),
    "section header not found",
  );
  // The RebalanceForm should be present (option values = env-* ids)
  check(
    "/envelopes RebalanceForm has env-rent option",
    /value="env-rent"/.test(e1Text),
    "env-rent option not found",
  );
  check(
    "/envelopes RebalanceForm has env-savings option",
    /value="env-savings"/.test(e1Text),
    "env-savings option not found",
  );

  // ── 5. Rebalance action writes to DB ──────────────────────────
  // Find the rebalance form's action id on the page.
  // The form is between "Move between vessels" and "Every envelope".
  const moveIdx = e1Text.indexOf("MOVE BETWEEN VESSELS");
  const formStart = e1Text.indexOf("<form", moveIdx);
  const formEnd = e1Text.indexOf("</form>", formStart);
  const rebalForm = e1Text.slice(formStart, formEnd);
  const rebalAid = rebalForm.match(/"id":"([a-f0-9]{20,})"/)?.[1]
    || rebalForm.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/)?.[1];
  if (!rebalAid) {
    check("rebalance aid found in /envelopes HTML", false, "no action id");
  } else {
    log("rebalance aid", rebalAid.slice(0, 12) + "...");
    // Move $10 from Rent to Groceries
    const rebal = await postForm("/envelopes", {
      sourceEnvelopeId: "env-rent",
      destinationEnvelopeId: "env-groceries",
      amount: "10",
    }, { actionId: rebalAid });
    log("rebalance POST", `status=${rebal.status}`);

    // Re-read the DB to confirm the new balances
    const rentAfter = await prisma.envelope.findFirst({ where: { id: "env-rent", userId: user.id } });
    const groceriesAfter = await prisma.envelope.findFirst({ where: { id: "env-groceries", userId: user.id } });
    check(
      "DB Rent.currentBalance = 79000 after rebalance (-$10)",
      rentAfter && rentAfter.currentBalance === 79000,
      `got ${rentAfter?.currentBalance}`,
    );
    check(
      "DB Groceries.currentBalance = 62200 after rebalance (+$10)",
      groceriesAfter && groceriesAfter.currentBalance === 62200,
      `got ${groceriesAfter?.currentBalance}`,
    );

    // And the page re-render reflects the new balance
    const e2 = await get("/envelopes");
    const e2Text = await e2.text();
    // The "Every envelope" row shows the envelope + current/target.
    // After the rebalance, Rent should be at $790 (79000 cents).
    // Look for "$790" or "790" near "Rent".
    check(
      "/envelopes re-render shows the new Rent balance",
      e2Text.includes("$790"),
      "new balance not found in re-rendered HTML",
    );
  }

  // ── 6. Final summary ──────────────────────────────────────────
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
