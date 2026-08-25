import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { GlossaryIndex, type GlossaryEntry } from "./GlossaryIndex";

export const dynamic = "force-dynamic";

/**
 * Glossary — the vocabulary of Compass (Cluster 4.1).
 *
 * Twelve terms, grouped by chapter (Overview / Ledger / Aims). Each
 * entry is a one-paragraph definition plus "where it shows up"
 * deep links. The search box (GlossaryIndex client component)
 * filters in the browser; chapter sections stay visible so the
 * vocabulary's structure is preserved while searching.
 *
 * Mom-grade: each paragraph explains the term plainly, with no
 * jargon or occult metaphors. The planet names show up only where
 * they're semantically meaningful (vessel mapping).
 */

const ENTRIES: GlossaryEntry[] = [
  // ── OVERVIEW (4) ─────────────────────────────────────────────────
  {
    id: "period",
    term: "Period",
    chapter: "overview",
    body: (
      <>
        The 14-day pay cycle that Compass centers on. Two weeks is the unit of truth — not a month, not a single transaction. Every screen is a lens on the current <strong>period</strong>; when the period ends, a new one starts and the lens refreshes.
      </>
    ),
    seeAlso: [
      { href: "/period", label: "Current period" },
      { href: "/", label: "Dashboard" },
    ],
  },
  {
    id: "safe-to-spend",
    term: "Safe to spend",
    chapter: "overview",
    body: (
      <>
        The number on the dashboard that answers "how much can I actually spend on discretionary things this period?" Computed from your paycheck minus the bills, debt, and savings the allocation plan routes. Not the cash in your checking account — the money that's truly free.
      </>
    ),
    seeAlso: [
      { href: "/", label: "Dashboard hero" },
      { href: "/learn/your-numbers", label: "Your numbers" },
    ],
  },
  {
    id: "paycheck-simulator",
    term: "Paycheck simulator",
    chapter: "overview",
    body: (
      <>
        The form on the dashboard that previews what happens when the next paycheck arrives. Run it and the engine distributes the dollars per the active plan; the celebration banner shows each transfer. "What would this check do?" — answered in 2 seconds, no commitment.
      </>
    ),
    seeAlso: [{ href: "/", label: "On the dashboard" }],
  },
  {
    id: "trajectory",
    term: "Trajectory",
    chapter: "overview",
    body: (
      <>
        The projected path of a number over time, drawn as a line on a chart. The <strong>goal trajectory</strong> shows where each goal will be at the current per-paycheck pace — flat lines mean the plan isn't moving it. The <strong>net trajectory</strong> projects your net worth over 12 months.
      </>
    ),
    seeAlso: [
      { href: "/goals", label: "Goals page" },
      { href: "/insights", label: "Insights" },
    ],
  },

  // ── LEDGER (7) ──────────────────────────────────────────────────
  {
    id: "envelope",
    term: "Envelope",
    chapter: "ledger",
    body: (
      <>
        A bucket of money with a job. You fund it, you spend from it, and it warns you when you go over. The seven canonical envelopes are: Rent, Groceries, Utilities, Buffer, Joy, Growth, Debt. "Envelope" is the mechanic; "vessel" is the visual mapping.
      </>
    ),
    seeAlso: [
      { href: "/envelopes", label: "Envelopes" },
      { href: "/allocation", label: "Allocation plan" },
    ],
    related: ["vessel"],
  },
  {
    id: "vessel",
    term: "Vessel",
    chapter: "ledger",
    body: (
      <>
        The alchemical / celestial mapping for an envelope. Each of the seven envelopes is a planetary vessel: Sol (Rent), Luna (Groceries), Mars (Buffer), Mercury (Utilities), Jupiter (Growth), Venus (Joy), Saturn (Debt). The planet color is the identifier; the envelope is the underlying bucket.
      </>
    ),
    seeAlso: [{ href: "/envelopes", label: "Envelopes" }],
    related: ["envelope"],
  },
  {
    id: "allocation",
    term: "Allocation",
    chapter: "ledger",
    body: (
      <>
        The split of a paycheck into the seven envelopes. When the paycheck arrives, the <strong>allocation plan</strong> runs and sends each dollar to its vessel. The total allocation equals the paycheck; no dollars are lost in the math.
      </>
    ),
    seeAlso: [
      { href: "/allocation", label: "Allocation plan" },
      { href: "/", label: "Dashboard simulator" },
    ],
    related: ["allocation-plan", "auto-allocate"],
  },
  {
    id: "allocation-plan",
    term: "Allocation plan",
    chapter: "ledger",
    body: (
      <>
        The rules that govern the split. Four strategies ship today: <em>Envelope</em> (fixed per vessel), <em>Zero-based</em> (every dollar a job), <em>50-30-20</em> (needs / wants / savings), and <em>Pay-yourself-first</em> (savings first). The plan is policy, not suggestion — it runs on every paycheck.
      </>
    ),
    seeAlso: [{ href: "/allocation", label: "Allocation" }],
    related: ["allocation", "auto-allocate"],
  },
  {
    id: "auto-allocate",
    term: "Auto-allocate",
    chapter: "ledger",
    body: (
      <>
        The contract: the plan runs the moment a paycheck hits, no confirm modal, no opt-in. The plan is <em>armed</em>. The alternative is "review each paycheck" — Compass doesn't do that. Auto-allocate is the default and the only mode the system supports.
      </>
    ),
    seeAlso: [{ href: "/allocation", label: "Allocation" }],
    related: ["allocation-plan"],
  },
  {
    id: "overflow",
    term: "Overflow",
    chapter: "ledger",
    body: (
      <>
        When an envelope crosses 100% of its target. The vessel goes hard-warn. Compass offers to rebalance — pull from <em>Mars · Buffer</em> if there's surplus, or move money from a vessel that has room. The fix is one click away on the envelope's page or the dashboard's "Next Step" rail.
      </>
    ),
    seeAlso: [
      { href: "/envelopes", label: "Envelopes" },
      { href: "/learn/field-guide#overflow", label: "Field guide" },
    ],
    related: ["envelope"],
  },
  {
    id: "age-of-money",
    term: "Age of money",
    chapter: "ledger",
    body: (
      <>
        How long a dollar sits in your accounts before it leaves. A higher age means your money has been around a while — a sign of stability. A low age means you're living paycheck-to-paycheck. Compass tracks this implicitly through the pace line; the explicit metric is on the roadmap.
      </>
    ),
    seeAlso: [
      { href: "/", label: "Pace line" },
      { href: "/learn/field-guide#pace", label: "Field guide · pace" },
    ],
  },

  // ── AIMS (1) ────────────────────────────────────────────────────
  {
    id: "goal",
    term: "Goal",
    chapter: "aims",
    body: (
      <>
        A target with a date and a per-paycheck contribution. Emergency Fund and Invest are <strong>goal types</strong> on <code>/goals</code> (you can add custom ones — a trip, a purchase, anything with a number on it). Goals live in the Aims chapter; envelopes live in Ledger. The distinction matters: envelopes are about spending, goals are about arriving.
      </>
    ),
    seeAlso: [{ href: "/goals", label: "Goals" }],
  },
];

