import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { NewTransactionForm, type EnvelopeOption } from "./NewTransactionForm";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * /transactions/new — Cluster 1.10.
 *
 * The server-component wrapper. Reads the envelope list at request
 * time so the form's vessel picker always reflects the live set.
 * The form itself is the client component.
 *
 * Optional ?envelope=<id> query param pre-selects the vessel, so
 * the form can be deep-linked from the envelope detail page.
 */
export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ envelope?: string }>;
}) {
  const sp = await searchParams;
  const ENVELOPES = liveEnvelopes();
  const options: EnvelopeOption[] = ENVELOPES.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    currentCents: e.current,
  }));
  const defaultEnvelopeId = sp.envelope;

  return (
    <div>
      <PageHead
        eyebrow="Money · Transactions"
        title="Log a transaction"
        em="what just happened to your money."
        accent="mercury"
        actions={
          <Link
            href="/transactions"
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
            ← All transactions
          </Link>
        }
        explanation={
          <>
            Every time money moves — you spend, a refund lands, a paycheck arrives — log it here. The form sends dollars and the engine works in cents; the vessel you pick gets its bar updated the moment you submit. Use the "income" toggle for money coming in, leave it off for money going out.
          </>
        }
      />

      <NewTransactionForm
        envelopes={options}
        defaultEnvelopeId={defaultEnvelopeId}
      />
    </div>
  );
}
