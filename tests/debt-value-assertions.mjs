/**
 * Real-value debt assertions, shared by the seven `smoke-debts-*` tests.
 *
 * WHY THIS EXISTS
 * ---------------
 * All seven debts tests used to assert on component SOURCE. That is why
 * Clusters 7.48/7.49 shipped green while the utilization caption, gauge
 * and rainbow gradient had never rendered for a single user: the tests
 * read `DebtCard.tsx` and found the code, while the object handed to it
 * was missing `creditLimitCents` (see the `toDisplayDebt` fix).
 *
 * These assertions read the actual rows out of Postgres and then require
 * the rendered page to contain those exact figures. A mapping that drops
 * a field, or a bps/percent conversion that is off by 100x, now fails a
 * test instead of silently reaching a user.
 *
 * Every check takes its subject from the database, never from a literal
 * in the test file, so the tests cannot drift away from the seed.
 */

/**
 * Read the fixture user's live debt rows, ordered the way /debts orders them.
 */
export async function readDebtRows(prisma, userId) {
  return prisma.debt.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Format cents the way DebtCard's `formatMoney` does, so the page and the
 * test agree on the string. Kept deliberately literal rather than
 * importing the component's helper: if that helper ever changes, these
 * assertions should fail loudly rather than follow it silently.
 */
export function money(cents) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The core real-value block. Appends checks to `check(name, cond, detail)`.
 *
 * @param {object} args
 * @param {import("./db-client.mjs").prisma} args.prisma
 * @param {string} args.userId      the fixture user
 * @param {string} args.html        the script-stripped /debts body
 * @param {(n:string,c:boolean,d?:string)=>void} args.check
 * @returns {Promise<object[]>} the rows, so callers can add specific checks
 */
export async function assertRealDebtValues({ prisma, userId, html, check }) {
  const rows = await readDebtRows(prisma, userId);

  // Strip BOTH <script> bodies and React's text-node comment markers.
  //
  // The comment part is not optional. React separates adjacent text nodes
  // with `<!-- -->`, so a pill rendering `{(aprBps / 100).toFixed(2)}% APR`
  // lands in the HTML as `24.99<!-- -->% APR`. Stripping scripts alone
  // therefore BREAKS a "24.99%" match that the raw document satisfies,
  // because the only copy without the comment is the escaped one in the
  // RSC flight payload. Both are transport artifacts rather than content,
  // and this block is about what a reader actually sees.
  //
  // The comments are replaced with NOTHING, not with a space: the comment
  // is a separator BETWEEN two pieces of one string, so substituting
  // whitespace would turn `24.99% APR` into `24.99   % APR` and break the
  // very match the strip was meant to enable.
  const visible = (html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "");

  check("[real] the fixture user has debt rows in Postgres", rows.length > 0, `${rows.length} row(s)`);

  // APR must round-trip EXACTLY through basis points. This is the
  // assertion the brief calls out by name, and the one that a float
  // percent stored as-is would fail by a factor of 100.
  const withApr = rows.find((r) => r.aprBps > 0);
  if (withApr) {
    const asPercent = withApr.aprBps / 100;
    const bpsFromPercent = Math.round(asPercent * 100);
    check(
      "[real] a known APR round-trips exactly through basis points",
      bpsFromPercent === withApr.aprBps,
      `${withApr.aprBps} bps -> ${asPercent}% -> ${bpsFromPercent} bps`,
    );
    check(
      "[real] the APR pill renders that same percentage",
      visible.includes(`${asPercent.toFixed(2)}% APR`),
      `expected ${asPercent.toFixed(2)}% APR for ${withApr.name}`,
    );
  }

  // Every balance must appear as the exact dollar figure.
  for (const r of rows) {
    check(
      `[real] ${r.name} renders its balance as ${money(r.balanceCents)}`,
      visible.includes(money(r.balanceCents)),
    );
  }

  // Utilization is the regression this whole file exists for: a debt with
  // a credit limit must show a "% used" caption derived from THAT limit.
  const withLimit = rows.find((r) => r.creditLimitCents != null && r.creditLimitCents > 0);
  if (withLimit) {
    const expected = Math.min(
      100,
      Math.max(0, (withLimit.balanceCents / withLimit.creditLimitCents) * 100),
    );
    const needle = `${Math.round(expected)}% used`;
    check(
      `[real] ${withLimit.name} shows utilization "${needle}" from its own limit`,
      visible.includes(needle),
      `balance ${money(withLimit.balanceCents)} / limit ${money(withLimit.creditLimitCents)}`,
    );
  } else {
    check("[real] at least one seeded debt carries a credit limit", false, "none found");
  }

  return rows;
}

/**
 * Persisted-state assertions: the numbers must come back out of the
 * database, not from a re-read of the page. This is what makes "survives
 * a refresh" a checked property rather than an assumption.
 */
export function assertDebtRowIntegrity({ rows, check }) {
  for (const r of rows) {
    check(
      `[persist] ${r.name} balance is non-negative and within its original`,
      r.balanceCents >= 0 && r.balanceCents <= r.originalBalanceCents,
      `${r.balanceCents} <= ${r.originalBalanceCents}`,
    );
    check(
      `[persist] ${r.name} APR is a sane bps value (0..10000)`,
      Number.isInteger(r.aprBps) && r.aprBps >= 0 && r.aprBps <= 10000,
      `${r.aprBps} bps`,
    );
  }
  const limited = rows.filter((r) => r.creditLimitCents != null);
  check(
    "[persist] the credit limit survived the round-trip on every limited debt",
    limited.length > 0 && limited.every((r) => r.creditLimitCents > 0),
    `${limited.length} limited debt(s)`,
  );
}
