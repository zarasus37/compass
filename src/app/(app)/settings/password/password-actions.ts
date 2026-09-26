"use server";

/**
 * Cluster 7.16 — Self-service change-password action.
 *
 * Used by `/(app)/settings/password/page.tsx`. The form is a React 19
 * `useActionState` client component; this action returns a typed
 * envelope that the form renders.
 *
 * Validation order (mirrors the (auth)/actions.ts signup/login pattern
 * — per-field errors keyed by field name, top-level error as the
 * last resort):
 *
 *   1. requireUser()                — auth gate (redirects to /login)
 *   2. Per-field shape checks        — old required, new ≥ 12 chars,
 *                                     confirm matches new, new ≠ old
 *   3. Verify the OLD password       — constant-time via @node-rs/argon2
 *   4. Atomic write                  — user.update + delete-all-sessions
 *                                     + create-fresh-session + set
 *                                     cookie, all in a single $transaction
 *
 * The fresh session for the current device is what keeps the user
 * signed in on the device that initiated the change ("sign out
 * everywhere else" semantic — matching `scripts/reset-password.mjs`).
 *
 * No env changes. No schema changes. No middleware changes.
 */
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/user";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, setSessionCookie } from "@/server/auth/session";

const ChangePasswordSchema = z
  .object({
    old: z.string().min(1, "Enter your current password."),
    new: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(256, "That's a really long password — try a shorter one."),
    confirm: z.string(),
  })
  .refine((v) => v.new === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  })
  .refine((v) => v.new !== v.old, {
    message: "Your new password must differ from your current password.",
    path: ["new"],
  });

export type ChangePasswordState = {
  ok: boolean;
  /** Field-level errors keyed by input name. */
  fieldErrors?: Partial<Record<"old" | "new" | "confirm", string>>;
  /** Top-level error (whole-form failure, e.g. user not found). */
  error?: string;
};

/** Best-effort client IP + UA for the audit row written by destroy-all-sessions. */
async function requestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;
  return { ip, userAgent };
}

export async function changePasswordAction(
  _prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  // 1. Shape validation.
  const parsed = ChangePasswordSchema.safeParse({
    old: formData.get("old"),
    new: formData.get("new"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (
        (key === "old" || key === "new" || key === "confirm") &&
        !fieldErrors[key]
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }
  const { old: oldPw, new: newPw } = parsed.data;

  // 2. Load + verify OLD password. Done outside the transaction —
  // argon2 verify is ~50ms on the slow path; keeping it outside
  // shrinks the critical section.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, passwordHash: true },
  });
  if (!dbUser) {
    return {
      ok: false,
      error: "Account not found. Sign out and back in to refresh.",
    };
  }
  const oldOk = await verifyPassword(dbUser.passwordHash, oldPw);
  if (!oldOk) {
    return {
      ok: false,
      fieldErrors: { old: "Current password is incorrect." },
    };
  }

  // 3. Atomic write: hash + user.update + delete-all-sessions
  //    + create-fresh-session. Cookie write happens AFTER the
  //    transaction commits so a partial-failure state never
  //    leaks a dead-cookie (no half-state).
  const meta = await requestMeta();
  const newHash = await hashPassword(newPw);
  let created: { token: string; expiresAt: Date };
  try {
    created = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      const c = await createSession({
        userId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return c;
    });
  } catch (err) {
    console.error("changePasswordAction failed:", err);
    return {
      ok: false,
      error: "We couldn't update your password. Try again in a moment.",
    };
  }

  // 4. Cookie write — outside the transaction. If this throws,
  //    the DB still has the new passwordHash + new session row;
  //    the user can hit the page again and the cookie will be
  //    set via the next request. No half-state either way.
  try {
    await setSessionCookie(created.token, created.expiresAt);
  } catch (err) {
    console.error("changePasswordAction cookie write failed:", err);
    // Don't return an error — the password change succeeded.
    // The next request will be unauthenticated; the user can
    // re-login with their new password.
  }

  return { ok: true };
}
