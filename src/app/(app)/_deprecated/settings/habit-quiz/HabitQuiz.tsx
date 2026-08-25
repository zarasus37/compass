"use client";

/**
 * HabitQuiz — 5 questions, jupiter-accent, mom-grade.
 *
 * Each question has 3-4 options. The result maps to a "spender
 * profile" (Saver / Steady / Builder / Dreamer) that the AI
 * tier 1 engine reads to set its anomaly thresholds. Stored in
 * localStorage; re-takeable; never sent anywhere without consent.
 *
 * Component Oracle Terminal treatment: jupiter accent, mono
 * caps question, mono big-letter option keys (A / B / C / D),
 * terminal `›` chevron on selected.
 */

import * as React from "react";

interface Option {
  key: string;
  label: string;
  weight: Partial<Record<Profile, number>>;
}

type Profile = "saver" | "steady" | "builder" | "dreamer";

const QUESTIONS: { q: string; help?: string; options: Option[] }[] = [
  {
    q: "When you get a paycheck, what's the first thing you do?",
    options: [
      { key: "A", label: "Move money into envelopes right away", weight: { saver: 3, steady: 1 } },
      { key: "B", label: "Pay the bills that are due", weight: { steady: 3, saver: 1 } },
      { key: "C", label: "Top up the savings / goal", weight: { builder: 3, saver: 1 } },
      { key: "D", label: "Treat myself to something small", weight: { dreamer: 2, steady: 1 } },
    ],
  },
  {
    q: "An unexpected $500 shows up. You…",
    options: [
      { key: "A", label: "Park it in the emergency fund", weight: { saver: 3, builder: 1 } },
      { key: "B", label: "Use it to knock down a debt", weight: { builder: 2, saver: 1 } },
      { key: "C", label: "Save half, spend half", weight: { steady: 3, dreamer: 1 } },
      { key: "D", label: "Spend it on something I've been wanting", weight: { dreamer: 3 } },
    ],
  },
  {
    q: "How often do you check your bank balance?",
    options: [
      { key: "A", label: "Multiple times a day", weight: { steady: 2, saver: 1 } },
      { key: "B", label: "Once a day", weight: { steady: 3 } },
      { key: "C", label: "A few times a week", weight: { builder: 2, dreamer: 1 } },
      { key: "D", label: "Once a month or less", weight: { dreamer: 2 } },
    ],
  },
  {
    q: "The annual goal that matters most to you is…",
    options: [
      { key: "A", label: "A bigger safety net", weight: { saver: 3, builder: 1 } },
      { key: "B", label: "Paying off a debt fully", weight: { builder: 3, saver: 1 } },
      { key: "C", label: "Saving for a specific thing", weight: { builder: 2, dreamer: 1 } },
      { key: "D", label: "Living more in the moment", weight: { dreamer: 3 } },
    ],
  },
  {
    q: "When a friend suggests an expensive outing, you…",
    options: [
      { key: "A", label: "Politely pass — I'd rather save", weight: { saver: 2, steady: 1 } },
      { key: "B", label: "Go if I have room in the Joy vessel", weight: { steady: 3 } },
      { key: "C", label: "Go — life is short", weight: { dreamer: 3 } },
      { key: "D", label: "Suggest a cheaper alternative", weight: { builder: 1, steady: 1 } },
    ],
  },
];

const PROFILE_META: Record<Profile, { name: string; tagline: string; emoji: string; color: string }> = {
  saver:   { name: "The Saver",   tagline: "Every dollar gets a job.", emoji: "☉", color: "var(--gold)" },
  steady:  { name: "The Steady",  tagline: "Steady wins the race.",   emoji: "☽", color: "var(--luna)" },
  builder: { name: "The Builder", tagline: "Investing in tomorrow.",  emoji: "♃", color: "var(--jupiter)" },
  dreamer: { name: "The Dreamer", tagline: "Living in the now.",      emoji: "♀", color: "var(--venus)" },
};

const STORAGE_KEY = "compass-habit-profile-v1";

export function HabitQuiz() {
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [result, setResult] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { profile: Profile };
        if (parsed.profile) setResult(parsed.profile);
      }
    } catch {
      // ignore
    }
  }, []);

  const pick = (qi: number, key: string) => {
    setAnswers((a) => ({ ...a, [qi]: key }));
  };

  const allAnswered = QUESTIONS.every((_, i) => Boolean(answers[i]));

  const compute = () => {
    const totals: Record<Profile, number> = { saver: 0, steady: 0, builder: 0, dreamer: 0 };
    QUESTIONS.forEach((q, i) => {
      const opt = q.options.find((o) => o.key === answers[i]);
      if (!opt) return;
      (Object.keys(opt.weight) as Profile[]).forEach((p) => {
        totals[p] += opt.weight[p] ?? 0;
      });
    });
    const winner = (Object.keys(totals) as Profile[]).reduce((a, b) =>
      totals[a] >= totals[b] ? a : b,
    );
    setResult(winner);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: winner, ranAt: new Date().toISOString() }));
    } catch {
      // ignore
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (result) {
    const meta = PROFILE_META[result];
    return (
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${meta.color}`,
          borderLeft: `2px solid ${meta.color}`,
          borderRadius: 4,
          padding: 32,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: meta.color,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> result
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              background: "var(--cosmos)",
              border: `1px solid ${meta.color}`,
              color: meta.color,
              fontSize: 28,
            }}
          >
            {meta.emoji}
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {meta.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 15,
                color: "var(--ink-2)",
              }}
            >
              {meta.tagline}
            </div>
          </div>
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-3)",
            margin: "0 0 22px",
            lineHeight: 1.55,
          }}
        >
          This profile is the baseline for AI insights. When something looks unusual for someone with your shape — a spike, a missed allocation, a slow-burn trend — Compass will surface it. The profile is yours; retake any time.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            background: "transparent",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "10px 18px",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Re-take quiz
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {QUESTIONS.map((q, qi) => (
        <div
          key={qi}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--jupiter)",
            borderRadius: 4,
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--jupiter)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> question {qi + 1} of {QUESTIONS.length}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 16,
              lineHeight: 1.35,
            }}
          >
            {q.q}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {q.options.map((opt) => {
              const selected = answers[qi] === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => pick(qi, opt.key)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    background: selected ? "var(--cosmos-2)" : "var(--cosmos)",
                    border: `1px solid ${selected ? "var(--jupiter)" : "var(--line)"}`,
                    borderRadius: 2,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "inherit",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 13,
                      color: selected ? "var(--jupiter)" : "var(--ink-3)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {opt.key}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 14,
                      color: selected ? "var(--jupiter)" : "var(--ink-5)",
                    }}
                  >
                    {selected ? "✓" : "›"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={compute}
          disabled={!allAnswered}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            background: allAnswered ? "var(--jupiter)" : "var(--ink-3)",
            color: "var(--void)",
            border: 0,
            borderRadius: 2,
            padding: "14px 28px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: allAnswered ? "pointer" : "not-allowed",
            boxShadow: allAnswered ? "0 0 16px rgba(196, 181, 253, 0.3)" : "none",
          }}
        >
          See my profile →
        </button>
      </div>
    </div>
  );
}
