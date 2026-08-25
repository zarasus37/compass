"use server";

/**
 * Envelope rebalance server action — Prisma cutover (Cluster 3.x).
 *
 * Powers the "Move $X from Y → Z" form on /envelopes and the slide-in
 * drawer in the rebalance alert bay. The client sends a FormData
 * payload (sourceEnvelopeId, destinationEnvelopeId, amount as a dollar
 * string like "50" for $50.00). We convert to integer cents, call
 * the async Prisma-backed engine, then bust the global layout cache
 * so every page (not just the explicitly-revalidated ones) re-reads
 * the fresh envelope state.
 *
 * The engine (`rebalanceEnvelopes` in lib/store.ts) holds the full
 * validation pipeline and the Prisma `$transaction` — SELECT source +
 * dest, validate balance, UPDATE both rows, INSERT audit log, all
 * inside a single transaction that rolls back on any error.
 *
 * The `revalidatePath('/', 'layout')` call busts the root layout so
 * every signed-in page (including the unlisted sub-pages like
 * /goals, /obligations, /transactions, /accounts) re-reads envelope
 * state on next render. This is the fix for the stale-bay bug
 * across pages not in the original revalidatePath list.
 */

import { revalidatePath } from "next/cache";
import { rebalanceEnvelopes, readEnvelopes } from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface RebalanceActionState {
  ok: boolean;
  reason?: string;
  /** Cents — echoes the validated input back so the form can confirm. */
  transferCents?: number;
  sourceEnvelopeId?: string;
  destinationEnvelopeId?: string;
  /** Updated source balance after the move. */
  sourceBalanceAfterCents?: number;
  /** Updated destination balance after the move. */
  destinationBalanceAfterCents?: number;
}

export async function rebalanceAction(
  _prev: RebalanceActionState | null,
  formData: FormData,
): Promise<RebalanceActionState> {
  const user = await requireUser();

  const sourceEnvelopeId = String(formData.get("sourceEnvelopeId") ?? "").trim();
  const destinationEnvelopeId = String(
    formData.get("destinationEnvelopeId") ?? "",
  ).trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  // Parse the dollar string → integer cents. "50" = 5000 cents, "50.5"
  // = 5050 cents. Anything non-numeric fails validation below.
  const dollars = Number.parseFloat(amountRaw);
  if (!Number.isFinite(dollars)) {
    return {
      ok: false,
      reason: "Enter a dollar amount (e.g. 50 or 50.50).",
      sourceEnvelopeId,
      destinationEnvelopeId,
    };
  }
  // Use Math.round to handle cents; multiply by 100 to convert.
  const transferCents = Math.round(dollars * 100);

  // Let the engine do the rest of the validation. It will reject
  // non-integer cents, same-envelope transfers, missing envelopes,
  // and insufficient source balance — with a human-readable reason.
  const result = await rebalanceEnvelopes(
    user.id,
    sourceEnvelopeId,
    destinationEnvelopeId,
    transferCents,
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      sourceEnvelopeId,
      destinationEnvelopeId,
      transferCents,
    };
  }

  // Bust the ROOT LAYOUT so every signed-in page re-reads envelope
  // state on next render. This fixes the stale-bay bug across
  // unlisted sub-pages (/goals, /obligations, /transactions, etc.)
  // without enumerating every path.
  revalidatePath("/", "layout");

  return {
    ok: true,
    transferCents,
    sourceEnvelopeId,
    destinationEnvelopeId,
    sourceBalanceAfterCents: result.source?.currentCents,
    destinationBalanceAfterCents: result.destination?.currentCents,
  };
}

/**
 * Server-readable list of envelope options for the dropdowns.
 * (The client component could call `readEnvelopes` directly, but
 * keeping the action as the single server-side surface keeps the
 * form and the action aligned.)
 */
export async function listEnvelopesForAction() {
  await requireUser();
  return readEnvelopes().map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    currentCents: e.currentCents,
    targetCents: e.targetCents,
  }));
}
