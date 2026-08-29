/**
 * Cluster 7.2 — Recent items for the ⌘K palette.
 *
 * Pure client-side recent-items state, persisted to
 * localStorage. The palette reads the list on mount, renders
 * a "RECENT" section above the search results, and pushes
 * a new entry every time the user navigates via any result
 * (RECENT or ROUTE/ENV/etc.).
 *
 * Storage shape:
 *   localStorage["compass-palette-recent"] = JSON.stringify([
 *     { id, title, href, kind, sub, visitedAt }, ...
 *   ])
 *
 * The cap is 8 items. New visits dedup by `id` (re-pushing
 * an existing item moves it to the top + updates
 * `visitedAt`). When the cap is exceeded, the oldest items
 * drop off the bottom.
 *
 * SSR-safe: every function returns `[]` or no-ops when
 * `localStorage` is undefined (the palette is a client
 * component, but future server-side callers — e.g. an
 * SSR initial-state API — would safely get the empty
 * default).
 *
 * Future cross-device sync would replace this with a
 * Prisma `RecentItem` table + a sync from localStorage on
 * sign-in. Out of scope for v1.
 */

import type { PaletteItem, PaletteKind } from "./types";

export interface RecentItem {
  id: string;
  title: string;
  href: string;
  kind: PaletteKind;
  sub: string;
  /** Unix epoch ms. */
  visitedAt: number;
}

export const STORAGE_KEY = "compass-palette-recent";
export const MAX_RECENT = 8;

function readStorage(): RecentItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: drop any items that don't match the shape.
    return parsed.filter(
      (r): r is RecentItem =>
        r !== null &&
        typeof r === "object" &&
        typeof (r as RecentItem).id === "string" &&
        typeof (r as RecentItem).href === "string" &&
        typeof (r as RecentItem).title === "string" &&
        typeof (r as RecentItem).kind === "string" &&
        typeof (r as RecentItem).sub === "string" &&
        typeof (r as RecentItem).visitedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or localStorage disabled. Silently
    // drop the write — the recent list will refill on the
    // next open.
  }
}

export function getRecent(): RecentItem[] {
  return readStorage();
}

/** Push an item to the top of the recent list. Dedups by id. */
export function pushRecent(item: PaletteItem): void {
  const existing = readStorage();
  const filtered = existing.filter((r) => r.id !== item.id);
  const next: RecentItem[] = [
    {
      id: item.id,
      title: item.title,
      href: item.href,
      kind: item.kind,
      sub: item.sub,
      visitedAt: Date.now(),
    },
    ...filtered,
  ].slice(0, MAX_RECENT);
  writeStorage(next);
}

/** Clear the recent list. No UI exposes this in v1. */
export function clearRecent(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
