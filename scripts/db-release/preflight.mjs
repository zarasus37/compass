import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { history, historyPrefix, readonly, schemaFingerprint } from './core.mjs';

export async function fullPreflight(targetUrl, referenceUrl, files) {
  const ru = new URL(referenceUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(ru.hostname)) throw Error('Reference server must be explicitly local');
  const name = 'compass_preflight_' + randomUUID().replaceAll('-', '');
  const adminUrl = new URL(ru); adminUrl.pathname = '/postgres';
  const refUrl = new URL(ru); refUrl.pathname = '/' + name;
  const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
  const admin = new pg.Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 15000 });
  let created = false, ref, adminConnected = false;
  await target.connect();
  try {
    return await readonly(target, async t => {
      const rows = await history(t), count = historyPrefix(rows, files);
      const fingerprint = await schemaFingerprint(t);
      await admin.connect(); adminConnected = true;
      await admin.query('CREATE DATABASE "' + name + '"'); created = true;
      ref = new pg.Client({ connectionString: refUrl.href, connectionTimeoutMillis: 15000 }); await ref.connect();
      for (const file of files.slice(0, count)) await ref.query(file.sql);
      const expected = await schemaFingerprint(ref);
      if (expected !== fingerprint) throw Error('Full existing schema differs from verified migration history');
      return { ok: true, applied: count, pending: files.length - count, schemaSha256: fingerprint };
    });
  } finally {
    if (ref) await ref.end();
    if (created) { await admin.query('DROP DATABASE "' + name + '"'); }
    if (adminConnected) await admin.end();
    await target.end();
  }
}
