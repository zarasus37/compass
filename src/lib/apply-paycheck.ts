/**
 * The persisted paycheck path.
 *
 * WHY THIS EXISTS
 * ---------------
 * `simulatePaycheck` used to call `applyAllocation`, which mutated the
 * process-local store on `globalThis.__COMPASS_STORE__`. Every page
 * reads `liveEnvelopesFromDb`, so a paycheck moved money that no page
 * ever showed, and the whole thing evaporated on restart. Measured
 * before this module: 7/7 envelopes moved in memory, 0/7 in Postgres.
 *
 * This is the same fix as the debts migration, one level up: read the
 * plan and the envelopes from Postgres, compute with the SHARED pure
 * engine (`computeAllocation`, so the numbers cannot drift from the
 * advisor's read-only simulation), and write everything in ONE
 * transaction — envelope balances, goal balances, the paycheck
 * transaction row, the per-envelope ledger rows, the audit entry, and
 * the `PaycheckRun` that proves it happened.
 *
 * IDEMPOTENCY
 * -----------
 * `PaycheckRun` carries `@@unique([userId, periodKey, paycheckCents])`.
 * Running the same paycheck twice in the same period is refused by the
 * database, not by a hopeful read-then-write. A second run returns
 * `skipped: true` and changes nothing.
 *
 * The unique key is the ONLY guard. There is no read-then-write check
 * first, because that is the pattern that races: two concurrent
 * requests both read "no such run" and both write. Letting the
 * constraint arbitrate means the loser fails on insert no matter how the
 * interleaving lands.
 */

import "server-only";
import { prisma } from "@/server/db";
import { livePlanFromDb, liveEnvelopesFromDb, getCurrentPayPeriod } from "@/lib/mock";
import { computeAllocation, type AllocationRunResult } from "@/lib/store";

export interface ApplyPaycheckOptions {
  userId: string;
  paycheckCents: number;
  source: string;
  /** "manual" for the dashboard button, "automatic" for a paycheck arriving. */
  trigger?: "manual" | "automatic";
  /** Which account the paycheck landed in. */
  accountId?: string;
  now?: Date;
}

