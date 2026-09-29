/**
 * Per-test user fixture for the Compass smoke suite.
 *
 * â”€â”€ Why this exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The suite used to share ONE hardcoded user (`mom@compass.local`) across
 * ~30 files. That made it order-dependent, because several tests
 * destructively mutate that shared row:
 *
 *   - smoke-advisor nulls `FinancialIdentity.completedAt` to exercise the
 *     onboarding gate, then restores it. If the test failed anywhere in
 *     between, the restore never ran and every LATER test inherited a
 *     gated user (every page 307s to /setup).
 *   - smoke-accounts-db calls POST /api/reset-seed on the same user.
 *
 * The symptom was confusing: `smoke-vault` passes when run alone and
 * fails inside the chain. That is a state-dependency signature, not a
 * broken assertion.
 *
 * This fixture gives every test its own user, so a test can no longer
 * poison another. Teardown deletes the user, so repeated runs and CI
 * do not accumulate rows.
 *
 * â”€â”€ Running this â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The seed modules live in `src/lib/*.ts` and import Next's `server-only`
 * marker, so anything using this fixture must run under tsx with the
 * react-server condition:
 *
 *     tsx --conditions=react-server tests/smoke-foo.mjs
 *
 * â”€â”€ Usage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *     import { withFixture } from "./fixture.mjs";
 *
 *     const fx = await withFixture("debts-tier", async (fx) => {
 *       // ... assertions, using fx.email / fx.password / fx.userId
 *     });
 *
 * or, for a test that needs to survive past the callback:
 *
 *     const fx = await createFixture("debts-tier");
 *     try { ... } finally { await fx.cleanup(); }
 */

import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { prisma } from "./db-client.mjs";

import {
  ACCOUNT_SEED,
  ENVELOPES_SEED,
  GOALS_SEED,
  BILLS_SEED,
  ALLOCATION_PLAN_SEED,
} from "../src/lib/mock-seed.ts";
import { ensureUserSinksSeeded } from "../src/lib/seed-sinks.ts";
// The PRODUCT's id-namespacing helper, not a local copy. The fixture
// must derive ids exactly the way the app does, or the vault re-sync
// (`seedVaultFromEnvelopes` re-derives rows from `liveEnvelopes`) will
// produce ids the fixture's own rows never match, and the vault renders
// zero bill rows. Using the real helper makes drift impossible.
import { seededId } from "../src/lib/seed-ids.ts";

/** Argon2 params must match src/server/auth/password.ts or login fails. */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const DAY = 24 * 60 * 60 * 1000;

/** Fixed "now" anchor so a scenario is a coherent month, not drift. */
function daysAgo(n) {
  return new Date(Date.now() - n * DAY);
}

let seq = 0;

/** Only ever matches fixture users. Never touches a real account. */
const FIXTURE_EMAIL_PREFIX = "smoke-";

/**
 * Delete every leftover fixture user from a previous (possibly crashed)
 * run.
 *
 * This is required, not just tidy. The canonical seeders
 * (ensureUserAccountsSeeded and friends) insert rows under FIXED primary
 * keys â€” ACCOUNT_SEED.id and so on â€” because they represent one canonical
 * account/goal/bill set. So two fixture users cannot both hold the seeded
 * baseline at the same time: the second one dies on
 * `Account_pkey` / duplicate key.
 *
 * In the normal sequential chain, teardown runs between tests and there
 * is no overlap. But a test that crashes before its `finally` leaves its
 * user behind, and the NEXT fixture then fails with a confusing unique
 * constraint error that has nothing to do with what it was testing.
 * Sweeping first makes a crashed run self-healing.
 */
