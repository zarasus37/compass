/**
 * Service worker registrar — registers /sw.js on first prod load.
 *
 * Cluster 7.16. Skipped in development (NEXT_PUBLIC_NODE_ENV !== "production"):
 *   - Dev HMR would be masked by the SW's cache-first behavior on next chunks.
 *   - Service worker registration in dev causes confusing "old app" bugs.
 *
 * The SW itself lives at /public/sw.js (plain JS, not bundled) so it can
 * cache the app shell without going through the Next.js chunk pipeline.
 */
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Defer registration so the initial paint isn't blocked.
    if (document.readyState === "complete") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent failure — the app works without the SW. Logging would
        // surface in the console for users who already have one registered
        // from a previous deploy, and the user can't act on it.
      });
    } else {
      window.addEventListener(
        "load",
        () => {
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        },
        { once: true },
      );
    }
  }, []);

  return null;
}
