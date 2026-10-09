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
import { rebalanceEnvelopes } from "@/lib/store";
import { requireUser } from "@/server/auth/user";
import { getEnvelopes, isPlanetId } from "@/lib/state/financial-state";
import type { PlanetId } from "@/components/alchemy/VesselGlyph";

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
 * Option shape returned by `listEnvelopesForAction`.
 *
 * `planet` is nullable because the `Envelope.planet` column is. N2
 * (Polar): substituting a planet to satisfy a non-null type changes the
 * meaning of the data, so the type widens instead.
 */
export interface EnvelopeOption {
  id: string;
  name: string;
  planet: PlanetId | null;
  currentCents: number;
  targetCents: number;
}

/**
 * Server-readable list of envelope options for the dropdowns.
 * (The client component could call the canonical reader directly, but
 * keeping the action as the single server-side surface keeps the
 * form and the action aligned.)
 */
export async function listEnvelopesForAction(): Promise<
  | { ok: true; envelopes: EnvelopeOption[] }
  | { ok: false; error: "read-failed" | "invalid-tenant-id" }
> {
  const user = await requireUser();
  // FIN-01 — canonical, durable, tenant-scoped read.
  //
  // This used to be `readEnvelopes(user.id)` from `@/lib/store`, a
  // process-local `globalThis` read. It sat on a server action feeding
  // a client dropdown, so a restart or a second server instance would
  // silently offer the wrong vessels. Only `getEnvelopes` is called —
  // an envelope-only consumer never loads transactions, goals or debts.
  //
  // B1 (Polar): a read failure returns a typed error, never an empty
  // list. `[]` during an outage means "you have no vessels", which is
  // a confident and wrong statement about someone's money.
  //
  // N2 (Polar): `planet` is `PlanetId | null`. This previously
  // substituted "jupiter" (Growth) for an unassigned vessel, which
  // preserved the type while changing the meaning — presenting an
  // unassigned vessel as Growth. `NewTransactionForm` already types
  // `planet: PlanetId | null`, so nullability is already an accepted
  // shape in this codebase. No caller of this action exists in `src`
  // today, so widening the contract needs no scope extension and no
  // invented planet.
  const res = await getEnvelopes(user.id);
  if (!res.ok) {
    console.error("[listEnvelopesForAction] canonical read failed:", res.error);
    return { ok: false, error: res.error };
  }
  return {
    ok: true,
    envelopes: res.data.map((e) => ({
      id: e.id,
      name: e.name,
      planet: isPlanetId(e.planet) ? (e.planet as PlanetId) : null,
      currentCents: e.currentCents,
      targetCents: e.targetCents,
    })),
  };
}