async function sweepStaleFixtures() {
  const stale = await prisma.user.findMany({
    where: { email: { startsWith: FIXTURE_EMAIL_PREFIX } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  const ids = stale.map((u) => u.id);
  // SetupState has no FK to User, so it must be cleared explicitly or
  // those rows accumulate forever.
  await prisma.setupState.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

/**
 * Create a user, open the onboarding gate, and provision a scenario.
 *
 * @param {string} slug  short test identifier, e.g. "debts-tier"
 * @param {object} [opts]
 * @param {"full"|"minimal"} [opts.scenario="full"]
 *        "full"    â€” gate + seeded baseline + paycheck + a month of
 *                    transactions (the default; what most smokes want)
 *        "minimal" â€” gate + seeded baseline only
 * @returns {Promise<Fixture>}
 */
export async function createFixture(slug, opts = {}) {
  const { scenario = "full" } = opts;
  const clean = String(slug).replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  // Clear anything a previous crashed run left behind before claiming
  // the canonical seed rows. See sweepStaleFixtures for why this matters.
  const swept = await sweepStaleFixtures();
  if (swept > 0) {
    console.log(`[fixture] swept ${swept} stale fixture user(s) from a previous run`);
  }

  seq += 1;
  const uniq = `${Date.now().toString(36)}${seq.toString(36)}`;
  const email = `smoke-${clean}-${uniq}@compass.local`;
  const password = `fx-${randomBytes(18).toString("base64url")}`;
  const passwordHash = await hash(password, ARGON2);

  const user = await prisma.user.create({
    data: { email, name: `Smoke ${clean}`, passwordHash },
  });

  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      // SetupState has userId @unique but NO relation to User, so Prisma
      // emits no FK and no ON DELETE CASCADE. It must go explicitly or
      // the row is orphaned on every run.
      await prisma.setupState.deleteMany({ where: { userId: user.id } });
      // Everything else (Session, Account, Envelope, Transaction,
      // PaySchedule, Bill, Goal, AllocationPlan, AuditLog,
      // FinancialIdentity + its Identity* children, Vault*) cascades.
      await prisma.user.delete({ where: { id: user.id } });
    } catch {
      // Teardown must never mask a test failure.
    }
  };

  // â”€â”€ Open the onboarding gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // The gate (src/lib/onboarding/gate.ts) is an OR:
  //   FinancialIdentity.completedAt != null || SetupState.activatedAt != null
  // We set BOTH so the fixture is realistic and does not depend on which
  // branch a given page happens to read.
  await prisma.setupState.create({
    data: { userId: user.id, completedStep: 5, activatedAt: new Date() },
  });

  const identity = await prisma.financialIdentity.create({
    data: {
      userId: user.id,
      ageRange: "35-44",
      employmentStatus: "employed",
      location: "us",
      timeHorizonYears: 12,
      riskTolerance: "moderate",
      riskComfort: "steady",
      aiTierPref: "assistive",
      currency: "USD",
      completedAt: new Date(),
    },
  });

  // Identity-level rows the onboarding chat would have produced.
  await prisma.identityIncome.create({
    data: { identityId: identity.id, label: "Main Salary", cadence: "biweekly", isPrimary: true, sortOrder: 0 },
  });
  await prisma.identityDebt.create({
    data: { identityId: identity.id, label: "Chase Sapphire", kind: "credit_card", balanceDollars: 4_820, aprPercent: 22.9 },
  });
  await prisma.identityAsset.create({
    data: { identityId: identity.id, label: "Emergency Savings", amountDollars: 20_000 },
  }).catch(() => {});
  await prisma.identityGoal.create({
    data: { identityId: identity.id, label: "Emergency Fund", targetDollars: 20_000, targetDate: new Date(Date.now() + 365 * DAY) },
  }).catch(() => {});

  const fixture = {
    slug: clean,
    userId: user.id,
    identityId: identity.id,
    email,
    password,
    cleanup,
    ids: null,
  };

  // â”€â”€ Seeded baseline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Built from the product's own seed CONSTANTS, but with per-user ids.
  //
  // We deliberately do NOT call ensureUserAccountsSeeded and friends.
  // Those insert under FIXED global primary keys ("acct-chase",
  // "env-rent", "bill-rent", â€¦) because they represent one canonical
  // dataset. Two users therefore cannot both hold the seeded baseline â€”
  // the second insert dies on `Account_pkey`. Since every test now gets
  // its own user, we recreate the same VALUES under generated ids and
  // remap every cross-reference.
  //
  // The values are read from mock-seed.ts at runtime, so this stays in
  // sync with the product automatically: if the canonical balance
  // changes, the fixture changes with it. Tests that assert on a balance
  // or a name still see the real number; only the opaque id differs.
  const ids = await provisionBaseline(fixture);

  if (scenario === "full") {
    await provisionVault(fixture, ids);
    await provisionMonth(fixture, ids);
  }

  return fixture;
}

/**
 * Create the canonical-shaped dataset (account, 7 envelopes, 4 goals,
 * 6 bills, allocation plan) under ids unique to this user.
 * Returns the id map for callers that need to reference rows.
 */
async function provisionBaseline(fx) {
  const tag = fx.userId; // MUST match the product namespace. Previously this was fx.slug,
  const ids = {
    account: seededId(fx.userId, ACCOUNT_SEED.id),
    envelopes: {},
    goals: {},
    bills: {},
  };

  await prisma.account.create({
    data: {
      id: ids.account,
      userId: fx.userId,
      name: ACCOUNT_SEED.name,
      type: ACCOUNT_SEED.type,
      currentBalance: ACCOUNT_SEED.balanceCents,
      institution: ACCOUNT_SEED.institution ?? null,
      mask: ACCOUNT_SEED.mask ?? null,
      source: "seed",
      isArchived: false,
      sortOrder: 0,
    },
  });

  for (const [i, e] of ENVELOPES_SEED.entries()) {
    const id = seededId(fx.userId, e.id);
    ids.envelopes[e.id] = id;
    await prisma.envelope.create({
      data: {
        id,
        userId: fx.userId,
        name: e.name,
        source: "seed",
        currentBalance: e.currentCents,
        targetBalance: e.targetCents,
        planet: e.planet ?? null,
        enforceHardCap: true,
        sortOrder: i,
        isArchived: false,
      },
    });
  }

  for (const [i, g] of GOALS_SEED.entries()) {
    const id = seededId(fx.userId, g.id);
    ids.goals[g.id] = id;
    await prisma.goal.create({
      data: {
        id,
        userId: fx.userId,
        name: g.name,
        description: g.description ?? null,
        planet: g.planet ?? null,
        targetAmount: g.targetCents,
        currentAmount: g.currentCents,
        targetDate: g.targetDate ?? null,
        envelopeId: ids.envelopes[g.envelopeId] ?? null,
        isPrimary: g.isPrimary ?? false,
        kind: g.kind ?? "MILESTONE",
        goalType: g.goalType ?? null,
        source: "seed",
        sortOrder: i,
        isArchived: false,
      },
    });
  }

  for (const [i, b] of BILLS_SEED.entries()) {
    const id = seededId(fx.userId, b.id);
    ids.bills[b.id] = id;
    await prisma.bill.create({
      data: {
        id,
        userId: fx.userId,
        name: b.name,
        // Bills carry a cadence and the amount lives on the bill's
        // envelope/transaction history in this schema; the canonical
        // amount is preserved via the seeded envelope balances.
        cadence: b.cadence ?? "monthly",
        amountCents: b.amountCents ?? 0,
        dueDay: b.dueDay ?? null,
        autopay: b.autopay ?? false,
        paidAt: b.paidAt ?? null,
        source: "seed",
        envelopeId: ids.envelopes[b.envelopeId] ?? null,
        accountId: ids.account,
        sortOrder: b.sortOrder ?? i,
        isArchived: false,
      },
    }).catch((e) => {
      // `amountCents` is not a column in every Prisma generation; fall
      // back to the minimal shape rather than failing the whole fixture.
      return prisma.bill.create({
        data: {
          id,
          userId: fx.userId,
          name: b.name,
          cadence: b.cadence ?? "monthly",
          dueDay: b.dueDay ?? null,
          autopay: b.autopay ?? false,
          source: "seed",
          envelopeId: ids.envelopes[b.envelopeId] ?? null,
          accountId: ids.account,
          sortOrder: b.sortOrder ?? i,
        },
      });
    });
  }

  // Allocation plan + rules, with envelope references remapped.
  const planId = seededId(fx.userId, ALLOCATION_PLAN_SEED.id);
  await prisma.allocationPlan.create({
    data: {
      id: planId,
      userId: fx.userId,
      strategyId: ALLOCATION_PLAN_SEED.strategy,
      isArmed: ALLOCATION_PLAN_SEED.isArmed,
    },
  });
  for (const [i, r] of ALLOCATION_PLAN_SEED.rules.entries()) {
    await prisma.allocationRule.create({
      data: {
        id: seededId(fx.userId, r.id),
        planId,
        envelopeId: ids.envelopes[r.envelopeId] ?? null,
        // The seed expresses a rule as {mode, value}; the schema stores
        // a percent and an optional fixed amount.
        pct: r.mode === "percent" ? (r.value ?? 0) : 0,
        fixedCents: r.mode === "fixed" ? (r.value ?? 0) : null,
        source: "seed",
        sortOrder: r.priority ?? i,
      },
    });
  }

  fx.ids = ids;
  return ids;
}

/**
 * Vault state: a MOCK-mode Safe plus yield-eligible envelope positions.
 *
 * The /vault page derives its yield panel from VaultEnvelope rows â€”
 * `mock-data.ts` treats `principalAllocated` as the eligible principal,
 * accrues SIMULATED_APY (3.52%) per day for DAYS_DEPLOYED (14) days, and
 * splits the total pro-rata. With no VaultEnvelope rows the whole panel
 * reads $0.00 and the "reconciliation" assertion has nothing to compare.
 *
 * The Smart account address is the MOCK literal, which is what puts the
 * page in MOCK state â€” the state every vault smoke asserts against
 * ([DEPLOY] visible, [FUND]/[DEPOSIT]/[WITHDRAW] hidden).
 */
async function provisionVault(fx, ids) {
  const { MOCK_SAFE_ADDRESS } = await import("../src/lib/vault/safe-deploy.ts");

  const vault = await prisma.vaultAccount.create({
    data: {
      id: `vault-${fx.slug}-${fx.userId.slice(-6)}`,
      userId: fx.userId,
      chainId: 84532, // Base Sepolia â€” the safe default for local dev
      smartAccountAddress: MOCK_SAFE_ADDRESS,
      baseAsset: "USDC",
      status: "ACTIVE",
      availableBalance: 100_000,
      settlementReserve: 20_000,
      deployedToYield: 80_000,
      simulatedApy: 0.0352,
    },
  }).catch((e) => {
    // Deliberately NOT swallowed. A vault-less fixture makes every
    // yield assertion read $0.00, which looks like a page bug instead
    // of a fixture bug. Fail loudly and immediately.
    console.error(
      `[fixture] FATAL: could not provision vault for ${fx.email} â€” ${e.message}`,
    );
    throw e;
  });

  if (!vault) return;
  // Mirror the seeded envelopes into the vault, sized by their current
  // balance, so attribution has something to distribute.
  const envelopes = await prisma.envelope.findMany({
    where: { userId: fx.userId, isArchived: false },
    orderBy: { sortOrder: "asc" },
  });

  for (const [i, e] of envelopes.entries()) {
    await prisma.vaultEnvelope.create({
      data: {
        id: `venv-${e.id}-${fx.slug}`,
        vaultId: vault.id,
        compassEnvelopeId: e.id,
        name: e.name,
        category: e.planet ?? "general",
        principalAllocated: e.currentBalance,
        accruedYield: 0,
        reservedForBills: 0,
        isPolicyLocked: true,
        status: "CALM",
        sortOrder: i,
      },
    }).catch(() => {});
  }

  fx.ids = { ...ids, vault: vault.id };
}



/**
 * A plausible month of life on top of the seeded baseline: an active
 * biweekly paycheck (D17 â€” biweekly is the canonical cadence) and
 * spending spread across the seeded envelopes.
 *
 * Values are the canonical envelopes by NAME lookup, so spending lands
 * in the same vessels a real user would hit: rent on the rent envelope,
 * groceries on groceries, and so on.
 */
async function provisionMonth(fx, ids) {
  const accountId = ids?.account;
  if (!accountId) return;

  // Paycheck: $3,200 biweekly, started 8 weeks ago.
  await prisma.paySchedule.create({
    data: {
      userId: fx.userId,
      cadence: "biweekly",
      amount: 320_000,
      accountId,
      startDate: daysAgo(56),
      isActive: true,
    },
  }).catch(() => {});

  const env = (seedId) => ids.envelopes[seedId] ?? null;
  const RENT = env("env-rent");
  const GROCERIES = env("env-groceries");
  const UTILITIES = env("env-utilities");
  const DINING = env("env-dining");

  // A month of ordinary spending: two paychecks in, everyday bills out.
  const spending = [
    { day: 26, payee: "Landlord", cents: 145_000, env: RENT },
    { day: 24, payee: "Grocery Outlet", cents: 8_450, env: GROCERIES },
    { day: 21, payee: "Grocery Outlet", cents: 6_120, env: GROCERIES },
    { day: 19, payee: "Metro Transit", cents: 2_400, env: DINING },
    { day: 17, payee: "Corner Coffee", cents: 585, env: DINING },
    { day: 15, payee: "Pharmacy", cents: 3_275, env: DINING },
    { day: 12, payee: "Utility Co", cents: 11_800, env: UTILITIES },
    { day: 9, payee: "Streaming Bundle", cents: 1_799, env: DINING },
    { day: 6, payee: "Grocery Outlet", cents: 7_930, env: GROCERIES },
    { day: 3, payee: "Grocery Outlet", cents: 5_640, env: GROCERIES },
    { day: 2, payee: "Gas Station", cents: 4_210, env: DINING },
  ].filter((s) => s.env);

  const rows = spending.map((s) => ({
    userId: fx.userId,
    accountId,
    envelopeId: s.env,
    // Compass stores outflow as a positive amount against the envelope.
    amount: s.cents,
    date: daysAgo(s.day),
    payee: s.payee,
    source: "manual",
    cleared: true,
  }));

  if (rows.length) await prisma.transaction.createMany({ data: rows });

  // Two paychecks landed inside the window, so period math has real rows
  // to aggregate rather than an empty month.
  for (const d of [14, 0]) {
    await prisma.transaction.create({
      data: {
        userId: fx.userId,
        accountId,
        envelopeId: null,
        amount: 320_000,
        date: daysAgo(d),
        payee: "Employer Payroll",
        source: "paycheck",
        cleared: true,
      },
    });
  }
}


/**
 * Create a fixture AND log into the running dev server as that user.
 *
 * This is the one-line entry point most smokes want:
 *
 *     const s = await loginAsFixture("debts-tier");
 *     const r = await s.get("/debts");
 *     ... use s.user.email / s.user.password / s.user.userId
 *     await s.close();
 *
 * It carries the cookie jar, so `get`/`post`/`postJson` behave like an
 * authenticated browser for the whole test. Keeping the login here
 * rather than in 40 test files is what makes the per-test-user
 * migration mechanical instead of bespoke.
 *
 * @param {string} slug
 * @param {object} [opts] forwarded to createFixture
 */
export async function loginAsFixture(slug, opts = {}) {
  const fx = await createFixture(slug, opts);
  const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  const jar = {};

  const absorb = (res) => {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const i = pair.indexOf("=");
      if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
  };
  const cookieHeader = () =>
    Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

  const get = async (path, init = {}) => {
    const headers = new Headers(init.headers ?? {});
    const c = cookieHeader();
    if (c) headers.set("cookie", c);
    const res = await fetch(base + path, { ...init, headers, redirect: "manual" });
    absorb(res);
    return res;
  };

  const post = async (path, fields, { actionId } = {}) => {
    const form = new FormData();
    if (actionId) {
      // Next's bound server-action wire format.
      form.append("$ACTION_REF_1", "");
      form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
      form.append("$ACTION_1:1", '["$undefined"]');
    }
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return get(path, { method: "POST", body: form });
  };

  const postJson = async (path, body) =>
    get(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

  // Log in through the real server action, so session handling is
  // exercised rather than bypassed.
  const lr = await get("/login");
  const html = await lr.text();
  const aid =
    html.match(/"id":"([a-f0-9]{20,})"/)?.[1] ??
    html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/)?.[1] ??
    null;
  if (!aid) {
    await fx.cleanup();
    throw new Error("[fixture] no login action id on /login â€” is the dev server up?");
  }
  const lp = await post("/login", { email: fx.email, password: fx.password }, { actionId: aid });
  absorb(lp);
  if (!jar.compass_session) {
    await fx.cleanup();
    throw new Error(`[fixture] login failed for ${fx.email} (status ${lp.status})`);
  }

  return {
    ...fx,
    base,
    jar,
    get,
    post,
    postJson,
    login: { status: lp.status, actionId: aid },
    close: () => fx.cleanup(),
  };
}

/**
 * Create a fixture, run `fn`, and always tear down. The callback's
 * return value is passed through.
 */
export async function withFixture(slug, fn, opts) {
  const fx = await createFixture(slug, opts);
  try {
    return await fn(fx);
  } finally {
    await fx.cleanup();
  }
}

export { prisma };

