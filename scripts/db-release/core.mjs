import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

export function identity(raw) {
  const u = new URL(raw);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.username || !u.password) throw Error('Invalid database connection');
  return createHash('sha256').update(JSON.stringify([u.hostname.replace('-pooler', ''), u.pathname, decodeURIComponent(u.username)])).digest('hex');
}

export function assertTarget(raw, profile, { direct = false } = {}) {
  if (!raw || identity(raw) !== profile.identitySha256) throw Error('Database target does not match the assigned environment');
  if (direct && new URL(raw).hostname.includes('-pooler')) throw Error('Schema release requires a direct unpooled connection');
}

export function buildTarget(environment, project, raw, config) {
  if (!['production', 'preview'].includes(environment)) throw Error('A known Vercel environment is required');
  if (!config.projects[project]) throw Error('Unknown deployment project');
  const profile = environment === 'production' ? config.production : config.projects[project].preview;
  assertTarget(raw, profile);
  return profile;
}

export function migrationFiles(root, { historyExceptions = [] } = {}) {
  return readdirSync(root + '/prisma/migrations').filter(n => /^\d/.test(n)).sort().map(name => {
    const sql = readFileSync(root + '/prisma/migrations/' + name + '/migration.sql');
    const text = sql.toString('utf8').replaceAll('\r\n', '\n');
    const checksum = createHash('sha256').update(text).digest('hex');
    const lineEndingChecksum = createHash('sha256').update(text.replaceAll('\n', '\r\n')).digest('hex');
    const exception = historyExceptions.find(e => e.name === name);
    if (exception && exception.currentChecksum !== checksum) throw Error('Historical checksum exception does not match the reviewed current migration');
    return { name, sql: text, checksum, acceptedChecksums: [checksum, lineEndingChecksum, ...(exception ? [exception.appliedChecksum] : [])] };
  });
}

export function historyPrefix(rows, files, { complete = false } = {}) {
  const names = rows.map(r => r.migration_name);
  if (new Set(names).size !== names.length) throw Error('Duplicate or retried migration history requires investigation');
  const sorted = [...rows].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i], f = files[i];
    if (!f || r.migration_name !== f.name || !(f.acceptedChecksums ?? [f.checksum]).includes(r.checksum) || !r.finished_at || r.rolled_back_at) throw Error('Failed, unexpected or mismatched migration history');
  }
  if (complete && rows.length !== files.length) throw Error('Pending migrations: run the explicit schema release gate before building');
  return sorted.length;
}

export async function history(client) {
  return (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows;
}

export async function readonly(client, fn) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    if ((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only !== 'on') throw Error('Read-only enforcement failed');
    return await fn(client);
  } finally { await client.query('ROLLBACK'); }
}

export async function schemaDefinition(client) {
  const queries = [
    `SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) default_value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind='r' AND c.relname<>'_prisma_migrations' ORDER BY c.relname,a.attname`,
    `SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname<>'_prisma_migrations' ORDER BY c.relname,con.conname`,
    `SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename,indexname`,
    `SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
    `SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'compass_%' ORDER BY p.proname,args`,
    `SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`,
  ];
  const values = [];
  for (const sql of queries) values.push((await client.query(sql)).rows);
  return values;
}

export async function schemaFingerprint(client) {
  return createHash('sha256').update(JSON.stringify(await schemaDefinition(client))).digest('hex');
}

/** Every durable receipt is required before the next effect can begin. */
export async function releaseSequence(effects, { checkOnly = false } = {}) {
  const snapshot = await effects.snapshot();
  if (!snapshot?.id || !snapshot?.branchId) throw Error('Snapshot receipt is incomplete');
  await effects.record('snapshot', snapshot);
  const preflight = await effects.preflight();
  if (preflight?.ok !== true) throw Error('Preflight refused the schema release');
  await effects.record('preflight', preflight);
  if (checkOnly) { await effects.record('check-only', { deployed: false }); return; }
  await effects.migrate();
  await effects.record('migration', { completed: true });
  const verified = await effects.verify();
  if (verified?.ok !== true) throw Error('Post-migration verification failed');
  await effects.record('verified', verified);
}
