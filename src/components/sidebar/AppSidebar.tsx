"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassRose } from "@/components/alchemy/CompassRose";

/**
 * AppSidebar — the 3-chapter sidebar (D13).
 *
 * Chapters: Overview / Plan / Money
 * Page names: plain English (Calendar / Insights / Envelopes / Transactions).
 * Glyphs: planetary/alchemical — visual only, never labeled in copy.
 *
 * Active state: derived from the URL pathname so it works for every
 * page in the app. The user can collapse the rail with the chevron,
 * which is wired up as a state toggle in the parent.
 */

interface NavItem {
  href: string;
  label: string;
  glyph: string;
  badge?: { text: string; tone: "gold" | "teal" };
}

interface NavChapter {
  label: string;
  items: NavItem[];
}

const NAV: NavChapter[] = [
  {
    label: "Overview",
    items: [
      { href: "/",              label: "Dashboard", glyph: "☉" },
      { href: "/period",        label: "Period",    glyph: "☽", badge: { text: "5D", tone: "gold" } },
      { href: "/calendar",      label: "Calendar",  glyph: "✦" },
      { href: "/insights",      label: "Insights",  glyph: "⚝" },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/goals",         label: "Goals",            glyph: "✺" },
      { href: "/recurring",     label: "Recurring bills",  glyph: "♁" },
      { href: "/emergency",     label: "Emergency fund",   glyph: "🜨" },
      { href: "/invest",        label: "Investment goal",  glyph: "⚷" },
      { href: "/allocation",    label: "Allocation plan",  glyph: "⚹", badge: { text: "AUTO", tone: "teal" } },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/envelopes",     label: "Envelopes",     glyph: "⚱" },
      { href: "/transactions",  label: "Transactions",  glyph: "⚜" },
      { href: "/accounts",      label: "Accounts",      glyph: "⚛" },
      { href: "/subscriptions", label: "Subscriptions", glyph: "♆" },
      { href: "/debts",         label: "Debts",         glyph: "⚸" },
      { href: "/investments",   label: "Investments",   glyph: "⚕" },
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
        background:
          "linear-gradient(180deg, rgba(15, 20, 45, 0.7) 0%, rgba(10, 14, 31, 0.95) 100%)",
        borderRight: "1px solid var(--line)",
        padding: "28px 18px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        position: "relative",
        width: collapsed ? 72 : 248,
        transition: "width 0.2s",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 80,
          bottom: 80,
          right: -1,
          width: 1,
          background:
            "linear-gradient(180deg, transparent 0%, var(--gold-soft) 30%, var(--gold-soft) 70%, transparent 100%)",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 8px",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <CompassRose size={36} color="var(--gold)" />
          {!collapsed && (
            <span
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: "0.18em",
                color: "var(--ink)",
                textTransform: "uppercase",
              }}
            >
              Compass
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            color: "var(--ink-3)",
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
          </svg>
        </button>
      </div>

      {NAV.map((chapter) => (
        <NavChapterView
          key={chapter.label}
          chapter={chapter}
          pathname={pathname}
          collapsed={collapsed}
        />
      ))}

      <div
        style={{
          marginTop: "auto",
          border: "1px solid var(--line)",
          borderRadius: 2,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(212, 175, 82, 0.08) 0%, transparent 70%), var(--surface)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 30%, var(--gold-glow) 0%, var(--gold) 40%, var(--gold-deep) 100%)",
            color: "var(--void)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-cinzel), serif",
            fontWeight: 600,
            fontSize: 15,
            boxShadow: "0 0 14px rgba(212, 175, 82, 0.4)",
            flexShrink: 0,
          }}
        >
          {user.name?.[0]?.toUpperCase() ?? "M"}
        </div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              {user.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                marginTop: 1,
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavChapterView({
  chapter,
  pathname,
  collapsed,
}: {
  chapter: NavChapter;
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {!collapsed && (
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gold-deep)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            padding: "0 12px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              flex: 1,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--gold-soft), transparent)",
            }}
          />
          {chapter.label}
          <span
            aria-hidden
            style={{
              flex: 1,
              height: 1,
              background: "linear-gradient(90deg, transparent, var(--gold-soft), transparent)",
            }}
          />
        </div>
      )}
      {chapter.items.map((item) => {
        const isActive = pathname === item.href || (item.href === "/" && pathname === "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 2,
              color: isActive ? "var(--gold-glow)" : "var(--ink-2)",
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 16,
              fontWeight: 500,
              textDecoration: "none",
              background: isActive
                ? "linear-gradient(90deg, rgba(212, 175, 82, 0.12) 0%, transparent 100%)"
                : "transparent",
              whiteSpace: "nowrap",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 2,
                  height: "70%",
                  background: "var(--gold)",
                  boxShadow: "0 0 8px var(--gold)",
                }}
              />
            )}
            <span
              style={{
                width: 18,
                height: 18,
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                lineHeight: 1,
                color: isActive ? "var(--gold)" : "var(--ink-3)",
                flexShrink: 0,
              }}
            >
              {item.glyph}
            </span>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && (
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 500,
                  padding: "1px 7px",
                  borderRadius: 2,
                  background: "transparent",
                  border: `1px solid ${item.badge.tone === "teal" ? "var(--mercury)" : "var(--gold-soft)"}`,
                  color: item.badge.tone === "teal" ? "var(--mercury)" : "var(--gold)",
                  letterSpacing: "0.04em",
                }}
              >
                {item.badge.text}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