export interface ApplyPaycheckResult {
  ok: boolean;
  /** True when this exact paycheck was already applied in this period. */
  skipped?: boolean;
  reason?: string;
  planArmed?: boolean;
  run?: AllocationRunResult;
  paycheckRunId?: string;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function applyPaycheck(
  opts: ApplyPaycheckOptions,
): Promise<ApplyPaycheckResult> {
  const {
    userId,
    paycheckCents,
    source,
    trigger = "manual",
    now = new Date(),
  } = opts;

  if (!Number.isInteger(paycheckCents) || paycheckCents <= 0) {
    return { ok: false, reason: "Enter a paycheck amount greater than $0." };
  }

  const plan = await livePlanFromDb(userId);
  if (!plan.isArmed || plan.rules.length === 0) {
    return {
      ok: false,
      planArmed: false,
      reason:
        "Allocation plan is not armed. Open the Plan to arm it before running a paycheck.",
    };
  }

  const envelopes = await liveEnvelopesFromDb(userId);
  if (envelopes.length === 0) {
    return {
      ok: false,
      reason: "No envelopes to allocate into. Set up your vessels first.",
    };
  }

  // `liveEnvelopesFromDb` returns the PAGE shape (`current`), while the
  // engine works in the legacy store shape (`currentCents`). Map here
  // rather than widening `computeAllocation`'s contract, so the engine
  // keeps exactly one input shape and the advisor's call site is
  // unaffected.
  const engineEnvelopes = envelopes.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    currentCents: e.current,
  }));

  // The pay period's START date, not its id. `rollForward()` advances the
  // period row in place, so the id is stable across periods and would
  // make the idempotency guard refuse a legitimate next paycheck forever.
  const period = await getCurrentPayPeriod();
  const periodKey = period.startDate.toISOString().slice(0, 10);

  const run = computeAllocation(plan, engineEnvelopes, paycheckCents, source, now);

  // Which account the paycheck row hangs off. The engine itself does not
  // care; the ledger does, so fall back to any account the user has.
  const accountId =
    opts.accountId ??
    (
      await prisma.account.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id ??
    null;

  try {
    const applied = await prisma.$transaction(async (tx) => {
      // The guard. Insert first: if this paycheck is a duplicate the
      // unique constraint throws here and NOTHING else in the
      // transaction commits, so there is no window where balances moved
      // but the run was not recorded (or vice versa).
      const paycheckRun = await tx.paycheckRun.create({
        data: {
          userId,
          periodKey,
          paycheckCents,
          planId: plan.id,
          totalAllocatedCents: run.totalAllocatedCents,
          unallocatedCents: run.unallocatedCents,
          source,
          trigger,
          ledgerJson: JSON.stringify(
            run.transfers.map((t) => ({
              envelopeId: t.envelopeId,
              envelopeName: t.envelopeName,
              allocatedCents: t.allocatedCents,
              newBalanceCents: t.newBalanceCents,
              mode: t.mode,
            })),
          ),
          ranAt: now,
        },
      });

      // The paycheck itself.
      const paycheckTx = await tx.transaction.create({
        data: {
          userId,
          accountId: accountId ?? "",
          envelopeId: null,
          amount: paycheckCents,
          date: now,
          payee: source,
          source: trigger === "automatic" ? "recurring" : "manual",
          isPrimaMateria: true,
          fromPlanId: plan.id,
          metadata: JSON.stringify({ paycheckRunId: paycheckRun.id, periodKey }),
        },
      });

      // Envelope balances + the ledger rows that explain them.
      for (const t of run.transfers) {
        await tx.envelope.update({
          where: { id: t.envelopeId },
          data: { currentBalance: t.newBalanceCents },
        });

        await tx.transaction.create({
          data: {
            userId,
            accountId: accountId ?? "",
            envelopeId: t.envelopeId,
            amount: t.allocatedCents,
            date: now,
            payee: `Allocation → ${t.envelopeName}`,
            source: "routing",
            isPrimaMateria: false,
            fromPlanId: plan.id,
            fromPaycheckId: paycheckTx.id,
            metadata: JSON.stringify({
              paycheckRunId: paycheckRun.id,
              ruleId: t.ruleId,
              mode: t.mode,
              previousBalanceCents: t.previousBalanceCents,
              newBalanceCents: t.newBalanceCents,
            }),
          },
        });
      }

      // Goals bound to an envelope follow it up.
      const boundGoalEnvelopes = new Set(run.transfers.map((t) => t.envelopeId));
      if (boundGoalEnvelopes.size > 0) {
        const goals = await tx.goal.findMany({
          where: { userId, envelopeId: { in: [...boundGoalEnvelopes] } },
          select: { id: true, envelopeId: true, currentAmount: true },
        });
        const byEnvelope = new Map(run.transfers.map((t) => [t.envelopeId, t.allocatedCents]));
        for (const g of goals) {
          // `envelopeId` is nullable on the model; the `in` filter above
          // already excludes nulls, but TS cannot know that.
          if (!g.envelopeId) continue;
          const added = byEnvelope.get(g.envelopeId) ?? 0;
          if (added > 0) {
            await tx.goal.update({
              where: { id: g.id },
              data: { currentAmount: g.currentAmount + added },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "auto_allocate",
          payload: JSON.stringify({
            summary: `Allocated ${money(run.totalAllocatedCents)} of ${money(paycheckCents)} across ${run.transfers.length} vessel(s) (${trigger}).`,
            paycheckRunId: paycheckRun.id,
            paycheckTransactionId: paycheckTx.id,
            periodKey,
            trigger,
            totalAllocatedCents: run.totalAllocatedCents,
            unallocatedCents: run.unallocatedCents,
            transfers: run.transfers.map((t) => ({
              envelope: t.envelopeName,
              allocatedCents: t.allocatedCents,
              newBalanceCents: t.newBalanceCents,
            })),
          }),
        },
      });

      await tx.paycheckRun.update({
        where: { id: paycheckRun.id },
        data: { paycheckTransactionId: paycheckTx.id },
      });

      return { paycheckRun, paycheckTx };
    });

    return {
      ok: true,
      run,
      paycheckRunId: applied.paycheckRun.id,
    };
  } catch (err) {
    // Postgres unique violation on [userId, periodKey, paycheckCents].
    // The transaction rolled back, so no balance moved.
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return {
        ok: true,
        skipped: true,
        reason: `A ${money(paycheckCents)} paycheck was already applied for this pay period. Nothing was allocated twice.`,
      };
    }
    console.error("[applyPaycheck] transaction failed:", err);
    return { ok: false, reason: "Could not apply the paycheck. Nothing was changed." };
  }
}
