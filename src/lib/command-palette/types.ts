/**
 * Cluster 7.1 — Command palette types.
 *
 * The palette renders a flat list of `PaletteItem`s. The list is
 * built by concatenating the static route index (16 entries from
 * the sidebar) with the dynamic DB-backed items (envelopes +
 * goals + debts + bills + accounts — ~30 entries typically).
 *
 * The kind tag drives the left badge ([ROUTE] / [ENV] / [GOAL] /
 * [DEBT] / [BILL] / [ACC]). The href is the absolute route the
 * user lands on when they press Enter on the item. The sub is a
 * one-line terminal-voice description (chapter, vessel planet,
 * balance, etc.).
 *
 * Server-side source. The function `getSearchIndex(userId)` in
 * search-index.ts returns a `SearchIndex` shaped exactly like
 * the palette expects.
 */

export type PaletteKind = "ROUTE" | "ENV" | "GOAL" | "DEBT" | "BILL" | "ACC";

export type PaletteChapter =
  | "Overview"
  | "Ledger"
  | "Aims"
  | "Learn"
  | "System";

export interface PaletteItem {
  /** Stable id used by the React list + the active-state key. */
  id: string;
  /** The link to navigate to when the user presses Enter. */
  href: string;
  /** The primary label (envelope name, page title, etc.). */
  title: string;
  /** The kind tag, drives the left badge. */
  kind: PaletteKind;
  /** The chapter (only set for static ROUTE items; null for dynamic). */
  chapter: PaletteChapter | null;
  /** A one-line secondary description (planet, balance, etc.). */
  sub: string;
}

export interface SearchIndex {
  /** The 16 static routes (sidebar items). */
  routes: PaletteItem[];
  /** The ~30 dynamic DB-backed items (envelopes, goals, etc.). */
  items: PaletteItem[];
  /** Total count. */
  total: number;
}
