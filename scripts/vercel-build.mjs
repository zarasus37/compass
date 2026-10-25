import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import pg from 'pg';
import { buildTarget, migrationFiles, history, historyPrefix, readonly } from './db-release/core.mjs';
import { JOURNAL_HEALTH_SQL } from '../src/lib/ledger/contract.mjs';

const root = process.cwd(), require = createRequire(import.meta.url);
try {
  const project = process.argv[2];
  const config = JSON.parse(readFileSync(root + '/scripts/db-release/targets.json', 'utf8'));
  const profile = buildTarget(process.env.VERCEL_ENV, project, process.env.DATABASE_URL, config);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await readonly(client, async c => {
      historyPrefix(await history(c), migrationFiles(root, profile), { complete: true });
      if ((await c.query(JOURNAL_HEALTH_SQL)).rows[0]?.available !== true) throw Error('Journal infrastructure unavailable');
    });
  } finally { await client.end(); }
  console.log('[build-gate] verified ' + process.env.VERCEL_ENV + ' ' + project + ' database identity ' + profile.identitySha256);
  // Deliberately no migrate or seed subprocess, in any environment.
  const generated = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate'], { stdio: 'inherit', env: process.env });
  if (generated.error || generated.status !== 0) throw Error('Application build client generation failed');
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) throw Error('Application build failed');
} catch (error) {
  // Connection errors can contain credentials; print only controlled failures.
  const safe = /^(Database target|A known Vercel|Unknown deployment|Pending migrations|Failed, unexpected|Duplicate or|Journal infrastructure|Application build)/.test(error.message);
  console.error('[build-gate]', safe ? error.message : 'Database readiness check failed');
  process.exitCode = 1;
}
