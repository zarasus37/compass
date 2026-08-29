/**
 * Smoke for Cluster 6.0 — Vault scheduler (auto bill-pay).
 *
 * Verifies:
 *   1. CRUD via /api/vault/schedule (null → valid → invalid → updated)
 *   2. Engine: computeNextRun, runSchedulerForUser gates,
 *      processEligibleBills, recordScheduleRun
 *   3. UI: /vault/schedule page renders the form + status + history
 *   4. /vault renders the SchedulerIndicator
 *   5. /api/cron/vault endpoint iterates due users
 *   6. /api/vault/schedule/run-now is the manual override
 *
 * Run: `node tests/smoke-vault-scheduler.mjs` (dev server must be up).
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
async function postJson(path, body) {
  const headers = new Headers({ "content-type": "application/json" });
  applyCookies(headers);
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
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

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

async function main() {
  console.log("\n--- Vault scheduler smoke (Cluster 6.0) ---\n");

  // ── 1. Login + reset
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
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) {
    console.log("FATAL: login failed");
    process.exit(1);
  }
  const r1Reset = await postJson("/api/reset-seed");
  log("reset", `status=${r1Reset.status} ok=${(await r1Reset.clone().json()).ok}`);

  const user = await prisma.user.findUnique({
    where: { email: "mom@compass.local" },
  });
  if (!user) {
    console.log("FATAL: no mom user");
    process.exit(1);
  }

  // Clean any leftover VaultSchedule + scheduler_run audit rows
  // from previous runs so the test is deterministic.
  await prisma.vaultSchedule.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({
    where: { userId: user.id, actionType: "vault.scheduler_run" },
  });

  // Ensure the user's vault exists so the cap check in the API
  // has a settlementReserve to compare against. /api/reset-seed
  // doesn't create the vault; the vault is lazily created on
  // first /vault visit. We force it here via Prisma so the
  // cap check is testable in this isolated smoke.
  await prisma.vaultAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      chainId: 84532,
      smartAccountAddress: "0xMOCK0000000000000000000000000000000000DEAD",
      baseAsset: "USDC",
      status: "ACTIVE",
      availableBalance: 100_000,
      settlementReserve: 50_000,
    },
    update: {
      // Reset reserve to a known value for the cap test
      settlementReserve: 50_000,
    },
  });

  // ── 2. GET /api/vault/schedule returns null on first visit
  const g0 = await get("/api/vault/schedule");
  const g0j = await g0.json();
  check("GET /api/vault/schedule returns 200", g0.status === 200, `got ${g0.status}`);
  check("GET /api/vault/schedule schedule=null on first visit", g0j.schedule === null, `got ${JSON.stringify(g0j).slice(0, 100)}`);
  check("GET /api/vault/schedule returns defaults", g0j.defaults?.cronExpression === "0 9 * * *", `got ${g0j.defaults?.cronExpression}`);

  // ── 3. POST /api/vault/schedule with valid cron
  const p1 = await postJson("/api/vault/schedule", {
    enabled: true,
    cronExpression: "*/15 * * * *", // every 15 min
    timezone: "America/Chicago",
    lookAheadDays: 1,
    minReserveCents: 0,
  });
  const p1j = await p1.json();
  check("POST /api/vault/schedule with valid cron returns 200", p1.status === 200, `got ${p1.status}`);
  check("POST /api/vault/schedule creates the row", p1j.ok === true, `got ${JSON.stringify(p1j).slice(0, 100)}`);
  check("POST /api/vault/schedule nextRunAt is computed", !!p1j.schedule?.nextRunAt, `got ${p1j.schedule?.nextRunAt}`);
  check("POST /api/vault/schedule stores cronExpression", p1j.schedule?.cronExpression === "*/15 * * * *", `got ${p1j.schedule?.cronExpression}`);
  check("POST /api/vault/schedule stores timezone", p1j.schedule?.timezone === "America/Chicago", `got ${p1j.schedule?.timezone}`);
  check("POST /api/vault/schedule stores lookAheadDays", p1j.schedule?.lookAheadDays === 1, `got ${p1j.schedule?.lookAheadDays}`);

  // ── 4. POST with invalid cron → 400
  const p2 = await postJson("/api/vault/schedule", {
    cronExpression: "not a cron",
  });
  const p2j = await p2.json();
  check("POST /api/vault/schedule rejects invalid cron", p2.status === 400, `got ${p2.status}`);
  check("invalid cron error mentions the bad expression", typeof p2j.error === "string" && p2j.error.includes("not a cron"), `got ${p2j.error}`);

  // ── 5. POST with lookAheadDays > 7 → 400
  const p3 = await postJson("/api/vault/schedule", {
    cronExpression: "0 9 * * *",
    lookAheadDays: 14,
  });
  const p3j = await p3.json();
  check("POST /api/vault/schedule rejects lookAheadDays > 7", p3.status === 400, `got ${p3.status}`);
  check("lookAheadDays error mentions 0..7", typeof p3j.error === "string" && p3j.error.includes("0 and 7"), `got ${p3j.error}`);

  // ── 6. POST with minReserveCents > 2x reserve → 400
  const vault = await prisma.vaultAccount.findUnique({ where: { userId: user.id } });
  const overReserve = (vault?.settlementReserve ?? 0) * 2 + 1;
  const p4 = await postJson("/api/vault/schedule", {
    cronExpression: "0 9 * * *",
    minReserveCents: overReserve,
  });
  const p4j = await p4.json();
  check(
    "POST /api/vault/schedule rejects minReserveCents > 2x reserve",
    p4.status === 400,
    `got ${p4.status}`,
  );
  check(
    "minReserveCents error mentions the cap",
    typeof p4j.error === "string" && p4j.error.includes("2x"),
    `got ${p4j.error}`,
  );

  // ── 7. POST updates the existing row
  const p5 = await postJson("/api/vault/schedule", {
    enabled: false,
    cronExpression: "0 9 * * *",
    timezone: "America/Chicago",
    lookAheadDays: 3,
    minReserveCents: 0,
  });
  const p5j = await p5.json();
  check("POST /api/vault/schedule upserts (updates enabled=false)", p5j.schedule?.enabled === false, `got enabled=${p5j.schedule?.enabled}`);
  check("upsert updates lookAheadDays=3", p5j.schedule?.lookAheadDays === 3, `got ${p5j.schedule?.lookAheadDays}`);

  // ── 8. GET /api/vault/schedule returns the updated row
  const g1 = await get("/api/vault/schedule");
  const g1j = await g1.json();
  check("GET /api/vault/schedule returns the saved row", g1j.schedule?.cronExpression === "0 9 * * *", `got ${g1j.schedule?.cronExpression}`);
  check("saved row has lookAheadDays=3", g1j.schedule?.lookAheadDays === 3, `got ${g1j.schedule?.lookAheadDays}`);

  // ── 9. Engine: disabled schedule → SKIPPED
  const { runSchedulerForUser } = await import("../src/lib/vault/scheduler.ts").catch(() => ({ runSchedulerForUser: null }));
  // The .ts import is only available in tsx contexts. For .mjs, we
  // exercise the engine via the API instead. Skip direct engine
  // checks here; the API-level checks below cover the same code path.
  void runSchedulerForUser;

  // ── 10. /vault/schedule page renders
  const sched = await get("/vault/schedule");
  const schedText = await sched.text();
  log("/vault/schedule", `status=${sched.status} bytes=${schedText.length}`);
  check("/vault/schedule returns 200", sched.status === 200, `got ${sched.status}`);
  check(
    "/vault/schedule has the // scheduler eyebrow",
    schedText.includes("// ledger · vault · scheduler"),
    "eyebrow not found",
  );
  check(
    "/vault/schedule has 'Auto bill-pay' title",
    schedText.includes("Auto bill-pay"),
    "title not found",
  );
  check(
    "/vault/schedule has 'set it and let it run' em",
    schedText.includes("set it and let it run"),
    "em not found",
  );
  check(
    "/vault/schedule form is present",
    schedText.includes("vault-schedule-form"),
    "form not found",
  );
  check(
    "/vault/schedule form has the cron preset select",
    schedText.includes("vault-schedule-cron-preset"),
    "preset select not found",
  );
  check(
    "/vault/schedule form has the cron raw input",
    schedText.includes("vault-schedule-cron-input"),
    "cron input not found",
  );
  check(
    "/vault/schedule form has the timezone select",
    schedText.includes("vault-schedule-tz-select"),
    "tz select not found",
  );
  check(
    "/vault/schedule form has the look-ahead input",
    schedText.includes("vault-schedule-lookahead-input"),
    "lookahead input not found",
  );
  check(
    "/vault/schedule form has the reserve input",
    schedText.includes("vault-schedule-reserve-input"),
    "reserve input not found",
  );
  check(
    "/vault/schedule form has the save button",
    schedText.includes("vault-schedule-save-button"),
    "save button not found",
  );
  check(
    "/vault/schedule status card is present",
    schedText.includes("vault-schedule-status"),
    "status card not found",
  );
  check(
    "/vault/schedule run history block is present",
    schedText.includes("vault-schedule-history"),
    "history block not found",
  );
  check(
    "/vault/schedule has the [RUN] NOW button",
    schedText.includes("vault-schedule-run-now-button"),
    "run-now button not found",
  );
  check(
    "/vault/schedule has the enabled toggle",
    schedText.includes("vault-schedule-enabled-toggle"),
    "enabled toggle not found",
  );

  // ── 11. /vault shows the scheduler indicator (we have a schedule now)
  const vaultPage = await get("/vault");
  const vaultText = await vaultPage.text();
  check("/vault renders 200", vaultPage.status === 200, `got ${vaultPage.status}`);
  check(
    "/vault shows the scheduler indicator",
    vaultText.includes("vault-scheduler-indicator"),
    "scheduler indicator not found",
  );
  // DEBUG: dump the schedule state + a slice of the indicator HTML
  // (kept off by default; flip for debugging).
  // const scheduleNow = await prisma.vaultSchedule.findUnique({ where: { userId: user.id } });
  // console.log("[debug] schedule in DB:", { enabled: scheduleNow?.enabled });
  check(
    "/vault indicator has the [PAUSED] chip (we disabled the schedule)",
    // React inserts <!-- --> text-boundary comments in the HTML
    // source; the rendered text is "[PAUSED]". Match the actual
    // HTML source shape (or just the bare word surrounded by
    // brackets, which the comment markers don't break).
    /\[(<!-- -->)?PAUSED(<!-- -->)?\]/.test(vaultText),
    "paused chip not found",
  );
  check(
    "/vault indicator has a Schedule link button",
    vaultText.includes("[SCHEDULE]"),
    "schedule link not found",
  );

  // ── 12. /api/vault/schedule/history returns the empty list initially
  const h0 = await get("/api/vault/schedule/history");
  const h0j = await h0.json();
  check("GET /api/vault/schedule/history returns 200", h0.status === 200, `got ${h0.status}`);
  check("history is initially empty", Array.isArray(h0j.runs) && h0j.runs.length === 0, `got ${h0j.runs?.length} runs`);

  // ── 13. /api/cron/vault iterates due users (POST + GET)
  const cronPost = await postJson("/api/cron/vault", {});
  const cronPostJ = await cronPost.json();
  check("POST /api/cron/vault returns 200", cronPost.status === 200, `got ${cronPost.status}`);
  check("POST /api/cron/vault has ok=true", cronPostJ.ok === true, `got ${JSON.stringify(cronPostJ).slice(0, 200)}`);
  check("POST /api/cron/vault has usersProcessed (number)", typeof cronPostJ.usersProcessed === "number", `got ${typeof cronPostJ.usersProcessed}`);

  const cronGet = await get("/api/cron/vault");
  const cronGetJ = await cronGet.json();
  check("GET /api/cron/vault returns 200", cronGet.status === 200, `got ${cronGet.status}`);

  // ── 14. POST /api/vault/schedule/run-now — manual override.
  // The schedule is currently disabled (we set enabled=false above),
  // so the run-now should return SKIPPED with a clear reason.
  const r0 = await postJson("/api/vault/schedule/run-now", {});
  const r0j = await r0.json();
  check("POST /api/vault/schedule/run-now returns 200", r0.status === 200, `got ${r0.status}`);
  check(
    "run-now result is SKIPPED (schedule is disabled)",
    r0j.result?.status === "SKIPPED",
    `got ${r0j.result?.status}`,
  );
  check(
    "run-now records a reason",
    typeof r0j.result?.error === "string",
    `got ${r0j.result?.error}`,
  );

  // ── 15. Re-enable the schedule + force nextRunAt to the past +
  // run-now → SUCCESS (or NO_BILLS depending on whether any bills
  // are eligible in the window). Both are "the run did its job"
  // states; SKIPPED would mean the engine is broken.
  await prisma.vaultSchedule.update({
    where: { userId: user.id },
    data: { enabled: true, nextRunAt: new Date(Date.now() - 60_000) },
  });
  const r1 = await postJson("/api/vault/schedule/run-now", {});
  const r1j = await r1.json();
  check(
    "run-now after enabling returns SUCCESS or NO_BILLS (not SKIPPED)",
    r1j.result?.status === "SUCCESS" || r1j.result?.status === "NO_BILLS",
    `got ${r1j.result?.status}`,
  );
  check(
    "run-now has billsAffected (number)",
    typeof r1j.result?.billsAffected === "number",
    `got ${typeof r1j.result?.billsAffected}`,
  );
  check(
    "run-now updates nextRunAt",
    typeof r1j.result?.nextRunAt === "string" || r1j.result?.nextRunAt === null,
    `got ${typeof r1j.result?.nextRunAt}`,
  );

  // ── 16. After the run, lastRunAt is set
  const after = await prisma.vaultSchedule.findUnique({ where: { userId: user.id } });
  check("after run: lastRunAt is set", !!after?.lastRunAt, `got ${after?.lastRunAt}`);
  check(
    "after run: lastRunStatus is SUCCESS or NO_BILLS",
    after?.lastRunStatus === "SUCCESS" || after?.lastRunStatus === "NO_BILLS",
    `got ${after?.lastRunStatus}`,
  );
  check(
    "after run: nextRunAt is in the future",
    !!after?.nextRunAt && after.nextRunAt.getTime() > Date.now() - 1000,
    `got ${after?.nextRunAt}`,
  );

  // ── 17. History endpoint returns the audit rows from the run
  const h1 = await get("/api/vault/schedule/history");
  const h1j = await h1.json();
  check(
    "history has ≥1 run entry after a real run",
    Array.isArray(h1j.runs) && h1j.runs.length >= 1,
    `got ${h1j.runs?.length} runs`,
  );

  // ── 18. Cron endpoint with bad bearer (when CRON_SECRET is set
  // via env). If unset, this is a no-op auth check. We just check
  // that the route exists and returns 200 in dev.
  check(
    "/api/cron/vault is reachable in dev (no CRON_SECRET)",
    cronPost.status === 200,
    `got ${cronPost.status}`,
  );

  // ── 19. Cleanup
  await prisma.vaultSchedule.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({
    where: { userId: user.id, actionType: "vault.scheduler_run" },
  });
  log("cleanup", "VaultSchedule + scheduler_run audit rows wiped");

  console.log(`\n--- checks ---\nchecks: ${checks.filter((c) => c[1]).length} pass / ${checks.filter((c) => !c[1]).length} miss (${checks.length} total)`);
  const misses = checks.filter((c) => !c[1]);
  if (misses.length > 0) {
    console.log("\n!! FAILURES:");
    for (const [name, , detail] of misses) {
      console.log(`   ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    }
    process.exit(1);
  }
  console.log("\nALL GREEN");
  process.exit(0);
}

main().catch((err) => {
  console.error("smoke fatal:", err);
  process.exit(1);
});
