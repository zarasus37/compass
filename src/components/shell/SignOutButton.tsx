/**
 * SignOutButton — escape hatch from the main app shell (Cluster 7.34).
 *
 * Mirrors the OnboardingTopBar pattern (real <form action> so it
 * works without JS). When JS is on, intercepts submit and shows a
 * window.confirm() — sign-out is destructive (clears the session
 * cookie + redirects to /login) so a one-tap confirmation feels
 * right for a non-engineer user.
 *
 * Layout: 32×32 button, matches the settings cog next to it.
 * Label: "↩" (egress icon, terminal-feel) with aria-label="Sign out".
 */

"use client";

import * as React from "react";
import { logoutAction } from "@/app/(auth)/actions";

export function SignOutButton() {
  return (
    <form
      action={logoutAction}
      style={{ margin: 0, padding: 0, display: "inline-flex" }}
      onSubmit={(e) => {
        if (typeof window !== "undefined") {
          const ok = window.confirm("Sign out of Compass?");
          if (!ok) e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 32,
          height: 32,
          color: "var(--ink-2, #c8d1dd)",
          fontSize: 14,
          border: "1px solid var(--vessel-border)",
          borderRadius: 6,
          background: "var(--vessel-surface)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        ↩
      </button>
    </form>
  );
}
