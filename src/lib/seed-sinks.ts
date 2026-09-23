/**
 * Sinking fund seed migration — Cluster 7.28.
 *
 * Mirrors the pattern of seed-bills.ts: lazily seed 1-2 example
 * `EnvelopeSink` rows per canonical envelope the first time a user
 * looks at /envelopes or /envelopes/[id]. Idempotent — no-op if
 * the user already has any sink rows.
 *
 * Math (monthlyFillCents) lives in @/lib/forecast/sink-math so
 * client components can import it without dragging in the Prisma
 * client.
 */

import "server-only";
import { prisma } from "@/server/db";
import { monthlyFillCents } from "@/lib/forecast/sink-math";

/** Re-export for server-side callers that already import from here. */
export { monthlyFillCents };

/** Canonical sinks for a canonical envelope name. Empty array = no default sinks. */
export const ENVELOPE_SINK_SEED: Record<string, Array<{
  name: string;
  targetCents: number;
  cadence: "weekly" | "monthly" | "quarterly" | "annual";
}>> = {
  "Groceries": [
    { name: "Holiday food", targetCents: 30_000, cadence: "annual" },
  ],
  "Utilities": [
    { name: "Annual subscription", targetCents: 12_000, cadence: "annual" },
  ],
  "Dining & Joy": [
    { name: "Birthday gifts", targetCents: 10_000, cadence: "annual" },
  ],
  "Buffer": [
    { name: "Annual deductible", targetCents: 50_000, cadence: "annual" },
  ],
  "Savings": [
    { name: "Property tax", targetCents: 200_000, cadence: "annual" },
  ],
};

/** Bump this when ENVELOPE_SINK_SEED changes. */
export const SINK_SEED_VERSION = 1;

/**
 * Lazily seed default sinks for a user. Idempotent.
 */
export async function ensureUserSinksSeeded(
  userId: string,
): Promise<{ seeded: number; alreadyHadSeed: boolean; skippedEnvelopes: number }> {
  const existingCount = await prisma.envelopeSink.count({
    where: { userId, isArchived: false },
  });
  if (existingCount > 0) {
    return { seeded: existingCount, alreadyHadSeed: true, skippedEnvelopes: 0 };
  }
  const envelopes = await prisma.envelope.findMany({
    where: { userId, isArchived: false },
    select: { id: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  let seeded = 0;
  let skipped = 0;
  let sortOrder = 0;
  for (const env of envelopes) {
    const seeds = ENVELOPE_SINK_SEED[env.name];
    if (!seeds || seeds.length === 0) {
      skipped += 1;
      continue;
    }
    for (const s of seeds) {
      await prisma.envelopeSink.create({
        data: {
          envelopeId: env.id,
          userId,
          name: s.name,
          targetCents: s.targetCents,
          cadence: s.cadence,
          source: "seed",
          sortOrder: sortOrder++,
        },
      });
      seeded += 1;
    }
  }
  return { seeded, alreadyHadSeed: false, skippedEnvelopes: skipped };
}
