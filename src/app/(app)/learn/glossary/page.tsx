import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";

export const dynamic = "force-dynamic";

/**
 * Glossary — the vocabulary of Compass.
 *
 * Stub per Cluster 4.0 (xKryptic 2026-08-25). The page lands in
 * the // Learn chapter as a sister to Field Guide and Your
 * Numbers. Term definitions will fill in over the next pass —
 * envelope, vessel, allocation, age of money, overflow, period,
 * and the seven planetary vessels.
 *
 * The "coming soon" calm state is intentional: it makes the new
 * structure visible (sidebar link works, route resolves) without
 * faking content that doesn't exist yet.
 */
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
            The terms Compass uses, defined plainly. Envelope, vessel, allocation, age of money, overflow, period — what they mean and how they show up in the rest of the app.
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 32,
        }}
      >
        <StatCell label="terms" value="0" sub="so far" />
        <StatCell label="sections" value="0" sub="planned" />
        <StatCell label="status" value="SOON" sub="fill in next pass" accent="watch" />
      </div>

      <div
        style={{
          padding: "48px 32px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--terminal-cyan)",
          borderRadius: 4,
          textAlign: "center",
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
            marginBottom: 14,
          }}
        >
          // GLOSSARY · COMING SOON
        </div>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--ink)",
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          The vocabulary will land here.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            color: "var(--ink-3)",
            lineHeight: 1.55,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          Each term will get a one-paragraph definition with a pointer to where it shows up in the rest of the app. For now, the model is in the <a href="/learn/field-guide" style={{ color: "var(--terminal-cyan)" }}>Field Guide</a> and the live read is in <a href="/learn/your-numbers" style={{ color: "var(--terminal-cyan)" }}>Your Numbers</a>.
        </p>
      </div>

      <div
        style={{
          marginTop: 32,
          padding: "16px 22px",
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
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
          // planned terms (12)
        </div>
        <p
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            letterSpacing: "0.04em",
            margin: 0,
          }}
        >
          period · envelope · vessel · allocation · overflow · age of money ·
          allocation plan · auto-allocate · goal · safe to spend · paycheck
          simulator · trajectory
        </p>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "watch";
}) {
  const color = accent === "watch" ? "var(--warn)" : "var(--ink)";
  return (
    <div style={{ padding: "20px 24px", borderRight: "1px solid var(--line-soft)" }}>
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
        // {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 24,
          fontWeight: 600,
          color,
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
