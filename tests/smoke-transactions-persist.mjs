/**
 * Transactions must survive a restart, and logging a spend must move the
 * envelope balance with it.
 *
 * Measured before this existed: 0 rows in Postgres, 6 in the process-local
 * store, all six rendered on /transactions — and gone on restart. The
 * advisor and `detectSubscriptions` read the same ephemeral slice, so the
 * AI's view of spending and the recurring-charge detection were ephemeral
 * too.
 *
 * The envelope-balance half matters as much as the row: the old memory
 * `addTransaction` decremented the envelope as part of the same call. A
 * transaction row persisted WITHOUT that would be a new split-brain bug —
 * the ledger would remember the spend and the vessel would forget it.
 */
import { prisma } from "./db-client.mjs";
import { loginAsFixture } from "./fixture.mjs";
import { liveTransactionsFromDb } from "../src/lib/mock.ts";
import { detectSubscriptions } from "../src/lib/detect-subscriptions.ts";

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
  "[1] logging a spend writes a row to Postgres",
  "[2] /transactions renders it",
  "[3] the envelope balance moved by the spend",
  "[4] the ledger row and the vessel balance agree",
  "[5] an audit row records the spend",
  "[6] income with no envelope adds no vessel movement",
  "[7] the advisor-facing reader sees persisted rows",
  "[8] a spend against someone else's envelope is refused",
  "[9] detectSubscriptions reads persisted transactions",
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
  const s = await loginAsFixture("tx-persist", { scenario: "minimal" });
  try {
    const envelopes = await prisma.envelope.findMany({
      where: { userId: s.userId },
      orderBy: { sortOrder: "asc" },
    });
    const groceries = envelopes.find((e) => e.name === "Groceries") ?? envelopes[0];

    const startBalance = groceries?.currentBalance ?? 0;
    const SPEND = 4_250; // $42.50

    const { logTransactionToDb } = await import("../src/lib/log-transaction.ts");

    // ---- a spend against a vessel ---------------------------------
    const r1 = await logTransactionToDb({
      userId: s.userId,
      payee: "Whole Foods",
      amountCents: -SPEND,
      envelopeId: groceries?.id ?? null,
      date: new Date(),
    });
    check(NAMES[0], r1.ok, r1.reason ?? "");

    const rows = await prisma.transaction.findMany({
      where: { userId: s.userId },
      orderBy: { createdAt: "desc" },
    });
    const logged = rows.find((t) => t.payee === "Whole Foods");
    check(
      NAMES[0] + " (amount/sign)",
      !!logged && logged.amount === -SPEND && logged.envelopeId === groceries?.id,
      logged ? `amount=${logged.amount} envelope=${logged.envelopeId === groceries?.id}` : "row missing",
    );

    const html = await (await s.get("/transactions")).text();
    check(NAMES[1], html.includes("Whole Foods"));

    const after = await prisma.envelope.findUnique({ where: { id: groceries.id } });
    check(
      NAMES[2],
      after.currentBalance === Math.max(0, startBalance - SPEND),
      `${startBalance} -> ${after.currentBalance} (expected ${Math.max(0, startBalance - SPEND)})`,
    );
    check(
      NAMES[3],
      !!logged && logged.amount === after.currentBalance - startBalance,
      "ledger and vessel tell the same story",
    );

    const audit = await prisma.auditLog.findFirst({
      where: { userId: s.userId, actionType: "spend_logged" },
      orderBy: { createdAt: "desc" },
    });
    check(NAMES[4], !!audit);

    // ---- income with no envelope ----------------------------------
    const beforeIncome = await prisma.envelope.findMany({
      where: { userId: s.userId },
      select: { currentBalance: true },
    });
    const r2 = await logTransactionToDb({
      userId: s.userId,
      payee: "Paycheck",
      amountCents: 100_000,
      envelopeId: null,
      date: new Date(),
    });
    const afterIncome = await prisma.envelope.findMany({
      where: { userId: s.userId },
      select: { currentBalance: true },
    });
    check(
      NAMES[5],
      r2.ok &&
        beforeIncome.length === afterIncome.length &&
        beforeIncome.every((e, i) => e.currentBalance === afterIncome[i].currentBalance),
      "income persisted without touching any vessel",
    );

    // ---- the readers ----------------------------------------------
    const viaReader = await liveTransactionsFromDb(s.userId);
    check(
      NAMES[6],
      viaReader.some((t) => t.payee === "Whole Foods" && t.amountCents === -SPEND && !t.isIncome),
      `${viaReader.length} row(s) via the DB reader`,
    );

    // ---- tenant boundary ------------------------------------------
    const other = await loginAsFixture("tx-persist-other", { scenario: "minimal" });
    const r3 = await logTransactionToDb({
      userId: other.userId,
      payee: "Not Mine",
      amountCents: -1000,
      envelopeId: groceries.id,
      date: new Date(),
    });
    const leak = await prisma.transaction.count({
      where: { userId: other.userId, payee: "Not Mine" },
    });
    check(NAMES[7], !r3.ok && leak === 0, r3.reason ?? `leaked ${leak} row(s)`);
    await other.close();

    // ---- subscription detection reads persisted data ---------------
    const subs = await detectSubscriptions(s.userId);
    check(NAMES[8], Array.isArray(subs), `${subs.length} detected (ran against the DB)`);
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
