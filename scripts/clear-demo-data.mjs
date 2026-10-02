#!/usr/bin/env node
/**
 * clear-demo-data — strip the seeded demo persona from one account,
 * leaving the login itself intact.
 *
 * ## Why
 *
 * The canonical seed in `src/lib/mock-seed.ts` gives every new user a
 * fictional household: 7 vessels, ~6 transactions, bills, goals, debts,
 * a vault. That is right for a demo and wrong for a real account — the
 * dashboard shows another person's fictional rent and groceries beside
 * live dates. This removes that data so the account starts honest and
 * real figures can be entered instead.
 *
 * ## What it does NOT touch
 *
 * `User`, `Session` and `FinancialIdentity` are left alone, so the
 * person keeps their login, their password, and any onboarding answers
 * they have given. This is a data reset, not an account delete.
 *
 * ## Safety
 *
 * - `DATABASE_URL` must be set explicitly. It deliberately does NOT
 *   fall back to `.env.local`, because a destructive command that
 *   silently targets the wrong database is worse than one that refuses
 *   to run.
 * - Dry run is the default. `--confirm` is required to write.
 * - The resolved host/database is printed before anything happens, so
 *   you can confirm you are pointed at production.
 *
 * ## Usage
 *
 *   $env:DATABASE_URL = "<production url>"
 *   npx tsx scripts/clear-demo-data.mjs you@example.com            # dry run
 *   npx tsx scripts/clear-demo-data.mjs you@example.com --confirm  # delete
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

// ---- resolve the target database before doing anything else ----------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "This script will not guess a database. Point it at the one you mean:\n\n" +
      '  PowerShell:  $env:DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"\n' +
      "  bash:        DATABASE_URL=postgresql://user:pass@host/db?sslmode=require \\\n" +
      "                 npx tsx scripts/clear-demo-data.mjs you@example.com --confirm\n",
  );
  process.exit(1);
}

// Print host/port/db only. Never echo credentials.
let target;
try {
  const u = new URL(connectionString);
  target = `${u.hostname}:${u.port || 5432}/${u.pathname.replace(/^\//, "")}`;
} catch {
  console.error("DATABASE_URL did not parse as a URL. Aborting.");
  process.exit(1);
}

// ---- prisma client (same driver adapter the app + smokes use) ---------

const generated = require(
  `${process.cwd()}/src/generated/prisma/client`,
);
const { PrismaClient } = generated;
const { PrismaPg } = require(
  `${process.cwd()}/node_modules/@prisma/adapter-pg`,
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Models that hold seeded demo data, discovered from the schema rather
 * than hardcoded.
 *
 * A hand-maintained list rots: `PaymentAttempt` has no `userId` (it
 * hangs off `ScheduledBill`), so a `where: { userId }` against it
 * throws. Parsing prisma/schema.prisma for models that actually
 * declare a `userId` keeps this correct as the schema evolves.
 *
 * `PayPeriod` is deliberately excluded: it has no `userId` (it is a
 * single global active row) and it now rolls itself forward, so
 * clearing demo data must not touch it.
 */
const SKIP = new Set(["User", "Session", "FinancialIdentity"]);

/** model -> models it has an FK to (so it must be deleted BEFORE them) */
function parseDependencies() {
  const schema = readFileSync(
    join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const deps = new Map();
  for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const [, name, body] = m;
    const targets = new Set();
    for (const line of body.split("\n")) {
      const rel = line.match(
        /^\s*\w+\s+(\w+)\s+@relation\(\s*fields:\s*\[[^\]]*\]\s*,\s*references:\s*\[[^\]]*\]\s*\)/,
      );
      if (rel) targets.add(rel[1]); // the model named before @relation
    }
    deps.set(name, targets);
  }
  return deps;
}

/**
 * Delete order: children first.
 *
 * The first version of this script deleted in schema order, which put
 * `Account` before `PaySchedule` — and `PaySchedule.accountId` is a
 * RESTRICT foreign key, so the delete threw:
 *
 *   update or delete on table "Account" violates RESTRICT setting of
 *   foreign key constraint "PaySchedule_accountId_fkey"
 *
 * Worse, the deletes were not in a transaction, so the script left the
 * account PARTIALLY cleared (envelopes gone, account still there). For
 * a destructive reset that is the worst possible outcome, so the order
 * is now derived from the schema's own relations and the whole delete
 * runs atomically.
 */
