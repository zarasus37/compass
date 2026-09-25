/**
 * Re-do onboarding card (Cluster 7.34).
 *
 * Mom's request: "How do I exit demo mode, to return back to the
 * onboarding process?" The only existing entry point was the
 * "Start over" button on /onboarding (visible only when completedAt
 * is set), which requires manually navigating back to /onboarding.
 *
 * This card sits on /settings, between the ResetSeedButton and
 * RetentionHealthBanner. Form posts to /api/onboarding/reset (the
 * existing endpoint from Cluster 5.1) and redirects to /onboarding
 * with a fresh, empty chat state.
 *
 * The button is gated behind window.confirm() when JS is on; falls
 * back to a plain submit when JS is off (server still wipes the
 * identity — irreversible action, but mom said "I'm not sure, I
 * want to start over" is a clear consent).
 */

"use client";

import * as React from "react";

export function RedoOnboardingCard() {
  return (
    <section
      data-testid="redo-onboarding-card"
      style={{
        marginTop: 24,
        padding: "20px 24px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--vessel-accent)",
        borderRadius: 4,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-4)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          // onboarding
        </div>
        <h3
          style={{
            margin: "0 0 4px",
            fontFamily: "var(--font-sora)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          Re-do onboarding
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-3)",
            lineHeight: 1.5,
          }}
        >
          Wipes your chat history + financial identity so you can run through the
          onboarding conversation again. Use this if you tapped "Use demo data" and
          want to give the chat a try, or if you'd like to re-enter your information.
          Your envelopes, transactions, and dashboard data stay put — only the
          identity is cleared.
        </p>
      </div>
      <form
        action="/api/onboarding/reset"
        method="post"
        style={{ margin: 0 }}
        onSubmit={(e) => {
          if (typeof window !== "undefined") {
            const ok = window.confirm(
              "Re-do onboarding? This wipes your financial identity and chat history.",
            );
            if (!ok) e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          data-testid="redo-onboarding-submit"
          style={{
            padding: "10px 18px",
            background: "transparent",
            color: "var(--vessel-accent)",
            border: "1px solid var(--vessel-accent)",
            borderRadius: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Re-do onboarding
        </button>
      </form>
    </section>
  );
}
