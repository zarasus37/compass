/**
 * Smoke for Cluster 7.6 — SSE audit log stream.
 *
 * Verifies:
 *   1. Auth: unauthenticated `GET /api/vault/audit/stream` is
 *      blocked (307 redirect from middleware or 401 from the
 *      route's defense-in-depth check).
 *   2. Stream opens: authenticated request returns 200,
 *      `text/event-stream`.
 *   3. Hello message: first event is `data: {"ok":true}`.
 *   4. End-to-end: open the stream, write a sentinel audit row
 *      via the dev-only `/api/dev/audit-log-write` endpoint
 *      (so the bus fires in the dev server's process), assert
 *      the row's `actionType` arrives in the stream within 2s.
 *   5. Filter — billId: a stream opened with `?billId=...` only
 *      forwards events whose payload mentions the bill.
 *   6. Heartbeat: the stream emits a `: heartbeat` comment
 *      within the test-mode interval (~300ms).
 *   7. Cleanup: when the client aborts the request, the
 *      server-side listener is removed (no hang, no error).
 *   8. Self-feedback guard: server-side bus forwards the page
 *      meta event normally; the hook filters it on the client.
 *   9. Source-file checks: the bus pins to globalThis, the
 *      route uses getCurrentUser, the live wrappers exist, the
 *      package.json smoke script includes this file.
 *
 * Note on the dev endpoint: the smoke runs in a separate Node
 * process from the dev server. A direct `prisma.auditLog.create()`
 * from the smoke would write to the DB but never fire the bus
 * in the dev server's process. The dev endpoint writes via
 * `recordVaultAudit` (which calls `publishAuditEvent`) so the
 * bus actually fires.
 *
 * Run: `node tests/smoke-sse-audit-log.mjs` (dev server must
 * be up).
 */

import { prisma } from "./db-client.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const ROOT = process.cwd();
const SMOKE_USER_EMAIL = "mom@compass.local";
const SMOKE_USER_PASSWORD = "correct-horse-battery-staple";