function deleteOrder() {
  const deps = parseDependencies(); // model -> models it references
  const models = [...deps.keys()].filter(
    (n) => !SKIP.has(n) && /userId/.test(modelBody(n)),
  );

  // Kahn's algorithm, emitting DEPENDENTS before the rows they
  // reference. A plain recursive DFS is not enough here: the outer
  // loop visits models in schema order, so `Account` (early in the
  // file) gets emitted before `PaySchedule` even though PaySchedule
  // holds the FK to it. So build the reverse edges explicitly —
  // "who depends on me" — and only emit a model once everything that
  // depends on it has already gone out.
  const dependents = new Map(models.map((m) => [m, []]));
  for (const m of models) {
    for (const t of deps.get(m) ?? []) {
      if (dependents.has(t)) dependents.get(t).push(m);
    }
  }

  const remaining = new Set(models);
  const out = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter(
      (m) => dependents.get(m).every((d) => !remaining.has(d)),
    );
    if (ready.length === 0) {
      // A cycle in the schema. Emit whatever is left in a stable order
      // rather than looping forever; the transaction will roll back if
      // the order turns out to be wrong.
      out.push(...[...remaining].sort());
      break;
    }
    for (const m of ready) {
      out.push(m);
      remaining.delete(m);
    }
  }
  return out;
}

const schemaCache = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);
function modelBody(name) {
  const m = schemaCache.match(
    new RegExp(`^model\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, "m"),
  );
  return m ? m[1] : "";
}

const email = process.argv[2];
const confirmed = process.argv.includes("--confirm");

if (!email) {
  console.error("usage: npx tsx scripts/clear-demo-data.mjs <email> [--confirm]");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, settings: true },
  });
  if (!user) {
    console.error(`No user with email ${email} on ${target}. Nothing to do.`);
    process.exit(1);
  }

  const plan = [];
  for (const model of deleteOrder()) {
    const count = await prisma[model]?.count({ where: { userId: user.id } });
    if (typeof count === "number" && count > 0) plan.push({ model, count });
  }

  console.log(`\nDatabase : ${target}`);
  console.log(`Account  : ${user.email}  (${user.name})`);
  console.log(`Mode     : ${confirmed ? "DELETE" : "DRY RUN — nothing is written"}`);

  if (plan.length === 0) {
    console.log("\nNothing to clear — this account already has no seeded rows.");
    return;
  }

  console.log("\nWould delete:");
  let total = 0;
  for (const { model, count } of plan) {
    console.log(`  ${String(count).padStart(5)}  ${model}`);
    total += count;
  }
  console.log(`  ${String(total).padStart(5)}  TOTAL`);

  if (!confirmed) {
    console.log("\nDry run. Re-run with --confirm to actually delete.");
    return;
  }

  console.log("\nDeleting…");
  // Atomic on purpose, and children-before-parents. A partial clear is
  // worse than no clear: the account is left in a state neither the app
  // nor the operator expects. If any table refuses (an FK the order did
  // not account for), the whole thing rolls back and the account is
  // exactly as it was.
  const deleted = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const { model } of plan) {
      const { count } = await tx[model].deleteMany({ where: { userId: user.id } });
      out.push({ model, count });
    }
    return out;
  });
  for (const { model, count } of deleted) {
    console.log(`  deleted ${count} from ${model}`);
  }

  // Mark the account so the lazy seeders leave it alone.
  //
  // Without this the clear is a no-op: `ensureUserEnvelopesSeeded` and
  // `ensureUserAccountsSeeded` guard on "is the list empty?", and an
  // empty list is exactly the state a clear leaves behind — so the next
  // page read re-seeds the canonical demo vessels and balances. Measured
  // before this flag existed: 0 envelopes / 0 accounts after the clear,
  // 7 envelopes / Rent $800.00 after one read.
  //
  // Merged into whatever settings already exist rather than replacing
  // the blob, so theme/currency/locale survive.
  const current = JSON.parse(user.settings || "{}");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      settings: JSON.stringify({ ...current, demoDataCleared: true }),
    },
  });
  console.log("  set User.settings.demoDataCleared = true");

  console.log("\nDone. Login, password and onboarding answers were left intact.");
  console.log(
    "\nThis clear is now durable: the lazy seeders will not repopulate the\n" +
      "account, so it stays empty until real data is entered.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
