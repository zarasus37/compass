/**
 * SectionHeader — the eyebrow + title + em tail + accent-line block
 * reused at the top of every /vault section (and the rest of the
 * app). Originally a page-local helper in `src/app/(app)/vault/page.tsx`
 * (Phase 2.0); extracted to its own module in Phase 3.5 so client
 * components (the bill-schedule island, the editor modal wrapper)
 * can render the same header without re-defining it inline.
 *
 * Pure presentational — no state, no side-effects, no client-only
 * APIs. Safe to import from both server and client components.
 */

export type SectionAccent = "cyan" | "gold" | "mercury" | "jupiter";

export function SectionHeader({
  eyebrow,
  title,
  em,
  accent,
}: {
  eyebrow: string;
  title: string;
  em: string;
  accent: SectionAccent;
}) {
  const color =
    accent === "gold"
      ? "var(--gold)"
      : accent === "mercury"
        ? "var(--mercury)"
        : accent === "jupiter"
          ? "var(--jupiter)"
          : "var(--terminal-cyan)";
  const eyebrowParts = eyebrow.match(/^(\/\/)\s*(.*)$/);
  const eyebrowPrefix = eyebrowParts?.[1] ?? "//";
  const eyebrowRest = eyebrowParts?.[2] ?? "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>{eyebrowPrefix}</span>{" "}
          {eyebrowRest}
        </span>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 22,
            margin: 0,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 400,
            fontSize: 14,
            color: "var(--ink-3)",
          }}
        >
          {em}
        </span>
      </div>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 60,
          height: 1,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
}
