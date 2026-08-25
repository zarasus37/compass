"use client";

/**
 * MustHaveToolsStrip — a one-row terminal index of all 5 must-have
 * visualization tools + 6 core feature surfaces. Lives between the
 * dashboard hero and the card grid. Not customizable — always visible.
 *
 * Pattern (oracle terminal):
 *   "INDEXED · 5 VIZ · 6 FEATURES" header in mono caps
 *   Each tool is a chip: glyph + name + "›" chevron. Hover lifts the
 *   chip and shows a teal border. Tap navigates to the deep page.
 *
 * Hover tooltip — on a ~350ms delay, a terminal-styled panel pops
 * above the chip showing the full name, what it does exactly, and a
 * concrete use-case example. Dismissed on mouse-leave or when another
 * chip is hovered. Honors prefers-reduced-motion.
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
  /** What the tool does, in one sentence. */
  description: string;
  /** A concrete "use this when…" example grounded in real money moves. */
  example: string;
}

const VIZ_TOOLS: Tool[] = [
  {
    id: "alloc-bar",
    num: "01",
    glyph: "▰",
    name: "Allocation Bar",
    href: "/envelopes",
    caption: "per-vessel linear gauge",
    description:
      "Horizontal tracking bar per envelope. Dynamically fills from left to right; color shifts green → yellow at 80% → red at 100%.",
    example:
      "Glance at the dashboard on payday — see at a glance which envelopes are full, which are about to run over, and which still have room.",
  },
  {
    id: "spend-ring",
    num: "02",
    glyph: "◍",
    name: "Spend Ring",
    href: "/insights",
    caption: "concentric donut",
    description:
      "A single donut ring around the total of every envelope target. Fills as you spend; the center shows remaining cash in big mono numerics.",
    example:
      "Mid-period check: the ring says you have $612 left across all vessels this month. The big number answers 'is this pace OK?' without reading every envelope.",
  },
  {
    id: "horizon",
    num: "03",
    glyph: "⏱",
    name: "Pay Period Horizon",
    href: "/obligations?tab=bills",
    caption: "bills + goals timeline",
    description:
      "Full-month calendar with every recurring bill, every goal target date, and every transaction, plotted against the cash-flow cycles.",
    example:
      "Open the calendar and you'll see Spectrum's $75 on the 27th and your goal deadline on the 12th — plan the next two weeks around what's due.",
  },
  {
    id: "trajectory",
    num: "04",
    glyph: "📈",
    name: "Growth Curve",
    href: "/insights",
    caption: "12-month net worth",
    description:
      "Line graph of net worth projected at the current pace over 12 months. Shaded area highlights the compounding. Gold dashed reference marks the emergency-fund target.",
    example:
      "If the line crosses the gold emergency line in March, you'll hit your safety net on schedule. If it's flat, the plan isn't moving it — time to raise per-paycheck.",
  },
  {
    id: "sankey",
    num: "05",
    glyph: "⇉",
    name: "Cash Flow Funnel",
    href: "/allocation",
    caption: "paycheck → vessels",
    description:
      "Sankey diagram: the paycheck arrives on the left, fans out across the seven vessels on the right, with link widths = each vessel's share.",
    example:
      "Run 'Plan My Next Check' to see the Sankey render the seven transfers in real time — the visual proof that $1,820 becomes $432 + $216 + … without lifting a finger.",
  },
];

