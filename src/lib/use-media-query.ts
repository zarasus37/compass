"use client";

/**
 * useMediaQuery — tiny hook that returns `true` when the viewport
 * width is below the given breakpoint. SSR-safe (returns `false`
 * on the server, then flips on mount + listens for resize).
 *
 * Used by `/debts` Cluster 7.50 to detect narrow viewports and
 * collapse the 3-column card layout + 4-column stats grid.
 *
 * Pattern: only re-renders when the boolean flips, not on every
 * resize tick. Resize listeners debounce via the boolean compare.
 *
 * Examples:
 *   const isMobile = useMediaQuery("(max-width: 768px)")
 *   const isPhone = useMediaQuery("(max-width: 480px)")
 */
import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe default: the server snapshot is `false` (assume desktop),
 * then React re-reads the live value right after hydration.
 * `useSyncExternalStore` gives us that hand-off without a
 * setState-in-effect cascade.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      // matchMedia.addEventListener is the modern API; older
      // browsers fall back to addListener.
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      // Legacy Safari fallback (Safari < 14)
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
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