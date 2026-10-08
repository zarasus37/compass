/**
 * Envelope create/edit — the durable mutation service.
 *
 * WHY THIS EXISTS
 * ---------------
 * `logEnvelope`, `updateEnvelopeFull` and `updateEnvelopeTarget` all
 * called `addEnvelope` / `updateEnvelope` from `@/lib/store`, which
 * mutate `getState(userId)` — the process-local store on
 * `globalThis.__COMPASS_STORE__`. But every page reads envelopes from
 * Prisma via `liveEnvelopesFromDb`. So the forms reported success while
 * writing nothing durable: the edit vanished on refresh and on restart,
 * and a DB-created envelope id was reported "not found" because it was
 * never in the memory store to begin with.
 *
 * Modelled on `log-transaction.ts`, which is the same repair one level
 * down (transaction row + envelope balance committing together).
 *
 * BALANCES ARE NEVER TOUCHED HERE
 * -------------------------------
 * A metadata edit (rename, retarget) must not move `currentBalance`.
 * The balance belongs to the ledger: `log-transaction.ts`,
 * `apply-paycheck.ts` and `rebalanceEnvelopes` own it. A form that
 * rewrites a name while also rewriting the balance would create exactly
 * the split-brain that `log-transaction.ts` was written to prevent.
 */

import "server-only";
import { prisma } from "@/server/db";

export interface CreateEnvelopeInput {
  userId: string;
  name: string;
  planet: string | null;
  targetCents: number;
}

export interface CreateEnvelopeResult {
  ok: boolean;
  reason?: string;
  envelopeId?: string;
}

export interface UpdateEnvelopeInput {
  userId: string;
  envelopeId: string;
  /** Omitted fields are left as they are. */
  name?: string;
  targetCents?: number;
}

export interface UpdateEnvelopeResult {
  ok: boolean;
  reason?: string;
  envelopeId?: string;
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

export async function createEnvelopeToDb(
  input: CreateEnvelopeInput,
): Promise<CreateEnvelopeResult> {
  const { userId, name, planet, targetCents } = input;

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Give the vessel a name." };
  }
  if (trimmed.length > 80) {
    return { ok: false, reason: "That name is too long (80 characters max)." };
  }
  if (!Number.isFinite(targetCents) || targetCents < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  try {
    const id = await prisma.$transaction(async (tx) => {
      // New vessels land at the end of the list. A raw max() read is
      // fine here: an exact tie only affects ordering, not correctness.
      const last = await tx.envelope.findFirst({
        where: { userId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const created = await tx.envelope.create({
        data: {
          userId,
          name: trimmed,
          // "user" distinguishes a hand-created vessel from the 7
          // canonical seeds (source="seed") and chat projections
          // ("identity"). The reads filter on this.
          source: "user",
          targetBalance: Math.round(targetCents),
          // A brand-new vessel starts empty. Never inherit a balance.
          currentBalance: 0,
          planet: planet && VALID_PLANETS.has(planet) ? planet : null,
          sortOrder: (last?.sortOrder ?? 0) + 1,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "envelope_created",
          payload: JSON.stringify({
            summary: `Created the vessel “${trimmed}” with a $${(
              Math.round(targetCents) / 100
            ).toFixed(2)} target.`,
            envelopeId: created.id,
            name: trimmed,
            targetCents: Math.round(targetCents),
          }),
        },
      });

      return created.id;
    });

    return { ok: true, envelopeId: id };
  } catch (err) {
    console.error("[createEnvelopeToDb] failed:", err);
    return {
      ok: false,
      reason: "Could not save the vessel. Nothing was changed.",
    };
  }
}

export async function updateEnvelopeToDb(
  input: UpdateEnvelopeInput,
): Promise<UpdateEnvelopeResult> {
  const { userId, envelopeId, name, targetCents } = input;

  if (!envelopeId) {
    return { ok: false, reason: "Missing envelope id." };
  }

  const data: { name?: string; targetBalance?: number } = {};
  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { ok: false, reason: "Give the vessel a name." };
    }
    if (trimmed.length > 80) {
      return { ok: false, reason: "That name is too long (80 characters max)." };
    }
    data.name = trimmed;
  }
  if (targetCents !== undefined) {
    if (!Number.isFinite(targetCents) || targetCents < 0) {
      return { ok: false, reason: "Target must be $0 or more." };
    }
    data.targetBalance = Math.round(targetCents);
  }
  if (Object.keys(data).length === 0) {
    return { ok: true, envelopeId };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Ownership first, scoped to the caller. An id that is not theirs
      // reads as "not found" — the same message the memory store gave,
      // and it does not confirm the row exists for somebody else.
      const existing = await tx.envelope.findFirst({
        where: { id: envelopeId, userId },
        select: { id: true, name: true, targetBalance: true },
      });
      if (!existing) throw new Error("ENVELOPE_NOT_FOUND");

      // Only the metadata fields above. `currentBalance` is absent on
      // purpose — see the file header.
      await tx.envelope.update({ where: { id: existing.id }, data });

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "envelope_updated",
          payload: JSON.stringify({
            summary: `Updated the vessel “${existing.name}”.`,
            envelopeId: existing.id,
            before: { name: existing.name, targetCents: existing.targetBalance },
            after: data,
          }),
        },
      });
    });

    return { ok: true, envelopeId };
  } catch (err) {
    if ((err as { message?: string })?.message === "ENVELOPE_NOT_FOUND") {
      return { ok: false, reason: "Envelope not found." };
    }
    console.error("[updateEnvelopeToDb] failed:", err);
    return {
      ok: false,
      reason: "Could not save the vessel. Nothing was changed.",
    };
  }
}