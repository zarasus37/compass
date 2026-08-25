/**
 * Smoke for the onboarding agent pipeline.
 *
 * Cluster 5.0 Part A. The smoke drives a scripted 4-turn conversation
 * against the dev-only /api/_dev/run-agent endpoint. The endpoint
 * uses the in-process state + the mock LLM provider by default; the
 * smoke is deterministic and fast.
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
 *
 * What the smoke does NOT verify:
 *   - Mavis provider (no API key in test env).
 *   - Ollama provider (no local server in test env).
 *   - The actual LLM's quality of responses. The mock is a stub.
 *   - Persistence (Part B). v1 state is in-memory.
 *
 * Run with: node tests/smoke-onboarding-agent.mjs
 */

const BASE = "http://127.0.0.1:3000";
const ENDPOINT = `${BASE}/api/dev-agent/run-agent`;

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

const checks = [];
function check(name, cond, detail) {
  checks.push({ name, ok: Boolean(cond), detail });
}

async function main() {
  console.log("--- Onboarding agent smoke ---\n");

  const USER_ID = "smoke-user-1";

  // Reset before we start.
  await postAgent({ userId: USER_ID, userMessage: "noop", resetAll: true });

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
  log("turn 1 income count", t1.state.income.length);

  check("turn 1: provider is mock", t1.provider === "mock");
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
  // After reset, the income array should be empty (the reset wiped it).
  // We verify by sending a follow-up turn and checking state.
  const t5 = await postAgent({
    userId: USER_ID,
    userMessage: "I get paid $500 weekly from a side gig.",
  });
  check("after reset: state.income has 1 entry (the new one)", t5.state.income.length === 1);
  check(
    "after reset: new income cadence = weekly",
    t5.state.income[0]?.cadence === "weekly",
  );
  check(
    "after reset: debts wiped (0)",
    t5.state.debts.length === 0,
    `got ${t5.state.debts.length}`,
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
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
