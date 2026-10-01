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
import { applyPaycheck } from "@/lib/apply-paycheck";
import {
  readEnvelopes,
  readGoals,
  type AllocationRunResult,
} from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface SimulatePaycheckResult {
  ok: boolean;
  /** True when this exact paycheck was already applied in this period. */
  skipped?: boolean;
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
  const user = await requireUser();

  const amountRaw = formData.get("amount");
  const sourceRaw = formData.get("source");
  // The form sends dollars (e.g. "1820" = $1,820.00); convert to cents.
  const dollars = Number.parseFloat(String(amountRaw ?? "0")) || 0;
  const amountCents = Math.max(0, Math.round(dollars * 100));
  const source =
    String(sourceRaw ?? "").trim() || "ADP paycheck (simulated)";

  // This now writes through Prisma in one transaction, guarded by the
  // PaycheckRun unique key. It used to mutate the process-local store,
  // which no page read — so a paycheck moved money the user never saw and
  // lost it on restart. See src/lib/apply-paycheck.ts.
  const applied = await applyPaycheck({
    userId: user.id,
    paycheckCents: amountCents,
    source,
    trigger: "manual",
  });

  if (!applied.ok) {
    return {
      ok: false,
      reason: applied.reason,
      planArmed: applied.planArmed,
    };
  }

  // A repeat of the same paycheck this period: the database refused it
  // and nothing changed. Say so plainly rather than showing the previous
  // run's numbers as if they were new.
  if (applied.skipped) {
    return {
      ok: true,
      skipped: true,
      reason: applied.reason,
      planArmed: true,
    };
  }

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
    run: applied.run,
    planArmed: true,
  };
}

export async function resetCompassState(
  _prev: SimulatePaycheckResult | null,
  _formData: FormData,
): Promise<SimulatePaycheckResult> {
  // Re-export the reset from the store. Useful for QA + the "start
  // over" link on the celebration banner. Auth-gated like the rest.
  const user = await requireUser();
  const { resetStore } = await import("@/lib/store");
  resetStore(user.id);

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
