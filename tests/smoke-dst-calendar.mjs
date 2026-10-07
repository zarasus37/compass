/**
 * Smoke for calendar-date arithmetic across DST transitions.
 *
 * Why this exists
 * ---------------
 * A cash-flow smoke went red on a Windows dev box and turned out to be a
 * real product bug, not a flaky test. `today.getTime() + N * 24 * 60 * 60
 * * 1000` is a fixed *instant* offset, but "the next N days" is a
 * *calendar* range. Where the range straddles a DST transition the two
 * disagree by an hour, and anything scheduled at local midnight on the
 * boundary day silently fell outside the horizon.
 *
 * The same pattern was in the paycheck scheduler and the pay-period
 * advance loop, where it drifted for 111 of 222 realistic inputs and
 * gates when real money is allocated.
 *
 * Why this test pins its own timezone
 * -----------------------------------
 * The CI runner is `ubuntu-latest`, i.e. UTC, where the instant-offset and
 * calendar forms are *identical* — so every DST bug in this codebase was
 * invisible to CI by construction. Setting `TZ` here makes the assertions
 * run in US/Central no matter where they execute, which is what lets this
 * suite catch the class at all.
 *
 * Node resolves the timezone at process start, so `process.env.TZ` is set
 * before any Date is constructed, and `../src/lib/dates.ts` is imported
 * dynamically afterwards so the ordering is unambiguous.
 *
 * Run: tsx tests/smoke-dst-calendar.mjs
 * Pure date math — no dev server, no database, no fixtures.
 */

const checks = [];

function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  // Must precede every Date construction in this process.
  process.env.TZ = "America/Chicago";

  const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  check(
    "test process is running in a DST-observing timezone",
    resolvedTz === "America/Chicago",
    `TZ=${resolvedTz}`,
  );

  const { addCalendarDays, addCalendarDaysKeepingTime } = await import(
    "../src/lib/dates.ts"
  );

  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;

  // ── addCalendarDays lands on the right calendar date ──────────────
  // US/Central DST ends 2026-11-01, starts 2027-03-14.
  const anchors = [
    ["before fall-back", 2026, 9, 6],
    ["across fall-back", 2026, 10, 6],
    ["across spring-forward", 2027, 2, 6],
    ["mid-year, no transition", 2026, 5, 6],
  ];
  for (const [label, y, m, d] of anchors) {
    const from = new Date(y, m, d, 0, 0, 0, 0);
    const got = addCalendarDays(from, 60);
    const want = new Date(y, m, d + 60, 0, 0, 0, 0);
    check(
      `addCalendarDays(60d) is calendar-correct ${label}`,
      fmt(got) === fmt(want),
      `got ${fmt(got)} want ${fmt(want)}`,
    );
  }

  // Negative offsets must work too (roll a window backwards).
  const back = addCalendarDays(new Date(2026, 10, 6, 0, 0, 0, 0), -60);
  check(
    "addCalendarDays(-60d) is calendar-correct across fall-back",
    fmt(back) === fmt(new Date(2026, 8, 7, 0, 0, 0, 0)),
    `got ${fmt(back)}`,
  );

  // ── time-of-day is preserved across a transition ─────────────────
  // The old instant-offset form returned 08:00 or 10:00 for a 09:00
  // anchor, depending on which side the 7-day span landed.
  const nineAmBeforeFall = new Date(2026, 10, 1, 9, 0, 0, 0);
  const afterFall = addCalendarDaysKeepingTime(nineAmBeforeFall, 7);
  check(
    "addCalendarDaysKeepingTime keeps 09:00 across fall-back",
    afterFall.getHours() === 9 && afterFall.getDate() === 8,
    `got ${afterFall.toString()}`,
  );

  const nineAmBeforeSpring = new Date(2027, 2, 8, 9, 0, 0, 0);
  const afterSpring = addCalendarDaysKeepingTime(nineAmBeforeSpring, 7);
  check(
    "addCalendarDaysKeepingTime keeps 09:00 across spring-forward",
    afterSpring.getHours() === 9 && afterSpring.getDate() === 15,
    `got ${afterSpring.toString()}`,
  );

  // ── the paycheck walk that actually shipped broken ───────────────
  // Biweekly schedule anchored 2026-01-03 09:00, walked across the year.
  // Production returned 10:00 for half of all realistic anchors.
  let walk = new Date(2026, 0, 3, 9, 0, 0, 0);
  for (let i = 0; i < 40; i++) walk = addCalendarDaysKeepingTime(walk, 14);
  check(
    "biweekly pay walk keeps 09:00 after 40 steps over DST",
    walk.getHours() === 9,
    `got ${walk.toString()}`,
  );
  // 40 steps x 14 days = 560 days, which walks 18.4 months — so the
  // invariant a biweekly schedule actually has is day-of-WEEK, not
  // day-of-month. 2026-01-03 is a Saturday, so every pay date must be one.
  check(
    "biweekly pay walk stays on Saturday",
    walk.getDay() === 6,
    `got weekday=${walk.getDay()}`,
  );

  // A midnight-anchored period boundary must stay on midnight — this is
  // what keeps periodKey (startDate.toISOString().slice(0,10)) stable.
  let period = new Date(2026, 0, 3, 0, 0, 0, 0);
  for (let i = 0; i < 40; i++) period = addCalendarDays(period, 14);
  check(
    "pay-period walk stays at local midnight",
    period.getHours() === 0,
    `got ${period.toString()}`,
  );

  console.log("\n--- checks ---");
  const pass = checks.filter((c) => c.ok).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
  if (miss > 0) {
    console.log("\nFAILED checks:");
    for (const c of checks) {
      if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
    }
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});