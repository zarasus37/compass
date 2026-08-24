"use server";

/**
 * Engine toggle action — flips the global activeEngineLvl between
 * L1 (deterministic rules engine) and L2 (AI-driven) on the
 * SystemSettings row.
 *
 * The TopAppBar's engine pill submits this action. We read the
 * current row, flip the level, upsert (idempotent on first call —
 * creates the GLOBAL_CONFIG row if it doesn't exist yet), and
 * revalidate the root layout so every page re-reads the new engine
 * state on next render.
 *
 * Returns a small result envelope so the client can branch on
 * `success` (the spec uses useTransition + button.disabled; we
 * still want a typed response for the rare Prisma error path).
 *
 * The actual L1 vs L2 engine plumbing is a future cluster — for v1
 * the toggle just records the preference. Other engines can read
 * `getActiveEngineLevel()` and branch on the result.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";

export type EngineLevel = "L1" | "L2";

export type ToggleEngineResult =
  | { success: true; newLevel: EngineLevel }
  | { success: false; error: string };

export async function getActiveEngineLevel(): Promise<EngineLevel> {
  const row = await prisma.systemSettings.findUnique({
    where: { id: "GLOBAL_CONFIG" },
  });
  return (row?.activeEngineLvl as EngineLevel) ?? "L1";
}

export async function toggleEngineAction(): Promise<ToggleEngineResult> {
  try {
    const current = await prisma.systemSettings.findUnique({
      where: { id: "GLOBAL_CONFIG" },
    });
    // Mirror getActiveEngineLevel's default: a missing row is L1.
    const currentLevel: EngineLevel =
      (current?.activeEngineLvl as EngineLevel) ?? "L1";
    const nextLevel: EngineLevel = currentLevel === "L1" ? "L2" : "L1";

    await prisma.systemSettings.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: { activeEngineLvl: nextLevel },
      create: { id: "GLOBAL_CONFIG", activeEngineLvl: nextLevel },
    });

    revalidatePath("/", "layout");
    return { success: true, newLevel: nextLevel };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("toggleEngineAction failed:", err);
    return { success: false, error: message };
  }
}
