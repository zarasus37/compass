/**
 * FIN-01 — canonical financial state smoke (revision 2).
 *
 * Polar's FIN-01 review returned changes_requested. This revision
 * addresses the blockers by actually proving them:
 *
 *   B1  A database failure must stay distinguishable at EVERY changed
 *       caller. The previous revision logged and returned `[]`, which
 *       made an outage look like an empty account — and the advisor's
 *       handler contract says empty means "you have no envelopes".
 *   B2  Raw database errors must never leave the server. The DAL now
 *       returns a stable code; detail is logged only.
 *   B3  The tests must demonstrate the acceptance items they are cited
 *       for: induced failure, isolation for EVERY aggregate entity,
 *       a populated-goal adapter shape, and real transaction/isolation
 *       evidence rather than a source regex.
 *
 * HOW FAILURE IS INDUCED — READ THIS BEFORE TRUSTING SECTION 1
 * ------------------------------------------------------------
 * The generic read() checks below cover error mapping only. The separate
 * testBoundaries helper replaces actual Prisma query methods and exercises
 * every reader, adapters, opportunities, search and advisor during a query
 * failure. The action probe bundles the real action/DAL with a stub session
 * and Prisma boundary. Neither is a real network outage. The helper also
 * observes real selective/transaction queries and tests a coherent snapshot
 * while another Postgres connection commits an owned fixture change.
 *
 * FIXTURE DISCIPLINE
 * ------------------
 * Deliberately does NOT use `tests/fixture.mjs`: that helper calls
 * `sweepStaleFixtures()`, deleting EVERY `smoke-*` user including
 * other suites' and any local run in progress, and its seeds use fixed
 * primary keys so only one fixture can hold the seeded baseline.
 * Every row here is a UUID this run owns, and cleanup deletes BY THOSE
 * IDS ONLY, inside a `finally`. No broad `deleteMany` anywhere.
 *
 * Run: npx tsx --conditions=react-server tests/smoke-financial-state.mjs
 */

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./db-client.mjs";
import { testBoundaries } from "./financial-state-boundary.mjs";
import {
  getEnvelopes,
  getGoals,
  getDebts,
  getTransactions,
  getAccounts,
  getBills,
  getAllocationPlan,
  getStoredPayPeriod,
  getFinancialState,
  read,
  isPlanetId,
  STATE_ERROR,
} from "../src/lib/state/financial-state.ts";

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

const owned = {
  users: [], envelopes: [], goals: [], transactions: [],
  accounts: [], bills: [], debts: [], plans: [], rules: [], periods: [],
};
const uuid = () => randomUUID();

async function cleanup() {
  const byUser = owned.users.length ? { userId: { in: owned.users } } : undefined;
  if (!byUser) return;
  // Children first. Every predicate is bounded to ids this run made.
  await prisma.transaction.deleteMany({ where: { id: { in: owned.transactions } } }).catch(() => {});
  await prisma.allocationRule.deleteMany({ where: { id: { in: owned.rules } } }).catch(() => {});
  await prisma.allocationPlan.deleteMany({ where: { id: { in: owned.plans } } }).catch(() => {});
  await prisma.bill.deleteMany({ where: { id: { in: owned.bills } } }).catch(() => {});
  await prisma.debt.deleteMany({ where: { id: { in: owned.debts } } }).catch(() => {});
  await prisma.goal.deleteMany({ where: { id: { in: owned.goals } } }).catch(() => {});
  await prisma.envelope.deleteMany({ where: { id: { in: owned.envelopes } } }).catch(() => {});
  await prisma.payPeriod.deleteMany({ where: { id: { in: owned.periods } } }).catch(() => {});
  await prisma.account.deleteMany({ where: { id: { in: owned.accounts } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: owned.users } } }).catch(() => {});
}

