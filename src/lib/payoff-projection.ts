/**
 * Payoff projection engine — pure functions for the debt-payoff
 * simulator (Cluster 1.9 + 4.0 client-bundle fix).
 *
 * Extracted from `lib/store.ts` so that client components (the
 * DebtPayoffSimulator's slider + method toggle) can import the
 * pure computation without pulling in better-sqlite3 / Prisma
 * transitively. The simulator re-runs the projection on every
 * state change; it must run in the browser.
 *
 * The data the simulator needs (the list of debts) is passed in
 * as a prop from a server component, so the simulator never reads
 * from the DB.
 *
 * For backwards compatibility, `lib/store.ts` re-exports these
 * symbols. New client-side code should import from here.
 */

export type PayoffMethod = "snowball" | "avalanche";

/**
 * Order debts by method. Snowball = smallest balance first
 * (momentum); Avalanche = highest APR first (saves interest).
 * Zero-balance debts are filtered out.
 */
export function orderDebtsByMethod<T extends { balanceCents: number; aprBps: number }>(
  debts: ReadonlyArray<T>,
  method: PayoffMethod,
): T[] {
  const active = debts.filter((d) => d.balanceCents > 0);
  if (method === "snowball") {
    return active.slice().sort((a, b) => a.balanceCents - b.balanceCents);
  }
  // Avalanche
  return active.slice().sort((a, b) => b.aprBps - a.aprBps);
}

export interface DebtPayoffRow {
  debtId: string;
  debtName: string;
  monthsToPayoff: number;
  totalInterestCents: number;
  startingBalanceCents: number;
}

