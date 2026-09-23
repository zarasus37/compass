/**
 * SSR-safe media-query hook. Returns true when the viewport matches
 * the query. The first render returns `false` (server doesn't know
 * the viewport); the first client effect re-runs with the right value.
 *
 * Cluster 7.30a. Used by both AppSidebar and TopAppBar to switch
 * between the desktop rail and the mobile overlay drawer.
 *
 * Standard pattern; pulled out so the same hook is reusable for
 * future breakpoint-aware components.
 */
"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);

    // Set initial state from the live match — covers the case where
    // the query result is true at first paint, not just on a change.
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Convenience: "is this a mobile viewport?"
 * Threshold is the same one used by the existing dashboard-grid
 * responsive rule (≤ 880px — the point at which the inline sidebar
 * starts to make the main content too narrow).
 */
export const MOBILE_QUERY = "(max-width: 880px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
