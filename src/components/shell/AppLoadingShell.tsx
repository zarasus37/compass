/**
 * Shared loading shell for the authenticated (app) routes.
 *
 * Historically this lived at `src/app/(app)/loading.tsx` — a
 * route-level `loading.tsx` at the GROUP root. That made the whole
 * `(app)` group a Suspense boundary, and it had a correctness cost:
 * Next flushes the 200 shell immediately, so any `notFound()` thrown
 * later in a page can no longer set the response status. The net
 * effect was that `/envelopes/does-not-exist` — and every other
 * not-found route under `(app)` — returned HTTP 200 with a
 * "could not be found" body instead of a 404.
 *
 * The shell is now mounted per-route instead (see the `loading.tsx`
 * files next to each data-heavy page) and imported directly by the two
 * list pages whose route segment also contains an `[id]` child, since
 * a `loading.tsx` on that segment would re-create the same problem
 * for the detail route.
 *
 * Note the shell is a nicety, not the load-bearing part of the UX: the
 * sidebar, top bar and bottom nav live in `(app)/layout.tsx`, which is
 * ABOVE every boundary here, so navigation stays responsive even on
 * routes with no shell at all.
 *
 * Cluster 7.39 — the shape is intentionally approximate: it holds the
 * layout's column structure so the page doesn't flicker to blank during
 * a slow DB query, but the heights are static (cards are data-driven so
 * a perfect skeleton would either lie or duplicate the card-component
 * tree).
 */
export function AppLoadingShell() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        maxWidth: 1480,
        padding: "40px 80px 112px",
        display: "grid",
        gap: 24,
      }}
    >
      {/* Hero placeholder — same height as the welcome + top priority */}
      <div
        style={{
          height: 180,
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 6,
        }}
      />
      {/* Card grid placeholder — 3-up at desktop widths */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 160,
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 6,
            }}
          />
        ))}
      </div>
      {/* Second row — 2-up */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              height: 200,
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 6,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          color: "var(--ink-4)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        // loading
      </span>
    </div>
  );
}

export default AppLoadingShell;
