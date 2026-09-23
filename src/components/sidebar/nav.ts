/**
 * Sidebar nav structure — shared between AppSidebar (desktop inline
 * rail) and MobileSidebarSheet (mobile overlay drawer). Cluster 7.30a.
 *
 * The structure is intentionally module-local: lazy-loaded by both
 * surfaces, never imported into a server component (avoid pulling
 * React state into the SSR pass).
 */

export interface NavBadge {
  text: string;
  tone: "count" | "auto";
}

export interface NavItem {
  href: string;
  label: string;
  badge?: NavBadge;
  /**
   * If "exact", this item only matches when pathname === href.
   * Otherwise a prefix match (so `/vault/preferences` would still
   * match `/vault`).
   */
  match?: "prefix" | "exact";
}

export interface NavChapter {
  label: string;
  items: NavItem[];
  /** Optional slot rendered between the chapter label and its items. */
  slot?: React.ReactNode;
}

export const NAV: NavChapter[] = [
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
      { href: "/vault",        label: "Vault",   badge: { text: "BETA", tone: "auto" }, match: "exact" },
      { href: "/vault/preferences", label: "Preferences" },
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
      { href: "/advisor",            label: "Advisor", badge: { text: "NEW", tone: "auto" } },
      { href: "/learn/glossary",   label: "Glossary" },
      { href: "/learn/habit-quiz", label: "Habit Quiz" },
    ],
  },
];

/**
 * Picks the active href for highlighting. Mirrors the desktop sidebar
 * behavior: default is prefix match, but `/vault` opts in to exact.
 */
export function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
