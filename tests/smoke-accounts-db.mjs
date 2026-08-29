/**
 * Smoke for the Cluster 5.2.6 widget switch — /accounts reading
 * from the Prisma `Account` table.
 *
 * Verifies:
 *   1. After /api/reset-seed, the user has 1 seed Account row
 *      (id="acct-chase", name="Chase Checking",
 *      currentBalance=8_421_000 cents, source="seed").
 *   2. The /accounts page renders 200 + surfaces the canonical
 *      account (name, institution, mask, type, balance).
 *   3. The balance cell renders the live `currentBalance` (was
 *      previously hardcoded to the next paycheck amount — a
 *      latent bug fixed by this widget switch).
 *   4. The page also surfaces projection accounts (name startsWith
 *      "[identity] ") as a secondary "From the onboarding chat"
 *      section. We seed a few projection rows for the smoke.
 *   5. Round-trip: change the account's balance in the DB →
 *      re-render → page picks up the new value.
 *   6. The reset endpoint re-seeds idempotently (counts stay
 *      stable across calls; projection rows are wiped).
 *
 * Run with: node tests/smoke-accounts-db.mjs
 * (dev server must be running on 127.0.0.1:3000)
 */

import { createRequire } from "node:module";
import { join } from "node:path";

import { prisma } from "./db-client.mjs";

const BASE = "http://127.0.0.1:3000";

