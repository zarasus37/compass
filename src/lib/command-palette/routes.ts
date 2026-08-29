/**
 * Cluster 7.1 — Static route index for the command palette.
 *
 * The single source of truth for the 16 routes the palette can
 * navigate to. Mirrors the sidebar nav config in
 * `src/components/sidebar/AppSidebar.tsx` (same hrefs, same
 * chapter labels) but adds a one-line terminal-voice `sub`
 * per route so the palette has something to show in the
 * right-hand secondary line.
 *
 * If a route is added to the sidebar, add it here too. A
 * future cluster could merge these two configs into one shared
 * module; for now they live separately to keep the sidebar's
 * nav config free of palette-specific fields.
 */

import type { PaletteItem, PaletteChapter } from "./types";

interface RouteDef {
  href: string;
  title: string;
  chapter: PaletteChapter;
  sub: string;
}

const ROUTES: RouteDef[] = [
  // Overview
  { href: "/", title: "Dashboard", chapter: "Overview", sub: "today's snapshot" },
  { href: "/period", title: "Period", chapter: "Overview", sub: "this pay period" },
  { href: "/calendar", title: "Calendar", chapter: "Overview", sub: "month view" },
  { href: "/insights", title: "Insights", chapter: "Overview", sub: "your numbers" },
  // Ledger
  { href: "/accounts", title: "Accounts", chapter: "Ledger", sub: "balances" },
  { href: "/transactions", title: "Transactions", chapter: "Ledger", sub: "every charge" },
  { href: "/envelopes", title: "Envelopes", chapter: "Ledger", sub: "vessels" },
  { href: "/allocation", title: "Allocation", chapter: "Ledger", sub: "auto-allocate plan" },
  { href: "/obligations", title: "Obligations", chapter: "Ledger", sub: "bills + subscriptions" },
  { href: "/vault", title: "Vault", chapter: "Ledger", sub: "self-custody" },
  { href: "/vault/preferences", title: "Vault preferences", chapter: "Ledger", sub: "your policy" },
  { href: "/debts", title: "Debts", chapter: "Ledger", sub: "payoff simulator" },
  { href: "/holdings", title: "Holdings", chapter: "Ledger", sub: "investments" },
  // Aims
  { href: "/goals", title: "Goals", chapter: "Aims", sub: "trajectory + targets" },
  // Learn
  { href: "/learn/field-guide", title: "Field Guide", chapter: "Learn", sub: "the model" },
  { href: "/learn/your-numbers", title: "Your Numbers", chapter: "Learn", sub: "coaching" },
  { href: "/advisor", title: "Advisor", chapter: "Learn", sub: "ask anything" },
  { href: "/learn/glossary", title: "Glossary", chapter: "Learn", sub: "vocabulary" },
  { href: "/learn/habit-quiz", title: "Habit Quiz", chapter: "Learn", sub: "your profile" },
  // System (footer / gear) — reachable via the top-bar cog, not the sidebar
  { href: "/settings", title: "Settings", chapter: "System", sub: "system hub" },
  { href: "/onboarding", title: "Onboarding", chapter: "System", sub: "build your identity" },
];

export const STATIC_ROUTES: PaletteItem[] = ROUTES.map((r) => ({
  id: `route:${r.href}`,
  href: r.href,
  title: r.title,
  kind: "ROUTE",
  chapter: r.chapter,
  sub: r.sub,
}));

export const ROUTE_COUNT = STATIC_ROUTES.length;
