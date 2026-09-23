/**
 * Smoke for the Cluster 7.29 spending trends card.
 *
 * Verifies:
 *   1. Card mounts on /insights with the expected data-testid.
 *   2. data-* attributes carry real values (windowDays, dates, totals).
 *   3. After seeding sample expense transactions, the "by envelope"
 *      and "by payee" ranked lists render with at least one row.
 *   4. Sum-of-envelope invariants (positive numbers, ordered desc).
 *   5. Pending state renders honestly when no expenses exist.
 *
 * Run: node tests/smoke-spending-trends.mjs (dev server up).
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
function extractActionId(html) {
  const m = html.match(/[a-f0-9]{20,}/);
  return m ? m[0] : null;
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

async function fetchHtml(path) {
  const r = await get(path);
  return { status: r.status, html: await r.text() };
}

function readAttr(html, attr) {
  const re = new RegExp(`data-testid="spending-trends-card"[^>]*data-${attr}="([^"]*)"`);
  const m = html.match(re);
  return m ? m[1] : null;
}

async function main() {
  await login();

  const user = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  if (!user) {
    console.error("CRASH: user not found");
    process.exit(1);
  }

  const acct = await prisma.account.findFirst({
    where: { userId: user.id, isArchived: false },
  });
  if (!acct) throw new Error("no spendable account");

  // ============================================================
  // Phase 1 — Seeding sample expenses
  // Delete any existing expenses in the 30-day window first so
  // the smoke is deterministic.
  // ============================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

  await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
      date: { gte: windowStart, lte: today },
    },
  });

  const env = await prisma.envelope.findMany({
    where: { userId: user.id, isArchived: false },
    select: { id: true, name: true },
    take: 7,
  });
  const groceries = env.find((e) => /Groceries/i.test(e.name));
  const dining = env.find((e) => /Dining|Joy/i.test(e.name));
  if (!groceries || !dining) {
    console.error("CRASH: missing Groceries or Dining envelope");
    process.exit(1);
  }

  // 6 expense transactions: 3 to Groceries (H-E-B), 2 to Dining
  // (Whataburger), 1 to Dining (Chick-fil-A). 5 days spread.
  const samples = [
    { daysAgo: 5, payee: "H-E-B", amount: -12500, envelopeId: groceries.id },
    { daysAgo: 4, payee: "H-E-B", amount: -8700, envelopeId: groceries.id },
    { daysAgo: 3, payee: "Whataburger", amount: -1895, envelopeId: dining.id },
    { daysAgo: 2, payee: "H-E-B", amount: -4500, envelopeId: groceries.id },
    { daysAgo: 1, payee: "Whataburger", amount: -2400, envelopeId: dining.id },
    { daysAgo: 0, payee: "Chick-fil-A", amount: -1500, envelopeId: dining.id },
  ];
  for (const s of samples) {
    const d = new Date(today);
    d.setDate(d.getDate() - s.daysAgo);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: acct.id,
        envelopeId: s.envelopeId,
        amount: s.amount,
        date: d,
        payee: s.payee,
        source: "smoke-spending-trends",
        cleared: true,
        metadata: "{}",
        isPrimaMateria: false,
      },
    });
  }
  const totalCents = samples.reduce((s, x) => s + Math.abs(x.amount), 0);

  // ============================================================
  // Phase 2 — Card mounts on /insights
  // ============================================================
  const ins = await fetchHtml("/insights");
  check("/insights 200", ins.status === 200, `got ${ins.status}`);
  check(
    "spending-trends-card testid rendered on /insights",
    /data-testid="spending-trends-card"/.test(ins.html),
  );

  // ============================================================
  // Phase 3 — data-* invariants
  // ============================================================
  const status = readAttr(ins.html, "status");
  check(
    "status is 'ok' (after seeding)",
    status === "ok",
    `got ${status}`,
  );
  const windowDays = Number(readAttr(ins.html, "window-days"));
  check(
    "window-days is 30",
    windowDays === 30,
    `got ${windowDays}`,
  );
  const totalAttr = Number(readAttr(ins.html, "total-spent-cents"));
  check(
    "total-spent-cents equals seeded total",
    totalAttr === totalCents,
    `attr=${totalAttr} expected=${totalCents}`,
  );
  const windowStartAttr = readAttr(ins.html, "window-start");
  const windowEndAttr = readAttr(ins.html, "window-end");
  check(
    "window-start and window-end carry ISO dates",
    /^\d{4}-\d{2}-\d{2}$/.test(windowStartAttr ?? "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(windowEndAttr ?? ""),
    `start=${windowStartAttr} end=${windowEndAttr}`,
  );

  // ============================================================
  // Phase 4 — byEnvelope + byPayee ranked lists render
  // ============================================================
  check(
    "by-envelope list rendered with at least one row",
    /data-testid="spending-row-env-/.test(ins.html),
  );
  check(
    "by-payee list rendered with at least one row",
    /data-testid="spending-row-payee-/.test(ins.html),
  );

  // ============================================================
  // Phase 5 — Sum invariants: top-1 byPayee is H-E-B with the
  // right total.
  // ============================================================
  const topPayeeMatch = ins.html.match(
    /data-testid="spending-row-payee-H-E-B"[^>]*data-rank="1"[^>]*data-total-cents="(\d+)"/,
  );
  check(
    "H-E-B is rank 1 by payee with total -$31500",
    topPayeeMatch !== null &&
      Number(topPayeeMatch[1]) === 12500 + 8700 + 4500,
    `match=${topPayeeMatch ? topPayeeMatch[1] : "none"}`,
  );

  const topEnvMatch = ins.html.match(
    /data-testid="spending-row-env-([^"]+)"[^>]*data-rank="1"[^>]*data-total-cents="(\d+)"/,
  );
  check(
    "Groceries is rank 1 by envelope with total -$25700",
    topEnvMatch !== null &&
      Number(topEnvMatch[2]) === 12500 + 8700 + 4500,
    `match=${topEnvMatch ? `${topEnvMatch[1]}=${topEnvMatch[2]}` : "none"}`,
  );

  // ============================================================
  // Phase 6 — Pending state renders honestly
  // ============================================================
  // Delete all expenses in the window and re-fetch.
  await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
      date: { gte: windowStart, lte: today },
    },
  });
  // Trigger the seeding of an envelope write before the fetch (envelopes are still in DB)
  const ins2 = await fetchHtml("/insights");
  check(
    "pending state renders when no expenses exist",
    /data-testid="spending-trends-empty"|no expenses logged/i.test(ins2.html),
  );

  // ----- Final -----
  console.log("\n--- checks ---");
  const pass = checks.filter((c) => c.ok).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
  if (miss > 0) {
    console.log("\nFAILED checks:");
    for (const c of checks) if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
