/**
 * DemoModeButton — the "Use demo data" button on /onboarding.
 *
 * Cluster 5.2. Visible only on a fresh visit (no user messages
 * yet). Posts to /api/onboarding/seed-demo which creates a
 * completed FinancialIdentity with the canonical seed data and
 * redirects to /. The dashboard's new Identity Summary card then
 * shows the chat's data immediately — the user can experience
 * the "wired" dashboard without a 4-turn conversation.
 *
 * Renders as a small inline banner above the chat input, with a
 * vessel-border outline and a "→" affordance. The form action
 * is a real HTML form so it works without JS.
 */

export function DemoModeButton() {
  return (
    <form
      action="/api/onboarding/seed-demo"
      method="post"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        margin: "16px 24px 0",
        padding: "12px 16px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderLeft: "3px solid var(--vessel-accent)",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--vessel-accent)",
          }}
        >
          // demo mode
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-2, #c8d1dd)",
          }}
        >
          Skip the conversation — load the canonical identity and see the dashboard.
        </span>
      </div>
      <button
        type="submit"
        style={{
          padding: "7px 16px",
          background: "transparent",
          color: "var(--vessel-accent)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 4,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Use demo data →
      </button>
    </form>
  );
}
