#!/usr/bin/env node
/**
 * preflight-schema — READ-ONLY compatibility check for the baseline
 * migration, for running against a real deployment before shipping it.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * The baseline migration is written with IF NOT EXISTS. That makes it
 * safe to apply against a database whose tables already exist — but it
 * means a table, index or constraint that already exists is SKIPPED,
 * not verified. If the target's existing `Debt` were, say, missing the
 * `aprBps` column or carrying a different unique index, the migration
 * would report success and leave the database wrong.
 *
 * `scripts/verify-migrations.mjs` proves the history is correct on
 * disposable databases. This script answers the separate question:
 * "is THIS deployment's current shape compatible with the repair?"
 *
 * WHAT IT DOES
 * ------------
 *   1. Builds a reference database locally from the migration history.
 *   2. Connects to the target and IMMEDIATELY sets
 *      `default_transaction_read_only = on`, so a write is refused by
 *      Postgres even if this script tried one. Read-only is enforced by
 *      the server, not merely intended here.
 *   3. Compares columns, index DEFINITIONS and constraint DEFINITIONS
 *      for Debt / PaycheckRun / ClientError.
 *   4. Reports which migrations the target has recorded.
 *
 * It never writes to the target. It never prints the connection URL.
 *
 * Usage:
 *   DATABASE_URL=<target> node scripts/preflight-schema.mjs --label compass
 *
 * Exit 0 = compatible (the migration is a no-op or will create what is
 * missing). Exit 2 = INCOMPATIBLE — do not deploy without reconciling.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import pg from "pg";

const TARGET_URL = process.env.PREFLIGHT_DATABASE_URL || process.env.DATABASE_URL;
const LABEL = (() => {
  const i = process.argv.indexOf("--label");
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "target";
})();

if (!TARGET_URL) {
  console.error("PREFLIGHT_DATABASE_URL (or DATABASE_URL) is required.");
  process.exit(1);
}

const TABLES = ["Debt", "PaycheckRun", "ClientError"];
const PRISMA_CLI = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const RUN_ID = `${process.pid}_${Date.now().toString(36)}`;
const REF_DB = `compass_preflight_ref_${RUN_ID}`;

function prisma(args, databaseUrl) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

/** Columns + index definitions + constraint definitions. */
async function fingerprint(client) {
  const out = {};
  for (const t of TABLES) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position`,
      [t],
    );
    const idx = await client.query(
      `SELECT indexname, indexdef FROM pg_indexes
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
      present: cols.rowCount > 0,
      columns: cols.rows.map((r) => `${r.column_name}:${r.data_type}:${r.is_nullable}:${r.column_default ?? ""}`),
      indexes: idx.rows.map((r) => `${r.indexname} => ${r.indexdef}`),
      constraints: cons.rows.map((r) => `${r.contype}:${r.conname} => ${r.def}`),
    };
  }
  return out;
}

/** Field-level diff between two fingerprints for one table. */
function diffTable(ref, got) {
  const problems = [];
  if (!got.present) return ["table does not exist (migration would create it — fine)"];
  const cmp = (label, a, b) => {
    const as = new Set(a);
    const bs = new Set(b);
    for (const x of a) if (!bs.has(x)) problems.push(`${label} missing: ${x}`);
    for (const x of b) if (!as.has(x)) problems.push(`${label} unexpected: ${x}`);
  };
  cmp("column", ref.columns, got.columns);
  cmp("index", ref.indexes, got.indexes);
  cmp("constraint", ref.constraints, got.constraints);
  return problems;
}

