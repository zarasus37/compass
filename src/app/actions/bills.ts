"use server";

/**
 * Bill server actions (Cluster 1.8).
 *
 * Toggling a bill paid/unpaid is a single button click — no modal, no
 * confirmation. The action sets/clears `paidAt` on the bill, writes an
 * audit entry, and revalidates the pages that surface bill state
 * (`/recurring`, `/calendar`, the Plan My Next Check panel on `/`).
 *
 * The "create new bill" + "edit bill" + "delete bill" actions come in
 * Cluster 1.6 (form actions). For 1.8 the seed data is enough to
 * demonstrate the full Plan-My-Next-Check flow.
 */

import { revalidatePath } from "next/cache";
import { addBill, setBillPaid, type Bill } from "@/lib/store";
import { requireUser } from "@/server/auth/user";

export interface ToggleBillResult {
  ok: boolean;
  reason?: string;
  bill?: Bill;
}

export async function toggleBillPaid(
  _prev: ToggleBillResult | null,
  formData: FormData,
): Promise<ToggleBillResult> {
  await requireUser();

  const id = String(formData.get("billId") ?? "");
  const paidRaw = String(formData.get("paid") ?? "");
  const paid = paidRaw === "true" || paidRaw === "1";

  if (!id) {
    return { ok: false, reason: "Missing bill id." };
  }

  const updated = setBillPaid(id, paid);
  if (!updated) {
    return { ok: false, reason: "Bill not found." };
  }

  // Revalidate every page that shows bill state
  revalidatePath("/recurring");
  revalidatePath("/calendar");
  revalidatePath("/");

  return { ok: true, bill: updated };
}

/**
 * Add a new bill. Used by the "+ Add bill" form on /recurring/new
 * (Cluster 1.10). Form sends dollars; server converts to cents.
 */
export interface AddBillResult {
  ok: boolean;
  reason?: string;
}

export async function logBill(
  _prev: AddBillResult | null,
  formData: FormData,
): Promise<AddBillResult> {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const amountDollars = Number.parseFloat(String(formData.get("amount") ?? ""));
  const dueDay = Number.parseInt(String(formData.get("dueDay") ?? ""), 10);
  const autopay = formData.get("autopay") === "on";
  const envelopeId = String(formData.get("envelopeId") ?? "") || null;

  if (name.length === 0) {
    return { ok: false, reason: "Give the bill a name." };
  }
  if (!Number.isFinite(amountDollars) || amountDollars < 0) {
    return { ok: false, reason: "Amount must be $0 or more." };
  }
  if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
    return { ok: false, reason: "Due day must be between 1 and 31." };
  }

  const result = addBill({
    name,
    amountCents: Math.round(amountDollars * 100),
    dueDay,
    autopay,
    envelopeId,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the bill." };
  }

  revalidatePath("/recurring");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/insights");

  return { ok: true };
}
