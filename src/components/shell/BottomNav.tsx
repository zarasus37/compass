"use client";

/**
 * BottomNav — the Base Navigation Dock (Bottom 30%, Cluster 3.x
 * Component 5) on the Sovereign Monad (vessel) design system.
 *
 * Four persistent tabs at the bottom of every signed-in screen.
 * The Quick Entry tab is the floating center button — elevated
 * above the dock with a neon-glow ring, the visual "anchor" of
 * the bottom edge. The other three are flat dock tabs.
 *
 *   1. Dashboard          — /                       ◉
 *   2. Quick Entry ★      — /transactions/new        ⊕  (floating, center)
 *   3. Advanced Analytics — /insights                ◍
 *   4. Settings           — /settings                ⚙
 *
 * The user-friendly labels ride on the visible text; the verbose
 * spec names ("Dashboard Hub" / "Ledger Input" / etc.) ride on
 * aria-label for screen readers.
 *
 * Active state is derived from the current pathname. The floating
 * center button does not get a separate "active" treatment — its
 * position alone is the affordance.
 *
 * On phone (< 540px) the flat tabs collapse to icon-only and
 * labels hide (the floating center button keeps its label).
 *
 * Retractable: a chevron handle at the top of the nav collapses the
 * whole dock down to a thin ~22px peek (the handle only, showing
 * chevron-up to re-expand). The Quick Entry center disc hides with
 * the rest. State persists to localStorage (`compass-bottomnav-
 * collapsed-v1`) so a refresh / navigation keeps the user's choice.
 * The dashboard (`/`) renders its own copy of this component via
 * the same localStorage key, so the state is consistent across both
 * layouts.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COLLAPSED_KEY = "compass-bottomnav-collapsed-v1";

type Glyph = React.ReactNode;

interface Tab {
  href: string;
  label: string;
  fullName: string;
  glyph: Glyph;
  matchPrefix?: string;
  matchExact?: boolean;
  /** True for the floating center button (Quick Entry). */
  isCenter?: boolean;
}

const TABS: Tab[] = [
  {
    href: "/",
    label: "Dashboard",
    fullName: "Dashboard Hub",
    glyph: "◉",
    matchExact: true,
  },
  {
    href: "/transactions/new",
    label: "Quick Entry",
    fullName: "Ledger Input",
    glyph: "⊕",
    isCenter: true,
    matchPrefix: "/transactions",
  },
  {
    href: "/insights",
    label: "Advanced Analytics",
    fullName: "Macro Analytics",
    glyph: "◍",
    matchPrefix: "/insights",
  },
  {
    href: "/settings",
    label: "Settings",
    fullName: "System Blueprint",
    glyph: "⚙",
    matchPrefix: "/settings",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  // Default to expanded on SSR + first paint to avoid layout flash.
  // The useEffect below reads the persisted state after mount.
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // localStorage may be disabled (private mode, etc.) — ignore.
    }
    setHydrated(true);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures — the visual state still updates.
      }
      return next;
    });
  }, []);

  return (
    <nav
      aria-label="Primary navigation dock"
      data-collapsed={collapsed ? "true" : "false"}
      className={`bottom-nav${collapsed ? " bottom-nav--collapsed" : ""}`}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--vessel-dark)",
        borderTop: "1px solid var(--vessel-border)",
        boxShadow: "var(--vessel-nav-shadow)",
        // When collapsed, the whole nav slides down so only the
        // 22px handle stays visible. transform keeps the slide smooth
        // and avoids any layout impact on the rest of the page.
        transform: hydrated && collapsed ? "translateY(calc(100% - 22px))" : "translateY(0)",
        transition: "transform 280ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        willChange: "transform",
      }}
    >
      {/* ── COLLAPSE HANDLE ──
          Always visible (both expanded and collapsed). 22px tall, sits
          at the top edge of the nav above the tabs. Tapping anywhere
          on the handle toggles the collapse state. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand navigation dock" : "Collapse navigation dock"}
        aria-expanded={!collapsed}
        className="bottom-nav-handle"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 22,
          padding: 0,
          background: "transparent",
          border: 0,
          borderBottom: collapsed ? "1px solid var(--vessel-border)" : "0",
          cursor: "pointer",
          color: "var(--vessel-accent)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1)",
          }}
        >
          ▼
        </span>
      </button>

      {/* ── TAB GRID ──
          Hidden via opacity + pointer-events when collapsed (the
          transform above already slides it off-screen, but disabling
          interaction prevents accidental taps during the slide). */}
      <div
        aria-hidden={collapsed}
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          transition: "opacity 200ms ease",
          display: "grid",
          // 4 columns: dashboard | center-button-spacer | center-button | spacer | analytics | settings
          // We use 5 tracks so the center button slots into the middle track
          // while the labels flank it. On phone, labels collapse via CSS.
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
          maxWidth: 600,
          margin: "0 auto",
          alignItems: "center",
          padding: "4px 0 6px",
        }}
      >
        {TABS.map((t) => {
          const active = isActiveTab(pathname, t);

          if (t.isCenter) {
            // Floating center button — elevated, neon-glow ring.
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.fullName}
                aria-current={active ? "page" : undefined}
                className="bottom-nav-tab bottom-nav-tab--center"
                style={{
                  gridColumn: "3 / 4", // sit in the middle of the 4-col grid
                  justifySelf: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  // Negative top margin so the disc rises above the dock.
                  marginTop: -22,
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--vessel-surface)",
                    border: "2px solid var(--vessel-accent)",
                    color: "var(--vessel-accent)",
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: "var(--font-jetbrains), monospace",
                    lineHeight: 1,
                    boxShadow: "var(--vessel-neon-glow)",
                    transition: "transform 200ms",
                  }}
                >
                  {t.glyph}
                </span>
                <span
                  className="bottom-nav-label"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--vessel-accent)",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {t.label}
                </span>
              </Link>
            );
          }

          // Flat dock tab.
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.fullName}
              aria-current={active ? "page" : undefined}
              className="bottom-nav-tab"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 4px",
                borderRadius: 6,
                background: active ? "var(--vessel-surface)" : "transparent",
                border: `1px solid ${
                  active ? "var(--vessel-accent)" : "transparent"
                }`,
                color: active ? "var(--vessel-accent)" : "rgba(255,255,255,0.45)",
                textDecoration: "none",
                transition: "all 200ms",
                position: "relative",
              }}
            >
              <span
                aria-hidden
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                {t.glyph}
              </span>
              <span
                className="bottom-nav-label"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActiveTab(pathname: string, t: Tab): boolean {
  if (t.matchExact) return pathname === t.href;
  if (t.matchPrefix) {
    return (
      pathname === t.href ||
      pathname.startsWith(t.matchPrefix + "/") ||
      pathname === t.matchPrefix
    );
  }
  return pathname === t.href;
}
