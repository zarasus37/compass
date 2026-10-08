"use server";

/**
 * Engine toggle action — flips THIS USER's activeEngineLvl between
 * L1 (deterministic rules engine) and L2 (AI-driven).
 *
 * Cluster 7.32c: this used to flip the single global
 * `SystemSettings` row ("GLOBAL_CONFIG"), so one user's toggle changed
 * every other user's, AND the action had no authorization of its own —
 * it relied on the surrounding page being authenticated. A server
 * action is a POST endpoint with its own id; "the page is behind auth"
 * is not an authorization check. `requireUser()` is now called inside
 * the action, so the action boundary enforces it regardless of which
 * page mounted the form.
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
import { requireUser } from "@/server/auth/user";

export type EngineLevel = "L1" | "L2";

export type ToggleEngineResult =
  | { success: true; newLevel: EngineLevel }
  | { success: false; error: string };

/**
 * The signed-in user's engine level. Defaults to "L1" when the column
 * is somehow unset, matching the old global default.
 *
 * Takes the userId explicitly so a caller cannot forget to scope it.
 */
export async function getActiveEngineLevel(userId: string): Promise<EngineLevel> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeEngineLvl: true },
  });
  return (row?.activeEngineLvl as EngineLevel) ?? "L1";
}

export async function toggleEngineAction(): Promise<void> {
  // Authorization lives INSIDE the action, not in the page that mounts
  // it. Unauthenticated callers are redirected to /login by
  // requireUser() before any write is attempted.
  const user = await requireUser();

  try {
    const currentLevel = (await getActiveEngineLevel(user.id)) ?? "L1";
    const nextLevel: EngineLevel = currentLevel === "L1" ? "L2" : "L1";

    await prisma.user.update({
      where: { id: user.id },
      data: { activeEngineLvl: nextLevel },
    });

    revalidatePath("/", "layout");
  } catch (err) {
    console.error("toggleEngineAction failed:", err);
    // The plain-form action signature requires Promise<void>; the
    // typed envelope is still exported above for any future caller
    // that wants to surface engine-toggle errors to the UI.
  }
}
