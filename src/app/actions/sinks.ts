"use server";

/**
 * Sinking fund server actions (Cluster 7.28).
 *
 * - addSink() — Add a sink to an envelope from the inline form on
 *   /envelopes/[id]. Validates name + target + cadence.
 * - deleteSink() — Delete a sink by id. Used by the per-row delete
 *   button on the envelope detail page.
 *
 * Both revalidate /envelopes and /envelopes/[id] so the inline
 * sinks list + the dashboard's cash-flow card refresh on next
 * page load. (Cash-flow card isn't affected by sinks — they're
 * sub-allocations, not new top-level targets — but the revalidate
 * is harmless and keeps the page consistent.)
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/user";

export interface SinkActionResult {
  ok: boolean;
  reason?: string;
}

const VALID_CADENCES = new Set(["weekly", "monthly", "quarterly", "annual"]);

export async function addSink(
  _prev: SinkActionResult | null,
  formData: FormData,
): Promise<SinkActionResult> {
  const user = await requireUser();
  const envelopeId = String(formData.get("envelopeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const targetDollars = Number.parseFloat(String(formData.get("target") ?? ""));
  const cadence = String(formData.get("cadence") ?? "");

  if (!envelopeId) return { ok: false, reason: "Missing envelope id." };
  if (name.length === 0 || name.length > 60) {
    return { ok: false, reason: "Give the sink a name (1-60 chars)." };
  }
  if (!Number.isFinite(targetDollars) || targetDollars <= 0) {
    return { ok: false, reason: "Target must be more than $0." };
  }
  if (!VALID_CADENCES.has(cadence)) {
    return { ok: false, reason: "Pick a cadence (weekly, monthly, quarterly, annual)." };
  }

  // Confirm the envelope belongs to this user (defense in depth —
  // the form is server-rendered, but a forged action id should still
  // not be able to write to another user's envelope).
  const envelope = await prisma.envelope.findUnique({
    where: { id: envelopeId },
    select: { userId: true },
  });
  if (!envelope || envelope.userId !== user.id) {
    return { ok: false, reason: "Envelope not found." };
  }

  // Get the next sortOrder for this envelope.
  const max = await prisma.envelopeSink.aggregate({
    where: { envelopeId, userId: user.id, isArchived: false },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  await prisma.envelopeSink.create({
    data: {
      envelopeId,
      userId: user.id,
      name,
      targetCents: Math.round(targetDollars * 100),
      cadence,
      source: "user",
      sortOrder,
    },
  });

  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${envelopeId}`);
  return { ok: true };
}

export async function deleteSink(
  _prev: SinkActionResult | null,
  formData: FormData,
): Promise<SinkActionResult> {
  const user = await requireUser();
  const sinkId = String(formData.get("sinkId") ?? "");
  if (!sinkId) return { ok: false, reason: "Missing sink id." };

  // Confirm the sink belongs to this user.
  const sink = await prisma.envelopeSink.findUnique({
    where: { id: sinkId },
    select: { userId: true, envelopeId: true },
  });
  if (!sink || sink.userId !== user.id) {
    return { ok: false, reason: "Sink not found." };
  }

  await prisma.envelopeSink.delete({ where: { id: sinkId } });

  revalidatePath("/envelopes");
  revalidatePath(`/envelopes/${sink.envelopeId}`);
  return { ok: true };
}
