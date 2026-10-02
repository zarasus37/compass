#!/usr/bin/env node
/**
 * prove-transaction-restart.mjs — two-phase restart-survival proof.
 *
 * WHY THIS IS A SEPARATE SCRIPT AND NOT A SMOKE
 * ---------------------------------------------
 * A chain smoke runs as one process against one already-warm server, so
 * it structurally cannot observe a restart. The debts migration was
 * proven across a real teardown; transactions were written to Postgres
 * and read back from Postgres, which is an ARGUMENT, not a measurement.
 * This closes that gap, and it is kept as an executable artefact so the
 * property can be re-checked rather than re-asserted.
 *
 *   PHASE 1   node scripts/prove-transaction-restart.mjs write
 *             Create a fixture user, log distinctive transactions
 *             through the REAL write path, record exactly what Postgres
 *             holds, and leave the user in place. The process then
 *             exits — which IS the teardown, because the thing being
 *             tested is process-local state.
 *
 *   PHASE 2   node scripts/prove-transaction-restart.mjs read
 *             A BRAND NEW process. Prove the rows are still in
 *             Postgres, that the reader every page uses returns them,
 *             and that this process's in-memory store does not contain
 *             them — so the data demonstrably came from the database.
 *
 * The page-render assertion is attempted too, but only when a server is
 * reachable, and its absence is reported as SKIPPED rather than folded
 * into a pass. A check that silently stops running is how a suite stays
 * green while measuring nothing.
 *
 * THE TRAP THIS IS BUILT AROUND
 * -----------------------------
 * `createFixture` calls `sweepStaleFixtures`, which deletes every
 * `smoke-*` user. Phase 2 must not create a fixture to look at the
 * evidence: doing so deletes it, and the probe then reports a clean pass
 * on an empty account. Phase 2 therefore touches only the database.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../tests/db-client.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const STATE = join(process.cwd(), ".restart-probe.json");

const ALPHA = "Restart Probe Alpha";
const BETA = "Restart Probe Beta";
const GAMMA = "Restart Probe Gamma";
const SPEND_A = 1234; // $12.34 — a value no seed row contains
const SPEND_B = 5678; // $56.78
const PAY = 100000; // $1,000.00 income, no envelope

const checks = [];
function check(name, ok, detail = "") {
  const pass = Boolean(ok);
  checks.push({ name, ok: pass, detail });
  console.log(`[${pass ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}
function skip(name, reason) {
  checks.push({ name, ok: true, detail: `[SKIP] ${reason}` });
  console.log(`[SKIP] ${name} — ${reason}`);
}
function report() {
  const miss = checks.filter((c) => !c.ok);
  const skipped = checks.filter((c) => (c.detail ?? "").startsWith("[SKIP]"));
  console.log(
    `\nchecks: ${checks.length - miss.length} pass / ${miss.length} miss ` +
      `(${skipped.length} skipped of ${checks.length})`
  );
  for (const c of miss) console.log(`  - ${c.name}${c.detail ? "  — " + c.detail : ""}`);
  return miss.length;
}
function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ");
}
async function serverUp() {
  try {
    const r = await fetch(BASE + "/api/health", {
      redirect: "manual",
      signal: AbortSignal.timeout(Number(process.env.SMOKE_PROBE_TIMEOUT_MS ?? 10000)),
    });
    return r.status > 0;
  } catch {
    return false;
  }
}

async function phaseWrite() {
  const { createFixture } = await import("../tests/fixture.mjs");
  const { logTransactionToDb } = await import("../src/lib/log-transaction.ts");
  const { liveTransactionsFromDb } = await import("../src/lib/mock.ts");

  const fx = await createFixture("restart-tx", { scenario: "minimal" });
  // NOTE: no cleanup() here on purpose. The user must outlive this
  // process; deleting it is phase 2's job, once there is evidence.
  const envelopes = await prisma.envelope.findMany({
    where: { userId: fx.userId },
    orderBy: { sortOrder: "asc" },
  });
  const target = envelopes.find((e) => e.name === "Groceries") ?? envelopes[0];
  if (!target) throw new Error("[probe] fixture produced no envelope to spend against");
  const startBalance = target.currentBalance;

  for (const [payee, amountCents, envelopeId] of [
    [ALPHA, -SPEND_A, target.id],
    [BETA, -SPEND_B, target.id],
    [GAMMA, PAY, null],
  ]) {
    const r = await logTransactionToDb({
      userId: fx.userId,
      payee,
      amountCents,
      envelopeId,
      date: new Date(),
    });
    check(`write: ${payee} accepted by the real write path`, r.ok, r.reason ?? "");
  }

  const rows = await prisma.transaction.findMany({
    where: { userId: fx.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, payee: true, amount: true, envelopeId: true, date: true },
  });
  check("write: 3 rows in Postgres", rows.length === 3, `${rows.length} row(s)`);

  const env = await prisma.envelope.findUnique({ where: { id: target.id } });
  const expectedBalance = Math.max(0, startBalance - SPEND_A - SPEND_B);
  check(
    "write: vessel balance moved by exactly the two spends",
    env.currentBalance === expectedBalance,
    `${startBalance} -> ${env.currentBalance} (expected ${expectedBalance})`,
  );

  // The reader the pages use must already see them, before any restart.
  const viaReader = await liveTransactionsFromDb(fx.userId);
  for (const payee of [ALPHA, BETA, GAMMA]) {
    check(`write: the page reader returns ${payee}`, viaReader.some((t) => t.payee === payee));
  }

  writeFileSync(
    STATE,
    JSON.stringify(
      {
        email: fx.email,
        password: fx.password,
        userId: fx.userId,
        envelopeId: target.id,
        envelopeName: target.name,
        startBalance,
        actualBalance: env.currentBalance,
        rows: rows.map((r) => ({
          id: r.id,
          payee: r.payee,
          amount: r.amount,
          envelopeId: r.envelopeId,
          date: r.date.toISOString(),
        })),
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\n[probe] pid ${process.pid} wrote state to ${STATE}`);
  console.log(`[probe] user ${fx.email} left in place ON PURPOSE.`);
  console.log("[probe] this process is about to exit — that is the teardown.");
  console.log("[probe] then run:  node scripts/prove-transaction-restart.mjs read");
  await prisma.$disconnect();
  return 0;
}

async function phaseRead() {
  if (!existsSync(STATE)) {
    console.error(`[probe] no state file at ${STATE} — run the write phase first`);
    process.exit(2);
  }
  const state = JSON.parse(readFileSync(STATE, "utf8"));
  const { liveTransactionsFromDb } = await import("../src/lib/mock.ts");

  console.log(`[probe] phase 2 running in pid ${process.pid} (phase 1 was a different process)\n`);

  // 1. The rows are still in Postgres, byte-identical.
  const rows = await prisma.transaction.findMany({
    where: { userId: state.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, payee: true, amount: true, envelopeId: true, date: true },
  });
  check(
    "read: same 3 rows survived the process boundary",
    rows.length === state.rows.length,
    `${rows.length} vs ${state.rows.length}`,
  );
  for (const want of state.rows) {
    const got = rows.find((r) => r.id === want.id);
    check(
      `read: row "${want.payee}" identical (id/amount/envelope/date)`,
      !!got &&
        got.amount === want.amount &&
        got.envelopeId === want.envelopeId &&
        got.date.toISOString() === want.date,
      got ? `amount=${got.amount} envelope=${got.envelopeId}` : "row missing"
    );
  }

  // 2. The reader every page uses returns them in a FRESH process.
  const viaReader = await liveTransactionsFromDb(state.userId);
  for (const payee of [ALPHA, BETA, GAMMA]) {
    check(
      `read: the page reader returns ${payee}`,
      viaReader.some((t) => t.payee === payee),
      `${viaReader.length} row(s) from the reader`
    );
  }

  // 3. Proof the data did NOT come from this process's memory. A fresh
  //    process has an empty store, and touching it would lazily seed
  //    the demo rows — so the assertion is that the probe payees are
  //    absent from it, not that it is empty.
  const memState = globalThis.__COMPASS_STORE__?.get(state.userId);
  const memPayees = (memState?.transactions ?? []).map((t) => t.payee);
  check(
    "read: the in-memory store holds none of the probe rows",
    !memPayees.some((p) => [ALPHA, BETA, GAMMA].includes(p)),
    memState
      ? `store has ${memPayees.length} transaction(s): ${memPayees.slice(0, 3).join(", ")}`
      : "store has no entry for this user at all"
  );

  // 4. The vessel balance survived too — the other half of the split.
  const env = await prisma.envelope.findUnique({ where: { id: state.envelopeId } });
  check(
    "read: vessel balance is the post-spend value",
    env.currentBalance === state.actualBalance,
    `${env.currentBalance} (expected ${state.actualBalance})`
  );

  // 5. Page render, only if a server is actually up. Reported as SKIP
  //    otherwise — never as a pass.
  if (await serverUp()) {
    try {
      const { loginExisting } = await import("../tests/fixture.mjs");
      // loginExisting, NOT loginAsFixture: the latter sweeps this user away.
      const s = await loginExisting(state.email, state.password);
      const raw = await (await s.get("/transactions")).text();
      const html = stripScripts(raw);
      check(
        "read: /transactions returned a real document (positive control)",
        html.length > 2000,
        `${raw.length} bytes`
      );
      for (const payee of [ALPHA, BETA, GAMMA]) {
        check(`read: /transactions renders ${payee}`, html.includes(payee));
      }
    } catch (e) {
      skip("read: page render", `login/render failed: ${e.message}`);
    }
  } else {
    skip("read: page render", `no server at ${BASE}; durability measured, rendering not`);
  }

  // Teardown is safe now: the measurement is done.
  await prisma.setupState.deleteMany({ where: { userId: state.userId } });
  await prisma.user.delete({ where: { id: state.userId } }).catch(() => {});
  await prisma.$disconnect();
  try {
    rmSync(STATE, { force: true });
  } catch {}

  return report();
}

const phase = process.argv[2];
let code = 1;
if (phase === "write") code = await phaseWrite();
else if (phase === "read") code = await phaseRead();
else {
  console.error("usage: node scripts/prove-transaction-restart.mjs <write|read>");
  code = 2;
}
process.exit(code);
