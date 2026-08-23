import * as React from "react";

/**
 * PageHead — the articulated page header.
 *
 * Component Oracle Terminal treatment: mono caps eyebrow with //
 * prefix, Sora display title (no italic em tail), Sora body
 * explanation block with a thin teal accent rule. The accent color
 * drives the eyebrow + the rule. Same shape as before, terminal voice.
 */
export interface PageHeadProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  em?: string;
  explanation: React.ReactNode;
  actions?: React.ReactNode;
  /** Accent color for the eyebrow + accent rule. Default: terminal-cyan. */
  accent?:
    | "cyan"
    | "gold"
    | "jupiter"
    | "mars"
    | "mercury"
    | "venus"
    | "saturn"
    | "luna";
}

const ACCENT_VAR: Record<NonNullable<PageHeadProps["accent"]>, string> = {
  cyan: "var(--terminal-cyan)",
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
  accent = "cyan",
}: PageHeadProps) {
  const accentColor = ACCENT_VAR[accent];
  return (
    <header style={{ marginBottom: 48, position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                  flexShrink: 0,
                }}
              />
              {eyebrow}
            </div>
          )}
          <h1
            style={{
              fontFamily: "var(--font-sora)",
              fontWeight: 600,
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              margin: "0 0 14px",
              color: "var(--ink)",
            }}
          >
            {title}
            {em && (
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  color: "var(--ink-3)",
                  fontWeight: 400,
                  marginLeft: 10,
                  fontSize: 20,
                  letterSpacing: "-0.005em",
                }}
              >
                {em}
              </span>
            )}
          </h1>
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          maxWidth: 780,
          paddingTop: 14,
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
