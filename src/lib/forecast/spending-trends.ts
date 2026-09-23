/**
 * spending-trends.ts — last-N-days spending aggregation (Cluster 7.29).
 *
 * Reads the user's Transaction rows in the past `windowDays` days
 * (default 30), filters to expenses, groups by envelope and by
 * payee, ranks, and returns the top N for each. Used by the
 * "Top expenses" card on /insights.
 *
 * Server-only — uses @/server/db (Prisma). Pure read; no mutations.
 *
 * What "expense" means here: amount < 0 OR (amount > 0 AND
 * isPrimaMateria=false). The flag catches paychecks that hit
 * envelopes via auto-allocate (those are inflow, not spend even
 * if the row's amount happens to be positive).
 */

import "server-only";
import { prisma } from "@/server/db";
import type { PlanetId } from "@/components/alchemy/VesselGlyph";

export type SpendingTrendsStatus = "ok" | "pending_no_expenses";

export interface SpendingTrendBucket {
  /** Envelope id, or null for the "uncategorized" bucket. */
  envelopeId: string | null;
  name: string;
  planet: PlanetId | null;
  totalCents: number;
  transactionCount: number;
}

export interface PayeeTrendBucket {
  payee: string;
  totalCents: number;
  transactionCount: number;
}

export interface SpendingTrends {
  status: SpendingTrendsStatus;
  windowDays: number;
  /** ISO date (YYYY-MM-DD) — inclusive window start. */
  windowStart: string;
  /** ISO date (YYYY-MM-DD) — inclusive window end. */
  windowEnd: string;
  /** Sum of all expense amounts in the window (positive number). */
  totalSpentCents: number;
  /** Count of expense transactions in the window. */
  transactionCount: number;
  /** Top N envelopes by total spend, descending. */
  byEnvelope: SpendingTrendBucket[];
  /** Top N payees by total spend, descending. */
  byPayee: PayeeTrendBucket[];
}

export interface LoadSpendingTrendsInput {
  userId: string;
  windowDays?: number;
  today?: Date;
  topEnvelopes?: number;
  topPayees?: number;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function loadSpendingTrends(
  input: LoadSpendingTrendsInput,
): Promise<SpendingTrends> {
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const windowDays = input.windowDays ?? 30;
  const topEnvelopes = input.topEnvelopes ?? 5;
  const topPayees = input.topPayees ?? 10;
  const windowStart = new Date(today.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);

  // Read the rows. We pull amount + envelopeId + payee + date +
  // isPrimaMateria. Indexed by (userId, date) per the schema.
  const rows = await prisma.transaction.findMany({
    where: {
      userId: input.userId,
      date: { gte: windowStart, lte: today },
    },
    select: {
      id: true,
      amount: true,
      payee: true,
      envelopeId: true,
      isPrimaMateria: true,
    },
  });

  // Filter to expenses: amount < 0 (negative = spend), OR amount > 0
  // flagged isPrimaMateria=true (auto-allocate inflow — exclude).
  // We keep amount > 0 with isPrimaMateria=false as expense too
  // (covers manual income-from-an-envelope adjustments if any).
  const expenses = rows.filter(
    (r) => r.amount < 0 || (r.amount > 0 && r.isPrimaMateria === false),
  );

  if (expenses.length === 0) {
    return {
      status: "pending_no_expenses",
      windowDays,
      windowStart: toISODate(windowStart),
      windowEnd: toISODate(today),
      totalSpentCents: 0,
      transactionCount: 0,
      byEnvelope: [],
      byPayee: [],
    };
  }

  // Sum the absolute values — expenses are negative in the DB but
  // mom-readable "amount spent" is a positive number.
  const totalSpentCents = expenses.reduce((s, r) => s + Math.abs(r.amount), 0);

  // Group by envelopeId.
  const envelopeBuckets = new Map<string | null, SpendingTrendBucket>();
  for (const r of expenses) {
    const key = r.envelopeId;
    const cents = Math.abs(r.amount);
    const existing = envelopeBuckets.get(key);
    if (existing) {
      existing.totalCents += cents;
      existing.transactionCount += 1;
    } else {
      envelopeBuckets.set(key, {
        envelopeId: key,
        name: key ? "" : "Uncategorized",
        planet: null,
        totalCents: cents,
        transactionCount: 1,
      });
    }
  }

  // Look up envelope names + planets for the non-null buckets.
  const envelopeIds = Array.from(envelopeBuckets.keys()).filter(
    (k): k is string => k !== null,
  );
  if (envelopeIds.length > 0) {
    const envRows = await prisma.envelope.findMany({
      where: { id: { in: envelopeIds } },
      select: { id: true, name: true, planet: true },
    });
    const envById = new Map(envRows.map((e) => [e.id, e]));
    for (const [key, bucket] of envelopeBuckets) {
      if (key === null) continue;
      const env = envById.get(key);
      if (env) {
        bucket.name = env.name;
        bucket.planet = env.planet as PlanetId | null;
      } else {
        // Envelope was deleted but the transaction row remains.
        // Honest state: render with a placeholder name.
        bucket.name = "Deleted envelope";
        bucket.planet = null;
      }
    }
  }

  // Group by payee.
  const payeeBuckets = new Map<string, PayeeTrendBucket>();
  for (const r of expenses) {
    const key = (r.payee || "Unknown").trim() || "Unknown";
    const cents = Math.abs(r.amount);
    const existing = payeeBuckets.get(key);
    if (existing) {
      existing.totalCents += cents;
      existing.transactionCount += 1;
    } else {
      payeeBuckets.set(key, {
        payee: key,
        totalCents: cents,
        transactionCount: 1,
      });
    }
  }

  // Sort + slice.
  const byEnvelope = Array.from(envelopeBuckets.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, topEnvelopes);
  const byPayee = Array.from(payeeBuckets.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, topPayees);

  return {
    status: "ok",
    windowDays,
    windowStart: toISODate(windowStart),
    windowEnd: toISODate(today),
    totalSpentCents,
    transactionCount: expenses.length,
    byEnvelope,
    byPayee,
  };
}
