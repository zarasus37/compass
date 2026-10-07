/**
 * Cross-tenant isolation for the vault — proves user B cannot touch user A.
 *
 * Why this exists
 * ---------------
 * `transitionBillDb(userId, billId, event)` accepted a `userId` and used it
 * only for the audit row. The read was `findUnique({ where: { id: billId } })`
 * and the write was `update({ where: { id: billId } })` — neither scoped to the
 * caller. Any authenticated user who learned another user's billId could drive
 * that bill through the 13-state machine, i.e. settle or cancel another
 * tenant's vault.
 *
 * That is invisible with one user. It becomes live the instant a second
 * account exists, so it has to be pinned by a test before anyone is onboarded.
 *
 * Shape
 * -----
 * Every case is a NEGATIVE ("B must not affect A") paired with a POSITIVE
 * control ("A must still be able to affect A"). The positive control is the
 * half that matters: a function that simply refused everything would pass a
 * negative-only suite, and a future refactor could break the feature while
 * looking secure.
 *
 * Why only ONE fixture user
 * ------------------------
 * `createFixture` derives the email as `smoke-<slug>-<uniq>@compass.local` and
 * calls `sweepStaleFixtures()` first, which deletes EVERY user whose email
 * starts with `smoke-`. So a second `loginAsFixture()` destroys the first —
 * the fixture is deliberately single-user (two seeded baselines would collide
 * on the canonical fixed primary keys). The foreign user here is therefore a
 * bare `User` row created directly, which is all `transitionBillDb` needs:
 * it takes a userId, and the vulnerability was in the DB layer.
 *
 * That also bounds what this proves: it covers `transitionBillDb`, which is
 * the choke point BOTH the UI server actions and the cron scheduler route
 * through. It does not exercise `requireUser()` itself.
 *
 * Run: tsx --conditions=react-server tests/smoke-vault-tenant-isolation.mjs
 * (dev server up; DATABASE_URL is the local Postgres)
 */

import { loginAsFixture } from "./fixture.mjs";
import { prisma } from "./db-client.mjs";
import { transitionBillDb } from "../src/lib/vault/db.ts";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

/** Create a DRAFT bill owned by `owner`'s vault, in a legal transition state. */
async function seedDraftBill(owner, slug) {
  const vault = await prisma.vaultAccount.findUnique({
    where: { userId: owner.userId },
  });
  if (!vault) throw new Error(`no vault for ${slug}`);

  // The fixture mirrors seeded envelopes into the vault, but its create
  // passes a `sortOrder` field that VaultEnvelope does not have, and it is
  // wrapped in `.catch(() => {})` — so it silently creates NOTHING. Don't
  // inherit that; create the envelope here.
  //
  // `compassEnvelopeId` is a real FK (@unique), so it must point at an actual
  // Envelope row.
  let envelope = await prisma.vaultEnvelope.findFirst({
    where: { vaultId: vault.id },
  });
  if (!envelope) {
    const compassEnvelope = await prisma.envelope.findFirst({
      where: { userId: owner.userId },
    });
    if (!compassEnvelope) throw new Error(`no compass envelope for ${slug}`);
    envelope = await prisma.vaultEnvelope.create({
      data: {
        id: `venv-isolation-${slug}-${Math.random().toString(36).slice(2, 8)}`,
        vaultId: vault.id,
        compassEnvelopeId: compassEnvelope.id,
        name: "Isolation Envelope",
        category: "OTHER",
        principalAllocated: 50_000,
        accruedYield: 0,
        reservedForBills: 0,
        isPolicyLocked: true,
        status: "CALM",
      },
    });
  }

  return prisma.scheduledBill.create({
    data: {
      vaultId: vault.id,
      envelopeId: envelope.id,
      billerName: `Isolation ${slug}`,
      billerId: `isolation-${slug}-${Math.random().toString(36).slice(2, 8)}`,
      maskedAccountNumber: "•••• 0000",
      amount: 12_345,
      maxAuthorizedAmount: 13_000,
      currency: "USD",
      frequency: "MONTHLY",
      dueDate: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      executionWindowStart: new Date(Date.now() + 17 * 24 * 3600 * 1000),
      executionWindowEnd: new Date(Date.now() + 21 * 24 * 3600 * 1000),
      status: "DRAFT",
      source: "user",
    },
  });
}

const readStatus = (id) =>
  prisma.scheduledBill.findUnique({ where: { id }, select: { status: true } });

