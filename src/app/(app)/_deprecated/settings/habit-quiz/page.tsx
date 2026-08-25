import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { HabitQuiz } from "./HabitQuiz";

export const dynamic = "force-dynamic";

/**
 * Habit Quiz — 5 questions that map spending to vessels.
 *
 * The result is the baseline for AI Tier 1 insights. Knowing
 * what "normal" looks like for the user is what makes the
 * anomaly detection, the monthly narrative, and the smart
 * categorize fallback work.
 *
 * The quiz is intentionally short — mom-grade. 5 questions,
 * one screen, the result computes in the browser.
 *
 * Component Oracle Terminal treatment: mono caps questions,
 * jupiter accent (growth / self-knowledge), terminal CTA.
 */
export default function HabitQuizPage() {
  return (
    <div>
      <PageHead
        eyebrow="// overview · settings · habit quiz"
        title="Habit Profile"
        em="5 questions, your baseline."
        accent="jupiter"
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
            A short quiz that maps how you actually spend to the seven planetary vessels. The result becomes the baseline for AI insights — what "normal" looks like for you, so anomalies stand out. You can re-take it any time; it lives in your profile, not your transactions.
          </>
        }
      />

      <HabitQuiz />
    </div>
  );
}