// ── Fixture builders: one per entity, for BOTH tenants ────────────
async function seedTenant(label) {
  const userId = uuid();
  const email = `fin01-${label}-${userId}@compass.local`;
  await prisma.user.create({ data: { id: userId, email, name: `FIN01 ${label}`, passwordHash: "x" } });
  owned.users.push(userId);

  const accId = uuid();
  await prisma.account.create({
    data: { id: accId, userId, name: `${label}-checking`, type: "checking", currentBalance: 111000, source: "user", sortOrder: 1 },
  });
  owned.accounts.push(accId);

  const envId = uuid();
  await prisma.envelope.create({
    data: { id: envId, userId, name: `${label}-Rent`, planet: "mars", currentBalance: 80000, targetBalance: 80000, source: "user", sortOrder: 1 },
  });
  owned.envelopes.push(envId);

  // A goal with NULL planet, to exercise the widened nullable contract.
  const goalId = uuid();
  await prisma.goal.create({
    data: {
      id: goalId, userId, name: `${label}-Goal`, description: "",
      targetAmount: 500000, currentAmount: 12345,
      targetDate: new Date("2027-01-01"), isPrimary: true,
      source: "user", kind: "TRANSFER", sortOrder: 1, planet: null,
    },
  });
  owned.goals.push(goalId);

  const debtId = uuid();
  await prisma.debt.create({
    data: { id: debtId, userId, name: `${label}-Debt`, balanceCents: 50000, originalBalanceCents: 90000, aprBps: 1900, minPaymentCents: 100, dueDay: 3, source: "user", sortOrder: 1 },
  });
  owned.debts.push(debtId);

  const billId = uuid();
  await prisma.bill.create({
    data: { id: billId, userId, name: `${label}-Bill`, amountCents: 9600, cadence: "monthly", dueDay: 5, autopay: true, source: "user", sortOrder: 1 },
  });
  owned.bills.push(billId);

  const planId = uuid();
  await prisma.allocationPlan.create({
    data: { id: planId, userId, strategyId: "envelope", isArmed: true, name: `${label}-plan`, source: "user" },
  });
  owned.plans.push(planId);

  const ruleId = uuid();
  await prisma.allocationRule.create({
    data: { id: ruleId, planId, envelopeId: envId, pct: 25, fixedCents: null, source: "user", sortOrder: 1 },
  });
  owned.rules.push(ruleId);

  const periodId = uuid();
  await prisma.payPeriod.create({
    data: { id: periodId, userId, startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2026-10-15T00:00:00Z"), isActive: true },
  });
  owned.periods.push(periodId);

  // Two transactions: one income with provenance, one expense.
  const txA = uuid();
  await prisma.transaction.create({
    data: { id: txA, userId, accountId: accId, envelopeId: null, amount: 182000, date: new Date("2026-06-01T00:00:00Z"), payee: `${label}-paycheck`, source: "recurring", isPrimaMateria: true, metadata: "{}" },
  });
  owned.transactions.push(txA);

  const txB = uuid();
  await prisma.transaction.create({
    data: { id: txB, userId, accountId: accId, envelopeId: envId, amount: -4200, date: new Date("2026-06-02T00:00:00Z"), payee: `${label}-spend`, source: "manual", isPrimaMateria: false, metadata: "{}" },
  });
  owned.transactions.push(txB);

  return { userId, accId, envId, goalId, debtId, billId, planId, ruleId, periodId, txA, txB };
}

function readInFreshProcess(userId) {
  const script = `
    import { getFinancialState } from "./src/lib/state/financial-state.ts";
    const r = await getFinancialState(process.argv[1]);
    console.log("RESULT:" + JSON.stringify(r.ok ? {
      ok: true, env: r.data.envelopes.length, goals: r.data.goals.length,
      accounts: r.data.accounts.length, bills: r.data.bills.length,
      debts: r.data.debts.length, rules: r.data.rules.length,
      hasPlan: r.data.plan !== null, hasPeriod: r.data.period !== null,
    } : { ok: false, error: r.error }));
    process.exit(0);
  `;
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", "--conditions=react-server", "-e", script, userId],
    { cwd: process.cwd(), encoding: "utf8", env: process.env },
  );
  const line = (r.stdout || "").split("\n").find((l) => l.startsWith("RESULT:"));
  return line ? JSON.parse(line.slice(7)) : null;
}

/** A Prisma-shaped error carrying exactly what B2 says must not leak. */
function leakingDbError() {
  const e = new Error(
    "Invalid \`prisma.payPeriod.findMany()\` invocation: P1001 Can't reach database server " +
    "at `postgresql://compass:supersecretpw@db.internal.acme-corp.example:5432/compass_dev`",
  );
  e.code = "P1001";
  return e;
}

