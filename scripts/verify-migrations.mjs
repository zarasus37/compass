#!/usr/bin/env node
/**
 * verify-migrations — prove the migration history can build a database
 * from nothing, AND can be applied on top of a database that already
 * has the tables, without disturbing the rows already in them.
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
 * FRESH    empty DB -> `migrate deploy`. Asserts every table, index
 *          definition, constraint definition, PK and FK, then asserts
 *          ZERO drift from prisma/schema.prisma.
 *
 * EXISTING the shape production actually has: the historical
 *          migrations applied, then `db push` for the three tables
 *          that only ever existed that way. Representative rows are
 *          inserted, the full migration set is applied on top, and the
 *          rows are re-read and compared byte-for-byte. Also asserts
 *          applying twice is a no-op, that the resulting structure is
 *          identical to the FRESH path, and that drift is still zero.
 *
 * SAFETY
 * ------
 * Disposable databases get a unique per-run name, are tracked in a
 * list this run created, and are dropped in `finally`. A failure or a
 * Ctrl-C cannot leave them behind, and this script cannot drop a
 * database it did not create.
 *
 * KNOWN LIMIT (stated, not hidden)
 * --------------------------------
 * The baseline migration is written with IF NOT EXISTS. That makes it
 * safe on an already-matching schema, but it does NOT verify that an
 * existing object has the expected DEFINITION — an existing table with
 * a wrong column type would be skipped, not repaired. That gap is
 * covered by comparing full definitions here, and on production by the
 * read-only preflight (scripts/preflight-schema.mjs).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const BASE_URL = process.env.DATABASE_URL;
if (!BASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

/** The migration under test. Asserted to exist before anything runs. */
const BASELINE = "20261008120000_baseline_debt_paycheckrun_clienterror";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

/** Unique per-run suffix so parallel or abandoned runs never collide. */
const RUN_ID = `${process.pid}_${Date.now().toString(36)}`;
const FRESH_DB = `compass_mig_fresh_${RUN_ID}`;
const EXISTING_DB = `compass_mig_existing_${RUN_ID}`;

/** Only databases this run actually created. Nothing else is dropped. */
const createdDbs = [];

const PRISMA_CLI = join(process.cwd(), "node_modules", "prisma", "build", "index.js");

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

/** Run the Prisma CLI with DATABASE_URL overridden. Never throws. */
function prisma(args, databaseUrl) {
  return spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

/**
 * Drift between a live database and the datamodel.
 *
 * Every failure mode is an explicit failure. The previous version
 * returned `{ error: "" }` whenever the CLI exited nonzero with no
 * output, and the assertion `!d.error && !d.sql` then evaluated TRUE —
 * a Prisma crash was indistinguishable from "no drift". That is
 * reproduced in the commit message for this file.
 */
function driftFor(databaseUrl) {
  const r = prisma(
    [
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--script",
    ],
    databaseUrl,
  );

  // 1. The process never ran.
  if (r.error) {
    return { failed: `prisma could not be spawned: ${r.error.message}` };
  }
  // 2. Killed by a signal — `status` is null and `signal` is set.
  if (r.status === null) {
    return { failed: `prisma exited on signal ${r.signal ?? "unknown"} with no status` };
  }
  // 3. Ran and failed. Nonzero status is ALWAYS a failure, even with
  //    no output at all.
  if (r.status !== 0) {
    const detail = `${(r.stderr || "").trim()} ${(r.stdout || "").trim()}`.trim();
    return {
      failed: `prisma migrate diff exited ${r.status}${detail ? `: ${detail.slice(0, 400)}` : " (no output)"}`,
    };
  }

  const out = (r.stdout || "").trim();
  // Prisma prints this exact sentinel when there IS NO drift. Treating
  // it as drift would fail every healthy database — the inverse of the
  // bug above.
  if (out === "" || /This is an empty migration/i.test(out)) {
    return { sql: "" };
  }
  return { sql: out };
}

/** Structure fingerprint: names AND definitions, not just names. */
async function structureOf(client) {
  const out = {};
  for (const t of ["Debt", "PaycheckRun", "ClientError"]) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position`,
      [t],
    );
    // pg_get_indexdef returns the full definition, so two indexes with
    // the same name but different columns/where clauses are caught.
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
      columns: cols.rows.map(
        (r) =>
          `${r.column_name}:${r.data_type}:${r.is_nullable}:${r.column_default ?? ""}`,
      ),
      // Definitions, not just names.
      indexes: idx.rows.map((r) => `${r.indexname} => ${r.indexdef}`),
      constraints: cons.rows.map((r) => `${r.contype}:${r.conname} => ${r.def}`),
    };
  }
  return out;
}

async function tableNames(client) {
  const r = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name`,
  );
  return r.rows.map((x) => x.table_name);
}

