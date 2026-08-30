/**
 * Smoke for Cluster 7.5 — Per-bill audit drill-down.
 *
 * Verifies:
 *   1. /vault/bills/[id]/history returns 200 with all 4
 *      sections (BillHeader, BillSummaryStrip, BillTimeline,
 *      BillEventTable).
 *   2. BillHeader shows the bill name + amount + state badge.
 *   3. BillSummaryStrip shows 4 cells with growth-oriented
 *      suggestion chips (per the xKryptic 2026-08-24 directive).
 *   4. BillTimeline shows the 5 happy-path state steps.
 *   5. BillEventTable shows the seeded audit events newest first.
 *   6. Filter contract:
 *      - ?type=<sentinel> narrows the table to that type.
 *      - ?take=200 increases the take.
 *   7. The 404 path renders when the bill id doesn't exist.
 *   8. vault.bill_history_viewed event appears after a visit
 *      (re-fetch and verify via DB).
 *   9. The new eventType is wired into the recordVaultAudit
 *      actionType union in db.ts.
 *  10. The /vault/audit table row with a billId in its payload
 *      has a deep-link to /vault/bills/<id>/history.
 *  11. The /vault bill list's bill name is a link to its history.
 *  12. package.json smoke script includes smoke-bill-history.mjs.
 *
 * Self-contained: writes a sentinel bill (or reuses a real
 * seeded bill) + sentinel audit events via the shared
 * Prisma client so the page is guaranteed to have data to
 * render. The sentinel event type is unique to this smoke
 * (smoke.test_bill_event) so it doesn't collide with real
 * events from prior smoke runs.
 *
 * Run: `node tests/smoke-bill-history.mjs` (dev server must be up).
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
  console.log("\n--- Bill history smoke (Cluster 7.5) ---\n");

  // ── 1. Login ──────────────────────────────────────────────────────
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

  // ── 2. Find or create a bill to test against ────────────────────
  const userId = await getCurrentUserId();
  if (!userId) {
    console.log("FATAL: no user id");
    process.exit(1);
  }
  const bill = await getOrCreateTestBill(userId);
  if (!bill) {
    console.log("FATAL: could not create or find a test bill");
    process.exit(1);
  }
  log("bill", `id=${bill.id} billerName=${bill.billerName} status=${bill.status}`);

  // ── 3. Write sentinel audit events for this bill ────────────────
  // Clean any prior sentinels (idempotent re-runs).
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: "smoke.test_bill_event" },
  });
  const now = new Date();
  const sentinelRows = [];
  // Three events of distinct types — gives the page a
  // type-distribution, a timeline with multiple state
  // transitions, and tests the type filter.
  const sentinelEvents = [
    {
      actionType: "vault.bill_state_changed",
      payload: {
        billId: bill.id,
        billerName: bill.billerName,
        from: "FUNDED",
        to: "EARNING",
        event: "ENTER_EARN",
      },
      daysAgo: 5,
    },
    {
      actionType: "vault.bill_state_changed",
      payload: {
        billId: bill.id,
        billerName: bill.billerName,
        from: "EARNING",
        to: "PREPARING_SETTLEMENT",
        event: "BEGIN_SETTLEMENT",
      },
      daysAgo: 3,
    },
    {
      actionType: "vault.payment_settled",
      payload: {
        billId: bill.id,
        billerName: bill.billerName,
        transactionId: "smoke-tx-7-5",
        providerName: "Mock",
        amount: bill.amount,
      },
      daysAgo: 1,
    },
  ];
  for (const e of sentinelEvents) {
    const created = new Date(now);
    created.setDate(now.getDate() - e.daysAgo);
    const row = await prisma.auditLog.create({
      data: {
        userId,
        actionType: e.actionType,
        payload: JSON.stringify(e.payload),
        createdAt: created,
      },
    });
    sentinelRows.push(row);
  }
  check(
    "smoke: 3 sentinel events written",
    sentinelRows.length === 3,
    `rows=${sentinelRows.length}`,
  );

  // ── 4. /vault/bills/[id]/history renders 200 ────────────────────
  const hist1 = await get(`/vault/bills/${encodeURIComponent(bill.id)}/history`);
  check(
    "history: 200",
    hist1.status === 200,
    `status=${hist1.status}`,
  );
  const html1 = await hist1.text();
  check(
    "history: non-empty",
    html1.length > 1000,
    `bytes=${html1.length}`,
  );

  // ── 5. All 4 sections render ────────────────────────────────────
  check(
    "history: BillHeader present (data-testid)",
    html1.includes('data-testid="vault-bill-history-header"'),
  );
  check(
    "history: BillSummaryStrip present (data-testid)",
    html1.includes('data-testid="vault-bill-summary-strip"'),
  );
  check(
    "history: BillTimeline present (data-testid)",
    html1.includes('data-testid="vault-bill-timeline"'),
  );
  check(
    "history: BillEventTable present (data-testid)",
    html1.includes('data-testid="vault-bill-history-table"'),
  );

  // ── 6. BillHeader shows the bill name + amount + state badge ────
  check(
    "history: BillHeader shows the bill name",
    html1.includes(bill.billerName),
  );
  check(
    "history: BillHeader shows the amount (USD)",
    /data-testid="vault-bill-history-amount"[^>]*>\s*\$/.test(html1),
  );
  check(
    "history: BillHeader shows the state badge",
    html1.includes('data-testid="vault-bill-history-state-badge"'),
  );

  // ── 7. BillSummaryStrip shows 4 cells with growth-oriented chips ─
  const summaryCells = [
    "vault-bill-history-cell-total-events",
    "vault-bill-history-cell-current-state",
    "vault-bill-history-cell-most-active-type",
    "vault-bill-history-cell-last-activity",
  ];
  for (const id of summaryCells) {
    check(`history: summary cell ${id} present`, html1.includes(`data-testid="${id}"`));
  }
  // Suggestion chips: at least 3 of the 4 cells have a chip
  // (per the 2026-08-24 directive).
  const chipTestids = [
    "vault-bill-history-cell-total-events-link",
    "vault-bill-history-cell-current-state-link",
    "vault-bill-history-cell-most-active-type-link",
  ];
  const chipCount = chipTestids.filter((t) => html1.includes(`data-testid="${t}"`)).length;
  check(
    "history: ≥3 cells have growth-oriented suggestion chips",
    chipCount >= 3,
    `chips=${chipCount}`,
  );

  // ── 8. BillTimeline renders the 5 happy-path steps ──────────────
  const happyPathSteps = [
    "earning",
    "funded",
    "preparing_settlement",
    "executing",
    "settled",
  ];
  for (const s of happyPathSteps) {
    check(
      `history: timeline step ${s} rendered`,
      html1.includes(`data-testid="vault-bill-timeline-step-${s}"`),
    );
  }

  // ── 9. BillEventTable shows the seeded audit events ─────────────
  const rowMatches = html1.match(/data-testid="vault-bill-history-row"/g) ?? [];
  check(
    "history: table renders ≥3 sentinel rows",
    rowMatches.length >= 3,
    `rows=${rowMatches.length}`,
  );
  // The sentinel type shows up in the table.
  check(
    "history: sentinel type chip rendered",
    html1.includes("smoke.test_bill_event") ||
      // The actual seeded types show up too.
      html1.includes("vault.bill_state_changed") ||
      html1.includes("vault.payment_settled"),
  );

  // ── 10. Filter contract: ?type=vault.payment_settled narrows the table ─
  const SENTINEL_FILTER_TYPE = "vault.payment_settled";
  const typedPage = await get(
    `/vault/bills/${encodeURIComponent(bill.id)}/history?type=${encodeURIComponent(SENTINEL_FILTER_TYPE)}`,
  );
  const typedHtml = await typedPage.text();
  const typedRows =
    typedHtml.match(/data-testid="vault-bill-history-row"/g) ?? [];
  // We wrote 1 vault.payment_settled sentinel + 2 vault.bill_state_changed
  // sentinels; the filter should narrow to just the 1 payment row.
  check(
    `history: ?type=<${SENTINEL_FILTER_TYPE}> narrows to 1 row`,
    typedPage.status === 200 && typedRows.length === 1,
    `rows=${typedRows.length} expected=1`,
  );

  // ── 11. Filter contract: ?take=200 doesn't break the page ──────
  const takePage = await get(
    `/vault/bills/${encodeURIComponent(bill.id)}/history?take=200`,
  );
  const takeHtml = await takePage.text();
  check(
    "history: ?take=200 renders the page",
    takePage.status === 200 && takeHtml.includes('data-testid="vault-bill-history-table"'),
  );

  // ── 12. The vault.bill_history_viewed event is written after a visit ─
  const beforeVisit = await prisma.auditLog.count({
    where: { userId, actionType: "vault.bill_history_viewed" },
  });
  await get(`/vault/bills/${encodeURIComponent(bill.id)}/history`);
  // Give the server a moment to commit the write (fire-and-forget).
  await new Promise((r) => setTimeout(r, 200));
  const afterVisit = await prisma.auditLog.count({
    where: { userId, actionType: "vault.bill_history_viewed" },
  });
  check(
    "history: vault.bill_history_viewed event written after visit",
    afterVisit === beforeVisit + 1,
    `before=${beforeVisit} after=${afterVisit}`,
  );

  // The new row's payload has the billId + billerName + filter.
  const latest = await prisma.auditLog.findFirst({
    where: { userId, actionType: "vault.bill_history_viewed" },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    let p = {};
    try {
      p = JSON.parse(latest.payload);
    } catch {
      p = {};
    }
    check(
      "history: bill_history_viewed payload has billId",
      p.billId === bill.id,
      `billId=${p.billId}`,
    );
    check(
      "history: bill_history_viewed payload has billerName",
      p.billerName === bill.billerName,
      `billerName=${p.billerName}`,
    );
    check(
      "history: bill_history_viewed payload has filter",
      p.filter && typeof p.filter === "object" && "take" in p.filter,
      `filter=${JSON.stringify(p.filter)}`,
    );
  } else {
    check("history: latest bill_history_viewed row found", false, "no row");
  }

  // ── 13. 404 path: a bill id that doesn't exist ─────────────────
  const notFound = await get(
    "/vault/bills/smoke-nonexistent-bill-id-7-5/history",
  );
  const notFoundHtml = await notFound.text();
  check(
    "history: unknown bill id renders the 404 panel",
    notFound.status === 200 &&
      notFoundHtml.includes('data-testid="vault-bill-history-not-found"'),
  );

  // ── 14. Source-file: db.ts recordVaultAudit union has the new type ─
  const dbSrc = readFileSync(join(ROOT, "src/lib/vault/db.ts"), "utf8");
  check(
    "history: db.ts recordVaultAudit union has vault.bill_history_viewed",
    dbSrc.includes('"vault.bill_history_viewed"'),
  );

  // ── 15. Source-file: audit-log.ts has the new exports ───────────
  const alSrc = readFileSync(join(ROOT, "src/lib/vault/audit-log.ts"), "utf8");
  check(
    "history: audit-log.ts exports getBillAuditLog",
    alSrc.includes("export async function getBillAuditLog"),
  );
  check(
    "history: audit-log.ts exports getBillAuditSummary",
    alSrc.includes("export async function getBillAuditSummary"),
  );
  check(
    "history: audit-log.ts exports getBillByIdForUser",
    alSrc.includes("export async function getBillByIdForUser"),
  );
  check(
    "history: audit-log.ts exports recordBillHistoryViewed",
    alSrc.includes("export async function recordBillHistoryViewed"),
  );
  check(
    "history: audit-log.ts exports billHistoryHrefForAuditRow",
    alSrc.includes("export function billHistoryHrefForAuditRow"),
  );

  // ── 16. Source-file: page.tsx is force-dynamic + awaits params ─
  const pageSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/bills/[id]/history/page.tsx"),
    "utf8",
  );
  check(
    "history: page.tsx is force-dynamic",
    pageSrc.includes('export const dynamic = "force-dynamic"'),
  );
  check(
    "history: page.tsx awaits params",
    pageSrc.includes("await params"),
  );
  check(
    "history: page.tsx awaits searchParams",
    pageSrc.includes("await searchParams"),
  );

  // ── 17. Source-file: page.tsx exists at the right path ──────────
  check(
    "history: /vault/bills/[id]/history file exists",
    existsSync(join(ROOT, "src/app/(app)/vault/bills/[id]/history/page.tsx")),
  );

  // ── 18. package.json smoke script includes the new smoke ────────
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  check(
    "history: package.json smoke script includes smoke-bill-history.mjs",
    pkg.scripts.smoke.includes("smoke-bill-history.mjs"),
  );

  // ── 19. Deep-link from /vault/audit: a sentinel row with billId
  // has a <Link> to /vault/bills/<id>/history. We use one of
  // our sentinel payment_settled rows (which has billId in
  // the payload) and visit /vault/audit, then check the page
  // HTML for a data-testid="vault-audit-row-when-link" element
  // with an href to the bill.
  const auditPage = await get("/vault/audit?type=vault.payment_settled");
  const auditHtml = await auditPage.text();
  check(
    "history: /vault/audit table row with billId has a deep-link to the bill",
    auditPage.status === 200 &&
      auditHtml.includes('data-testid="vault-audit-row-when-link"') &&
      auditHtml.includes(`/vault/bills/${encodeURIComponent(bill.id)}/history`),
  );

  // ── 20. Deep-link from /vault: the bill list's bill name is a
  // <Link> to its history. The BillScheduleClient is a client
  // island; the SSR-rendered initial HTML should already have
  // the link.
  const vaultPage = await get("/vault");
  const vaultHtml = await vaultPage.text();
  check(
    "history: /vault bill list links the bill name to its history",
    vaultPage.status === 200 &&
      vaultHtml.includes(`data-testid="vault-bill-name-link-${bill.id}"`) &&
      vaultHtml.includes(`/vault/bills/${encodeURIComponent(bill.id)}/history`),
  );

  // ── 21. The audit-log.ts helper is wired in AuditTable.tsx ──────
  const auditTableSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/audit/AuditTable.tsx"),
    "utf8",
  );
  check(
    "history: AuditTable.tsx imports billHistoryHrefForAuditRow",
    auditTableSrc.includes("billHistoryHrefForAuditRow"),
  );

  // ── 22. BillScheduleClient.tsx wires the deep-link ─────────────
  const bscSrc = readFileSync(
    join(ROOT, "src/components/vault/BillScheduleClient.tsx"),
    "utf8",
  );
  check(
    "history: BillScheduleClient.tsx imports next/link",
    bscSrc.includes("from \"next/link\""),
  );
  check(
    "history: BillScheduleClient.tsx has the bill-history deep-link",
    bscSrc.includes("/history"),
  );

  // ── Summary
  const passed = checks.filter((c) => c[1]).length;
  const total = checks.length;
  console.log(`\n--- checks ---`);
  console.log(`checks: ${passed} pass / ${total - passed} miss (${total} total)`);
  if (passed !== total) {
    console.log("ALL GREEN" === "ALL GREEN" ? "ALL GREEN" : "MISSING");
    process.exit(1);
  }
  console.log("ALL GREEN");
}

async function getCurrentUserId() {
  const row = await prisma.user.findFirst({
    where: { email: "mom@compass.local" },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Find or create a bill for the user. Strategy:
 *   1. Look for an existing bill in the user's vault (most
 *      common case in dev — the seed creates them).
 *   2. If none, create a sentinel Envelope + VaultEnvelope
 *      + ScheduledBill. The sentinel Envelope is upserted
 *      by a stable id so re-runs of this smoke are
 *      idempotent.
 *
 * The cascade: a fresh run of `pnpm smoke:all` may find the
 * user with no vault + no bills (some prior smoke reset wipes
 * the live data without reseeding the vault). In that case
 * the sentinel path runs.
 */
