/**
 * Admin reset endpoint — wipes envelope balances + audit log for the
 * current user and re-inserts the seed envelopes.
 *
 * Used by the "Reset to seed" button in /settings to clear test drift
 * from running smokes. The action authenticates the user via the
 * session cookie and resets ONLY that user's data — multi-user safe
 * by construction (the userId filter is applied to every delete +
 * insert).
 *
 * In a future cluster this could grow a richer reset surface
 * (e.g. preserve user-created envelopes, only reset the 7 planetary
 * ones) — for v1, "wipe and reseed everything" is the simplest
 * correct answer.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { resetUserEnvelopesToSeed } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function POST() {
  const user = await requireUser();
  try {
    await resetUserEnvelopesToSeed(user.id);
    // Bust the root layout so every page re-reads the freshly-seeded
    // envelope state immediately.
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      message: "Envelopes + audit log reset to seed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
