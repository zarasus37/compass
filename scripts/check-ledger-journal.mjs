// Read-only post-migration preflight; no env values or financial rows printed.
import pg from 'pg';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});config({path:'.env',quiet:true});
import { JOURNAL_HEALTH_SQL } from '../src/lib/ledger/contract.mjs';
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw Error('DATABASE_URL is required; no fallback target');
const client=new pg.Client({connectionString});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const {rows}=await client.query(JOURNAL_HEALTH_SQL);
  if(rows[0]?.available!==true)throw Error('Journal unavailable: schema, capture, guards, functions or privileges differ');
  await client.query('ROLLBACK');
  console.log('Balance journal preflight: capture and append-only guards match; read-only check passed.');
} catch {
  console.error('Balance journal preflight failed. No target data was changed.');
  process.exitCode=1;
} finally {await client.end();}