async function main() {
  // ══ 1. B2 — sanitized error mapping (real function, induced error) ══
  console.log("\n--- B2: stable codes, no leak ---");
  const leakText = "supersecretpw@db.internal.acme-corp.example";
  const induced = await read("probe", "tenant-x", async () => {
    throw leakingDbError();
  });
  check("induced failure returns ok:false", induced.ok === false);
  check(
    "error is the stable code read-failed",
    induced.ok === false && induced.error === STATE_ERROR.READ_FAILED,
    induced.ok ? "returned ok" : String(induced.error),
  );
  const inducedStr = JSON.stringify(induced);
  check("error contains no database host", !inducedStr.includes("db.internal.acme-corp.example"));
  check("error contains no password", !inducedStr.includes("supersecretpw"));
  check("error contains no Prisma invocation text", !/prisma\.\w+\./.test(inducedStr));
  check("error contains no P-codes", !/P1\d{3}/.test(inducedStr));

  const invalidTenant = await read("probe", "  ", async () => ({ unreachable: true }));
  check(
    "invalid tenant returns invalid-tenant-id and never calls the fn",
    invalidTenant.ok === false && invalidTenant.error === STATE_ERROR.INVALID_TENANT,
    invalidTenant.ok ? "returned ok" : String(invalidTenant.error),
  );

  // N4: surrounding whitespace must be trimmed, and the QUERY must use
  // the trimmed value, not just the validation.
  const trimmedProbe = await read("probe", "  tenant-y  ", async (t) => t);
  check("N4: tenant id is trimmed before querying", trimmedProbe.ok && trimmedProbe.data === "tenant-y", trimmedProbe.ok ? `"${trimmedProbe.data}"` : "err");

  // ══ 2. B1 — failure propagates through EVERY changed caller ══════
  console.log("\n--- B1: failure is never silent-empty ---");

  // The DAL path itself, via a blank tenant (a real, non-Prisma failure).
  const e1 = await getEnvelopes("");
  check("B1 DAL: blank tenant -> ok:false, not []", e1.ok === false);

  // The mock.ts adapters used to THROW. They must still throw.
  const mock = await import("../src/lib/mock.ts");
  let threwEnvelopes = false;
  try { await mock.liveEnvelopesFromDb(""); } catch { threwEnvelopes = true; }
  check("B1 adapter liveEnvelopesFromDb still THROWS (as before FIN-01)", threwEnvelopes);
  let threwGoals = false;
  try { await mock.liveGoalsFromDb(""); } catch { threwGoals = true; }
  check("B1 adapter liveGoalsFromDb still THROWS (as before FIN-01)", threwGoals);

  // Sanitized: the thrown message carries the code, not raw DB text.
  let thrownMsg = "";
  try { await mock.liveEnvelopesFromDb(""); } catch (err) { thrownMsg = String(err && err.message); }
  check(
    "B1 adapter throw message is sanitized",
    /liveEnvelopesFromDb:\s*(read-failed|invalid-tenant-id)/.test(thrownMsg) &&
      !thrownMsg.includes("acme-corp") &&
      !/prisma\.\w+\./.test(thrownMsg),
    thrownMsg,
  );

  // opportunities must throw rather than report "no opportunities".
  const opp = await import("../src/lib/opportunities.ts");
  let threwOpp = false;
  try { await opp.topOpportunities(""); } catch { threwOpp = true; }
  check("B1 topOpportunities throws instead of implying empty", threwOpp);

  // search-index Promise.all branch must reject.
  const si = await import("../src/lib/command-palette/search-index.ts");
  let threwPalette = false;
  try { await si.getSearchIndex(""); } catch { threwPalette = true; }
  check("B1 command-palette rejects rather than returning empty", threwPalette);

  // advisor must report ok:false, never ok:true count:0.
  const advisor = await import("../src/lib/advisor/handlers.ts");
  const debtsResult = await advisor.runAdvisorTool("", { name: "queryDebts", args: {} });
  const envResult = await advisor.runAdvisorTool("", { name: "queryEnvelopes", args: {} });
  check(
    "B1 advisor queryDebts reports ok:false",
    debtsResult.publicView.ok === false,
    JSON.stringify(deadlinesSafe(debtsResult)),
  );
  check(
    "B1 advisor queryEnvelopes reports ok:false",
    envResult.publicView.ok === false,
    JSON.stringify(deadlinesSafe(envResult)),
  );
  check("invalid tenant: advisor debt retry message is exact", debtsResult.publicView.tool === "queryDebts" && debtsResult.publicView.error === "Debts are temporarily unavailable. Retry shortly rather than treating this as no debt.");
  check("invalid tenant: advisor envelope retry message is exact", envResult.publicView.tool === "queryEnvelopes" && envResult.publicView.error === "Envelopes are temporarily unavailable. Retry shortly rather than treating this as an empty account.");
  const advisorBlob = JSON.stringify([debtsResult, envResult]);
  check(
    "B2 advisor output leaks no host/password/Prisma text",
    !advisorBlob.includes("acme-corp") && !advisorBlob.includes("supersecretpw") && !/prisma\.\w+\./.test(advisorBlob),
    advisorBlob.slice(0, 200),
  );

  // ══ 3. B3 — isolation for EVERY aggregate entity ═════════════════
  console.log("\n--- B3: two-tenant isolation across all entities ---");
  const A = await seedTenant("alpha");
  const B = await seedTenant("bravo");
  await testBoundaries(check, {
    getEnvelopes, getGoals, getTransactions, getAccounts, getBills,
    getDebts, getAllocationPlan, getStoredPayPeriod, getFinancialState,
  }, A.userId);

  const aggA = await getFinancialState(A.userId);
  const aggB = await getFinancialState(B.userId);
  check("aggregate A ok", aggA.ok === true);
  check("aggregate B ok", aggB.ok === true);

  if (aggA.ok && aggB.ok) {
    const a = aggA.data, b = aggB.data;
    check("A: 1 envelope", a.envelopes.length === 1 && a.envelopes[0].id === A.envId);
    check("A: 1 goal", a.goals.length === 1 && a.goals[0].id === A.goalId);
    check("A: 1 account", a.accounts.length === 1 && a.accounts[0].id === A.accId);
    check("A: 1 bill", a.bills.length === 1 && a.bills[0].id === A.billId);
    check("A: 1 debt", a.debts.length === 1 && a.debts[0].id === A.debtId);
    check("A: 1 plan (its own)", a.plan?.id === A.planId);
    check("A: 1 rule (its own plan's)", a.rules.length === 1 && a.rules[0].id === A.ruleId);
    check("A: 1 period (its own)", a.period?.id === A.periodId);
    check("A: 2 transactions", a.transactions.length === 2);

    check("B: 1 envelope", b.envelopes.length === 1 && b.envelopes[0].id === B.envId);
    check("B: 1 goal", b.goals.length === 1 && b.goals[0].id === B.goalId);
    check("B: 1 account", b.accounts.length === 1 && b.accounts[0].id === B.accId);
    check("B: 1 bill", b.bills.length === 1 && b.bills[0].id === B.billId);
    check("B: 1 debt", b.debts.length === 1 && b.debts[0].id === B.debtId);
    check("B: 1 plan (its own)", b.plan?.id === B.planId);
    check("B: 1 rule (its own plan's)", b.rules.length === 1 && b.rules[0].id === B.ruleId);
    check("B: 1 period (its own)", b.period?.id === B.periodId);

    // Cross-tenant: NOTHING from A may appear in B's aggregate.
    const bBlob = JSON.stringify(b);
    for (const [label, id] of [
      ["envelope", A.envId], ["goal", A.goalId], ["account", A.accId],
      ["bill", A.billId], ["debt", A.debtId], ["plan", A.planId],
      ["rule", A.ruleId], ["period", A.periodId],
      ["transaction", A.txA], ["transaction", A.txB],
    ]) {
      check(`B aggregate contains no A ${label} (${id.slice(0, 8)})`, !bBlob.includes(id));
    }
    check(
      "rules are reached only through the caller's own plan",
      b.rules.every((r) => r.planId === B.planId),
    );

    // ══ 4. B3 — populated-goal adapter shape (was vacuous) ══════
    console.log("\n--- B3: adapter shape with a REAL goal ---");
    const adaptedGoals = await mock.liveGoalsFromDb(A.userId);
    check("liveGoalsFromDb returns the seeded goal (not empty)", Array.isArray(adaptedGoals) && adaptedGoals.length === 1, `len=${Array.isArray(adaptedGoals) ? adaptedGoals.length : "n/a"}`);
    if (Array.isArray(adaptedGoals) && adaptedGoals.length === 1) {
      const g = adaptedGoals[0];
      check("adapter goal has the legacy shape keys", ["id", "name", "description", "planet", "targetCents", "currentCents", "targetDate", "envelopeId", "perPaycheckCents", "isPrimary", "kind", "goalType"].every((k) => k in g), JSON.stringify(Object.keys(g)));
      check("adapter preserves perPaycheckCents: 0", g.perPaycheckCents === 0, String(g.perPaycheckCents));
      check("adapter preserves targetCents from targetAmount", g.targetCents === 500000, String(g.targetCents));
      check("adapter preserves currentCents from currentAmount", g.currentCents === 12345, String(g.currentCents));
      check("adapter keeps a NULL planet as null (N2, no invented planet)", g.planet === null, String(g.planet));
      check("adapter keeps targetDate as a Date", g.targetDate instanceof Date);
    }

    // ══ 5. Provenance + confirmation ══════════════════════════════
    const tx = await getTransactions(A.userId);
    check("transaction read ok", tx.ok === true);
    if (tx.ok) {
      const byId = new Map(tx.data.map((t) => [t.id, t]));
      check("provenance round-trips (recurring)", byId.get(A.txA)?.provenance === "recurring", byId.get(A.txA)?.provenance);
      check("provenance round-trips (manual)", byId.get(A.txB)?.provenance === "manual", byId.get(A.txB)?.provenance);
      check("confirmation is unknown on income", byId.get(A.txA)?.confirmation === "unknown");
      check("cleared passed through as stored", tx.data.every((t) => t.cleared === true));
      check("integer cents preserved", byId.get(A.txA)?.amountCents === 182000 && byId.get(A.txB)?.amountCents === -4200);
    }

    // ══ 6. Selective readers return ONLY their entity ═════════════
    console.log("\n--- B3: selective readers do not over-fetch ---");
    const onlyEnv = await getEnvelopes(A.userId);
    check("getEnvelopes returns envelope keys only", onlyEnv.ok && Object.keys(onlyEnv.data[0]).sort().join(",") === "currentCents,id,name,planet,sortOrder,source,targetCents", onlyEnv.ok ? Object.keys(onlyEnv.data[0]).sort().join(",") : "err");
    const onlyBills = await getBills(A.userId);
    check("getBills preserves dueDay ?? 0", onlyBills.ok && onlyBills.data[0].dueDay === 5, onlyBills.ok ? String(onlyBills.data[0].dueDay) : "err");
    check("getBills preserves paidAt as ISO string or null", onlyBills.ok && onlyBills.data[0].paidAt === null);
    const planRes = await getAllocationPlan(A.userId);
    check("getAllocationPlan returns this tenant's plan+rule", planRes.ok && planRes.data.plan?.id === A.planId && planRes.data.rules.length === 1);
    const perRes = await getStoredPayPeriod(A.userId);
    check("getStoredPayPeriod returns this tenant's period", perRes.ok && perRes.data?.id === A.periodId);

    // ══ 7. Legacy NULL-owner period excluded ═════════════════════
    const legacyId = uuid();
    await prisma.payPeriod.create({
      data: { id: legacyId, userId: null, startDate: new Date("1999-01-01T00:00:00Z"), endDate: new Date("1999-01-15T00:00:00Z"), isActive: true },
    });
    owned.periods.push(legacyId);
    const perAfter = await getStoredPayPeriod(A.userId);
    check("legacy NULL-owner period is excluded", perAfter.ok && perAfter.data?.id === A.periodId, perAfter.ok ? perAfter.data?.id : "err");

    // ══ 8. Fresh-process persistence ═════════════════════════════
    console.log("\n--- fresh process ---");
    const fresh = readInFreshProcess(A.userId);
    check("separate process reads the state", fresh?.ok === true, JSON.stringify(fresh));
    check("separate process sees all seeded entities", fresh?.ok && fresh.env === 1 && fresh.goals === 1 && fresh.accounts === 1 && fresh.bills === 1 && fresh.debts === 1 && fresh.rules === 1 && fresh.hasPlan && fresh.hasPeriod, JSON.stringify(fresh));

    // ══ 9. Empty is not failure ══════════════════════════════════
    const emptyUser = uuid();
    await prisma.user.create({ data: { id: emptyUser, email: `fin01-empty-${emptyUser}@compass.local`, name: "FIN01 empty", passwordHash: "x" } });
    owned.users.push(emptyUser);
    const es = await getFinancialState(emptyUser);
    check("empty tenant: ok:true with zero rows (no demo seeding)", es.ok && es.data.envelopes.length === 0 && es.data.goals.length === 0 && es.data.plan === null, es.ok ? "ok" : es.error);
    for (const tool of ["queryEnvelopes", "queryDebts"]) {
      const healthy = await advisor.runAdvisorTool(emptyUser, { name: tool, args: {} });
      check(`healthy empty tenant: advisor ${tool} reaches its success handler`, healthy.publicView.ok === true && healthy.publicView.tool === tool);
      check(`healthy empty tenant: advisor ${tool} has zero count`, healthy.publicView.ok === true && healthy.publicView.data.count === 0);
    }
    const emptyGoal = await getGoals(emptyUser);
    check("empty tenant: getGoals ok and empty (NOT a failure)", emptyGoal.ok && emptyGoal.data.length === 0);
  }

  // ══ 10. N2 — the widened action contract ═══════════════════════
  console.log("\n--- N2: null planet, no invented planet ---");
  check("isPlanetId(null) is false", isPlanetId(null) === false);
  check("isPlanetId('mars') is true", isPlanetId("mars") === true);
  const actionsSrc = readFileSync(
    join(process.cwd(), "src/app/(app)/envelopes/actions.ts"), "utf8",
  );
  check("listEnvelopesForAction no longer substitutes jupiter", !/planet:\s*\(isPlanetId\(e\.planet\)\s*\?\s*e\.planet\s*:\s*"jupiter"\)/.test(actionsSrc), "jupiter fallback still present");
  check("listEnvelopesForAction returns PlanetId | null", /planet:\s*PlanetId\s*\|\s*null/.test(actionsSrc));

  // ══ 11. Source-level guards (clearly labelled as SOURCE, not DB) ══
  const src = readFileSync(join(process.cwd(), "src/lib/state/financial-state.ts"), "utf8");
  check(
    "[source] aggregate declares RepeatableRead explicitly",
    /isolationLevel:\s*"RepeatableRead"/.test(src),
  );
  check(
    "[source] aggregate calls q* with the transaction client, not the cached readers",
    !/getFinancialState[\s\S]{0,600}?\bget(Envelopes|Goals|Transactions|Debts)\(/.test(src),
  );
  check(
    "[source] no exported identifier claims received/settled/available",
    !/export\s+(const|function|type|interface)\s+\w*(received|settled|available)\w*/i.test(src),
  );
  check(
    "[source] DAL exposes no raw err.message",
    !/error:\s*err\s+instanceof\s+Error\s*\?\s*err\.message/.test(src),
  );
}

/** Print an advisor result without dumping anything large. */
function deadlinesSafe(r) {
  return { ok: r.publicView.ok, tool: r.publicView.tool, error: r.publicView.error };
}

try {
  await main();
} catch (err) {
  console.error("financial state smoke crashed:", err);
  miss++;
  failures.push(`crash: ${err.message}`);
} finally {
  await cleanup();
  check("cleanup removes every owned fixture user", await prisma.user.count({ where: { id: { in: owned.users } } }) === 0);
  check("cleanup removes every owned fixture period", await prisma.payPeriod.count({ where: { id: { in: owned.periods } } }) === 0);
}

console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} -- ${pass} passed, ${miss} missed`);
if (miss > 0) {
  console.log("\nFailed checks:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = miss === 0 ? 0 : 1;
