"use server";

/**
 * Envelope server actions (Cluster 1.10).
 *
 * - updateEnvelopeFull() — Edit Envelope form at /envelopes/[id]/edit
 *   (name + target)
 * - updateEnvelopeTarget() — focused Edit Target form at
 *   /envelopes/[id]/edit-target (target only, quick edit)
 *
 * Both send dollars and the server converts to cents. The full
 * edit also takes envelopeId as a hidden field.
 */

import { revalidatePath } from "next/cache";
import { addEnvelope, updateEnvelope } from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface UpdateEnvelopeResult {
  ok: boolean;
  reason?: string;
}

export async function updateEnvelopeFull(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  await requireUser();

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

  const result = updateEnvelope(envelopeId, {
    name,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the vessel." };
  }

  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${envelopeId}`);

  return { ok: true };
}

export async function updateEnvelopeTarget(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  await requireUser();

  const envelopeId = String(formData.get("envelopeId") ?? "");
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));

  if (!envelopeId) return { ok: false, reason: "Missing envelope id." };
  if (!Number.isFinite(targetDollars) || targetDollars < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  // Reuse updateEnvelope — we need the existing name; fetch via
  // the action's revalidation + a second read is awkward, so
  // do the read here and pass the name through.
  // (Simpler: just pass an empty placeholder if name unchanged.
  // But the mutator validates name length > 0. Easiest fix: read
  // the live store inside the action and pass the name.)
  const { readEnvelopes } = await import("@/lib/store");
  const current = readEnvelopes().find((e) => e.id === envelopeId);
  if (!current) return { ok: false, reason: "Envelope not found." };

  const result = updateEnvelope(envelopeId, {
    name: current.name,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the target." };
  }

  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${envelopeId}`);

  return { ok: true };
}

/**
 * Add a new envelope (vessel). Used by the "+ New envelope"
 * form on /envelopes/new (Cluster 1.10). Dollars in, cents out.
 */
export async function logEnvelope(
  _prev: UpdateEnvelopeResult | null,
  formData: FormData,
): Promise<UpdateEnvelopeResult> {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const planet = String(formData.get("planet") ?? "jupiter") as
    | "sol" | "luna" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));

  if (name.length === 0) {
    return { ok: false, reason: "Give the vessel a name." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars < 0) {
    return { ok: false, reason: "Target must be $0 or more." };
  }

  const result = addEnvelope({
    name,
    planet,
    targetCents: Math.round(targetDollars * 100),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the vessel." };
  }

  revalidatePath("/envelopes");
  revalidatePath("/");
  revalidatePath("/insights");
  if (result.envelope) revalidatePath(`/envelopes/${result.envelope.id}`);

  return { ok: true };
}
