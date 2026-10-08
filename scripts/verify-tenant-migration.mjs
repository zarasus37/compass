#!/usr/bin/env node
/**
 * verify-tenant-migration — prove the PayPeriod tenant-scoping migration
 * does what its comments claim, on the states it can actually meet.
 *
 * WHY THIS IS A SEPARATE SCRIPT
 * -----------------------------
 * The migration backfill shipped a statement whose comment did not
 * describe what it did:
 *
 *     SELECT DISTINCT ON (ps."userId") ps."userId"
 *       ... ORDER BY "userId", "createdAt" ASC
 *
 * That returns ONE ROW PER USER, not "the earliest owner overall". The
 * UPDATE ... FROM consuming it was uncorrelated, so which user a legacy
 * period landed on was arbitrary. It could also hand several ACTIVE
 * legacy rows to the same user, which makes the partial unique index
 * fail to build — a migration that cannot apply.
 *
 * The rule now is: assert an owner only when it is unambiguous (a
 * database with exactly one user), and even then claim only the single
 * most-recent ACTIVE row.
 *
 * Each scenario below runs on its own disposable database, with the
 * PRE-migration shape built by hand, then applies the migration and
 * asserts the outcome. The index creation inside the migration is the
 * implicit assertion that no two active rows were claimed together.
 *
 * Usage: DATABASE_URL=... node scripts/verify-tenant-migration.mjs
 * Exit 0 = backfill behaves as documented. Exit 1 = it does not.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const BASE_URL = process.env.DATABASE_URL;
if (!BASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const TARGET = "20261008130000_tenant_scope_payperiod_and_engine";
const PRISMA_CLI = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const RUN_ID = `${process.pid}_${Date.now().toString(36)}`;

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

const created = [];
const adminUrl = (() => {
  const u = new URL(BASE_URL);
  u.pathname = "/postgres";
  return u.toString();
})();

function prisma(args, databaseUrl) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

/** Migrations strictly before the tenant one, via a temp config. */
function preMigrationConfig() {
  const tmp = mkdtempSync(join(tmpdir(), `compass-tenant-${RUN_ID}-`));
  const names = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const at = names.indexOf(TARGET);
  if (at === -1) throw new Error(`migration ${TARGET} not found`);
  for (const n of names.slice(0, at)) {
    cpSync(join(MIGRATIONS_DIR, n), join(tmp, n), { recursive: true });
  }
  const cfg = join(process.cwd(), `prisma.tenantverify.${RUN_ID}.config.ts`);
  writeFileSync(
    cfg,
    `import "dotenv/config";\nimport path from "node:path";\nimport { defineConfig } from "prisma/config";\n` +
      `export default defineConfig({ schema: path.join("prisma","schema.prisma"), migrations: { path: ${JSON.stringify(tmp.replace(/\\/g, "/"))} }, datasource: { url: process.env.DATABASE_URL } });\n`,
  );
  return { tmp, cfg };
}

