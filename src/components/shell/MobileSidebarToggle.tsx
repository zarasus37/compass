/**
 * MobileSidebarToggle — the hamburger button + the
 * MobileSidebarSheet, in one client island.
 *
 * Cluster 7.30a.
 *
 * Why a wrapper component? TopAppBar is otherwise a server component
 * (the engine-toggle, search, and quick-add pieces receive server-side
 * data) and we don't want to convert it to a client component just
 * to handle the open/close state of an overlay drawer.
 *
 *   - The hamburger button: rendered via CSS so it's hidden at
 *     > 880px (CSS class controls display, not a JS check, so there's
 *     no SSR/CSR mismatch flicker).
 *   - The sheet itself: rendered conditionally inside the same client
 *     island. State lives here, not in TopAppBar.
 */
"use client";

import * as React from "react";
import { MobileSidebarSheet } from "./MobileSidebarSheet";

export function MobileSidebarToggle() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        // CSS hides this above 880px. We keep it in the DOM at all
        // times so the click target is the same on every layout —
        // the only difference is the width of the parent's flex
        // track on desktop, where we let it sit hidden.
        className="mobile-sidebar-toggle"
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          color: "var(--ink-3)",
          background: "transparent",
          border: "1px solid var(--vessel-border)",
          borderRadius: 2,
          cursor: "pointer",
          flex: "0 0 auto",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 7h16 M4 12h16 M4 17h16" />
        </svg>
      </button>
      <MobileSidebarSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
