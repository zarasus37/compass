"use server";

/**
 * Auth server actions — signup, login, logout.
 *
 * The form components are client components; they call these actions
 * via React 19's `useActionState`. The action returns a result object
 * (typed) that the form renders.
 *
 * All inputs are validated with Zod at the boundary; nothing from the
 * client is trusted.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "@/server/auth/session";
import {
  countUsers,
  createFirstUser,
  findUserByEmail,
} from "@/server/auth/user";
import { prisma } from "@/server/db";
import { isWeakPassword } from "@/lib/auth/password-policy";

const SignupSchema = z.object({
  name: z.string().min(1, "Please enter your name.").max(80).trim(),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .max(254)
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(256, "That's a really long password — try a shorter one."),
  confirm: z.string(),
});

const LoginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Please enter your password."),
});

export type ActionResult = {
  ok: boolean;
  /** Field-level errors keyed by input name. */
  fieldErrors?: Partial<Record<string, string>>;
  /** Top-level error message (shown above the form). */
  error?: string;
};

/** Pull the client IP + UA from request headers. Best-effort, never throws. */
async function requestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;
  return { ip, userAgent };
}

/**
 * Create the first (and only) user. Refuses if a user already exists.
 * On success, sets a session cookie and redirects to /.
 */
export async function signupAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { name, email, password, confirm } = parsed.data;
  if (password !== confirm) {
    return {
      ok: false,
      fieldErrors: { confirm: "Passwords don't match." },
    };
  }
  // Cluster 7.32a — shared password-policy from src/lib/auth/password-policy.ts
  // (same rules as scripts/seed-admin.mjs). Catches dictionary-weak
  // passwords (e.g. "password12345") that the Zod length check missed.
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  const weakReason = isWeakPassword(password, mode, email);
  if (weakReason) {
    return {
      ok: false,
      fieldErrors: {
        password: `That's too easy to guess (${weakReason}). Try a stronger one.`,
      },
    };
  }

  if ((await countUsers()) > 0) {
    return {
      ok: false,
      error: "An account already exists. Please sign in instead.",
    };
  }

  const passwordHash = await hashPassword(password);
  const meta = await requestMeta();
  const user = await createFirstUser({ name, email, passwordHash });
  const session = await createSession({
    userId: user.id,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  await setSessionCookie(session.token, session.expiresAt);

  // Dev-only: when NODE_ENV !== "production", the new user is the
  // canonical "test mom" that every other smoke (sidebar, topbar,
  // dashboard, period, etc.) logs in as. The OnboardingGate
  // (Cluster 5.1) redirects to /onboarding when the user has no
  // completed FinancialIdentity. To keep the existing smokes
  // working without modifying each one to also walk the chat, we
  // pre-create a completed identity with seed data in dev mode.
  // Production users go through the chat the same way as before.
  if (process.env.NODE_ENV !== "production") {
    await prisma.financialIdentity.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ageRange: "55_64",
        employmentStatus: "employed_full_time",
        location: "Texas",
        timeHorizonYears: 35,
        riskTolerance: "moderate",
        riskNotes: "Seed identity (dev-only signup shortcut).",
        aiTierPref: "assistive",
        riskComfort: "moderate",
        currency: "USD",
        auditIdentity: "30-year-old with a $300K mortgage, $1,820 biweekly take-home.",
        auditFindings: "\n- Housing is 50% of take-home.\n- 35-year horizon at moderate risk.",
        auditPlan: "\n- Auto-allocate $432/check to the Emergency Fund.",
        auditFirstStep: "Set the auto-allocate plan to $432/check into Emergency Fund.",
        auditTeaching: "Compass treats your savings envelope as a hard cap.",
        auditBuiltAt: new Date(),
        completedAt: new Date(),
        lastProvider: "mock",
        lastFellBack: false,
        lastErrorMessage: null,
      },
      update: {
        completedAt: new Date(),
      },
    });
    // Seed a couple of identity child rows so the dashboard has data.
    const identity = await prisma.financialIdentity.findUnique({
      where: { userId: user.id },
    });
    if (identity) {
      await prisma.identityIncome.upsert({
        where: { id: `${identity.id}-seed-income-1` },
        create: {
          id: `${identity.id}-seed-income-1`,
          identityId: identity.id,
          label: "Primary",
          cadence: "biweekly",
          amountDollars: 1820,
          isPrimary: true,
          sortOrder: 0,
        },
        update: {},
      });
      await prisma.identityDebt.upsert({
        where: { id: `${identity.id}-seed-debt-1` },
        create: {
          id: `${identity.id}-seed-debt-1`,
          identityId: identity.id,
          label: "Mortgage",
          kind: "mortgage",
          balanceDollars: 300000,
          aprPercent: 6.5,
          minPaymentDollars: 1800,
          sortOrder: 0,
        },
        update: {},
      });
      await prisma.identityGoal.upsert({
        where: { id: `${identity.id}-seed-goal-1` },
        create: {
          id: `${identity.id}-seed-goal-1`,
          identityId: identity.id,
          label: "Emergency Fund",
          targetDollars: 20000,
          targetDate: null,
          perPaycheckDollars: 432,
          kind: "TRANSFER",
          goalType: "EMERGENCY",
          priority: 1,
          sortOrder: 0,
        },
        update: {},
      });
    }
  }

  redirect("/");
}

/**
 * Sign in. Sets a session cookie and redirects to / on success.
 * Generic error on bad credentials — we don't leak which field was wrong.
 */
export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);
  if (!user) {
    // Run a dummy verify to equalize timing. Tiny detail, but it makes
    // account-enumeration via response timing harder.
    await verifyPassword(
      "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      password,
    ).catch(() => false);
    return { ok: false, error: "Email or password is incorrect." };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    return { ok: false, error: "Email or password is incorrect." };
  }

  const meta = await requestMeta();
  const session = await createSession({
    userId: user.id,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/");
}

/** Destroy the current session and redirect to /login. */
export async function logoutAction(): Promise<void> {
  const token = await readSessionCookie();
  if (token) {
    await destroySession(token);
  }
  await clearSessionCookie();
  redirect("/login");
}
