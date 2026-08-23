import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { NewGoalForm, type EnvelopeOption } from "./NewGoalForm";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * /goals/new — Cluster 1.10.
 *
 * Server-component wrapper for the new goal form. Reads the
 * envelope list so the vessel picker is always current. The form
 * itself is the client component.
 */
export default function NewGoalPage() {
  const ENVELOPES = liveEnvelopes();
  const options: EnvelopeOption[] = ENVELOPES.map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <div>
      <PageHead
        eyebrow="Plan · Goals"
        title="New goal"
        em="where you're heading next."
        accent="jupiter"
        actions={
          <Link
            href="/goals"
            style={{
              fontFamily: "var(--font-cinzel), serif",
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
            ← All goals
          </Link>
        }
        explanation={
          <>
            Add a new destination. The next paycheck will start funding it if you arm a plan that includes it. The "per paycheck" amount is how much of every payday gets set aside for this goal — change it any time. Mark as top priority to make it the hero on your dashboard.
          </>
        }
      />

      <NewGoalForm envelopes={options} />
    </div>
  );
}
