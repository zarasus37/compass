/**
 * Dashboard card catalog — the metadata that drives both the server
 * (which card bodies to render) and the client (drag handles, the
 * Add Card sheet, default-on flags).
 *
 * No "use client" — this is plain data, importable from both sides.
 */

import type { CardAccent } from "./DashboardCard";

export type CardId =
  | "daily-tracking"
  | "critical-timeline"
  | "envelope-status"
  | "top-priority"
  | "next-step"
  | "snapshot"
  | "spend-ring"
  | "net-trajectory"
  | "pay-distribution";

export type CardSpan = "full" | "half";

export interface CardMeta {
  id: CardId;
  /** Small caps eyebrow above the title. */
  eyebrow: string;
  /** Card title (Italiana, prominent). */
  title: string;
  /** Italic tail after the title, e.g. "tomorrow.". */
  em?: string;
  /** Glyph shown in the Add Card catalog. */
  glyph: string;
  /** Accent color for the eyebrow + left border. */
  accent: CardAccent;
  /** Tap-through destination in view mode. */
  href: string;
  /** "full" = 2 cols on desktop, "half" = 1 col. */
  span: CardSpan;
  /** Whether this card is in the default on dashboard. */
  defaultOn: boolean;
  /** Short description for the Add Card sheet. */
  description: string;
}

export const CARD_CATALOG: CardMeta[] = [
  {
    id: "daily-tracking",
    eyebrow: "// daily",
    title: "Daily Telemetry",
    em: "safe to spend today.",
    glyph: "☉",
    accent: "cyan",
    href: "/transactions",
    span: "full",
    defaultOn: false,
    description:
      "Safe-to-spend, today's pace vs. expected, and the 7-day average. Tap to see the full transaction record.",
  },
  {
    id: "critical-timeline",
    eyebrow: "// schedule",
    title: "Critical Timeline",
    em: "the next 2-3 bills.",
    glyph: "⏱",
    accent: "warn",
    href: "/recurring",
    span: "half",
    defaultOn: false,
    description:
      "The next 2-3 unpaid bills with color-coded time-remaining badges. Tap to flip Paid or see the full timeline. (Lives in the Top 30% zone of the dashboard by default — add from the catalog to also pin a compact copy here.)",
  },
  {
    id: "envelope-status",
    eyebrow: "// watchlist",
    title: "Envelope Status",
    em: "vessels needing attention.",
    glyph: "⚱",
    accent: "neg",
    href: "/envelopes",
    span: "half",
    defaultOn: false,
    description:
      "Top 3 envelopes ranked by attention needed — over-limit first, then highest utilization. Tap to see the full bar chart. (Lives in the Middle 40% Allocation Feed by default — add from the catalog to also pin a compact copy here.)",
  },
  {
    id: "net-trajectory",
    eyebrow: "// growth",
    title: "Net Trajectory",
    em: "12 months forward.",
    glyph: "📈",
    accent: "jupiter",
    href: "/insights",
    span: "full",
    defaultOn: true,
    description:
      "Line graph of net worth projected at the current pace. Shaded area beneath the curve shows the compounding. Gold dashed reference line marks the emergency fund target.",
  },
  {
    id: "pay-distribution",
    eyebrow: "// cash flow",
    title: "Pay Distribution",
    em: "where the paycheck goes.",
    glyph: "⇉",
    accent: "gold",
    href: "/allocation",
    span: "full",
    defaultOn: true,
    description:
      "The paycheck fans out into the seven vessels, weighted by the plan. Each segment is a planet. Tap to see the full Sankey (the Automation Map) on /allocation.",
  },
  {
    id: "next-step",
    eyebrow: "// recommended",
    title: "Next Step",
    em: "the one thing to fix.",
    glyph: "✺",
    accent: "neg",
    href: "/envelopes",
    span: "full",
    defaultOn: true,
    description:
      "The single most important thing to look at right now. Over-limit envelopes when they exist, calm jade when everything's fine.",
  },
  {
    id: "top-priority",
    eyebrow: "// priority",
    title: "Top Priority",
    em: "the goal you're saving for.",
    glyph: "✦",
    accent: "gold",
    href: "/goals",
    span: "full",
    defaultOn: false,
    description:
      "Your primary goal with the headline number, progress bar, and per-paycheck contribution. Tap to open the goal's full trajectory.",
  },
  {
    id: "snapshot",
    eyebrow: "// snapshot",
    title: "Snapshot",
    em: "the three big numbers.",
    glyph: "◐",
    accent: "cyan",
    href: "/period",
    span: "full",
    defaultOn: false,
    description:
      "The 3-cell summary — net worth, next paycheck, this period. Quick orientation at the bottom of the dashboard.",
  },
  {
    id: "spend-ring",
    eyebrow: "// total spend",
    title: "Spend Ring",
    em: "where this period stands.",
    glyph: "◍",
    accent: "cyan",
    href: "/insights",
    span: "full",
    defaultOn: false,
    description:
      "Single concentric ring showing total remaining budget for the period. The big number in the center is the cash you actually have left. Tap to see the full Ouroboros + Trajectory on /insights.",
  },
];

