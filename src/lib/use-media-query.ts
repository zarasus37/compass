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
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  // SSR-safe default: assume desktop until the client measures.
  // The first client render flips the value if needed (one re-render).
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // matchMedia.addEventListener is the modern API; older
    // browsers fall back to addListener.
    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Legacy Safari fallback (Safari < 14)
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}