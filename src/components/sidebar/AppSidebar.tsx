"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * AppSidebar — the 4-chapter navigation rail (Component Oracle Terminal).
 *
 * Chapters: OVERVIEW / LEDGER / AIMS / LEARN (mono uppercase, terminal
 * labels with // prefix). The System chrome (Settings, Household, Plaid,
 * Smart Categorize, Receipt Scan) is NOT a sidebar chapter — it lives
 * behind the gear icon in TopAppBar per the Cluster 4.0 nav restructure.
 *
 *   // OVERVIEW  — Dashboard, Period, Calendar, Insights
 *   // LEDGER    — Accounts, Transactions, Envelopes, Allocation,
 *                 Obligations, Debts, Holdings
 *   // AIMS      — Goals
 *   // LEARN     — Field Guide, Your Numbers, Glossary, Habit Quiz
 *
 * Page names: plain English, mono items. Active state: teal/cyan left
 * rail + filled background. AUTO badge: teal/cyan border + text.
 *
 * Active state is derived from the URL pathname. The user can collapse
 * the rail with the chevron toggle in the header.
 *
 * The sidebar is the "sticky dark bar" the spec calls for, with mono
 * nav items and a teal connection-status CTA. No decorative occult
 * symbols — the product is a terminal, not a grimoire.
 */

interface NavItem {
  href: string;
  label: string;
  badge?: { text: string; tone: "auto" | "count" };
}

interface NavChapter {
  label: string;
  items: NavItem[];
}

const NAV: NavChapter[] = [
  {
    label: "// Overview",
    items: [
      { href: "/",         label: "Dashboard" },
      { href: "/period",   label: "Period",    badge: { text: "5D", tone: "count" } },
      { href: "/calendar", label: "Calendar" },
      { href: "/insights", label: "Insights" },
    ],
  },
  {
    label: "// Ledger",
    items: [
      { href: "/accounts",     label: "Accounts" },
      { href: "/transactions", label: "Transactions" },
      { href: "/envelopes",    label: "Envelopes" },
      { href: "/allocation",   label: "Allocation", badge: { text: "AUTO", tone: "auto" } },
      { href: "/obligations",  label: "Obligations" },
      { href: "/debts",        label: "Debts" },
      { href: "/holdings",     label: "Holdings" },
    ],
  },
  {
    label: "// Aims",
    items: [
      { href: "/goals", label: "Goals" },
    ],
  },
  {
    label: "// Learn",
    items: [
      { href: "/learn/field-guide", label: "Field Guide" },
      { href: "/learn/your-numbers", label: "Your Numbers" },
      { href: "/learn/glossary",   label: "Glossary" },
      { href: "/learn/habit-quiz", label: "Habit Quiz" },
    ],
  },
];

export interface AppSidebarProps {
  user: { name: string; email: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      style={{
        background: "var(--vessel-dark)",
        borderRight: "1px solid var(--vessel-border)",
        padding: "20px 12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        position: "relative",
        width: collapsed ? 64 : 232,
        transition: "width 0.2s",
      }}
    >
      {/* Header — brand + collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "4px 4px 12px",
          borderBottom: "1px solid var(--vessel-border)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <BrandMark />
          {!collapsed && (
            <span
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              Compass
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title="Collapse"
            style={{
              width: 22,
              height: 22,
              display: "grid",
              placeItems: "center",
              color: "var(--ink-3)",
              background: "transparent",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}
      </div>

      {NAV.map((chapter) => (
        <NavChapterView
          key={chapter.label}
          chapter={chapter}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      ))}

      {/* User — terminal-style status card at the bottom */}
      <div
        style={{
          marginTop: "auto",
          border: "1px solid var(--vessel-border)",
          borderRadius: 2,
          padding: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--vessel-surface)",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 2,
            background: "var(--vessel-surface)",
            border: "1px solid var(--vessel-accent-soft)",
            color: "var(--vessel-accent)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-jetbrains), monospace",
            fontWeight: 600,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {user.name?.[0]?.toUpperCase() ?? "M"}
        </div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontWeight: 500,
                fontSize: 12,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                color: "var(--ink-3)",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ color: "var(--vessel-accent)" }}>●</span> {user.email}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Brand mark — a square with a [C] and a tiny cursor. Terminal-flavored.
// ---------------------------------------------------------------------------

function BrandMark() {
  return (
    <div
      aria-hidden
      style={{
        width: 28,
        height: 28,
        display: "grid",
        placeItems: "center",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-accent-soft)",
        borderRadius: 2,
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--vessel-accent)",
          letterSpacing: "-0.02em",
        }}
      >
        [C]
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavChapterView — a labeled section of nav items.
// Chapter labels are terminal-style `// Overview` (mono, uppercase, with
// the JS comment prefix as a flavor).
// ---------------------------------------------------------------------------

function NavChapterView({
  chapter,
  pathname,
  collapsed,
  onToggleCollapse,
}: {
  chapter: NavChapter;
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {!collapsed ? (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 500,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "8px 12px 4px",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {chapter.label}
        </div>
      ) : (
        <div
          aria-hidden
          style={{
            height: 1,
            background: "var(--vessel-border)",
            margin: "4px 8px",
          }}
        />
      )}
      {chapter.items.map((item) => {
        const isActive = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            aria-current={isActive ? "page" : undefined}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "7px 10px",
              borderRadius: 2,
              color: isActive ? "var(--vessel-accent)" : "var(--ink-2)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12.5,
              fontWeight: isActive ? 600 : 500,
              textDecoration: "none",
              background: isActive ? "var(--vessel-surface)" : "transparent",
              border: isActive
                ? "1px solid var(--vessel-accent-soft)"
                : "1px solid transparent",
              whiteSpace: "nowrap",
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "all 120ms",
            }}
          >
            {/* The teal connection indicator — left rail for active items */}
            {isActive && !collapsed && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: "var(--vessel-accent)",
                  boxShadow: "0 0 6px var(--vessel-accent)",
                }}
              />
            )}
            {/* The leading ">" terminal prompt — only on active items */}
            {!collapsed && (
              <span
                aria-hidden
                style={{
                  width: 10,
                  flexShrink: 0,
                  color: isActive ? "var(--vessel-accent)" : "var(--ink-5)",
                  fontSize: 11,
                }}
              >
                {isActive ? "›" : " "}
              </span>
            )}
            <span
              style={{
                flex: collapsed ? "0 0 auto" : "1 1 auto",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {item.label}
            </span>
            {!collapsed && item.badge && (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 2,
                  background: "transparent",
                  border: `1px solid ${
                    item.badge.tone === "auto" ? "var(--vessel-accent-soft)" : "var(--vessel-border)"
                  }`,
                  color:
                    item.badge.tone === "auto"
                      ? "var(--vessel-accent)"
                      : "var(--ink-2)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {item.badge.text}
              </span>
            )}
            {collapsed && onToggleCollapse && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleCollapse();
                }}
                title="Expand"
                style={{
                  display: "none", // hidden in expanded mode
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * isItemActive — match a sidebar item to the current pathname.
 * - Exact match for "/" (dashboard home).
 * - Exact + prefix match for deep routes (so /envelopes/x stays lit
 *   when the sidebar item points to /envelopes).
 */
function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
