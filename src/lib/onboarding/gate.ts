/**
 * Onboarding gate — server-side redirect helper.
 *
 * Cluster 5.1. Every authed page calls `requireCompletedOnboarding`
 * at the top. If the user has no FinancialIdentity row, or the
 * identity isn't `completedAt`, the page redirects to /onboarding
 * where the chat is. Once the agent calls markOnboardingComplete,
 * the gate passes and the user sees the dashboard / deep pages.
 *
 * The check is a single SELECT on FinancialIdentity.completedAt
 * (cheap, indexed by userId via the @unique constraint). The
 * (app) layout and the dashboard at the root both call it, so
 * the gate is centralized here.
 */

import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

/**
 * Returns true if the user has a FinancialIdentity with completedAt set.
 * Use this when you want to branch on the gate's result without
 * triggering a redirect (e.g. to show a "finish onboarding" link on
 * the dashboard for a partially-completed identity).
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const identity = await prisma.financialIdentity.findUnique({
    where: { userId },
    select: { completedAt: true },
  });
  return identity?.completedAt != null;
}

/**
 * If the user's onboarding isn't complete, redirect to /onboarding.
 * Returns when the gate passes. Call at the top of any authed server
 * component that requires a completed identity (dashboard, deep pages,
 * settings, etc.).
 *
 * Cluster 7.15.1 — sandbox escape hatch. The local-agent smoke runs
 * `next start` (NODE_ENV=production) for stability. Production-mode
 * `signupAction` skips the dev-only FinancialIdentity seed, so any
 * smoke-created user would otherwise be permanently redirected to
 * /onboarding. When the operator opts in via COMPASS_SANDBOX=1 the
 * gate treats the user as if onboarding completed — same shape as
 * the prod-env bypass in src/lib/env/prod.ts. Production deploys
 * (Vercel, CI) never set the flag, so this branch is inert there.
 */
export async function requireCompletedOnboarding(userId: string): Promise<void> {
  if (process.env.COMPASS_SANDBOX === "1") {
    return;
  }
  const ok = await isOnboardingComplete(userId);
  if (!ok) redirect("/onboarding");
}
