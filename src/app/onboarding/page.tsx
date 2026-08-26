/**
 * /onboarding — the chat surface.
 *
 * Cluster 5.1. Server component that:
 *   - requires the user (handled by the layout)
 *   - loads the persisted conversation state (or fresh state if none)
 *   - computes the 8-milestone progress from the state's tool-call history
 *   - renders the ProgressRail + ProviderBanner + ChatSurface
 *
 * `force-dynamic` so the state re-reads from Prisma on every request —
 * the page is interactive, not static. The chat then takes over the
 * in-memory state on the client and re-renders after each turn.
 */

import { requireUser } from "@/server/auth/user";
import { loadConversation } from "@/lib/onboarding/state";
import { ChatSurface } from "@/components/onboarding/ChatSurface";
import { ProgressRail, type Milestone } from "@/components/onboarding/ProgressRail";
import { ProviderBanner } from "@/components/onboarding/ProviderBanner";
import { DemoModeButton } from "@/components/onboarding/DemoModeButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MILESTONE_TOOL: Array<{ key: string; label: string; tool: string }> = [
  { key: "identity", label: "Identity", tool: "saveIdentityBasics" },
  { key: "income", label: "Income", tool: "saveIncomeSource" },
  { key: "expenses", label: "Expenses", tool: "saveFixedExpense" },
  { key: "debts", label: "Debts", tool: "saveDebt" },
  { key: "assets", label: "Assets", tool: "saveAsset" },
  { key: "goals", label: "Goals", tool: "saveGoal" },
  { key: "risk", label: "Risk profile", tool: "saveRiskProfile" },
  { key: "done", label: "Complete", tool: "markOnboardingComplete" },
];

export default async function OnboardingPage() {
  const user = await requireUser();
  // If the user already has a completed identity, the gate is
  // already past — but if they revisit /onboarding to start over,
  // we still render the page (the chat shows the existing state
  // + a Start over button). The redirect is for the dashboard;
  // here we let them re-enter the conversation if they want.
  const state = await loadConversation(user.id);

  const milestones = computeMilestones(state);

  // Show the "Use demo data" button when the user has no messages
  // yet (fresh visit) or has only the assistant's greeting (hasn't
  // actually started chatting). Hides once they're past the first
  // user message.
  const userMessageCount = state.messages.filter((m) => m.role === "user").length;
  const showDemoButton = !state.completedAt && userMessageCount === 0;

  return (
    <>
      <ProgressRail milestones={milestones} />
      <ProviderBanner
        provider={state.lastProvider}
        fellBack={state.lastFellBack}
        fallbackError={state.lastErrorMessage}
      />
      {showDemoButton ? <DemoModeButton /> : null}
      <ChatSurface initialState={state} milestones={milestones} />
    </>
  );
}

function computeMilestones(state: { messages: Array<{ role: string; content: string; toolCalls?: Array<{ name: string }> }> }): Milestone[] {
  // Walk the message log and collect distinct tool names. The
  // agent may call the same tool multiple times (e.g. a second
  // debt). We count the milestone done the first time the tool
  // is called.
  const calledTools = new Set<string>();
  for (const m of state.messages) {
    if (m.role === "assistant" && m.toolCalls) {
      for (const tc of m.toolCalls) {
        calledTools.add(tc.name);
      }
    }
  }
  // Find the first milestone that isn't done — that's "current".
  const statuses: Array<"done" | "current" | "upcoming"> = MILESTONE_TOOL.map(
    ({ tool }) => (calledTools.has(tool) ? "done" : "upcoming"),
  );
  const firstUpcoming = statuses.findIndex((s) => s === "upcoming");
  if (firstUpcoming !== -1) statuses[firstUpcoming] = "current";

  return MILESTONE_TOOL.map(({ key, label }, i) => ({
    key,
    label,
    status: statuses[i] ?? "upcoming",
  }));
}