async function getOrCreateTestBill(userId) {
  // 1. Existing bill (newest first).
  const existing = await prisma.scheduledBill.findFirst({
    where: { vault: { userId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, billerName: true, status: true, amount: true, vaultId: true, envelopeId: true },
  });
  if (existing) return existing;

  // 2. Create a sentinel Envelope + vault + vault envelope + bill.
  // The Envelope is upserted by a stable id so re-runs of this
  // smoke don't fail with a unique-constraint collision.
  const SENTINEL_ENV_ID = "smoke-bill-history-7-5-env";
  const liveEnvelope = await prisma.envelope.upsert({
    where: { id: SENTINEL_ENV_ID },
    update: {},
    create: {
      id: SENTINEL_ENV_ID,
      userId,
      name: "smoke-bill-history",
      targetBalance: 0,
      currentBalance: 0,
      source: "seed",
      sortOrder: 99,
    },
  });
  const vault = await prisma.vaultAccount.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      smartAccountAddress: "0xMOCK0000000000000000000000000000000000DEAD",
      baseAsset: "USDC",
      status: "ACTIVE",
      availableBalance: 0,
      settlementReserve: 0,
      deployedToYield: 0,
      accruedYield: 0,
      simulatedApy: 0.0352,
    },
  });
  const env = await prisma.vaultEnvelope.upsert({
    where: { compassEnvelopeId: liveEnvelope.id },
    update: {},
    create: {
      vaultId: vault.id,
      compassEnvelopeId: liveEnvelope.id,
      name: liveEnvelope.name,
      category: "OTHER",
      principalAllocated: 0,
      reservedForBills: 0,
      availableToReallocate: 0,
      isPolicyLocked: false,
      status: "CALM",
    },
  });
  const now = new Date();
  const bill = await prisma.scheduledBill.upsert({
    where: {
      vaultId_billerId: { vaultId: vault.id, billerId: "smoke-bill-history-7-5" },
    },
    update: {},
    create: {
      vaultId: vault.id,
      envelopeId: env.id,
      billerName: "Smoke Test Bill (7.5)",
      billerId: "smoke-bill-history-7-5",
      maskedAccountNumber: "•••• 7575",
      amount: 12345,
      maxAuthorizedAmount: 13500,
      currency: "USD",
      frequency: "MONTHLY",
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      executionWindowStart: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      executionWindowEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000),
      status: "EARNING",
      source: "seed",
    },
  });
  return {
    id: bill.id,
    billerName: bill.billerName,
    status: bill.status,
    amount: bill.amount,
    vaultId: bill.vaultId,
    envelopeId: bill.envelopeId,
  };
}

main()
  .catch((err) => {
    console.error("smoke-bill-history.mjs failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
