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
 *   1. Builds a reference database from the migration history on a
 *      SCRATCH server (PREFLIGHT_REFERENCE_URL).
 *   2. Opens the target, sets `default_transaction_read_only = on`, and
 *      reads it back to confirm the guard is in force.
 *   3. Compares columns, index DEFINITIONS and constraint DEFINITIONS
 *      for Debt / PaycheckRun / ClientError.
 *   4. Reports which migrations the target has recorded.
 *
 * THE TARGET IS NEVER WRITTEN TO
 * ------------------------------
 * Not a single write statement is issued against it: no CREATE
 * DATABASE, no DDL, and deliberately not even a probe write. The
 * earlier version created its reference database ON the target server
 * and "proved" read-only by firing a CREATE TABLE at it and expecting
 * a refusal. Both were wrong for a preflight aimed at production — the
 * first is a server-level write, the second fires a write at a live
 * financial database and would succeed on a replica or a
 * misconfigured server. Read-only is now confirmed by reading back the
 * server's own setting.
 *
 * It never prints the connection URL.
 *
 * Usage:
 *   PREFLIGHT_REFERENCE_URL=<scratch url> \
 *   PREFLIGHT_DATABASE_URL=<target url> \
 *   node scripts/preflight-schema.mjs --label compass
 *
 * In CI the "target" is disposable, so --allow-target-server-writes
 * permits the reference to be built on the same server.
 *
 * Exit 0 = compatible (the migration is a no-op or will create what is
 * missing). Exit 2 = INCOMPATIBLE or INCONCLUSIVE — do not deploy
 * without reconciling.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import pg from "pg";

const TARGET_URL = process.env.PREFLIGHT_DATABASE_URL || process.env.DATABASE_URL;
/**
 * Scratch server used to build the reference database. REQUIRED — the
 * target is never written to, not even to create a scratch database.
 */
const REFERENCE_URL = process.env.PREFLIGHT_REFERENCE_URL || null;
/** Opt-in for CI, where the "target" is itself disposable. */
const ALLOW_TARGET_SERVER = process.argv.includes("--allow-target-server-writes");
const LABEL = (() => {
  const i = process.argv.indexOf("--label");
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "target";
})();