const FEATURE_TOOLS: Tool[] = [
  {
    id: "plaid",
    num: "06",
    glyph: "⌬",
    name: "Multi-Bank",
    href: "/settings/plaid",
    caption: "Plaid sandbox",
    description:
      "Connect any bank account via Plaid. Real-time balance refresh, 24-month transaction history, and bank-native merchant names — no manual entry.",
    example:
      "Add your Chase checking + your savings + your Amex in 30 seconds. New transactions land in Compass the same minute the bank posts them.",
  },
  {
    id: "ai-cat",
    num: "07",
    glyph: "✦",
    name: "Smart Categorize",
    href: "/settings/categorize",
    caption: "auto-tag payees",
    description:
      "Rule-based engine: merchant substring → vessel. First hit wins. Unknown payees are flagged for a new rule or a Tier 1 AI suggestion.",
    example:
      "Tell it once that 'H-E-B' goes to Groceries, 'Spotify' goes to Joy, and 'Discover' goes to Debt. The next 1,000 transactions are tagged automatically.",
  },
  {
    id: "receipt",
    num: "08",
    glyph: "⎙",
    name: "Receipt Scan",
    href: "/settings/receipt-scan",
    caption: "paste-text OCR fallback",
    description:
      "Paste a paper receipt's text and the parser extracts merchant, total, and date. Pick a vessel, save — the draft transaction is in the live store.",
    example:
      "Get a Costco paper receipt, snap a phone photo, paste the OCR text from your camera roll. The total, merchant, and date are auto-filled in 2 seconds.",
  },
  {
    id: "subs",
    num: "09",
    glyph: "↻",
    name: "Subscriptions",
    href: "/obligations?tab=subs",
    caption: "detect + cancel",
    description:
      "Detects recurring charges by grouping live transactions on a 14/30/31-day cycle. Active (≤30 days) or review (60+ days unused). Recoverable total is the savings.",
    example:
      "Open it on the 1st and you'll see NYTimes at $17/mo for 63 days unused. Click Cancel, kill it in 2 taps, the $204/year lands in Buffer.",
  },
  {
    id: "habit",
    num: "10",
    glyph: "✺",
    name: "Habit Quiz",
    href: "/learn/habit-quiz",
    caption: "tailor insights",
    description:
      "5 short questions, weighted answers, one of 4 profiles (Saver / Steady / Builder / Dreamer). The profile is the baseline for AI Tier 1 insights.",
    example:
      "After taking the quiz, Compass knows you save aggressively, so an unusual $300 'Joy' spend surfaces as an anomaly — not a budgeting failure.",
  },
  {
    id: "household",
    num: "11",
    glyph: "◊",
    name: "Household",
    href: "/settings/household",
    caption: "shared access",
    description:
      "Multi-user access: invite a partner or family member. They see the same data with their own log-in. Schema-ready; full UI ships in Cluster 4.",
    example:
      "Add your partner with a Member role. They log in on their phone, see the same envelopes and goals, log their own transactions — all synced, one source of truth.",
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
          hover for details · tap to open
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
  // Hover state lives in the Row so only one tooltip shows at a time.
  // We track the hovered id; a small delay prevents flicker on mouseover.
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const onEnter = (id: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setHoveredId(id), 280);
  };
  const onLeave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setHoveredId(null);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const hovered = tools.find((t) => t.id === hoveredId) ?? null;

  return (
    <div onMouseLeave={onLeave} style={{ position: "relative" }}>
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
          <Chip
            key={t.id}
            tool={t}
            accent={accent}
            isHovered={hoveredId === t.id}
            onEnter={() => onEnter(t.id)}
          />
        ))}
      </div>

      {/* Tooltip — absolute, anchored to the Row so it can position itself
          with `right: 0` to avoid the right-edge clipping problem. */}
      {hovered && (
        <Tooltip tool={hovered} accent={accent} />
      )}
    </div>
  );
}

function Chip({
  tool,
  accent,
  isHovered,
  onEnter,
}: {
  tool: Tool;
  accent: string;
  isHovered: boolean;
  onEnter: () => void;
}) {
  return (
    <Link
      href={tool.href}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: isHovered ? "var(--cosmos)" : "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: `2px solid ${isHovered ? accent : "var(--line)"}`,
        borderRadius: 3,
        textDecoration: "none",
        color: "inherit",
        transition:
          "transform 140ms, border-color 140ms, background 140ms, border-left-color 140ms",
        minWidth: 0,
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
        {tool.num}
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
            {tool.glyph}
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
            {tool.name}
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
          {tool.caption}
        </div>
      </div>
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          color: isHovered ? accent : "var(--ink-4)",
          fontSize: 14,
          flexShrink: 0,
          transition: "color 140ms",
        }}
      >
        ›
      </span>
    </Link>
  );
}

function Tooltip({ tool, accent }: { tool: Tool; accent: string }) {
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        // Anchor above the row. The Row's overflow is visible by default,
        // so the tooltip can extend above the strip's box.
        bottom: "calc(100% - 0px)",
        left: 0,
        right: 0,
        marginBottom: 6,
        background: "var(--cosmos)",
        border: `1px solid ${accent}`,
        borderLeft: `2px solid ${accent}`,
        borderRadius: 4,
        padding: "14px 18px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(45, 212, 191, 0.05) inset",
        pointerEvents: "none", // don't block mouse from leaving the row
        animation: "mustHaveTooltipIn 160ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
          }}
        >
          {tool.num}
        </span>
        <span aria-hidden style={{ color: accent, fontSize: 16 }}>
          {tool.glyph}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.005em",
          }}
        >
          {tool.name}
        </span>
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
            marginLeft: "auto",
            textTransform: "uppercase",
          }}
        >
          hover
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 13,
          color: "var(--ink-2)",
          margin: "0 0 10px",
          lineHeight: 1.5,
        }}
      >
        {tool.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 10,
          alignItems: "baseline",
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            fontWeight: 700,
            color: accent,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          // example
        </span>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12.5,
            color: "var(--ink-3)",
            margin: 0,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {tool.example}
        </p>
      </div>
    </div>
  );
}
