import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";

export const dynamic = "force-dynamic";

/**
 * Field Guide — how Compass works.
 *
 * Part of the new `// Learn` chapter (Cluster 4.0). The page is
 * prose, not data — it explains the conceptual model behind the
 * app: periods, vessels, allocation, overflow, age of money.
 *
 * Each section is a "card" with a terminal-eyebrow + a short
 * explanation. The text is mom-grade; no jargon, no occult
 * metaphors. The visual treatment is the standard Component
 * Oracle Terminal chrome (mono caps, Sora body, vessel surface).
 *
 * Future sections (per the v4 spec) will fold in:
 *   - How rules engine routes transactions (L1)
 *   - How the Auto-Allocate engine runs the plan on every paycheck
 *   - The 7 planetary vessels and what they represent
 *   - Period math: biweekly, the canonical cadence
 *   - Overflow: when an envelope goes over, what happens
 *   - Age of money: how long each dollar sits before leaving
 */

interface GuideSection {
  id: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  pullQuote?: string;
  links?: { href: string; label: string }[];
}

const SECTIONS: GuideSection[] = [
  {
    id: "period",
    eyebrow: "// 01 · the period",
    title: "Two weeks is the unit of truth.",
    body: (
      <>
        <p>
          Most budgeting apps think in months. Months are too long — three paychecks in some, two in others, and the math gets sloppy. Compass thinks in <em>pay periods</em>: 14 days, anchored to your next check.
        </p>
        <p>
          Every screen — the dashboard, the allocation, the safe-to-spend number — is a lens on the current period. When the period ends, a new one starts and the lens refreshes. The Pay Period is the heartbeat of the app.
        </p>
      </>
    ),
    pullQuote: "If you can't see the next 14 days, you can't see the next decision.",
    links: [{ href: "/period", label: "Open the current period →" }],
  },
  {
    id: "vessels",
    eyebrow: "// 02 · the vessels",
    title: "Seven envelopes, one per purpose.",
    body: (
      <>
        <p>
          An <em>envelope</em> in Compass is a bucket of money with a job. You fund it, you spend from it, and it warns you when you go over. The seven canonical vessels each hold a different purpose:
        </p>
        <ul>
          <li><strong>Sol · Rent</strong> — housing, the largest fixed bill</li>
          <li><strong>Luna · Groceries</strong> — the variable one; where most overspend happens</li>
          <li><strong>Mercury · Utilities</strong> — internet, phone, power, water</li>
          <li><strong>Mars · Buffer</strong> — the safety net, only touched in emergencies</li>
          <li><strong>Venus · Joy</strong> — dining out, hobbies, the things that make life good</li>
          <li><strong>Jupiter · Growth</strong> — long-view money: savings, investments, holdings</li>
          <li><strong>Saturn · Debt</strong> — payments against what you owe</li>
        </ul>
        <p>
          When an envelope hits 100% of its target, it goes hard-warn. Cross 100% and the number turns iron-red — the system is telling you to slow down or rebalance.
        </p>
      </>
    ),
    pullQuote: "An envelope at 100% isn't a budget — it's a wall.",
    links: [{ href: "/envelopes", label: "Open the vessels →" }],
  },
  {
    id: "allocation",
    eyebrow: "// 03 · allocation",
    title: "Every paycheck fans out into the vessels.",
    body: (
      <>
        <p>
          The paycheck doesn't sit in Checking. The moment it lands, the allocation plan runs: a fixed split that sends each dollar to its vessel. Rent first, Groceries next, then down the line.
        </p>
        <p>
          You pick the plan — Envelope, Zero-based, 50-30-20, or Pay-yourself-first. The plan is <em>policy</em>, not a suggestion. There's no "confirm" modal. The plan runs the moment a paycheck hits, every time.
        </p>
      </>
    ),
    pullQuote: "A plan that's not armed is a plan that's not a plan.",
    links: [{ href: "/allocation", label: "Open the plan →" }],
  },
  {
    id: "overflow",
    eyebrow: "// 04 · overflow",
    title: "Over-limit envelopes pull from Buffer.",
    body: (
      <>
        <p>
          When an envelope crosses 100%, Compass doesn't just warn — it offers to rebalance. The overage can be pulled from <em>Mars · Buffer</em> if there's surplus, or you can move money from a vessel that has room.
        </p>
        <p>
          This is the difference between a budget that fails silently and one that talks to you. The fix is always one click away on the envelope's page, in the drawer, or in the dashboard's "Next Step" rail.
        </p>
      </>
    ),
    pullQuote: "An over-limit envelope isn't a mistake — it's a signal.",
    links: [{ href: "/envelopes", label: "See your envelopes →" }],
  },
  {
    id: "goals",
    eyebrow: "// 05 · goals",
    title: "Targets, not transactions.",
    body: (
      <>
        <p>
          A goal is a target with a date and a per-paycheck contribution. Emergency Fund and Invest are goals (you can add custom ones — a trip, a purchase, anything with a number on it). Goals live in the Aims chapter; envelopes live in Ledger. The distinction matters: envelopes are about spending, goals are about arriving.
        </p>
        <p>
          Each goal has a trajectory line that shows where you'll be at current pace. Flat lines mean the plan isn't moving it — that's a signal to bump the per-paycheck allocation or pick a closer target date.
        </p>
      </>
    ),
    pullQuote: "A goal without a per-paycheck number is a wish.",
    links: [{ href: "/goals", label: "Open your goals →" }],
  },
  {
    id: "pace",
    eyebrow: "// 06 · pace",
    title: "Actual vs ideal, drawn in a line.",
    body: (
      <>
        <p>
          The pace line plots your actual cumulative spend against the ideal trajectory for the period. If the actual line is below the ideal, you're under pace — the vessels are healthy. If it's above, you're on track to overshoot.
        </p>
        <p>
          The line answers one question: <em>are you on track, or not?</em> Most budgeting apps answer it with a number; we answer it with a shape.
        </p>
      </>
    ),
    pullQuote: "A line is a story. A number is a label.",
    links: [{ href: "/", label: "See your dashboard →" }],
  },
];

