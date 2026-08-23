/**
 * detectSubscriptions — recurring-charge detection from real
 * transactions (Cluster 2.x must-have utilities).
 *
 * Strategy:
 *   1. Pull every transaction (via the live store). Group by a
 *      normalized payee key (lowercased, no memo suffix). Compute
 *      the average gap between hits. If 2+ hits at a regular
 *      interval (14 / 30 / 31 days) → recurring.
 *   2. Union with the BILLS list — bills are a curated list of
 *      known recurring charges. Many won't appear as live
 *      transactions yet (they're future-dated or already paid
 *      this period) but they ARE subscriptions.
 *   3. Dedupe by payee/amount.
 *
 * Each row's status is "active" if the most recent hit is within
 * 30 days, "review" if 60+ days. The recoverability math follows.
 *
 * The result is what /subscriptions renders. Real Plaid feed data
 * (in v2) will replace the BILLS fallback automatically.
 */

import { readBills, readTransactions } from "./store";
import { TODAY } from "./mock-seed";

export interface DetectedSubscription {
  id: string;
  name: string;
  amount: number; // cents
  lastUsedDays: number;
  status: "active" | "review";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function payeeKey(payee: string): string {
  // strip memo suffix after "·" or "-"
  return payee
    .split(/[·\-]/)
    [0]!.trim()
    .toLowerCase();
}

function payeeName(payee: string): string {
  // Pretty: first segment, title-cased
  const first = payee.split(/[·\-]/)[0]!.trim();
  return first;
}

export function detectSubscriptions(): DetectedSubscription[] {
  const tx = readTransactions();
  const bills = readBills();
  const today = TODAY.getTime();

  // 1) From live transactions: group by payee key.
  type Group = { name: string; hits: { ts: number; amt: number }[] };
  const groups = new Map<string, Group>();
  for (const t of tx) {
    if (t.isIncome) continue;
    const key = payeeKey(t.payee);
    if (!groups.has(key)) groups.set(key, { name: payeeName(t.payee), hits: [] });
    groups.get(key)!.hits.push({ ts: t.date.getTime(), amt: Math.abs(t.amountCents) });
  }

  // For each group, check if it has 2+ hits at a roughly regular interval.
  const detectedFromTx: DetectedSubscription[] = [];
  for (const [key, g] of groups) {
    if (g.hits.length < 2) continue;
    g.hits.sort((a, b) => a.ts - b.ts);
    const gaps: number[] = [];
    for (let i = 1; i < g.hits.length; i += 1) {
      gaps.push((g.hits[i]!.ts - g.hits[i - 1]!.ts) / MS_PER_DAY);
    }
    const avgGap = gaps.reduce((s, d) => s + d, 0) / gaps.length;
    // Match 14 / 30 / 31 day cycles within ±5 day tolerance.
    const matchesCycle = gaps.some(
      (g) => Math.abs(g - 14) < 5 || Math.abs(g - 30) < 5 || Math.abs(g - 31) < 5,
    );
    if (!matchesCycle) continue;
    // Use the most recent hit + average amount.
    const last = g.hits[g.hits.length - 1]!;
    const amts = g.hits.map((h) => h.amt);
    const amount = Math.round(amts.reduce((s, a) => s + a, 0) / amts.length);
    const lastUsedDays = Math.max(0, Math.round((today - last.ts) / MS_PER_DAY));
    detectedFromTx.push({
      id: `sub-tx-${key}`,
      name: g.name,
      amount,
      lastUsedDays,
      status: lastUsedDays <= 30 ? "active" : "review",
    });
  }

  // 2) Union with BILLS list — bills are recurring by definition.
  // Skip bills that are obviously not subscriptions (e.g. rent).
  const SUBSCRIPTION_BILL_DENY = /rent|mortgage/i;
  const detectedFromBills: DetectedSubscription[] = bills
    .filter((b) => !SUBSCRIPTION_BILL_DENY.test(b.name))
    .map((b) => {
      const lastUsedDays = b.paidAt
        ? Math.max(0, Math.round((today - new Date(b.paidAt).getTime()) / MS_PER_DAY))
        : 0;
      return {
        id: `sub-bill-${b.id}`,
        name: b.name,
        amount: b.amountCents,
        lastUsedDays,
        status: lastUsedDays <= 30 ? "active" : "review",
      };
    });

  // 3) Dedupe by name (lowercased). Prefer the tx-derived row (richer
  // lastUsed data). Then sort: active first, then by amount desc.
  const merged = new Map<string, DetectedSubscription>();
  for (const s of detectedFromBills) {
    merged.set(s.name.toLowerCase(), s);
  }
  for (const s of detectedFromTx) {
    const k = s.name.toLowerCase();
    const existing = merged.get(k);
    if (!existing) {
      merged.set(k, s);
    } else {
      // tx-derived wins for lastUsedDays; keep larger amount for display
      merged.set(k, {
        ...existing,
        lastUsedDays: Math.min(existing.lastUsedDays, s.lastUsedDays),
        amount: Math.max(existing.amount, s.amount),
        status: s.lastUsedDays <= 30 ? "active" : "review",
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return b.amount - a.amount;
  });
}
