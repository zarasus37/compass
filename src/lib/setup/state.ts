/**
 * Setup wizard state helpers (Cluster 7.36).
 *
 * The /setup wizard captures the canonical financial state in 5
 * steps (per vision doc Phase 1). This module owns the SetupState
 * Prisma row + draft state for in-progress steps.
 *
 * All operations are idempotent — safe to call multiple times.
 */

import "server-only";
import { prisma } from "@/server/db";
import type { SetupState } from "@/generated/prisma/client";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS: Record<WizardStep, string> = {
  1: "Pay schedule",
  2: "Accounts",
  3: "Envelopes",
  4: "Bills",
  5: "Goals",
};

export async function getOrCreateSetupState(userId: string): Promise<SetupState> {
  const existing = await prisma.setupState.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.setupState.create({
    data: { userId, completedStep: 0 },
  });
}

export async function markStepCompleted(userId: string, step: WizardStep): Promise<void> {
  const state = await getOrCreateSetupState(userId);
  if (state.completedStep >= step) return;
  await prisma.setupState.update({
    where: { userId },
    data: { completedStep: step },
  });
}

export async function activateSetup(userId: string): Promise<void> {
  await prisma.setupState.upsert({
    where: { userId },
    create: {
      userId,
      completedStep: 5,
      activatedAt: new Date(),
    },
    update: {
      completedStep: 5,
      activatedAt: new Date(),
    },
  });
}

export async function isSetupActivated(userId: string): Promise<boolean> {
  const state = await prisma.setupState.findUnique({ where: { userId } });
  return state?.activatedAt != null;
}

export async function getNextStep(userId: string): Promise<WizardStep | null> {
  const state = await getOrCreateSetupState(userId);
  if (state.completedStep >= 5) return null;
  return (state.completedStep + 1) as WizardStep;
}
