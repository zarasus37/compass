"use server";

/**
 * Envelope rebalance server action.
 *
 * Powers the "Move $X from Y → Z" form on /envelopes. The client
 * sends a FormData payload (sourceEnvelopeId, destinationEnvelopeId,
 * transferCents as a dollar string like "50" for $50.00). We convert
 * to integer cents, call the in-memory engine, and revalidate the
 * dashboard and the envelopes page.
 *
 * The action delegates to `rebalanceEnvelopes` in lib/store.ts which
 * holds the full validation pipeline (positive integer cents, source
 * ≠ destination, both envelopes exist, source has enough balance,
 * atomic mutation, audit log entry). The Prisma migration path is the
 * same function signature with a different mutation body — no UI
 * change required.
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
  await requireUser();

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
  const result = rebalanceEnvelopes(
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

  // Refresh everything that shows balance state. The dashboard hero
  // (safe-to-spend) and the spend ring both depend on envelope balances,
  // and the /envelopes page itself is the primary view.
  revalidatePath("/");
  revalidatePath("/envelopes");
  revalidatePath("/period");
  revalidatePath("/insights");
  revalidatePath("/allocation");

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