if (!TARGET_URL) {
  console.error("PREFLIGHT_DATABASE_URL (or DATABASE_URL) is required.");
  process.exit(1);
}
if (!REFERENCE_URL && !ALLOW_TARGET_SERVER) {
  console.error(
    "PREFLIGHT_REFERENCE_URL is required.\n" +
      "The reference database is built on a scratch server so the target is\n" +
      "never written to. If it points at the SAME server as the target the\n" +
      "run is refused outright.\n\n" +
      "  PREFLIGHT_REFERENCE_URL=postgresql://…@localhost:5432/compass_dev \\\n" +
      "  PREFLIGHT_DATABASE_URL=<target url> \\\n" +
      "  node scripts/preflight-schema.mjs --label compass\n\n" +
      "Use --allow-target-server-writes only when the target is disposable\n" +
      "(CI).",
  );
  process.exit(1);
}
if (REFERENCE_URL && new URL(REFERENCE_URL).host === new URL(TARGET_URL).host) {
  console.error(
    "REFUSING to run: PREFLIGHT_REFERENCE_URL is on the same server as the\n" +
      "target, so building the reference database would write to it.\n" +
      "Pass a scratch server, or --allow-target-server-writes when the target\n" +
      "is itself disposable (CI).",
  );
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
  let target = null;
  try {
    // ── 1. Build the reference on a SCRATCH server ────────────────
    //
    // The previous version derived the reference database from
    // TARGET_URL and ran `CREATE DATABASE` / `DROP DATABASE` against
    // it. On a production target that is a server-level WRITE on
    // production — exactly what a preflight must never do. It also
    // required elevated privileges the check was supposed to work
    // without.
    //
    // The reference is now built on PREFLIGHT_REFERENCE_URL (a local
    // scratch server the operator controls). The target is only ever
    // opened for SELECTs.
    // With the CI opt-in and no explicit reference, fall back to the
    // target's own server — legal there because CI's target is itself
    // disposable. Refused above unless the flag is present.
    const refBase = REFERENCE_URL ?? TARGET_URL;
    const ru = new URL(refBase);
    const refAdminUrl = `${ru.protocol}//${ru.username}:${ru.password}@${ru.hostname}:${ru.port}/postgres`;
    const refUrl = refBase.replace(/\/[^/?]*(\?|$)/, `/${REF_DB}$1`);

    const admin = new pg.Client({ connectionString: refAdminUrl });
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

    // ── 2. Open the target read-only ──────────────────────────────
    target = new pg.Client({ connectionString: TARGET_URL });
    await target.connect();
    // Server-enforced read-only for the rest of this session. Any
    // INSERT/UPDATE/ALTER issued from here is refused by Postgres.
    await target.query("SET default_transaction_read_only = on");
    const ro = await target.query("SHOW default_transaction_read_only");
    console.log(`target: ${LABEL}`);
    console.log(
      `read-only session: ${ro.rows[0].default_transaction_read_only} (server-enforced)`,
    );
    if (ro.rows[0].default_transaction_read_only !== "on") {
      console.error(
        "FATAL: the read-only guard did not take effect; refusing to continue.",
      );
      process.exitCode = 2;
      return;
    }
    //
    // NOTE: this used to "prove" read-only by issuing
    // `CREATE TABLE _preflight_should_not_exist` and requiring it to
    // fail. That is an attempted WRITE against production. Even though
    // the server refuses it, firing a write at a live financial
    // database is not acceptable in a preflight, and on a replica or a
    // misconfigured server it could succeed. Read-only is now verified
    // by reading back the server's own setting, not by trying to
    // damage something.

    const got = await fingerprint(target);

    // ── 3. Migration history state ────────────────────────────────
    let applied = [];
    try {
      const m = await target.query(
        `SELECT migration_name, finished_at IS NOT NULL AS ok
           FROM "_prisma_migrations" ORDER BY migration_name`,
      );
      applied = m.rows;
    } catch (e) {
      // A missing _prisma_migrations table is a real, reportable state
      // (the database was db-pushed only). Any OTHER failure is a
      // connection/permission problem and must not be downgraded into
      // that same message.
      console.log(
        "\n_migration history could not be read:",
        e.message,
      );
      console.error(
        "\nUNABLE TO COMPLETE: could not read _prisma_migrations. This is not\n" +
          "the 'db-pushed only' case; treat the preflight as inconclusive.",
      );
      process.exitCode = 2;
      return;
    }
    if (applied.length) {
      console.log(`\nmigrations recorded: ${applied.length}`);
      for (const m of applied) console.log(`  - ${m.migration_name}${m.ok ? "" : "  (NOT finished)"}`);
      const unfinished = applied.filter((m) => !m.ok);
      if (unfinished.length) {
        console.error(`\nINCOMPATIBLE: ${unfinished.length} migration(s) did not finish.`);
        process.exitCode = 2;
        return;
      }
    }

    // Row counts are informational — they show this is a real database
    // and how much data the repair would be applied over.
    console.log("\nrow counts (read-only):");
    for (const t of TABLES) {
      const c = await target.query(`SELECT count(*)::int AS n FROM "${t}"`);
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
  } catch (err) {
    // A crash must NOT read as compatible. Report it and fail closed.
    console.error("\npreflight could not complete:", err);
    process.exitCode = 2;
  } finally {
    // Close the target if it is still open. Guarded so a double-end
    // cannot mask the real error above.
    if (target) {
      await target.end().catch(() => {});
      target = null;
    }
    // Drop the reference database we created — on the REFERENCE
    // server, never the target.
    for (const db of tmp) {
      try {
        const u = new URL(REFERENCE_URL ?? TARGET_URL);
        const adminUrl = `${u.protocol}//${u.username}:${u.password}@${u.hostname}:${u.port}/postgres`;
        const admin = new pg.Client({ connectionString: adminUrl });
        await admin.connect();
        await admin.query(`DROP DATABASE IF EXISTS ${db}`).catch(() => {});
        await admin.end().catch(() => {});
      } catch (e) {
        // Never let cleanup throw over the real result.
        console.error(`  could not clean up reference database ${db}: ${e.message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("preflight-schema crashed:", err);
  process.exitCode = 1;
});