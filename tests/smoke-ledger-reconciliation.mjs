// Real cutover and journal tests. Invoked only inside ledger-boundary's own DB.
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { prisma } from './db-client.mjs';
import { prisma as writer } from '../src/server/db.ts';
import { getLedgerReconciliation } from '../src/lib/ledger/reconciliation.ts';
import { JOURNAL_HEALTH_SQL,JOURNAL_FUNCTION_DIGESTS } from '../src/lib/ledger/contract.mjs';
import { logTransactionToDb } from '../src/lib/log-transaction.ts';
import { applyPaycheck } from '../src/lib/apply-paycheck.ts';
import { rebalanceEnvelopes } from '../src/lib/store.ts';

const target=new URL(process.env.DATABASE_URL);
assert.match(process.env.FIN02_OWNED_DATABASE??'',/^compass_(?:ledger|fin02a)_[a-f0-9]{32}$/);
assert.equal(target.pathname,'/'+process.env.FIN02_OWNED_DATABASE,'DDL target must be the owned disposable database');
const sql=readFileSync('prisma/migrations/20261013140000_balance_journal/migration.sql','utf8');
const connection=()=>new pg.Client({connectionString:target.href});
const c=connection(),other=connection(),locker=connection();
await Promise.all([c.connect(),other.connect(),locker.connect()]);
let passed=0;
const check=(name,value)=>{assert.ok(value,name);passed++;console.log('[OK] '+name);};
const eq=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);passed++;console.log('[OK] '+name);};
async function waitFor(fn){const end=Date.now()+5000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out waiting for real DB interleaving');}
const users=[];
async function tenant(label){
 const userId=randomUUID(),accId=randomUUID(),envId=randomUUID();
 await prisma.user.create({data:{id:userId,email:`ledger-${userId}@example.invalid`,name:label,passwordHash:'fixture-only'}});users.push(userId);
 await prisma.account.create({data:{id:accId,userId,name:label,type:'checking',source:'user',currentBalance:111000}});
 await prisma.envelope.create({data:{id:envId,userId,name:label,planet:'mars',source:'user',currentBalance:4000,targetBalance:100000}});
 return {userId,accId,envId};
}
async function balances(){return (await c.query('SELECT \'account\' kind,"id","userId","currentBalance" FROM "Account" UNION ALL SELECT \'envelope\',"id","userId","currentBalance" FROM "Envelope" ORDER BY kind,"id"')).rows;}
async function counts(){return (await c.query('SELECT (SELECT count(*) FROM "LedgerEvent")::text events,(SELECT count(*) FROM "LedgerPosition")::text positions,(SELECT count(*) FROM "LedgerEntry")::text entries')).rows[0];}
async function report(user){const r=await getLedgerReconciliation(user);check('reconciliation succeeds on complete infrastructure',r.ok);return r.data;}
async function consistent(user){const r=await report(user);check('all materialised bookkeeping balances match exact journal',r.cacheConsistent);return r;}
async function reject(name,fn){await assert.rejects(fn);passed++;console.log('[OK] '+name);}

try{
 const a=await tenant('A'),b=await tenant('B');
 await prisma.transaction.create({data:{userId:a.userId,accountId:a.accId,envelopeId:a.envId,amount:-500,date:new Date(),payee:'old fixture activity',source:'manual'}});
 // Real old writer holds Account while the migration waits. The opening must
 // include its committed +7, not the previous cached value.
 await locker.query('BEGIN');await locker.query('UPDATE "Account" SET "currentBalance"="currentBalance"+7 WHERE "id"=$1',[a.accId]);
 const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
 const migrating=c.query(sql);
 await waitFor(async()=> (await other.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid])).rows[0]?.wait_event_type==='Lock');
 eq('cutover blocks behind an actual concurrent writer',(await other.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid])).rows[0]?.wait_event_type,'Lock');
 await locker.query('COMMIT');await migrating;
 const before=await balances();
 eq('opening sees old writer committed +7',(await prisma.ledgerPosition.findFirst({where:{userId:a.userId,entityId:a.accId}})).openingCents,111007n);
 eq('all migration function fingerprints match committed contract',Object.fromEntries([...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(compass_ledger_\w+)\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)].map(m=>[m[1],createHash('md5').update(m[2]).digest('hex')])),JOURNAL_FUNCTION_DIGESTS);
 check('journal capture/guard preflight passes',(await c.query(JOURNAL_HEALTH_SQL)).rows[0].available);
 const initial=await counts();await c.query(sql);
 eq('reapplying cutover preserves all source balances',await balances(),before);
 eq('reapplying cutover adds no entries or events',await counts(),initial);
 let r=await consistent(a.userId);
 eq('tenant A sees only its account/envelope',r.positions.map(p=>p.entityId).sort(),[a.accId,a.envId].sort());
 check('legacy openings remain explicitly unverified',r.positions.every(p=>p.flags.includes('unverified_opening')));
 check('legacy activity is reported without inventing an opening transaction',r.positions.every(p=>p.legacyActivityCount==='1'&&p.flags.includes('missing_history')));
 eq('tenant B does not inherit tenant A activity',(await report(b.userId)).positions.map(p=>p.legacyActivityCount),['0','0']);
 for(const id of [undefined,null,'',' ',' padded '])eq('invalid tenant refused before query',await getLedgerReconciliation(id),{ok:false,error:'invalid-tenant-id'});
 const emptyId=randomUUID();await prisma.user.create({data:{id:emptyId,email:`ledger-${emptyId}@example.invalid`,name:'Empty',passwordHash:'fixture-only'}});users.push(emptyId);
 eq('healthy empty tenant is distinct from failure',(await report(emptyId)).positions,[]);
 let n=await counts();
 await prisma.account.update({where:{id:a.accId},data:{name:'A metadata only'}});
 await prisma.account.update({where:{id:a.accId},data:{currentBalance:111007}});
 eq('metadata and identical-value writes make no journal entries',await counts(),n);
 await prisma.account.updateMany({where:{userId:a.userId},data:{currentBalance:{increment:4}}});
 r=await consistent(a.userId);
 eq('bulk update captures exact delta',r.positions.find(p=>p.entityId===a.accId).expectedCents,'111011');
 check('old uncorrelated writers are visibly unexplained',r.positions.find(p=>p.entityId===a.accId).flags.includes('uncorrelated'));
 await c.query('UPDATE "Account" SET "currentBalance"=2147483647 WHERE "id"=$1',[a.accId]);
 await c.query('UPDATE "Account" SET "currentBalance"=-2147483648 WHERE "id"=$1',[a.accId]);
 const last=await prisma.ledgerEntry.findFirst({where:{userId:a.userId,position:{entityId:a.accId}},orderBy:{sequence:'desc'}});
 eq('delta crosses int32 limits without overflow',last.deltaCents,-4294967295n);
 eq('negative balance is exact in report',(await consistent(a.userId)).positions.find(p=>p.entityId===a.accId).expectedCents,'-2147483648');
 await c.query('UPDATE "Account" SET "currentBalance"=5000 WHERE "id"=$1',[a.accId]);
 // Concurrent independent SQL connections, both increments. Position sequencing
 // serialises with the source row; this does not fix legacy absolute writers.
 await Promise.all([c.query('UPDATE "Account" SET "currentBalance"="currentBalance"+11 WHERE "id"=$1',[a.accId]),other.query('UPDATE "Account" SET "currentBalance"="currentBalance"+13 WHERE "id"=$1',[a.accId])]);
 eq('real concurrent increments conserve exact 24 cents',(await consistent(a.userId)).positions.find(p=>p.entityId===a.accId).expectedCents,'5024');
 // Current writer behavior on the migrated DB. No historical Git objects or
 // permanent source freezes; deployed old-binary validation is a release gate.
 const logged=await logTransactionToDb({userId:a.userId,payee:'fixture expense',amountCents:-500,envelopeId:a.envId,date:new Date()});
 eq('current transaction writer succeeds',logged.ok,true);
 eq('current transaction writer delta captured',(await consistent(a.userId)).positions.find(p=>p.entityId===a.envId).expectedCents,'3500');
 const planId=randomUUID();await prisma.allocationPlan.create({data:{id:planId,userId:a.userId,strategyId:'envelope',source:'seed',isArmed:true}});
 await prisma.allocationRule.create({data:{planId,envelopeId:a.envId,pct:25}});
 const now=new Date();await prisma.payPeriod.create({data:{userId:a.userId,startDate:new Date(now.getTime()-86400000),endDate:new Date(now.getTime()+13*86400000),isActive:true}});
 const allocation=await applyPaycheck({userId:a.userId,paycheckCents:12000,source:'fixture simulated allocation',now});
 eq('current paycheck writer succeeds',allocation.ok,true);
 r=await consistent(a.userId);
 eq('routing allocates 3000 budget cents only',r.positions.find(p=>p.entityId===a.envId).expectedCents,'6500');
 eq('paycheck activity is not counted again as account cash',r.positions.find(p=>p.entityId===a.accId).expectedCents,'5024');
 const destId=randomUUID();await prisma.envelope.create({data:{id:destId,userId:a.userId,name:'Destination',currentBalance:1000,targetBalance:10000,source:'user'}});
 const rebalance=await rebalanceEnvelopes(a.userId,a.envId,destId,1000);
 eq('current rebalance writer succeeds',rebalance.ok,true);
 r=await consistent(a.userId);
 eq('rebalance source leg captured',r.positions.find(p=>p.entityId===a.envId).expectedCents,'5500');
 eq('rebalance destination leg captured',r.positions.find(p=>p.entityId===destId).expectedCents,'2000');
 eq('rebalance has zero account delta',r.positions.find(p=>p.entityId===a.accId).expectedCents,'5024');
 // Administrative A -> B -> A reassignment: reconcile both owners at each step.
 const moveId=randomUUID();await prisma.account.create({data:{id:moveId,userId:a.userId,name:'Reassignment fixture',type:'checking',currentBalance:321}});
 await prisma.account.update({where:{id:moveId},data:{userId:b.userId}});
 let moved=(await consistent(a.userId)).positions.find(p=>p.entityId===moveId);
 eq('A-to-B closes A position',[moved.storedCents,moved.expectedCents,moved.entryCount],[null,'0','2']);
 check('A-to-B marks A position removed',moved.flags.includes('removed_entity'));
 moved=(await consistent(b.userId)).positions.find(p=>p.entityId===moveId);
 eq('A-to-B opens B with exact balance',[moved.storedCents,moved.expectedCents,moved.entryCount],['321','321','1']);
 check('A-to-B leaves B position live',!moved.flags.includes('removed_entity'));
 await prisma.account.update({where:{id:moveId},data:{userId:a.userId}});
 moved=(await consistent(a.userId)).positions.find(p=>p.entityId===moveId);
 eq('B-to-A reopens retained A history',[moved.storedCents,moved.expectedCents,moved.entryCount],['321','321','3']);
 check('B-to-A restores A live position',!moved.flags.includes('removed_entity'));
 moved=(await consistent(b.userId)).positions.find(p=>p.entityId===moveId);
 eq('B-to-A closes B history',[moved.storedCents,moved.expectedCents,moved.entryCount],[null,'0','2']);
 check('B-to-A marks B removed',moved.flags.includes('removed_entity'));
 // Same-owner event correlation groundwork; no production writer sets it yet.
 const eventId=randomUUID();await prisma.ledgerEvent.create({data:{id:eventId,userId:a.userId,kind:'fixture',sourceType:'fixture',sourceId:randomUUID(),reason:'test context',actor:'fixture'}});
 await writer.$transaction(async tx=>{await tx.$queryRaw`SELECT set_config('compass.event_id',${eventId},true)`;await tx.account.update({where:{id:a.accId},data:{currentBalance:{increment:1}}});});
 eq('validated same-tenant context links entry',(await prisma.ledgerEntry.findFirst({where:{eventId}})).userId,a.userId);
 const bEvent=randomUUID();await prisma.ledgerEvent.create({data:{id:bEvent,userId:b.userId,kind:'fixture',sourceType:'fixture',sourceId:randomUUID(),reason:'foreign test',actor:'fixture'}});
 const preForeign=await balances(),preForeignCounts=await counts();
 await reject('foreign event context is rejected',()=>writer.$transaction(async tx=>{await tx.$queryRaw`SELECT set_config('compass.event_id',${bEvent},true)`;await tx.account.update({where:{id:a.accId},data:{currentBalance:{increment:1}}});}));
 eq('foreign context rolls back source balances',await balances(),preForeign);eq('foreign context leaves no entry/event',await counts(),preForeignCounts);
 const pos=await prisma.ledgerPosition.findFirst({where:{userId:a.userId,entityId:a.accId}});
 const entry=await prisma.ledgerEntry.findFirst({where:{positionId:pos.id}});
 await reject('direct journal update refused',()=>prisma.ledgerEntry.update({where:{id:entry.id},data:{deltaCents:1n}}));
 await reject('direct journal deletion refused',()=>prisma.ledgerEntry.delete({where:{id:entry.id}}));
 await reject('opening cannot be overwritten',()=>prisma.ledgerPosition.update({where:{id:pos.id},data:{openingCents:999n}}));
 await reject('event headers immutable',()=>prisma.ledgerEvent.update({where:{id:eventId},data:{actor:'changed'}}));
 await reject('journal cannot be truncated',()=>c.query('TRUNCATE "LedgerEntry"'));
 await reject('source cannot be truncated',()=>c.query('TRUNCATE "Account" CASCADE'));
 await reject('entity id cannot be rewritten',()=>c.query('UPDATE "Account" SET "id"=$1 WHERE "id"=$2',[randomUUID(),a.accId]));
 const duplicateSource=await prisma.ledgerEvent.findUnique({where:{id:eventId}});
 await reject('source identity unique within tenant',()=>prisma.ledgerEvent.create({data:{id:randomUUID(),userId:a.userId,kind:'fixture',sourceType:duplicateSource.sourceType,sourceId:duplicateSource.sourceId,reason:'duplicate source',actor:'fixture'}}));
 await reject('ordinary SQL cannot forge an entry',()=>prisma.ledgerEntry.create({data:{id:randomUUID(),userId:a.userId,positionId:pos.id,eventId,sequence:999n,kind:'change',deltaCents:1n}}));
 await c.query('ALTER TABLE "LedgerEntry" DISABLE TRIGGER compass_ledger_entry_guard');
 await reject('composite owner FK rejects mixed-tenant header',()=>prisma.ledgerEntry.create({data:{id:randomUUID(),userId:a.userId,positionId:pos.id,eventId:bEvent,sequence:999n,kind:'change',deltaCents:1n}}));
 await c.query('ALTER TABLE "LedgerEntry" ENABLE TRIGGER compass_ledger_entry_guard');
 const originalFunction=(await c.query("SELECT pg_get_functiondef('public.compass_ledger_capture()'::regprocedure) definition")).rows[0].definition;
 await c.query('CREATE OR REPLACE FUNCTION public.compass_ledger_capture() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN RETURN NULL; END $$');
 eq('replaced function fails fingerprint gate',await getLedgerReconciliation(a.userId),{ok:false,error:'journal-unavailable'});
 await c.query(originalFunction);await consistent(a.userId);
 const removedEntry=await prisma.ledgerEntry.findFirst({where:{positionId:pos.id,sequence:{gt:0n}},orderBy:{sequence:'asc'}});
 await c.query('ALTER TABLE "LedgerEntry" DISABLE TRIGGER compass_ledger_entry_guard');await prisma.ledgerEntry.delete({where:{id:removedEntry.id}});await c.query('ALTER TABLE "LedgerEntry" ENABLE TRIGGER compass_ledger_entry_guard');
 r=await report(a.userId);check('missing entry is a journal gap, not a clean cache',!r.cacheConsistent&&r.positions.find(p=>p.entityId===a.accId).flags.includes('journal_gap'));
 await c.query('ALTER TABLE "LedgerEntry" DISABLE TRIGGER compass_ledger_entry_guard');await prisma.ledgerEntry.create({data:removedEntry});await c.query('ALTER TABLE "LedgerEntry" ENABLE TRIGGER compass_ledger_entry_guard');await consistent(a.userId);
 await c.query('ALTER TABLE "Account" DISABLE TRIGGER compass_account_ledger_update');
 eq('disabled trigger yields whole-report unavailable',await getLedgerReconciliation(a.userId),{ok:false,error:'journal-unavailable'});
 await c.query('UPDATE "Account" SET "currentBalance"="currentBalance"+9 WHERE "id"=$1',[a.accId]);
 await c.query('ALTER TABLE "Account" ENABLE TRIGGER compass_account_ledger_update');
 r=await report(a.userId);check('missed write is detected after trigger restored',!r.cacheConsistent&&r.positions.find(p=>p.entityId===a.accId).flags.includes('mismatch'));
 await c.query('ALTER TABLE "Account" DISABLE TRIGGER compass_account_ledger_update');await c.query('UPDATE "Account" SET "currentBalance"="currentBalance"-9 WHERE "id"=$1',[a.accId]);await c.query('ALTER TABLE "Account" ENABLE TRIGGER compass_account_ledger_update');
 await consistent(a.userId);
 // Inject AFTER-entry failure. Source/cache, journal, activity, audit must all
 // roll back in the real writer transaction, not in a fake Prisma stub.
 await c.query(`CREATE FUNCTION public.ledger_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected journal failure'; END $$; CREATE TRIGGER ledger_test_failure AFTER INSERT ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION public.ledger_test_failure()`);
 const failureBalances=await balances(),failureCounts=await counts(),txCount=await prisma.transaction.count({where:{userId:a.userId}}),auditCount=await prisma.auditLog.count({where:{userId:a.userId}});
 const failed=await logTransactionToDb({userId:a.userId,payee:'must roll back',amountCents:-100,envelopeId:a.envId,date:new Date()});
 eq('actual writer reports induced failure',failed.ok,false);eq('failed writer preserves all balances',await balances(),failureBalances);eq('failed writer preserves journal',await counts(),failureCounts);eq('failed writer preserves activity',await prisma.transaction.count({where:{userId:a.userId}}),txCount);eq('failed writer preserves audit',await prisma.auditLog.count({where:{userId:a.userId}}),auditCount);
 await c.query('DROP TRIGGER ledger_test_failure ON "LedgerEntry"; DROP FUNCTION public.ledger_test_failure()');
 // Deletion/recreation of a fixed seed ID is tracked continuously.
 await prisma.envelope.delete({where:{id:destId}});
 r=await consistent(a.userId);const removed=r.positions.find(p=>p.entityId===destId);
 check('removed entity keeps a tombstone',removed.flags.includes('removed_entity'));eq('closing movement reaches zero',removed.expectedCents,'0');
 await prisma.envelope.create({data:{id:destId,userId:a.userId,name:'Recreated',currentBalance:700,source:'user'}});
 r=await consistent(a.userId);eq('recreated fixed id retains correct ledger',r.positions.find(p=>p.entityId===destId).expectedCents,'700');
 check('recreated entity is live',!r.positions.find(p=>p.entityId===destId).flags.includes('removed_entity'));
 await reject('existing account FK still refuses deleting linked activity',()=>prisma.account.delete({where:{id:a.accId}}));
 // Snapshot interleaving: commit +5 between the availability query and sums.
 const oldBalance=(await report(a.userId)).positions.find(p=>p.entityId===a.accId).storedCents;
 const transaction=writer.$transaction;let intervened=false;
 writer.$transaction=function(callback,options){return transaction.call(writer,async tx=>callback(new Proxy(tx,{get(obj,key){if(key!=='$queryRawUnsafe')return Reflect.get(obj,key);return async(...args)=>{const result=await obj.$queryRawUnsafe(...args);if(!intervened){intervened=true;await other.query('UPDATE "Account" SET "currentBalance"="currentBalance"+5 WHERE "id"=$1',[a.accId]);}return result;};}})),options);};
 try {const snapshot=await report(a.userId);eq('RepeatableRead keeps pre-commit balance',snapshot.positions.find(p=>p.entityId===a.accId).storedCents,oldBalance);check('snapshot cache and journal are from one epoch',snapshot.cacheConsistent);}finally{writer.$transaction=transaction;}
 check('external commit occurred between real report queries',intervened);eq('next report sees committed change',(await consistent(a.userId)).positions.find(p=>p.entityId===a.accId).storedCents,(BigInt(oldBalance)+5n).toString());
 // Connection failure boundary: no raw host/user/invocation leaves the DAL.
 const consoleError=console.error,logs=[];console.error=(...args)=>logs.push(args);
 writer.$transaction=async()=>{throw Object.assign(new Error('postgresql://private-user:private-secret@private-host/db Prisma invocation'),{code:'P1001'});};
 try{eq('failed read is not an empty report',await getLedgerReconciliation(a.userId),{ok:false,error:'read-failed'});check('diagnostic has bounded code and no private text',JSON.stringify(logs).includes('P1001')&&!JSON.stringify(logs).includes('private-'));}finally{writer.$transaction=transaction;console.error=consoleError;}
 // Drop and roll back capture in a transaction: old app stays functional, but
 // a reader must refuse that infrastructure rather than falsely call it clean.
 const rollbackBefore=await balances(),rollbackCounts=await counts();
 await c.query('BEGIN; DROP TRIGGER compass_account_ledger_update ON "Account"');
 await c.query('UPDATE "Account" SET "currentBalance"="currentBalance"+1 WHERE "id"=$1',[a.accId]);
 eq('source write succeeds while capture is removed',(await c.query('SELECT "currentBalance"::text cents FROM "Account" WHERE "id"=$1',[a.accId])).rows[0].cents,(BigInt(rollbackBefore.find(p=>p.id===a.accId).currentBalance)+1n).toString());
 eq('removed capture fails health inside maintenance transaction',(await c.query(JOURNAL_HEALTH_SQL)).rows[0].available,false);
 await c.query('ROLLBACK');
 eq('rollback restores all source balances',await balances(),rollbackBefore);
 eq('rollback preserves journal history',await counts(),rollbackCounts);await consistent(a.userId);
 // Whole-user deletion exercises both no-context and context-present cascades.
 await prisma.transaction.deleteMany({where:{userId:a.userId}});await prisma.paycheckRun.deleteMany({where:{userId:a.userId}});
 await prisma.user.delete({where:{id:a.userId}});
 eq('whole-user erasure removes all journal rows',await prisma.ledgerEntry.count({where:{userId:a.userId}}),0);eq('whole-user erasure removes positions',await prisma.ledgerPosition.count({where:{userId:a.userId}}),0);eq('whole-user erasure removes headers',await prisma.ledgerEvent.count({where:{userId:a.userId}}),0);
 await writer.$transaction(async tx=>{await tx.$queryRaw`SELECT set_config('compass.event_id',${bEvent},true)`;await tx.user.delete({where:{id:b.userId}});});
 eq('context-present erasure also removes journal',await prisma.ledgerEntry.count({where:{userId:b.userId}}),0);
 eq('erasure does not affect another tenant',await prisma.user.count({where:{id:emptyId}}),1);
 const ghostId=randomUUID();await prisma.user.create({data:{id:ghostId,email:`ledger-${ghostId}@example.invalid`,name:'Missing opening fixture',passwordHash:'fixture-only'}});
 await c.query('ALTER TABLE "Account" DISABLE TRIGGER compass_account_ledger_insert');
 await prisma.account.create({data:{id:randomUUID(),userId:ghostId,name:'Unjournalled fixture',type:'checking',currentBalance:10}});
 await c.query('ALTER TABLE "Account" ENABLE TRIGGER compass_account_ledger_insert');
 const ghost=await report(ghostId);check('missing opening is explicit, with no read repair',!ghost.cacheConsistent&&ghost.positions[0].flags.includes('missing_opening'));
 eq('reader did not create an opening',await prisma.ledgerPosition.count({where:{userId:ghostId}}),0);
 await prisma.user.delete({where:{id:ghostId}});
 eq('missing-opening user and account are erased',[await prisma.user.count({where:{id:ghostId}}),await prisma.account.count({where:{userId:ghostId}})],[0,0]);
 console.log(`Balance journal smoke: ${passed} passed, 0 failed, 0 skipped.`);
}finally{
 await Promise.allSettled([c.query('ROLLBACK'),locker.query('ROLLBACK')]);
 await Promise.all([c.end(),other.end(),locker.end(),prisma.$disconnect(),writer.$disconnect()]);
 // The controller removes this entire owned DB, including fixtures, in finally.
}
