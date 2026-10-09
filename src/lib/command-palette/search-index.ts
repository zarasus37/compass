/**
 * Cluster 7.1 — Search index server function.
 *
 * `getSearchIndex(userId)` returns the full palette search
 * index for the user:
 *   - The 16 static routes (from `routes.ts`, shared with the
 *     sidebar nav config in spirit but defined separately).
 *   - The dynamic DB-backed items: envelopes, goals, debts,
 *     bills, accounts.
 *
 * The function is pure-server (queries Prisma). It is called
 * from the (app) layout at request time, so the search index
 * is always current. The dynamic reads are cheap (indexed
 * queries; the user owns the rows; the lists are short).
 *
 * If the user has no rows (e.g. before onboarding), the
 * function still returns the static routes so the palette is
 * useful for navigation even on a fresh install.
 */

import { prisma } from "@/server/db";
import { getDebts } from "@/lib/state/financial-state";
import { STATIC_ROUTES } from "./routes";
import type { PaletteItem, SearchIndex } from "./types";

const formatCents = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const centsRem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${centsRem.toString().padStart(2, "0")}`;
};

export async function getSearchIndex(userId: string): Promise<SearchIndex> {
  try {
    return await loadSearchIndex(userId);
  } catch {
    // Every dynamic branch can fail, including the existing direct DB reads.
    // Preserve rejection without exposing query text or connection details.
    throw new Error("Search is temporarily unavailable. Please retry shortly.");
  }
}

async function loadSearchIndex(userId: string): Promise<SearchIndex> {
  // Read all five dynamic lists in parallel. The prisma
  // queries are indexed by userId; the result sets are short.
  const [envelopes, goals, accounts, bills, debts] = await Promise.all([
    prisma.envelope.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        planet: true,
        currentBalance: true,
        targetBalance: true,
      },
    }),
    prisma.goal.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
      },
    }),
    prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        currentBalance: true,
      },
    }),
    prisma.bill.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        amountCents: true,
      },
    }),
    // FIN-01 — canonical, durable, tenant-scoped read.
    // Replaces `mod.readDebts(userId)` from `@/lib/store`, which read
    // process-local memory. The field list below is unchanged.
    //
    // B1 (Polar): a read failure must NOT become an empty result set.
    // These branches are combined with Promise.all, so a rejected branch
    // propagates and the caller sees a failed search rather than a
    // search that confidently reports "no debts".
    // N5: the stale "still in the in-memory store (no Prisma" comment
    // that sat above this block is gone — it was no longer true.
    (async () => {
      const res = await getDebts(userId);
      if (!res.ok) {
        // Sanitized code only; the DAL logs only a bounded diagnostic code.
        throw new Error(`command-palette: ${res.error}`);
      }
      return res.data.map((d) => ({
        id: d.id,
        name: d.name,
        balanceCents: d.balanceCents,
        aprBps: d.aprBps,
      }));
    })(),
  ]);

  // Map the Prisma rows to PaletteItem.
  const envelopeItems: PaletteItem[] = envelopes.map((e) => ({
    id: `env:${e.id}`,
    href: `/envelopes/${e.id}`,
    title: e.name,
    kind: "ENV",
    chapter: null,
    sub: `vessel: ${(e.planet ?? "—").toLowerCase()} · ${formatCents(e.currentBalance)} of ${formatCents(e.targetBalance)}`,
  }));

  const goalItems: PaletteItem[] = goals.map((g) => {
    const target = g.targetAmount ?? 0;
    const current = g.currentAmount ?? 0;
    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
    return {
      id: `goal:${g.id}`,
      href: `/goals/${g.id}`,
      title: g.name,
      kind: "GOAL",
      chapter: null,
      sub: `${formatCents(current)} / ${formatCents(target)} · ${pct}%`,
    };
  });

  const debtItems: PaletteItem[] = debts.map((d) => ({
    id: `debt:${d.id}`,
    href: `/debts`,
    title: d.name,
    kind: "DEBT",
    chapter: null,
    sub: `balance: ${formatCents(d.balanceCents)} · apr: ${(d.aprBps / 100).toFixed(2)}%`,
  }));

  const billItems: PaletteItem[] = bills.map((b) => ({
    id: `bill:${b.id}`,
    href: `/obligations?tab=bills`,
    title: b.name,
    kind: "BILL",
    chapter: null,
    sub: `due: ${formatCents(b.amountCents)}`,
  }));

  const accountItems: PaletteItem[] = accounts.map((a) => ({
    id: `acc:${a.id}`,
    href: `/accounts`,
    title: a.name,
    kind: "ACC",
    chapter: null,
    sub: `type: ${a.type} · ${formatCents(a.currentBalance)}`,
  }));

  const items: PaletteItem[] = [
    ...envelopeItems,
    ...goalItems,
    ...debtItems,
    ...billItems,
    ...accountItems,
  ];

  return {
    routes: STATIC_ROUTES,
    items,
    total: STATIC_ROUTES.length + items.length,
  };
}
