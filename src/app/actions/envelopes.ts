"use server";

/**
 * Envelope server actions (Cluster 1.10).
 *
 * - updateEnvelopeFull() — Edit Envelope form at /envelopes/[id]/edit
 *   (name + target)
 * - updateEnvelopeTarget() — focused Edit Target form at
 *   /envelopes/[id]/edit-target (target only, quick edit)
 * - logEnvelope() — New Envelope form at /envelopes/new
 *
 * Both edits send dollars and the server converts to cents. The full
 * edit also takes envelopeId as a hidden field.
 *
 * Cluster 7.32d — these now delegate to `createEnvelopeToDb` /
 * `updateEnvelopeToDb`. They used to call `addEnvelope`/`updateEnvelope`
 * in `@/lib/store`, which mutate process memory while every page reads
 * Prisma, so a save reported success and vanished on refresh. The action
 * is now a thin wrapper over the durable service, exactly as
 * `log-transaction.ts` is a thin wrapper over its own writer.
 */

import { revalidatePath } from "next/cache";
import { createEnvelopeToDb, updateEnvelopeToDb } from "@/lib/envelope-db";
import { requireUser } from "@/server/auth/user";

export interface UpdateEnvelopeResult {
  ok: boolean;
  reason?: string;
  /** The real persisted id — callers deep-link with it. */
  envelopeId?: string;
}

export async function updateEnvelopeFull(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  const user = await requireUser();

  const envelopeId = String(formData.get("envelopeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));

  if (!envelopeId) return { ok: false, reason: "Missing envelope id." };
  if (name.length === 0) {
    return { ok: false, reason: "Give the vessel a name." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  const result = await updateEnvelopeToDb({
    userId: user.id,
    envelopeId,
    name,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the vessel." };
  }

  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${envelopeId}`);

  return { ok: true, envelopeId: result.envelopeId };
}

export async function updateEnvelopeTarget(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  const user = await requireUser();

  const envelopeId = String(formData.get("envelopeId") ?? "");
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));

  if (!envelopeId) return { ok: false, reason: "Missing envelope id." };
  if (!Number.isFinite(targetDollars) || targetDollars < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  // Target only. The durable service writes just `targetBalance`, so
  // there is no need to read the current name back to pass it through —
  // which is what forced the old memory read here.
  const result = await updateEnvelopeToDb({
    userId: user.id,
    envelopeId,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the target." };
  }

  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${envelopeId}`);

  return { ok: true, envelopeId: result.envelopeId };
}

/**
 * Add a new envelope (vessel). Used by the "+ New envelope"
 * form on /envelopes/new (Cluster 1.10). Dollars in, cents out.
 */
export async function logEnvelope(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter");
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));

  if (name.length === 0) {
    return { ok: false, reason: "Give the vessel a name." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  const result = await createEnvelopeToDb({
    userId: user.id,
    name,
    planet,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok || !result.envelopeId) {
    return { ok: false, reason: result.reason ?? "Could not save the vessel." };
  }

  revalidatePath("/envelopes");
  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath(`/envelopes/${result.envelopeId}`);

  return { ok: true, envelopeId: result.envelopeId };
}