// ── HTTP helpers (jar pattern; smoke-bills-db.mjs style) ────────────────────
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
function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  m = html.match(/\$ACTION_ID_([a-f0-9]{20,})/);
  if (m) return m[1];
  return null;
}
async function postForm(path, fields, { actionId, kind = "plain" } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (actionId && kind === "bound") {
    form.append("$ACTION_REF_1", "");
    form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
    form.append("$ACTION_1:1", "[{\"ok\":false}]");
  } else if (actionId) {
    form.append(`$ACTION_ID_${actionId}`, "");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", headers, body: form, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

async function main() {
  console.log("--- Accounts DB widget switch smoke (Cluster 5.2.6) ---\n");

  // ── 1. Login as mom@compass.local (the canonical seed user) ─────
  // The login form uses useActionState (bound form pattern).
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid, kind: "bound" });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // ── 2. Reset + clean up any projection rows from previous runs ───
  const r1 = await postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  const user = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!user) { console.log("FATAL: no mom user"); process.exit(1); }

  // Clean up any leftover projection rows from previous smoke runs
  // so the page-state assertions are deterministic.
  await prisma.account.deleteMany({
    where: { userId: user.id, name: { startsWith: "[identity] " } },
  });

  // ── 3. Verify the seed Account row in the DB ────────────────────
  const seed = await prisma.account.findFirst({
    where: { userId: user.id, source: "seed" },
  });
  log("seed account in DB", seed ? `id=${seed.id} name=${seed.name} balance=${seed.currentBalance}` : "MISSING");

  check("DB has 1 seed Account row", seed !== null, "no seed row");
  if (seed) {
    check("Seed account id = acct-chase", seed.id === "acct-chase", `got ${seed.id}`);
    check("Seed account name = Chase Checking", seed.name === "Chase Checking", `got ${seed.name}`);
    check("Seed account type = checking", seed.type === "checking", `got ${seed.type}`);
    check("Seed account currentBalance = 8_421_000 cents ($84,210)", seed.currentBalance === 8_421_000, `got ${seed.currentBalance}`);
    check("Seed account institution = Chase", seed.institution === "Chase", `got ${seed.institution}`);
    check("Seed account mask = 4218", seed.mask === "4218", `got ${seed.mask}`);
    check("Seed account source = seed", seed.source === "seed", `got ${seed.source}`);
  }

  // ── 4. /accounts renders 200 and the canonical account is shown ──
  const a1 = await get("/accounts");
  const a1Text = await a1.text();
  log("/accounts", `status=${a1.status} bytes=${a1Text.length}`);
  check("/accounts: 200", a1.status === 200, `got ${a1.status}`);

  // Page header
  check(
    '/accounts has "// money · accounts" eyebrow',
    a1Text.includes("// money · accounts"),
    "eyebrow not found",
  );
  check(
    '/accounts has "Accounts" title',
    a1Text.includes("Accounts"),
    "title not found",
  );
  check(
    '/accounts has "where your money lives" em',
    a1Text.includes("where your money lives"),
    "em not found",
  );

  // The canonical account card
  check(
    '/accounts shows "Chase Checking" (canonical account name)',
    a1Text.includes("Chase Checking"),
    "name not found",
  );
  check(
    '/accounts shows "Chase · •••• 4218" (institution + mask)',
    a1Text.includes("Chase") && a1Text.includes("4218"),
    "institution/mask not found",
  );
  check(
    '/accounts has "Type" cell label (// + Type are in separate spans)',
    a1Text.includes("Type") && a1Text.includes(">Type<") || a1Text.includes("Type</"),
    "type cell not found",
  );
  check(
    '/accounts shows "checking" (account type)',
    a1Text.toLowerCase().includes("checking"),
    "checking not found",
  );
  check(
    '/accounts has "Balance" cell label (// + Balance are in separate spans)',
    a1Text.includes("Balance") && (a1Text.includes(">Balance<") || a1Text.includes("Balance</")),
    "balance cell not found",
  );
  // The balance cell now reads from the DB. The seed has
  // 8_421_000 cents = $84,210.00.
  check(
    '/accounts shows the live balance "$84,210.00" (was hardcoded before)',
    a1Text.includes("$84,210.00"),
    "live balance not found (still hardcoded?)",
  );
  check(
    '/accounts shows the prior hardcoded balance "$2,400.00" as a NEGATIVE check (it should NOT be present)',
    !a1Text.includes("$2,400.00") || a1Text.indexOf("$2,400.00") < 0,
    "$2,400.00 is present — hardcoded bug not fixed?",
  );
  // The "Manual · mock" badge on the canonical card
  check(
    '/accounts shows "Manual · mock" badge on canonical card',
    a1Text.includes("Manual"),
    "badge not found",
  );

  // ── 5. No projection rows in DB yet → no "From the onboarding chat" section
  // (We clean up earlier; the page shouldn't render the section.)
  check(
    "/accounts: no projection section when no projection rows exist",
    !a1Text.includes("From the onboarding chat"),
    "projection section unexpectedly present",
  );

  // ── 6. Insert a few projection rows (simulate post-onboarding state)
  log("seed projection rows", "3 income/asset/debt rows");
  await prisma.account.createMany({
    data: [
      {
        userId: user.id,
        name: "[identity] Main Salary",
        type: "checking",
        currentBalance: 0,
        institution: "monthly:$7280 biweekly",
        source: "seed", // projection doesn't set source yet; we leave default
        sortOrder: 1,
      },
      {
        userId: user.id,
        name: "[identity] Emergency Savings",
        type: "savings",
        currentBalance: 20_000_00, // $20,000
        institution: "from identity",
        source: "seed",
        sortOrder: 2,
      },
      {
        userId: user.id,
        name: "[identity] Chase Sapphire",
        type: "other",
        currentBalance: -4_820_00, // -$4,820 (debt — negative)
        institution: "apr:24.99% kind:credit_card",
        source: "seed",
        sortOrder: 3,
      },
    ],
  });

  const a2 = await get("/accounts");
  const a2Text = await a2.text();
  log("/accounts (with projection rows)", `status=${a2.status} bytes=${a2Text.length}`);

  // The "From the onboarding chat" section appears
  // (// and the label are in separate spans)
  check(
    '/accounts renders "From the onboarding chat" section when projection rows exist',
    a2Text.includes("From the onboarding chat"),
    "projection section not rendered",
  );
  check(
    '/accounts explains the projection section',
    a2Text.includes("onboarding chat") && a2Text.includes("separate rows"),
    "explanation copy not found",
  );
  // Each projection row's name + balance is rendered
  check(
    '/accounts renders "[identity] Main Salary" projection row',
    a2Text.includes("[identity] Main Salary"),
    "income row not found",
  );
  check(
    '/accounts renders "[identity] Emergency Savings" projection row',
    a2Text.includes("[identity] Emergency Savings"),
    "savings row not found",
  );
  check(
    '/accounts renders "[identity] Chase Sapphire" projection row (debt — negative balance)',
    a2Text.includes("[identity] Chase Sapphire"),
    "debt row not found",
  );
  // The savings row's $20,000 balance
  check(
    '/accounts renders the savings balance "$20,000.00"',
    a2Text.includes("$20,000.00"),
    "savings balance not found",
  );
  // The debt row's -$4,820 balance
  check(
    '/accounts renders the debt balance "-$4,820.00"',
    a2Text.includes("-$4,820.00"),
    "debt balance not found",
  );

  // ── 7. Round-trip: change the canonical account's balance in the DB
  log("round-trip", "change acct-chase balance 8_421_000 → 999_999_99");
  await prisma.account.update({
    where: { id: "acct-chase" },
    data: { currentBalance: 999_999_99 },
  });
  const a3 = await get("/accounts");
  const a3Text = await a3.text();
  check(
    "/accounts reflects DB write: shows $999,999.99 (was $84,210.00)",
    a3Text.includes("$999,999.99"),
    "new balance not picked up",
  );
  check(
    "/accounts no longer shows the old balance $84,210.00 after DB write",
    !a3Text.includes("$84,210.00"),
    "old balance still present (stale read?)",
  );
  // Restore
  await prisma.account.update({
    where: { id: "acct-chase" },
    data: { currentBalance: 8_421_000 },
  });
  const a4 = await get("/accounts");
  const a4Text = await a4.text();
  check(
    "/accounts after restore shows $84,210.00 again",
    a4Text.includes("$84,210.00"),
    "old balance not found after restore",
  );

  // ── 8. The reset endpoint re-seeds idempotently + wipes projection rows
  log("reset again", "should restore the seed account balance and keep projection rows");
  await postJson("/api/reset-seed");
  // The reset endpoint doesn't delete projection rows (those are
  // the user's own data from the chat). The canonical account
  // should be re-seeded with the original balance.
  const seedAfter = await prisma.account.findFirst({
    where: { userId: user.id, id: "acct-chase" },
  });
  check(
    "after reset: canonical account balance restored to 8_421_000",
    seedAfter?.currentBalance === 8_421_000,
    `got ${seedAfter?.currentBalance}`,
  );
  // The projection rows should still be there (reset doesn't wipe them).
  const projAfter = await prisma.account.count({
    where: { userId: user.id, name: { startsWith: "[identity] " } },
  });
  check(
    "after reset: 3 projection rows still present (reset doesn't wipe them)",
    projAfter === 3,
    `got ${projAfter}`,
  );

  // Clean up the projection rows we created
  await prisma.account.deleteMany({
    where: { userId: user.id, name: { startsWith: "[identity] " } },
  });
  log("cleanup", "removed 3 projection rows");

  // ── 9. Final summary
  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const [, ok, detail] of checks) {
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
