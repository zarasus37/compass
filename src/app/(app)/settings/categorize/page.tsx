import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * Smart Categorize — the auto-categorization rules engine.
 *
 * v1 ships a rule-based engine (no LLM needed). Each row maps a
 * merchant-substring pattern to a target vessel. When a new
 * transaction arrives, the engine matches the payee against the
 * patterns in priority order; the first hit wins.
 *
 * In v2 the same engine can call the AI provider as a fallback
 * (LLM suggests a vessel for unknown payees). The UI today
 * exposes the rule set the user can edit.
 *
 * Component Oracle Terminal treatment: teal CTA, mono caps,
 * cyan rule rows.
 */
type Rule = { pattern: string; vessel: string; hits: number };

const SEED_RULES: Rule[] = [
  { pattern: "H-E-B",         vessel: "Groceries",  hits: 42 },
  { pattern: "Walmart",       vessel: "Groceries",  hits: 18 },
  { pattern: "Amazon",        vessel: "Joy",        hits: 23 },
  { pattern: "Shell",         vessel: "Buffer",     hits: 8  },
  { pattern: "Exxon",         vessel: "Buffer",     hits: 5  },
  { pattern: "Spotify",       vessel: "Joy",        hits: 12 },
  { pattern: "Netflix",       vessel: "Joy",        hits: 12 },
  { pattern: "ChatGPT",       vessel: "Growth",     hits: 6  },
  { pattern: "Spectrum",      vessel: "Utilities",  hits: 6  },
  { pattern: "Magic Valley",  vessel: "Utilities",  hits: 4  },
  { pattern: "Discover",      vessel: "Debt",       hits: 4  },
  { pattern: "Rent",          vessel: "Rent",       hits: 2  },
];

export default function CategorizePage() {
  const ENVELOPES = liveEnvelopes();
  const vesselNames = ENVELOPES.map((e) => e.name);
  return (
    <div>
      <PageHead
        eyebrow="// money · transactions · categorize"
        title="Smart Categorize"
        em="patterns → vessels."
        accent="cyan"
        actions={
          <Link
            href="/settings"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All settings
          </Link>
        }
        explanation={
          <>
            Every merchant your bank sends gets matched against these patterns in priority order. First hit wins. When nothing matches, the transaction lands in "uncategorized" and the engine prompts you to add a rule. The rule set is yours — edit anytime. v2 will add an LLM fallback for unknown payees.
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          marginBottom: 28,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Stat label="rules" value={String(SEED_RULES.length)} sub="active" />
        <Stat label="hits" value={String(SEED_RULES.reduce((s, r) => s + r.hits, 0))} sub="all-time" />
        <Stat label="coverage" value="94%" sub="of transactions" accent="ok" />
        <Stat label="uncategorized" value="6" sub="need a rule" accent="warn" />
      </div>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: "14px 22px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> rules · {SEED_RULES.length} total
          </div>
          <button
            type="button"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--terminal-cyan)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "8px 16px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + Add rule
          </button>
        </div>
        <div>
          {SEED_RULES.map((r, i) => (
            <div
              key={r.pattern}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 100px 100px",
                alignItems: "center",
                gap: 18,
                padding: "12px 22px",
                borderBottom: i < SEED_RULES.length - 1 ? "1px solid var(--line-soft)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {r.pattern}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 14,
                  color: "var(--terminal-cyan)",
                }}
              >
                → {r.vessel}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--ink-3)",
                  textAlign: "right",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {r.hits} hits
              </div>
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    background: "transparent",
                    color: "var(--ink-3)",
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                    padding: "4px 10px",
                    fontSize: 9.5,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--gold)",
          borderRadius: 3,
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> v2: AI tier 1 fallback
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-2)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          When a payee doesn't match any rule, the engine will ask the AI provider to suggest a vessel. You confirm or override; the confirmed answer becomes a new rule automatically. The LLM never sees your balances or other transactions — only the payee string.
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {vesselNames.map((v) => (
            <span
              key={v}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-2)",
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "4px 8px",
                letterSpacing: "0.04em",
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "warn" | "ok";
}) {
  return (
    <div
      style={{
        padding: "18px 22px",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          color:
            accent === "warn"
              ? "var(--warn)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 4,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
