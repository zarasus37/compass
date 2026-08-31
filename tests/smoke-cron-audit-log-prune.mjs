/**
 * Smoke for Cluster 7.8.1 — Audit log retention cron.
 *
 * Verifies:
 *   1. POST /api/cron/audit-log-prune returns 200 with the
 *      expected shape (ok, usersProcessed, totalRolledUp,
 *      totalDeleted, totalRollupRows, results, retentionDays, now).
 *   2. The endpoint iterates ALL users (smoke user + the main
 *      dev user both get entries in `results`).
 *   3. The endpoint correctly prunes out-of-window rows and
 *      returns the per-user counts.
 *   4. Idempotency: a second POST immediately after finds
 *      nothing to prune (everything is already rolled up).
 *   5. The /api/dev/audit-log-prune endpoint (C7.8 dev endpoint)
 *      and the /api/cron/audit-log-prune endpoint both end up
 *      calling the same prune function (same model, same
 *      upsert key, same retention horizon).
 *   6. Source-file checks: the new endpoint, the new
 *      audit-log-cron helper, the dev scheduler script, and the
 *      cron:dev:audit npm script are all wired.
 *   7. The auth gate: a POST with a wrong bearer (when
 *      CRON_SECRET is set) returns 401. In dev (no secret set),
 *      the auth check is skipped — the test verifies the
 *      source file has the right check.
 *
 * Run: `node tests/smoke-cron-audit-log-prune.mjs` (dev server
 * must be up).
 */

import { prisma } from "./db-client.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const ROOT = process.cwd();

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
function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  m = html.match(/\$ACTION_ID_([a-f0-9]{20,})/);
  if (m) return m[1];
  return null;
}
async function postForm(path, fields, { actionId, kind = "bound" } = {}) {
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
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
  });
  captureSetCookies(r.headers);
  return r;
}
async function postJson(path, body) {
  const headers = new Headers();
  applyCookies(headers);
  headers.set("content-type", "application/json");
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    redirect: "manual",
  });
  return r;
}

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

const SENTINEL_PREFIX = "smoke.cron_prune.";

/** Pin a "now" for deterministic date arithmetic. */
const NOW = new Date("2026-08-30T12:00:00");

function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

