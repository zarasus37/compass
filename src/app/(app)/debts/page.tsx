import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import {
  liveDebts,
  liveEnvelopesFromDb,
  livePlanFromDb,
  TODAY,
} from "@/lib/mock";
import { requireUser } from "@/server/auth/user";
import { DebtListInteractive } from "@/components/debts/DebtListInteractive";

export const dynamic = "force-dynamic";

/**
 * Debts — articulated deep page (Cluster 7.45: interactive list).
 *
 * Pre-7.45, this page rendered a flat list of debt rows + a single
 * `<DebtPayoffSimulator>` covering all debts. The simulator's
 * per-debt math was buried inside the projection's `.perDebt` array
 * but never surfaced in the UI.
 *
 * Post-7.45, this page renders `<DebtListInteractive>` which gives
 * each debt its own tappable card with a circular progress arc +
 * balance + APR + min payment + progress bar. Clicking a card
 * expands a `<DebtDetailExpand>` panel below it with the full
 * per-debt snowball math: stats grid (Balance / APR / Min Payment /
 * Monthly Interest / Months at min / Interest at min / Original /
 * Paid down), payoff sparkline, "What if?" slider with apply button.
 *
 * The cluster 7.45 design choice: NO top-level snowball/avalanche
 * method toggle. Cross-debt ordering is a separate concern; the
 * per-debt view is about THIS debt's payoff math.
 */
export default async function DebtsPage() {
  const user = await requireUser();
  // Cluster 7.40 + 7.44: defensively read envelopes + plan so the
  // page-level reads don't take the page down on a transient hiccup.
  // The DebtListInteractive itself doesn't need envelopes/plan, but
  // we keep the reads in case a future cluster re-uses them here.
  await liveEnvelopesFromDb(user.id).catch(() => []);
  await livePlanFromDb(user.id).catch(() => null);
  const DEBTS = liveDebts();

  return (
    <div>
      <PageHead
        eyebrow="// money · debts"
        title="Debts"
        em="tap a card to see the math."
        accent="saturn"
        actions={
          <Link
            href="/debts/new"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--terminal-cyan)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
            }}
          >
            + Add debt
          </Link>
        }
        explanation={
          <>
            Every debt you carry, with its balance, interest rate, and the path to zero. Tap a card to see that debt's per-month interest, payoff trajectory at the minimum payment, and what extra payments would save. The vessel for debt payoff is the Saturn envelope — money that lands there goes straight to the highest-priority balance.
          </>
        }
      />

      <DebtListInteractive debts={DEBTS} anchor={TODAY} />
    </div>
  );
}
