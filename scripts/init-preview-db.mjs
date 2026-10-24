import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import pg from 'pg';
import { assertTarget } from './db-release/core.mjs';
const require = createRequire(import.meta.url);
try {
  if (process.env.VERCEL_ENV) throw Error('Preview provisioning is an operator command, never a build command');
  const config = JSON.parse(readFileSync('scripts/db-release/targets.json', 'utf8'));
  const profile = config.projects[process.argv[2]]?.preview;
  if (!profile) throw Error('Unknown preview project');
  assertTarget(process.env.DATABASE_URL, profile, { direct: true });
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  try { if ((await c.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n !== 0) throw Error('Preview bootstrap requires an empty database; never overwrite or resolve history'); }
  finally { await c.end(); }
  const r = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { stdio: 'ignore', env: process.env });
  if (r.status !== 0 || r.error) throw Error('Preview bootstrap failed');
  console.log('Isolated empty preview database provisioned; no admin seed ran');
} catch (error) { console.error(error.message === 'Preview provisioning is an operator command, never a build command' ? error.message : 'Preview provisioning refused or failed'); process.exitCode = 1; }
