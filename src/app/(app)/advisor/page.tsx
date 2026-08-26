/**
 * /advisor — the post-onboarding "ask me anything" chat surface.
 *
 * Cluster 5.3. The page lives under (app)/ so it gets the full
 * dashboard chrome (TopAppBar with the CYCLE chip, Sidebar, BottomNav).
 * Unlike /onboarding, the user is mid-task on the dashboard — they
 * want full nav available.
 *
 * The page:
 *   - requires the user (handled by the (app) layout)
 *   - loads the persisted conversation state (or fresh if none)
 *   - renders the ProviderBanner + AdvisorChatSurface
 *
 * The advisor requires a completed identity (the API route 409s
 * if the user hasn't finished onboarding). For users without an
 * identity, we render a one-liner + a "Finish onboarding" link so
 * the chat UI's empty state doesn't have to handle that case.
 *
 * `force-dynamic` so the state re-reads from Prisma on every
 * request — the page is interactive, not static.
 */

import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { loadConversation } from "@/lib/onboarding/state";
import { AdvisorChatSurface } from "@/components/advisor/AdvisorChatSurface";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdvisorPage() {
  const user = await requireUser();
  const state = await loadConversation(user.id);

  // The advisor needs a completed identity to answer questions.
  // If the user hasn't finished onboarding, show a one-liner with
  // a link rather than rendering an empty chat (the API route
  // would 409 any actual question anyway).
  if (!state.completedAt) {
    return (
      <div
        style={{
          maxWidth: 720,
          margin: "64px auto",
          padding: "0 24px",
          color: "var(--ink-1, #f5f7fa)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--vessel-accent, #a855f7)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--ink-4, #6b6b80)" }}>//</span> Advisor
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sora, sans-serif)",
            fontSize: 28,
            fontWeight: 500,
            color: "var(--ink-1, #f5f7fa)",
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          Finish onboarding first
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sora, sans-serif)",
            fontSize: 15,
            color: "var(--ink-3, #9ca3af)",
            margin: "0 0 24px",
            lineHeight: 1.55,
          }}
        >
          The advisor answers questions about your identity — pay schedule, debts, goals, risk profile — and yours isn't set up yet. The onboarding chat is a short conversation (most people finish in under five minutes). The advisor will be here when you get back.
        </p>
        <Link
          href="/onboarding"
          style={{
            display: "inline-block",
            background: "var(--vessel-accent, #a855f7)",
            color: "var(--void, #0a0712)",
            padding: "12px 22px",
            borderRadius: 2,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "var(--font-jetbrains, monospace)",
            boxShadow: "0 0 16px rgba(168, 85, 247, 0.3)",
          }}
        >
          Finish onboarding →
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // Use a negative top margin to let the chat fill the area
        // between the (app) layout's TopAppBar and the BottomNav
        // without double-padding. The (app) layout already provides
        // the outer container.
        marginTop: -16,
        marginBottom: -16,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* The header strip is compact — title + em on one line so
          the chat surface has the rest of the viewport. The
          provider banner (showing fallback state) lives inside
          the chat surface itself, just below this header. */}
      <div
        style={{
          padding: "20px 32px 16px",
          borderBottom: "1px solid var(--vessel-border, #2d243d)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--vessel-accent, #a855f7)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4, #6b6b80)" }}>//</span> Learn
          </span>
          <h1
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink-1, #f5f7fa)",
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            Advisor
          </h1>
          <span
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: 14,
              color: "var(--ink-3, #9ca3af)",
            }}
          >
            a CFP on tap. Ask anything about your money.
          </span>
        </div>
      </div>
      <AdvisorChatSurface initialState={state} />
    </div>
  );
}