/** Quick lookup. */
export const CARD_META: Record<CardId, CardMeta> = CARD_CATALOG.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CardId, CardMeta>,
);

/** Default order for a fresh dashboard. */
export const DEFAULT_ORDER: CardId[] = CARD_CATALOG.filter((c) => c.defaultOn).map(
  (c) => c.id,
);

/**
 * Cards that USED to be default-on but are no longer, because the
 * same data is now surfaced in a more prominent zone above the
 * grid (SafeToSpendHero for daily telemetry, Top 30% for critical
 * timeline, Middle 40% AllocationFeed for envelope status).
 *
 * Existing users with saved layouts from before these changes
 * still have these cards in their localStorage order, which
 * produces duplicates of the upper-zone content. `loadLayout()`
 * silently drops them so the migration is one-way and invisible.
 *
 * The user can re-add any of them from the Add Card sheet if
 * they want a compact copy pinned to the bottom.
 */
export const DEPRECATED_DEFAULT_CARDS: ReadonlySet<CardId> = new Set<CardId>([
  "daily-tracking", // SafeToSpendHero (commit 69f4480) owns safe-to-spend
  "critical-timeline", // Top 30% zone (commit 83ce59d) owns the calendar
  "envelope-status", // Middle 40% AllocationFeed (commit 83ce59d) owns per-envelope
]);

/** localStorage key for the user's layout. */
export const STORAGE_KEY = "compass-dashboard-layout-v1";

export interface DashboardLayout {
  /** Order of the visible card ids, top to bottom. */
  order: CardId[];
}

export function defaultLayout(): DashboardLayout {
  return { order: [...DEFAULT_ORDER] };
}

export function loadLayout(): DashboardLayout {
  if (typeof window === "undefined") return defaultLayout();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as DashboardLayout;
    if (
      !parsed ||
      !Array.isArray(parsed.order) ||
      parsed.order.length === 0
    ) {
      return defaultLayout();
    }
    // Filter to known ids, drop deprecated ones, append any new ones
    // (e.g. a new card was added to the catalog after the user saved
    // their layout). See DEPRECATED_DEFAULT_CARDS for the migration
    // rationale.
    const known = new Set<CardId>(CARD_CATALOG.map((c) => c.id));
    const filtered = parsed.order.filter(
      (id): id is CardId =>
        known.has(id as CardId) && !DEPRECATED_DEFAULT_CARDS.has(id as CardId),
    );
    const missing = CARD_CATALOG.filter(
      (c) => c.defaultOn && !filtered.includes(c.id),
    ).map((c) => c.id);
    return { order: [...filtered, ...missing] };
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // localStorage might be disabled (private browsing) — fail silent.
  }
}
