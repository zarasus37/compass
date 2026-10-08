/**
 * Smoke: tenant isolation for pay periods and engine preferences.
 *
 * Cluster 7.32c. Public multi-user registration landed in 54a7b83 while
 * the financial state under it stayed global:
 *
 *   * getCurrentPayPeriod() did findFirst({ isActive: true }) with no
 *     user filter, and rollForward() took the newest active PaySchedule
 *     from ANY user.
 *   * The engine level lived on the single global SystemSettings row,
 *     and toggleEngineAction() had no requireUser().
 *
 * Two people on different pay cycles therefore shared one window: one
 * person's rollover moved the other's budget dates, and one person's
 * toggle switched the other's engine.
 *
 * This smoke creates TWO users with DIFFERENT pay schedules and proves
 * they stay independent -- including across rollover, under concurrent
 * requests, and with a legacy NULL-owner period left in the table.
 *
 * Run: npx tsx --conditions=react-server tests/smoke-tenant-isolation.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./db-client.mjs";
import {
  getCurrentPayPeriod,
  containingPayPeriod,
  startOfDay,
} from "../src/lib/mock.ts";
import { payDateInPeriod } from "../src/lib/paycheck-scheduler.ts";

// NOTE: `engine-actions.ts` is deliberately NOT imported here. It pulls
// in `next/navigation` (via @/server/auth/user) and therefore the whole
// app-router runtime, which cannot boot outside a Next server. The
// engine level is a plain column on User, so the isolation property is
// proven against the data layer, and the action's authorization is
// asserted against its source -- the same split smoke-deploy.mjs uses.

let pass = 0;
let miss = 0;
const failures = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  if (ok) pass++;
  else {
    miss++;
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
  }
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? "  -- " + detail : ""}`);
}

/** Reads the engine level exactly the way getActiveEngineLevel() does. */
async function engineLevel(userId) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeEngineLvl: true },
  });
  return row?.activeEngineLvl ?? "L1";
}

