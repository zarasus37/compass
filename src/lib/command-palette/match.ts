/**
 * Cluster 7.1 — Pure search matcher for the command palette.
 *
 * The matcher takes a query string and a flat list of palette
 * items and returns the items that match, ordered by relevance.
 *
 * Ranking (highest first):
 *   1. Exact title match (case-insensitive)
 *   2. Title starts with query (case-insensitive)
 *   3. Title contains query as a whole word
 *   4. Title contains query as a substring
 *   5. Sub-text contains query as a substring
 *
 * No fuzzy matching in v1 — the matcher is O(n) per keystroke
 * and the index is ~50 items, so latency is well under a frame.
 * A future cluster can swap in fuse.js for typo tolerance
 * (this function is the only thing that needs to change).
 *
 * The matcher is pure and synchronous. The smoke imports it
 * directly to test the ranking priority.
 */

import type { PaletteItem } from "./types";

export interface MatchResult {
  item: PaletteItem;
  /** Lower score = better match. */
  rank: number;
}

const RANK_EXACT = 0;
const RANK_STARTS = 1;
const RANK_WORD = 2;
const RANK_SUBSTRING_TITLE = 3;
const RANK_SUBSTRING_SUB = 4;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function match(
  query: string,
  items: PaletteItem[],
): MatchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    // Empty query: return everything, ordered ROUTES first then
    // by title (so the default view is the static index with
    // the dynamic items below).
    return items
      .filter((i) => i.kind === "ROUTE")
      .map((item) => ({ item, rank: RANK_EXACT }))
      .concat(
        items
          .filter((i) => i.kind !== "ROUTE")
          .map((item) => ({ item, rank: RANK_EXACT })),
      );
  }

  const wordRe = new RegExp(`\\b${escapeRegExp(q)}`, "i");
  const titleLowerCache = new Map<string, string>();
  const titleLower = (t: string): string => {
    const cached = titleLowerCache.get(t);
    if (cached !== undefined) return cached;
    const v = t.toLowerCase();
    titleLowerCache.set(t, v);
    return v;
  };

  const out: MatchResult[] = [];
  for (const item of items) {
    const titleLow = titleLower(item.title);
    if (titleLow === q) {
      out.push({ item, rank: RANK_EXACT });
      continue;
    }
    if (titleLow.startsWith(q)) {
      out.push({ item, rank: RANK_STARTS });
      continue;
    }
    if (wordRe.test(item.title)) {
      out.push({ item, rank: RANK_WORD });
      continue;
    }
    if (titleLow.includes(q)) {
      out.push({ item, rank: RANK_SUBSTRING_TITLE });
      continue;
    }
    if (item.sub.toLowerCase().includes(q)) {
      out.push({ item, rank: RANK_SUBSTRING_SUB });
      continue;
    }
  }
  out.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Same rank: ROUTE items first, then by title (stable).
    if (a.item.kind === "ROUTE" && b.item.kind !== "ROUTE") return -1;
    if (b.item.kind === "ROUTE" && a.item.kind !== "ROUTE") return 1;
    return a.item.title.localeCompare(b.item.title);
  });
  return out;
}
