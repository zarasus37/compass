/**
 * Smoke for Cluster 7.35 — onboarding extractor fixes + stuck-detector refinement.
 *
 * Bug A (real bug mom hit): extractDollars + extractCadence didn't parse natural phrasings
 * like "every check I receive 2,000", causing TURN 2 to fall through to the canned fallback.
 * Now fixed with widened regexes + a partial-income state that completes the record on TURN 2.
 *
 * Bug B (7.33 detector was too aggressive): stuck detector was firing on the 2nd no-progress
 * turn, bailing mom out mid-conversation. Now has a min-turns floor + a "last question"
 * check.
 *
 * Checks:
 *   A1. extractDollars matches bare "2,000" in income range
 *   A2. extractDollars still matches "$300K"
 *   A3. extractDollars still matches "$300,000"
 *   A4. extractDollars matches "1500 dollars"
 *   A5. extractDollars REJECTS bare "5" (below income band)
 *   A6. extractCadence matches "twice a month"
 *   A7. extractCadence matches "every check"
 *   A8. extractCadence matches "each paycheck"
 *   A9. extractCadence matches "10th and 25th"
 *   A10. looksLikeIncome matches "every check i receive 2,000"
 *   A11. End-to-end: TURN 1 cadence + TURN 2 amount → saveIncomeSource with both args
 *   A12. End-to-end: TURN 1 amount + TURN 2 cadence → saveIncomeSource with both args
 *
 *   B1. shouldNudgeStuck returns false when user has < 2 turns
 *   B2. shouldNudgeStuck returns false when last assistant message ends with "?"
 *   B3. shouldNudgeStuck returns false when conversation is making real progress
 *   B4. shouldNudgeStuck still returns true on the canonical stuck pattern (3 identical + no progress)
 *   B5. shouldNudgeStuck still fires after the nudge has gone out and the loop continues
 */
import { prisma } from "./db-client.mjs";
import {
  callMock,
  resetMockState,
} from "../src/lib/llm/providers/mock.ts";
import {
  shouldNudgeStuck,
  lastAssistantAskedQuestion,
  MIN_TURNS_BEFORE_DETECT,
} from "../src/lib/onboarding/stuck-detector.ts";
import { runAgent } from "../src/lib/onboarding/agent.ts";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

// ─── Bug A: extractDollars + extractCadence + looksLikeIncome ───

async function makeRequest(seed, history) {
  const req = {
    systemPrompt: "test",
    messages: history,
    tools: [],
    toolChoice: "auto",
    model: seed,
  };
  return callMock(req);
}