/**
 * Strip comments before grepping source.
 *
 * An earlier version of this check did /getCurrentPayPeriod\(\s*\)/ over
 * the raw file and matched the PROSE in a doc comment that names the
 * function with empty parens. The check was wrong, not the code, so it
 * flagged a green implementation. Comments are not call sites.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const stamp = `${process.pid}${Date.now().toString(36)}`;
const emailA = `iso-a-${stamp}@compass.local`;
const emailB = `iso-b-${stamp}@compass.local`;

// ONLY the rows this run created are tracked and deleted.
//
// The first version of this cleanup was
// `prisma.payPeriod.deleteMany({ where: { userId: null } })` — which
// deletes EVERY unowned period in the database, not just the fixture's.
// On a local database that is real data belonging to nobody; on CI it is
// whatever the previous smoke left behind. Both are destroyed by a test
// that was only trying to tidy up after itself.
const createdPeriodIds = new Set();

async function cleanup() {
  // Rows created by this run, tracked by id. Anything not in this set is
  // left alone even if it is unowned.
  if (createdPeriodIds.size > 0) {
    await prisma.payPeriod
      .deleteMany({ where: { id: { in: [...createdPeriodIds] } } })
      .catch(() => {});
  }
  for (const email of [emailA, emailB, `iso-c-${stamp}@compass.local`]) {
    await prisma.user.deleteMany({ where: { email } }).catch(() => {});
  }
}

async function main() {
  await cleanup();

  const a = await prisma.user.create({
    data: { name: "Iso A", email: emailA, passwordHash: "x" },
  });
  const b = await prisma.user.create({
    data: { name: "Iso B", email: emailB, passwordHash: "x" },
  });

  // PaySchedule.accountId is NOT NULL, so each user needs an account.
  const acctA = await prisma.account.create({
    data: { userId: a.id, name: "A checking", type: "checking" },
  });
  const acctB = await prisma.account.create({
    data: { userId: b.id, name: "B checking", type: "checking" },
  });

  // Deliberately different cadences: A is weekly (7 days), B is
  // biweekly (14). If the windows are scoped, they must differ.
  await prisma.paySchedule.create({
    data: {
      userId: a.id,
      accountId: acctA.id,
      cadence: "weekly",
      amount: 100000,
      startDate: new Date(),
      isActive: true,
    },
  });
  await prisma.paySchedule.create({
    data: {
      userId: b.id,
      accountId: acctB.id,
      cadence: "biweekly",
      amount: 200000,
      startDate: new Date(),
      isActive: true,
    },
  });

  // -- 1. Separate periods, different lengths ----------------------
  const pa = await getCurrentPayPeriod(a.id);
  const pb = await getCurrentPayPeriod(b.id);

  const daysA = Math.round((pa.endDate - pa.startDate) / 86400000);
  const daysB = Math.round((pb.endDate.getTime() - pb.startDate.getTime()) / 86400000);

  check("A gets a DB-backed period", pa.fromDb === true);
  check("B gets a DB-backed period", pb.fromDb === true);
  check("A's period is weekly (7 days)", daysA === 7, `got ${daysA}`);
  check("B's period is biweekly (14 days)", daysB === 14, `got ${daysB}`);
  check(
    "the two users have different period lengths",
    daysA !== daysB,
    `${daysA} vs ${daysB}`,
  );

  // -- 2. Exactly one active period each, owned correctly ----------
  const activeA = await prisma.payPeriod.findMany({
    where: { isActive: true, userId: a.id },
  });
  const activeB = await prisma.payPeriod.findMany({
    where: { isActive: true, userId: b.id },
  });
  check("A has exactly one active period", activeA.length === 1, `got ${activeA.length}`);
  check("B has exactly one active period", activeB.length === 1, `got ${activeB.length}`);
  check("A's active period is owned by A", activeA.length === 1 && activeA[0].userId === a.id);
  check("B's active period is owned by B", activeB.length === 1 && activeB[0].userId === b.id);
  check(
    "the two users do not share a period row",
    activeA.length === 1 && activeB.length === 1 && activeA[0].id !== activeB[0].id,
  );

  // -- 3. A legacy NULL-owner period is never served ---------------
  // The migration deliberately leaves ambiguous legacy rows with
  // userId = NULL. The scoped reader must ignore them rather than hand
  // one user another tenant's window.
  const legacy = await prisma.payPeriod.create({
    data: {
      userId: null,
      startDate: new Date("1999-01-01T00:00:00Z"),
      endDate: new Date("1999-01-08T00:00:00Z"),
      isActive: true,
    },
  });
  createdPeriodIds.add(legacy.id);
  const paAfter = await getCurrentPayPeriod(a.id);
  const pbAfter = await getCurrentPayPeriod(b.id);
  check(
    "A is not served the legacy global period",
    paAfter.startDate.getTime() !== legacy.startDate.getTime(),
    `A start=${paAfter.startDate.toISOString()}`,
  );
  check(
    "B is not served the legacy global period",
    pbAfter.startDate.getTime() !== legacy.startDate.getTime(),
    `B start=${pbAfter.startDate.toISOString()}`,
  );
  check(
    "the legacy row is still present (nothing was deleted)",
    (await prisma.payPeriod.count({ where: { id: legacy.id } })) === 1,
  );
  await prisma.payPeriod.delete({ where: { id: legacy.id } });

  // -- 4. Rollover is isolated -------------------------------------
  // Expire BOTH periods, then read A. Only A may move.
  const past = new Date(Date.now() - 40 * 86400000);
  await prisma.payPeriod.updateMany({
    where: { userId: a.id, isActive: true },
    data: { startDate: past, endDate: new Date(past.getTime() + 86400000) },
  });
  await prisma.payPeriod.updateMany({
    where: { userId: b.id, isActive: true },
    data: { startDate: past, endDate: new Date(past.getTime() + 86400000) },
  });

  const bBeforeRoll = await prisma.payPeriod.findFirst({
    where: { userId: b.id, isActive: true },
  });

  const rolledA = await getCurrentPayPeriod(a.id);
  check(
    "A's expired period rolled forward to contain today",
    rolledA.startDate.getTime() <= Date.now() &&
      rolledA.endDate.getTime() > Date.now(),
    `${rolledA.startDate.toISOString()} .. ${rolledA.endDate.toISOString()}`,
  );

  const bAfterRoll = await prisma.payPeriod.findFirst({
    where: { userId: b.id, isActive: true },
  });
  check(
    "A's rollover did NOT move B's period",
    bAfterRoll.startDate.getTime() === bBeforeRoll.startDate.getTime() &&
      bAfterRoll.endDate.getTime() === bBeforeRoll.endDate.getTime(),
    "B's window changed when only A was read",
  );
  check(
    "B's period is still expired after A rolled forward",
    bAfterRoll.endDate.getTime() <= Date.now(),
    "B was rolled without being asked",
  );

  // -- 5. Engine preference is per-user ----------------------------
  check("A starts on L1", (await engineLevel(a.id)) === "L1");
  check("B starts on L1", (await engineLevel(b.id)) === "L1");

  await prisma.user.update({
    where: { id: a.id },
    data: { activeEngineLvl: "L2" },
  });
  check("A toggles to L2", (await engineLevel(a.id)) === "L2");
  check(
    "B is UNAFFECTED by A's toggle",
    (await engineLevel(b.id)) === "L1",
    "global leak: one user's toggle changed another",
  );

  // -- 6. Concurrency: one active period per user ------------------
  // A brand-new user hit by simultaneous requests must not end up with
  // two active periods. The partial unique index is the guarantee.
  const c = await prisma.user.create({
    data: { name: "Iso C", email: `iso-c-${stamp}@compass.local`, passwordHash: "x" },
  });
  const acctC = await prisma.account.create({
    data: { userId: c.id, name: "C checking", type: "checking" },
  });
  await prisma.paySchedule.create({
    data: {
      userId: c.id,
      accountId: acctC.id,
      cadence: "weekly",
      amount: 100000,
      startDate: new Date(),
      isActive: true,
    },
  });

  const results = await Promise.all([
    getCurrentPayPeriod(c.id),
    getCurrentPayPeriod(c.id),
    getCurrentPayPeriod(c.id),
    getCurrentPayPeriod(c.id),
  ]);
  const activeC = await prisma.payPeriod.findMany({
    where: { isActive: true, userId: c.id },
  });
  check(
    "4 concurrent reads still leave exactly ONE active period",
    activeC.length === 1,
    `got ${activeC.length}`,
  );
  check(
    "all concurrent reads agree on the same window",
    results.every((r) => r.startDate.getTime() === results[0].startDate.getTime()),
    "readers disagreed on the period",
  );

  // -- 7. Cross-user read is impossible at the data layer ----------
  const aRows = await prisma.payPeriod.findMany({
    where: { userId: a.id },
    select: { id: true },
  });
  const bRows = await prisma.payPeriod.findMany({
    where: { userId: b.id },
    select: { id: true },
  });
  const bIds = new Set(bRows.map((r) => r.id));
  check("A owns at least one period", aRows.length > 0);
  check("B owns at least one period", bRows.length > 0);
  check(
    "no period row is owned by both users",
    aRows.every((r) => !bIds.has(r.id)),
    "a row is owned by both",
  );

  await prisma.user.delete({ where: { id: c.id } });

  // -- 8. The action boundary is authorized and scoped -------------
  // The read path is proven above against the data layer; these assert
  // the mutation boundary, which cannot be executed outside a server.
  const engineSrc = stripComments(
    readFileSync(join(process.cwd(), "src/app/(app)/settings/engine-actions.ts"), "utf8"),
  );
  const toggleBody =
    /export async function toggleEngineAction[\s\S]*?\n\}/.exec(engineSrc)?.[0] ?? "";

  check(
    "toggleEngineAction calls requireUser()",
    /requireUser\(\)/.test(toggleBody),
    "a server action with no authorization check",
  );
  check(
    "toggleEngineAction writes the USER's row, not GLOBAL_CONFIG",
    /prisma\.user\.update/.test(toggleBody) &&
      !/GLOBAL_CONFIG|systemSettings/.test(toggleBody),
    "still writing the global settings row",
  );
  check(
    "getActiveEngineLevel requires a userId parameter",
    /getActiveEngineLevel\(\s*userId:\s*string\s*\)/.test(engineSrc),
    "an unscoped reader is the bug being fixed",
  );
  check(
    "no unscoped getActiveEngineLevel() call remains",
    !/getActiveEngineLevel\(\s*\)/.test(engineSrc),
    "an unscoped reader call remains",
  );

  const mockSrc = stripComments(
    readFileSync(join(process.cwd(), "src/lib/mock.ts"), "utf8"),
  );
  check(
    "getCurrentPayPeriod requires a userId parameter",
    /getCurrentPayPeriod\(\s*userId:\s*string\s*,\s*\)/.test(mockSrc),
    "an unscoped period reader is the bug being fixed",
  );
  check(
    "getCurrentPayPeriod filters on userId",
    /where:\s*\{\s*isActive:\s*true,\s*userId\s*\}/.test(mockSrc),
    "the period query is not scoped",
  );
  check(
    "rollForward looks up the caller's own PaySchedule",
    /paySchedule\.findFirst\(\{\s*where:\s*\{\s*isActive:\s*true,\s*userId\s*\}/.test(
      mockSrc,
    ),
    "rollForward still reads another user's schedule",
  );
  check(
    "no unscoped getCurrentPayPeriod() call remains",
    !/getCurrentPayPeriod\(\s*\)/.test(mockSrc),
    "an unscoped reader call remains",
  );

  // -- 9. The period is ANCHORED to the payday, not to `now` --------
  // Reproduced regression: ensureUserPayPeriod used startDate = now, so
  // a first read at 09:00 on payday produced a period starting 09:00.
  // payDateInPeriod returns the first payday >= periodStart, so the
  // payday at 00:00 was "before" the period start, it stepped to the
  // NEXT payday, and the scheduler (which gates on payDate > now)
  // skipped that very Friday.
  const fridayAnchor = new Date(2026, 9, 9, 14, 23, 0, 0); // Fri 9 Oct 2026, seeded at 14:23
  const fridayMorning = new Date(2026, 9, 9, 9, 0, 0, 0);

  const onPayday = containingPayPeriod(
    { startDate: fridayAnchor, cadence: "weekly" },
    fridayMorning,
  );
  check(
    "first access ON payday starts the period at that payday's midnight",
    startOfDay(onPayday.startDate).getTime() === startOfDay(fridayAnchor).getTime(),
    `got ${onPayday.startDate.toISOString()}`,
  );
  check(
    "on-payday period ends one cadence after it starts (7 days)",
    Math.round((onPayday.endDate - onPayday.startDate) / 86400000) === 7,
    `got ${Math.round((onPayday.endDate - onPayday.startDate) / 86400000)}`,
  );

  // The scheduler's actual gate, reproduced end to end.
  const payDateOnPayday = payDateInPeriod(
    fridayAnchor,
    "weekly",
    onPayday.startDate,
  );
  check(
    "scheduler selects TODAY's payday when first accessed on payday",
    payDateOnPayday !== null &&
      startOfDay(payDateOnPayday).getTime() === startOfDay(fridayAnchor).getTime(),
    `got ${payDateOnPayday ? payDateOnPayday.toISOString() : "null"}`,
  );
  check(
    "that payday is NOT in the future, so the run is due (not not_due)",
    payDateOnPayday !== null && payDateOnPayday.getTime() <= fridayMorning.getTime(),
    "the missed-payday regression is back",
  );

  // Mid-period access: same containing window, payday already past.
  const saturday = new Date(2026, 9, 10, 11, 0, 0, 0);
  const midPeriod = containingPayPeriod(
    { startDate: fridayAnchor, cadence: "weekly" },
    saturday,
  );
  check(
    "mid-period access lands in the SAME window",
    midPeriod.startDate.getTime() === onPayday.startDate.getTime(),
    `got ${midPeriod.startDate.toISOString()} vs ${onPayday.startDate.toISOString()}`,
  );
  const payDateMid = payDateInPeriod(fridayAnchor, "weekly", midPeriod.startDate);
  check(
    "mid-period still selects the period's payday (already past, not the next one)",
    payDateMid !== null &&
      startOfDay(payDateMid).getTime() === startOfDay(fridayAnchor).getTime(),
    `got ${payDateMid ? payDateMid.toISOString() : "null"}`,
  );
  check(
    "mid-period payday has already passed",
    payDateMid !== null && payDateMid.getTime() <= saturday.getTime(),
    "would double-pay the same period",
  );

  // The exact day AFTER payday rolls to a new window.
  const nextFriday = new Date(2026, 9, 16, 9, 0, 0, 0);
  const rolled = containingPayPeriod(
    { startDate: fridayAnchor, cadence: "weekly" },
    nextFriday,
  );
  check(
    "the next payday rolls the window forward",
    startOfDay(rolled.startDate).getTime() === startOfDay(nextFriday).getTime(),
    `got ${rolled.startDate.toISOString()}`,
  );

  // A long dormancy must land on the correct window, not one period on.
  const monthsLater = new Date(2026, 10, 20, 15, 0, 0, 0);
  const afterGap = containingPayPeriod(
    { startDate: fridayAnchor, cadence: "weekly" },
    monthsLater,
  );
  check(
    "a long gap lands on the payday containing `now`, not one step on",
    afterGap.startDate.getTime() <= monthsLater.getTime() &&
      afterGap.endDate.getTime() > monthsLater.getTime(),
    `${afterGap.startDate.toISOString()} .. ${afterGap.endDate.toISOString()}`,
  );

  // The anchor's time-of-day must not leak into the pay date.
  const seededAtAfternoon = payDateInPeriod(fridayAnchor, "weekly", fridayMorning);
  check(
    "a 14:23 seed time does not push the pay date into the future",
    seededAtAfternoon !== null &&
      seededAtAfternoon.getHours() === 0 &&
      seededAtAfternoon.getMinutes() === 0,
    `got ${seededAtAfternoon ? seededAtAfternoon.toISOString() : "null"}`,
  );

  await cleanup();
}

try {
  await main();
} catch (err) {
  console.error("tenant isolation smoke crashed:", err);
  miss++;
  failures.push(`crash: ${err.message}`);
} finally {
  // Runs even if an assertion threw, so a failed run does not leave its
  // fixtures behind to poison the next one.
  await cleanup().catch(() => {});
}

console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} -- ${pass} passed, ${miss} missed`);
if (miss > 0) {
  console.log("\nFailed checks:");
  for (const f of failures) console.log(`  - ${f}`);
}
// exitCode, not process.exit: a forced exit after live queries can abort
// mid-teardown on Windows.
process.exitCode = miss === 0 ? 0 : 1;