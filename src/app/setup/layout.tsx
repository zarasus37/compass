/**
 * /setup — shared layout for the 5-step setup wizard.
 *
 * Cluster 7.36 — replaces the previous /onboarding chat as the
 * primary setup surface. Per vision doc Phase 1: capture the
 * canonical financial state via deterministic form fields.
 */
import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <OnboardingTopBar userName={user.name} />
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px 24px 96px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