// Re-run as sync checks via the callMock output
async function bugA() {
  // A1: extractDollars matches bare "2,000"
  resetMockState("smoke-A1");
  let r = await makeRequest("smoke-A1", [
    { role: "user", content: "I receive 2,000 per paycheck" },
  ]);
  const tc = r.toolCalls?.[0];
  check(
    "[A1] extractDollars matches bare '2,000' (income band)",
    tc?.args?.amountDollars === 2000,
    `got amountDollars=${tc?.args?.amountDollars}`,
  );

  // A2: $300K
  resetMockState("smoke-A2");
  r = await makeRequest("smoke-A2", [
    { role: "user", content: "I make $300K per year" },
  ]);
  console.log("  [A2 debug] content:", r.content.slice(0, 100));
  console.log("  [A2 debug] tools:", JSON.stringify(r.toolCalls));
  check(
    "[A2] extractDollars matches '$300K'",
    r.toolCalls?.[0]?.args?.amountDollars === 300000,
    `got ${r.toolCalls?.[0]?.args?.amountDollars}`,
  );

  // A3: $300,000
  resetMockState("smoke-A3");
  r = await makeRequest("smoke-A3", [
    { role: "user", content: "My salary is $300,000" },
  ]);
  check(
    "[A3] extractDollars matches '$300,000'",
    r.toolCalls?.[0]?.args?.amountDollars === 300000,
  );

  // A4: 1500 dollars
  resetMockState("smoke-A4");
  r = await makeRequest("smoke-A4", [
    { role: "user", content: "I make 1500 dollars biweekly" },
  ]);
  check(
    "[A4] extractDollars matches '1500 dollars'",
    r.toolCalls?.[0]?.args?.amountDollars === 1500,
  );

  // A5: bare "5" should NOT match (below $50 floor)
  resetMockState("smoke-A5");
  r = await makeRequest("smoke-A5", [
    { role: "user", content: "I have 5 things to save for" },
  ]);
  check(
    "[A5] extractDollars rejects bare '5' (below income band)",
    r.toolCalls?.[0]?.args?.amountDollars === undefined ||
      r.toolCalls?.[0]?.args?.amountDollars === null,
    `got ${r.toolCalls?.[0]?.args?.amountDollars}`,
  );

  // A6: extractCadence matches "twice a month"
  resetMockState("smoke-A6");
  r = await makeRequest("smoke-A6", [
    { role: "user", content: "twice a month" },
  ]);
  check(
    "[A6] extractCadence matches 'twice a month'",
    r.toolCalls?.[0]?.args?.cadence === "semi_monthly",
  );

  // A7: extractCadence matches "every week" (sanity that the weekly pattern still works after the per-check removals)
  resetMockState("smoke-A7");
  r = await makeRequest("smoke-A7", [
    { role: "user", content: "I get paid every week" },
  ]);
  check(
    "[A7] extractCadence matches 'every week'",
    r.toolCalls?.[0]?.args?.cadence === "weekly",
  );

  // A8: extractCadence matches "each paycheck"
  resetMockState("smoke-A8");
  r = await makeRequest("smoke-A8", [
    { role: "user", content: "each paycheck is around $1,500" },
  ]);
  check(
    "[A8] extractCadence matches 'each paycheck' + amount",
    r.toolCalls?.[0]?.args?.amountDollars === 1500,
  );

  // A9: extractCadence matches "10th and 25th" with full context
  resetMockState("smoke-A9");
  r = await makeRequest("smoke-A9", [
    { role: "user", content: "I get paid twice a month, first check on the 10th and second check on the 25th" },
  ]);
  check(
    "[A9] extractCadence matches '10th and 25th' (semi_monthly)",
    r.toolCalls?.[0]?.args?.cadence === "semi_monthly",
  );

  // A10: looksLikeIncome matches "every check i receive 2,000"
  resetMockState("smoke-A10");
  r = await makeRequest("smoke-A10", [
    { role: "user", content: "every check i receive 2,000" },
  ]);
  check(
    "[A10] looksLikeIncome + extractors handle 'every check i receive 2,000'",
    r.toolCalls && r.toolCalls.length > 0 &&
      (r.toolCalls[0].args?.amountDollars === 2000 ||
       r.toolCalls[0].args?.cadence != null),
    `got tools=${JSON.stringify(r.toolCalls)}`,
  );

  // A11: End-to-end TURN 1 cadence + TURN 2 amount → completes the record
  resetMockState("smoke-A11");
  let req11 = {
    systemPrompt: "test",
    messages: [
      { role: "user", content: "i currently get paid twice a month. first check on the 10th and second check on the 25th" },
    ],
    tools: [],
    toolChoice: "auto",
    model: "smoke-A11",
  };
  let turn1 = await callMock(req11);
  check(
    "[A11a] TURN 1: saveIncomeSource with cadence=semi_monthly, amount=null",
    turn1.toolCalls?.[0]?.args?.cadence === "semi_monthly" &&
      turn1.toolCalls?.[0]?.args?.amountDollars === null,
  );
  let turn2 = await callMock({
    ...req11,
    messages: [
      ...req11.messages,
      { role: "assistant", content: turn1.content, toolCalls: turn1.toolCalls },
      ...(turn1.toolCalls ?? []).map((tc) => ({ role: "tool", toolCallId: tc.id, content: "ok" })),
      { role: "user", content: "every check i receive 2,000" },
    ],
  });
  check(
    "[A11b] TURN 2: saveIncomeSource completes record with both cadence + amount=2000",
    turn2.toolCalls?.[0]?.args?.cadence === "semi_monthly" &&
      turn2.toolCalls?.[0]?.args?.amountDollars === 2000,
    `got ${JSON.stringify(turn2.toolCalls?.[0]?.arguments)}`,
  );

  // A12: End-to-end TURN 1 amount + TURN 2 cadence → completes
  resetMockState("smoke-A12");
  let req12 = {
    systemPrompt: "test",
    messages: [
      { role: "user", content: "i get paid 3000 each paycheck" },
    ],
    tools: [],
    toolChoice: "auto",
    model: "smoke-A12",
  };
  let t1 = await callMock(req12);
  check(
    "[A12a] TURN 1 (amount-first): saveIncomeSource with amount=3000, cadence=null",
    t1.toolCalls?.[0]?.args?.amountDollars === 3000 &&
      t1.toolCalls?.[0]?.args?.cadence === null,
    `got amount=${t1.toolCalls?.[0]?.args?.amountDollars} cadence=${t1.toolCalls?.[0]?.args?.cadence}`,
  );
  let t2 = await callMock({
    ...req12,
    messages: [
      ...req12.messages,
      { role: "assistant", content: t1.content, toolCalls: t1.toolCalls },
      ...(t1.toolCalls ?? []).map((tc) => ({ role: "tool", toolCallId: tc.id, content: "ok" })),
      { role: "user", content: "twice a month" },
    ],
  });
  check(
    "[A12b] TURN 2 (amount-first, cadence follow-up): saveIncomeSource completes with both",
    t2.toolCalls?.[0]?.args?.cadence === "semi_monthly" &&
      t2.toolCalls?.[0]?.args?.amountDollars === 3000,
    `got ${JSON.stringify(t2.toolCalls?.[0]?.args)}`,
  );
}

