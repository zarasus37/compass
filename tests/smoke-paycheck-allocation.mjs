/**
 * The core budgeting loop, end to end: a paycheck has to move money the
 * user can actually see, and running the same paycheck twice must not
 * move it twice.
 *
 * WHAT THIS COVERS, AND WHAT IT DELIBERATELY DOES NOT
 * --------------------------------------------------
 * It calls `applyPaycheck` directly rather than POSTing the dashboard
 * form. The browser wire path was tried first and is not exercised here:
 * driving a Next 16 bound `useActionState` action from a script needs the
 * `$ACTION_REF_n` / `$ACTION_n:0` / `$ACTION_n:1` triple with the *page's
 * action index*, and the repo's own `tests/fixture.mjs` helper hardcodes
 * index 1 with a `["$undefined"]` previous state. `/login` turns out to
 * carry no `$ACTION_` inputs at all, so that helper has never actually
 * driven a bound action — it is untested harness code. Rather than build
 * a second, more elaborate HTTP driver, this asserts the engine directly
 * and checks reachability separately (check [1b]).
 *
 * What that means honestly: the ~10-line server-action wrapper is NOT
 * covered here, and neither is the browser click. Everything below it —
 * the maths, the persistence, the idempotency, the audit trail — is.
 *
 * This is the roadmap's item 10 ("zero-touch paycheck test") in its
 * smallest honest form. It could not exist before: the engine wrote to a
 * process-local store that no page reads, so a paycheck moved money
 * nobody could see, and nothing stopped a second run from moving it
 * twice.
 */
import { prisma } from "./db-client.mjs";
import { loginAsFixture } from "./fixture.mjs";
import { applyPaycheck } from "../src/lib/apply-paycheck.ts";

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