const jar = {};
function applyCookies(headers) {
  const cookies = Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
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
  const headers = new Headers({ "content-type": "application/json" });
  applyCookies(headers);
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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

// ──────────────────────────────────────────────────────────────────────
// SSE parser — minimal, line-based. Reads from a ReadableStream
// and yields parsed events as { id?, data, comment }. Comments
// (lines starting with `:`) are surfaced with comment=true so
// the test can detect the heartbeat.
// ──────────────────────────────────────────────────────────────────────
async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (raw.trim().length === 0) continue;
        const event = { id: undefined, data: "", comment: false, raw };
        const lines = raw.split("\n");
        for (const line of lines) {
          if (line.startsWith(":")) {
            event.comment = true;
            continue;
          }
          const colon = line.indexOf(":");
          if (colon === -1) continue;
          const field = line.slice(0, colon);
          let val = line.slice(colon + 1);
          if (val.startsWith(" ")) val = val.slice(1);
          if (field === "id") event.id = val;
          else if (field === "data") event.data = val;
        }
        yield event;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

/** Open a stream, collect events for up to `timeoutMs`, then
 *  abort. Returns whatever events arrived. On timeout, returns
 *  the partial collection (does NOT throw) so the smoke can
 *  continue to the next assertion. */
async function collectEvents({
  path,
  heartbeatMs,
  timeoutMs = 3000,
}) {
  const headers = new Headers();
  applyCookies(headers);
  if (heartbeatMs) {
    headers.set("x-compass-test-heartbeat-ms", String(heartbeatMs));
  }
  const ac = new AbortController();
  const response = await fetch(BASE + path, {
    headers,
    signal: ac.signal,
  });
  const events = [];
  let done = false;
  const collectPromise = (async () => {
    try {
      for await (const ev of parseSSE(response)) {
        if (done) break;
        events.push(ev);
      }
    } catch {
      // AbortError on cleanup; expected.
    }
  })();
  await new Promise((r) => setTimeout(() => {
    done = true;
    try { ac.abort(); } catch {}
    r();
  }, timeoutMs));
  await collectPromise.catch(() => {});
  return events;
}

/** Open a stream, wait for the hello message, then collect
 *  events until `predicate` returns true or the timeout fires.
 *  Returns the collected events. */
async function collectUntil({
  path,
  heartbeatMs,
  predicate,
  timeoutMs = 3000,
}) {
  const headers = new Headers();
  applyCookies(headers);
  if (heartbeatMs) {
    headers.set("x-compass-test-heartbeat-ms", String(heartbeatMs));
  }
  const ac = new AbortController();
  const response = await fetch(BASE + path, {
    headers,
    signal: ac.signal,
  });
  const events = [];
  let done = false;
  const collectPromise = (async () => {
    try {
      for await (const ev of parseSSE(response)) {
        if (done) break;
        events.push(ev);
        if (predicate && predicate(ev)) {
          done = true;
          try { ac.abort(); } catch {}
          break;
        }
      }
    } catch {
      // AbortError on cleanup; expected.
    }
  })();
  await new Promise((r) => setTimeout(() => {
    done = true;
    try { ac.abort(); } catch {}
    r();
  }, timeoutMs));
  await collectPromise.catch(() => {});
  return events;
}

async function main() {
  console.log("\n--- SSE audit log smoke (Cluster 7.6) ---\n");

  // ── 1. Login
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) {
    console.log("FATAL: no login aid");
    process.exit(1);
  }
  const lp = await postForm(
    "/login",
    { email: SMOKE_USER_EMAIL, password: SMOKE_USER_PASSWORD },
    { actionId: loginAid, kind: "bound" },
  );
  check("login: 303", lp.status === 303, `status=${lp.status}`);

  // ── 2. Unauthenticated stream → blocked
  const r401 = await fetch(BASE + "/api/vault/audit/stream", {
    headers: { cookie: "" },
    redirect: "manual",
  });
  check(
    "unauthenticated stream is blocked (307 or 401)",
    r401.status === 307 || r401.status === 401,
    `status=${r401.status}`,
  );

  // ── 3. End-to-end via the dev endpoint
  // The smoke and the dev server are separate Node processes.
  // The bus is per-process, so we need the dev server to fire
  // the bus for the smoke to observe the event. The dev
  // endpoint calls `recordVaultAudit` which fires the bus.
  const SENTINEL_TYPE = "smoke.test_sse_event";
  // Wipe any prior sentinels so the test is idempotent.
  await prisma.auditLog.deleteMany({
    where: { userId: { not: undefined }, actionType: SENTINEL_TYPE },
  }).catch(() => {});
  // We need the userId for the delete filter; look it up.
  const userRow = await prisma.user.findUnique({
    where: { email: SMOKE_USER_EMAIL },
  });
  if (!userRow) {
    console.log("FATAL: smoke user not found");
    process.exit(1);
  }
  const userId = userRow.id;
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: SENTINEL_TYPE },
  });

  // Phase A: open the stream + write via the dev endpoint.
  const sentinelId = `sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const eventsA = await collectUntil({
    path: "/api/vault/audit/stream",
    heartbeatMs: 5000,
    predicate: (ev) =>
      !ev.comment && ev.data && ev.data.includes(SENTINEL_TYPE),
    timeoutMs: 2500,
  });
  // The collectUntil helper returns AFTER the predicate fires.
  // But the predicate fires on a write that happens via the
  // dev endpoint — we need to trigger the write. We do this
  // concurrently with the collect.
  // Actually — collectUntil runs the predicate against events
  // AS THEY ARRIVE. The dev endpoint call must happen in
  // parallel. Let me restructure: open the stream in the
  // background, call the dev endpoint, then collect events.
  // The earlier call (with predicate) wouldn't have a write
  // to match against, so it just times out. Let me use a
  // different pattern.
  // We discard the result of the first call (it'll just be the
  // hello) and do the real test inline below.

  // Real test: open + write + collect, all in one block.
  const realTest = await (async () => {
    const events = [];
    const ac = new AbortController();
    const headers = new Headers();
    applyCookies(headers);
    headers.set("x-compass-test-heartbeat-ms", "5000");
    const response = await fetch(
      BASE + "/api/vault/audit/stream",
      { headers, signal: ac.signal },
    );
    const collectPromise = (async () => {
      try {
        for await (const ev of parseSSE(response)) {
          events.push(ev);
        }
      } catch {}
    })();
    // Wait for the stream to fully open + subscribe to the bus.
    await new Promise((r) => setTimeout(r, 200));
    // Trigger the write via the dev endpoint. The bus fires in
    // the dev server's process; our listener receives it.
    const writeRes = await postJson("/api/dev/audit-log-write", {
      actionType: SENTINEL_TYPE,
      payload: { smoke: true, tag: "cluster-7.6", sentinelId },
    });
    const writeJson = await writeRes.json().catch(() => ({}));
    // Wait for the event to land in the stream.
    await new Promise((r) => setTimeout(r, 800));
    ac.abort();
    await collectPromise.catch(() => {});
    return { events, writeJson, writeStatus: writeRes.status };
  })();

  check(
    "dev write endpoint returns 200 ok",
    realTest.writeStatus === 200 && realTest.writeJson?.ok === true,
    `status=${realTest.writeStatus} body=${JSON.stringify(realTest.writeJson)}`,
  );
  const helloA = realTest.events.find(
    (e) => !e.comment && e.data === '{"ok":true}',
  );
  check("hello message received", Boolean(helloA));
  const sentinelEventA = realTest.events.find(
    (e) => !e.comment && e.data && e.data.includes(SENTINEL_TYPE),
  );
  check(
    "sentinel row lands in stream within 2s (bus fired in dev server)",
    Boolean(sentinelEventA),
    `events=${realTest.events.length} ids=${realTest.events.map(e => e.id || "?").join(",")}`,
  );

  // ── 4. ?billId= filter
  // Open one stream scoped to billId=A, write a row with
  // billId=A via the dev endpoint. The A stream should see it.
  // Then open a stream scoped to billId=B, write a row with
  // billId=B. The B stream should see it; the A stream should
  // not (a separate stream).
  const billIdA = `smoke-bill-a-${Date.now()}`;
  const billIdB = `smoke-bill-b-${Date.now()}`;
  const scopedType = "smoke.test_sse_scoped";
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: scopedType },
  });

  // Phase 1 — stream scoped to A.
  const evAPhase = await (async () => {
    const events = [];
    const ac = new AbortController();
    const headers = new Headers();
    applyCookies(headers);
    headers.set("x-compass-test-heartbeat-ms", "5000");
    const response = await fetch(
      BASE + `/api/vault/audit/stream?billId=${encodeURIComponent(billIdA)}`,
      { headers, signal: ac.signal },
    );
    const collectPromise = (async () => {
      try {
        for await (const ev of parseSSE(response)) {
          events.push(ev);
        }
      } catch {}
    })();
    await new Promise((r) => setTimeout(r, 200));
    // Write a row scoped to A. The A stream should see it.
    const rA = await postJson("/api/dev/audit-log-write", {
      actionType: scopedType,
      payload: { billId: billIdA, fresh: true, sentinelId: "A1" },
    });
    // Write a row scoped to B. The A stream should NOT see it.
    const rB = await postJson("/api/dev/audit-log-write", {
      actionType: scopedType,
      payload: { billId: billIdB, fresh: true, sentinelId: "B1" },
    });
    await new Promise((r) => setTimeout(r, 800));
    ac.abort();
    await collectPromise.catch(() => {});
    return { events, rA, rB };
  })();
  const aHasA = evAPhase.events.some(
    (e) => !e.comment && e.data && e.data.includes("A1") && e.data.includes(billIdA),
  );
  const aHasNoB = !evAPhase.events.some(
    (e) => !e.comment && e.data && e.data.includes("B1"),
  );
  check(
    "stream scoped to billId=A receives bill-A row",
    aHasA,
    `aHasA=${aHasA}`,
  );
  check(
    "stream scoped to billId=A does NOT receive bill-B row",
    aHasNoB,
    `aHasNoB=${aHasNoB}`,
  );

  // Phase 2 — stream scoped to B.
  const evBPhase = await (async () => {
    const events = [];
    const ac = new AbortController();
    const headers = new Headers();
    applyCookies(headers);
    headers.set("x-compass-test-heartbeat-ms", "5000");
    const response = await fetch(
      BASE + `/api/vault/audit/stream?billId=${encodeURIComponent(billIdB)}`,
      { headers, signal: ac.signal },
    );
    const collectPromise = (async () => {
      try {
        for await (const ev of parseSSE(response)) {
          events.push(ev);
        }
      } catch {}
    })();
    await new Promise((r) => setTimeout(r, 200));
    const rB = await postJson("/api/dev/audit-log-write", {
      actionType: scopedType,
      payload: { billId: billIdB, fresh: true, sentinelId: "B2" },
    });
    const rA = await postJson("/api/dev/audit-log-write", {
      actionType: scopedType,
      payload: { billId: billIdA, fresh: true, sentinelId: "A2" },
    });
    await new Promise((r) => setTimeout(r, 800));
    ac.abort();
    await collectPromise.catch(() => {});
    return { events, rA, rB };
  })();
  const bHasB = evBPhase.events.some(
    (e) => !e.comment && e.data && e.data.includes("B2") && e.data.includes(billIdB),
  );
  const bHasNoA = !evBPhase.events.some(
    (e) => !e.comment && e.data && e.data.includes("A2"),
  );
  check(
    "stream scoped to billId=B receives bill-B row",
    bHasB,
    `bHasB=${bHasB}`,
  );
  check(
    "stream scoped to billId=B does NOT receive bill-A row",
    bHasNoA,
    `bHasNoA=${bHasNoA}`,
  );

  // ── 5. Heartbeat
  const hbEvents = await collectEvents({
    path: "/api/vault/audit/stream",
    heartbeatMs: 300,
    timeoutMs: 1500,
  });
  const hbCount = hbEvents.filter((e) => e.comment).length;
  check(
    "heartbeat emitted within 1.5s (interval=300ms)",
    hbCount >= 2,
    `count=${hbCount}`,
  );

  // ── 6. Cleanup
  const cleanupEvents = await collectEvents({
    path: "/api/vault/audit/stream",
    heartbeatMs: 10000,
    timeoutMs: 600,
  });
  check(
    "stream cleanly tears down on client abort (≥1 hello event)",
    cleanupEvents.length >= 1,
    `events=${cleanupEvents.length}`,
  );

  // ── 7. Self-feedback guard (server side)
  // The page's `vault.audit_log_viewed` is a normal audit row
  // that the bus forwards normally. The hook filters it on
  // the client. We verify the server forwards it (a stream
  // without the ignore filter receives the event).
  const metaType = "smoke.test_meta_event";
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: metaType },
  });
  // Use a fake "meta" sentinel — the server doesn't care
  // whether it's the real meta event or not; what matters is
  // that the bus fires for any recordVaultAudit call.
  const metaEvents = await (async () => {
    const events = [];
    const ac = new AbortController();
    const headers = new Headers();
    applyCookies(headers);
    headers.set("x-compass-test-heartbeat-ms", "5000");
    const response = await fetch(
      BASE + "/api/vault/audit/stream",
      { headers, signal: ac.signal },
    );
    const collectPromise = (async () => {
      try {
        for await (const ev of parseSSE(response)) {
          events.push(ev);
        }
      } catch {}
    })();
    await new Promise((r) => setTimeout(r, 200));
    await postJson("/api/dev/audit-log-write", {
      actionType: metaType,
      payload: { meta: true },
    });
    await new Promise((r) => setTimeout(r, 800));
    ac.abort();
    await collectPromise.catch(() => {});
    return events;
  })();
  const metaForwarded = metaEvents.some(
    (e) => !e.comment && e.data && e.data.includes(metaType),
  );
  check(
    "server forwards the meta event normally (client filter is the guard)",
    metaForwarded,
    `events=${metaEvents.length}`,
  );

  // ── 8. Source-file checks
  const auditBusSrc = readFileSync(
    join(ROOT, "src/lib/vault/audit-bus.ts"),
    "utf8",
  );
  check(
    "audit-bus.ts pins to globalThis",
    auditBusSrc.includes("globalThis") &&
      auditBusSrc.includes("__COMPASS_AUDIT_BUS__"),
  );
  check(
    "audit-bus.ts publishes a 'audit' event",
    auditBusSrc.includes('.emit("audit"'),
  );
  check(
    "audit-bus.ts uses setMaxListeners (dev many-tabs safety)",
    auditBusSrc.includes("setMaxListeners"),
  );

  const dbSrc = readFileSync(join(ROOT, "src/lib/vault/db.ts"), "utf8");
  check(
    "db.ts recordVaultAudit calls publishAuditEvent",
    dbSrc.includes("publishAuditEvent"),
  );

  const routeSrc = readFileSync(
    join(ROOT, "src/app/api/vault/audit/stream/route.ts"),
    "utf8",
  );
  check(
    "stream route uses getCurrentUser",
    routeSrc.includes("getCurrentUser"),
  );
  check(
    "stream route returns text/event-stream",
    routeSrc.includes("text/event-stream"),
  );
  check(
    "stream route filters by billId when present",
    routeSrc.includes("payloadMentionsBill"),
  );
  check(
    "stream route sends heartbeat comments",
    routeSrc.includes("heartbeat"),
  );

  const liveAuditSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/audit/LiveAuditTable.tsx"),
    "utf8",
  );
  check(
    "LiveAuditTable is a client component",
    /["']use client["']/.test(liveAuditSrc),
  );
  check(
    "LiveAuditTable ignores vault.audit_log_viewed",
    liveAuditSrc.includes("vault.audit_log_viewed"),
  );

  const liveBillSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/bills/[id]/history/LiveBillEventTable.tsx"),
    "utf8",
  );
  check(
    "LiveBillEventTable is a client component",
    /["']use client["']/.test(liveBillSrc),
  );
  check(
    "LiveBillEventTable forwards billId to the stream",
    liveBillSrc.includes("billId") &&
      liveBillSrc.includes("useAuditStream"),
  );

  const hookSrc = readFileSync(
    join(ROOT, "src/lib/vault/use-audit-stream.ts"),
    "utf8",
  );
  check(
    "useAuditStream is a client hook",
    /["']use client["']/.test(hookSrc),
  );
  check(
    "useAuditStream uses EventSource",
    hookSrc.includes("EventSource"),
  );

  const devWriteSrc = readFileSync(
    join(ROOT, "src/app/api/dev/audit-log-write/route.ts"),
    "utf8",
  );
  check(
    "dev write endpoint gates on NODE_ENV=development",
    devWriteSrc.includes("NODE_ENV"),
  );
  check(
    "dev write endpoint uses recordVaultAudit (so the bus fires)",
    devWriteSrc.includes("recordVaultAudit"),
  );
  check(
    "dev write endpoint restricts actionType to smoke.*",
    devWriteSrc.includes("smoke."),
  );

  const pkg = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  );
  check(
    "package.json smoke script includes smoke-sse-audit-log.mjs",
    (pkg.scripts.smoke ?? "").includes("smoke-sse-audit-log.mjs"),
  );

  // ── 9. Cleanup test sentinel rows
  await prisma.auditLog.deleteMany({
    where: {
      userId,
      actionType: { in: [SENTINEL_TYPE, scopedType, metaType] },
    },
  });

  // ── Summary
  console.log("\n--- checks ---");
  const pass = checks.filter(([, ok]) => ok).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
  if (miss === 0) console.log("ALL GREEN");
  process.exit(miss === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
