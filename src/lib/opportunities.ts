/**
 * topOpportunities — pure engine that surfaces the top N ways the
 * user could grow their safe-to-spend number right now.
 *
 * Design (Cluster 3.2.5): the safe-to-spend card should be
 * *actionable* in the direction the user wants (grow the number),
 * not just descriptive of where they are. The headline number is
 * necessary but not sufficient — the user also needs "here's how
 * to make this bigger." This engine produces that list.
 *
 * Three opportunity types (ranked by impact = deltaCents):
 *   1. **buffer-surplus** — Mars · Buffer has current > target; the
 *      surplus could be moved to free spending. Always detectable
 *      from the live envelopes.
 *   2. **cancel-subscription** — a detected subscription in `review`
 *      status (60+ days since last use). Recoverable amount is the
 *      monthly cents.
 *   3. **over-funded-envelope** — any non-Buffer envelope with
 *      current > 130% of target. The excess is a candidate to pull
 *      back. Skipped for the Buffer envelope (already handled in #1).
 *
 * The engine is a pure function over the caller's data — no I/O, no
 * React. The page component passes the authenticated `userId` (the
 * reads below are scoped to that user) and hands the result to
 * SafeToSpendHero. Test-friendly: a smoke can call
 * `topOpportunities(userId)` and assert the structure without
 * spinning up a server.
 *
 * Cluster 3.2.5
 */

import { getEnvelopes, isPlanetId } from "@/lib/state/financial-state";
import { detectSubscriptions, type DetectedSubscription } from "./detect-subscriptions";
import type { PlanetId } from "@/components/alchemy/VesselGlyph";

export type OpportunityKind =
  | "buffer-surplus"
  | "cancel-subscription"
  | "over-funded-envelope";

export interface Opportunity {
  /** Stable id (used as React key + for smoke assertions). */
  id: string;
  kind: OpportunityKind;
  /** Short mono-cap icon/glyph that suggests the action. */
  icon: string;
  /** Action title (no formatted money — the component formats). */
  title: string;
  /** One-line detail (last used N days, percent over target, etc.). */
  detail: string;
  /** Cents this would add to safe-to-spend if applied. */
  deltaCents: number;
  /** Where the click-through lands. */
  href: string;
  /** Optional vessel identifier for the icon's color. */
  planetHint?: PlanetId;
}

const DEFAULT_LIMIT = 3;
const OVER_FUND_THRESHOLD = 1.3; // 130% of target → flagged as over-funded

export async function topOpportunities(
  userId: string,
  opts: { limit?: number } = {},
): Promise<Opportunity[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const out: Opportunity[] = [];

  // FIN-01 — canonical, durable, tenant-scoped read.
  //
  // This used to be `readEnvelopes(userId)` from `@/lib/store`, a
  // process-local `globalThis` read. That is not just stale-prone: this
  // engine produces user-facing recommendations, so a stale in-memory
  // snapshot could recommend moving money that no longer exists.
  //
  // The DTO field names (planet / targetCents / currentCents) are
  // unchanged, so every financial predicate below is untouched.
  //
  // B1 (Polar): on a read failure this THROWS rather than continuing
  // with an empty list. Returning `[]` would tell the user they have no
  // opportunities during a database outage — a confident, wrong
  // financial statement. Throwing surfaces the failure.
  //
  // Throwing (rather than changing the return type) is what keeps this
  // task inside its file scope: `src/app/page.tsx` and
  // `src/app/(app)/learn/your-numbers/page.tsx` both call this, and
  // widening the signature would mean editing two out-of-scope pages.
  const envelopeRead = await getEnvelopes(userId);
  if (!envelopeRead.ok) {
    console.error(
      "[opportunities] canonical envelope read failed; no opportunities " +
        "are reported for this call:",
      envelopeRead.error,
    );
    throw new Error(`topOpportunities: ${envelopeRead.error}`);
  }
  const envelopes = envelopeRead.data;
  const buffer = envelopes.find((e) => e.planet === "mars");
  if (buffer && buffer.targetCents > 0 && buffer.currentCents > buffer.targetCents) {
    const surplus = buffer.currentCents - buffer.targetCents;
    if (surplus > 0) {
      out.push({
        id: "buffer-surplus",
        kind: "buffer-surplus",
        icon: "[↓]",
        title: "Move from Mars · Buffer surplus",
        detail: `pulled from over-funded safety net — last resort`,
        deltaCents: surplus,
        href: "/envelopes",
        planetHint: "mars",
      });
    }
  }

  // 2) Cancel unused subscriptions. "review" status = 60+ days since
  //    last use, per detectSubscriptions' status logic.
  const subs: DetectedSubscription[] = await detectSubscriptions(userId);
  for (const sub of subs) {
    if (sub.status === "review" && sub.amount > 0) {
      out.push({
        id: `cancel-${sub.id}`,
        kind: "cancel-subscription",
        icon: "[×]",
        title: `Cancel "${sub.name}"`,
        detail: `last used ${sub.lastUsedDays}d ago`,
        deltaCents: sub.amount,
        href: "/obligations?tab=subs",
        planetHint: "venus",
      });
    }
  }

  // 3) Envelope over-funding — current > 130% of target, NOT the
  //    Buffer envelope (already counted as #1).
  for (const e of envelopes) {
    if (e.planet === "mars") continue;
    if (e.targetCents <= 0) continue;
    if (e.currentCents > e.targetCents * OVER_FUND_THRESHOLD) {
      const excess = e.currentCents - e.targetCents;
      if (excess <= 0) continue;
      out.push({
        id: `overfund-${e.id}`,
        kind: "over-funded-envelope",
        icon: "[↓]",
        title: `Reduce ${e.name} (over-funded)`,
        detail: `currently ${Math.round((e.currentCents / e.targetCents) * 100)}% of target`,
        deltaCents: excess,
        href: `/envelopes/${e.id}`,
        // The store's Envelope typed `planet` as a non-null PlanetId;
        // the DB column is nullable. Narrow honestly rather than casting:
        // an unassigned vessel simply has no hint.
        planetHint: isPlanetId(e.planet) ? e.planet : undefined,
      });
    }
  }

  // Sort by impact (cents saved) descending, then cap to the limit.
  return out
    .sort((a, b) => b.deltaCents - a.deltaCents)
    .slice(0, limit);
}
