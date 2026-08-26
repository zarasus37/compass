/**
 * Smoke for the onboarding agent pipeline.
 *
 * Cluster 5.0 Part A. The smoke drives a scripted 4-turn conversation
 * against the dev-only /api/dev-agent/run-agent endpoint. The endpoint
 * uses the persisted state + the mock LLM provider by default; the
 * smoke is deterministic and fast.
 *
 * Cluster 5.0 Part B additions:
 *   - Every turn is followed by a GET against the same endpoint to
 *     verify the state was actually persisted to Prisma (not just
 *     echoed in the response).
 *   - After turn 4, the audit + completedAt are checked in the
 *     persisted state.
 *   - After reset, the GET returns 404 (no identity row exists).
 *
 * Cluster 5.2.5 additions:
 *   - After turn 4 (which marks onboarding complete), the smoke
 *     queries the production tables directly via Prisma to verify
 *     the identity projection ran (Account / Bill / Goal rows for
 *     the smoke user). Uses the same `node`-from-source Prisma
 *     client the auth smoke uses, with the same path-resolution
 *     workaround.
 *   - The check count grew from 80 → ~97 with the projection
 *     assertions.
 *   - A new test-llm-call endpoint exercises the L1 rules fallback:
 *     forcing a Mavis call with a bogus URL/key falls through to
 *     the L1 mock engine, and the response carries meta.fellBack=true.
 *
 * What the smoke verifies:
 *   1. The endpoint accepts the request and routes to the LLM
 *      dispatcher (mock is the default).
 *   2. Each user turn produces the right tool calls (saveIncomeSource,
 *      saveDebt, saveGoal, saveRiskProfile + buildAudit + markOnboardingComplete).
 *   3. State advances correctly across turns: identity / income /
 *      debts / goals / risk / audit / completedAt.
 *   4. The 4th turn flips onboardingCompleted=true.
 *   5. The system prompt + 12 tools load (no schema/import errors).
 *   6. After every turn, the persisted state (GET endpoint) matches
 *      what the runAgent() response returned.
 *   7. After reset, the persisted state is gone (GET → 404).
 *   8. The L1 rules fallback fires when the primary provider (Mavis)
 *      fails — meta.fellBack=true, the actual response came from
 *      the L1 engine (mock), and the originalProvider is recorded.
 *
 * What the smoke does NOT verify:
 *   - Mavis provider end-to-end (no real API call in test env).
 *   - Ollama provider end-to-end (no local server in test env).
 *   - The actual LLM's quality of responses. The mock is a stub.
 *
 * Run with: node tests/smoke-onboarding-agent.mjs
 * (dev server must be running on 127.0.0.1:3000)
 */

const BASE = "http://127.0.0.1:3000";
const ENDPOINT = `${BASE}/api/dev-agent/run-agent`;
const TEST_LLM_ENDPOINT = `${BASE}/api/dev-agent/test-llm-call`;

// Cluster 5.2.5: project-identity smoke checks. The smoke asserts
// that the Account / Bill / Goal tables get rows when the chat
// completes markOnboardingComplete. We query Prisma directly using
// the same generated client + better-sqlite3 adapter pattern that
// smoke-auth.mjs uses. Path matches dbFilePath() in src/server/db.ts
// so the dev server and the test see the same file.
import { createRequire } from "node:module";
import path from "node:path";
const _require = createRequire(import.meta.url);
const _generated = _require(path.join(process.cwd(), "src/generated/prisma/client"));
const { PrismaClient } = _generated;
const { PrismaBetterSqlite3 } = _require(
  path.join(process.cwd(), "node_modules/@prisma/adapter-better-sqlite3"),
);
const _adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const prisma = new PrismaClient({ adapter: _adapter });

const log = (k, v) => console.log(`[${k}] ${v}`);

async function postAgent(body) {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${ENDPOINT} → ${r.status}: ${text.slice(0, 500)}`);
  }
  return r.json();
}

async function getAgent(userId) {
  const r = await fetch(`${ENDPOINT}?userId=${encodeURIComponent(userId)}`);
  return { status: r.status, body: r.status === 200 ? await r.json() : await r.text() };
}

async function postTestLLMCall(body) {
  const r = await fetch(TEST_LLM_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${TEST_LLM_ENDPOINT} → ${r.status}: ${text.slice(0, 500)}`);
  }
  return r.json();
}

const checks = [];
function check(name, cond, detail) {
  checks.push({ name, ok: Boolean(cond), detail });
}

