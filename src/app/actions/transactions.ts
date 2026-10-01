"use server";

/**
 * Transaction server actions (Cluster 1.10).
 *
 * The primary action: add a new transaction from the "+ Log a
 * transaction" form (mom logs a spend or income). The form sends
 * dollars (human-readable); the server converts to cents, then calls
 * the writer.
 *
 * Same boundary pattern as paycheck (1.5), bills (1.8), and debts
 * (1.9): the form input is what the user typed, the engine works
 * in cents, the audit log records both.
 *
 * The write itself lives in `@/lib/log-transaction` so it can be tested
 * directly: a "use server" module pulls next/navigation, which throws
 * outside a React runtime.
 */

import { revalidatePath } from "next/cache";
import { logTransactionToDb } from "@/lib/log-transaction";
import { requireUser } from "@/server/auth/user";

export interface AddTransactionResult {
  ok: boolean;
  reason?: string;
  envelopeId?: string | null;
}

export async function logTransaction(
  _prev: AddTransactionResult | null,
  formData: FormData,
): Promise<AddTransactionResult> {
  const user = await requireUser();

  const payee = String(formData.get("payee") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const envelopeId = String(formData.get("envelopeId") ?? "") || null;
  const isIncome = formData.get("isIncome") === "on";
  const dateRaw = String(formData.get("date") ?? "");

  if (payee.length === 0) {
    return { ok: false, reason: "What for? Add a payee (H-E-B, electric bill, …)." };
  }
  // Dollars in, cents out. The form input is what the user typed.
  const dollars = Number.parseFloat(amountRaw);
  if (!Number.isFinite(dollars) || dollars === 0) {
    return { ok: false, reason: "Enter an amount other than $0." };
  }
  // If "income" is checked, force positive; otherwise treat the
  // amount as a spend (negative).
  const amountCents = isIncome
    ? Math.round(Math.abs(dollars) * 100)
    : -Math.round(Math.abs(dollars) * 100);

  const date = dateRaw ? new Date(dateRaw) : new Date();

  // This used to call `addTransaction` in the process-local store, so a
  // logged spend was visible and then gone on restart - and the envelope
  // balance it decremented went with it. Both now commit together, or
  // neither does.
  const result = await logTransactionToDb({
    userId: user.id,
    payee,
    amountCents,
    envelopeId,
    date,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not log the transaction." };
  }

  // Revalidate every page that shows transaction / envelope / balance state
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/envelopes");
  if (envelopeId) revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/period");
  revalidatePath("/insights");
  revalidatePath("/goals");
  revalidatePath("/calendar");
  revalidatePath("/obligations");

  return { ok: true, envelopeId };
}
