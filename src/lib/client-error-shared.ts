/**
 * Client-safe error helpers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `src/lib/client-error.ts` imports `prisma` from `@/server/db`, which
 * pulls `@prisma/adapter-pg` → `pg` → node builtins (`dns`, `fs`,
 * `util/types`) into the module graph. That is fine for server code,
 * fatal for a `"use client"` component: bundling `pg` for the browser
 * fails to resolve `dns` and every page in the `(app)` group returns
 * HTTP 500.
 *
 * This happened for real. Cluster 7.52 mounted `<ClientErrorCapture>`
 * in `(app)/layout.tsx`; the component imported `pathnameFromUrl`
 * from `@/lib/client-error` to build its dedup signature, which
 * dragged the whole Prisma/pg stack into the client bundle. Symptom:
 * `/accounts` 500 (and every other `(app)` page with it), which is
 * what turned GitHub CI red.
 *
 * The rule this file encodes: helpers used by client components must
 * not transitively reach the database. `pathnameFromUrl` is pure, so
 * it lives here with no imports at all. `client-error.ts` re-exports
 * it so server-side callers keep a single obvious import site.
 *
 * If you ever need to add a helper here, keep it dependency-free.
 */

/**
 * Reduce a full URL to its pathname.
 *
 * Used as part of the client dedup signature so "same throw on the
 * same page" is one row rather than one row per query-string
 * variation. Falls back to the raw string when the input is not
 * parseable — the capture path must never throw.
 */
export function pathnameFromUrl(url: string): string {
  try {
    // URL constructor throws on malformed input — treat as
    // fallback rather than letting the capture path itself error.
    return new URL(url, "http://placeholder.local").pathname;
  } catch {
    return url;
  }
}
