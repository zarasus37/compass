/**
 * Onboarding layout — minimal shell for the chat surface.
 *
 * Cluster 5.1. The /onboarding page is a focused conversation —
 * no sidebar, no BottomNav, no deep nav. Just the brand wordmark
 * on the top-left, a sign-out escape hatch on the top-right, and
 * the chat surface in the center.
 *
 * The TopAppBar (the full Sovereign Monad one with engine toggle
 * and pay period chip) is NOT used here — those controls are
 * irrelevant during the chat. When the chat completes, the user
 * is sent back to the dashboard where the full chrome returns.
 *
 * `requireUser` (not the onboarding gate) gates the layout — we
 * want the chat to be accessible to *any* signed-in user, even
 * one who has already completed onboarding and wants to start
 * over. The chat itself has a "Start over" button that wipes
 * the identity.
 */

import type { ReactNode } from "react";
import { requireUser } from "@/server/auth/user";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--vessel-dark)",
        color: "var(--ink-1, #f5f7fa)",
      }}
    >
      <OnboardingTopBar userName={user.name} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
    </div>
  );
}
