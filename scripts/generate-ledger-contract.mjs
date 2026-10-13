import fs from 'node:fs';
import crypto from 'node:crypto';
const root=process.cwd();
const state=JSON.parse(fs.readFileSync(root+'/docs/project-state.json','utf8'));
const claim=JSON.parse(fs.readFileSync(root+'/.compass-coordination.lock/claim.json','utf8'));
if(claim.task!==state.activeTask || claim.actor!==state.tasks.find(t=>t.id===state.activeTask)?.owner) throw Error('Contract generation requires the active implementation owner claim');
const sql=fs.readFileSync(root+'/prisma/migrations/20261013140000_balance_journal/migration.sql','utf8');
const functions=[...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(compass_ledger_\w+)\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)].map(m=>[m[1],crypto.createHash('md5').update(m[2]).digest('hex'),m[1].endsWith('_append')?6:0]);
if(functions.length!==4)throw Error('Expected four journal functions');
const triggers=[];
for(const [table,prefix,arg]of [['Account','account','account'],['Envelope','envelope','envelope']]){
 for(const [op,bits]of [['insert',5],['update',17],['delete',9]])triggers.push([table,`compass_${prefix}_ledger_${op}`,'compass_ledger_capture',bits,Buffer.from(arg+'\0').toString('hex'),op==='update'?'balance':'none']);
 triggers.push([table,`compass_${prefix}_ledger_identity`,'compass_ledger_identity_guard',19,'','identity']);
 triggers.push([table,`compass_${prefix}_ledger_truncate`,'compass_ledger_identity_guard',34,'','none']);
}
for(const [table,key,bits]of [['LedgerEvent','event',27],['LedgerPosition','position',31],['LedgerEntry','entry',31]]){
 triggers.push([table,`compass_ledger_${key}_guard`,'compass_ledger_guard',bits,'','none']);
 triggers.push([table,`compass_ledger_${key}_truncate`,'compass_ledger_guard',34,'','none']);
}
triggers.push(['User','compass_user_ledger_truncate','compass_ledger_identity_guard',34,'','none']);
const values=triggers.map(t=>'('+t.map(v=>typeof v==='number'?v:"'"+v+"'").join(',')+')').join(',\n');
const fvalues=functions.map(t=>`('${t[0]}','${t[1]}',${t[2]})`).join(',\n');
const health=`WITH wanted(rel,name,fn,bits,args,mode) AS (VALUES\n${values}),\nfuncs(name,digest,nargs) AS (VALUES\n${fvalues})\nSELECT\n (SELECT count(*) FROM wanted w JOIN pg_catalog.pg_class c ON c.relname=w.rel JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public' JOIN pg_catalog.pg_trigger t ON t.tgrelid=c.oid AND t.tgname=w.name JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace AND pn.nspname='public' WHERE NOT t.tgisinternal AND t.tgenabled IN ('O','A') AND t.tgtype=w.bits AND p.proname=w.fn AND encode(t.tgargs,'hex')=w.args AND CASE w.mode WHEN 'identity' THEN t.tgattr::text=(SELECT attnum::text FROM pg_catalog.pg_attribute WHERE attrelid=c.oid AND attname='id') AND t.tgqual IS NULL WHEN 'balance' THEN t.tgattr::text='' AND regexp_replace(lower(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid)), '[[:space:]()]', '', 'g')='old."currentbalance"isdistinctfromnew."currentbalance"orold."userid"isdistinctfromnew."userid"' ELSE t.tgattr::text='' AND t.tgqual IS NULL END) = ${triggers.length}\n AND (SELECT count(*) FROM funcs f JOIN pg_catalog.pg_proc p ON p.proname=f.name JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public' WHERE md5(p.prosrc)=f.digest AND p.pronargs=f.nargs AND NOT p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog, public']::text[]) = ${functions.length}\n AND current_setting('session_replication_role')='origin'\n AND has_table_privilege('public."LedgerEvent"','SELECT,INSERT')\n AND has_table_privilege('public."LedgerEntry"','SELECT,INSERT')\n AND has_table_privilege('public."LedgerPosition"','SELECT,INSERT,UPDATE') AS available`;
fs.mkdirSync(root+'/src/lib/ledger',{recursive:true});
const exactHealth=health.replace('pg_catalog.pg_get_expr(t.tgqual,t.tgrelid)',"substring(pg_catalog.pg_get_triggerdef(t.oid) from 'WHEN \\((.*)\\) EXECUTE FUNCTION')").replace("has_table_privilege('public.\"LedgerEvent\"','SELECT,INSERT')","has_table_privilege('public.\"LedgerEvent\"','SELECT') AND has_table_privilege('public.\"LedgerEvent\"','INSERT')").replace("has_table_privilege('public.\"LedgerEntry\"','SELECT,INSERT')","has_table_privilege('public.\"LedgerEntry\"','SELECT') AND has_table_privilege('public.\"LedgerEntry\"','INSERT')").replace("has_table_privilege('public.\"LedgerPosition\"','SELECT,INSERT,UPDATE')","has_table_privilege('public.\"LedgerPosition\"','SELECT') AND has_table_privilege('public.\"LedgerPosition\"','INSERT') AND has_table_privilege('public.\"LedgerPosition\"','UPDATE')");
fs.writeFileSync(root+'/src/lib/ledger/contract.mjs','// Generated from migration.sql; fingerprints must change with the reviewed SQL.\nexport const JOURNAL_HEALTH_SQL = '+JSON.stringify(exactHealth)+';\nexport const JOURNAL_FUNCTION_DIGESTS = Object.freeze('+JSON.stringify(Object.fromEntries(functions.map(f=>[f[0],f[1]])),null,2)+');\n');
