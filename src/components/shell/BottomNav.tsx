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
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav
      aria-label="Primary navigation dock"
      className="bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--vessel-dark)",
        borderTop: "1px solid var(--vessel-border)",
        boxShadow: "var(--vessel-nav-shadow)",
        padding: "10px 16px 14px",
      }}
    >
      <div
        style={{
          display: "grid",
          // 4 columns: dashboard | center-button-spacer | center-button | spacer | analytics | settings
          // We use 5 tracks so the center button slots into the middle track
          // while the labels flank it. On phone, labels collapse via CSS.
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
          maxWidth: 600,
          margin: "0 auto",
          alignItems: "center",
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