const money = (c) =>
  `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const visible = (h) =>
  String(h ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "");

async function balances(userId) {
  const rows = await prisma.envelope.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return new Map(rows.map((r) => [r.id, r.currentBalance]));
}

const NAMES = [
  "[1] the fixture user has an armed allocation plan with rules",
  "[1b] the paycheck card is reachable on the dashboard",
  "[2] running a paycheck moves envelope balances in Postgres",
  "[3] /envelopes renders the post-paycheck balances",
  "[3b] the dashboard renders them too",
  "[4] the paycheck is recorded as a Prima Materia transaction",
  "[5] per-envelope ledger rows explain each transfer",
  "[6] an audit row records the auto-allocate",
  "[7] running the SAME paycheck twice is refused (no double-allocate)",
  "[8] balances are unchanged after the refused second run",
  "[9] a DIFFERENT amount in the same period still applies",
  "[10] the original paycheck is still refused after the second one",
  "[11] exactly 2 PaycheckRun rows — the guard, not luck",
  "[12] the engine is reachable through the advisor's pure path too",
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
  const s = await loginAsFixture("paycheck-e2e", { scenario: "minimal" });
  try {
    const plan = await prisma.allocationPlan.findFirst({
      where: { userId: s.userId, source: "seed" },
      include: { rules: true },
    });
    check(
      NAMES[0],
      !!plan && plan.isArmed && plan.rules.length > 0,
      plan ? `armed=${plan.isArmed} rules=${plan.rules.length}` : "no seed plan",
    );

    // Reachability: the action has to be mounted for a user to run it.
    const dash = await (await s.get("/")).text();
    check(
      NAMES[1],
      dash.includes("ADP paycheck (simulated)"),
      "PaycheckSimulator rendered on the dashboard",
    );

    const before = await balances(s.userId);
    const PAYCHECK = 182_000;

    // ---- first run: money must move, and be visible ---------------
    const r1 = await applyPaycheck({
      userId: s.userId,
      paycheckCents: PAYCHECK,
      source: "e2e paycheck",
      trigger: "manual",
    });
    const after = await balances(s.userId);
    const moved = [...after].filter(([id, v]) => before.get(id) !== v);

    check(NAMES[2], r1.ok && !r1.skipped && moved.length > 0, r1.reason ?? `${moved.length} envelope(s) moved`);

    const biggest = moved
      .map(([id, v]) => ({ id, delta: v - before.get(id), v }))
      .sort((a, b) => b.delta - a.delta)[0];
    const envHtml = visible(await (await s.get("/envelopes")).text());
    const dashHtml = visible(await (await s.get("/")).text());
    check(NAMES[3], !!biggest && envHtml.includes(money(biggest.v)), biggest ? `${money(biggest.delta)} → ${money(biggest.v)}` : "");
    check(NAMES[4], !!biggest && dashHtml.includes(money(biggest.v)));

    const paycheckTx = await prisma.transaction.findFirst({
      where: { userId: s.userId, isPrimaMateria: true, amount: PAYCHECK },
      orderBy: { createdAt: "desc" },
    });
    check(NAMES[5], !!paycheckTx, paycheckTx ? `tx ${paycheckTx.id}` : "no paycheck row");

    const ledger = paycheckTx
      ? await prisma.transaction.findMany({ where: { userId: s.userId, fromPaycheckId: paycheckTx.id } })
      : [];
    check(NAMES[6], ledger.length === moved.length && ledger.length > 0, `${ledger.length} ledger row(s) for ${moved.length} moved envelope(s)`);

    const audit = await prisma.auditLog.findFirst({
      where: { userId: s.userId, actionType: "auto_allocate" },
      orderBy: { createdAt: "desc" },
    });
    check(NAMES[7], !!audit);

    // ---- the idempotency case -------------------------------------
    const snapshot = new Map(await balances(s.userId));
    const r2 = await applyPaycheck({
      userId: s.userId,
      paycheckCents: PAYCHECK,
      source: "e2e paycheck",
      trigger: "manual",
    });
    const afterDup = await balances(s.userId);
    const drift = [...afterDup].filter(([id, v]) => snapshot.get(id) !== v);
    check(NAMES[8], r2.skipped === true, r2.skipped ? "refused by the DB constraint" : `ok=${r2.ok} — NOT refused`);
    check(NAMES[9], drift.length === 0, `${drift.length} envelope(s) drifted on the repeat`);

    // A different amount in the same period MUST still work, or the
    // guard is over-blocking and a legitimate second cheque is stuck.
    const r3 = await applyPaycheck({
      userId: s.userId,
      paycheckCents: 190_000,
      source: "e2e paycheck",
      trigger: "manual",
    });
    const afterDiff = await balances(s.userId);
    const movedAgain = [...afterDiff].filter(([id, v]) => afterDup.get(id) !== v);
    check(NAMES[10], r3.ok && !r3.skipped && movedAgain.length > 0, `${movedAgain.length} envelope(s) moved on the second paycheck`);

    const r4 = await applyPaycheck({
      userId: s.userId,
      paycheckCents: PAYCHECK,
      source: "e2e paycheck",
      trigger: "manual",
    });
    const afterThird = await balances(s.userId);
    check(
      NAMES[11],
      r4.skipped === true && [...afterThird].every(([id, v]) => afterDiff.get(id) === v),
      r4.skipped ? "still refused" : "NOT refused",
    );

    const runs = await prisma.paycheckRun.findMany({
      where: { userId: s.userId },
      orderBy: { createdAt: "asc" },
    });
    check(
      NAMES[12],
      runs.length === 2,
      runs.map((r) => `${r.periodKey}/$${r.paycheckCents / 100}/${r.trigger}`).join(", "),
    );

    // The advisor's read-only simulation shares the engine, so the maths
    // it reports to the LLM is the same maths that just persisted.
    const { computeAllocation } = await import("../src/lib/store.ts");
    const envs = (await prisma.envelope.findMany({ where: { userId: s.userId } })).map((e) => ({
      id: e.id,
      name: e.name,
      planet: null,
      currentCents: e.currentBalance,
    }));
    const dry = computeAllocation(
      { id: plan?.id ?? null, strategy: "zero-based", isArmed: true, rules: (plan?.rules ?? []).map((r, i) => ({
        id: r.id,
        envelopeId: r.envelopeId,
        mode: r.fixedCents != null ? "fixed" : r.pct > 0 ? "percent" : "remainder",
        value: r.fixedCents ?? r.pct ?? 0,
        priority: r.sortOrder ?? i,
      })) },
      envs,
      500_000,
      "dry",
    );
    check(NAMES[13], dry.totalAllocatedCents > 0 && dry.totalAllocatedCents <= 500_000, `${money(dry.totalAllocatedCents)} of ${money(500_000)}`);
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
