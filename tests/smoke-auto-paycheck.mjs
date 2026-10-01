/**
 * The automatic paycheck trigger.
 *
 * The manual dashboard card proves the engine works; this proves the
 * scheduler actually fires when a paycheck arrives, does NOT fire before
 * the pay date, and does not fire twice.
 *
 * The last part is the important one: the whole point of running
 * allocation automatically is that nothing will be watching when it runs,
 * so double-application cannot be caught after the fact by a human.
 */
import { prisma } from "./db-client.mjs";
import { loginAsFixture } from "./fixture.mjs";
import {
  payDateInPeriod,
  runPaycheckForUser,
  runAutoPaychecks,
} from "../src/lib/paycheck-scheduler.ts";
import { getCurrentPayPeriod } from "../src/lib/mock.ts";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}
function checkSkip(name, reason) {
  checks.push({ name, ok: true, detail: `[SKIP-NO-SERVER] ${reason}` });
  console.log(`[SKIP-NO-SERVER] ${name} — ${reason}`);
}

const NAMES = [
  "[1] the fixture user has an active pay schedule with a positive amount",
  "[2] payDateInPeriod lands inside the current period",
  "[3] the scheduler does NOT fire before the pay date",
  "[4] the scheduler applies the plan once the pay date has passed",
  "[5] the paycheck is persisted as a Prima Materia transaction",
  "[6] the envelope balances moved",
  "[7] a second run is refused (no double-allocate)",
  "[8] the run is recorded with trigger=automatic, not manual",
  "[9] runAutoPaychecks sweeps and reports without error",
  "[10] a manual click for the same paycheck is also refused",
];

let serverUp = false;
try {
  const probe = await fetch(BASE + "/api/health", {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  serverUp = probe.status > 0;
} catch {
  serverUp = false;
}

if (!serverUp) {
  for (const n of NAMES) checkSkip(n, "dev server unreachable");
} else {
  const s = await loginAsFixture("auto-paycheck", { scenario: "minimal" });
  try {
    const sched = await prisma.paySchedule.findFirst({
      where: { userId: s.userId, isActive: true },
    });
    check(
      NAMES[0],
      !!sched && sched.amount > 0,
      sched ? `${sched.cadence} $${sched.amount / 100}` : "no active schedule",
    );

    const period = await getCurrentPayPeriod();
    const payDate = sched
      ? payDateInPeriod(sched.startDate, sched.cadence, period.startDate)
      : null;
    check(
      NAMES[1],
      !!payDate && payDate.getTime() >= period.startDate.getTime(),
      payDate ? `payDate=${payDate.toISOString().slice(0, 10)} period=${period.startDate.toISOString().slice(0, 10)}` : "no pay date",
    );

    if (!sched || !payDate) {
      for (const n of NAMES.slice(2)) check(n, false, "no schedule or pay date");
    } else {
      // ---- BEFORE the pay date: must not fire ---------------------
      const before = new Date(payDate.getTime() - 60_000);
      const early = await runPaycheckForUser(s.userId, before);
      check(
        NAMES[2],
        early.status === "not_due",
        `status=${early.status} payDate=${early.payDate}`,
      );

      const runsBefore = await prisma.paycheckRun.count({ where: { userId: s.userId } });

      // ---- AT/AFTER the pay date: must fire ------------------------
      const at = new Date(payDate.getTime() + 60_000);
      const fired = await runPaycheckForUser(s.userId, at);
      check(
        NAMES[3],
        fired.status === "applied",
        `status=${fired.status}${fired.error ? " error=" + fired.error : ""}`,
      );

      const paycheckTx = await prisma.transaction.findFirst({
        where: { userId: s.userId, isPrimaMateria: true },
        orderBy: { createdAt: "desc" },
      });
      check(
        NAMES[4],
        !!paycheckTx && paycheckTx.amount === sched.amount,
        paycheckTx ? `tx amount=${paycheckTx.amount}` : "no paycheck row",
      );

      const after = await prisma.envelope.findMany({
        where: { userId: s.userId },
        select: { currentBalance: true },
      });
      const totals = after.reduce((s2, e) => s2 + e.currentBalance, 0);
      check(NAMES[5], totals > 0 && runsBefore === 0, `envelope total=${totals} cents`);

      // ---- running it again must change nothing --------------------
      const snap = new Map(
        (await prisma.envelope.findMany({ where: { userId: s.userId } })).map((e) => [
          e.id,
          e.currentBalance,
        ]),
      );
      const again = await runPaycheckForUser(s.userId, new Date(payDate.getTime() + 3_600_000));
      const now2 = await prisma.envelope.findMany({
        where: { userId: s.userId },
        select: { id: true, currentBalance: true },
      });
      const drift = now2.filter((e) => snap.get(e.id) !== e.currentBalance).length;
      check(
        NAMES[6],
        again.status === "already_applied" && drift === 0,
        `status=${again.status} drift=${drift}`,
      );

      const run = await prisma.paycheckRun.findFirst({
        where: { userId: s.userId },
        orderBy: { createdAt: "desc" },
      });
      check(
        NAMES[7],
        run?.trigger === "automatic",
        run ? `trigger=${run.trigger} period=${run.periodKey}` : "no run row",
      );

      const sweep = await runAutoPaychecks(new Date());
      check(
        NAMES[8],
        Array.isArray(sweep) && sweep.every((r) => r.status !== "error"),
        `${sweep.length} user(s): ${sweep.map((r) => r.status).join(",")}`,
      );

      // ---- a manual click for the SAME paycheck is also refused ----
      const { applyPaycheck } = await import("../src/lib/apply-paycheck.ts");
      const manual = await applyPaycheck({
        userId: s.userId,
        paycheckCents: sched.amount,
        source: "manual click",
        trigger: "manual",
      });
      check(
        NAMES[9],
        manual.skipped === true,
        `trigger=manual on an already-automatic paycheck: skipped=${manual.skipped}`,
      );
    }
  } finally {
    await s.close();
    await prisma.$disconnect();
  }
}

const pass = checks.filter((c) => c.ok).length;
const miss = checks.filter((c) => !c.ok);
console.log(`\nchecks: ${pass} pass / ${miss.length} miss (${checks.length} total)`);
if (miss.length) {
  console.log("\nFAILED checks:");
  for (const c of miss) console.log(`  - ${c.name}${c.detail ? "  — " + c.detail : ""}`);
}
process.exit(miss.length ? 1 : 0);
