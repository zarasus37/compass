import assert from "node:assert/strict";
import { test, after } from "node:test";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

// Execute the actual async page, carousel, hero and recommendation UI. Mock
// authentication/data boundaries and unrelated widgets; no server or DB needed.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const root = process.cwd();
const cache = join(root, "node_modules/.cache");
mkdirSync(cache, { recursive: true });
const scratch = mkdtempSync(join(cache, "dashboard-opportunities-"));
after(() => { delete globalThis.__dashboardProbe; rmSync(scratch, { recursive: true, force: true }); });
const page = resolve("src/app/page.tsx");
const source = readFileSync(page, "utf8");
const widgetMocks = new Map();
for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"(@\/components\/[^\"]+)"/g)) {
  if (match[2].endsWith("/SwipeableDashboardHeader") || match[2].endsWith("/catalog")) continue;
  const names = match[1].split(",").map(n => n.trim()).filter(n => n && !n.startsWith("type "));
  widgetMocks.set(match[2], 'import React from "react";\n' + names.map(n => `export function ${n}({children}) { return React.createElement("div", null, children); }`).join("\n"));
}
const mocks = {
  "@/server/auth/user": 'export async function requireUser(){ if(globalThis.__dashboardProbe.authError) throw globalThis.__dashboardProbe.authError; return {id:"tenant-n2",name:"Tester",email:"test@example.invalid"}; }',
  "@/lib/onboarding/gate": 'export async function requireCompletedOnboarding() {}',
  "@/lib/opportunities": 'export async function topOpportunities(...args){ globalThis.__dashboardProbe.calls.push(args); if(globalThis.__dashboardProbe.error) throw globalThis.__dashboardProbe.error; return globalThis.__dashboardProbe.rows; }',
  "@/lib/mock": `
    export const TODAY = new Date("2026-10-10T12:00:00Z"), PERIOD_START = new Date("2026-10-09T12:00:00Z"), PERIOD_END = new Date("2026-10-23T12:00:00Z"), NEXT_PAY_DATE = PERIOD_END;
    export function liveSnapshot(){return {nextPaycheckCents:100000,periodDeltaCents:0};}
    export async function liveEnvelopesFromDb(){if(globalThis.__dashboardProbe.coreError) throw globalThis.__dashboardProbe.coreError;return [];}
    export async function liveGoalsFromDb(){return [];}
    export async function liveBillsFromDb(){return [];}
    export async function liveTransactionsFromDb(){return [];}
    export async function livePlanFromDb(){return {};}
    export function liveBills(){return [];}
    export function livePlan(){return {};}
    export async function getCurrentPayPeriod(){return {startDate:PERIOD_START,endDate:PERIOD_END};}`,
  "@/lib/store": 'export function paycheckBreakdown(){return {paycheckCents:100000,billsCents:0,spendingCents:20000,unallocatedCents:80000};} export function safeToSpend(){return 100000;} export function billsDueInPeriod(){return [];}',
  "@/app/(app)/settings/engine-actions": 'export async function getActiveEngineLevel(){return "L1";}',
  "@/lib/command-palette/search-index": 'export async function getSearchIndex(){return [];}',
  "@/lib/vault/audit-log": 'export async function getAuditLog(){return [];}',
  "@/lib/identity/identity-summary": 'export async function loadIdentitySummary(){return null;}',
  "@/lib/forecast/cash-flow": 'export async function loadCashFlowForecast(){return null;}',
  "next/link": 'import React from "react"; export default function Link({children,href,...props}){return React.createElement("a",{...props,href},children);}',
};
const outfile = join(scratch, "page.mjs");
await build({ entryPoints:[page], outfile, bundle:true, platform:"node", format:"esm", packages:"external", jsx:"automatic", logLevel:"silent",
  plugins:[{name:"dashboard-boundaries",setup(build){
    build.onResolve({filter:/.*/},args=>{
      if (Object.hasOwn(mocks,args.path)) return {path:args.path,namespace:"probe"};
      if (args.importer === page && widgetMocks.has(args.path)) return {path:args.path,namespace:"widget"};
    });
    build.onLoad({filter:/.*/,namespace:"probe"},args=>({contents:mocks[args.path],resolveDir:root}));
    build.onLoad({filter:/.*/,namespace:"widget"},args=>({contents:widgetMocks.get(args.path),resolveDir:root}));
  }}],
});
const { default: Dashboard } = await import(pathToFileURL(outfile).href);
const unavailable = "Recommendations are temporarily unavailable. Refresh the page to try again.";
function reset(extra={}) { globalThis.__dashboardProbe = {calls:[],rows:[],...extra}; }

test("failed recommendations preserve dashboard and safe-to-spend, with no false empty claim or leaked error", async () => {
  reset({error:new Error("Prisma secret-host secret-user")});
  const logs=[];
  const original = console.error;
  let html;
  console.error=(...args)=>logs.push(args.join(" "));
  try { html=renderToStaticMarkup(await Dashboard()); } finally {console.error=original;}
  assert.match(html,/Welcome back/);
  assert.match(html,/Daily telemetry — safe to spend/);
  assert.match(html,/\$1,000/);
  assert.ok(html.includes(unavailable));
  assert.match(html,/role="status"/);
  assert.doesNotMatch(html,/PLAN TIGHT|Your plan is tight|secret-host|secret-user|Prisma/);
  assert.deepEqual(logs,["[dashboard] Recommendations unavailable"]);
  assert.deepEqual(globalThis.__dashboardProbe.calls,[["tenant-n2",{limit:3}]]);
});

test("healthy empty recommendations retain their successful empty state",async()=>{
  reset();
  const html=renderToStaticMarkup(await Dashboard());
  assert.match(html,/PLAN TIGHT/);
  assert.match(html,/Your plan is tight/);
  assert.ok(!html.includes(unavailable));
  assert.deepEqual(globalThis.__dashboardProbe.calls,[["tenant-n2",{limit:3}]]);
});

test("healthy recommendations preserve content, amount and navigation",async()=>{
  reset({rows:[{id:"test-surplus",kind:"buffer-surplus",icon:"+",title:"Move surplus",detail:"Test recommendation",deltaCents:12345,href:"/envelopes/test"}]});
  const html=renderToStaticMarkup(await Dashboard());
  assert.match(html,/Move surplus/);
  assert.match(html,/Test recommendation/);
  assert.match(html,/123\.45/);
  assert.match(html,/href="\/envelopes\/test"/);
  assert.ok(!html.includes(unavailable));
  assert.doesNotMatch(html,/PLAN TIGHT/);
});

test("authentication and required financial-read failures still propagate",async()=>{
  const authError=new Error("authentication required");
  reset({authError});
  await assert.rejects(Dashboard(),error=>error===authError);
  assert.deepEqual(globalThis.__dashboardProbe.calls,[]);
  const coreError=new Error("required financial read failed");
  reset({coreError});
  await assert.rejects(Dashboard(),error=>error===coreError);
  assert.deepEqual(globalThis.__dashboardProbe.calls,[]);
});
