import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { identity, assertTarget, buildTarget, migrationFiles, historyPrefix, releaseSequence, readonly } from '../scripts/db-release/core.mjs';

const production = 'postgresql://owner:secret@prod.example/db';
const preview = 'postgresql://preview:other@preview.example/preview';
const config = { production: { identitySha256: identity(production) }, projects: { compass: { preview: { identitySha256: identity(preview) } } } };
const files = [{ name: '001_base', checksum: 'a' }, { name: '002_next', checksum: 'b' }];
const rows = files.map(f => ({ migration_name: f.name, checksum: f.checksum, finished_at: new Date(), rolled_back_at: null }));

test('environment identity includes role and database, accepts pooled host only for builds', () => {
  assert.equal(identity(production), identity(production.replace('prod.example', 'prod-pooler.example')));
  assert.notEqual(identity(production), identity(production.replace('/db', '/other')));
  assert.notEqual(identity(production), identity(production.replace('owner:', 'preview:')));
  assert.throws(() => assertTarget(production.replace('prod.example', 'prod-pooler.example'), config.production, { direct: true }), /direct/);
});
test('preview production credentials and unknown environments fail closed', () => {
  assert.equal(buildTarget('preview', 'compass', preview, config), config.projects.compass.preview);
  assert.equal(buildTarget('production', 'compass', production, config), config.production);
  assert.throws(() => buildTarget('preview', 'compass', production, config), /target/);
  assert.throws(() => buildTarget('production', 'compass', preview, config), /target/);
  for (const environment of [undefined, '', 'development']) assert.throws(() => buildTarget(environment, 'compass', production, config), /environment/);
  assert.throws(() => buildTarget('preview', 'unknown', preview, config), /project/);
});
test('history must be a finished checksum-matching contiguous prefix', () => {
  assert.equal(historyPrefix(rows, files, { complete: true }), 2);
  assert.equal(historyPrefix(rows.slice(0, 1), files), 1);
  assert.throws(() => historyPrefix(rows.slice(0, 1), files, { complete: true }), /Pending/);
  for (const bad of [rows.slice(1), [...rows, rows[0]], [{ ...rows[0], checksum: 'changed' }], [{ ...rows[0], finished_at: null }], [{ ...rows[0], rolled_back_at: new Date() }], [{ ...rows[0], migration_name: 'untracked' }]]) {
    assert.throws(() => historyPrefix(bad, files));
  }
});
test('line endings are equivalent; a reviewed legacy exception is bound to exact current SQL', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'compass-release-history-'));
  try {
    mkdirSync(path.join(dir, 'prisma/migrations/001_base'), { recursive: true });
    const file = path.join(dir, 'prisma/migrations/001_base/migration.sql');
    writeFileSync(file, 'SELECT 1;\r\n');
    const first = migrationFiles(dir)[0];
    writeFileSync(file, 'SELECT 1;\n');
    assert.deepEqual(migrationFiles(dir)[0], first);
    const profile = { historyExceptions: [{ name: '001_base', currentChecksum: first.checksum, appliedChecksum: 'known-original' }] };
    const known = migrationFiles(dir, profile);
    assert.equal(historyPrefix([{ ...rows[0], checksum: 'known-original' }], known), 1);
    assert.throws(() => historyPrefix([{ ...rows[0], checksum: 'known-original' }], migrationFiles(dir)));
    writeFileSync(file, 'SELECT 2;\n');
    assert.throws(() => migrationFiles(dir, profile), /reviewed current migration/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function effects(failAt) {
  const events = [];
  const invoke = async (name, value) => { events.push(name); if (name === failAt) throw Error('Injected failure'); return value; };
  return { events, snapshot: () => invoke('snapshot', { id: 'snapshot', branchId: 'production' }), record: (phase) => invoke('record:' + phase), preflight: () => invoke('preflight', { ok: true }), migrate: () => invoke('migrate'), verify: () => invoke('verify', { ok: true }) };
}
const ordered = ['snapshot', 'record:snapshot', 'preflight', 'record:preflight', 'migrate', 'record:migration', 'verify', 'record:verified'];
test('durable snapshot precedes readonly preflight and migration', async () => {
  const e = effects(); await releaseSequence(e); assert.deepEqual(e.events, ordered);
});
for (const phase of ordered) test('release stops on ' + phase + ' failure', async () => {
  const e = effects(phase); await assert.rejects(releaseSequence(e));
  assert.deepEqual(e.events, ordered.slice(0, ordered.indexOf(phase) + 1));
});
test('check-only creates evidence and never invokes migration or verification', async () => {
  const e = effects(); await releaseSequence(e, { checkOnly: true });
  assert.deepEqual(e.events, [...ordered.slice(0, 4), 'record:check-only']);
});
test('missing snapshot receipt and negative preflight refuse migration', async () => {
  const e = effects(); e.snapshot = async () => ({ id: 'incomplete' }); await assert.rejects(releaseSequence(e)); assert.deepEqual(e.events, []);
  const f = effects(); f.preflight = async () => ({ ok: false }); await assert.rejects(releaseSequence(f)); assert.deepEqual(f.events, ['snapshot', 'record:snapshot']);
});
test('readonly transaction always rolls back, including failed checks', async () => {
  for (const throws of [false, true]) {
    const queries = [];
    const client = { query: async sql => { queries.push(sql); return { rows: [{ transaction_read_only: 'on' }] }; } };
    const result = readonly(client, async () => { if (throws) throw Error('failed'); return 42; });
    if (throws) await assert.rejects(result); else assert.equal(await result, 42);
    assert.deepEqual(queries, ['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY', 'SHOW transaction_read_only', 'ROLLBACK']);
  }
});
for (const environment of ['preview', 'production']) test(environment + ' cannot invoke operator migration, provisioning or seeding commands', () => {
  const refusals = {
    'scripts/release-db.mjs': /Schema release stopped at environment;/,
    'scripts/migrate-deploy.mjs': /Schema deployment is forbidden in Vercel builds/,
    'scripts/init-preview-db.mjs': /Preview provisioning is an operator command, never a build command/,
    'scripts/seed-admin.mjs': /Admin seeding is forbidden in Vercel builds/,
  };
  for (const [script, refusal] of Object.entries(refusals)) {
    const child = spawnSync(process.execPath, [script, 'compass'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, VERCEL_ENV: environment, DATABASE_URL: production } });
    assert.equal(child.status, 1, script + ': ' + child.stderr);
    assert.match(child.stderr, refusal, script + ': must fail at its Vercel environment guard');
    assert.doesNotMatch(child.stdout + child.stderr, /prod\.example|owner:secret/);
  }
});
test('build wrapper rejects a production-style target in a preview before generating or compiling', () => {
  const child = spawnSync(process.execPath, ['scripts/vercel-build.mjs', 'compass'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, VERCEL_ENV: 'preview', DATABASE_URL: production } });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Database target/);
  assert.doesNotMatch(child.stdout + child.stderr, /prod\.example|owner:secret|Next\.js|Generated Prisma/);
});