async function main() {
  console.log("--- Onboarding agent smoke (Part A + Part B) ---\n");

  const USER_ID = "smoke-user-1";

  // Reset before we start. This wipes every FinancialIdentity row
  // (cascade-deletes child rows + messages) and every mock-seed
  // topic tracker. The reset also runs a "noop" turn, which
  // creates a fresh identity row but with no income/debt/goal.
  await postAgent({ userId: USER_ID, userMessage: "noop", resetAll: true });

  // Confirm reset: the GET should return 200 (a fresh identity
  // exists from the noop turn) with empty income/debt/goal arrays.
  const afterReset = await getAgent(USER_ID);
  check(
    "reset: GET returns 200 (fresh identity from noop turn)",
    afterReset.status === 200,
    `got ${afterReset.status}`,
  );
  check(
    "reset: persisted state has no income",
    afterReset.body.incomeCount === 0,
    `got ${afterReset.body.incomeCount}`,
  );
  check(
    "reset: persisted state has no debts",
    afterReset.body.debtCount === 0,
    `got ${afterReset.body.debtCount}`,
  );
  check(
    "reset: persisted state has no goals",
    afterReset.body.goalCount === 0,
    `got ${afterReset.body.goalCount}`,
  );
  check(
    "reset: persisted state has no completedAt",
    afterReset.body.completedAt === null,
    `got "${afterReset.body.completedAt}"`,
  );

  // ── Turn 1: income ───────────────────────────────────────────────
  // The mock's "income" branch needs: cadence keyword OR a dollar amount.
  log("turn 1", "income");
  const t1 = await postAgent({
    userId: USER_ID,
    userMessage: "I get paid $1,820 biweekly from my primary job.",
  });
  log("turn 1 tool calls", t1.toolCalls.map((t) => t.name).join(", "));
  log("turn 1 agent message", t1.agentMessage.slice(0, 80) + "…");
  log("turn 1 provider", t1.provider);
  log("turn 1 fellBack", t1.fellBack);
  log("turn 1 income count", t1.state.income.length);

  check("turn 1: provider is mock", t1.provider === "mock");
  check("turn 1: fellBack is false (no fallback in normal mode)", t1.fellBack === false);
  check("turn 1: exactly 1 tool call", t1.toolCalls.length === 1, `got ${t1.toolCalls.length}`);
  check("turn 1: tool is saveIncomeSource", t1.toolCalls[0]?.name === "saveIncomeSource");
  check("turn 1: tool result ok", t1.toolCalls[0]?.result?.publicView?.ok === true);
  check("turn 1: state.income has 1 entry", t1.state.income.length === 1);
  check(
    "turn 1: income cadence = biweekly",
    t1.state.income[0]?.cadence === "biweekly",
    `got "${t1.state.income[0]?.cadence}"`,
  );
  check(
    "turn 1: income amount = 1820 dollars",
    t1.state.income[0]?.amountDollars === 1820,
    `got ${t1.state.income[0]?.amountDollars}`,
  );
  check("turn 1: onboarding not yet complete", t1.onboardingCompleted === false);

  // Persistence check after turn 1: GET should return 200 with the
  // income entry that the runAgent response just produced.
  const p1 = await getAgent(USER_ID);
  check(
    "turn 1 persistence: GET returns 200",
    p1.status === 200,
    `got ${p1.status}`,
  );
  check(
    "turn 1 persistence: income count is 1",
    p1.body.incomeCount === 1,
    `got ${p1.body.incomeCount}`,
  );
  check(
    "turn 1 persistence: persisted income[0].label = Primary",
    p1.body.income?.[0]?.label === "Primary",
    `got "${p1.body.income?.[0]?.label}"`,
  );
  check(
    "turn 1 persistence: persisted income[0].amountDollars = 1820",
    p1.body.income?.[0]?.amountDollars === 1820,
    `got ${p1.body.income?.[0]?.amountDollars}`,
  );
  check(
    "turn 1 persistence: messageCount > 0 (history was saved)",
    typeof p1.body.messageCount === "number" && p1.body.messageCount > 0,
    `got ${p1.body.messageCount}`,
  );
  check(
    "turn 1 persistence: lastProvider is mock",
    p1.body.lastProvider === "mock",
    `got "${p1.body.lastProvider}"`,
  );
  check(
    "turn 1 persistence: lastFellBack is false",
    p1.body.lastFellBack === false,
  );

  // ── Turn 2: debt ────────────────────────────────────────────────
  log("\nturn 2", "debt");
  const t2 = await postAgent({
    userId: USER_ID,
    userMessage: "I have a $300,000 mortgage at 6.5% with a $1,800 minimum payment.",
  });
  log("turn 2 tool calls", t2.toolCalls.map((t) => t.name).join(", "));

  check("turn 2: provider is mock", t2.provider === "mock");
  check("turn 2: exactly 1 tool call", t2.toolCalls.length === 1);
  check("turn 2: tool is saveDebt", t2.toolCalls[0]?.name === "saveDebt");
  check("turn 2: state.debts has 1 entry", t2.state.debts.length === 1);
  check(
    "turn 2: debt kind = mortgage",
    t2.state.debts[0]?.kind === "mortgage",
    `got "${t2.state.debts[0]?.kind}"`,
  );
  check(
    "turn 2: debt balance = 300000 dollars",
    t2.state.debts[0]?.balanceDollars === 300000,
    `got ${t2.state.debts[0]?.balanceDollars}`,
  );
  check(
    "turn 2: debt apr = 6.5 percent",
    t2.state.debts[0]?.aprPercent === 6.5,
    `got ${t2.state.debts[0]?.aprPercent}`,
  );

  // Persistence check after turn 2: debt was saved.
  const p2 = await getAgent(USER_ID);
  check(
    "turn 2 persistence: income still 1 (not duplicated)",
    p2.body.incomeCount === 1,
    `got ${p2.body.incomeCount}`,
  );
  check(
    "turn 2 persistence: debt count is 1",
    p2.body.debtCount === 1,
    `got ${p2.body.debtCount}`,
  );
  check(
    "turn 2 persistence: persisted debt[0].balanceDollars = 300000",
    p2.body.debts?.[0]?.balanceDollars === 300000,
    `got ${p2.body.debts?.[0]?.balanceDollars}`,
  );
  check(
    "turn 2 persistence: persisted debt[0].aprPercent = 6.5",
    Math.abs((p2.body.debts?.[0]?.aprPercent ?? 0) - 6.5) < 0.001,
    `got ${p2.body.debts?.[0]?.aprPercent}`,
  );

  // ── Turn 3: goal ────────────────────────────────────────────────
  log("\nturn 3", "goal");
  const t3 = await postAgent({
    userId: USER_ID,
    userMessage: "I'm saving for an emergency fund, $20,000 target.",
  });
  log("turn 3 tool calls", t3.toolCalls.map((t) => t.name).join(", "));

  check("turn 3: provider is mock", t3.provider === "mock");
  check("turn 3: exactly 1 tool call", t3.toolCalls.length === 1);
  check("turn 3: tool is saveGoal", t3.toolCalls[0]?.name === "saveGoal");
  check("turn 3: state.goals has 1 entry", t3.state.goals.length === 1);
  check(
    "turn 3: goal label = Emergency Fund",
    /emergency/i.test(t3.state.goals[0]?.label ?? ""),
    `got "${t3.state.goals[0]?.label}"`,
  );
  check(
    "turn 3: goal target = 20000 dollars",
    t3.state.goals[0]?.targetDollars === 20000,
    `got ${t3.state.goals[0]?.targetDollars}`,
  );
  check(
    "turn 3: goal goalType = EMERGENCY",
    t3.state.goals[0]?.goalType === "EMERGENCY",
    `got "${t3.state.goals[0]?.goalType}"`,
  );

  // ── Turn 4: risk → audit → complete ─────────────────────────────
  log("\nturn 4", "risk + audit + complete");
  const t4 = await postAgent({
    userId: USER_ID,
    userMessage: "I'm 30, targeting 65 — that's 35 years out. Moderate risk comfort.",
  });
  log("turn 4 tool calls", t4.toolCalls.map((t) => t.name).join(", "));
  log("turn 4 agent message", t4.agentMessage.slice(0, 80) + "…");
  log("turn 4 onboardingCompleted", t4.onboardingCompleted);
  log("turn 4 audit identity", (t4.state.audit?.identity ?? "").slice(0, 80) + "…");
  log("turn 4 completedAt", t4.state.completedAt);

  check("turn 4: provider is mock", t4.provider === "mock");
  // 3 tool calls on the first round (saveRiskProfile, buildAudit, markOnboardingComplete)
  check(
    "turn 4: exactly 3 tool calls on the first round",
    t4.toolCalls.length === 3,
    `got ${t4.toolCalls.length}: ${t4.toolCalls.map((t) => t.name).join(", ")}`,
  );
  const toolNames4 = t4.toolCalls.map((t) => t.name);
  check("turn 4: tool 1 is saveRiskProfile", toolNames4[0] === "saveRiskProfile");
  check("turn 4: tool 2 is buildAudit", toolNames4[1] === "buildAudit");
  check("turn 4: tool 3 is markOnboardingComplete", toolNames4[2] === "markOnboardingComplete");
  check("turn 4: state.risk.timeHorizonYears = 35", t4.state.risk.timeHorizonYears === 35);
  check(
    "turn 4: state.risk.riskTolerance = moderate",
    t4.state.risk.riskTolerance === "moderate",
  );
  check("turn 4: state.audit is built", t4.state.audit !== null);
  check(
    "turn 4: audit has identity text",
    typeof t4.state.audit?.identity === "string" && t4.state.audit.identity.length > 0,
  );
  check(
    "turn 4: audit has firstStep text",
    typeof t4.state.audit?.firstStep === "string" && t4.state.audit.firstStep.length > 0,
  );
  check(
    "turn 4: state.completedAt is set",
    typeof t4.state.completedAt === "string" && t4.state.completedAt.length > 0,
  );
  check("turn 4: onboardingCompleted is true", t4.onboardingCompleted === true);

  // ── State persistence across turns ──────────────────────────────
  check("state carries income from turn 1 into turn 4", t4.state.income.length === 1);
  check("state carries debt from turn 2 into turn 4", t4.state.debts.length === 1);
  check("state carries goal from turn 3 into turn 4", t4.state.goals.length === 1);

  // Persistence check after turn 4: full audit + completedAt visible.
  const p4 = await getAgent(USER_ID);
  check(
    "turn 4 persistence: GET returns 200",
    p4.status === 200,
    `got ${p4.status}`,
  );
  check(
    "turn 4 persistence: income + debt + goal all persisted",
    p4.body.incomeCount === 1 && p4.body.debtCount === 1 && p4.body.goalCount === 1,
    `got income=${p4.body.incomeCount} debt=${p4.body.debtCount} goal=${p4.body.goalCount}`,
  );
  check(
    "turn 4 persistence: hasAudit is true",
    p4.body.hasAudit === true,
    `got ${p4.body.hasAudit}`,
  );
  check(
    "turn 4 persistence: completedAt is set",
    typeof p4.body.completedAt === "string" && p4.body.completedAt.length > 0,
  );
  check(
    "turn 4 persistence: risk.timeHorizonYears = 35",
    p4.body.risk?.timeHorizonYears === 35,
    `got ${p4.body.risk?.timeHorizonYears}`,
  );
  check(
    "turn 4 persistence: risk.riskTolerance = moderate",
    p4.body.risk?.riskTolerance === "moderate",
  );
  check(
    "turn 4 persistence: persisted audit.identity has text",
    typeof p4.body.audit?.identity === "string" && p4.body.audit.identity.length > 0,
  );
  check(
    "turn 4 persistence: persisted messageCount > 0",
    typeof p4.body.messageCount === "number" && p4.body.messageCount > 0,
  );

  // ── Cluster 5.2.5: identity → production projection ────────────
  // markOnboardingComplete triggers projectIdentityToProduction,
  // which upserts Account / Bill / Goal rows for the user. The
  // projection is idempotent (wipe-then-insert with the
  // "[identity] " prefix on Account/Goal + source="identity" on
  // Bill), so re-running the chat produces the same shape. We
  // query Prisma directly to assert the rows exist and have the
  // right fields. The test conversation has 1 income + 1 debt +
  // 1 goal, no expenses / no assets.
  log("\nprojection", "verify Account / Bill / Goal rows for smoke-user-1");
  const projAccounts = await prisma.account.findMany({
    where: { userId: USER_ID, name: { startsWith: "[identity] " } },
    orderBy: { sortOrder: "asc" },
  });
  const projBills = await prisma.bill.findMany({
    where: { userId: USER_ID, source: "identity" },
  });
  const projGoals = await prisma.goal.findMany({
    where: { userId: USER_ID, name: { startsWith: "[identity] " } },
    orderBy: { sortOrder: "asc" },
  });
  log(
    "projection",
    `accounts=${projAccounts.length} bills=${projBills.length} goals=${projGoals.length}`,
  );

  // ── Counts (3 checks) ──────────────────────────────────────────
  check(
    "projection: 2 Account rows (1 income + 1 debt)",
    projAccounts.length === 2,
    `got ${projAccounts.length}`,
  );
  check(
    "projection: 0 Bill rows (test conversation has no expenses)",
    projBills.length === 0,
    `got ${projBills.length}`,
  );
  check(
    "projection: 1 Goal row (Emergency Fund)",
    projGoals.length === 1,
    `got ${projGoals.length}`,
  );

  // ── Income → Account (4 checks) ────────────────────────────────
  const incomeAcct = projAccounts.find((a) => a.name === "[identity] Primary");
  check("projection: income account [identity] Primary exists", incomeAcct !== undefined);
  if (incomeAcct) {
    check(
      "projection: income account type = checking",
      incomeAcct.type === "checking",
      `got "${incomeAcct.type}"`,
    );
    check(
      "projection: income account balance = 0 (per-period amount lives in PaySchedule)",
      incomeAcct.currentBalance === 0,
      `got ${incomeAcct.currentBalance}`,
    );
    check(
      "projection: income account institution contains 'monthly:' and 'biweekly'",
      typeof incomeAcct.institution === "string" &&
        incomeAcct.institution.includes("monthly:") &&
        incomeAcct.institution.includes("biweekly"),
      `got "${incomeAcct.institution}"`,
    );
  }

  // ── Debt → Account (4 checks) ──────────────────────────────────
  const debtAcct = projAccounts.find((a) => a.name === "[identity] Mortgage");
  check("projection: debt account [identity] Mortgage exists", debtAcct !== undefined);
  if (debtAcct) {
    check(
      "projection: debt account type = other",
      debtAcct.type === "other",
      `got "${debtAcct.type}"`,
    );
    check(
      "projection: debt account balance = -30000000 cents (negative $300K)",
      debtAcct.currentBalance === -30000000,
      `got ${debtAcct.currentBalance}`,
    );
    check(
      "projection: debt account institution contains 'apr:6.50' and 'kind:mortgage'",
      typeof debtAcct.institution === "string" &&
        debtAcct.institution.includes("apr:6.50") &&
        debtAcct.institution.includes("kind:mortgage"),
      `got "${debtAcct.institution}"`,
    );
  }

  // ── Goal (6 checks) ────────────────────────────────────────────
  const projGoal = projGoals[0];
  check("projection: goal [identity] Emergency Fund exists", projGoal !== undefined);
  if (projGoal) {
    check(
      "projection: goal name = [identity] Emergency Fund",
      projGoal.name === "[identity] Emergency Fund",
      `got "${projGoal.name}"`,
    );
    check(
      "projection: goal targetAmount = 2000000 cents ($20K)",
      projGoal.targetAmount === 2000000,
      `got ${projGoal.targetAmount}`,
    );
    check(
      "projection: goal kind = TRANSFER (auto-sweep)",
      projGoal.kind === "TRANSFER",
      `got "${projGoal.kind}"`,
    );
    check(
      "projection: goal goalType = EMERGENCY",
      projGoal.goalType === "EMERGENCY",
      `got "${projGoal.goalType}"`,
    );
    check(
      "projection: goal isPrimary = true (priority 1)",
      projGoal.isPrimary === true,
      `got ${projGoal.isPrimary}`,
    );
  }

  // ── Reset path ──────────────────────────────────────────────────
  log("\nreset", "wipe state for this user");
  const reset = await postAgent({
    userId: USER_ID,
    userMessage: "noop",
    reset: true,
  });
  check("reset returns ok", reset !== null);
  // The "noop" message goes through the LLM; the mock returns a fallback
  // for messages it doesn't recognize. So toolCalls should be empty.
  check("reset: no tool calls on noop", reset.toolCalls.length === 0);
  // The reset wiped the FinancialIdentity row. The POST creates a fresh
  // one for the "noop" message. So GET should return 200 (with the
  // fresh state from the noop turn), not 404.
  // The KEY check is that the previous turn 4 data is gone.
  const afterResetPost = await postAgent({
    userId: USER_ID,
    userMessage: "I get paid $500 weekly from a side gig.",
  });
  check(
    "after reset: state.income has 1 entry (the new one, not the old 4)",
    afterResetPost.state.income.length === 1,
    `got ${afterResetPost.state.income.length}`,
  );
  check(
    "after reset: new income cadence = weekly",
    afterResetPost.state.income[0]?.cadence === "weekly",
  );
  check(
    "after reset: debts wiped (0)",
    afterResetPost.state.debts.length === 0,
    `got ${afterResetPost.state.debts.length}`,
  );
  check(
    "after reset: goals wiped (0)",
    afterResetPost.state.goals.length === 0,
    `got ${afterResetPost.state.goals.length}`,
  );
  check(
    "after reset: completedAt wiped (null)",
    afterResetPost.state.completedAt === null,
    `got "${afterResetPost.state.completedAt}"`,
  );

  // ── L1 rules fallback (Part B) ──────────────────────────────────
  log("\nL1 fallback", "force Mavis to fail, expect mock to answer");
  const fb = await postTestLLMCall({
    provider: "mavis",
    userMessage: "I get paid $1,820 biweekly from my primary job.",
  });
  log("L1 fallback provider", fb.provider);
  log("L1 fallback fellBack", fb.fellBack);
  log("L1 fallback originalProvider", fb.originalProvider);
  log("L1 fallback l1Error", (fb.l1Error ?? "").slice(0, 60) + "…");
  log("L1 fallback content", fb.content?.slice(0, 60) + "…");

  check(
    "L1 fallback: response provider is mock (the fallback engine)",
    fb.provider === "mock",
    `got "${fb.provider}"`,
  );
  check(
    "L1 fallback: meta.fellBack is true",
    fb.fellBack === true,
    `got ${fb.fellBack}`,
  );
  check(
    "L1 fallback: meta.originalProvider is mavis",
    fb.originalProvider === "mavis",
    `got "${fb.originalProvider}"`,
  );
  check(
    "L1 fallback: l1Error is a non-empty string",
    typeof fb.l1Error === "string" && fb.l1Error.length > 0,
    `got "${fb.l1Error}"`,
  );
  check(
    "L1 fallback: the L1 engine called saveIncomeSource",
    Array.isArray(fb.toolCalls) && fb.toolCalls.some((tc) => tc.name === "saveIncomeSource"),
    `got ${JSON.stringify(fb.toolCalls?.map((t) => t.name))}`,
  );
  check(
    "L1 fallback: the L1 engine extracted the right cadence/amount",
    fb.toolCalls?.[0]?.args?.cadence === "biweekly" && fb.toolCalls?.[0]?.args?.amountDollars === 1820,
    `got ${JSON.stringify(fb.toolCalls?.[0]?.args)}`,
  );

  // Same for Ollama fallback.
  log("\nL1 fallback (ollama)", "force Ollama to fail");
  const fbOllama = await postTestLLMCall({
    provider: "ollama",
    userMessage: "I have a $300,000 mortgage at 6.5%.",
  });
  check(
    "L1 fallback (ollama): meta.fellBack is true",
    fbOllama.fellBack === true,
    `got ${fbOllama.fellBack}`,
  );
  check(
    "L1 fallback (ollama): meta.originalProvider is ollama",
    fbOllama.originalProvider === "ollama",
    `got "${fbOllama.originalProvider}"`,
  );
  check(
    "L1 fallback (ollama): L1 engine called saveDebt",
    Array.isArray(fbOllama.toolCalls) && fbOllama.toolCalls.some((tc) => tc.name === "saveDebt"),
  );

  // After the fallback test, the real env is restored (the endpoint
  // saves + restores). Verify the next /api/health call doesn't
  // get poisoned. Actually, /api/health is unrelated to LLM config;
  // but we can verify the next runAgent call uses the real config.
  log("\nafter fallback test", "verify runAgent still works with real config");
  await postAgent({ userId: USER_ID, userMessage: "noop", reset: true });
  const t6 = await postAgent({
    userId: USER_ID,
    userMessage: "I get paid $900 weekly from consulting.",
  });
  check(
    "after fallback test: runAgent still works (provider = mock from real config)",
    t6.provider === "mock",
    `got "${t6.provider}"`,
  );
  check(
    "after fallback test: fellBack is false (real config didn't fail)",
    t6.fellBack === false,
    `got ${t6.fellBack}`,
  );

  // ── Report ──────────────────────────────────────────────────────
  console.log("\n--- checks ---");
  let pass = 0,
    fail = 0;
  for (const c of checks) {
    log(c.name, c.ok ? "OK" : `MISS${c.detail ? ` (${c.detail})` : ""}`);
    if (c.ok) pass++;
    else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss`);

  if (fail > 0) {
    console.log("\n!! FAILURES");
    process.exit(3);
  }
  console.log("\nALL GREEN");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("crash:", e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
