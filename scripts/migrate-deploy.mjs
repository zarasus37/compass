import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
try {
  if (process.env.VERCEL_ENV) throw Error('Schema deployment is forbidden in Vercel builds; use db:release from the operator environment');
  const u = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw Error('Remote schema deployment requires db:release snapshot and preflight');
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) throw Error('Local migration failed');
} catch (error) { console.error('[migration-gate]', error.message.startsWith('Schema') || error.message.startsWith('Remote') ? error.message : 'Migration refused or failed'); process.exitCode = 1; }
