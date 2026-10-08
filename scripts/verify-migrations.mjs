#!/usr/bin/env node
/**
 * verify-migrations — prove the migration history can build a database
 * from nothing, AND can be applied on top of a database that already
 * has the tables.
 *
 * WHY THIS EXISTS
 * ---------------
 * `Debt`, `PaycheckRun` and `ClientError` existed in the schema and in
 * every live database, but no migration had ever created them. They
 * came from `prisma db push`, which writes tables straight from the
 * datamodel and records nothing in migration history. A clean
 * `prisma migrate deploy` reported
 *
 *     All migrations have been successfully applied.   (exit 0)
 *
 * while producing a database missing three tables — including the
 * paycheck idempotency guard. CI could not see it because CI runs
 * `prisma db push`, the very command that hides it.
 *
 * WHAT THIS CHECKS
 * ----------------
 * Two paths, each on its own disposable database:
 *
 *   FRESH    empty DB -> `migrate deploy`. Asserts every table,
 *            index, unique index, PK and FK the schema declares, then
 *            asserts the resulting schema has ZERO drift from
 *            prisma/schema.prisma.
 *
 *   EXISTING the shape production actually has: the historical
 *            migrations applied, then `db push` for the three tables
 *            that only ever existed that way. Then the full migration
 *            set is applied on top. Asserts it does not abort, that
 *            applying it twice is a no-op, that the resulting
 *            structure is byte-identical to the FRESH path, and that
 *            there is still zero drift.
 *
 * It also asserts the tables are NOT empty of structure — a passing
 * "table exists" check that ignores the unique idempotency index would
 * be exactly the class of check that let this through.
 *
 * Usage:
 *   node scripts/verify-migrations.mjs
 *   DATABASE_URL=postgresql://... node scripts/verify-migrations.mjs
 *
 * Exit 0 = history is sound. Non-zero = it is not.
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
const FRESH_DB = "compass_mig_fresh";
const EXISTING_DB = "compass_mig_existing";

let pass = 0;
let miss = 0;
const failures = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  if (ok) pass++;
  else {
    miss++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? "  — " + detail : ""}`);
}

const adminUrl = (() => {
  const u = new URL(BASE_URL);
  u.pathname = "/postgres";
  return u.toString();
})();

/**
 * The Prisma CLI entry, invoked through `node` directly.
 *
 * Going via `npx` needs `shell: true` on Windows (Node >= 20.12 refuses
 * to spawn a `.cmd` without one and fails with EINVAL), and shell:true
 * then emits DEP0190 because args are concatenated unescaped. Running
 * the local CLI's JS entry avoids both, and is more deterministic than
 * whatever `npx` would resolve.
 */
const PRISMA_CLI = join(process.cwd(), "node_modules", "prisma", "build", "index.js");

/** Run the Prisma CLI with DATABASE_URL overridden. Never throws. */
function prisma(args, databaseUrl) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

/** Drift between a live database and the datamodel. Empty == sound. */
function driftFor(databaseUrl) {
  const r = prisma(
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
    databaseUrl,
  );
  if (r.status !== 0) return { error: (r.stderr || r.stdout || "").trim() };
  const out = (r.stdout || "").trim();
  // Prisma prints this exact sentinel when there IS NO drift. Treating
  // it as drift would fail every healthy database — the inverse of the
  // bug this script exists to catch.
  if (out === "" || /This is an empty migration/i.test(out)) {
    return { sql: "" };
  }
  return { sql: out };
}

