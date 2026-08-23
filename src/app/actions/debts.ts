"use server";

/**
 * Debt server actions (Cluster 1.9 + 1.10).
 *
 * - applyExtraToDebt() — used by the DebtPayoffSimulator's
 *   "Apply extra" button on /debts and the dashboard. Dollars
 *   in, cents out.
 * - logDebt() — create action for the "+ Add debt" form on
 *   /debts/new. Sends APR as a percent (e.g. "24.99") and
 *   converts to basis points on the server.
 */

import { revalidatePath } from "next/cache";
import { addDebt, applyExtraDebtPayment, type Debt } from "@/lib/store";
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

  revalidatePath("/debts");
  revalidatePath("/");
  revalidatePath("/insights");

  return { ok: true, debt: result.debt };
}

export interface AddDebtResult {
  ok: boolean;
  reason?: string;
}

export async function logDebt(
  _prev: AddDebtResult | null,
  formData: FormData,
): Promise<AddDebtResult> {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const balanceDollars = Number.parseFloat(String(formData.get("balance") ?? ""));
  // APR is sent as a percent number (e.g. 24.99) — store wants bps
  // (2499 = 24.99%). Convert at the boundary.
  const aprPercent = Number.parseFloat(String(formData.get("apr") ?? ""));
  const minPaymentDollars = Number.parseFloat(
    String(formData.get("minPayment") ?? ""),
  );
  const dueDay = Number.parseInt(String(formData.get("dueDay") ?? ""), 10);

  if (name.length === 0) {
    return { ok: false, reason: "Give the debt a name (e.g. Chase Sapphire)." };
  }
  if (!Number.isFinite(balanceDollars) || balanceDollars <= 0) {
    return { ok: false, reason: "Balance must be greater than $0." };
  }
  if (!Number.isFinite(aprPercent) || aprPercent < 0 || aprPercent > 100) {
    return { ok: false, reason: "APR must be between 0% and 100%." };
  }
  if (!Number.isFinite(minPaymentDollars) || minPaymentDollars < 0) {
    return { ok: false, reason: "Min payment must be $0 or more." };
  }
  if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
    return { ok: false, reason: "Due day must be between 1 and 31." };
  }

  const result = addDebt({
    name,
    balanceCents: Math.round(balanceDollars * 100),
    aprBps: Math.round(aprPercent * 100),
    minPaymentCents: Math.round(minPaymentDollars * 100),
    dueDay,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the debt." };
  }

  revalidatePath("/debts");
  revalidatePath("/");
  revalidatePath("/insights");

  return { ok: true };
}
