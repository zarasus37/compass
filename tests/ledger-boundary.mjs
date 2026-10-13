// Provision an owned loopback DB, so cutover/DDL tests never target the shared
// application DB. CI also uses this boundary rather than altering its live server.
import pg from 'pg';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
config({path:resolve('.env.local'),quiet:true});config({path:resolve('.env'),quiet:true});
const require=createRequire(import.meta.url);
const base=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Ledger DDL tests require loopback PostgreSQL; refusing remote target');
const name='compass_ledger_'+randomUUID().replaceAll('-','');
const adminUrl=new URL(base);adminUrl.pathname='/postgres';
const dbUrl=new URL(base);dbUrl.pathname='/'+name;
const admin=new pg.Client({connectionString:adminUrl.href});
await admin.connect();let created=false;
try {
  await admin.query('CREATE DATABASE "'+name+'"');created=true;
  const c=new pg.Client({connectionString:dbUrl.href});await c.connect();
  try {
    for(const dir of readdirSync('prisma/migrations').filter(d=>/^\d/.test(d)&&d<'20261013140000_balance_journal').sort()){
      await c.query(readFileSync('prisma/migrations/'+dir+'/migration.sql','utf8'));
    }
  }finally {await c.end();}
  const exit=await new Promise((resolveExit,reject)=>{
    const child=spawn(process.execPath,[require.resolve('tsx/cli'),'--conditions=react-server','tests/smoke-ledger-reconciliation.mjs'],
      {cwd:process.cwd(),env:{...process.env,DATABASE_URL:dbUrl.href,FIN02_OWNED_DATABASE:name},stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>resolveExit(code??1));
  });
  if(exit!==0)process.exitCode=exit;
}finally {
  if(created){await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name]);await admin.query('DROP DATABASE "'+name+'"');}
  await admin.end();
}
