// FIN-02-SEC: actual writer on PostgreSQL, no fixture.mjs or broad cleanup.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from './db-client.mjs';
import { applyPaycheck } from '../src/lib/apply-paycheck.ts';

const users = [];
let checks = 0;
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  console.log(`[OK] ${label}`);
  checks++;
}
const now = new Date();
async function tenant(label, withAccount = true) {
  const userId = randomUUID();
  await prisma.user.create({data:{id:userId,email:`paycheck-isolation-${userId}@example.invalid`,name:label,passwordHash:'test-only'}});
  users.push(userId);
  const accountId = withAccount ? randomUUID() : null;
  if (accountId) await prisma.account.create({data:{id:accountId,userId,name:label,type:'checking',currentBalance:123456,source:'user'}});
  const envelopeId = randomUUID();
  await prisma.envelope.create({data:{id:envelopeId,userId,name:label,planet:'mars',currentBalance:4000,targetBalance:100000,source:'user'}});
  const planId = randomUUID();
  await prisma.allocationPlan.create({data:{id:planId,userId,strategyId:'envelope',isArmed:true,source:'seed'}});
  await prisma.allocationRule.create({data:{planId,envelopeId,pct:25,source:'seed'}});
  await prisma.goal.create({data:{userId,name:label,targetAmount:100000,currentAmount:4000,targetDate:new Date(now.getTime()+86400000*90),envelopeId,source:'user'}});
  await prisma.payPeriod.create({data:{userId,startDate:new Date(now.getTime()-86400000),endDate:new Date(now.getTime()+86400000*13),isActive:true}});
  return {userId,accountId,envelopeId};
}
async function snapshot() {
  const where = {userId:{in:users}};
  const [accounts,envelopes,goals,transactions,runs,audits] = await Promise.all([
    prisma.account.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true,currentBalance:true}}),
    prisma.envelope.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true,currentBalance:true}}),
    prisma.goal.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true,currentAmount:true}}),
    prisma.transaction.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true,accountId:true,envelopeId:true,amount:true,source:true}}),
    prisma.paycheckRun.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true}}),
    prisma.auditLog.findMany({where,orderBy:{id:'asc'},select:{id:true,userId:true,actionType:true}}),
  ]);
  return {accounts,envelopes,goals,transactions,runs,audits};
}
try {
  const a = await tenant('A'), b = await tenant('B'), empty = await tenant('No account',false);
  const input = {userId:a.userId,paycheckCents:12000,source:'FIN02 security fixture',now};
  const before = await snapshot();
  let refusal;
  for (const [label,accountId] of [['foreign',b.accountId],['missing',randomUUID()],['blank',''],['null',null]]) {
    const result = await applyPaycheck({...input,accountId});
    equal(result.ok,false,`${label} explicit account refused`);
    if (!refusal) refusal=result;
    equal(result,refusal,`${label} account uses identical safe refusal`);
    equal(await snapshot(),before,`${label} refusal has no balance/ledger/run/goal/audit effects in either tenant`);
  }
  for (const userId of [undefined,null,'','   ']) {
    const result = await applyPaycheck({...input,userId});
    equal(result.ok,false,'invalid tenant refused');
    equal(await snapshot(),before,'invalid tenant creates no financial writes');
  }
  const absent = await applyPaycheck({...input,userId:empty.userId});
  equal(absent,refusal,'omitted account with no owned account uses same refusal');
  equal(await snapshot(),before,'missing default account changes no financial state');
  // Change our own fixture's ownership between preliminary selection and the
  // real transaction. This proves the transaction rechecks ownership, rather
  // than trusting an earlier read. Restore it before comparing the snapshot.
  const {prisma:writer} = await import('../src/server/db.ts');
  const originalTransaction = writer.$transaction;
  let changed = false;
  writer.$transaction = async function(callback,...args) {
    await prisma.account.update({where:{id:a.accountId},data:{userId:b.userId}});
    changed = true;
    return originalTransaction.call(writer,callback,...args);
  };
  let raced;
  try { raced = await applyPaycheck({...input,accountId:a.accountId}); }
  finally {
    writer.$transaction = originalTransaction;
    if (changed) await prisma.account.update({where:{id:a.accountId},data:{userId:a.userId}});
  }
  equal(changed,true,'ownership changes before real transaction boundary');
  equal(raced,refusal,'transaction rejects account no longer owned');
  equal(await snapshot(),before,'transaction ownership refusal commits no financial changes');
  const explicit = await applyPaycheck({...input,accountId:a.accountId});
  equal(explicit.ok,true,'owned explicit account succeeds');
  equal(Boolean(explicit.skipped),false,'first valid call is applied');
  let after = await snapshot();
  equal(after.envelopes.find(e=>e.id===a.envelopeId).currentBalance,7000,'exact 25 percent allocation reaches owned envelope');
  equal(after.goals.find(g=>g.userId===a.userId).currentAmount,7000,'bound goal follows allocation');
  equal(after.transactions.filter(t=>t.userId===a.userId).map(t=>[t.accountId,t.amount,t.source]).sort((x,y)=>x[1]-y[1]),[[a.accountId,3000,'routing'],[a.accountId,12000,'manual']],'income and routing rows point only at owned account');
  equal(after.runs.filter(r=>r.userId===a.userId).length,1,'one owned run');
  equal(after.audits.filter(r=>r.userId===a.userId).length,1,'one owned audit');
  equal(after.accounts,before.accounts,'account balance convention remains unchanged');
  equal(after.envelopes.find(e=>e.id===b.envelopeId),before.envelopes.find(e=>e.id===b.envelopeId),'foreign envelope unchanged');
  equal(after.goals.find(g=>g.userId===b.userId),before.goals.find(g=>g.userId===b.userId),'foreign goal unchanged');
  equal(after.transactions.filter(t=>t.userId===b.userId),[],'no foreign transaction');
  equal(after.runs.filter(r=>r.userId===b.userId),[],'no foreign run');
  equal(after.audits.filter(r=>r.userId===b.userId),[],'no foreign audit');
  const duplicate = await applyPaycheck({...input,accountId:a.accountId});
  equal(duplicate.skipped,true,'same paycheck is still idempotent');
  equal(await snapshot(),after,'duplicate changes no financial state');
  const fallback = await applyPaycheck({...input,paycheckCents:16000});
  equal(fallback.ok,true,'omitted account still selects owned default');
  after = await snapshot();
  equal(after.envelopes.find(e=>e.id===a.envelopeId).currentBalance,11000,'default account allocation exact');
  equal(after.transactions.every(t=>t.userId===a.userId&&t.accountId===a.accountId),true,'all resulting transactions remain tenant-scoped');
  console.log(`Paycheck account isolation: ${checks} passed, 0 failed, 0 skipped.`);
} finally {
  const where = {userId:{in:users}};
  if (users.length) {
    await prisma.transaction.deleteMany({where});
    await prisma.paycheckRun.deleteMany({where});
    await prisma.user.deleteMany({where:{id:{in:users}}});
  }
  await prisma.$disconnect();
  const {prisma:writerPrisma} = await import('../src/server/db.ts');
  await writerPrisma.$disconnect();
}
