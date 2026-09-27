/**
 * Route-level loading UI for every (app) page.
 *
 * Cluster 7.39 — Next.js renders this segment while the page's
 * server component is fetching. The shape is intentionally
 * approximate: it holds the layout's column structure so the page
 * doesn't flicker to blank during a slow DB query, but the heights
 * are static (cards are data-driven so a perfect skeleton would
 * either lie or duplicate the card-component tree).
 *
 * The shell (sidebar + TopAppBar + BottomNav) keeps rendering
 * during loading — the (app)/layout is above this boundary — so
 * mom can navigate away while a slow page resolves.
 */
export default function AppLoading() {
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