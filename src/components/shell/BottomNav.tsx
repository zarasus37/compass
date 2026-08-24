"use client";

/**
 * BottomNav — the Base Navigation Dock (Bottom 30%, Cluster 3.x
 * Component 5).
 *
 * Four persistent high-contrast tabs at the bottom of every signed-in
 * screen. Per the spec, these are the "primary tap-through hub" for
 * cross-utilization entry points:
 *
 *   1. Dashboard Hub  — /                       ◉
 *      "Instantly returns to this core scannable vertical feed view."
 *      Active on the root dashboard.
 *
 *   2. Ledger Input   — /transactions/new        +
 *      "A swift, single-tap transaction entry block with a quick
 *       receipt scan option." Active on any /transactions/* route.
 *
 *   3. Macro Analytics — /insights               ◍
 *      "Opens deep, historical data analytics sheets, including your
 *       12-month net worth curves and cash flow funnel charts."
 *      Active on any /insights/* route.
 *
 *   4. System Blueprint — /settings             ⚙
 *      "Configures global variables, automated pay-period splits,
 *       and synchronization links between your computer and mobile
 *       environments." Active on any /settings/* route.
 *
 * Fixed at the bottom of the viewport on every page. Active state
 * is derived from the current pathname. Component Oracle Terminal
 * voice: teal-cyan active rail (2px, glow), surface-tinted active
 * background, mono caps labels, square 4px corners.
 *
 * On mobile the bar collapses to icon-only (labels hidden < 540px);
 * the 4-icon row stays legible on a phone (~94px per cell on 375px).
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  /** Long-form for aria-label and tooltips (the dock can be terse). */
  fullName: string;
  glyph: string;
  /** Match a deeper route as well, e.g. /transactions/new should
   *  highlight the Ledger Input tab even though /transactions is
   *  the canonical prefix. */
  matchPrefix?: string;
  /** Set true ONLY for the dashboard tab — its canonical href is "/"
   *  and we want the active state to match the root exactly, not
   *  every other path (which would happen if matchPrefix were "/"). */
  matchExact?: boolean;
}

const TABS: Tab[] = [
  {
    href: "/",
    label: "DASHBOARD",
    fullName: "Dashboard Hub",
    glyph: "◉",
    matchExact: true,
  },
  {
    href: "/transactions/new",
    label: "LEDGER",
    fullName: "Ledger Input",
    glyph: "+",
    matchPrefix: "/transactions",
  },
  {
    href: "/insights",
    label: "ANALYTICS",
    fullName: "Macro Analytics",
    glyph: "◍",
    matchPrefix: "/insights",
  },
  {
    href: "/settings",
    label: "BLUEPRINT",
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
        background: "var(--cosmos-2)",
        borderTop: "1px solid var(--line)",
        padding: "8px 16px 10px",
        boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.5)",
        // Lift above any in-page overflow
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {TABS.map((t) => {
          const active = isActiveTab(pathname, t);
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
                gap: 4,
                padding: "8px 10px",
                borderRadius: 3,
                background: active ? "var(--surface)" : "transparent",
                border: `1px solid ${active ? "var(--terminal-cyan-dim)" : "transparent"}`,
                color: active ? "var(--terminal-cyan)" : "var(--ink-3)",
                textDecoration: "none",
                transition: "all 120ms",
                position: "relative",
              }}
            >
              {/* Active rail — a 2px line on top of the tab */}
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -1,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 32,
                    height: 2,
                    background: "var(--terminal-cyan)",
                    boxShadow: "0 0 6px var(--terminal-cyan)",
                  }}
                />
              )}
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
                  fontWeight: active ? 600 : 500,
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
