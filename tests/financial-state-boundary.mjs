// FIN-01: exercise reader/caller failures and query boundaries. Snapshot writes touch only owned fixtures.
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function testBoundaries(check, readers, tenantId) {
  const { prisma } = await import("../src/server/db.ts");
  const mock = await import("../src/lib/mock.ts");
  const advisor = await import("../src/lib/advisor/handlers.ts");
  const { topOpportunities } = await import("../src/lib/opportunities.ts");
  const { getSearchIndex } = await import("../src/lib/command-palette/search-index.ts");
  const delegates = ["envelope", "goal", "transaction", "account", "bill", "debt", "allocationPlan", "allocationRule", "payPeriod"];
  const failure = Object.assign(new Error("prisma.envelope.findMany tenant-private-id postgresql://private-user:private-password@private-host/db"), { code: "P1001" });
  const originals = [];
  const output = [];
  const originalLog = console.error;
  const safe = value => !/private-|postgresql:|prisma\./.test(JSON.stringify(value));
  console.error = (...args) => output.push(args);
  try {
    for (const model of delegates) {
      const method = model === "allocationPlan" || model === "payPeriod" ? "findFirst" : "findMany";
      const original = prisma[model][method];
      originals.push(() => { prisma[model][method] = original; });
      prisma[model][method] = async () => { throw failure; };
    }
    const originalTransaction = prisma.$transaction;
    originals.push(() => { prisma.$transaction = originalTransaction; });
    prisma.$transaction = async () => { throw failure; };
    for (const [name, reader] of Object.entries(readers)) {
      const result = await reader(tenantId);
      check(`query failure: ${name} returns read-failed`, !result.ok && result.error === "read-failed");
      check(`query failure: ${name} exposes no internals`, safe(result));
    }
    for (const [name, call] of [
      ["envelope adapter", () => mock.liveEnvelopesFromDb(tenantId)],
      ["goal adapter", () => mock.liveGoalsFromDb(tenantId)],
      ["opportunities", () => topOpportunities(tenantId)],
      ["search", () => getSearchIndex(tenantId)],
    ]) {
      let error;
      try { await call(); } catch (caught) { error = caught; }
      check(`query failure: ${name} rejects rather than returning empty`, error instanceof Error);
      check(`query failure: ${name} rejection is safe`, Boolean(error) && safe(error.message));
    }
    for (const tool of ["queryEnvelopes", "queryDebts"]) {
      const result = await advisor.runAdvisorTool(tenantId, { name: tool, args: {} });
      check(`query failure: advisor ${tool} is ok:false`, result.publicView.ok === false);
      check(`query failure: advisor ${tool} reaches the named handler`, result.publicView.tool === tool);
      const message = tool === "queryEnvelopes" ? "Envelopes are temporarily unavailable. Retry shortly rather than treating this as an empty account." : "Debts are temporarily unavailable. Retry shortly rather than treating this as no debt.";
      check(`query failure: advisor ${tool} returns its exact retry message`, result.publicView.error === message);
      check(`query failure: advisor ${tool} is safe`, safe(result));
    }
    check("server diagnostics omit credentials, tenant and invocation text", safe(output));
    check("server diagnostics retain bounded Prisma code", JSON.stringify(output).includes("P1001"));
  } finally {
    originals.reverse().forEach(restore => restore());
    console.error = originalLog;
  }

  // Observe actual queries on the local DB, without a production test hook.
  const counts = [];
  const restoreQueries = [];
  try {
    for (const model of delegates) {
      const method = model === "allocationPlan" || model === "payPeriod" ? "findFirst" : "findMany";
      const original = prisma[model][method];
      restoreQueries.push(() => { prisma[model][method] = original; });
      prisma[model][method] = (...args) => {
        counts.push(model);
        return original.apply(prisma[model], args);
      };
    }
    for (const [name, expected] of [
      ["getEnvelopes", ["envelope"]], ["getGoals", ["goal"]],
      ["getTransactions", ["transaction"]], ["getAccounts", ["account"]],
      ["getBills", ["bill"]], ["getDebts", ["debt"]],
      ["getAllocationPlan", ["allocationPlan", "allocationRule"]],
      ["getStoredPayPeriod", ["payPeriod"]],
    ]) {
      counts.length = 0;
      const res = await readers[name](tenantId);
      check(`selective ${name} succeeds`, res.ok);
      check(`selective ${name} queries only its entities`, JSON.stringify(counts) === JSON.stringify(expected), JSON.stringify(counts));
    }
  } finally { restoreQueries.reverse().forEach(restore => restore()); }

  const originalTransaction = prisma.$transaction;
  const inside = [];
  let isolation;
  try {
    prisma.$transaction = (callback, options) => {
      isolation = options?.isolationLevel;
      return originalTransaction.call(prisma, tx => callback(new Proxy(tx, {
        get(target, key) {
          const delegate = Reflect.get(target, key);
          if (!delegates.includes(key)) return delegate;
          return new Proxy(delegate, {
            get(model, method) {
              const value = Reflect.get(model, method);
              if (method !== "findMany" && method !== "findFirst") return value;
              return (...args) => { inside.push(key); return value.apply(model, args); };
            },
          });
        },
      })), options);
    };
    const res = await readers.getFinancialState(tenantId);
    check("aggregate succeeds through instrumented real transaction", res.ok);
    check("aggregate requests RepeatableRead at runtime", isolation === "RepeatableRead");
    check("aggregate queries every entity through transaction client", delegates.every(model => inside.includes(model)) && inside.length === 9);
  } finally { prisma.$transaction = originalTransaction; }

  // Commit a balance change on another connection between two aggregate reads.
  // The late account read must still see the snapshot's original balance.
  const before = await readers.getFinancialState(tenantId);
  const envelope = before.ok && before.data.envelopes[0];
  const account = before.ok && before.data.accounts[0];
  if (!envelope || !account) throw new Error("Snapshot probe needs owned fixture balances");
  const { prisma: fixtureDb } = await import("./db-client.mjs");
  let releaseAccount;
  const committed = new Promise(resolve => { releaseAccount = resolve; });
  let writerRan = false;
  try {
    prisma.$transaction = (callback, options) => originalTransaction.call(prisma, tx => callback(new Proxy(tx, {
      get(target, key) {
        const delegate = Reflect.get(target, key);
        if (key !== "envelope" && key !== "account") return delegate;
        return new Proxy(delegate, {
          get(model, method) {
            const value = Reflect.get(model, method);
            if (method !== "findMany") return value;
            return async (...args) => {
              if (key === "account") await committed;
              const rows = await value.apply(model, args);
              if (key === "envelope" && !writerRan) {
                writerRan = true;
                try {
                  await fixtureDb.$transaction([
                    fixtureDb.envelope.update({ where: { id: envelope.id }, data: { currentBalance: { increment: 100 } } }),
                    fixtureDb.account.update({ where: { id: account.id }, data: { currentBalance: { increment: 100 } } }),
                  ]);
                } finally { releaseAccount(); }
              }
              return rows;
            };
          },
        });
      },
    })), options);
    const snapshot = await readers.getFinancialState(tenantId);
    check("concurrent snapshot: external writer committed between reads", writerRan);
    check("concurrent snapshot: aggregate retains original envelope", snapshot.ok && snapshot.data.envelopes[0].currentCents === envelope.currentCents);
    check("concurrent snapshot: late account read retains original balance", snapshot.ok && snapshot.data.accounts[0].currentCents === account.currentCents);
    const current = await fixtureDb.account.findUnique({ where: { id: account.id } });
    check("concurrent snapshot: separate connection sees committed new balance", current.currentBalance === account.currentCents + 100);
  } finally {
    prisma.$transaction = originalTransaction;
    releaseAccount();
    if (writerRan) await fixtureDb.$transaction([
      fixtureDb.envelope.update({ where: { id: envelope.id }, data: { currentBalance: envelope.currentCents } }),
      fixtureDb.account.update({ where: { id: account.id }, data: { currentBalance: account.currentCents } }),
    ]);
  }

  // A server action needs a Next request session. Stub only that boundary and
  // Prisma here; bundle the real action and DAL, then invoke their actual code.
  const require = createRequire(import.meta.url);
  const { build } = createRequire(require.resolve("tsx"))("esbuild");
  const cacheRoot = join(process.cwd(), "node_modules", ".cache");
  mkdirSync(cacheRoot, { recursive: true });
  const scratch = mkdtempSync(join(cacheRoot, "fin01-"));
  const outfile = join(scratch, "action.mjs");
  try {
    await build({
      stdin: { contents: 'export { listEnvelopesForAction } from "./src/app/(app)/envelopes/actions";', resolveDir: process.cwd() },
      outfile, bundle: true, platform: "node", format: "esm", packages: "external", logLevel: "silent",
      plugins: [{ name: "request-boundaries", setup(build) {
        build.onResolve({ filter: /^@\/server\/(db|auth\/user)$/ }, args => ({ path: args.path, namespace: "fin01-stub" }));
        build.onLoad({ filter: /.*/, namespace: "fin01-stub" }, args => ({ contents: args.path.endsWith("/db")
          ? "export const prisma = globalThis.__fin01ActionDb;"
          : 'export async function requireUser() { return { id: "action-tenant" }; }' }));
      } }],
    });
    let shouldFail = true;
    globalThis.__fin01ActionDb = { envelope: { findMany: async () => {
      if (shouldFail) throw failure;
      return [{ id: "unassigned", name: "Unassigned", planet: null, currentBalance: 100, targetBalance: 200, source: "user", sortOrder: 0 }];
    } } };
    const { listEnvelopesForAction } = await import(pathToFileURL(outfile).href);
    const log = console.error;
    console.error = () => {};
    try {
      const failed = await listEnvelopesForAction();
      check("action query failure is typed read-failed, not empty", !failed.ok && failed.error === "read-failed");
      check("action query failure contains no database internals", safe(failed));
      shouldFail = false;
      const success = await listEnvelopesForAction();
      check("action preserves null planet without inventing Growth", success.ok && success.envelopes[0].planet === null);
    } finally { console.error = log; }
  } finally {
    delete globalThis.__fin01ActionDb;
    // Only this test's mkdtemp directory, under the known cache root.
    rmSync(scratch, { recursive: true, force: true });
  }
}
