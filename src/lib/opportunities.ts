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
 * The engine is a pure function — no I/O, no React. The page
 * component calls it and passes the result into SafeToSpendHero.
 * Test-friendly: a smoke can call `topOpportunities()` and assert
 * the structure without spinning up a server.
 *
 * Cluster 3.2.5
 */

import { readEnvelopes } from "./store";
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

export function topOpportunities(opts: { limit?: number } = {}): Opportunity[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const out: Opportunity[] = [];

  const envelopes = readEnvelopes();
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
  const subs: DetectedSubscription[] = detectSubscriptions();
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
        planetHint: e.planet,
      });
    }
  }

  // Sort by impact (cents saved) descending, then cap to the limit.
  return out
    .sort((a, b) => b.deltaCents - a.deltaCents)
    .slice(0, limit);
}
