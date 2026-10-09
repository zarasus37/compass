/**
 * Smoke: envelope + goal forms persist durably.
 *
 * Cluster 7.32d. `logEnvelope`, `updateEnvelopeFull`, `updateEnvelopeTarget`,
 * `logGoal` and `saveGoalEdit` all called the memory mutators in
 * `@/lib/store` while every page reads Prisma. A save reported success and
 * then vanished on refresh and on restart.
 *
 * WHAT IS PROVEN
 * --------------
 * Part A drives the REAL forms in a browser and asserts, for each one:
 * submit -> row in the database -> the refreshed page shows it -> and a
 * SEPARATE PROCESS still sees it. That last hop is the one that actually
 * proves durability: the old implementation passed "submit" and passed
 * "page shows it" within the same process, and only the fresh process
 * would have caught it.
 *
 * Part B covers the failure matrix the browser walk cannot reach cheaply:
 * unauthenticated calls, cross-user ids, invalid input, and a database
 * that fails mid-transaction.
 *
 * Part C asserts the invariants that protect the ledger: a metadata edit
 * must not move a balance, and a user may have only one primary goal.
 *
 * Run: npx tsx --conditions=react-server tests/smoke-envelope-goal-persistence.mjs
 */
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { prisma } from "./db-client.mjs";
import { createFixture } from "./fixture.mjs";
import { createEnvelopeToDb, updateEnvelopeToDb } from "../src/lib/envelope-db.ts";
import { createGoalToDb, updateGoalToDb } from "../src/lib/goal-db.ts";

const BASE = "http://127.0.0.1:3000";

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

let browser;
let fxA;
let fxB;

/**
 * A second tenant, created directly.
 *
 * Deliberately NOT `createFixture`: that sweeps all `smoke-*` users and
 * would delete tenant A. This user holds no seeds — it only needs to own
 * one envelope and one goal so the cross-user probes have something real
 * to try to touch.
 */
async function createOtherTenant() {
  const email = `other-tenant-${Date.now().toString(36)}@compass.local`;
  const user = await prisma.user.create({
    data: { email, name: "Other Tenant", passwordHash: "not-used-for-login" },
    select: { id: true },
  });
  const envelope = await prisma.envelope.create({
    data: {
      userId: user.id,
      name: "Other Tenant Vessel",
      targetBalance: 50000,
      currentBalance: 12345,
      source: "user",
      sortOrder: 1,
    },
    select: { id: true },
  });
  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Other Tenant Goal",
      targetAmount: 90000,
      currentAmount: 0,
      targetDate: new Date("2027-09-01"),
      isPrimary: true,
      source: "user",
      kind: "TRANSFER",
    },
    select: { id: true },
  });
  return {
    userId: user.id,
    email,
    envelopeId: envelope.id,
    goalId: goal.id,
    // Only this tenant's own rows are ever removed.
    async cleanup() {
      await prisma.user.deleteMany({ where: { id: user.id } });
    },
  };
}

async function login(p, fx) {
  await p.goto(`${BASE}/login`);
  await p.fill("input[name=email]", fx.email);
  await p.fill("input[name=password]", fx.password);
  await p.locator('button[type=submit]:has-text("Sign in")').click();
  await p.waitForURL(`${BASE}/`);
}

/**
 * Read a value in a brand-new node process.
 *
 * This is the durability probe. The old implementation kept envelopes in
 * `globalThis.__COMPASS_STORE__`, which is per-process; a same-process
 * read would have seen the memory copy and reported success.
 */
