"use client";

/**
 * MustHaveToolsStrip — a one-row terminal index of all 5 must-have
 * visualization tools + 4 core feature surfaces. Lives between the
 * dashboard hero and the card grid. Not customizable — always visible.
 *
 * Pattern (oracle terminal):
 *   "INDEXED · 5 VIZ · 4 FEATURES" header in mono caps
 *   Each tool is a chip: glyph + name + "›" chevron. Hover lifts the
 *   chip and shows a teal border. Tap navigates to the deep page.
 *
 * The viz tools (1-5) are the must-have visualizations. The features
 * (6-9) are the core utilities (Plaid, AI categorize, Receipt scan,
 * Subscriptions, Habit quiz, Household).
 */

import * as React from "react";
import Link from "next/link";

interface Tool {
  id: string;
  num: string; // e.g. "01", "02"
  glyph: string;
  name: string;
  href: string;
  caption: string;
}

const VIZ_TOOLS: Tool[] = [
  {
    id: "alloc-bar",
    num: "01",
    glyph: "▰",
    name: "Allocation Bar",
    href: "/envelopes",
    caption: "per-vessel linear gauge",
  },
  {
    id: "spend-ring",
    num: "02",
    glyph: "◍",
    name: "Spend Ring",
    href: "/insights",
    caption: "concentric donut",
  },
  {
    id: "horizon",
    num: "03",
    glyph: "⏱",
    name: "Pay Period Horizon",
    href: "/recurring",
    caption: "bills + goals timeline",
  },
  {
    id: "trajectory",
    num: "04",
    glyph: "📈",
    name: "Growth Curve",
    href: "/insights",
    caption: "12-month net worth",
  },
  {
    id: "sankey",
    num: "05",
    glyph: "⇉",
    name: "Cash Flow Funnel",
    href: "/allocation",
    caption: "paycheck → vessels",
  },
];

const FEATURE_TOOLS: Tool[] = [
  {
    id: "plaid",
    num: "06",
    glyph: "⌬",
    name: "Multi-Bank",
    href: "/accounts",
    caption: "Plaid sandbox",
  },
  {
    id: "ai-cat",
    num: "07",
    glyph: "✦",
    name: "Smart Categorize",
    href: "/transactions",
    caption: "auto-tag payees",
  },
  {
    id: "receipt",
    num: "08",
    glyph: "⎙",
    name: "Receipt Scan",
    href: "/transactions",
    caption: "paste-text OCR fallback",
  },
  {
    id: "subs",
    num: "09",
    glyph: "↻",
    name: "Subscriptions",
    href: "/subscriptions",
    caption: "detect + cancel",
  },
  {
    id: "habit",
    num: "10",
    glyph: "✺",
    name: "Habit Quiz",
    href: "/settings/habit-quiz",
    caption: "tailor insights",
  },
  {
    id: "household",
    num: "11",
    glyph: "◊",
    name: "Household",
    href: "/settings/household",
    caption: "shared access",
  },
];

export function MustHaveToolsStrip() {
  return (
    <section
      aria-label="Must-have tools index"
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "16px 20px 18px",
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span aria-hidden style={{ color: "var(--ok)" }}>●</span>
          INDEXED · 5 VIZ · 6 FEATURES
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          tap a tool to open it
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <Row label="// visualisations" tools={VIZ_TOOLS} accent="var(--terminal-cyan)" />
        <Row label="// utilities" tools={FEATURE_TOOLS} accent="var(--gold)" />
      </div>
    </section>
  );
}

function Row({
  label,
  tools,
  accent,
}: {
  label: string;
  tools: Tool[];
  accent: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${tools.length}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {tools.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderLeft: `2px solid ${accent}`,
              borderRadius: 3,
              textDecoration: "none",
              color: "inherit",
              transition: "transform 140ms, border-color 140ms, background 140ms",
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--cosmos)";
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9,
                color: "var(--ink-4)",
                letterSpacing: "0.06em",
              }}
            >
              {t.num}
            </span>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <span aria-hidden style={{ color: accent, fontSize: 13, flexShrink: 0 }}>
                  {t.glyph}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 12.5,
                    color: "var(--ink)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.name}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9,
                  color: "var(--ink-4)",
                  letterSpacing: "0.04em",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.caption}
              </div>
            </div>
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                color: "var(--ink-4)",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
