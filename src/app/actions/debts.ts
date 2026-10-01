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
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/user";
import type { Debt } from "@/lib/store";

export interface ApplyExtraResult {
  ok: boolean;
  reason?: string;
  debt?: Debt;
}

export async function applyExtraToDebt(
  _prev: ApplyExtraResult | null,
  formData: FormData,
): Promise<ApplyExtraResult> {
  const user = await requireUser();

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

  // Scoped to the caller's own rows. A debt id that is not theirs (or
  // does not exist) is "not found" — the same message the store gave,
  // so the UI is unchanged.
  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId: user.id } });
  if (!debt) return { ok: false, reason: "Debt not found." };
  if (debt.balanceCents <= 0) {
    return { ok: false, reason: "Debt is already paid off." };
  }

  // Don't overpay — apply the lesser of the two, same rule as before.
  const applied = Math.min(amountCents, debt.balanceCents);
  const newBalance = debt.balanceCents - applied;

  await prisma.$transaction([
    prisma.debt.update({
      where: { id: debt.id },
      data: { balanceCents: newBalance },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: "manual-adjust",
        // `payload` is a JSON *string* on AuditLog, not an object.
        payload: JSON.stringify({
          summary: `Applied $${(applied / 100).toFixed(2)} extra payment to ${debt.name} (balance now $${(newBalance / 100).toFixed(2)}).`,
          debtId: debt.id,
          appliedCents: applied,
          newBalance,
          source: source === "what-if-slider" ? "what-if-slider" : "plan-my-next-check",
        }),
      },
    }),
  ]);

  revalidatePath("/debts");
  revalidatePath("/");
  revalidatePath("/insights");

  return {
    ok: true,
    debt: {
      id: debt.id,
      name: debt.name,
      balanceCents: newBalance,
      originalBalanceCents: debt.originalBalanceCents,
      aprBps: debt.aprBps,
      minPaymentCents: debt.minPaymentCents,
      dueDay: debt.dueDay,
      accountId: debt.accountId,
      sortOrder: debt.sortOrder,
      isArchived: debt.isArchived,
      // null (column) -> undefined (Debt contract); see liveDebtsFromDb.
      creditLimitCents: debt.creditLimitCents ?? undefined,
    },
  };
}

export interface AddDebtResult {
  ok: boolean;
  reason?: string;
}

export async function logDebt(
  _prev: AddDebtResult | null,
  formData: FormData,
): Promise<AddDebtResult> {
  const user = await requireUser();

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

  // The APR trap. The form sends a percent ("24.99"); the column is
  // BASIS POINTS (2499). Converting at this boundary is the only place
  // it happens, and it must round-trip exactly — a float percent stored
  // as-is here is a silent 100x error that no source-regex test could
  // see. `smoke-debts-interest` asserts a known APR round-trips.
  const aprBps = Math.round(aprPercent * 100);
  const balanceCents = Math.round(balanceDollars * 100);
  const minPaymentCents = Math.round(minPaymentDollars * 100);

  // New debts sort after the seeded set, mirroring `addDebt`'s
  // `maxSort + 1` rule so the list order stays stable.
  const last = await prisma.debt.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? 0) + 1;

  // A debt the user just entered is fully outstanding, so
  // originalBalanceCents starts equal to the balance — the paid-down
  // bar reads 0%, not a negative number. Mirrors `addDebt`.
  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      name,
      balanceCents,
      originalBalanceCents: balanceCents,
      aprBps,
      minPaymentCents,
      dueDay,
      // The form does not collect a linked account or a credit limit.
      // null accountId is fine: DebtCard simply omits the institution
      // line. null creditLimitCents is REQUIRED — a debt with no limit
      // is a loan, and DebtCard falls back to the paid-down bar
      // instead of showing a utilization gauge it cannot compute.
      accountId: null,
      creditLimitCents: null,
      source: "user",
      sortOrder,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      actionType: "debt_created",
      payload: JSON.stringify({
        summary: `Added debt "${name}" ($${(balanceCents / 100).toFixed(2)} @ ${(aprBps / 100).toFixed(2)}% APR).`,
        debtId: debt.id,
        balanceCents,
        aprBps,
      }),
    },
  });

  revalidatePath("/debts");
  revalidatePath("/");
  revalidatePath("/insights");

  return { ok: true };
}
