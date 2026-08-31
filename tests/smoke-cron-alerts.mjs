/**
 * Smoke for Cluster 7.10 — Cron alert surface.
 *
 * Verifies:
 *   1. POST /api/dev/cron-alerts writes a
 *      `vault.cron_prune_failure` audit row for the user
 *      (the durable record).
 *   2. GET /api/dev/cron-alerts returns recent alerts; the
 *      just-written alert is in the list.
 *   3. The alert's payload has the right shape
 *      (`kind`, `error`, `context`, `at`).
 *   4. The dev endpoint is gated by `NODE_ENV` (source check).
 *   5. The bulk prune function calls `recordCronAlert` for
 *      each ERROR (source check — the integration test
 *      verifies the wiring; the actual error path is hard
 *      to trigger in a smoke).
 *   6. The webhook adapter supports Sentry, PagerDuty, and
 *      generic JSON formats (source check).
 *   7. The new `vault.cron_prune_failure` action type is in
 *      the `recordVaultAudit` union.
 *   8. The recent-alerts endpoint respects `?limit=`.
 *
 * The webhook itself is NOT verified end-to-end in this
 * smoke (it would require either (a) a mock HTTP server
 * reachable from the dev server's process, or (b)
 * running the dev server with `CRON_ALERT_WEBHOOK_URL`
 * set). The webhook code path is covered by source-file
 * checks; the user verifies it in production by setting
 * the env var and watching the receiver.
 *
 * Run: `node tests/smoke-cron-alerts.mjs` (dev server must
 * be up).
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
  m = html.match(/[$]ACTION_ID_([a-f0-9]{20,})/);
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
  return { status: r.status, body: await r.json() };
}

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

const SENTINEL_PREFIX = "smoke.cron_alert.";
const ALERT_SENTINEL = `${SENTINEL_PREFIX}test_error_message`;

async function getUserId() {
  const row = await prisma.user.findFirst({
    where: { email: "mom@compass.local" },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function cleanupSentinels(userId) {
  await prisma.auditLog.deleteMany({
    where: {
      userId,
      actionType: "vault.cron_prune_failure",
      payload: { contains: SENTINEL_PREFIX },
    },
  });
}

async function main() {
  console.log("\n--- Cron alert smoke (Cluster 7.10) ---\n");

  // ── 1. Login + cleanup
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

  // ── 2. POST /api/dev/cron-alerts — write a fake alert
  const postResp = await postJson("/api/dev/cron-alerts", {
    error: ALERT_SENTINEL,
    context: { sentinel: true, retentionDays: 90, source: "smoke" },
  });
  check(
    "dev: POST /api/dev/cron-alerts returns 200",
    postResp.status === 200,
    `status=${postResp.status}`,
  );
  check(
    "dev: POST body has ok=true",
    postResp.body?.ok === true,
    JSON.stringify(postResp.body).slice(0, 200),
  );
  check(
    "dev: POST echoes the error message",
    postResp.body?.error === ALERT_SENTINEL,
    `echoed=${postResp.body?.error}`,
  );

  // ── 3. GET /api/dev/cron-alerts — read the alert back
  const getResp = await get("/api/dev/cron-alerts?limit=20");
  check(
    "dev: GET /api/dev/cron-alerts returns 200",
    getResp.status === 200,
    `status=${getResp.status}`,
  );
  const getBody = await getResp.json();
  check(
    "dev: GET body has ok=true",
    getBody?.ok === true,
    JSON.stringify(getBody).slice(0, 200),
  );
  check(
    "dev: GET body has alerts array",
    Array.isArray(getBody?.alerts),
    `alerts=${typeof getBody?.alerts}`,
  );
  check(
    "dev: GET body has count (number)",
    typeof getBody?.count === "number",
    `count=${getBody?.count}`,
  );

  // The just-written alert should be in the list.
  const ourAlert = (getBody.alerts ?? []).find(
    (a) => a.payload?.error === ALERT_SENTINEL,
  );
  check(
    "dev: the just-written alert is in the GET response",
    Boolean(ourAlert),
    `ourAlert=${JSON.stringify(ourAlert)}`,
  );
  check(
    "dev: alert actionType is vault.cron_prune_failure",
    ourAlert?.actionType === "vault.cron_prune_failure",
    `actionType=${ourAlert?.actionType}`,
  );
  check(
    "dev: alert payload has kind=prune_failure",
    ourAlert?.payload?.kind === "prune_failure",
    `kind=${ourAlert?.payload?.kind}`,
  );
  check(
    "dev: alert payload has the error message",
    ourAlert?.payload?.error === ALERT_SENTINEL,
    `error=${ourAlert?.payload?.error}`,
  );
  check(
    "dev: alert payload has context (sentinel: true)",
    ourAlert?.payload?.context?.sentinel === true,
    `context=${JSON.stringify(ourAlert?.payload?.context)}`,
  );
  check(
    "dev: alert payload has at (ISO string)",
    typeof ourAlert?.payload?.at === "string" &&
      !Number.isNaN(new Date(ourAlert.payload.at).getTime()),
    `at=${ourAlert?.payload?.at}`,
  );

  // ── 4. DB-layer assertion — the audit row is the durable record
  const auditRows = await prisma.auditLog.findMany({
    where: {
      userId,
      actionType: "vault.cron_prune_failure",
      payload: { contains: ALERT_SENTINEL },
    },
  });
  check(
    "db: 1 audit row written for the alert",
    auditRows.length === 1,
    `count=${auditRows.length}`,
  );
  check(
    "db: audit row has the right userId",
    auditRows[0]?.userId === userId,
    `row.userId=${auditRows[0]?.userId}`,
  );

  // ── 5. ?limit= parameter is respected
  const limitResp = await get("/api/dev/cron-alerts?limit=1");
  const limitBody = await limitResp.json();
  check(
    "dev: GET ?limit=1 returns at most 1 alert",
    (limitBody.alerts ?? []).length <= 1,
    `returned=${(limitBody.alerts ?? []).length}`,
  );

  // ── 6. Source-file checks
  // 6a. The alert adapter exists and exports the right functions.
  const adapterPath = join(ROOT, "src/lib/vault/audit-log-alerts.ts");
  check(
    "source: src/lib/vault/audit-log-alerts.ts exists",
    existsSync(adapterPath),
  );
  const adapterSrc = readFileSync(adapterPath, "utf8");
  check(
    "source: adapter exports recordCronAlert",
    /export async function recordCronAlert/.test(adapterSrc),
  );
  check(
    "source: adapter exports getRecentCronAlerts",
    /export async function getRecentCronAlerts/.test(adapterSrc),
  );
  check(
    "source: adapter reads CRON_ALERT_WEBHOOK_URL env",
    adapterSrc.includes("CRON_ALERT_WEBHOOK_URL"),
  );
  check(
    "source: adapter supports Sentry URL detection",
    adapterSrc.includes("sentry.io"),
  );
  check(
    "source: adapter supports PagerDuty URL detection",
    adapterSrc.includes("pagerduty.com"),
  );
  check(
    "source: adapter has a 2s webhook timeout",
    /WEBHOOK_TIMEOUT_MS\s*=\s*2_000/.test(adapterSrc),
  );
  check(
    "source: adapter masks the URL when logging failures",
    adapterSrc.includes("maskUrl"),
  );

  // 6b. The dev endpoint file exists and exports POST + GET.
  const devRoutePath = join(ROOT, "src/app/api/dev/cron-alerts/route.ts");
  check(
    "source: /api/dev/cron-alerts/route.ts exists",
    existsSync(devRoutePath),
  );
  const devRouteSrc = readFileSync(devRoutePath, "utf8");
  check(
    "source: dev endpoint exports POST",
    /export async function POST/.test(devRouteSrc),
  );
  check(
    "source: dev endpoint exports GET",
    /export async function GET/.test(devRouteSrc),
  );
  check(
    "source: dev endpoint is gated by NODE_ENV",
    /NODE_ENV\s*[!=]==?\s*["']development["']/.test(devRouteSrc),
  );
  check(
    "source: dev endpoint uses requireUser",
    devRouteSrc.includes("requireUser"),
  );

  // 6c. The action type is in the recordVaultAudit union.
  const dbPath = join(ROOT, "src/lib/vault/db.ts");
  const dbSrc = readFileSync(dbPath, "utf8");
  check(
    "source: recordVaultAudit union includes vault.cron_prune_failure",
    /vault\.cron_prune_failure/.test(dbSrc),
  );

  // 6d. The bulk prune helper calls recordCronAlert for ERRORs.
  const cronHelperPath = join(ROOT, "src/lib/vault/audit-log-cron.ts");
  const cronHelperSrc = readFileSync(cronHelperPath, "utf8");
  check(
    "source: audit-log-cron imports recordCronAlert",
    /from\s+["']\.\/audit-log-alerts["']/.test(cronHelperSrc),
  );
  check(
    "source: bulk prune records alerts for ERRORs",
    /recordCronAlert/.test(cronHelperSrc) &&
      /status\s*===\s*["']ERROR["']/.test(cronHelperSrc),
  );
  check(
    "source: bulk prune uses Promise.allSettled for alerts",
    /Promise\.allSettled/.test(cronHelperSrc),
  );

  // 6e. The audit page renders the new action type (the
  // vault.cron_prune_failure rows show up in the table).
  // The page's colorForActionType in audit-log-shared.ts
  // doesn't need to know about the new type — it falls
  // through the djb2 hash. We just check the page renders
  // the table.
  const auditPage = await get("/vault/audit?type=smoke.cron_alert.test_error_message");
  const auditHtml = await auditPage.text();
  check(
    "audit page: filter by sentinel actionType renders 200",
    auditPage.status === 200,
    `status=${auditPage.status}`,
  );
  check(
    "audit page: vault.cron_prune_failure row is in the table",
    auditHtml.includes("vault.cron_prune_failure") || auditHtml.includes(ALERT_SENTINEL),
    `len=${auditHtml.length}`,
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
    console.error("smoke-cron-alerts.mjs failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
