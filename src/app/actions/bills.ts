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
import { setBillPaid, type Bill } from "@/lib/store";
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