/** Structure fingerprint for the three repaired tables. */
async function structureOf(client) {
  const tables = ["Debt", "PaycheckRun", "ClientError"];
  const out = {};
  for (const t of tables) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position`,
      [t],
    );
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname='public' AND tablename=$1 ORDER BY indexname`,
      [t],
    );
    const cons = await client.query(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = (SELECT c.oid FROM pg_class c
                           JOIN pg_namespace n ON n.oid = c.relnamespace
                          WHERE c.relname = $1 AND n.nspname='public')
        ORDER BY conname`,
      [t],
    );
    out[t] = {
      columns: cols.rows.map((r) => `${r.column_name}:${r.data_type}:${r.is_nullable}:${r.column_default ?? ""}`),
      indexes: idx.rows.map((r) => r.indexname),
      constraints: cons.rows.map((r) => `${r.contype}:${r.conname}`),
    };
  }
  return out;
}

/** Tables in public schema, excluding Prisma's bookkeeping. */
async function tableNames(client) {
  const r = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name`,
  );
  return r.rows.map((x) => x.table_name);
}

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  for (const db of [FRESH_DB, EXISTING_DB]) {
    await admin.query(`DROP DATABASE IF EXISTS ${db}`);
    await admin.query(`CREATE DATABASE ${db}`);
  }
  await admin.end();

  const freshUrl = BASE_URL.replace(/\/[^/?]*(\?|$)/, `/${FRESH_DB}$1`);
  const existingUrl = BASE_URL.replace(/\/[^/?]*(\?|$)/, `/${EXISTING_DB}$1`);

  let freshStruct = null;
  let existingStruct = null;

  // ── Path A: FRESH ───────────────────────────────────────────────
  console.log(`\n--- FRESH: empty database -> migrate deploy ---`);
  let r = prisma(["migrate", "deploy"], freshUrl);
  check("fresh: migrate deploy exits 0", r.status === 0, (r.stderr || "").trim().slice(0, 400));

  {
    const c = new pg.Client({ connectionString: freshUrl });
    await c.connect();
    const tables = await tableNames(c);
    for (const t of ["Debt", "PaycheckRun", "ClientError"]) {
      check(`fresh: table ${t} created by migrations`, tables.includes(t));
    }
    freshStruct = await structureOf(c);

    // The unique index IS the paycheck idempotency guard. Asserting the
    // table alone would repeat the mistake this script exists to catch.
    check(
      "fresh: PaycheckRun has the unique idempotency index",
      freshStruct.PaycheckRun.indexes.includes("PaycheckRun_userId_periodKey_paycheckCents_key"),
    );
    check(
      "fresh: PaycheckRun has 3 indexes (pkey + unique + userId/ranAt)",
      freshStruct.PaycheckRun.indexes.length === 3,
      `got ${freshStruct.PaycheckRun.indexes.length}`,
    );
    check(
      "fresh: ClientError has the dedup unique index",
      freshStruct.ClientError.indexes.includes("ClientError_digest_url_source_key"),
    );
    check("fresh: ClientError has 6 indexes", freshStruct.ClientError.indexes.length === 6, `got ${freshStruct.ClientError.indexes.length}`);
    check("fresh: Debt has 5 indexes", freshStruct.Debt.indexes.length === 5, `got ${freshStruct.Debt.indexes.length}`);

    for (const [t, s] of Object.entries(freshStruct)) {
      const pks = s.constraints.filter((x) => x.startsWith("p:"));
      const fks = s.constraints.filter((x) => x.startsWith("f:"));
      check(`fresh: ${t} has a primary key`, pks.length === 1, `got ${pks.length}`);
      const wantFk = t === "ClientError" ? 0 : 1;
      check(`fresh: ${t} has ${wantFk} foreign key(s)`, fks.length === wantFk, `got ${fks.length}`);
    }
    await c.end();
  }

  let d = driftFor(freshUrl);
  check("fresh: no schema drift vs prisma/schema.prisma", !d.error && !d.sql, d.error || (d.sql ? d.sql.slice(0, 300) : "clean"));

  // ── Path B: EXISTING (db-pushed) ────────────────────────────────
  console.log(`\n--- EXISTING: historical migrations + db push -> full deploy ---`);

  // Reproduce production: apply only the migrations that predate the
  // baseline, then db push the rest (which is how those tables were
  // really created). `migrate deploy` takes no env override for the
  // migrations path, so point Prisma at a trimmed directory via a
  // temporary config file.
  const tmpMigrations = mkdtempSync(join(tmpdir(), "compass-mig-"));
  const tmpConfig = join(process.cwd(), "prisma.migverify.config.ts");
  for (const entry of readdirSync(MIGRATIONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    cpSync(join(MIGRATIONS_DIR, entry.name), join(tmpMigrations, entry.name), { recursive: true });
  }
  rmSync(join(tmpMigrations, "20261008120000_baseline_debt_paycheckrun_clienterror"), {
    recursive: true,
    force: true,
  });
  writeFileSync(
    tmpConfig,
    `import "dotenv/config";\n` +
      `import path from "node:path";\n` +
      `import { defineConfig } from "prisma/config";\n` +
      `export default defineConfig({\n` +
      `  schema: path.join("prisma", "schema.prisma"),\n` +
      `  migrations: { path: ${JSON.stringify(tmpMigrations.replace(/\\/g, "/"))} },\n` +
      `  datasource: { url: process.env.DATABASE_URL },\n` +
      `});\n`,
  );

  r = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "deploy", "--config", tmpConfig], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: existingUrl },
    encoding: "utf8",
  });
  check("existing: pre-baseline migrations apply", r.status === 0, (r.stderr || "").trim().slice(0, 300));

  // Prisma 7 removed `--skip-generate` from `db push`; passing it is a
  // hard usage error, not a warning.
  r = prisma(["db", "push"], existingUrl);
  check(
    "existing: db push recreates the three tables (historical state)",
    r.status === 0,
    `${(r.stderr || "").trim()} ${(r.stdout || "").trim()}`.trim().slice(0, 600),
  );

  {
    const c = new pg.Client({ connectionString: existingUrl });
    await c.connect();
    const tables = await tableNames(c);
    check("existing: Debt present before the new migration runs", tables.includes("Debt"));
    await c.end();
  }

  r = prisma(["migrate", "deploy"], existingUrl);
  check("existing: full migrate deploy on top does NOT abort", r.status === 0, (r.stderr || r.stdout || "").trim().slice(0, 500));

  // Idempotency: applying the whole set again must be a no-op.
  r = prisma(["migrate", "deploy"], existingUrl);
  check("existing: re-running migrate deploy is a no-op", r.status === 0, (r.stderr || "").trim().slice(0, 300));

  {
    const c = new pg.Client({ connectionString: existingUrl });
    await c.connect();
    existingStruct = await structureOf(c);
    await c.end();
  }

  check(
    "existing: structure is identical to the fresh build",
    JSON.stringify(existingStruct) === JSON.stringify(freshStruct),
    "db-pushed tables diverged from what migrations produce",
  );

  d = driftFor(existingUrl);
  check("existing: no schema drift vs prisma/schema.prisma", !d.error && !d.sql, d.error || (d.sql ? d.sql.slice(0, 300) : "clean"));

  // ── Cleanup ─────────────────────────────────────────────────────
  rmSync(tmpMigrations, { recursive: true, force: true });
  rmSync(tmpConfig, { force: true });
  const cleanup = new pg.Client({ connectionString: adminUrl });
  await cleanup.connect();
  for (const db of [FRESH_DB, EXISTING_DB]) {
    await cleanup.query(`DROP DATABASE IF EXISTS ${db}`).catch(() => {});
  }
  await cleanup.end();

  console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} — ${pass} passed, ${miss} missed`);
  if (miss > 0) {
    console.log("\nFailed checks:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  // Set exitCode rather than process.exit: the pg pool may still hold a
  // socket, and a forced exit can abort mid-teardown.
  process.exitCode = miss === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error("verify-migrations crashed:", err);
  process.exitCode = 1;
});