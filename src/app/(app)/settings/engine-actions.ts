"use server";

/**
 * Engine toggle action — flips the global activeEngineLvl between
 * L1 (deterministic rules engine) and L2 (AI-driven) on the
 * SystemSettings row.
 *
 * The TopAppBar's engine pill submits this action as a plain server-action
 * `<form action={toggleEngineAction}>` (no useActionState), so the
 * return type must be `Promise<void>` to match the form's `action` prop
 * signature `(formData: FormData) => void | Promise<void>`. The
 * `ToggleEngineResult` type is exported for any future caller that
 * wants the typed envelope (e.g. a useActionState form).
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

export async function toggleEngineAction(): Promise<void> {
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
  } catch (err) {
    console.error("toggleEngineAction failed:", err);
    // The plain-form action signature requires Promise<void>; the
    // typed envelope is still exported above for any future caller
    // that wants to surface engine-toggle errors to the UI.
  }
}