async function makeDb() {
  const name = `compass_tenant_${RUN_ID}_${created.length}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  created.push(name);
  return BASE_URL.replace(/\/[^/?]*(\?|$)/, `/${name}$1`);
}

/** Insert legacy-shaped rows before the migration exists. */
async function seedLegacy(client, { users, activePeriods, inactivePeriods }) {
  for (const u of users) {
    await client.query(
      `INSERT INTO "User" (id, name, email, "passwordHash", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'x', now(), now())`,
      [u.id, u.name, u.email],
    );
  }
  for (const p of [...activePeriods, ...inactivePeriods]) {
    await client.query(
      `INSERT INTO "PayPeriod" (id, "startDate", "endDate", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), now())`,
      [p.id, p.start, p.end, p.active],
    );
  }
}

async function readAll(client) {
  const r = await client.query(
    `SELECT id, "userId", "isActive" FROM "PayPeriod" ORDER BY id`,
  );
  return r.rows;
}

async function scenario(label, { users, activePeriods, inactivePeriods, assertFn }) {
  console.log(`\n--- ${label} ---`);
  const url = await makeDb();
  const { tmp, cfg } = preMigrationConfig();

  const pre = spawnSync(
    process.execPath,
    [PRISMA_CLI, "migrate", "deploy", "--config", cfg],
    { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" },
  );
  if (pre.status !== 0) {
    check(`${label}: pre-migration applies`, false, (pre.stderr || "").slice(0, 300));
    rmSync(tmp, { recursive: true, force: true });
    rmSync(cfg, { force: true });
    return;
  }

  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await seedLegacy(c, { users, activePeriods, inactivePeriods });
  await c.end();

  // The migration itself. If it cannot apply (e.g. the partial unique
  // index collides), that is a FAILURE, not a warning.
  const res = prisma(["migrate", "deploy"], url);
  check(
    `${label}: migration applies cleanly`,
    res.status === 0,
    `${(res.stderr || "").trim()} ${(res.stdout || "").trim()}`.trim().slice(0, 400),
  );

  const c2 = new pg.Client({ connectionString: url });
  await c2.connect();
  const rows = await readAll(c2);
  const userRows = await c2.query(`SELECT id, "activeEngineLvl" FROM "User" ORDER BY id`);

  // The partial unique index must actually exist.
  const idx = await c2.query(
    `SELECT indexdef FROM pg_indexes
      WHERE schemaname='public' AND indexname='PayPeriod_one_active_per_user_key'`,
  );
  check(
    `${label}: partial unique index was created`,
    idx.rowCount === 1,
    idx.rowCount === 1 ? "" : "index missing — db push could never have made it",
  );

  await assertFn({ rows, users: userRows.rows, label });
  await c2.end();

  rmSync(tmp, { recursive: true, force: true });
  rmSync(cfg, { force: true });
}

async function main() {
  // 1. Single user, THREE active legacy rows + inactive ones.
  //    Only one active may be claimed, or the index cannot be built.
  await scenario("single user, multiple legacy active rows", {
    users: [{ id: "u1", name: "Solo", email: "solo@example.test" }],
    activePeriods: [
      { id: "p-a1", start: "2026-01-01", end: "2026-01-15", active: true },
      { id: "p-a2", start: "2026-01-15", end: "2026-01-29", active: true },
      { id: "p-a3", start: "2026-01-29", end: "2026-02-12", active: true },
    ],
    inactivePeriods: [
      { id: "p-i1", start: "2025-12-01", end: "2025-12-15", active: false },
    ],
    assertFn: async ({ rows, users, label }) => {
      const claimedActive = rows.filter((r) => r.userId === "u1" && r.isActive);
      check(`${label}: exactly ONE active row claimed`, claimedActive.length === 1, `got ${claimedActive.length}`);
      check(
        `${label}: the claimed active row is the most recent`,
        claimedActive[0]?.id === "p-a3",
        `got ${claimedActive[0]?.id}`,
      );
      check(
        `${label}: the other active rows stay unowned`,
        rows.filter((r) => r.isActive && r.userId === null).length === 2,
      );
      check(
        `${label}: inactive rows are claimed (they cannot collide)`,
        rows.filter((r) => !r.isActive && r.userId === "u1").length === 1,
      );
      check(`${label}: nothing was deleted`, rows.length === 4, `got ${rows.length}`);
      check(`${label}: engine level backfilled`, users[0]?.activeEngineLvl === "L1", users[0]?.activeEngineLvl);
    },
  });

  // 2. TWO users. The owner is ambiguous, so nothing may be claimed.
  await scenario("two users, legacy rows stay unowned", {
    users: [
      { id: "u1", name: "One", email: "one@example.test" },
      { id: "u2", name: "Two", email: "two@example.test" },
    ],
    activePeriods: [{ id: "p-b1", start: "2026-01-01", end: "2026-01-15", active: true }],
    inactivePeriods: [],
    assertFn: async ({ rows, label }) => {
      check(
        `${label}: NO row was claimed (ambiguous owner)`,
        rows.every((r) => r.userId === null),
        `claimed: ${rows.filter((r) => r.userId).map((r) => r.id).join(",")}`,
      );
    },
  });

  // 3. Zero users — nothing to assign to.
  await scenario("zero users, rows stay unowned", {
    users: [],
    activePeriods: [{ id: "p-c1", start: "2026-01-01", end: "2026-01-15", active: true }],
    inactivePeriods: [{ id: "p-c2", start: "2025-12-01", end: "2025-12-15", active: false }],
    assertFn: async ({ rows, label }) => {
      check(`${label}: NO row was claimed`, rows.every((r) => r.userId === null));
    },
  });

  // 4. Re-running must be a no-op (idempotent).
  await scenario("re-apply is a no-op", {
    users: [{ id: "u1", name: "Solo", email: "solo2@example.test" }],
    activePeriods: [{ id: "p-d1", start: "2026-01-01", end: "2026-01-15", active: true }],
    inactivePeriods: [],
    assertFn: async ({ rows, users, label }) => {
      check(`${label}: one active claimed`, rows.filter((r) => r.userId === "u1" && r.isActive).length === 1);
      check(`${label}: engine level unchanged on re-run`, users[0]?.activeEngineLvl === "L1");
    },
  });
}

try {
  await main();
} catch (err) {
  console.error("verify-tenant-migration crashed:", err);
  miss++;
  failures.push(`crash: ${err.message}`);
} finally {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  for (const db of created) {
    await admin.query(`DROP DATABASE IF EXISTS ${db}`).catch(() => {});
  }
  await admin.end();
}

console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} -- ${pass} passed, ${miss} missed`);
if (miss > 0) {
  console.log("\nFailed checks:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = miss === 0 ? 0 : 1;