import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { liveEnvelopes, TODAY, PERIOD_START, PERIOD_END } from "@/lib/mock";
import { topOpportunities } from "@/lib/opportunities";

export const dynamic = "force-dynamic";

/**
 * Your Numbers — coaching pulled from live data.
 *
 * The Field Guide is the model; the Glossary is the vocabulary;
 * Your Numbers is the practice. This page reads the same live
 * store as the dashboard and produces a coaching readout:
 *   1. Headline ratios (spend share, savings rate, etc.)
 *   2. Per-envelope attention list (over-limit / near-limit /
 *      well-funded), each with a one-line coach note
 *   3. Top opportunities (the same engine that powers the
 *      SafeToSpendHero card, surfaced here as a coaching list)
 *   4. The pace line — actual vs ideal cumulative spend
 *
 * Mom-grade: each row is a one-line observation, not a thesis.
 * The page adapts to the data — calm when everything's tight,
 * more rows when there's something to act on.
 */

export default function YourNumbersPage() {
  const envelopes = liveEnvelopes();
  const opportunities = topOpportunities({ limit: 5 });

  // ── Headline ratios ─────────────────────────────────────────────
  const totalCurrent = envelopes.reduce((s, e) => s + e.current, 0);
  const totalTarget = envelopes.reduce((s, e) => s + e.target, 0);
  const totalOver = envelopes.filter((e) => e.current > e.target);
  const overageCents = totalOver.reduce(
    (s, e) => s + (e.current - e.target),
    0,
  );
  const utilization = totalTarget > 0 ? totalCurrent / totalTarget : 0;
  const safeUtil = Math.min(1, utilization);

  // ── Per-envelope rows ───────────────────────────────────────────
  type Row = {
    envelope: typeof envelopes[number];
    status: "over" | "watch" | "ok" | "calm";
    note: string;
  };
  const rows: Row[] = [...envelopes]
    .map((e): Row => {
      if (e.target <= 0) {
        return {
          envelope: e,
          status: "calm",
          note: "no target set",
        };
      }
      const ratio = e.current / e.target;
      if (e.current > e.target) {
        const over = e.current - e.target;
        return {
          envelope: e,
          status: "over",
          note: `over by ${formatMoney(over)} — pull from another vessel or raise the target`,
        };
      }
      if (ratio > 0.85) {
        return {
          envelope: e,
          status: "watch",
          note: `${Math.round(ratio * 100)}% of target — pace slow for the rest of the period`,
        };
      }
      if (ratio < 0.4) {
        return {
          envelope: e,
          status: "ok",
          note: `${Math.round(ratio * 100)}% of target — well under, room to redirect`,
        };
      }
      return {
        envelope: e,
        status: "calm",
        note: `${Math.round(ratio * 100)}% of target — on track`,
      };
    })
    // Over first, then watch, then ok, then calm; alpha within.
    .sort((a, b) => {
      const order = { over: 0, watch: 1, ok: 2, calm: 3 } as const;
      return order[a.status] - order[b.status] || a.envelope.name.localeCompare(b.envelope.name);
    });

  // ── Period pacing ───────────────────────────────────────────────
  // For a coaching readout, we use the period progress as a single
  // "where you should be" anchor. The day-of-period is computed
  // from the seeded period bounds.
  const periodMs = PERIOD_END.getTime() - PERIOD_START.getTime();
  const elapsedMs = Math.max(0, Math.min(periodMs, TODAY.getTime() - PERIOD_START.getTime()));
  const periodProgress = periodMs > 0 ? elapsedMs / periodMs : 0;

  return (
    <div>
      <PageHead
        eyebrow="// learn · your numbers"
        title="Your Numbers"
        em="coaching pulled from your live data."
        accent="cyan"
        explanation={
          <>
            A read of where you actually are, computed from the same live store the dashboard reads. Each row is a one-line observation — what's over, what's tight, where the headroom is, and the top ways to grow your safe-to-spend number.
          </>
        }
      />

      {/* HEADLINE RATIOS */}
      <section style={{ marginBottom: 40 }}>
        <SectionEyebrow label="// 01 · the headline" />
        <h2 style={sectionTitleStyle}>Where the money is, in three numbers.</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            marginTop: 18,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <HeadlineCell
            label="envelopes used"
            value={`${Math.round(safeUtil * 100)}%`}
            sub={`${formatMoney(totalCurrent)} of ${formatMoney(totalTarget)} target`}
            accent={utilization > 1 ? "warn" : utilization > 0.85 ? "watch" : "ok"}
          />
          <HeadlineCell
            label="envelopes over"
            value={totalOver.length.toString()}
            sub={
              totalOver.length === 0
                ? "nothing over target"
                : `${formatMoney(overageCents)} over total`
            }
            accent={totalOver.length === 0 ? "ok" : "warn"}
          />
          <HeadlineCell
            label="period progress"
            value={`${Math.round(periodProgress * 100)}%`}
            sub={`day ${Math.max(1, Math.round(periodProgress * 14))} of 14`}
            accent="ink"
          />
        </div>
      </section>

      {/* PER-ENVELOPE COACHING */}
      <section style={{ marginBottom: 40 }}>
        <SectionEyebrow label="// 02 · per-vessel" />
        <h2 style={sectionTitleStyle}>What each vessel is doing.</h2>
        <p style={sectionSubStyle}>
          One line per vessel, ranked by attention needed. Over first, then tight, then on track, then under-utilized.
        </p>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            marginTop: 18,
            overflow: "hidden",
          }}
        >
          {rows.map((r, i) => (
            <div
              key={r.envelope.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 2fr 90px",
                alignItems: "center",
                gap: 18,
                padding: "14px 22px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line-soft)" : "none",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-sora)", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
                  {r.envelope.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-3)",
                    marginTop: 2,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}
                >
                  // {r.envelope.planet}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 16,
                  color:
                    r.status === "over"
                      ? "var(--neg)"
                      : r.status === "watch"
                      ? "var(--warn)"
                      : "var(--ink)",
                  textAlign: "right",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                  fontWeight: 600,
                }}
              >
                {formatMoney(r.envelope.current)}
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9.5,
                    color: "var(--ink-3)",
                    marginTop: 2,
                    letterSpacing: "0.04em",
                  }}
                >
                  of {formatMoney(r.envelope.target)}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 14,
                  color: "var(--ink-2)",
                  lineHeight: 1.4,
                }}
              >
                {r.note}
              </div>
              <div style={{ textAlign: "right" }}>
                <Link
                  href={`/envelopes/${r.envelope.id}`}
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--terminal-cyan)",
                    textDecoration: "none",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  OPEN ›
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OPPORTUNITIES */}
      <section style={{ marginBottom: 40 }}>
        <SectionEyebrow label="// 03 · the moves" />
        <h2 style={sectionTitleStyle}>Top ways to grow your safe-to-spend.</h2>
        <p style={sectionSubStyle}>
          Ranked by impact. Each one is a click-through to the right page; nothing applies automatically.
        </p>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            marginTop: 18,
            overflow: "hidden",
          }}
        >
          {opportunities.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                color: "var(--ink-3)",
                letterSpacing: "0.04em",
              }}
            >
              [OK] Your plan is tight. Nothing to redirect right now.
            </div>
          ) : (
            opportunities.map((o, i) => (
              <Link
                key={o.id}
                href={o.href}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 130px 100px",
                  alignItems: "center",
                  gap: 18,
                  padding: "16px 22px",
                  borderBottom: i < opportunities.length - 1 ? "1px solid var(--line-soft)" : "none",
                  textDecoration: "none",
                  background: "transparent",
                  transition: "background 120ms",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--terminal-cyan)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {o.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-sora)", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
                    {o.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {o.detail}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 16,
                    color: "var(--ok)",
                    textAlign: "right",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                    fontWeight: 600,
                  }}
                >
                  +{formatMoney(o.deltaCents)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--terminal-cyan)",
                    textAlign: "right",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  GO ›
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* PERIODIC NOTE */}
      <div
        style={{
          padding: "20px 24px",
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--terminal-cyan)",
          borderRadius: 4,
          maxWidth: 720,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          // your numbers · colophon
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            margin: 0,
          }}
        >
          This page reads the same live store as the dashboard. The headline ratios, the per-vessel notes, and the opportunity list are all computed from your current balances and transactions. As you spend, save, or run the paycheck simulator, the numbers here update with the rest of the app.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────

function SectionEyebrow({ label }: { label: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--terminal-cyan)",
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sora)",
  fontSize: 26,
  fontWeight: 600,
  color: "var(--ink)",
  margin: 0,
  letterSpacing: "-0.01em",
};

const sectionSubStyle: React.CSSProperties = {
  fontFamily: "var(--font-sora)",
  fontSize: 15,
  color: "var(--ink-3)",
  lineHeight: 1.5,
  maxWidth: 640,
  margin: "8px 0 0",
};

function HeadlineCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "ok" | "watch" | "warn" | "ink";
}) {
  const color =
    accent === "warn"
      ? "var(--warn)"
      : accent === "watch"
      ? "var(--warn)"
      : accent === "ok"
      ? "var(--ok)"
      : "var(--ink)";
  return (
    <div style={{ padding: "22px 24px", borderRight: "1px solid var(--line-soft)" }}>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        // {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 32,
          lineHeight: 1,
          color,
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