export default function FieldGuidePage() {
  return (
    <div>
      <PageHead
        eyebrow="// learn · field guide"
        title="Field Guide"
        em="how Compass works."
        accent="cyan"
        explanation={
          <>
            The model behind the screens. Read this once and the rest of the app will make more sense — every chart, every warning, every "Next Step" recommendation is grounded in the same handful of ideas: periods, vessels, allocation, overflow, goals, and pace.
          </>
        }
      />

      <nav
        aria-label="Field guide sections"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          borderRadius: 4,
          marginBottom: 40,
          overflow: "hidden",
        }}
      >
        {SECTIONS.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              padding: "16px 18px",
              borderRight: i % 3 === 2 ? "none" : "1px solid var(--line-soft)",
              borderBottom: i < 3 ? "1px solid var(--line-soft)" : "none",
              textDecoration: "none",
              display: "block",
              transition: "background 120ms",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9,
                fontWeight: 600,
                color: "var(--terminal-cyan)",
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {s.eyebrow}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink)",
                lineHeight: 1.3,
              }}
            >
              {s.title}
            </div>
          </a>
        ))}
      </nav>

      {SECTIONS.map((s, idx) => (
        <section
          key={s.id}
          id={s.id}
          style={{
            marginBottom: 56,
            paddingBottom: 32,
            borderBottom: idx < SECTIONS.length - 1 ? "1px solid var(--line-soft)" : "none",
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
            {s.eyebrow}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 28,
              fontWeight: 600,
              color: "var(--ink)",
              margin: "0 0 18px",
              letterSpacing: "-0.01em",
            }}
          >
            {s.title}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ink-2)",
              maxWidth: 720,
            }}
          >
            {s.body}
            <style>{`
              section p, section ul { margin: 0 0 14px; }
              section ul { padding-left: 22px; }
              section li { margin-bottom: 6px; }
              section strong { color: var(--ink); font-weight: 600; }
              section em { color: var(--ink); font-style: normal; border-bottom: 1px dashed var(--line); padding-bottom: 1px; }
            `}</style>
          </div>

          {s.pullQuote && (
            <blockquote
              style={{
                margin: "20px 0 16px",
                padding: "12px 18px",
                borderLeft: "2px solid var(--terminal-cyan)",
                background: "var(--cosmos-2)",
                fontFamily: "var(--font-sora)",
                fontSize: 16,
                fontWeight: 500,
                fontStyle: "italic",
                color: "var(--ink)",
                maxWidth: 720,
              }}
            >
              {s.pullQuote}
            </blockquote>
          )}

          {s.links && (
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 12,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              {s.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    color: "var(--terminal-cyan)",
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}

      <div
        style={{
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
          // field guide · colophon
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
          For term definitions (envelope, vessel, allocation, age of money, overflow), see the Glossary. For coaching pulled from your live data, see Your Numbers. The guide is the model; the glossary is the vocabulary; your numbers is the practice.
        </p>
      </div>
    </div>
  );
}
