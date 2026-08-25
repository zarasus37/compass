import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { NewBillForm, type EnvelopeOption } from "./NewBillForm";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * /recurring/new — Cluster 1.10.
 *
 * Add a new recurring bill. The bill will appear in the next
 * period's bill list and on the Plan My Next Check card.
 */
export default function NewBillPage() {
  const ENVELOPES = liveEnvelopes();
  const options: EnvelopeOption[] = ENVELOPES.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
  }));

  return (
    <div>
      <PageHead
        eyebrow="Plan · Recurring bills"
        title="New bill"
        em="add to the predictable part of your money."
        accent="mercury"
        actions={
          <Link
            href="/obligations?tab=bills"
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
            ← All bills
          </Link>
        }
        explanation={
          <>
            Add a new recurring bill — the charges that show up on a schedule. Pick a day of the month, mark it autopay if your bank drafts it, and link it to a vessel so the bar reflects the upcoming charge.
          </>
        }
      />

      <NewBillForm envelopes={options} />
    </div>
  );
}