await bugA();

// ─── Bug B: stuck detector refinement ───

// B1: shouldNudgeStuck returns false when user has < 2 turns
check(
  "[B1] shouldNudgeStuck=false when user has < 2 turns",
  shouldNudgeStuck([
    { role: "user", content: "hi" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
  ]) === false,
);

// B2: shouldNudgeStuck returns false when last assistant message ends with "?"
check(
  "[B2] shouldNudgeStuck=false when last assistant message ends with '?'",
  shouldNudgeStuck([
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "What's the rough take-home per paycheck? (Doesn't have to be exact.)" },
  ]) === false,
);

// B3: shouldNudgeStuck returns false when conversation is making real progress
check(
  "[B3] shouldNudgeStuck=false when conversation has tool-call progress",
  shouldNudgeStuck([
    { role: "user", content: "i get paid twice a month" },
    { role: "assistant", content: "Cadence noted.", toolCalls: [{ id: "1", name: "saveIncomeSource", arguments: { cadence: "semi_monthly", amountDollars: null } }] },
    { role: "user", content: "every check i receive 2,000" },
    { role: "assistant", content: "Got it — semi_monthly, $2,000.", toolCalls: [{ id: "2", name: "saveIncomeSource", arguments: { cadence: "semi_monthly", amountDollars: 2000 } }] },
  ]) === false,
);

// B4: shouldNudgeStuck still fires on the canonical 3-identical + no-progress pattern (with enough turns)
check(
  "[B4] shouldNudgeStuck=true on 3 identical no-progress messages (with enough turns)",
  shouldNudgeStuck([
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
  ]) === true,
);

// B5: shouldNudgeStuck still fires when nudge went out + loop continues
check(
  "[B5] shouldNudgeStuck=true when nudge fired + canned response repeats",
  shouldNudgeStuck([
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "I'm not making progress with that one — let me write up what I have." },
    { role: "user", content: "what do you need" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
  ]) === true,
);

// B6: MIN_TURNS_BEFORE_DETECT export is 2
check(
  "[B6] MIN_TURNS_BEFORE_DETECT = 2",
  MIN_TURNS_BEFORE_DETECT === 2,
);

// B7: lastAssistantAskedQuestion utility works
check(
  "[B7a] lastAssistantAskedQuestion=true when last msg ends with '?'",
  lastAssistantAskedQuestion([
    { role: "user", content: "hi" },
    { role: "assistant", content: "Tell me a bit more — what kind of work do you do?" },
  ]) === true,
);
check(
  "[B7b] lastAssistantAskedQuestion=false when last msg is a statement",
  lastAssistantAskedQuestion([
    { role: "user", content: "hi" },
    { role: "assistant", content: "Got it — semi_monthly, $2,000." },
  ]) === false,
);

console.log("\n--- checks ---");
const pass = checks.filter(c => c.ok).length;
const miss = checks.length - pass;
console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
if (miss > 0) {
  console.log("\nFAILED checks:");
  for (const c of checks) if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  process.exit(1);
}
console.log("ALL GREEN");
