import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import {
  liveDebts,
  liveAccountsFromDb,
  TODAY,
} from "@/lib/mock";
import { requireUser } from "@/server/auth/user";
import { DebtListInteractive } from "@/components/debts/DebtListInteractive";

export const dynamic = "force-dynamic";

/**
 * Debts — articulated deep page (Cluster 7.45: interactive list;
 * Cluster 7.46: tier coloring + linked-account info).
 *
 * Pre-7.45, this page rendered a flat list of debt rows + a single
 * `<DebtPayoffSimulator>` covering all debts.
 *
 * Post-7.45, this page renders `<DebtListInteractive>` which gives
 * each debt its own tappable card with a circular progress arc +
 * balance + APR + min payment + progress bar. Clicking a card
 * expands a `<DebtDetailExpand>` panel below it with the full
 * per-debt snowball math.
 *
 * Cluster 7.46: each card carries APR-tier-colored accents (red /
 * amber / green) so high-APR debts stand apart at a glance; the
 * expanded panel adds 4 new cells (Days until payment, Total cost
 * to zero, Institution, APR tier badge) and rewrites the labels
 * to be more concrete (Monthly Interest cost, Months to payoff at
 * min, Started at, Progress to zero). Linked-account info flows
 * through `accountsByDebtId` so mom sees WHICH card at a glance.
 */
export default async function DebtsPage() {
  const user = await requireUser();
  // Cluster 7.46: fetch linked accounts so each debt card can show
  // institution + last-4 + account type. Defensive `.catch` mirrors
  // Cluster 7.40 + 7.44's pattern — if the accounts read fails, we
  // still render the page with empty accounts.
  //
  // liveAccountsFromDb returns { canonical, projected } — flatten to
  // a single list for the lookup Map. Debt's `accountId` resolves
  // into either bucket depending on whether it's the canonical
  // seed account or an identity-projected one.
  const ACCOUNTS_BUCKETS = await liveAccountsFromDb(user.id).catch(() => ({
    canonical: [],
    projected: [],
  }));
  const ALL_ACCOUNTS = [
    ...ACCOUNTS_BUCKETS.canonical,
    ...ACCOUNTS_BUCKETS.projected,
  ];
  const DEBTS = liveDebts(user.id);

  // Map debtId → linked Account. A debt's `accountId` may not
  // resolve (account deleted, debt was manually entered). The Map
  // is sparse — `.get()` returns undefined for unlinked debts, and
  // DebtCard/DebtDetailExpand handle that gracefully (no
  // institution line).
  //
  // The Map value type is structural (DebtCardAccount) — the in-
  // memory Debt.accountId points at the strict Account shape, but
  // liveAccountsFromDb returns nullable fields. DebtCardAccount
  // (defined alongside DebtCard) accepts both.
  const accountsByDebtId = new Map<string, import("@/components/debts/DebtCard").DebtCardAccount>();
  for (const acct of ALL_ACCOUNTS) {
    accountsByDebtId.set(acct.id, {
      name: acct.name,
      mask: acct.mask,
      institution: acct.institution,
      type: acct.type,
    });
  }

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

      <DebtListInteractive
        debts={DEBTS}
        accountsByDebtId={accountsByDebtId}
        anchor={TODAY}
      />
    </div>
  );
}
