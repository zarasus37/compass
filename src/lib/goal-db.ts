/**
 * Goal create/edit — the durable mutation service.
 *
 * WHY THIS EXISTS
 * ---------------
 * Same defect as the envelope forms: `logGoal` and `saveGoalEdit` called
 * `addGoal` / `updateGoal` in `@/lib/store`, which mutate
 * `getState(userId)` in process memory, while `/goals` reads from Prisma
 * via `liveGoalsFromDb`. A goal saved through the form reported success
 * and then vanished on refresh.
 *
 * THE PER-USER PRIMARY GOAL
 * -------------------------
 * The schema says "at most one per user (enforced in app code)" — it is
 * NOT a database constraint. So the demotion of the previous primary has
 * to happen in the same transaction as the promotion. Doing it outside
 * the transaction leaves a window where a user has two primary goals (or,
 * if the promotion fails after the demotion, zero).
 *
 * `currentAmount` is never written here. The allocation engine
 * (`apply-paycheck.ts`) owns it, exactly as the ledger owns an
 * envelope's `currentBalance`.
 */

import "server-only";
import { prisma } from "@/server/db";

export interface GoalFields {
  name: string;
  description?: string | null;
  planet?: string | null;
  targetCents: number;
  targetDate?: Date | null;
  envelopeId?: string | null;
  perPaycheckCents?: number;
  isPrimary?: boolean;
}

export interface CreateGoalInput extends GoalFields {
  userId: string;
}

export interface GoalResult {
  ok: boolean;
  reason?: string;
  goalId?: string;
}

export interface UpdateGoalInput extends Partial<GoalFields> {
  userId: string;
  goalId: string;
}

const VALID_PLANETS = new Set([
  "sol",
  "luna",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
]);

/** Shared field validation. Returns a user-facing reason, or null. */
function validate(input: GoalFields): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return "Give the goal a name.";
  }
  if (input.name.trim().length > 120) {
    return "That goal name is too long (120 characters max).";
  }
  if (!Number.isFinite(input.targetCents) || input.targetCents <= 0) {
    return "Set a target greater than $0.";
  }
  if (input.perPaycheckCents !== undefined) {
    if (
      !Number.isFinite(input.perPaycheckCents) ||
      input.perPaycheckCents < 0
    ) {
      return "Per-paycheck amount must be $0 or more.";
    }
  }
  if (input.targetDate !== undefined && input.targetDate !== null) {
    if (Number.isNaN(input.targetDate.getTime())) {
      return "That target date is not a real date.";
    }
  }
  return null;
}

/**
 * Verify a linked envelope belongs to this user.
 *
 * Called INSIDE the transaction so the check and the write see the same
 * snapshot. Returns a sentinel message that the caller maps to a
 * user-facing reason.
 */
async function assertEnvelopeOwned(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  envelopeId: string | null | undefined,
): Promise<void> {
  if (!envelopeId) return;
  const env = await tx.envelope.findFirst({
    where: { id: envelopeId, userId },
    select: { id: true },
  });
  if (!env) throw new Error("ENVELOPE_NOT_FOUND");
}