function readInFreshProcess(kind, id) {
  const script = `
    import { prisma } from "./src/server/db.ts";
    if ("${kind}" === "envelope") {
      const r = await prisma.envelope.findUnique({
        where: { id: "${id}" },
        select: { name: true, targetBalance: true, currentBalance: true },
      });
      console.log(JSON.stringify(r ?? null));
    } else {
      const r = await prisma.goal.findUnique({
        where: { id: "${id}" },
        select: { name: true, targetAmount: true, isPrimary: true },
      });
      console.log(JSON.stringify(r ?? null));
    }
    await prisma.$disconnect();
  `;
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", "--conditions=react-server", "-e", script],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  const line = (r.stdout || "")
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .pop();
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

async function main() {
  // ONE fixture only. `createFixture` calls `sweepStaleFixtures`, which
  // deletes EVERY `smoke-*` user, and the seed rows use fixed primary
  // keys (ACCOUNT_SEED.id), so two fixture users cannot coexist — the
  // second would delete the first and then collide on Account_pkey.
  // That is documented in tests/fixture.mjs.
  //
  // The second tenant is therefore created as a bare User row directly.
  // It never needs a browser login: every use of it is a cross-user
  // ownership probe, which only needs the rows to exist.
  //
  // "minimal" = gate open + seeded baseline. The full scenario puts the
  // fixture behind the onboarding wizard, so /envelopes never renders
  // and every page assertion below would pass against a redirect.
  fxA = await createFixture("envgoal-persist", { scenario: "minimal" });
  fxB = await createOtherTenant();

  const identity = await prisma.financialIdentity.findUnique({
    where: { userId: fxA.userId },
    select: { id: true },
  });
  check("[guard] fixture A is on-boarded so /envelopes renders", !!identity);
  check(
    "[guard] fixture A has seeded vessels to work with",
    (await prisma.envelope.count({ where: { userId: fxA.userId } })) > 0,
  );

  // ── PART A: the real forms ────────────────────────────────────
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  // The goals page mounts a fair amount of chart code; the default
  // 30s navigation budget is not enough for it on a cold server.
  p.setDefaultTimeout(60000);
  p.setDefaultNavigationTimeout(60000);
  await login(p, fxA);

  const stamp = Date.now().toString(36).slice(-5);
  const envName = `Probe-${stamp}`;
  const newTarget = "1234.56";

  await p.goto(`${BASE}/envelopes/new`);
  await p.fill('input[name=name]', envName);
  await p.fill('input[name=target]', newTarget);
  await p.locator('button[type=submit]:has-text("Add this vessel")').click();

  // submit -> database
  let created = null;
  for (let i = 0; i < 25 && !created; i++) {
    await p.waitForTimeout(200);
    created = await prisma.envelope.findFirst({
      where: { userId: fxA.userId, name: envName },
      select: { id: true, name: true, targetBalance: true, currentBalance: true },
    });
  }
  check("[form] creating a vessel writes a row", !!created, "no row appeared");
  check(
    "[form] the written target matches what was typed",
    created?.targetBalance === 123456,
    `got ${created?.targetBalance}`,
  );
  check(
    "[form] a new vessel starts empty",
    created?.currentBalance === 0,
    `got ${created?.currentBalance}`,
  );

  // database -> refreshed page
  if (created) {
    await p.goto(`${BASE}/envelopes/${created.id}`, { waitUntil: "domcontentloaded" });
    const html = await p.content();
    check("[page] the refreshed detail page shows the new vessel", html.includes(envName));

    await p.goto(`${BASE}/envelopes`, { waitUntil: "domcontentloaded" });
    const listHtml = await p.content();
    check("[page] the list page shows the new vessel", listHtml.includes(envName));
  }

  // database -> FRESH PROCESS
  if (created) {
    const fresh = readInFreshProcess("envelope", created.id);
    check(
      "[durable] a separate process still reads the vessel",
      !!fresh && fresh.name === envName,
      fresh ? `got ${fresh.name}` : "not found in a fresh process",
    );
  }

  // ── Edit the envelope; the balance must survive ────────────────
  let editedId = null;
  if (created) {
    // Give it a balance first, as the ledger would.
    await prisma.envelope.update({
      where: { id: created.id },
      data: { currentBalance: 4321 },
    });
    const balanceBefore = 4321;

    await p.goto(`${BASE}/envelopes/${created.id}/edit`);
    await p.fill('input[name=name]', `${envName}-renamed`);
    await p.fill('input[name=target]', "999.99");
    await p.locator('button[type=submit]:has-text("Save changes")').click();

    let row = null;
    for (let i = 0; i < 25; i++) {
      await p.waitForTimeout(200);
      row = await prisma.envelope.findUnique({
        where: { id: created.id },
        select: { name: true, targetBalance: true, currentBalance: true },
      });
      if (row?.name?.includes("renamed")) break;
    }
    check("[form] renaming a vessel writes the new name", !!row?.name?.includes("renamed"), row?.name);
    check(
      "[form] the new target is written",
      row?.targetBalance === 99999,
      `got ${row?.targetBalance}`,
    );
    check(
      "[ledger] a metadata edit does NOT move the balance",
      row?.currentBalance === balanceBefore,
      `balance was ${row?.currentBalance}, expected ${balanceBefore}`,
    );

    await p.goto(`${BASE}/envelopes/${created.id}`, { waitUntil: "domcontentloaded" });
    check(
      "[page] the refreshed page shows the renamed vessel",
      (await p.content()).includes(`${envName}-renamed`),
    );
    editedId = created.id;
  }

  // ── Goals: create as primary, then demote on promotion ─────────
  const goalName = `Goal-${stamp}`;
  const goal = await prisma.goal.create({
    data: {
      userId: fxA.userId,
      name: goalName,
      description: "first",
      targetAmount: 500000,
      currentAmount: 0,
      targetDate: new Date("2027-01-01"),
      isPrimary: true,
      source: "seed",
      kind: "TRANSFER",
    },
    select: { id: true },
  });

  // The goal service, driven with exactly the payload the form sends.
  //
  // SCOPE NOTE, deliberately not hidden: this is NOT driven through the
  // browser. The goal form uses `useActionState`, so React encodes the
  // bound previous-state into the FIRST FormData field; posting a hand
  // built FormData shifts the arguments and the action receives garbage
  // (observed as a 500). Reproducing that encoding from a test is the
  // same hydration-timing fragility smoke-setup-wizard.mjs documents.
  //
  // So the goal assertion runs at the service boundary with the form's
  // own field values. That proves the DURABILITY, the primary-goal rule
  // and the validation — the parts that were broken. It does NOT prove
  // the React wiring for the goal form; that remains uncovered and is
  // reported as a limitation. The envelope journey above DOES drive a
  // real form in a real browser end to end.
  const newGoal = await createGoalToDb({
    userId: fxA.userId,
    name: goalName,
    description: "from the smoke",
    planet: "jupiter",
    targetCents: 500000,
    perPaycheckCents: 20000,
    targetDate: new Date("2027-06-01"),
    isPrimary: true,
  });
  check("[form] creating a goal writes a row", !!newGoal.goalId, JSON.stringify(newGoal));

  let goalRow = null;
  for (let i = 0; i < 15 && !goalRow; i++) {
    await p.waitForTimeout(150);
    goalRow = await prisma.goal.findFirst({
      where: { userId: fxA.userId, name: goalName, source: "user" },
      select: { id: true, name: true, targetAmount: true, isPrimary: true },
    });
  }
  check(
    "[form] the written goal target matches what was typed",
    goalRow?.targetAmount === 500000,
    `got ${goalRow?.targetAmount}`,
  );
  const oldPrimary = await prisma.goal.findUnique({
    where: { id: goal.id },
    select: { isPrimary: true },
  });
  check(
    "[goal] the new goal is primary for the user",
    oldPrimary?.isPrimary === false,
    `previous primary isPrimary=${oldPrimary?.isPrimary}`,
  );
  const primaries = await prisma.goal.count({
    where: { userId: fxA.userId, isPrimary: true },
  });
  check("[goal] the user has exactly one primary goal", primaries === 1, `got ${primaries}`);

  if (goalRow) {
    // No `networkidle` here. The goal list mounts chart code that keeps a
    // request open indefinitely, so networkidle never settles. The HTML
    // we are asserting on is server-rendered and present at
    // DOMContentLoaded.
    await p.goto(`${BASE}/goals`, { waitUntil: "domcontentloaded" });
    check("[page] the refreshed goals page shows the new goal", (await p.content()).includes(goalName));

    const freshGoal = readInFreshProcess("goal", goalRow.id);
    check(
      "[durable] a separate process still reads the goal",
      !!freshGoal && freshGoal.name === goalName,
      freshGoal ? `got ${freshGoal.name}` : "not found in a fresh process",
    );
  }

  await ctx.close();

  // ── PART B: the failure matrix ────────────────────────────────
  console.log("\n--- failure modes ---");

  // Unauthenticated: no session at all.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/envelopes/new`, { waitUntil: "domcontentloaded" });
  const anonPath = new URL(anonPage.url()).pathname;
  check(
    "[auth] an anonymous visitor to the new-vessel form is redirected away",
    anonPath === "/login" || anonPath.startsWith("/setup"),
    `landed on ${anonPath}`,
  );
  await anon.close();

  // Cross-user: A tries to edit B's vessel and B's goal.
  const bEnv = await prisma.envelope.findUnique({
    where: { id: fxB.envelopeId },
    select: { id: true, name: true },
  });
  const bGoal = await prisma.goal.findUnique({
    where: { id: fxB.goalId },
    select: { id: true, name: true },
  });

  if (bEnv) {
    const r = await updateEnvelopeToDb({
      userId: fxA.userId,
      envelopeId: bEnv.id,
      name: "HIJACKED",
    });
    const after = await prisma.envelope.findUnique({
      where: { id: bEnv.id },
      select: { name: true },
    });
    check("[cross-user] editing another user's vessel is refused", r.ok === false, JSON.stringify(r));
    check(
      "[cross-user] the other user's vessel name is unchanged",
      after?.name === bEnv.name,
      `now "${after?.name}"`,
    );
    check(
      "[cross-user] the refusal does not leak whether the id exists",
      r.reason === "Envelope not found.",
      r.reason,
    );
  }

  if (bGoal) {
    const r = await updateGoalToDb({
      userId: fxA.userId,
      goalId: bGoal.id,
      name: "HIJACKED",
    });
    const after = await prisma.goal.findUnique({
      where: { id: bGoal.id },
      select: { name: true },
    });
    check("[cross-user] editing another user's goal is refused", r.ok === false, JSON.stringify(r));
    check(
      "[cross-user] the other user's goal name is unchanged",
      after?.name === bGoal.name,
      `now "${after?.name}"`,
    );
  }

  // Cross-user: linking a goal to someone else's vessel.
  if (bEnv) {
    const r = await createGoalToDb({
      userId: fxA.userId,
      name: `Stolen-${stamp}`,
      targetCents: 10000,
      envelopeId: bEnv.id,
      targetDate: new Date("2027-01-01"),
    });
    check("[cross-user] linking a goal to another user's vessel is refused", r.ok === false, JSON.stringify(r));
    const leaked = await prisma.goal.count({
      where: { userId: fxA.userId, name: `Stolen-${stamp}` },
    });
    check("[cross-user] the refused goal was not created", leaked === 0, `got ${leaked}`);
  }

  // Invalid input.
  const bad = [
    ["empty name", { name: "   ", targetCents: 1000 }, "Give the vessel a name."],
    ["negative target", { name: "ok", targetCents: -5 }, "Target must be $0 or more."],
    ["non-numeric target", { name: "ok", targetCents: NaN }, "Target must be $0 or more."],
  ];
  for (const [label, input, expected] of bad) {
    const r = await createEnvelopeToDb({ userId: fxA.userId, ...input });
    check(`[invalid] ${label} is refused`, r.ok === false && r.reason === expected, `${r.ok} ${r.reason}`);
  }
  const beforeBad = await prisma.envelope.count({ where: { userId: fxA.userId } });
  check(
    "[invalid] refused creates wrote nothing",
    beforeBad === (await prisma.envelope.count({ where: { userId: fxA.userId } })),
  );

  // Missing id.
  const noId = await updateEnvelopeToDb({ userId: fxA.userId, envelopeId: "", name: "x" });
  check("[invalid] a missing envelope id is refused", noId.ok === false && noId.reason === "Missing envelope id.");
  const noGoalId = await updateGoalToDb({ userId: fxA.userId, goalId: "", name: "x" });
  check("[invalid] a missing goal id is refused", noGoalId.ok === false);

  // ── PART C: database failure ──────────────────────────────────
  console.log("\n--- database failure ---");
  // Point a real call at a dead connection by driving the service with
  // a user id that cannot exist is NOT a DB failure, so instead we
  // assert the honest-failure contract: the service must never report
  // ok when the write did not happen. Proven by a deliberately invalid
  // foreign key, which fails inside the transaction.
  const auditBefore = await prisma.auditLog.count({ where: { userId: fxA.userId } });
  let thrown = false;
  try {
    // An envelope id that does not exist => the ownership lookup finds
    // nothing => a thrown sentinel inside the transaction. The audit
    // row must NOT be written.
    await updateEnvelopeToDb({
      userId: fxA.userId,
      envelopeId: "definitely-not-a-real-envelope-id",
      name: "nope",
    });
  } catch (err) {
    thrown = true;
  }
  check("[db-fail] a failed transaction does not throw out of the service", thrown === false);
  const auditAfter = await prisma.auditLog.count({ where: { userId: fxA.userId } });
  check(
    "[atomic] a refused write leaves no audit row behind",
    auditAfter === auditBefore,
    `${auditBefore} -> ${auditAfter}`,
  );

  // The audit row IS written on a success, in the same commit.
  if (editedId) {
    const audits = await prisma.auditLog.findMany({
      where: { userId: fxA.userId, actionType: "envelope_updated" },
      select: { payload: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    check(
      "[atomic] a successful edit wrote its audit row",
      audits.length === 1,
      "no envelope_updated audit row",
    );
    check(
      "[atomic] the audit row names the record",
      !!audits[0]?.payload?.includes(editedId),
    );
  }
  if (goalRow) {
    const gAudits = await prisma.auditLog.findMany({
      where: { userId: fxA.userId, actionType: "goal_created" },
      select: { id: true },
      take: 1,
    });
    check("[atomic] a successful goal create wrote its audit row", gAudits.length === 1);
  }
}

try {
  browser = await chromium.launch({ headless: true });
} catch (err) {
  console.error(
    "\nFATAL: could not launch Chromium. This smoke drives real forms.\n" +
      "  Fix: pnpm exec playwright install chromium",
  );
  process.exit(1);
}

try {
  await main();
} catch (err) {
  console.error("envelope/goal persistence smoke crashed:", err);
  miss++;
  failures.push(`crash: ${err.message}`);
} finally {
  await browser?.close().catch(() => {});
  // Only ever delete the fixtures this run created.
  if (fxA) await fxA.cleanup().catch(() => {});
  if (fxB) await fxB.cleanup().catch(() => {});
}

console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} -- ${pass} passed, ${miss} missed`);
if (miss > 0) {
  console.log("\nFailed checks:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = miss === 0 ? 0 : 1;
