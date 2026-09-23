"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LiveActivityTicker } from "@/components/shell/LiveActivityTicker";
import type { AuditLogRow } from "@/lib/vault/audit-log-shared";
import { NAV, isActive } from "./nav";
import { useIsMobile } from "@/hooks/useMediaQuery";

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
 *                 Obligations, Vault, Debts, Holdings
 *   // AIMS      — Goals
 *   // LEARN     — Field Guide, Your Numbers, Advisor, Glossary, Habit Quiz
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
  /**
   * How the active state is computed against the current
   * pathname. "prefix" (the default) matches when the pathname
   * equals href OR starts with href + "/" — this lights up
   * detail pages like /envelopes/[id] under the /envelopes
   * sidebar item. "exact" only matches when the pathname
   * equals href — used for /vault, which has its own sub-pages
   * (/vault/preferences, /vault/schedule) that should light up
   * their own sidebar items instead.
   */
  match?: "exact" | "prefix";
}

interface NavChapter {
  label: string;
  items: NavItem[];
  /**
   * Optional content rendered between the chapter label and the
   * first nav item. Used by the `// Ledger` chapter to host the
   * LiveActivityTicker (Cluster 7.11). When undefined, the
   * chapter renders label + items as before.
   */
  slot?: React.ReactNode;
}

export interface AppSidebarProps {
  user: { name: string; email: string };
  /**
   * Last N audit events (newest first) read server-side. Passed
   * to the `// Ledger` chapter's LiveActivityTicker. The ticker
   * filters the meta events client-side and then subscribes for
   * live updates via the existing SSE bus.
   *
   * Cluster 7.11.
   */
  tickerInitialRows?: AuditLogRow[];
}

export function AppSidebar({ user, tickerInitialRows = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const isMobile = useIsMobile();

  // Cluster 7.30a — on mobile the desktop rail is replaced by the
  // MobileSidebarSheet overlay drawer (rendered in (app)/layout).
  // Render `null` so the inline column disappears entirely; the
  // main column then gets the full viewport width.
  if (isMobile) return null;

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

      {NAV.map((chapter) => {
        // Cluster 7.11 — the `// Ledger` chapter hosts the
        // LiveActivityTicker. The ticker is a child of the
        // chapter's slot (between the label and the first nav
        // item); when there are no events, the ticker renders
        // nothing so the chapter falls through to the same
        // label + items layout.
        const slot =
          chapter.label === "// Ledger" && tickerInitialRows ? (
            <LiveActivityTicker initialRows={tickerInitialRows} />
          ) : (
            chapter.slot
          );
        return (
          <NavChapterView
            key={chapter.label}
            chapter={{ ...chapter, slot }}
            pathname={pathname}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        );
      })}

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

// Brand mark — a stylized compass rose, matching the system PWA icon
// (the ornate Compass Rose from Cluster 7.31). Renders as a clean SVG
// silhouette at small sizes; the inner constellation / runes would
// be unreadable at 28px, so the abstraction is two diamonds + a center
// circle + the suspension loop.
//
// Cluster 7.31 — replaces the prior placeholder `[C]` glyph with a
// consistent visual identity. Color follows the existing vessel
// tokens so the rose matches the system brand.
function BrandMark() {
  return (
    <div
      aria-hidden
      data-testid="brand-mark-compass-rose"
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--vessel-accent)" }}
      >
        {/* suspension loop */}
        <circle cx="14" cy="2.2" r="1.4" />
        <path d="M14 3.6 L14 6.4" />
        {/* outer 4-point compass rose */}
        <path d="M14 6.4 L21 14 L14 21.6 L7 14 Z" />
        {/* inner 4-point compass rose (diamond), 90° offset */}
        <path d="M7 14 L14 7 L21 14 L14 21 Z" />
        {/* center gem */}
        <circle cx="14" cy="14" r="1.4" fill="currentColor" />
      </svg>
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
        <>
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
          {/* Cluster 7.11 — chapter slot (e.g. LiveActivityTicker
              on the Ledger chapter). Renders between the label
              and the first nav item. */}
          {chapter.slot}
        </>
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
        const itemIsActive = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            aria-current={itemIsActive ? "page" : undefined}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "7px 10px",
              borderRadius: 2,
              color: itemIsActive ? "var(--vessel-accent)" : "var(--ink-2)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12.5,
              fontWeight: itemIsActive ? 600 : 500,
              textDecoration: "none",
              background: itemIsActive ? "var(--vessel-surface)" : "transparent",
              border: itemIsActive
                ? "1px solid var(--vessel-accent-soft)"
                : "1px solid transparent",
              whiteSpace: "nowrap",
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "all 120ms",
            }}
          >
            {/* The teal connection indicator — left rail for active items */}
            {itemIsActive && !collapsed && (
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
                  color: itemIsActive ? "var(--vessel-accent)" : "var(--ink-5)",
                  fontSize: 11,
                }}
              >
                {itemIsActive ? "›" : " "}
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