async function main() {
  const tmp = [];
  try {
    // ── 1. Build the reference from migration history ──────────────
    const u = new URL(TARGET_URL);
    const adminUrl = `${u.protocol}//${u.username}:${u.password}@${u.hostname}:${u.port}/postgres`;
    const refUrl = TARGET_URL.replace(/\/[^/?]*(\?|$)/, `/${REF_DB}$1`);

    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${REF_DB}`);
    tmp.push(REF_DB);
    await admin.end();

    const r = prisma(["migrate", "deploy"], refUrl);
    if (r.status !== 0) {
      console.error("could not build the reference database:");
      console.error(`${(r.stderr || r.stdout || "").trim()}`);
      process.exitCode = 1;
      return;
    }

    const ref = new pg.Client({ connectionString: refUrl });
    await ref.connect();
    const refPrint = await fingerprint(ref);
    await ref.end();

    // ── 2. Connect to the target and lock it read-only ────────────
    const tgt = new pg.Client({ connectionString: TARGET_URL });
    await tgt.connect();
    // Server-enforced read-only for the rest of this session. Any
    // INSERT/UPDATE/ALTER issued from here is refused by Postgres.
    await tgt.query("SET default_transaction_read_only = on");
    const ro = await tgt.query("SHOW default_transaction_read_only");
    console.log(`target: ${LABEL}`);
    console.log(`read-only session: ${ro.rows[0].default_transaction_read_only} (server-enforced)`);

    // Prove it, rather than assert it.
    try {
      await tgt.query(`CREATE TABLE _preflight_should_not_exist (id int)`);
      console.error("FATAL: target accepted a write; this preflight is not read-only.");
      process.exitCode = 2;
      await tgt.end();
      return;
    } catch {
      console.log("read-only verified: a write was correctly refused by the server");
    }

    const got = await fingerprint(tgt);

    // ── 3. Migration history state ────────────────────────────────
    let applied = [];
    try {
      const m = await tgt.query(
        `SELECT migration_name, finished_at IS NOT NULL AS ok
           FROM "_prisma_migrations" ORDER BY migration_name`,
      );
      applied = m.rows;
    } catch {
      console.log("\n_migration history: NO _prisma_migrations table — this database was db-pushed only.");
    }
    if (applied.length) {
      console.log(`\nmigrations recorded: ${applied.length}`);
      for (const m of applied) console.log(`  - ${m.migration_name}${m.ok ? "" : "  (NOT finished)"}`);
      const unfinished = applied.filter((m) => !m.ok);
      if (unfinished.length) {
        console.error(`\nINCOMPATIBLE: ${unfinished.length} migration(s) did not finish.`);
        await tgt.end();
        process.exitCode = 2;
        return;
      }
    }

    // Row counts are informational — they show this is a real database
    // and how much data the repair would be applied over.
    console.log("\nrow counts (read-only):");
    for (const t of TABLES) {
      const c = await tgt.query(`SELECT count(*)::int AS n FROM "${t}"`);
      console.log(`  ${t.padEnd(14)} ${c.rows[0].n}`);
    }

    // ── 4. Compare against the migration-built reference ──────────
    console.log("\ncomparison vs migrations-built reference:");
    let incompatible = false;
    for (const t of TABLES) {
      const problems = diffTable(refPrint[t], got[t]);
      if (problems.length === 0) {
        console.log(`  [OK] ${t} matches the reference exactly`);
      } else if (!got[t].present) {
        // Absent is not a mismatch: the migration will create it.
        console.log(`  [OK] ${t} absent — the migration will create it`);
      } else {
        // Present but different. IF NOT EXISTS would SKIP it, so this
        // is exactly the silent-failure case the preflight exists for.
        console.log(`  [INCOMPATIBLE] ${t} differs; IF NOT EXISTS would SKIP it:`);
        for (const p of problems) console.log(`      - ${p}`);
        incompatible = true;
      }
    }

    await tgt.end();

    if (incompatible) {
      console.error(
        "\nVERDICT: INCOMPATIBLE. Deploying would report success and leave the" +
          " schema wrong. Reconcile manually before deploying.",
      );
      process.exitCode = 2;
      return;
    }
    console.log(
      "\nVERDICT: COMPATIBLE. The migration is a verified no-op on this" +
        " database (or will create what is missing).",
    );
    process.exitCode = 0;
  } finally {
    // Always drop the reference database we created.
    const u = new URL(TARGET_URL);
    const adminUrl = `${u.protocol}//${u.username}:${u.password}@${u.hostname}:${u.port}/postgres`;
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    for (const db of tmp) {
      await admin.query(`DROP DATABASE IF EXISTS ${db}`).catch(() => {});
    }
    await admin.end();
  }
}

main().catch((err) => {
  console.error("preflight-schema crashed:", err);
  process.exitCode = 1;
});