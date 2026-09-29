"use client";

/**
 * Client error capture — window listeners.
 *
 * Cluster 7.52 — pure-client JS errors (a `throw new Error`
 * inside a `'use client'` component, an unhandled promise
 * rejection from a fetch, a third-party script hiccup) bypass
 * Next.js's `(app)/error.tsx` boundary entirely. Without this
 * listener, those hits would never reach the operator — the
 * page would just go blank.
 *
 * Mounted in `(app)/layout.tsx` so every signed-in page gets
 * the listeners. Two capture paths:
 *
 *   - `window.onerror` catches synchronous throws + resource
 *     load failures (script/image/iframe errors).
 *   - `window.unhandledrejection` catches Promise rejections
 *     that bubble up without a `.catch`.
 *
 * Both paths debounce — a single broken page session shouldn't
 * fire 50 POSTs. The capture POST itself is fire-and-forget
 * (`keepalive: true` so the request survives page unload
 * when the user clicks a different link mid-throw).
 *
 * Visual presence: zero. The component renders nothing — it
 * exists only to install the listeners. Use `data-testid` so
 * the smoke can assert presence without rendering pixels.
 */

import * as React from "react";
import { usePathname } from "next/navigation";
// Client-safe module on purpose. Importing this from
// `@/lib/client-error` pulls prisma → pg → node builtins into the
// browser bundle and 500s every (app) page. See the header of
// `client-error-shared.ts` for the full story.
import { pathnameFromUrl } from "@/lib/client-error-shared";

type ClientErrorCaptureProps = {
  /**
   * When false, the component renders nothing AND skips
   * listener installation. Reserved for future Opt-Out
   * surface (e.g. an in-app "telemetry off" toggle).
   * Default `true`.
   */
  enabled?: boolean;
};

/**
 * Dedup window (ms). Posts that fire within this window of
 * the previous one with the same `(source, signature)` are
 * squashed to one POST. Prevents the client capture from
 * blowing up the API when a render loop triggers the same
 * error dozens of times.
 */
const DEDUP_WINDOW_MS = 1_500;

/**
 * `fetch` `keepalive: true` + a short timeout means the
 * capture POST survives navigations and never blocks the
 * main thread for more than this long.
 */
const POST_TIMEOUT_MS = 4_000;

export function ClientErrorCapture({ enabled = true }: ClientErrorCaptureProps) {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Per-effect-instance dedup state. Closure-scoped so the
    // window listener can't double-fire and so cleanup removes
    // the right state on unmount.
    const lastPostedSig = new Map<string, number>();

    type CapturedReason =
      | "client-window-onerror"
      | "client-unhandledrejection";

    const post = (reason: CapturedReason, payload: {
      message?: string | null;
      stack?: string | null;
      url?: string;
      digest?: string | null;
      envelopeId?: string | null;
    }) => {
      const url = payload.url ?? window.location.href;
      // Build a stable signature from the message + URL +
      // reason. Same throw on a different page = different
      // signature (page is part of the key — same component
      // throwing on `/envelopes` vs `/envelopes/[id]` should
      // log separately).
      const sig = `${reason}|${pathnameFromUrl(url)}|${payload.message ?? ""}|${payload.stack?.slice(0, 200) ?? ""}`;
      const last = lastPostedSig.get(sig) ?? 0;
      const now = Date.now();
      if (now - last < DEDUP_WINDOW_MS) return;
      lastPostedSig.set(sig, now);

      // Body deliberately small. Stack truncated by the server's
      // `recordClientError` (8KB cap) — the client sends the
      // whole thing so the server can keep the first 8KB.
      const body = JSON.stringify({
        digest: payload.digest ?? null,
        message: payload.message ?? null,
        stack: payload.stack ?? null,
        url,
        pathname: pathname ?? pathnameFromUrl(url),
        envelopeId: payload.envelopeId ?? null,
        source: reason,
        userAgent: navigator.userAgent ?? null,
        viewportWidth: window.innerWidth ?? null,
        viewportHeight: window.innerHeight ?? null,
      });
      try {
        // `keepalive: true` lets the request survive a page
        // unload triggered by a subsequent navigation. The
        // browser limits keepalive bodies to 64KB; we're well
        // under.
        fetch("/api/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
          signal: AbortSignal.timeout(POST_TIMEOUT_MS),
        }).catch(() => {
          // Capture path must never throw upward — swallow
          // silently. We can't log here because we'd recurse.
        });
      } catch {
        // Same swallow — `fetch` itself can throw on some
        // ancient browsers when offline.
      }
    };

    /**
     * `window.onerror(message, source, lineno, colno, error)`
     * — only `message` and `error` are reliable across
     * browsers. `error.stack` is where we get the file:line.
     * Cross-origin scripts return `"Script error."` with no
     * usable stack; we still post so the operator sees the
     * page, the URL, and that "Script error." happened.
     */
    const onerror = (
      message: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => {
      const msg =
        typeof message === "string"
          ? message
          : message instanceof Event
          ? `${message.type ?? "event"}`
          : "unknown";
      post("client-window-onerror", {
        message: `${msg} (at ${source ?? "?"}:${lineno ?? "?"}:${colno ?? "?"})`,
        stack: error?.stack ?? null,
      });
    };

    /**
     * `unhandledrejection` fires when a Promise rejects
     * without a `.catch`. The reason can be anything — most
     * common is a `TypeError` from a fetch or a property
     * access. We serialize the best we can.
     */
    const onrejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : reason
          ? safeStringify(reason).slice(0, 1024)
          : "unhandled promise rejection (no reason)";
      const stack = reason instanceof Error ? reason.stack : null;
      post("client-unhandledrejection", {
        message,
        stack,
      });
    };

    window.addEventListener("error", onerror);
    window.addEventListener("unhandledrejection", onrejection);

    return () => {
      window.removeEventListener("error", onerror);
      window.removeEventListener("unhandledrejection", onrejection);
    };
  }, [enabled, pathname]);

  // Component itself is invisible. The render returns null.
  return (
    <span
      data-testid="client-error-capture"
      aria-hidden
      style={{ display: "none" }}
    />
  );
}

/**
 * Cyclic / non-stringifiable values throw on `JSON.stringify`.
 * We never want the capture path to throw, so wrap.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
