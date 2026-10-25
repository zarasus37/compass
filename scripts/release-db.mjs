import { readFileSync, mkdirSync, openSync, writeSync, fsyncSync, closeSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { assertTarget, migrationFiles, history, historyPrefix, readonly, schemaFingerprint, releaseSequence } from './db-release/core.mjs';
import { fullPreflight } from './db-release/preflight.mjs';
import { JOURNAL_HEALTH_SQL } from '../src/lib/ledger/contract.mjs';

const root = process.cwd(), require = createRequire(import.meta.url);
const checkOnly = process.argv.slice(2).includes('--check-only');
const run = (cmd, args, env = process.env) => {
  const r = spawnSync(cmd, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
  if (r.error || r.status !== 0) throw Error('Required subprocess failed');
  return r.stdout;
};
// Windows CLI shims require one shell; arguments never contain URLs/secrets.
function neon(args) {
  const safe = args.every(a => /^[A-Za-z0-9_.:@/-]+$/.test(a));
  if (!safe) throw Error('Unsafe CLI metadata argument');
  return process.platform === 'win32' ? run('cmd.exe', ['/d', '/s', '/c', 'neon ' + args.join(' ')]) : run('neon', args);
}

let lock, receiptFd, journalRecord, phase = 'environment';
try {
  if (process.env.VERCEL_ENV) throw Error('Production schema release is forbidden in every Vercel build, including previews');
  phase = 'target';
  const config = JSON.parse(readFileSync(root + '/scripts/db-release/targets.json', 'utf8'));
  const profile = config.production, raw = process.env.DATABASE_URL;
  assertTarget(raw, profile, { direct: true });
  const files = migrationFiles(root, profile);
  phase = 'evidence';
  const evidence = process.env.COMPASS_RELEASE_EVIDENCE_DIR;
  if (!evidence || !path.isAbsolute(evidence)) throw Error('An absolute private evidence directory is required');
  const inside = path.relative(root, evidence);
  if (inside === '' || (!inside.startsWith('..') && !path.isAbsolute(inside))) throw Error('Release evidence must be outside the Git checkout');
  mkdirSync(evidence, { recursive: true });
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!checkOnly) {
    phase = 'review-and-ci';
    if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw Error('Schema release requires a clean reviewed commit');
    run(process.execPath, ['scripts/project-sync.mjs', 'check']);
    const state = JSON.parse(readFileSync(root + '/docs/project-state.json', 'utf8'));
    if (state.activeTask || state.tasks.some(t => ['in_progress', 'in_review', 'changes_requested'].includes(t.status))) throw Error('Independent review must finish before schema release');
    const runs = JSON.parse(run('gh', ['run', 'list', '--commit', sha, '--workflow', 'ci.yml', '--status', 'success', '--json', 'headSha,conclusion', '--limit', '10']));
    if (!runs.some(r => r.headSha === sha && r.conclusion === 'success')) throw Error('Exact-commit full CI success is required');
  }
  const file = path.join(evidence, 'schema-release-' + randomUUID() + '.jsonl');
  phase = 'receipt-open';
  const fd = openSync(file, 'wx', 0o600);
  receiptFd = fd;
  const record = async (phase, data) => { writeSync(fd, JSON.stringify({ at: new Date().toISOString(), phase, sha, identitySha256: profile.identitySha256, ...data }) + '\n'); fsyncSync(fd); };
  journalRecord = record;
  phase = 'release-lock';
  lock = new pg.Client({ connectionString: raw, connectionTimeoutMillis: 15000 }); lock.on('error', () => {}); await lock.connect();
  if (!(await lock.query('SELECT pg_try_advisory_lock(68312041) locked')).rows[0].locked) throw Error('Another schema release owns the gate');
  let preflight;
    await releaseSequence({
      record,
      snapshot: async () => {
        phase = 'snapshot';
        const name = 'compass-pre-release-' + sha.slice(0, 12) + '-' + Date.now();
        const expires = new Date(Date.now() + 7 * 86400000).toISOString();
        const result = JSON.parse(neon(['snapshots', 'create', '--project-id', profile.projectId, '--org-id', profile.orgId, '--branch', profile.branchId, '--name', name, '--expires-at', expires, '--output', 'json']));
        const snapshot = result.snapshot ?? result;
        if (!snapshot.id || snapshot.source_branch_id !== profile.branchId) throw Error('Snapshot target was not confirmed');
        return { id: snapshot.id, branchId: snapshot.source_branch_id, expiresAt: expires, owner: 'codex' };
      },
      preflight: async () => {
        phase = 'preflight';
        preflight = await fullPreflight(raw, process.env.PREFLIGHT_REFERENCE_URL, files);
        return preflight;
      },
      migrate: async () => {
        phase = 'migration';
        // Recheck the schema under the held cooperative release lock immediately
        // before Prisma. A changed or failed history never gets force-resolved.
        await readonly(lock, async c => {
          if (historyPrefix(await history(c), files) !== preflight.applied || await schemaFingerprint(c) !== preflight.schemaSha256) throw Error('Target changed after preflight');
        });
        run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
      },
      verify: async () => {
        phase = 'verification';
        await readonly(lock, async c => {
          historyPrefix(await history(c), files, { complete: true });
          if ((await c.query(JOURNAL_HEALTH_SQL)).rows[0]?.available !== true) throw Error('Journal verification failed');
        });
        return { ok: true };
      },
    }, { checkOnly });
    console.log(checkOnly ? 'Snapshot and read-only preflight recorded; CHECK ONLY, no migration ran' : 'Snapshot, preflight, migration and verification recorded');
} catch {
  if (journalRecord) { try { await journalRecord('failed', { stoppedAt: phase, laterPhasesAttempted: false }); } catch { /* failed storage still refuses further effects */ } }
  console.error('Schema release stopped at ' + phase + '; no later phase was attempted. Inspect the private phase receipts.');
  process.exitCode = 1;
} finally {
  if (receiptFd !== undefined) closeSync(receiptFd);
  if (lock) { try { await lock.query('SELECT pg_advisory_unlock(68312041)'); } catch { /* failed connection already releases lock */ } await lock.end(); }
}
