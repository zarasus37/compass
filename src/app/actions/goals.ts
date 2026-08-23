"use server";

/**
 * Goal server actions (Cluster 1.10).
 *
 * The primary action: add a new goal from the "+ New goal" form
 * on /goals. The form sends dollars (human-readable) and the
 * server converts to cents. If the new goal is set as the top
 * priority, any current primary goal is demoted first.
 */

import { revalidatePath } from "next/cache";
import { addGoal, updateGoal } from "@/lib/store";
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
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter") as
    | "sol" | "luna" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
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

  const result = addGoal({
    name,
    description: description || `Saving toward ${name}.`,
    planet,
    targetCents: Math.round(targetDollars * 100),
    currentCents: 0,
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
  if (result.goal) revalidatePath(`/goals/${result.goal.id}`);

  return { ok: true };
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
  await requireUser();

  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { ok: false, reason: "Missing goal id." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter") as
    | "sol" | "luna" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
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

  const result = updateGoal(goalId, {
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

  return { ok: true, goalId };
}
