"use server";

/**
 * Goal server actions (Cluster 1.10).
 *
 * - logGoal() — "+ New goal" form on /goals
 * - saveGoalEdit() — Edit Goal form at /goals/[id]/edit
 *
 * The primary action: add a new goal from the "+ New goal" form
 * on /goals. The form sends dollars (human-readable) and the
 * server converts to cents. If the new goal is set as the top
 * priority, the previous primary is demoted in the same transaction.
 *
 * Cluster 7.32d — these now delegate to `createGoalToDb` /
 * `updateGoalToDb`. They used to call `addGoal`/`updateGoal` in
 * `@/lib/store`, which mutate process memory while `/goals` reads
 * Prisma, so a save reported success and vanished on refresh.
 */

import { revalidatePath } from "next/cache";
import { createGoalToDb, updateGoalToDb } from "@/lib/goal-db";
import { requireUser } from "@/server/auth/user";

export interface AddGoalResult {
  ok: boolean;
  reason?: string;
  goalId?: string;
}

export async function logGoal(
  _prev: AddGoalResult | null,
  formData: FormData,
): Promise<AddGoalResult> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter");
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));
  const perPaycheckDollars = Number.parseFloat(
    String(formData.get("perPaycheck") ?? ""),
  );
  const targetDateRaw = String(formData.get("targetDate") ?? "");
  const envelopeId = String(formData.get("envelopeId") ?? "") || null;
  const isPrimary = formData.get("isPrimary") === "on";

  if (name.length === 0) {
    return { ok: false, reason: "Give the goal a name." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars <= 0) {
    return { ok: false, reason: "Set a target greater than $0." };
  }
  if (!Number.isFinite(perPaycheckDollars) || perPaycheckDollars < 0) {
    return { ok: false, reason: "Per-paycheck amount must be $0 or more." };
  }
  if (!targetDateRaw) {
    return { ok: false, reason: "Set a target date." };
  }

  const result = await createGoalToDb({
    userId: user.id,
    name,
    description: description || `Saving toward ${name}.`,
    planet,
    targetCents: Math.round(targetDollars * 100),
    targetDate: new Date(targetDateRaw),
    envelopeId,
    perPaycheckCents: Math.round(perPaycheckDollars * 100),
    isPrimary,
  });

  if (!result.ok || !result.goalId) {
    return { ok: false, reason: result.reason ?? "Could not save the goal." };
  }

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${result.goalId}`);

  return { ok: true, goalId: result.goalId };
}

/**
 * Update an existing goal. Used by the Edit Goal form at
 * /goals/[id]/edit (Cluster 1.10). The form sends the goal id as
 * a hidden field, plus all the editable fields.
 */
export async function saveGoalEdit(
  _prev: AddGoalResult | null,
  formData: FormData,
): Promise<AddGoalResult> {
  const user = await requireUser();

  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { ok: false, reason: "Missing goal id." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter");
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));
  const perPaycheckDollars = Number.parseFloat(
    String(formData.get("perPaycheck") ?? ""),
  );
  const targetDateRaw = String(formData.get("targetDate") ?? "");
  const envelopeId = String(formData.get("envelopeId") ?? "") || null;
  const isPrimary = formData.get("isPrimary") === "on";

  if (name.length === 0) {
    return { ok: false, reason: "Give the goal a name." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars <= 0) {
    return { ok: false, reason: "Set a target greater than $0." };
  }
  if (!Number.isFinite(perPaycheckDollars) || perPaycheckDollars < 0) {
    return { ok: false, reason: "Per-paycheck amount must be $0 or more." };
  }
  if (!targetDateRaw) {
    return { ok: false, reason: "Set a target date." };
  }

  const result = await updateGoalToDb({
    userId: user.id,
    goalId,
    name,
    description,
    planet,
    targetCents: Math.round(targetDollars * 100),
    targetDate: new Date(targetDateRaw),
    envelopeId,
    perPaycheckCents: Math.round(perPaycheckDollars * 100),
    isPrimary,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the goal." };
  }

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);

  return { ok: true, goalId: result.goalId };
}
