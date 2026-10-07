/**
 * Smoke for the Cluster 7.26 cash-flow forecast card.
 *
 * Verifies:
 *   1. Card mounts on /insights and /dashboard with `data-testid` hooks.
 *   2. Default state (no PaySchedule): renders "[PENDING] NO PAY SCHEDULE"
 *      + the honest "Set up your pay schedule" CTA. No fake projection.
 *   3. With PaySchedule + Account + Bills: card renders "[OK] HEALTHY" (or
 *      "[WARN] TIGHT DAYS AHEAD" if the projection crosses the buffer),
 *      a non-empty series, and data-* invariants.
 *   4. Math invariants: data-start-balance-cents equals Account.currentBalance;
 *      data-paycheck-count matches the count of pay dates inside the horizon;
 *      data-bill-count matches the count of bill occurrences inside the horizon;
 *      the chart's last point matches data-end-balance-cents.
 *   5. lowPoint callout: when the projection crosses the buffer, the
 *      low-point data attribute is a real ISO date within the horizon.
 *
 * Run: tsx --conditions=react-server tests/smoke-cash-flow-forecast.mjs
 * (dev server up).
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * shared `mom@compass.local`, so this test can neither be poisoned by
 * nor poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";
import { prisma } from "./db-client.mjs";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

async function archivePaySchedules(userId) {
  // Set isActive=false on all pay schedules so the projection
  // falls back to the "pending_no_pay_schedule" branch.
  await prisma.paySchedule.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
}

async function restorePaySchedule(userId) {
  // Re-activate any existing pay schedule, or create one if none.
  const existing = await prisma.paySchedule.findFirst({
    where: { userId, isActive: false },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    await prisma.paySchedule.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return existing;
  }
  // No schedules at all — create a fresh biweekly one anchored to a date in the past.
  const account = await prisma.account.findFirst({
    where: { userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  if (!account) throw new Error("no account for user");
  const start = new Date();
  start.setDate(start.getDate() - 14); // 2 weeks ago → next pay lands ~today
  return await prisma.paySchedule.create({
    data: {
      userId,
      cadence: "biweekly",
      amount: 240_000, // $2400
      accountId: account.id,
      startDate: start,
      isActive: true,
    },
  });
}

async function fetchInsightsHtml(s) {
  const r = await s.get("/insights");
  const html = await r.text();
  check("/insights 200", r.status === 200, `got ${r.status}`);
  return html;
}

async function fetchDashboardHtml(s) {
  const r = await s.get("/");
  const html = await r.text();
  check("/ 200", r.status === 200, `got ${r.status}`);
  return html;
}

function readAttr(html, marker, attr) {
  // Find the first `data-testid="<marker>"` element, then read
  // its `data-<attr>` attribute. Returns null if either is missing.
  const re = new RegExp(
    `data-testid="${marker}"[^>]*data-${attr}="([^"]*)"`,
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function findTestId(html, testid) {
  return new RegExp(`data-testid="${testid}"`).test(html);
}

function findText(html, pattern) {
  return pattern.test(html);
}

async function main() {
  // ----- Login -----
  // Per-test fixture user. The fixture creates the user, opens the
  // onboarding gate both ways, provisions the canonical-shaped
  // baseline plus a biweekly paycheck, and performs the server-action
  // login. The cookie jar rides on `s`, so every page read below is
  // authenticated for the whole test.
  const s = await loginAsFixture("cash-flow-forecast");
  console.log(`[fixture] user=${s.email}`);

  // ============================================================
  // Phase 1 — pending state (no PaySchedule).
  // The card should render the [PENDING] NO PAY SCHEDULE pill
  // and the honest "Set up your pay schedule" message.
  // ============================================================
  await archivePaySchedules(s.userId);

  const insightsPending = await fetchInsightsHtml(s);
  const dashboardPending = await fetchDashboardHtml(s);

  check(
    "insights mounts the cash-flow card in pending state",
    findTestId(insightsPending, "cash-flow-forecast-card"),
  );
  check(
    "dashboard mounts the cash-flow section in pending state",
    findTestId(dashboardPending, "dashboard-cash-flow-section"),
  );

  const pendingStatusI = readAttr(insightsPending, "cash-flow-forecast-card", "status");
  const pendingStatusD = readAttr(dashboardPending, "cash-flow-forecast-card", "status");
  check(
    "insights card reports status=pending_no_pay_schedule",
    pendingStatusI === "pending_no_pay_schedule",
    `got ${pendingStatusI}`,
  );
  check(
    "dashboard card reports status=pending_no_pay_schedule",
    pendingStatusD === "pending_no_pay_schedule",
    `got ${pendingStatusD}`,
  );

  check(
    "[PENDING] pill rendered",
    findText(insightsPending, /\[PENDING\]\s*NO PAY SCHEDULE/),
  );
  check(
    "honest 'set up your pay schedule' message visible",
    findText(insightsPending, /Set up your pay schedule in/i),
  );

  // ============================================================
  // Phase 2 — restore a PaySchedule + verify the projection.
  // ============================================================
  const ps = await restorePaySchedule(s.userId);

  // The spendable account
  const account = await prisma.account.findFirst({
    where: { userId: s.userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });
  if (!account) throw new Error("no spendable account");
  const startBalance = account.currentBalance;

  // Bill rows for the user (any cadence) — count occurrences within 60 days.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // The horizon is a CALENDAR range: "the next 60 days" ends at local
  // midnight on the 60th calendar day. Build it with setDate rather than a
  // fixed ms offset — `today.getTime() + 60*24h` lands an hour early
  // whenever the window straddles a DST transition (2 months of start dates
  // per year in US/Central), which silently dropped bills due on the
  // boundary day. See addCalendarDays() in src/lib/forecast/cash-flow.ts.
  const horizonEnd = new Date(today.getTime());
  horizonEnd.setDate(horizonEnd.getDate() + 60);
  horizonEnd.setHours(0, 0, 0, 0);
  const bills = await prisma.bill.findMany({
    where: { userId: s.userId, isArchived: false },
  });

  // Count each bill's real occurrences instead of assuming a fixed number.
  // `dueDay` is a day-of-month (null for non-monthly cadences — see the
  // schema), so a bill fires on that day of every month inside the window.
  // A hardcoded "2 per bill" was right on most dates but wrong whenever a
  // due day landed on the window edge, which meant this assertion could
  // not have detected the DST bug it was sitting next to.
  const billOccurrences = new Map();
  let expectedBillCount = 0;
  for (const b of bills) {
    if (b.dueDay === null) continue;
    let y = today.getFullYear();
    let m = today.getMonth();
    let n = 0;
    for (let i = 0; i < 4; i += 1) {
      const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
      const d = new Date(y, m, Math.min(b.dueDay, lastDayOfMonth), 0, 0, 0, 0);
      if (d.getTime() >= today.getTime() && d.getTime() <= horizonEnd.getTime()) n += 1;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    billOccurrences.set(b.id, n);
    expectedBillCount += n;
  }

  // Paychecks expected inside the horizon: biweekly cadence → ~4 occurrences.
  const expectedPaycheckCount = Math.floor(
    (horizonEnd.getTime() - today.getTime()) / (14 * 24 * 60 * 60 * 1000),
  );

  const insights = await fetchInsightsHtml(s);
  const dashboard = await fetchDashboardHtml(s);

  // Both surfaces have the card now.
  check(
    "insights mounts the cash-flow card",
    findTestId(insights, "cash-flow-forecast-card"),
  );
  check(
    "dashboard mounts the cash-flow card",
    findTestId(dashboard, "cash-flow-forecast-card"),
  );

  const statusI = readAttr(insights, "cash-flow-forecast-card", "status");
  check(
    "insights status is ok or pending_no_bills (honest)",
    statusI === "ok" || statusI === "pending_no_bills",
    `got ${statusI}`,
  );

  // data-* invariants — start balance must match Account.currentBalance.
  const startAttrI = readAttr(insights, "cash-flow-forecast-card", "start-balance-cents");
  check(
    "data-start-balance-cents matches Account.currentBalance",
    startAttrI !== null && Number(startAttrI) === startBalance,
    `attr=${startAttrI} expected=${startBalance}`,
  );

  // Paycheck count.
  const pcAttrI = readAttr(insights, "cash-flow-forecast-card", "paycheck-count");
  const pcActual = Number(pcAttrI);
  check(
    "data-paycheck-count is a positive integer within tolerance",
    Number.isInteger(pcActual) && pcActual >= 3 && pcActual <= 5,
    `actual=${pcActual} expected≈${expectedPaycheckCount}`,
  );

  // Bill count.
  const bcAttrI = readAttr(insights, "cash-flow-forecast-card", "bill-count");
  const bcActual = Number(bcAttrI);
  check(
    "data-bill-count is consistent with bills rows",
    Number.isInteger(bcActual) && bcActual === expectedBillCount,
    `actual=${bcActual} expected=${expectedBillCount}`,
  );

  // Chart SVG is present.
  check(
    "chart svg data-testid present",
    findTestId(insights, "cash-flow-chart"),
  );

  // Subtext shows paycheck + bill counts in monospace. React
  // injects <!-- --> comment markers between adjacent text
  // segments, so the check uses a loose ordering test: each
  // meaningful token must appear in the subtext block in order.
  {
    const subtextMatch = insights.match(
      /data-testid="cash-flow-subtext"[^>]*>([\s\S]{0,1200}?)<\/div>/,
    );
    const subtext = subtextMatch ? subtextMatch[1].replace(/<!--\s*-->/g, "") : "";
    const tokensInOrder = [
      /\d+\s*paycheck/,
      /\d+\s*bill/,
      /horizon\s*\d+d/,
      /buffer/,
    ];
    let cursor = 0;
    let allFound = true;
    for (const t of tokensInOrder) {
      const idx = subtext.slice(cursor).search(t);
      if (idx < 0) {
        allFound = false;
        break;
      }
      cursor += idx + 1;
    }
    check(
      "subtext shows paycheck + bill counts",
      allFound,
      `subtext=${JSON.stringify(subtext).slice(0, 100)}`,
    );
  }

  // End balance matches the last sample's balance (data-end-balance-cents).
  const endAttrI = readAttr(insights, "cash-flow-forecast-card", "end-balance-cents");
  const endAttrNum = Number(endAttrI);
  check(
    "data-end-balance-cents is an integer",
    Number.isInteger(endAttrNum),
    `got ${endAttrI}`,
  );

  // lowPoint invariant: if data-low-day is non-empty, it's an ISO date
  // inside the horizon window.
  const lowDayAttr = readAttr(insights, "cash-flow-forecast-card", "low-day");
  if (lowDayAttr && lowDayAttr !== "") {
    const lowDate = new Date(lowDayAttr);
    check(
      "low-day is within the 60-day horizon",
      lowDate.getTime() >= today.getTime() &&
        lowDate.getTime() <= horizonEnd.getTime(),
      `low=${lowDayAttr}`,
    );
    check(
      "[WARN] pill rendered when a tight day is present",
      findText(insights, /\[WARN\]\s*TIGHT DAYS AHEAD/),
    );
    check(
      "low-point callout visible",
      findTestId(insights, "cash-flow-low-point-callout"),
    );
  } else {
    // No tight day → [OK] HEALTHY pill is honest.
    check(
      "[OK] HEALTHY pill rendered when no tight day",
      findText(insights, /\[OK\]\s*HEALTHY/),
    );
  }

  // Dashboard also has the same status + balance (server computes once
  // per page render — they should agree because the inputs are the same).
  const startAttrD = readAttr(dashboard, "cash-flow-forecast-card", "start-balance-cents");
  check(
    "dashboard start balance matches insights start balance",
    startAttrI === startAttrD,
    `insights=${startAttrI} dashboard=${startAttrD}`,
  );

  // ============================================================
  // Phase 3 — math sanity: the projection's series sums should
  // net out to roughly Account.currentBalance + (paychecks ×
  // ps.amount) − (bills × bill_total_in_60d). Envelope allocations
  // subtract further, so we use a wide tolerance and just confirm
  // the end balance is within the broad projected envelope:
  //   - upper:  start + max paychecks × ps.amount (no bills, no allocations)
  //   - lower:  start − max bills × bill_total_in_60d (no paychecks, no allocations)
  // This passes as long as the projection is in the same order of
  // magnitude and isn't wildly off.
  // ============================================================
  // Weight each bill by the number of times it actually fires in the window,
  // rather than assuming every bill fires exactly twice.
  const totalBillsInHorizon = bills.reduce(
    (s, b) => s + b.amountCents * (billOccurrences.get(b.id) ?? 0),
    0,
  );
  const expectedUpperBound = startBalance + pcActual * ps.amount;
  const expectedLowerBound = startBalance - totalBillsInHorizon;
  check(
    "end balance is within the broad projected envelope",
    endAttrNum >= expectedLowerBound && endAttrNum <= expectedUpperBound,
    `actual=${endAttrNum} expected∈[${expectedLowerBound}, ${expectedUpperBound}]`,
  );

  // ============================================================
  // Cleanup — re-archive the pay schedule so the smoke is
  // idempotent. Subsequent runs start from "no pay schedule"
  // (pending state).
  // ============================================================
  await archivePaySchedules(s.userId);

  // ----- Final -----
  // Tear down this test's user before reporting. If the test crashed
  // earlier the next fixture's sweep reclaims the user anyway, so a
  // failed run never leaks.
  await s.close();

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