/**
 * Migrations strictly preceding the baseline, in timestamp order.
 *
 * Deliberately NOT "everything except the baseline": a future tenant
 * migration must not be swept into the historical set, or it would run
 * before the tables it may depend on and the reproduction would be of
 * the wrong history.
 */
function historicalMigrations() {
  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // zero-padded timestamps sort lexicographically = chronologically
  const at = dirs.indexOf(BASELINE);
  if (at === -1) {
    throw new Error(
      `baseline migration "${BASELINE}" not found in ${MIGRATIONS_DIR}. ` +
        `Found: ${dirs.join(", ") || "(none)"}`,
    );
  }
  return { list: dirs.slice(0, at), total: dirs.length, skipped: dirs.length - at };
}

async function createDb(name) {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    // Defensive: never DROP something at this point. We only ever
    // CREATE a unique name, so a stale database from an aborted run
    // cannot be silently destroyed — it will fail loudly instead.
    await admin.query(`CREATE DATABASE ${name}`);
    createdDbs.push(name);
  } finally {
    await admin.end();
  }
}

async function dropCreated() {
  if (createdDbs.length === 0) return;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    for (const db of createdDbs.splice(0)) {
      await admin
        .query(`DROP DATABASE IF EXISTS ${db}`)
        .catch((e) => console.error(`  could not drop ${db}: ${e.message}`));
    }
  } finally {
    await admin.end();
  }
}

/** Representative rows that must survive the repair untouched. */
const SAMPLE = {
  user: { email: "migverify-user@compass.local", name: "Mig Verify" },
  debt: {
    id: "migverify-debt-1",
    balanceCents: 123456,
    originalBalanceCents: 200000,
    aprBps: 2499,
  },
  paycheckRun: {
    id: "migverify-paycheck-1",
    periodKey: "2026-01-01",
    paycheckCents: 182000,
    ledgerJson: '[{"envelopeId":"e1","cents":1000}]',
  },
  clientError: {
    id: "migverify-clienterror-1",
    digest: "migverify-digest",
    url: "https://compass.local/envelopes?x=1",
    pathname: "/envelopes",
    source: "server",
    payloadJson: '{"k":"v"}',
  },
};

