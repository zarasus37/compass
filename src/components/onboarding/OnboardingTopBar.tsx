/**
 * Onboarding top bar — minimal header for the chat surface.
 *
 * Cluster 5.1. Just the brand wordmark (left) + sign-out form
 * (right). No engine toggle, no pay-period chip — those chrome
 * controls live on the full TopAppBar that the (app) layout
 * renders, not here.
 *
 * The sign-out button is a real server action so it works
 * without JS (form-action post → server → redirect).
 */

import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";

export function OnboardingTopBar({ userName }: { userName: string }) {
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
          gap: 18,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--ink-3, #a4b1c2)",
        }}
      >
        <span>
          signed in as <span style={{ color: "var(--ink-1, #f5f7fa)" }}>{userName}</span>
        </span>
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
