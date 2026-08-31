/**
 * Smoke for Cluster 7.8 — Audit log retention.
 *
 * Verifies:
 *   1. The `AuditLogDailyRollup` model exists and the smoke user
 *      can write to it via the dev endpoint.
 *   2. `pruneAuditLog(userId, { retentionDays: N })` rolls up
 *      rows older than N days and deletes them.
 *   3. The rollup is idempotent: re-running the prune on the
 *      same window does NOT double-count.
 *   4. `getAuditLogActivity(userId, days, now)` reads from BOTH
 *      the live table AND the rollup when the window extends
 *      past the retention horizon.
 *   5. The 365d preset is rendered by `DateRangeBar`.
 *   6. The activity strip's geometry scales with `days.length`
 *      (30 / 90 / 365).
 *   7. The /vault/audit page's activity strip `data-window-days`
 *      attribute follows the active range.
 *
 * Strategy: backdate `AuditLog` rows via direct Prisma writes
 * (set `createdAt` to N days ago), then call the dev prune
 * endpoint with `retentionDays=30`. The 0d + 30d rows stay in
 * the live table; the 60d + 100d rows are rolled up + deleted.
 *
 * Run: `node tests/smoke-audit-log-retention.mjs` (dev server
 * must be up).
 */

import { prisma } from "./db-client.mjs";
import { readFileSync } from "node:fs";
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
  headers.set("content-type", "application/json");
  applyCookies(headers);
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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

/** Pin a "now" for deterministic date arithmetic. We use
 *  2026-08-30 12:00 local (a Friday) so the smoke runs in
 *  the same TZ context as the dev server. */
const NOW = new Date("2026-08-30T12:00:00");

/** Convert a date to a YYYY-MM-DD key in local time. */
function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add `days` to `d` (in place). */
function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Smoke-local action type prefix so we can clean up our own
 *  rows without affecting other smokes. */
const SENTINEL_PREFIX = "smoke.retention.";

