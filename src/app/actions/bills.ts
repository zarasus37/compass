"use server";

/**
 * Bill server actions (Cluster 1.8, refreshed in Cluster 4.3).
 *
 * Toggling a bill paid/unpaid is a single button click — no modal, no
 * confirmation. The action sets/clears `paidAt` on the bill, writes an
 * audit entry, and revalidates the pages that surface bill state
 * (`/obligations` — both tabs, `/calendar`, the Plan My Next Check
 * panel on `/`).
 *
 * The "create new bill" + "edit bill" + "delete bill" actions come in
 * Cluster 1.6 (form actions). For 1.8 the seed data is enough to
 * demonstrate the full Plan-My-Next-Check flow.
 *
 * Cluster 4.3: revalidatePath calls now target `/obligations` (not
 * the old `/recurring` path, which 308-redirects to
 * `/obligations?tab=bills`). Targeting the layout root via `/` is
 * still the right call for the dashboard panel.
 */

import { revalidatePath } from "next/cache";
import { addBill, addBillDb, setBillPaid, setBillPaidDb, type Bill } from "@/lib/store";
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
  // Cluster 5.2.6 widget switch: the toggle now writes to the
  // durable Prisma `Bill` table (via `setBillPaidDb`) so the
  // /recurring + dashboard + /calendar widgets — all of which now
  // read from Prisma — see the new state. The previous
  // `setBillPaid` (in-memory) is still used by the legacy
  // `PaycheckBreakdown` engine; `setBillPaidDb` mirrors the write
  // to the in-memory store so that engine still computes correctly.
  const user = await requireUser();

  const id = String(formData.get("billId") ?? "");
  const paidRaw = String(formData.get("paid") ?? "");
  const paid = paidRaw === "true" || paidRaw === "1";

  if (!id) {
    return { ok: false, reason: "Missing bill id." };
  }

  const updated = await setBillPaidDb(user.id, id, paid);
  if (!updated) {
    return { ok: false, reason: "Bill not found." };
  }

  // Revalidate every page that shows bill state. /obligations
  // covers both tabs (Bills + Subscriptions); /calendar shows the
  // bills-on-calendar grid; / re-renders the Plan My Next Check.
  revalidatePath("/obligations");
  revalidatePath("/calendar");
  revalidatePath("/");

  return { ok: true, bill: updated };
}

/**
 * Add a new bill. Used by the "+ Add bill" form on /recurring/new
 * (Cluster 1.10) — the form lives at `/recurring/new` but the bill
 * list page moved to `/obligations?tab=bills` in Cluster 4.0. Form
 * sends dollars; server converts to cents.
 */
export interface AddBillResult {
  ok: boolean;
  reason?: string;
}

export async function logBill(
  _prev: AddBillResult | null,
  formData: FormData,
): Promise<AddBillResult> {
  // Cluster 5.2.6 widget switch: the new-bill form now writes to
  // the durable Prisma `Bill` table (via `addBillDb`) so the new
  // row shows up in the /recurring + dashboard + /calendar widgets
  // (which now read from Prisma). The in-memory mirror is kept
  // in sync by `addBillDb` so the legacy engine still works.
  const user = await requireUser();

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

  const result = await addBillDb(user.id, {
    name,
    amountCents: Math.round(amountDollars * 100),
    dueDay,
    autopay,
    envelopeId,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "Could not save the bill." };
  }

  revalidatePath("/obligations");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/insights");

  return { ok: true };
}