async function main() {
  const alpha = await loginAsFixture("isolation-alpha");

  // A foreign account with no seeded baseline. Deliberately NOT created
  // through the fixture (see the header): a second createFixture would sweep
  // alpha. The email must not start with `smoke-` or it gets swept too.
  const foreign = await prisma.user.create({
    data: {
      name: "Foreign Tenant",
      email: `foreign-isolation-${Math.random().toString(36).slice(2, 10)}@compass.local`,
      passwordHash: "not-a-real-hash-not-used-for-login",
    },
  });

  try {
    const billA = await seedDraftBill(alpha, "alpha");

    check("fixture: alpha has a vault bill in DRAFT", (await readStatus(billA.id)).status === "DRAFT");

    // ── 1. NEGATIVE: B must not transition A's bill ─────────────────
    const cross = await transitionBillDb(foreign.id, billA.id, { type: "CANCEL" });
    check(
      "cross-tenant: foreign CANCEL of alpha's bill is refused",
      cross.ok === false,
      `got ok=${cross.ok}`,
    );
    check(
      "cross-tenant: alpha's bill is still DRAFT after the foreign attempt",
      (await readStatus(billA.id)).status === "DRAFT",
      `status=${(await readStatus(billA.id)).status}`,
    );

    // The security property is that "exists but isn't yours" and "does not
    // exist" must be INDISTINGUISHABLE. Both messages legitimately echo the
    // caller-supplied id back, so compare them with the id normalised out —
    // and assert neither says anything about ownership.
    const FAKE_ID = "definitely-not-a-real-bill-id";
    const crossMissing = await transitionBillDb(foreign.id, FAKE_ID, { type: "CANCEL" });
    const strip = (s, id) => s.replace(id, "<id>");
    check(
      "enumeration: refusing a real foreign bill and a fake id look identical",
      cross.ok === false &&
        crossMissing.ok === false &&
        strip(cross.error, billA.id) === strip(crossMissing.error, FAKE_ID) &&
        !/not yours|forbidden|unauthor|another user|owner/i.test(cross.error),
      `foreign="${cross.error}" fake="${crossMissing.error}"`,
    );

    // ── 3. NEGATIVE: no audit row written against A's data ──────────
    const auditForA = await prisma.auditLog.count({
      where: { userId: alpha.userId, actionType: "vault.bill_state_changed" },
    });
    check(
      "cross-tenant: no bill_state_changed audit row was written under alpha",
      auditForA === 0,
      `count=${auditForA}`,
    );

    // ── 4. POSITIVE CONTROL: A can still transition A's own bill ─────
    // Without this, a regression that breaks transitions entirely would
    // sail through every case above.
    const own = await transitionBillDb(alpha.userId, billA.id, { type: "CANCEL" });
    check(
      "positive control: alpha CANCEL of alpha's own bill succeeds",
      own.ok === true,
      own.ok ? "" : `error=${own.error}`,
    );
    check(
      "positive control: the row really changed to CANCELLED",
      (await readStatus(billA.id)).status === "CANCELLED",
      `status=${(await readStatus(billA.id)).status}`,
    );
    const auditOwn = await prisma.auditLog.count({
      where: { userId: alpha.userId, actionType: "vault.bill_state_changed" },
    });
    check(
      "positive control: alpha's own transition is audited under alpha",
      auditOwn === 1,
      `count=${auditOwn}`,
    );

    // ── 5. Structure guards: the unscoped shapes must not come back ──
    const { readFileSync } = await import("node:fs");
    const dbSrc = readFileSync("src/lib/vault/db.ts", "utf8");
    const fnStart = dbSrc.indexOf("export async function transitionBillDb");
    const fnSrc = dbSrc.slice(fnStart, dbStartAfter(dbSrc, fnStart));

    check(
      "source: transitionBillDb scopes its read through the vault relation",
      /findFirst\(\s*\{[^}]*vault:\s*\{\s*userId\s*\}/s.test(fnSrc),
    );
    check(
      "source: transitionBillDb scopes its write with updateMany + tenant predicate",
      /updateMany\(\s*\{[^}]*vault:\s*\{\s*userId\s*\}/s.test(fnSrc),
    );
    check(
      "source: transitionBillDb has no unscoped scheduledBill.update by id",
      !/scheduledBill\.update\(\s*\{\s*where:\s*\{\s*id:\s*billId\s*\}/s.test(fnSrc),
    );

    const serverSrc = readFileSync("src/lib/vault/server.ts", "utf8");
    check(
      "source: simulateNextState verifies vault ownership before reading status",
      /billVault\.userId\s*!==\s*user\.id/.test(serverSrc),
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: foreign.id } }).catch(() => {});
    await alpha.close();
  }

  console.log("\n--- checks ---");
  const pass = checks.filter((c) => c.ok).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
  if (miss > 0) {
    console.log("\nFAILED checks:");
    for (const c of checks) {
      if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
    }
    process.exit(1);
  }
  console.log("ALL GREEN");
}

/** End of the function that starts at `from`. */
function dbStartAfter(src, from) {
  const next = src.indexOf("\nexport ", from + 10);
  return next > 0 ? next : src.length;
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});