export default function GlossaryPage() {
  return (
    <div>
      <PageHead
        eyebrow="// learn · glossary"
        title="Glossary"
        em="the vocabulary of Compass."
        accent="cyan"
        explanation={
          <>
            The terms Compass uses, defined plainly. Envelope, vessel, allocation, age of money, overflow, period — what they mean and how they show up in the rest of the app. Type to filter; chapters stay visible so the structure of the vocabulary is preserved.
          </>
        }
      />

      {/* Headline strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 28,
        }}
      >
        <StatCell label="terms" value={ENTRIES.length.toString()} sub="across 3 chapters" />
        <StatCell label="overview" value="4" sub="current-state terms" />
        <StatCell label="ledger" value="7" sub="mechanic + plan terms" />
        <StatCell label="aims" value="1" sub="target terms" />
      </div>

      <GlossaryIndex entries={ENTRIES} />

      {/* Colophon */}
      <div
        style={{
          marginTop: 8,
          padding: "20px 24px",
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--gold)",
          borderRadius: 4,
          maxWidth: 720,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          // glossary · colophon
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
          For the model behind the vocabulary, see the <a href="/learn/field-guide" style={{ color: "var(--terminal-cyan)" }}>Field Guide</a>. For the live read of where you actually are, see <a href="/learn/your-numbers" style={{ color: "var(--terminal-cyan)" }}>Your Numbers</a>. The glossary is the words; the field guide is the model; your numbers is the practice.
        </p>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
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
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 24,
          fontWeight: 600,
          color: "var(--ink)",
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
