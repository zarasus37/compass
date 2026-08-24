"use client";

/**
 * BottomNav — the persistent bottom menu (Bottom 30% per the
 * Front-End Architecture Layout Rules).
 *
 * Three tabs: Quick Entry, Advanced Analytics, Settings.
 *   - Quick Entry: routes to /transactions/new (a tap-to-add
 *     surface; the "+" icon doubles as an affordance hint)
 *   - Advanced Analytics: routes to /insights
 *   - Settings: routes to /settings
 *
 * Fixed at the bottom of the viewport on every page. Active state
 * is derived from the current pathname. Oracle-terminal voice:
 * teal-cyan active rail, mono caps labels, square 4px corners.
 *
 * On mobile the bar collapses to icon-only (labels hidden < 540px).
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  glyph: string;
  /** Match a deeper route as well, e.g. /transactions/new should
   *  highlight the Quick Entry tab even though /transactions is
   *  the canonical href. */
  matchPrefix?: string;
}

const TABS: Tab[] = [
  { href: "/transactions/new", label: "Quick Entry",  glyph: "+",  matchPrefix: "/transactions" },
  { href: "/insights",         label: "Advanced Analytics", glyph: "◍", matchPrefix: "/insights" },
  { href: "/settings",         label: "Settings",      glyph: "⚙",  matchPrefix: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {TABS.map((t) => {
          const active = t.matchPrefix
            ? pathname === t.href || pathname.startsWith(t.matchPrefix + "/") || pathname === t.matchPrefix
            : pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
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
                  fontSize: 9.5,
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
