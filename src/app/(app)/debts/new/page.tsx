import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { NewDebtForm } from "./NewDebtForm";

export const dynamic = "force-dynamic";

/**
 * /debts/new — Cluster 1.10.
 *
 * Add a new debt to the Saturn vessel. The form is pre-sorted
 * by the planets and the debt shows up in the simulator on the
 * next render. originalBalance is set to the entered balance
 * (no "paid so far" on a brand-new debt).
 */
export default function NewDebtPage() {
  return (
    <div>
      <PageHead
        eyebrow="Money · Debts"
        title="New debt"
        em="add a card or loan to your path to zero."
        accent="saturn"
        actions={
          <Link
            href="/debts"
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
            ← All debts
          </Link>
        }
        explanation={
          <>
            Add a new card or loan. The balance you enter is the starting point — the simulator treats the original balance as the goal, and your "X% paid" stays stable as you pay it down. The debt shows up in the list, the per-debt simulator on this page, and the dashboard's Saturn vessel card.
          </>
        }
      />

      <NewDebtForm />
    </div>
  );
}
