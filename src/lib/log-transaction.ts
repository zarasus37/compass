/**
 * The transaction write path.
 *
 * Split out of `app/actions/transactions.ts` so it can be imported and
 * tested directly. A `"use server"` module pulls `next/cache` →
 * `next/navigation` → React context, which throws outside a React
 * runtime (`_react.default.createContext is not a function`). The action
 * is now a thin wrapper over this.
 *
 * WHY IT MOVED OFF THE IN-MEMORY STORE
 * ------------------------------------
 * `addTransaction` wrote to the process-local store, so a logged spend
 * rendered and then vanished on restart. Measured before this change: 0
 * rows in Postgres, 6 in the store, all six visible on /transactions.
 *
 * The envelope balance is the half that is easy to get wrong. The memory
 * version decremented the vessel as part of the same call, so persisting
 * ONLY the transaction row would have created a NEW split-brain bug: the
 * ledger would remember the spend and the vessel would forget it. Both
 * commit in one transaction, or neither does.
 */

import "server-only";
import { prisma } from "@/server/db";

export interface LogTransactionInput {
  userId: string;
  payee: string;
  /** Signed cents: positive income, negative spend. */
  amountCents: number;
  envelopeId: string | null;
  date: Date;
}

export interface LogTransactionResult {
  ok: boolean;
  reason?: string;
  envelopeId?: string | null;
}

export async function logTransactionToDb(
  input: LogTransactionInput,
): Promise<LogTransactionResult> {
  const { userId, payee, amountCents, envelopeId, date } = input;

  if (!payee || payee.trim().length === 0) {
    return { ok: false, reason: "What for? Add a payee (H-E-B, electric bill, …)." };
  }
  if (!Number.isFinite(amountCents) || amountCents === 0) {
    return { ok: false, reason: "Enter an amount other than $0." };
  }

  const account = await prisma.account.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!account) {
    return {
      ok: false,
      reason: "Add an account first so transactions have somewhere to land.",
    };
  }

  const isIncome = amountCents > 0;

  try {
    await prisma.$transaction(async (tx) => {
      let envelopeName: string | null = null;

      if (envelopeId) {
        // Scoped to the caller: an envelope id that is not theirs is
        // "not found", the same message the store version gave.
        const env = await tx.envelope.findFirst({
          where: { id: envelopeId, userId },
          select: { id: true, name: true, currentBalance: true },
        });
        if (!env) throw new Error("ENVELOPE_NOT_FOUND");

        envelopeName = env.name;

        // Mirror the old memory behaviour exactly: income adds, a spend
        // subtracts, and the balance floors at zero rather than going
        // negative.
        const next = Math.max(0, env.currentBalance + amountCents);
        await tx.envelope.update({
          where: { id: env.id },
          data: { currentBalance: next },
        });
      }

      await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          envelopeId,
          amount: amountCents,
          date,
          payee,
          source: "manual",
          isPrimaMateria: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          actionType: isIncome ? "income_logged" : "spend_logged",
          payload: JSON.stringify({
            summary: isIncome
              ? `Logged $${(Math.abs(amountCents) / 100).toFixed(2)} income from ${payee}.`
              : `Logged $${(Math.abs(amountCents) / 100).toFixed(2)} spend from ${payee}${envelopeName ? ` → ${envelopeName}` : ""}.`,
            payee,
            amountCents,
            envelopeId,
            envelopeName,
          }),
        },
      });
    });
  } catch (err) {
    if ((err as { message?: string })?.message === "ENVELOPE_NOT_FOUND") {
      return { ok: false, reason: "Envelope not found." };
    }
    console.error("[logTransactionToDb] failed:", err);
    return { ok: false, reason: "Could not log the transaction. Nothing was changed." };
  }

  return { ok: true, envelopeId };
}
