/**
 * Goal seed migration — Cluster 5.2.6 widget switch.
 *
 * Same pattern as `seed-bills.ts`: on first read for a user,
 * ensure the canonical GOALS_SEED rows are in the production
 * `Goal` table, each marked `source = "seed"`. The function is
 * idempotent (cheap COUNT check on subsequent calls).
 *
 * Unlike envelopes (where the rebalance engine calls the
 * seeder), the goals seed needs to be invoked from the read
 * path because the goals page is the only consumer that needs
 * the rows materialized for v1. The /goals page calls
 * `liveGoalsFromDb(userId)` which delegates here.
 *
 * The `GoalKind` + `GoalType` Prisma enums mirror the in-memory
 * `GoalKindSeed` + `GoalTypeSeed` types in `mock-seed.ts`. The
 * values are the same strings ("TRANSFER" / "MILESTONE" /
 * "EMERGENCY" / "INVEST"), so the mapping is identity.
 */

import "server-only";
import { prisma } from "@/server/db";
import { GOALS_SEED, type GoalSeed } from "./mock-seed";

/**
 * Bump this when GOALS_SEED changes. On mismatch, the seeder
 * drops the existing seed rows and re-inserts. Identity + user
 * rows are untouched.
 */
const GOAL_SEED_VERSION = 1;

export async function ensureUserGoalsSeeded(
  userId: string,
): Promise<{ seeded: number; version: number; alreadyHadSeed: boolean }> {
  const existing = await prisma.goal.findMany({
    where: { userId, source: "seed" },
    select: { id: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length > 0 && existing.length === GOALS_SEED.length) {
    return {
      seeded: existing.length,
      version: GOAL_SEED_VERSION,
      alreadyHadSeed: true,
    };
  }

  // (Re)seed: drop existing seed rows, re-insert from GOALS_SEED.
  await prisma.goal.deleteMany({
    where: { userId, source: "seed" },
  });

  await prisma.goal.createMany({
    data: GOALS_SEED.map((g: GoalSeed) => ({
      // Use the same stable id as the in-memory store so the
      // existing UI's "goal-emergency" key works seamlessly.
      id: g.id,
      userId,
      name: g.name,
      description: g.description,
      targetAmount: g.targetCents,
      currentAmount: g.currentCents,
      targetDate: g.targetDate,
      envelopeId: g.envelopeId,
      planet: g.planet,
      isPrimary: g.isPrimary,
      // The seed values are already the Prisma enum strings
      // (matching the in-memory type names).
      kind: g.kind,
      goalType: g.goalType,
      sortOrder: 0, // GOALS_SEED doesn't have sortOrder; the page sorts by isPrimary
      source: "seed",
    })),
  });

  return {
    seeded: GOALS_SEED.length,
    version: GOAL_SEED_VERSION,
    alreadyHadSeed: false,
  };
}
