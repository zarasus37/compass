/**
 * Onboarding top bar — minimal header for the chat surface.
 *
 * Cluster 5.1. Brand wordmark (left) + sign-out form (right).
 * No engine toggle, no pay-period chip — those chrome controls
 * live on the full TopAppBar that the (app) layout renders.
 *
 * Cluster 7.41 — added the "USE FORM WIZARD →" button as the
 * primary escape hatch when the chat agent gets stuck. Per the
 * 7.36 spec, /setup is the canonical setup surface; this button
 * is always visible so mom never has to hunt for it. If she's
 * already activated, clicking it lands her on / (the dashboard)
 * via the setup wizard's own redirect.
 *
 * The sign-out button is a real server action so it works
 * without JS (form-action post → server → redirect).
 */

import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";

export function OnboardingTopBar({
  userName,
  hideWizardLink,
}: {
  userName: string;
  /**
   * Cluster 7.41 — set true on the /setup layout (the wizard itself)
   * to suppress the "Use form wizard →" button, which would be
   * confusing when the user is already on the canonical surface.
   * Defaults to false so /onboarding (the chat) gets the escape.
   */
  hideWizardLink?: boolean;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: "1px solid var(--vessel-border)",
        background: "var(--vessel-dark)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        href="/onboarding"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: "var(--vessel-accent)",
            boxShadow: "var(--vessel-neon-glow)",
            animation: "vessel-pulse 2.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-1, #f5f7fa)",
          }}
        >
          Sovereign Monad
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--vessel-accent)",
            marginLeft: 8,
          }}
        >
          // onboarding
        </span>
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--ink-3, #a4b1c2)",
        }}
      >
        <span>
          signed in as <span style={{ color: "var(--ink-1, #f5f7fa)" }}>{userName}</span>
        </span>
        {/* Cluster 7.41 — primary escape hatch to the canonical
            form wizard. Always visible so mom never has to hunt
            for it when the chat loops. vessel-accent left border
            mirrors the vessel-palette card treatment; transparent
            fill so it doesn't compete with the SIGN OUT button. */}
        {!hideWizardLink && (
        <Link
          href="/setup"
          aria-label="Use the form setup wizard instead"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "transparent",
            border: "1px solid var(--vessel-accent)",
            borderLeft: "3px solid var(--vessel-accent)",
            color: "var(--ink-1, #f5f7fa)",
            borderRadius: 4,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Use form wizard
          <span aria-hidden style={{ marginLeft: 2 }}>→</span>
        </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid var(--vessel-border)",
              color: "var(--ink-2, #c8d1dd)",
              padding: "6px 14px",
              borderRadius: 4,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            sign out
          </button>
        </form>
      </div>
    </header>
  );
}