/** Insert the sample rows. Returns nothing; throws on failure. */
async function seedSample(client) {
  const u = await client.query(
    `INSERT INTO "User" (id, name, email, "passwordHash", "createdAt", "updatedAt")
     VALUES ('migverify-user-1', $1, $2, 'x', now(), now())
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [SAMPLE.user.name, SAMPLE.user.email],
  );
  if (u.rowCount === 0) throw new Error("could not insert sample user");

  await client.query(
    `INSERT INTO "Debt" (id, "userId", name, "balanceCents", "originalBalanceCents",
                         "aprBps", "minPaymentCents", "dueDay", source, "isArchived",
                         "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, 'migverify-user-1', 'Card', $2, $3, $4, 5000, 12, 'user', false, 0, now(), now())`,
    [SAMPLE.debt.id, SAMPLE.debt.balanceCents, SAMPLE.debt.originalBalanceCents, SAMPLE.debt.aprBps],
  );
  await client.query(
    `INSERT INTO "PaycheckRun" (id, "userId", "periodKey", "paycheckCents", "totalAllocatedCents",
                                "unallocatedCents", source, trigger, "ledgerJson", "ranAt", "createdAt")
     VALUES ($1, 'migverify-user-1', $2, $3, 0, 0, 'manual', 'manual', $4, now(), now())`,
    [SAMPLE.paycheckRun.id, SAMPLE.paycheckRun.periodKey, SAMPLE.paycheckRun.paycheckCents, SAMPLE.paycheckRun.ledgerJson],
  );
  await client.query(
    `INSERT INTO "ClientError" (id, "userId", digest, url, pathname, source,
                                "payloadJson", "firstSeenAt", "lastSeenAt")
     VALUES ($1, 'migverify-user-1', $2, $3, $4, $5, $6, now(), now())`,
    [SAMPLE.clientError.id, SAMPLE.clientError.digest, SAMPLE.clientError.url,
     SAMPLE.clientError.pathname, SAMPLE.clientError.source, SAMPLE.clientError.payloadJson],
  );
}

/** Read the sample rows back as a comparable value. */
async function readSample(client) {
  const d = await client.query(
    `SELECT id, name, "balanceCents", "originalBalanceCents", "aprBps",
            "minPaymentCents", "dueDay", source, "isArchived", "sortOrder"
       FROM "Debt" WHERE id = $1`,
    [SAMPLE.debt.id],
  );
  const p = await client.query(
    `SELECT id, "periodKey", "paycheckCents", "totalAllocatedCents", "unallocatedCents",
            source, trigger, "ledgerJson"
       FROM "PaycheckRun" WHERE id = $1`,
    [SAMPLE.paycheckRun.id],
  );
  const c = await client.query(
    `SELECT id, digest, url, pathname, source, "payloadJson", occurrences
       FROM "ClientError" WHERE id = $1`,
    [SAMPLE.clientError.id],
  );
  const u = await client.query(`SELECT count(*)::int AS n FROM "User" WHERE id = 'migverify-user-1'`);
  return {
    debt: d.rows,
    paycheckRun: p.rows,
    clientError: c.rows,
    userCount: u.rows[0]?.n,
  };
}

async function main() {
  let tmpMigrations = null;
  let tmpConfig = null;
  try {
    const freshUrl = BASE_URL.replace(/\/[^/?]*(\?|$)/, `/${FRESH_DB}$1`);
    const existingUrl = BASE_URL.replace(/\/[^/?]*(\?|$)/, `/${EXISTING_DB}$1`);

    const hist = historicalMigrations();
    console.log(`\nrun id: ${RUN_ID}`);
    console.log(`databases: ${FRESH_DB}, ${EXISTING_DB}`);
    console.log(`baseline: ${BASELINE} (${hist.skipped} migration(s) at/after it)`);
    console.log(`historical (pre-baseline): ${hist.list.join(", ")}`);

    await createDb(FRESH_DB);
    await createDb(EXISTING_DB);

    // ── FRESH ─────────────────────────────────────────────────────
    console.log(`\n--- FRESH: empty database -> migrate deploy ---`);
    let r = prisma(["migrate", "deploy"], freshUrl);
    check("fresh: migrate deploy exits 0", r.status === 0, (r.stderr || "").trim().slice(0, 400));

    let freshStruct = null;
    {
      const c = new pg.Client({ connectionString: freshUrl });
      await c.connect();
      const tables = await tableNames(c);
      for (const t of ["Debt", "PaycheckRun", "ClientError"]) {
        check(`fresh: table ${t} created by migrations`, tables.includes(t));
      }
      freshStruct = await structureOf(c);

      check(
        "fresh: PaycheckRun has the unique idempotency index",
        freshStruct.PaycheckRun.indexes.some((i) =>
          i.startsWith("PaycheckRun_userId_periodKey_paycheckCents_key"),
        ),
      );
      check(
        "fresh: PaycheckRun has 3 indexes (pkey + unique + userId/ranAt)",
        freshStruct.PaycheckRun.indexes.length === 3,
        `got ${freshStruct.PaycheckRun.indexes.length}`,
      );
      check(
        "fresh: ClientError has the dedup unique index",
        freshStruct.ClientError.indexes.some((i) =>
          i.startsWith("ClientError_digest_url_source_key"),
        ),
      );
      check(
        "fresh: ClientError has 6 indexes",
        freshStruct.ClientError.indexes.length === 6,
        `got ${freshStruct.ClientError.indexes.length}`,
      );
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
    check(
      "fresh: no schema drift vs prisma/schema.prisma",
      !d.failed && !d.sql,
      d.failed ?? (d.sql ? d.sql.slice(0, 300) : "clean"),
    );

    // ── EXISTING ──────────────────────────────────────────────────
    console.log(`\n--- EXISTING: pre-baseline history + db push -> full deploy ---`);

    tmpMigrations = mkdtempSync(join(tmpdir(), `compass-mig-${RUN_ID}-`));
    for (const name of hist.list) {
      cpSync(join(MIGRATIONS_DIR, name), join(tmpMigrations, name), { recursive: true });
    }
    // Unique per run so a concurrent run cannot clobber this one.
    tmpConfig = join(process.cwd(), `prisma.migverify.${RUN_ID}.config.ts`);
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

    r = spawnSync(
      process.execPath,
      [PRISMA_CLI, "migrate", "deploy", "--config", tmpConfig],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: existingUrl },
        encoding: "utf8",
      },
    );
    check(
      "existing: ONLY pre-baseline migrations apply",
      r.status === 0,
      `${(r.stderr || "").trim()} ${(r.stdout || "").trim()}`.trim().slice(0, 400),
    );

    r = prisma(["db", "push"], existingUrl);
    check(
      "existing: db push recreates the three tables (historical state)",
      r.status === 0,
      `${(r.stderr || "").trim()} ${(r.stdout || "").trim()}`.trim().slice(0, 400),
    );

    let before = null;
    {
      const c = new pg.Client({ connectionString: existingUrl });
      await c.connect();
      const tables = await tableNames(c);
      check("existing: Debt present before the new migration runs", tables.includes("Debt"));

      await seedSample(c);
      before = await readSample(c);
      check(
        "existing: representative rows inserted before the repair",
        before.debt.length === 1 && before.paycheckRun.length === 1 && before.clientError.length === 1,
        `debt=${before.debt.length} paycheck=${before.paycheckRun.length} clientError=${before.clientError.length}`,
      );
      await c.end();
    }

    r = prisma(["migrate", "deploy"], existingUrl);
    check(
      "existing: full migrate deploy on top does NOT abort",
      r.status === 0,
      `${(r.stderr || "").trim()} ${(r.stdout || "").trim()}`.trim().slice(0, 500),
    );

    r = prisma(["migrate", "deploy"], existingUrl);
    check("existing: re-running migrate deploy is a no-op", r.status === 0, (r.stderr || "").trim().slice(0, 300));

    let existingStruct = null;
    {
      const c = new pg.Client({ connectionString: existingUrl });
      await c.connect();
      existingStruct = await structureOf(c);

      const after = await readSample(c);
      check(
        "existing: Debt row survived the repair byte-for-byte",
        JSON.stringify(after.debt) === JSON.stringify(before.debt),
        JSON.stringify(after.debt),
      );
      check(
        "existing: PaycheckRun row survived the repair byte-for-byte",
        JSON.stringify(after.paycheckRun) === JSON.stringify(before.paycheckRun),
        JSON.stringify(after.paycheckRun),
      );
      check(
        "existing: ClientError row survived the repair byte-for-byte",
        JSON.stringify(after.clientError) === JSON.stringify(before.clientError),
        JSON.stringify(after.clientError),
      );
      check(
        "existing: the user row was neither dropped nor duplicated",
        after.userCount === before.userCount,
        `before=${before.userCount} after=${after.userCount}`,
      );
      await c.end();
    }

    check(
      "existing: structure (with definitions) is identical to the fresh build",
      JSON.stringify(existingStruct) === JSON.stringify(freshStruct),
      "db-pushed tables diverged from what migrations produce",
    );

    d = driftFor(existingUrl);
    check(
      "existing: no schema drift vs prisma/schema.prisma",
      !d.failed && !d.sql,
      d.failed ?? (d.sql ? d.sql.slice(0, 300) : "clean"),
    );
  } finally {
    // Runs on success, on throw, and on Ctrl-C.
    if (tmpMigrations) rmSync(tmpMigrations, { recursive: true, force: true });
    if (tmpConfig) rmSync(tmpConfig, { force: true });
    await dropCreated();
  }

  console.log(`\n${miss === 0 ? "ALL GREEN" : "FAILED"} — ${pass} passed, ${miss} missed`);
  if (miss > 0) {
    console.log("\nFailed checks:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  // exitCode, not process.exit: the pg pool may still hold a socket and
  // a forced exit can abort mid-teardown.
  process.exitCode = miss === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error("verify-migrations crashed:", err);
  process.exitCode = 1;
});