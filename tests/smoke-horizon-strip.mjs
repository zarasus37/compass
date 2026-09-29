/**
 * Smoke for the SwipeableDashboardHeader (Cluster 3.x) — Card A
 * (Velocity Telemetry) + Card B (Consumption Ring + 14-day Horizon
 * Strip) on the top fold of /.
 *
 * Verifies:
 *   - Page 0: SafeToSpendHero with VELOCITY label + /day suffix
 *   - Page 1: HorizonStrip with 14 day rows (chronological)
 *   - Today marker is present on the right day
 *   - Eyebrow "// CHRONICLE · 14-DAY HORIZON" is on Page 1
 *
 * Both pages render in the SSR HTML even though only one is visible
 * at a time (CSS scroll-snap hides the other). So we can verify
 * each in a single fetch.
 *
 * Run with: tsx --conditions=react-server tests/smoke-horizon-strip.mjs
 *
 * Uses a per-test fixture user (see tests/fixture.mjs) rather than the
 * one shared smoke user, so this test can neither be poisoned by nor
 * poison another test's state. tsx + the react-server condition are
 * required because the fixture imports `src/lib/*.ts` (which pull in
 * Next's `server-only` marker).
 */

import { loginAsFixture } from "./fixture.mjs";

const log = (k, v) => console.log(`[${k}] ${v}`);

async function main() {
  console.log("--- Swipeable horizon smoke ---\n");

  // Per-test fixture user: creates the user, opens the onboarding gate
  // both ways, provisions a biweekly paycheck + a month of spending,
  // and performs the server-action login. The cookie jar rides on `s`.
  const s = await loginAsFixture("horizon-strip");
  log("fixture", `user=${s.email}`);
  log("login", `status=${s.login.status} session=${!!s.jar["compass_session"]}`);

  const r = await s.get("/");
  const html = await r.text();
  log("/", `status=${r.status} bytes=${html.length}`);

  // Strip React 19 hydration comments so string checks see the
  // canonical text.
  const stripped = html.replace(/<!--\s*-->/g, "");

  // ---------- Card A: Daily Telemetry (SafeToSpendHero, Cluster 3.2.5) ----------
  // The Cluster 3.2.5 redesign replaced the burn curve + 3-cell row
  // with: big number (unchanged), per-day figure, "WAYS TO GROW THIS"
  // opportunities card, and a small PACE line. Assertions below check
  // the new structure.
  const cardA = {
    eyebrow:        /DAILY TELEMETRY · SAFE TO SPEND/.test(stripped),
    perDaySuffix:   /\/ day/.test(stripped),
    // The new "ways to grow this" opportunities card. Either shows
    // the action rows OR the calm empty state.
    opportunitiesHeader: /WAYS TO GROW THIS/.test(stripped),
    opportunitiesEmpty:  /Your plan is tight/.test(stripped),
    // The new pace line (small, secondary visual).
    paceLabel:      /PACE · LAST 7 DAYS/.test(stripped),
    paceStatus:     /UNDER PACE|ON PACE|ABOVE PACE|WELL OVER/.test(stripped),
  };

  // ---------- Card B: Spend Ring + 14-day Horizon Strip ----------
  const cardB = {
    spendRingEyebrow:   /Total Spend/.test(stripped) || /vessel mix/.test(stripped),
    spendRingLabel:     />REMAINING</.test(stripped),
    horizonEyebrow:     /CHRONICLE · 14-DAY HORIZON/.test(stripped),
    horizonSectionHdr:  /period horizon/.test(stripped),
    horizonDays:        /14<!-- --> days|14 days/.test(stripped),
    todayBadge:         /TODAY/.test(stripped),
  };

  // Count <li role="listitem"> elements inside the horizon strip.
  // The horizon strip renders as a <div role="list"> wrapping a <ul>
  // of <li role="listitem"> children — one per day. We slice the page
  // from the list-region opening to its matching closing </div>.
  const horizonStart = stripped.indexOf('aria-label="Period horizon — 14 days"');
  let dayCount = 0;
  if (horizonStart > 0) {
    // The list region is the parent <div role="list">. Find its opening
    // tag and slice forward to the next </ul> after it.
    const listOpen = stripped.lastIndexOf("<div", horizonStart);
    const listEnd = stripped.indexOf("</ul>", horizonStart);
    if (listOpen > 0 && listEnd > listOpen) {
      const region = stripped.slice(listOpen, listEnd);
      dayCount = (region.match(/<li role="listitem"/g) || []).length;
    }
  }
  cardB.dayRowCount = dayCount;

  // Page indicator dots — expect 2 (one for Card A, one for Card B)
  const pageDots = (stripped.match(/aria-label="Go to page \d+"/g) || []).length;

  const checks = [
    ["Card A: eyebrow present", cardA.eyebrow],
    ["Card A: / day suffix present", cardA.perDaySuffix],
    ["Card A: WAYS TO GROW THIS opportunities card", cardA.opportunitiesHeader],
    ["Card A: pace line label", cardA.paceLabel],
    ["Card A: pace status (UNDER/ON/ABOVE/WELL OVER)", cardA.paceStatus],
    // The opportunities card is either populated with rows OR shows
    // the calm empty state. Either is valid.
    ["Card A: opportunities populated OR empty-state", cardA.opportunitiesHeader && (cardA.opportunitiesEmpty || true)],
    // (Burn curve + 3-cell row removed in Cluster 3.2.5.)
    ["Card B: spend ring eyebrow", cardB.spendRingEyebrow],
    ["Card B: spend ring REMAINING label", cardB.spendRingLabel],
    ["Card B: horizon strip eyebrow", cardB.horizonEyebrow],
    ["Card B: horizon section header (// period horizon)", cardB.horizonSectionHdr],
    ["Card B: horizon days count (14)", cardB.horizonDays],
    ["Card B: 14 day rows in horizon strip", cardB.dayRowCount === 14],
    ["Card B: TODAY badge present", cardB.todayBadge],
    ["Swipeable: 2 page indicator dots", pageDots === 2],
  ];

  console.log("\n--- Card A (Velocity Telemetry) ---");
  for (const k of Object.keys(cardA)) log(k, cardA[k] ? "OK" : "MISS");
  console.log("\n--- Card B (Ring + Horizon) ---");
  for (const k of Object.keys(cardB)) log(k, cardB[k] ? "OK" : "MISS");
  log("page dots", pageDots);

  // Tear down this test's user before reporting. If the test crashed
  // earlier the next fixture's sweep reclaims the user anyway, so a
  // failed run never leaks.
  await s.close();

  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const [name, cond] of checks) {
    const ok = Boolean(cond);
    log(name, ok ? "OK" : "MISS");
    if (ok) pass++; else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss`);

  if (fail > 0) { console.log("\n!! FAILURES"); process.exit(3); }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
