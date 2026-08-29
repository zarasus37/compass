"use client";

/**
 * Cluster 7.1 — Top-bar [⌘K] Search button.
 *
 * The discoverability affordance for the command palette.
 * Sits in the TopAppBar's right column (next to the engine
 * pill + settings cog). Clicking it calls
 * `useCommandPalette().open()`. The ⌘K / Ctrl+K keyboard
 * shortcut also opens the palette; the button is the mouse
 * path.
 *
 * Terminal voice: vessel-accent border, void-on-hover text,
 * mono caps label "[⌘K] Search". Hidden on narrow phones (the
 * label doesn't fit); the keyboard shortcut is still available.
 */

import * as React from "react";
import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider";

export function SearchButton() {
  const { open } = useCommandPalette();
  const [isMac, setIsMac] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || ""));
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      aria-keyshortcuts={isMac === false ? "Control+K" : "Meta+K"}
      data-testid="topbar-search-button"
      className="topbar-search-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        color: "var(--vessel-accent)",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: "1px solid var(--vessel-border)",
        borderRadius: 6,
        background: "var(--vessel-surface)",
        cursor: "pointer",
      }}
    >
      <span aria-hidden>🔍</span>
      <span className="topbar-search-label">Search</span>
      <span
        aria-hidden
        className="topbar-search-kbd"
        style={{
          padding: "2px 6px",
          border: "1px solid var(--vessel-border)",
          borderRadius: 3,
          color: "var(--ink-3)",
          fontSize: 10,
        }}
      >
        {isMac === false ? "Ctrl K" : "⌘ K"}
      </span>
    </button>
  );
}
