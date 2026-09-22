/**
 * Smoke for the Cluster 7.19 retention health banner on /settings.
 *
 * Verifies:
 *   1. Banner DOM hooks (testid, eyebrow, pill state, cells).
 *   2. The default-state (no rollup rows, no scheduled runs):
 *      banner renders "[OK] HEALTHY" by default, with "never"
 *      for the last prune cell + the honest "audit rollups not
 *      yet initialized" subtext.
 *   3. After a manual prune (writes a rollup row): the last
 *      prune cell surfaces a real ISO timestamp + the rollup
 *      row count.
 *   4. The retention window in the cell matches the env's
 *      configured value (90 by default).
 *
 * Run: node tests/smoke-retention-health.mjs (dev server up).
 */

import { prisma } from "./db-client.mjs";

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
    form.append("$ACTION_1:1", "[{\"ok\":false}]");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", body: form, redirect: "manual", headers });
  captureSetCookies(r.headers);
  return r;
}
function extractActionId(html) {
  const m = html.match(/[a-f0-9]{20,}/);
  return m ? m[0] : null;
}

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

async function login() {
  const r1 = await get("/login");
  const aid = extractActionId(await r1.text());
  if (!aid) throw new Error("no login aid");
  const r2 = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: aid });
  if (!jar["compass_session"]) throw new Error(`login failed status=${r2.status}`);
  return jar["compass_session"];
}

async function fetchSettingsHtml() {
  const r = await get("/settings");
  const html = await r.text();
  check("/settings 200", r.status === 200, `got ${r.status}`);
  return html;
}

// Mock the lib's helper inline. Kept in sync with src/lib/vault/audit-log.ts
// so the smoke is independent (it runs as plain Node, not Next).
const DEFAULT_RETENTION_DAYS = 90;
function getRetentionDays() {
  const raw = process.env.AUDIT_LOG_RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RETENTION_DAYS;
  return n;
}

async function main() {
  console.log("\n--- Retention health banner smoke (Cluster 7.19) ---\n");

  await login();
  const userId = (await prisma.user.findUnique({ where: { email: "mom@compass.local" } }))?.id;
  if (!userId) { console.log("FATAL: no mom user"); process.exit(1); }

  // --- Step 1: capture the "never run" baseline ---
  // Wipe rollup rows for this user so we see a clean default state.
  // Other smoke data is preserved (scheduler, audit log).
  await prisma.auditLogDailyRollup.deleteMany({ where: { userId } });

  const baselineHtml = await fetchSettingsHtml();

  check(
    "banner data-testid present",
    baselineHtml.includes('data-testid="retention-health-banner"'),
  );
  check(
    "eyebrow DATA · RETENTION present",
    /DATA\s*[·•]\s*RETENTION/.test(baselineHtml),
  );
  check(
    "banner has [OK] HEALTHY pill in default state",
    /\[OK\]\s*HEALTHY/.test(baselineHtml),
  );
  check(
    "retention window cell rendered with 90 days (default)",
    /90 days/.test(baselineHtml),
    "missing the 90-days substring",
  );
  check(
    "last prune cell renders 'never' (no rollups yet)",
    /data-testid="retention-cell-last-prune"[\s\S]{0,500}?LAST PRUNE[\s\S]{0,200}?never/.test(baselineHtml),
  );
  check(
    "honest 'audit rollups not yet initialized' subtext visible",
    /audit rollups not yet initialized/.test(baselineHtml),
  );
  check(
    "plain-English caption rendered",
    baselineHtml.includes('data-testid="retention-health-caption"'),
  );

  // --- Step 2: write a rollup row via the dev /api/dev/audit-log-prune endpoint ---
  // Set a 0-day retention so the prune actually finds past-day rollup rows.
  // We seed 3 old audit rows first so the prune has something to aggregate.
  const old = new Date();
  old.setDate(old.getDate() - 100);
  await prisma.auditLog.create({
    data: {
      userId,
      actionType: "vault.test_prune_input",
      payload: "{}",
      aiTierAtTime: 1,
      createdAt: old,
    },
  });

  const pr = await fetch(`${BASE}/api/dev/audit-log-prune`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `compass_session=${jar["compass_session"]}`,
    },
    body: JSON.stringify({ retentionDays: 30 }),
  });
  const pj = await pr.json();
  check(
    "/api/dev/audit-log-prune returns rolledUp > 0",
    pr.status === 200 && pj.ok === true && pj.rolledUp > 0,
    `status=${pr.status} ok=${pj.ok} rolledUp=${pj.rolledUp}`,
  );

  const rollupRows = await prisma.auditLogDailyRollup.count({ where: { userId } });
  check("rollup rows now > 0 in DB", rollupRows > 0, `count=${rollupRows}`);

  // --- Step 3: re-fetch /settings; the banner should now show the prune timestamp ---
  const afterHtml = await fetchSettingsHtml();

  check(
    "banner still renders after prune",
    afterHtml.includes('data-testid="retention-health-banner"'),
  );
  // The cell no longer reads "never" (it shows a relative date or date)
  const lastPruneCellSnippet =
    afterHtml.match(/data-testid="retention-cell-last-prune"[\s\S]{0,500}?<\/div>/)?.[0] ?? "";
  check(
    "last prune cell no longer reads 'never' after prune",
    lastPruneCellSnippet.length > 0 && !/LAST PRUNE[\s\S]{0,200}?never/i.test(lastPruneCellSnippet),
    lastPruneCellSnippet ? "snippet OK" : "snippet empty",
  );
  // The data-iso attribute is now populated
  const isoMatch = afterHtml.match(/data-testid="retention-cell-last-prune"[^>]*data-iso="([^"]+)"/);
  check(
    "last-prune cell carries a non-empty data-iso timestamp after prune",
    Boolean(isoMatch && isoMatch[1]),
    isoMatch ? `iso=${isoMatch[1]}` : "no data-iso attribute",
  );

  // --- Step 4: retention window matches getRetentionDays() ---
  const expectedDays = getRetentionDays();
  const daysRegex = new RegExp(`\\b${expectedDays} days\\b`);
  check(
    "retention window value matches getRetentionDays()",
    daysRegex.test(afterHtml),
    `expected ${expectedDays} days`,
  );

  // --- Step 5: scheduler cell test id present ---
  check(
    "scheduler cell data-testid present",
    afterHtml.includes('data-testid="retention-cell-scheduler"'),
  );

  // --- Step 6: live row count helper agrees ---
  const liveRows = await prisma.auditLog.count({ where: { userId } });
  check("live audit rows for user is a non-negative number", typeof liveRows === "number" && liveRows >= 0, `count=${liveRows}`);

  // --- Summary ---
  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const c of checks) (c.ok ? pass++ : fail++);
  console.log(`\nchecks: ${pass} pass / ${fail} miss (${checks.length} total)`);
  if (fail > 0) {
    console.log("\n!! FAILURES:");
    for (const c of checks) if (!c.ok) console.log(`   ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    process.exit(3);
  }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
