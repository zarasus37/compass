import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { NewEnvelopeForm } from "./NewEnvelopeForm";

export const dynamic = "force-dynamic";

/**
 * /envelopes/new — Cluster 1.10.
 *
 * Add a new vessel. The new envelope starts at $0 — its balance
 * fills in as paychecks land and Plan My Next Check distributes.
 */
export default function NewEnvelopePage() {
  return (
    <div>
      <PageHead
        eyebrow="Money · Envelopes"
        title="New vessel"
        em="a new part of your money's life."
        accent="jupiter"
        actions={
          <Link
            href="/envelopes"
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
            ← All envelopes
          </Link>
        }
        explanation={
          <>
            Add a new vessel to the seven. Pick a planet to give it a color and a role, and set the target — the bar above will fill as paychecks land. The new vessel starts at $0.
          </>
        }
      />

      <NewEnvelopeForm />
    </div>
  );
}