export interface PayoffProjection {
  method: PayoffMethod;
  monthlyExtraCents: number;
  totalMonths: number;
  totalInterestCents: number;
  payoffDate: Date;
  perDebt: DebtPayoffRow[];
  /**
   * True when at least one debt's minimum payment can't cover its
   * monthly interest (the "never pays off" case). The UI should
   * surface this as a warning.
   */
  hasUnpayableDebt: boolean;
  /** If hasUnpayableDebt, the IDs of the debts that won't pay off. */
  unpayableDebtIds: string[];
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375; // ~average month

/**
 * Closed-form months-to-payoff for a single debt with monthly
 * payment P, balance B, and monthly rate r. Returns Infinity if
 * P <= B*r (the payment can't even cover the interest — debt
 * grows forever).
 */
function monthsToPayoffForDebt(
  balanceCents: number,
  monthlyPaymentCents: number,
  monthlyRateBps: number,
): number {
  if (balanceCents <= 0) return 0;
  const r = monthlyRateBps / 10000; // bps → decimal monthly rate
  if (r === 0) {
    if (monthlyPaymentCents <= 0) return Infinity;
    return balanceCents / monthlyPaymentCents;
  }
  const interest = balanceCents * r;
  if (monthlyPaymentCents <= interest) return Infinity;
  // N = -log(1 - B*r / P) / log(1 + r)
  return -Math.log(1 - interest / monthlyPaymentCents) / Math.log(1 + r);
}

/**
 * Project the total months to be debt-free and the total interest
 * paid, given a list of debts, a payoff method, and a monthly extra
 * payment. The extra rolls into the highest-priority debt; freed
 * minimums from paid-off debts cascade into the next.
 *
 * Algorithm: simulate month by month. Each month, every active debt
 * accrues interest, then the minimum is applied. Whatever's left
 * (cascading minimums + extra) goes to the highest-priority debt
 * (per the chosen method). When a debt hits zero, mark the date.
 *
 * This is iterative for accuracy (cascading can be complex); we cap
 * the simulation at 360 months (30 years) to avoid infinite loops
 * on the unpayable case.
 */
export function payoffProjection<T extends {
  id: string;
  name: string;
  balanceCents: number;
  aprBps: number;
  minPaymentCents: number;
}>(
  debts: ReadonlyArray<T>,
  method: PayoffMethod,
  monthlyExtraCents: number,
  anchor: Date = new Date(),
  paychecksPerMonth: number = 2,
): PayoffProjection {
  // Deep-copy the debts' mutable state so we don't mutate the input.
  const ordered = orderDebtsByMethod(debts, method).map((d) => ({
    ...d,
  }));

  // Filter to only those with non-zero balance.
  let active = ordered.filter((d) => d.balanceCents > 0);
  if (active.length === 0) {
    return {
      method,
      monthlyExtraCents,
      totalMonths: 0,
      totalInterestCents: 0,
      payoffDate: anchor,
      perDebt: ordered.map((d) => ({
        debtId: d.id,
        debtName: d.name,
        monthsToPayoff: 0,
        totalInterestCents: 0,
        startingBalanceCents: d.balanceCents,
      })),
      hasUnpayableDebt: false,
      unpayableDebtIds: [],
    };
  }

  const perDebtStart = new Map(active.map((d) => [d.id, d.balanceCents]));
  const perDebtInterest = new Map<string, number>(active.map((d) => [d.id, 0]));
  const perDebtMonths = new Map<string, number>(active.map((d) => [d.id, 0]));
  const paidOffAt = new Map<string, number>(); // debtId → month index when paid
  const unpayable = new Set<string>();

  // Convert extra from "per paycheck" to "per month" — user thinks
  // of extra as a per-check amount, but the simulation runs monthly.
  const extraPerMonth = Math.round(monthlyExtraCents * paychecksPerMonth);

  // Total minimums across ALL originally-active debts. Once a debt
  // is paid off, its minimum is "freed" and cascades into the head.
  // The minimums of still-active debts are NOT freed (we just applied
  // them in step 2).
  const originalTotalMins = active.reduce((s, d) => s + d.minPaymentCents, 0);

  const MAX_MONTHS = 360;
  for (let m = 1; m <= MAX_MONTHS; m += 1) {
    if (active.length === 0) break;

    // 1. Accrue interest on every active debt.
    //    aprBps is ANNUAL rate in basis points. Monthly rate = annual / 12.
    for (const d of active) {
      const r = d.aprBps / 120000; // annual% / 12 → monthly decimal
      const interest = Math.round(d.balanceCents * r);
      d.balanceCents += interest;
      perDebtInterest.set(d.id, (perDebtInterest.get(d.id) ?? 0) + interest);
    }

    // 2. Apply the minimum payment to every active debt.
    for (const d of active) {
      const min = Math.min(d.minPaymentCents, d.balanceCents);
      d.balanceCents -= min;
    }

    // 3. Cascade freed minimums + extra into the highest-priority
    //    active debt. Highest priority = lowest in `active` array
    //    (already sorted by method). The "freed" amount is the sum
    //    of minimums of debts that have been paid off in this
    //    simulation (not the OTHER active debts — those mins were
    //    already applied in step 2 and we'd be double-counting).
    const head = active[0]!;
    if (head.balanceCents > 0) {
      const activeMins = active.reduce((s, d) => s + d.minPaymentCents, 0);
      const freedMins = originalTotalMins - activeMins;
      const cascade = extraPerMonth + freedMins;
      const apply = Math.min(cascade, head.balanceCents);
      head.balanceCents -= apply;
    }

    // 4. Track months for debts still active.
    for (const d of active) {
      perDebtMonths.set(d.id, m);
    }

    // 5. Mark paid-off debts.
    const stillActive: typeof active = [];
    for (const d of active) {
      if (d.balanceCents <= 0) {
        d.balanceCents = 0;
        paidOffAt.set(d.id, m);
      } else {
        stillActive.push(d);
      }
    }
    active = stillActive;
  }

  // Unpayable = a debt that is still active at the end of the
  // simulation AND its balance grew from its starting balance.
  // (If the balance shrank, the debt is paying down — even if it
  // didn't reach zero in 360 months, the user is on the right path
  // and the "you'll pay it off eventually" signal is appropriate.)
  for (const d of active) {
    const startBal = perDebtStart.get(d.id) ?? 0;
    if (d.balanceCents >= startBal && d.aprBps > 0) {
      unpayable.add(d.id);
    }
  }

  const totalMonths = perDebtMonths.size > 0
    ? Math.max(...Array.from(perDebtMonths.values()))
    : 0;
  const totalInterestCents = Array.from(perDebtInterest.values()).reduce(
    (s, n) => s + n,
    0,
  );

  return {
    method,
    monthlyExtraCents,
    totalMonths,
    totalInterestCents,
    payoffDate: new Date(anchor.getTime() + totalMonths * MS_PER_MONTH),
    perDebt: ordered.map((d) => {
      const startBal = perDebtStart.get(d.id) ?? 0;
      const months = perDebtMonths.get(d.id) ?? 0;
      const interest = perDebtInterest.get(d.id) ?? 0;
      // If the debt was already at $0 in the seed, months=0.
      return {
        debtId: d.id,
        debtName: d.name,
        monthsToPayoff: months,
        totalInterestCents: interest,
        startingBalanceCents: startBal,
      };
    }),
    hasUnpayableDebt: unpayable.size > 0,
    unpayableDebtIds: Array.from(unpayable),
  };
}
