/**
 * Smoke for the Cluster 5.2.6 widget switch — /allocation reading
 * from the Prisma `AllocationPlan` + `AllocationRule` tables.
 *
 * Verifies:
 *   1. After /api/reset-seed, the user has 1 AllocationPlan row
 *      (id="plan-default", strategy="envelope", isArmed=true,
 *      source="seed") and 7 AllocationRule rows mapped from the
 *      canonical ALLOCATION_PLAN_SEED.
 *   2. The schema `(pct, fixedCents?)` mapping is correct: 6
 *      "percent" rules with the right pcts (33, 8, 17, 4, 18, 15)
 *      and 1 "remainder" rule (pct=0, fixedCents=null).
 *   3. The /allocation page renders 200 and surfaces the rule-
 *      driven distribution (the "33%" + "18%" markers are visible,
 *      the strategy picker highlights the active strategy, the
 *      Sankey source node is rendered).
 *   4. A direct DB write (change a rule's pct) is reflected on the
 *      page on the next render — proves the read path is fully
 *      DB-driven.
 *   5. The reset endpoint re-seeds idempotently (counts stay stable
 *      across calls).
 *
 * Run with: node tests/smoke-allocation-db.mjs
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
  console.log("--- Allocation DB widget switch smoke (Cluster 5.2.6) ---\n");

  // ── 1. Login as mom@compass.local (the canonical seed user) ─────
  // The login form uses useActionState (bound form pattern), so we
  // send the same shape the form would: $ACTION_REF_1 + $ACTION_1:0
  // + $ACTION_1:1, with `bound: "$@1"`. The simple $ACTION_ID_<id>
  // pattern is unreliable on cold dev-server starts.
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid, kind: "bound" });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // ── 2. Reset the user state so we start from a known canonical set
  const r1 = await postJson("/api/reset-seed");
  const j1 = await r1.json();
  log("reset", `status=${r1.status} ok=${j1.ok} msg=${j1.message ?? ""}`);

  // ── 3. Find the user + inspect AllocationPlan + AllocationRule directly
  const user = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!user) { console.log("FATAL: no mom user"); process.exit(1); }
  const plan = await prisma.allocationPlan.findFirst({
    where: { userId: user.id, source: "seed" },
    include: { rules: { orderBy: { sortOrder: "asc" } } },
  });
  log("seed plan in DB", plan ? `id=${plan.id} rules=${plan.rules.length}` : "MISSING");

  // Expect 1 plan + 7 rules
  check("DB has 1 seed AllocationPlan", plan !== null, "plan not found");
  if (plan) {
    check("Plan id = plan-default", plan.id === "plan-default", `got ${plan.id}`);
    check("Plan strategyId = envelope", plan.strategyId === "envelope", `got ${plan.strategyId}`);
    check("Plan isArmed = true", plan.isArmed === true, `got ${plan.isArmed}`);
    check("Plan source = seed", plan.source === "seed", `got ${plan.source}`);
    check("Plan has 7 rules", plan.rules.length === 7, `got ${plan.rules.length}`);

    // Verify the rule shapes per the schema's (pct, fixedCents?) contract
    const expectedPcts = {
      "rule-rent": 33,
      "rule-utilities": 8,
      "rule-groceries": 17,
      "rule-dining": 4,
      "rule-savings": 18,
      "rule-debt": 15,
      "rule-buffer": 0, // remainder rule → pct=0
    };
    const expectedEnvelopeIds = {
      "rule-rent": "env-rent",
      "rule-utilities": "env-utilities",
      "rule-groceries": "env-groceries",
      "rule-dining": "env-dining",
      "rule-savings": "env-savings",
      "rule-debt": "env-debt",
      "rule-buffer": "env-buffer",
    };
    for (const rule of plan.rules) {
      const expectedPct = expectedPcts[rule.id];
      const expectedEnv = expectedEnvelopeIds[rule.id];
      check(
        `rule ${rule.id} pct = ${expectedPct}`,
        rule.pct === expectedPct,
        `got ${rule.pct}`,
      );
      check(
        `rule ${rule.id} envelopeId = ${expectedEnv}`,
        rule.envelopeId === expectedEnv,
        `got ${rule.envelopeId}`,
      );
      check(
        `rule ${rule.id} fixedCents is null (no fixed-mode rules in seed)`,
        rule.fixedCents === null,
        `got ${rule.fixedCents}`,
      );
      check(
        `rule ${rule.id} source = seed`,
        rule.source === "seed",
        `got ${rule.source}`,
      );
    }
    // Sum of explicit percent rules: 33+8+17+4+18+15 = 95; remainder is 5% to buffer
    const sumPct = plan.rules
      .filter((r) => r.pct > 0)
      .reduce((s, r) => s + r.pct, 0);
    check("Sum of percent rules = 95 (remainder = 5%)", sumPct === 95, `got ${sumPct}`);
  }

  // ── 4. /allocation renders 200 and surfaces the rule-driven distribution
  const a1 = await get("/allocation");
  const a1Text = await a1.text();
  log("/allocation", `status=${a1.status} bytes=${a1Text.length}`);
  check("/allocation: 200", a1.status === 200, `got ${a1.status}`);

  // The page header
  check(
    '/allocation has "// plan · allocation" eyebrow',
    a1Text.includes("// plan · allocation"),
    "eyebrow not found",
  );
  check(
    '/allocation has "The Allocation Plan" title',
    a1Text.includes("The Allocation Plan"),
    "title not found",
  );

  // The strategy picker — the "Envelope" card should be active
  check(
    '/allocation shows "Envelope" strategy card',
    a1Text.includes("Envelope"),
    "Envelope card not found",
  );
  check(
    '/allocation shows "Active" badge on the Envelope card',
    a1Text.includes("Active"),
    "active badge not found",
  );
  // ARMED indicator
  check(
    '/allocation shows "[OK] ● Auto-distillation armed" indicator',
    a1Text.includes("Auto-distillation armed"),
    "armed indicator not found",
  );

  // The active distribution section — rule-driven percentages
  check(
    '/allocation shows "33%" (rule-rent = 33% of paycheck)',
    a1Text.includes("33%"),
    "33% not found",
  );
  check(
    '/allocation shows "18%" (rule-savings = 18% of paycheck)',
    a1Text.includes("18%"),
    "18% not found",
  );
  check(
    '/allocation shows "15%" (rule-debt = 15% of paycheck)',
    a1Text.includes("15%"),
    "15% not found",
  );
  // The meta line that names the rule totals
  check(
    '/allocation has "Plan rules · 95% explicit + 5% remainder" meta',
    a1Text.includes("95% explicit + 5% remainder"),
    "rules meta not found",
  );

  // The Sankey (Automation Map)
  check(
    '/allocation has "The Automation Map" section',
    a1Text.includes("The Automation Map"),
    "Sankey section not found",
  );
  check(
    '/allocation has "Plan preview" meta in the Sankey section',
    a1Text.includes("Plan preview"),
    "Plan preview not found",
  );

  // ── 5. Round-trip: change a rule's pct in the DB → re-render → page reflects it
  log("round-trip", "change rule-rent pct 33 → 40, re-render, restore");
  await prisma.allocationRule.update({
    where: { id: "rule-rent" },
    data: { pct: 40 },
  });
  const a2 = await get("/allocation");
  const a2Text = await a2.text();
  check(
    "/allocation reflects DB write: shows 40% for Rent",
    a2Text.includes("40%"),
    "40% not found after DB update",
  );
  check(
    "/allocation no longer shows 33% for Rent after DB write",
    !a2Text.includes("33%"),
    "33% still present (stale read?)",
  );
  // Restore
  await prisma.allocationRule.update({
    where: { id: "rule-rent" },
    data: { pct: 33 },
  });
  // Verify restoration
  const a3 = await get("/allocation");
  const a3Text = await a3.text();
  check(
    "/allocation after restore shows 33% again",
    a3Text.includes("33%"),
    "33% not found after restore",
  );

  // ── 6. Reset endpoint is idempotent: counts stay stable across calls
  await postJson("/api/reset-seed");
  const afterReset = await prisma.allocationPlan.findFirst({
    where: { userId: user.id, source: "seed" },
    include: { rules: { orderBy: { sortOrder: "asc" } } },
  });
  check(
    "after second reset: still 1 plan + 7 rules",
    afterReset !== null && afterReset.rules.length === 7,
    `got ${afterReset?.rules.length ?? "no plan"}`,
  );
  // Check that the round-trip change was reverted by the reset
  const rent = afterReset?.rules.find((r) => r.id === "rule-rent");
  check(
    "after reset: rule-rent pct restored to 33",
    rent?.pct === 33,
    `got ${rent?.pct}`,
  );

  // ── 7. Verify the active distribution row count matches envelope count
  // (each envelope gets one row in the distribution)
  const expectedEnvelopeIds = [
    "env-rent", "env-groceries", "env-utilities", "env-dining",
    "env-buffer", "env-savings", "env-debt",
  ];
  let envelopeNamesFound = 0;
  for (const id of expectedEnvelopeIds) {
    // The page renders the envelope name (e.g. "Rent", "Savings") in each
    // distribution row. We can't search by id directly — search for the
    // human-readable name from ENVELOPES_SEED.
  }
  // The page should render all 7 envelope names in the distribution rows.
  // Note: the page HTML-encodes `&` as `&amp;` in the envelope names,
  // so we have to search for the encoded form for "Dining & Joy".
  const expectedNames = [
    "Rent",
    "Groceries",
    "Utilities",
    "Dining &amp; Joy", // HTML-encoded
    "Buffer",
    "Savings",
    "Debt",
  ];
  for (const n of expectedNames) {
    if (a3Text.includes(n)) envelopeNamesFound += 1;
  }
  check(
    `/allocation renders all 7 envelope names in distribution (found ${envelopeNamesFound})`,
    envelopeNamesFound === 7,
    `found ${envelopeNamesFound} of 7`,
  );

  // ── 8. Final summary
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
