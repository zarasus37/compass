import * as React from "react";

/**
 * PageHead — the articulated page header.
 * Per 00-DESIGN.md §7 "Articulated deep pages" — every deep page
 * uses this same pattern: eyebrow (Cinzel caps) + title (Italiana
 * with italic em time-context) + 1-2 paragraph explanation block.
 * Optional actions slot on the right.
 */
export interface PageHeadProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  em?: string;
  explanation: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional accent color for the eyebrow + accent rule. */
  accent?: "gold" | "jupiter" | "mars" | "mercury" | "venus" | "saturn" | "luna";
}

const ACCENT_VAR: Record<NonNullable<PageHeadProps["accent"]>, string> = {
  gold: "var(--gold)",
  jupiter: "var(--jupiter)",
  mars: "var(--mars)",
  mercury: "var(--mercury)",
  venus: "var(--venus)",
  saturn: "var(--saturn)",
  luna: "var(--luna)",
};

export function PageHead({
  eyebrow,
  title,
  em,
  explanation,
  actions,
  accent = "gold",
}: PageHeadProps) {
  const accentColor = ACCENT_VAR[accent];
  return (
    <header style={{ marginBottom: 56, position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10.5,
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontWeight: 400,
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "0.005em",
              margin: "0 0 18px",
              color: "var(--ink)",
            }}
          >
            {title}
            {em && (
              <em
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  fontWeight: 500,
                  marginLeft: 12,
                  fontSize: 40,
                }}
              >
                {em}
              </em>
            )}
          </h1>
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 18,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          maxWidth: 780,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          position: "relative",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -1,
            left: 0,
            width: 80,
            height: 1,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
          }}
        />
        {explanation}
      </div>
    </header>
  );
}
