"use server";

/**
 * Debt server actions (Cluster 1.9).
 *
 * The primary action: apply an extra payment to a debt from the
 * dashboard's "Plan My Next Check" prompt or the "What if?" slider
 * on /debts. The extra reduces the debt's balance, writes an audit
 * entry, and revalidates the pages that surface debt state.
 *
 * Read the form input as dollars (human-readable), convert to cents
 * on the server boundary, then call the engine mutator. Same
 * pattern as the paycheck simulator (Cluster 1.5) and the bill
 * toggle (Cluster 1.8).
 */

import { revalidatePath } from "next/cache";
import { applyExtraDebtPayment, type Debt } from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface ApplyExtraResult {
  ok: boolean;
  reason?: string;
  debt?: Debt;
}

export async function applyExtraToDebt(
  _prev: ApplyExtraResult | null,
  formData: FormData,
): Promise<ApplyExtraResult> {
  await requireUser();

  const debtId = String(formData.get("debtId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const source = String(formData.get("source") ?? "plan-my-next-check");

  // The form sends dollars (e.g. "175" = $175.00); convert to cents.
  const dollars = Number.parseFloat(amountRaw);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return { ok: false, reason: "Enter an amount greater than $0." };
  }
  const amountCents = Math.round(dollars * 100);

  if (!debtId) {
    return { ok: false, reason: "Missing debt id." };
  }

  const result = applyExtraDebtPayment(
    debtId,
    amountCents,
    source === "what-if-slider" ? "what-if-slider" : "plan-my-next-check",
  );
  if (!result.ok || !result.debt) {
    return { ok: false, reason: result.reason ?? "Could not apply payment." };
  }

  // Revalidate every page that shows debt state
  revalidatePath("/debts");
  revalidatePath("/");
  revalidatePath("/insights");

  return { ok: true, debt: result.debt };
}