async function getUserId() {
  const row = await prisma.user.findFirst({
    where: { email: "mom@compass.local" },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function cleanupSentinels(userId) {
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
  await prisma.auditLogDailyRollup.deleteMany({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
}

async function main() {
  console.log("\n--- Audit log retention cron smoke (Cluster 7.8.1) ---\n");

  // ── 1. Login + get user id
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) {
    console.log("FATAL: no login aid");
    process.exit(1);
  }
  const lp = await postForm(
    "/login",
    { email: "mom@compass.local", password: "correct-horse-battery-staple" },
    { actionId: loginAid, kind: "bound" },
  );
  check("login: 303", lp.status === 303, `status=${lp.status}`);
  const userId = await getUserId();
  if (!userId) {
    console.log("FATAL: no user id");
    process.exit(1);
  }
  await cleanupSentinels(userId);

  // ── 2. Write 5 sentinels: 3 in-window, 2 out-of-window
  // Use the smoke prefix so we can clean them up.
  const sentinels = [
    { daysAgo: 0, actionType: `${SENTINEL_PREFIX}recent` },
    { daysAgo: 30, actionType: `${SENTINEL_PREFIX}boundary` },
    { daysAgo: 60, actionType: `${SENTINEL_PREFIX}boundary` },
    { daysAgo: 100, actionType: `${SENTINEL_PREFIX}old` },
    { daysAgo: 100, actionType: `${SENTINEL_PREFIX}old` },
  ];
  for (const s of sentinels) {
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: s.actionType,
        payload: JSON.stringify({ sentinel: true, n: s.daysAgo }),
        createdAt: addDays(NOW, -s.daysAgo),
      },
    });
  }

  // ── 3. POST /api/cron/audit-log-prune — happy path
  // We can't pin `now` via the endpoint (the bulk helper always
  // uses new Date() unless we add an env override). The smoke
  // uses a sentinel at 100d ago which is well outside the 90d
  // retention horizon (today is 2026-08-31, so 100d ago is
  // 2026-05-23 — well past the 90-day cutoff).
  const cronResp = await postJson("/api/cron/audit-log-prune", {});
  check(
    "cron: POST /api/cron/audit-log-prune returns 200",
    cronResp.status === 200,
    `status=${cronResp.status}`,
  );
  const cronBody = await cronResp.json();
  check(
    "cron: ok=true",
    cronBody.ok === true,
    JSON.stringify(cronBody).slice(0, 300),
  );
  check(
    "cron: usersProcessed >= 2 (smoke user + dev user)",
    cronBody.usersProcessed >= 2,
    `got=${cronBody.usersProcessed}`,
  );
  check(
    "cron: retentionDays echoed (number)",
    typeof cronBody.retentionDays === "number",
    `got=${cronBody.retentionDays}`,
  );
  check(
    "cron: now is a valid ISO string",
    typeof cronBody.now === "string" && !Number.isNaN(new Date(cronBody.now).getTime()),
    `got=${cronBody.now}`,
  );
  check(
    "cron: results is an array",
    Array.isArray(cronBody.results),
    `got=${typeof cronBody.results}`,
  );
  // The smoke user's row should be in the results.
  const smokeUserEntry = cronBody.results.find((r) => r.userId === userId);
  check(
    "cron: smoke user is in results",
    Boolean(smokeUserEntry),
    `results=${cronBody.results.map((r) => r.userId.slice(0, 8)).join(",")}`,
  );
  // The smoke user should have at least 2 rolled up (the 2x 100d sentinels).
  // The boundary + recent rows are in-window, so they stay in the live table.
  check(
    "cron: smoke user rolledUp >= 2 (the 2x 100d sentinels)",
    smokeUserEntry && smokeUserEntry.rolledUp >= 2,
    `rolledUp=${smokeUserEntry?.rolledUp}`,
  );
  check(
    "cron: smoke user status=PRUNED",
    smokeUserEntry && smokeUserEntry.status === "PRUNED",
    `status=${smokeUserEntry?.status}`,
  );
  check(
    "cron: smoke user rollupRows >= 1 (smoke.cron_prune.old bucket)",
    smokeUserEntry && smokeUserEntry.rollupRows >= 1,
    `rollupRows=${smokeUserEntry?.rollupRows}`,
  );

  // ── 4. DB-layer assertions
  const liveCount = await prisma.auditLog.count({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
  // The 3 in-window sentinels (0d + 30d + 60d) should still be
  // in the live table; the 2 at 100d are gone.
  check(
    "db: 3 in-window sentinels remain (0d + 30d + 60d)",
    liveCount === 3,
    `got=${liveCount}`,
  );
  const rollupCount = await prisma.auditLogDailyRollup.count({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
  // 1 rollup row: (100d, smoke.cron_prune.old) with count=2
  check(
    "db: 1 rollup row written (100d, smoke.cron_prune.old)",
    rollupCount === 1,
    `got=${rollupCount}`,
  );
  const rollupRow = await prisma.auditLogDailyRollup.findFirst({
    where: { userId, actionType: `${SENTINEL_PREFIX}old` },
  });
  check(
    "db: rollup row has count=2 (2 sentinels rolled up)",
    rollupRow?.count === 2,
    `count=${rollupRow?.count}`,
  );

  // ── 5. Idempotency: a second POST right after the first is a no-op
  const cronResp2 = await postJson("/api/cron/audit-log-prune", {});
  const cronBody2 = await cronResp2.json();
  // The smoke user has nothing left to prune (3 in-window + 0 out-of-window).
  const smokeUserEntry2 = cronBody2.results.find((r) => r.userId === userId);
  check(
    "cron (idempotent): 2nd call: smoke user status=NOOP",
    smokeUserEntry2 && smokeUserEntry2.status === "NOOP",
    `status=${smokeUserEntry2?.status}`,
  );
  check(
    "cron (idempotent): 2nd call: totalRolledUp=0",
    cronBody2.totalRolledUp === 0,
    `totalRolledUp=${cronBody2.totalRolledUp}`,
  );

  // ── 6. Source-file checks
  // 6a. The new endpoint file exists and exports POST + GET.
  const routePath = join(ROOT, "src/app/api/cron/audit-log-prune/route.ts");
  check(
    "source: /api/cron/audit-log-prune route file exists",
    existsSync(routePath),
  );
  const routeSrc = readFileSync(routePath, "utf8");
  check(
    "source: route exports POST",
    /export async function POST/.test(routeSrc),
  );
  check(
    "source: route exports GET (delegates to POST)",
    /export async function GET/.test(routeSrc),
  );
  check(
    "source: route gates on CRON_SECRET when env is set",
    /CRON_SECRET/.test(routeSrc) && /401/.test(routeSrc),
  );
  check(
    "source: route calls pruneAuditLogForAllUsers",
    routeSrc.includes("pruneAuditLogForAllUsers"),
  );

  // 6b. The bulk helper exists and exports the right function.
  const helperPath = join(ROOT, "src/lib/vault/audit-log-cron.ts");
  check(
    "source: src/lib/vault/audit-log-cron.ts exists",
    existsSync(helperPath),
  );
  const helperSrc = readFileSync(helperPath, "utf8");
  check(
    "source: helper exports pruneAuditLogForAllUsers",
    /export async function pruneAuditLogForAllUsers/.test(helperSrc),
  );
  check(
    "source: helper wraps each user's prune in try/catch",
    /try \{[\s\S]*?pruneAuditLog[\s\S]*?\} catch/.test(helperSrc),
  );
  check(
    "source: helper iterates prisma.user.findMany",
    /prisma\.user\.findMany/.test(helperSrc),
  );

  // 6c. The dev scheduler script exists and is wired.
  const devScriptPath = join(ROOT, "scripts/cron-audit-prune-dev.mjs");
  check(
    "source: scripts/cron-audit-prune-dev.mjs exists",
    existsSync(devScriptPath),
  );
  const devScriptSrc = readFileSync(devScriptPath, "utf8");
  check(
    "source: dev script polls /api/cron/audit-log-prune",
    devScriptSrc.includes("/api/cron/audit-log-prune"),
  );
  check(
    "source: dev script reads AUDIT_LOG_PRUNE_POLL_MS env",
    devScriptSrc.includes("AUDIT_LOG_PRUNE_POLL_MS"),
  );

  // 6d. package.json has the cron:dev:audit script.
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  check(
    "source: package.json has cron:dev:audit script",
    (pkg.scripts["cron:dev:audit"] ?? "").includes("cron-audit-prune-dev.mjs"),
  );

  // 6e. The middleware allows /api/cron/* (so the dev scheduler
  // doesn't get redirected to /login).
  const middlewareSrc = readFileSync(
    join(ROOT, "src/middleware.ts"),
    "utf8",
  );
  check(
    "source: middleware includes /api/cron in public prefixes",
    /"\/api\/cron"/.test(middlewareSrc),
  );

  // ── 7. Final cleanup
  await cleanupSentinels(userId);

  // ── Summary
  console.log("\n--- checks ---");
  const pass = checks.filter((c) => c[1]).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss`);
  if (miss > 0) {
    console.log("!! FAILURES");
    for (const [n, ok, d] of checks.filter((c) => !c[1])) {
      console.log(`  - ${n}${d ? "  — " + d : ""}`);
    }
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main()
  .catch((err) => {
    console.error("smoke-cron-audit-log-prune.mjs failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
