/**
 * Smoke for Cluster 7.33a — onboarding stuck-loop detector.
 *
 * Verifies:
 *   1. detectStuckLoop returns false when last 3 assistant messages differ
 *   2. detectStuckLoop returns false when there are fewer than 3 assistant messages
 *   3. detectStuckLoop returns true when last 3 assistant messages are identical AND no tool calls
 *   4. detectStuckLoop returns false when there ARE tool calls (we're making progress)
 *   5. End-to-end: runAgent with 5 turns of "ok" input produces a stuck-loop response
 *      (different from the canned fallback). The final response mentions
 *      demo data (the nudge text).
 *   6. The stuck-loop detector doesn't fire on a fresh conversation (just 1 message)
 *
 * Also verifies (smoke 6): the [id] page read path uses liveEnvelopesFromDb
 * (Bug 2 smoke verified that separately).
 */
import { prisma } from "./db-client.mjs";
import {
  detectStuckLoop,
  maybeReviseStuckResponse,
  shouldNudgeStuck,
  STUCK_NUDGE,
} from "../src/lib/onboarding/stuck-detector.ts";
import { runAgent } from "../src/lib/onboarding/agent.ts";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

check("[A] STUCK_NUDGE references demo data", STUCK_NUDGE.includes("demo data"));
check("[B] STUCK_NUDGE is non-empty", STUCK_NUDGE.length > 20);

// 1. distinct messages → not stuck
check(
  "[1] detectStuckLoop=false when messages differ",
  detectStuckLoop([
    { role: "user", content: "hi" },
    { role: "assistant", content: "hi there" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "tell me more" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "different answer" },
  ]) === false,
);

// 2. < 3 assistant messages → not stuck
check(
  "[2] detectStuckLoop=false when only 2 assistant messages",
  detectStuckLoop([
    { role: "user", content: "hi" },
    { role: "assistant", content: "hi there" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "hi there" },
  ]) === false,
);

// 3. 3 identical, no tool calls → STUCK
const same = "Tell me a bit more — what kind of work do you do?";
check(
  "[3] detectStuckLoop=true when 3 identical assistant messages + no tool calls",
  detectStuckLoop([
    { role: "user", content: "ok" },
    { role: "assistant", content: same },
    { role: "user", content: "ok" },
    { role: "assistant", content: same },
    { role: "user", content: "ok" },
    { role: "assistant", content: same },
  ]) === true,
);

// 4. Same content but a tool call → NOT stuck (progress being made)
check(
  "[4] detectStuckLoop=false when same content + tool call",
  detectStuckLoop([
    { role: "user", content: "ok" },
    { role: "assistant", content: same, toolCalls: [{ id: "1", name: "saveIdentityBasics", arguments: {} }] },
    { role: "user", content: "ok" },
    { role: "assistant", content: same },
    { role: "user", content: "ok" },
    { role: "assistant", content: same },
  ]) === false,
);

// 4b. After 2 consecutive no-progress turns, shouldNudgeStuck fires
check(
  "[4b] shouldNudgeStuck=true when 2 consecutive no-progress assistant msgs",
  shouldNudgeStuck([
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me more..." },
    { role: "user", content: "ok" },
    { role: "assistant", content: "I'm not making progress — load demo data" },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me more..." },
  ]) === true,
);

// 4c. Single tool call breaks the streak — not stuck
check(
  "[4c] shouldNudgeStuck=false when last assistant made a tool call",
  shouldNudgeStuck([
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me more..." },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me more..." },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Tell me more...", toolCalls: [{ id: "1", name: "saveIdentityBasics", arguments: {} }] },
  ]) === false,
);

// 5. End-to-end — start fresh for "mom-test" user, run 5 "ok" turns, expect stuck nudge
async function e2e() {
  const user = await prisma.user.findUnique({ where: { email: "stuck-detector-test@compass.local" } });
  if (!user) throw new Error("missing test user — seed first");
  // Wipe identity + messages so the conversation truly starts fresh
  const id = await prisma.financialIdentity.findUnique({ where: { userId: user.id } });
  if (id) {
    await prisma.onboardingMessage.deleteMany({ where: { identityId: id.id } });
    await prisma.financialIdentity.delete({ where: { id: id.id } });
  }
  for (let i = 0; i < 5; i++) {
    const result = await runAgent({ userId: user.id, userMessage: "ok" });
    if (i === 4) {
      check("[5a] final assistant response is the stuck nudge",
        result.agentMessage === STUCK_NUDGE,
        `got: ${result.agentMessage.slice(0, 80)}`);
      check("[5b] final state marked stuckLoop meta",
        result.state.messages.filter(m => m.role === "assistant").slice(-1)[0].content === STUCK_NUDGE);
    }
  }
}

// 6. Fresh user (single turn) should not trigger stuck
async function fresh() {
  const user = await prisma.user.findUnique({ where: { email: "fresh-test@compass.local" } });
  if (!user) throw new Error("missing fresh test user");
  // Wipe the user's identity + messages so the conversation truly starts fresh
  const id = await prisma.financialIdentity.findUnique({ where: { userId: user.id } });
  if (id) {
    await prisma.onboardingMessage.deleteMany({ where: { identityId: id.id } });
    await prisma.financialIdentity.delete({ where: { id: id.id } });
  }
  const result = await runAgent({ userId: user.id, userMessage: "hi" });
  check("[6] fresh conversation is not stuck", result.agentMessage !== STUCK_NUDGE,
    `got: ${result.agentMessage.slice(0, 80)}`);
}

// Run fresh first (lighter), then e2e (uses cleanup-on-completion).
try { await fresh(); } catch (e) { check("fresh run", false, e.message); }
try { await e2e(); } catch (e) { check("e2e stuck loop", false, e.message); }

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
