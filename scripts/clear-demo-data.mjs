#!/usr/bin/env node
/**
 * clear-demo-data â€” strip the seeded demo persona from one account,
 * leaving the login itself intact.
 *
 * ## Why
 *
 * The canonical seed in `src/lib/mock-seed.ts` gives every new user a
 * fictional household: 7 vessels, ~6 transactions, bills, goals, debts,
 * a vault. That is right for a demo and wrong for a real account â€” the
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
function modelsWithUserId() {
  const schema = readFileSync(
    join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const out = [];
  for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const [, name, body] = m;
    if (/^\s*userId\s/m.test(body)) out.push(name);
  }
  // Never touch the account or its auth. This is a data reset.
  return out.filter((n) => !["User", "Session", "FinancialIdentity"].includes(n));
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
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    console.error(`No user with email ${email} on ${target}. Nothing to do.`);
    process.exit(1);
  }

  const plan = [];
  for (const model of modelsWithUserId()) {
    const count = await prisma[model]?.count({ where: { userId: user.id } });
    if (typeof count === "number" && count > 0) plan.push({ model, count });
  }

  console.log(`\nDatabase : ${target}`);
  console.log(`Account  : ${user.email}  (${user.name})`);
  console.log(`Mode     : ${confirmed ? "DELETE" : "DRY RUN â€” nothing is written"}`);

  if (plan.length === 0) {
    console.log("\nNothing to clear â€” this account already has no seeded rows.");
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

  console.log("\nDeletingâ€¦");
  for (const { model } of plan) {
    const { count } = await prisma[model].deleteMany({ where: { userId: user.id } });
    console.log(`  deleted ${count} from ${model}`);
  }
  console.log("\nDone. Login, password and onboarding answers were left intact.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