export async function createGoalToDb(
  input: CreateGoalInput,
): Promise<GoalResult> {
  const { userId } = input;

  const invalid = validate(input);
  if (invalid) return { ok: false, reason: invalid };

  const name = input.name.trim();
  const targetCents = Math.round(input.targetCents);
  // Validated in `validate()` above, then deliberately not persisted —
  // see the note at the create call. No column on `Goal` holds it.
  const wantsPrimary = input.isPrimary === true;

  try {
    const id = await prisma.$transaction(async (tx) => {
      await assertEnvelopeOwned(tx, userId, input.envelopeId);

      // Demote first, inside the same transaction as the promotion.
      if (wantsPrimary) {
        await tx.goal.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const last = await tx.goal.findFirst({
        where: { userId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const created = await tx.goal.create({
        data: {
          userId,
          name,
          description: input.description?.trim() || `Saving toward ${name}.`,
          source: "user",
          targetAmount: targetCents,
          // Money already banked toward this goal is the allocation
          // engine's to record, not the form's.
          currentAmount: 0,
          targetDate: input.targetDate ?? null,
          envelopeId: input.envelopeId || null,
          planet: input.planet && VALID_PLANETS.has(input.planet) ? input.planet : null,
          isPrimary: wantsPrimary,
          kind: "TRANSFER",
          sortOrder: (last?.sortOrder ?? 0) + 1,
          // NOTE: `perPaycheckCents` is accepted and validated but NOT
          // persisted. The production `Goal` model has no such column —
          // only `IdentityGoal` does, and that is the onboarding
          // projection, not this table. The old memory store kept the
          // value in process RAM (so it was lost on restart anyway);
          // adding a column is a schema change that belongs in its own
          // migration, not smuggled in here. Known gap, tracked.
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "goal_created",
          payload: JSON.stringify({
            summary: `Set the goal “${name}” — $${(targetCents / 100).toFixed(2)}.`,
            goalId: created.id,
            name,
            targetCents,
            envelopeId: input.envelopeId || null,
            isPrimary: wantsPrimary,
          }),
        },
      });

      return created.id;
    });

    return { ok: true, goalId: id };
  } catch (err) {
    if ((err as { message?: string })?.message === "ENVELOPE_NOT_FOUND") {
      return { ok: false, reason: "That vessel is not one of yours." };
    }
    console.error("[createGoalToDb] failed:", err);
    return { ok: false, reason: "Could not save the goal. Nothing was changed." };
  }
}

export async function updateGoalToDb(
  input: UpdateGoalInput,
): Promise<GoalResult> {
  const { userId, goalId } = input;

  if (!goalId) return { ok: false, reason: "Missing goal id." };

  // Build the update from what was supplied, so a partial edit (the
  // focused target form) does not blank the fields it never sent.
  const data: {
    name?: string;
    description?: string | null;
    planet?: string | null;
    targetAmount?: number;
    targetDate?: Date | null;
    envelopeId?: string | null;
    perPaycheckCents?: number;
    isPrimary?: boolean;
  } = {};

  if (input.name !== undefined) {
    const probe = validate({
      name: input.name,
      targetCents:
        input.targetCents !== undefined ? input.targetCents : Number.MAX_SAFE_INTEGER,
      perPaycheckCents: input.perPaycheckCents,
      targetDate: input.targetDate,
    });
    if (probe) return { ok: false, reason: probe };
    data.name = input.name.trim();
  }
  if (input.targetCents !== undefined) {
    if (!Number.isFinite(input.targetCents) || input.targetCents <= 0) {
      return { ok: false, reason: "Set a target greater than $0." };
    }
    data.targetAmount = Math.round(input.targetCents);
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.planet !== undefined) {
    data.planet = input.planet && VALID_PLANETS.has(input.planet) ? input.planet : null;
  }
  if (input.targetDate !== undefined) {
    if (input.targetDate !== null && Number.isNaN(input.targetDate.getTime())) {
      return { ok: false, reason: "That target date is not a real date." };
    }
    data.targetDate = input.targetDate ?? null;
  }
  if (input.perPaycheckCents !== undefined) {
    if (!Number.isFinite(input.perPaycheckCents) || input.perPaycheckCents < 0) {
      return { ok: false, reason: "Per-paycheck amount must be $0 or more." };
    }
    // Validated, then deliberately dropped — see the create-side note.
    // There is no column on `Goal` to hold it.
  }
  if (input.envelopeId !== undefined) {
    data.envelopeId = input.envelopeId || null;
  }
  if (input.isPrimary !== undefined) {
    data.isPrimary = input.isPrimary;
  }

  if (Object.keys(data).length === 0) {
    return { ok: true, goalId };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.goal.findFirst({
        where: { id: goalId, userId },
        select: { id: true, name: true, isPrimary: true, targetAmount: true },
      });
      if (!existing) throw new Error("GOAL_NOT_FOUND");

      // A newly linked envelope must be the caller's.
      if (data.envelopeId !== undefined) {
        await assertEnvelopeOwned(tx, userId, data.envelopeId);
      }

      // Promotion demotes the incumbent in the same transaction, so
      // the user is never left with two primaries.
      if (data.isPrimary === true && !existing.isPrimary) {
        await tx.goal.updateMany({
          where: { userId, isPrimary: true, id: { not: goalId } },
          data: { isPrimary: false },
        });
      }

      // currentAmount is absent on purpose — the allocation engine owns it.
      await tx.goal.update({ where: { id: existing.id }, data });

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "goal_updated",
          payload: JSON.stringify({
            summary: `Updated the goal “${existing.name}”.`,
            goalId: existing.id,
            before: {
              name: existing.name,
              targetCents: existing.targetAmount,
              isPrimary: existing.isPrimary,
            },
            after: data,
          }),
        },
      });
    });

    return { ok: true, goalId };
  } catch (err) {
    const msg = (err as { message?: string })?.message;
    if (msg === "GOAL_NOT_FOUND") {
      return { ok: false, reason: "Goal not found." };
    }
    if (msg === "ENVELOPE_NOT_FOUND") {
      return { ok: false, reason: "That vessel is not one of yours." };
    }
    console.error("[updateGoalToDb] failed:", err);
    return { ok: false, reason: "Could not save the goal. Nothing was changed." };
  }
}