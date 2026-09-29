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

import { useCallback, useSyncExternalStore } from "react";

/**
 * `useSyncExternalStore` is the right primitive here: matchMedia is an
 * external store that is only readable on the client, so we hand React
 * a server snapshot of `false` and let it re-read the live value right
 * after hydration. That keeps the "server says false, client corrects
 * itself" behaviour without a setState-in-effect cascade.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false,
  );
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
