import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrationFiles, readonly } from '../scripts/db-release/core.mjs';
import { fullPreflight } from '../scripts/db-release/preflight.mjs';

test('real PostgreSQL preflight accepts complete and pending history, detects schema/checksum drift, enforces readonly', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'This test requires a loopback server; it never touches remote databases');
  const name = 'compass_release_test_' + randomUUID().replaceAll('-', '');
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
  const ownUrl = new URL(url); ownUrl.pathname = '/' + name;
  const admin = new pg.Client({ connectionString: adminUrl.href });
  let own, created = false;
  await admin.connect();
  try {
    await admin.query('CREATE DATABASE "' + name + '"'); created = true;
    own = new pg.Client({ connectionString: ownUrl.href }); await own.connect();
    const files = migrationFiles(process.cwd());
    for (const file of files) await own.query(file.sql);
    await own.query('CREATE TABLE public._prisma_migrations (migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz)');
    for (const file of files) await own.query('INSERT INTO public._prisma_migrations VALUES ($1,$2,now(),null)', [file.name, file.checksum]);
    const good = await fullPreflight(ownUrl.href, url.href, files);
    assert.equal(good.ok, true); assert.equal(good.applied, files.length); assert.equal(good.pending, 0);
    const pending = await fullPreflight(ownUrl.href, url.href, [...files, { name: '999_future', checksum: 'future', sql: 'INVALID SQL THAT MUST NOT RUN' }]);
    assert.equal(pending.pending, 1); assert.equal(pending.schemaSha256, good.schemaSha256);
    await assert.rejects(readonly(own, c => c.query('CREATE TABLE should_never_exist (id int)')), e => e.code === '25006');
    await own.query('ALTER TABLE public."Account" ADD COLUMN release_probe text');
    await assert.rejects(fullPreflight(ownUrl.href, url.href, files), /schema differs/);
    await own.query('ALTER TABLE public."Account" DROP COLUMN release_probe');
    await own.query('UPDATE public._prisma_migrations SET checksum=$1 WHERE migration_name=$2', ['wrong', files[0].name]);
    await assert.rejects(fullPreflight(ownUrl.href, url.href, files), /mismatched migration/);
    await own.query('UPDATE public._prisma_migrations SET checksum=$1 WHERE migration_name=$2', [files[0].checksum, files[0].name]);
    await own.query('ALTER TYPE public."GoalKind" ADD VALUE \'release-probe\'');
    await assert.rejects(fullPreflight(ownUrl.href, url.href, files), /schema differs/);
  } finally {
    if (own) await own.end();
    if (created) await admin.query('DROP DATABASE "' + name + '"');
    await admin.end();
  }
});