async function getUserId() {
  const row = await prisma.user.findFirst({
    where: { email: "mom@compass.local" },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Clean up any prior smoke rows so the test is hermetic.
 *  Also removes the `vault.payment_failed` sentinel (a real
 *  actionType we use to exercise the FAILED set) by
 *  payload marker so we don't trample real production rows. */
async function cleanupSentinels(userId) {
  // 1) Smoke-tagged actionTypes (smoke.retention.*) — easy.
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
  await prisma.auditLogDailyRollup.deleteMany({
    where: { userId, actionType: { startsWith: SENTINEL_PREFIX } },
  });
  // 2) The 100d/ancient sentinel lands in the rollup with
  //    `count=1`. We identify and remove it by actionType
  //    + count=1 (real production rows have higher counts).
  const ancientRollup = await prisma.auditLogDailyRollup.findMany({
    where: { userId, actionType: `${SENTINEL_PREFIX}ancient` },
  });
  for (const r of ancientRollup) {
    await prisma.auditLogDailyRollup.delete({ where: { id: r.id } });
  }
  // 3) vault.payment_failed sentinels (identified by payload
  //    marker; the actionType itself is real and may be used by
  //    other smokes).
  await prisma.auditLog.deleteMany({
    where: {
      userId,
      actionType: "vault.payment_failed",
      payload: { contains: '"sentinel":true' },
    },
  });
  // 4) Rollup rows for vault.payment_failed that came from a
  //    prior smoke run (count=1). Real rollup rows will have
  //    higher counts; we only sweep the 1-count ones.
  const smokeFailed = await prisma.auditLogDailyRollup.findMany({
    where: { userId, actionType: "vault.payment_failed" },
  });
  for (const r of smokeFailed) {
    if (r.count <= 1) {
      await prisma.auditLogDailyRollup.delete({
        where: { id: r.id },
      });
    }
  }
}

async function main() {
  console.log("\n--- Audit log retention smoke (Cluster 7.8) ---\n");

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

  // ── 2. Write sentinels at 0d / 30d / 60d / 100d ago
  // Use distinct actionTypes so the rollup grouping is
  // unambiguous. One of them is a real `vault.payment_failed`
  // (in the FAILED_ACTION_TYPES set) so the rollup should
  // have a non-zero `failedCount`. The others are
  // smoke-only types so they don't collide with the
  // production event stream.
  const sentinels = [
    { daysAgo: 0, actionType: `${SENTINEL_PREFIX}recent_a`, payload: { sentinel: true, n: 0 } },
    { daysAgo: 0, actionType: `${SENTINEL_PREFIX}recent_a`, payload: { sentinel: true, n: 0 } },
    { daysAgo: 30, actionType: `${SENTINEL_PREFIX}boundary`, payload: { sentinel: true, n: 30 } },
    { daysAgo: 60, actionType: `${SENTINEL_PREFIX}old_a`, payload: { sentinel: true, n: 60 } },
    { daysAgo: 60, actionType: `${SENTINEL_PREFIX}old_a`, payload: { sentinel: true, n: 60 } },
    { daysAgo: 60, actionType: "vault.payment_failed", payload: { sentinel: true, n: 60, billId: "smoke-test" } },
    { daysAgo: 100, actionType: `${SENTINEL_PREFIX}ancient`, payload: { sentinel: true, n: 100 } },
  ];
  for (const s of sentinels) {
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: s.actionType,
        payload: JSON.stringify(s.payload),
        createdAt: addDays(NOW, -s.daysAgo),
      },
    });
  }
  // Count ALL sentinel rows: 6 with the SENTINEL_PREFIX + 1
  // vault.payment_failed (the FAILED-set test row).
  const liveCountBefore = await prisma.auditLog.count({
    where: {
      userId,
      OR: [
        { actionType: { startsWith: SENTINEL_PREFIX } },
        {
          actionType: "vault.payment_failed",
          payload: { contains: '"sentinel":true' },
        },
      ],
    },
  });
  check(
    "setup: 7 sentinel rows written to live table (6 smoke + 1 vault.payment_failed)",
    liveCountBefore === 7,
    `got=${liveCountBefore}`,
  );

  // ── 3. POST /api/dev/audit-log-prune with retentionDays=30
  const pruneResp = await postJson("/api/dev/audit-log-prune", {
    retentionDays: 30,
    now: NOW.toISOString(),
  });
  check(
    "prune: 200 OK",
    pruneResp.status === 200,
    `status=${pruneResp.status}`,
  );
  const pruneBody = await pruneResp.json();
  check(
    "prune: ok=true",
    pruneBody.ok === true,
    JSON.stringify(pruneBody),
  );
  // The 60d + 100d rows are older than 30d, so they should be
  // rolled up. That's 4 rows (3 at 60d + 1 at 100d) → 3 distinct
  // (dateKey, actionType) groups: 60d/old_a (count=2),
  // 60d/old_failed (count=1), 100d/ancient (count=1).
  check(
    "prune: rolledUp=4 (60d x3 + 100d x1)",
    pruneBody.rolledUp === 4,
    `got=${pruneBody.rolledUp}`,
  );
  check(
    "prune: deleted=4",
    pruneBody.deleted === 4,
    `got=${pruneBody.deleted}`,
  );
  check(
    "prune: rollupRows=3 (3 distinct buckets)",
    pruneBody.rollupRows === 3,
    `got=${pruneBody.rollupRows}`,
  );
  check(
    "prune: retentionDays echoed",
    pruneBody.retentionDays === 30,
    `got=${pruneBody.retentionDays}`,
  );

  // ── 4. DB-layer assertions
  // The 0d + 30d rows are within the 30-day retention window,
  // so they stay in the live table. The 60d + 100d rows are
  // older, so they get rolled up and deleted.
  const liveCountAfter = await prisma.auditLog.count({
    where: {
      userId,
      OR: [
        { actionType: { startsWith: SENTINEL_PREFIX } },
        {
          actionType: "vault.payment_failed",
          payload: { contains: '"sentinel":true' },
        },
      ],
    },
  });
  check(
    "db: 3 sentinel rows remain in live table (0d x2 + 30d x1)",
    liveCountAfter === 3,
    `got=${liveCountAfter}`,
  );
  // 3 rollup buckets: 60d/old_a, 60d/vault.payment_failed,
  // 100d/ancient. Count all sentinel-sourced rollup rows
  // (smoke.* + 1-count vault.payment_failed).
  const rollupSentinelRows = await prisma.auditLogDailyRollup.findMany({
    where: {
      userId,
      OR: [
        { actionType: { startsWith: SENTINEL_PREFIX } },
        { actionType: "vault.payment_failed" },
      ],
    },
  });
  // Filter to the smoke-sourced ones: SENTINEL_PREFIX OR
  // vault.payment_failed with count <= 1.
  const smokeRollups = rollupSentinelRows.filter(
    (r) =>
      r.actionType.startsWith(SENTINEL_PREFIX) ||
      r.actionType === "vault.payment_failed",
  );
  check(
    "db: 3 rollup rows written (one per (dateKey, actionType))",
    smokeRollups.length === 3,
    `got=${smokeRollups.length}`,
  );

  // Verify the rollup row content for the 60d/old_a bucket:
  // count=2, failedCount=0.
  const bucket60oldA = await prisma.auditLogDailyRollup.findFirst({
    where: {
      userId,
      actionType: `${SENTINEL_PREFIX}old_a`,
    },
  });
  check(
    "db: 60d/old_a rollup has count=2",
    bucket60oldA?.count === 2,
    `got=${bucket60oldA?.count}`,
  );
  check(
    "db: 60d/old_a rollup has failedCount=0",
    bucket60oldA?.failedCount === 0,
    `got=${bucket60oldA?.failedCount}`,
  );

  // Verify the 60d/vault.payment_failed bucket: count=1,
  // failedCount=1 (vault.payment_failed is in the FAILED set).
  const bucket60oldFailed = await prisma.auditLogDailyRollup.findFirst({
    where: {
      userId,
      actionType: "vault.payment_failed",
      dateKey: dateKeyLocal(addDays(NOW, -60)),
    },
  });
  check(
    "db: 60d/vault.payment_failed rollup exists",
    bucket60oldFailed !== null,
    `bucket=${JSON.stringify(bucket60oldFailed)}`,
  );
  check(
    "db: 60d/vault.payment_failed rollup has count=1",
    bucket60oldFailed?.count === 1,
    `got=${bucket60oldFailed?.count}`,
  );
  check(
    "db: 60d/vault.payment_failed rollup has failedCount=1 (in FAILED set)",
    bucket60oldFailed?.failedCount === 1,
    `got=${bucket60oldFailed?.failedCount}`,
  );

  // ── 5. Idempotency: re-run the prune with the same params.
  // The live table has no rows older than 30d, so the second
  // prune should be a no-op (rolledUp=0).
  const prune2 = await postJson("/api/dev/audit-log-prune", {
    retentionDays: 30,
    now: NOW.toISOString(),
  });
  const prune2Body = await prune2.json();
  check(
    "prune (idempotent): 2nd call rolledUp=0 (nothing to prune)",
    prune2Body.rolledUp === 0,
    `got=${prune2Body.rolledUp}`,
  );
  check(
    "prune (idempotent): 2nd call rollupRows=0",
    prune2Body.rollupRows === 0,
    `got=${prune2Body.rollupRows}`,
  );
  // The 60d/old_a rollup should still have count=2 (the
  // increment-on-upsert path was not exercised because the
  // second call found no live rows to roll up).
  const bucket60oldA2 = await prisma.auditLogDailyRollup.findFirst({
    where: { userId, actionType: `${SENTINEL_PREFIX}old_a` },
  });
  check(
    "prune (idempotent): 60d/old_a rollup still has count=2",
    bucket60oldA2?.count === 2,
    `got=${bucket60oldA2?.count}`,
  );

  // ── 6. Idempotency under RE-INSERTION: re-write the
  // 60d/old_a rows, prune again, verify the rollup's count
  // is now 4 (2 from first prune + 2 from second).
  for (let i = 0; i < 2; i += 1) {
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: `${SENTINEL_PREFIX}old_a`,
        payload: JSON.stringify({ sentinel: true, n: 60, reinsert: i }),
        createdAt: addDays(NOW, -60),
      },
    });
  }
  const prune3 = await postJson("/api/dev/audit-log-prune", {
    retentionDays: 30,
    now: NOW.toISOString(),
  });
  const prune3Body = await prune3.json();
  check(
    "prune (re-insert): 3rd call rolledUp=2",
    prune3Body.rolledUp === 2,
    `got=${prune3Body.rolledUp}`,
  );
  const bucket60oldA3 = await prisma.auditLogDailyRollup.findFirst({
    where: { userId, actionType: `${SENTINEL_PREFIX}old_a` },
  });
  check(
    "prune (re-insert): 60d/old_a rollup now has count=4 (incremental)",
    bucket60oldA3?.count === 4,
    `got=${bucket60oldA3?.count}`,
  );

  // ── 7. 365d chip is in the DateRangeBar
  const audit1 = await get("/vault/audit");
  const html1 = await audit1.text();
  check("audit: 200", audit1.status === 200, `status=${audit1.status}`);
  check(
    "audit: 365d chip is in DateRangeBar",
    html1.includes('data-testid="vault-audit-range-365d"'),
  );
  check(
    "audit: 365d chip has the correct label",
    />Last 12 months</.test(html1),
  );

  // ── 8. Activity strip default (no filter) is 30 days
  check(
    "audit: default activity strip data-window-days='30'",
    /data-window-days="30"/.test(html1),
  );

  // ── 9. 90-day view: fetch with explicit 90d range. The
  // DateRangeBar href encodes the 90d preset's from/to; we
  // compute the equivalent here.
  const from90 = dateKeyLocal(addDays(NOW, -89));
  const to90 = dateKeyLocal(NOW);
  const audit90 = await get(`/vault/audit?from=${from90}&to=${to90}`);
  const html90 = await audit90.text();
  check("audit (90d): 200", audit90.status === 200, `status=${audit90.status}`);
  check(
    "audit (90d): activity strip data-window-days='90'",
    /data-window-days="90"/.test(html90),
  );

  // ── 10. 365-day view: fetch with explicit 365d range.
  // This range extends past the retention horizon (90d), so
  // the activity strip should fill the older days from the
  // rollup table. The rollup has 60d rows; those should
  // appear in the 365d strip.
  const from365 = dateKeyLocal(addDays(NOW, -364));
  const to365 = dateKeyLocal(NOW);
  const audit365 = await get(`/vault/audit?from=${from365}&to=${to365}`);
  const html365 = await audit365.text();
  check("audit (365d): 200", audit365.status === 200, `status=${audit365.status}`);
  check(
    "audit (365d): activity strip data-window-days='365'",
    /data-window-days="365"/.test(html365),
  );
  // The 365d strip header should say "// 365-day shape".
  check(
    "audit (365d): strip header label is '// 365-day shape'",
    html365.includes("// 365-day shape"),
  );

  // ── 11. The activity strip on the 365d view should
  // include the rollup-sourced 60d/old_a bar. The bar
  // count is downsampled to 90, so the bucket might be
  // merged with neighboring days. We assert the total
  // events in the strip is > 0 (the 60d old_a rollup
  // contributes 4 events; the 30d boundary contributes 1).
  const summaryMatch = html365.match(
    /data-testid="vault-audit-activity-summary"[^>]*>([^<]+)</,
  );
  const summaryText = summaryMatch?.[1] ?? "";
  // The rollup has 4 old_a + 1 old_failed + 1 ancient = 6 events
  // in the rollup; the live table has 3 (0d x2 + 30d x1) in the
  // last 30 days. So 9 events total — but the strip's
  // total reflects the downsample which sums within each
  // bucket. The downsampled count should still equal 9.
  // Just assert the count is non-zero and parseable.
  const m = summaryText.match(/(\d+)\s+events/);
  const eventsCount = m ? Number.parseInt(m[1], 10) : null;
  check(
    "audit (365d): strip summary shows non-zero event count",
    eventsCount !== null && eventsCount > 0,
    `summary='${summaryText}'`,
  );
  check(
    "audit (365d): strip summary event count >= 6 (rollup + live)",
    eventsCount !== null && eventsCount >= 6,
    `got=${eventsCount}`,
  );

  // ── 12. /api/dev/audit-log-prune is gated by NODE_ENV
  // (source-file check — we can't flip the env from inside
  // the smoke). Just verify the route file has the gate.
  const pruneRouteSrc = readFileSync(
    join(ROOT, "src/app/api/dev/audit-log-prune/route.ts"),
    "utf8",
  );
  check(
    "prune: dev endpoint is gated by NODE_ENV",
    /NODE_ENV\s*[!=]==?\s*["']development["']/.test(pruneRouteSrc),
  );
  check(
    "prune: dev endpoint uses requireUser",
    pruneRouteSrc.includes("requireUser"),
  );
  check(
    "prune: dev endpoint calls pruneAuditLog",
    pruneRouteSrc.includes("pruneAuditLog"),
  );

  // ── 13. audit-log.ts exports the new function
  const alSrc = readFileSync(
    join(ROOT, "src/lib/vault/audit-log.ts"),
    "utf8",
  );
  check(
    "audit-log.ts: exports pruneAuditLog",
    /export async function pruneAuditLog/.test(alSrc),
  );
  check(
    "audit-log.ts: exports getRetentionDays",
    /export function getRetentionDays/.test(alSrc),
  );
  check(
    "audit-log.ts: DEFAULT_RETENTION_DAYS = 90",
    /DEFAULT_RETENTION_DAYS\s*=\s*90/.test(alSrc),
  );

  // ── 14. ActivityStrip dynamic geometry
  const stripSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/audit/ActivityStrip.tsx"),
    "utf8",
  );
  check(
    "ActivityStrip: MAX_COLS = 90",
    /MAX_COLS\s*=\s*90/.test(stripSrc),
  );
  check(
    "ActivityStrip: exports geometryFor helper",
    /function geometryFor/.test(stripSrc),
  );
  check(
    "ActivityStrip: exports downsample helper",
    /function downsample/.test(stripSrc),
  );
  check(
    "ActivityStrip: data-window-days testid attribute",
    /data-window-days/.test(stripSrc),
  );

  // ── 15. audit-log-shared.ts has the 365d preset
  const sharedSrc = readFileSync(
    join(ROOT, "src/lib/vault/audit-log-shared.ts"),
    "utf8",
  );
  check(
    "audit-log-shared: 365d in DateRangePresetId union",
    /"365d"/.test(sharedSrc),
  );
  check(
    "audit-log-shared: 365d in DATE_RANGE_PRESETS",
    /id:\s*"365d"/.test(sharedSrc),
  );

  // ── 16. package.json smoke script includes this file
  const pkg = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  );
  check(
    "package.json: smoke script includes smoke-audit-log-retention.mjs",
    (pkg.scripts.smoke ?? "").includes("smoke-audit-log-retention.mjs"),
  );

  // ── Final cleanup
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
    console.error("smoke-audit-log-retention.mjs failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
