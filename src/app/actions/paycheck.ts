"use server";

/**
 * Paycheck server actions.
 *
 * Per 00-DESIGN.md D12: when an AllocationPlan is armed, every paycheck
 * triggers the allocation engine immediately and silently — no confirm
 * modal, no friction. The engine runs, the balances update, the audit
 * log records it, and the user sees the post-hoc summary on the
 * dashboard.
 *
 * These actions are the in-memory stand-in for the real `Transaction`
 * insert + onInsert allocation hook that the Prisma layer will own in
 * Cluster 2. The contract is identical: feed in a paycheck amount,
 * receive back the ledger transfers + summary.
 */

import { revalidatePath } from "next/cache";
import {
  runAllocation,
  applyAllocation,
  readEnvelopes,
  readGoals,
  readPlan,
  type AllocationRunResult,
} from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface SimulatePaycheckResult {
  ok: boolean;
  reason?: string;
  run?: AllocationRunResult;
  envelopesAfter?: ReturnType<typeof readEnvelopes>;
  goalsAfter?: ReturnType<typeof readGoals>;
  planArmed?: boolean;
}

export async function simulatePaycheck(
  _prev: SimulatePaycheckResult | null,
  formData: FormData,
): Promise<SimulatePaycheckResult> {
  await requireUser();

  const amountRaw = formData.get("amount");
  const sourceRaw = formData.get("source");
  // The form sends dollars (e.g. "1820" = $1,820.00); convert to cents.
  const dollars = Number.parseFloat(String(amountRaw ?? "0")) || 0;
  const amountCents = Math.max(0, Math.round(dollars * 100));
  const source =
    String(sourceRaw ?? "").trim() || "ADP paycheck (simulated)";

  if (amountCents <= 0) {
    return {
      ok: false,
      reason: "Enter a paycheck amount greater than $0.",
    };
  }

  const plan = readPlan();
  if (!plan.isArmed) {
    return {
      ok: false,
      reason: "Allocation plan is not armed. Open the Plan to arm it before running a paycheck.",
      planArmed: false,
    };
  }

  // Run the engine against current store state, then apply the
  // transfers. runAllocation is pure; applyAllocation mutates.
  const result = runAllocation(amountCents, source);
  applyAllocation(result);

  // Re-read so the response carries the post-state for the banner
  const envelopesAfter = readEnvelopes();
  const goalsAfter = readGoals();

  // Refresh everything that shows balance state
  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath("/goals");
  revalidatePath("/period");
  revalidatePath("/insights");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/allocation");
  revalidatePath("/calendar");

  return {
    ok: true,
    run: result,
    envelopesAfter,
    goalsAfter,
    planArmed: true,
  };
}

export async function resetCompassState(
  _prev: SimulatePaycheckResult | null,
  _formData: FormData,
): Promise<SimulatePaycheckResult> {
  // Re-export the reset from the store. Useful for QA + the "start
  // over" link on the celebration banner. Auth-gated like the rest.
  await requireUser();
  const { resetStore } = await import("@/lib/store");
  resetStore();

  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath("/goals");
  revalidatePath("/period");
  revalidatePath("/insights");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/allocation");
  revalidatePath("/calendar");

  return { ok: true };
}
