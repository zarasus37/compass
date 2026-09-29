/**
 * skip-guard — makes "[SKIP-NO-SERVER]" visible in the process exit code.
 *
 * WHY THIS EXISTS
 * ---------------
 * The smoke suite has a long-standing pattern: when the dev server is not
 * reachable, a test calls `checkSkip(name, reason)` which pushes a check
 * with `ok: true` and continues. The file then exits with
 * `process.exit(miss.length ? 1 : 0)`.
 *
 * That makes a run where EVERYTHING skipped byte-identical, in exit code,
 * to a run where everything passed. A green `pnpm smoke` therefore proved
 * nothing whenever the server was down — which is exactly what happened:
 * Compass reported "all green, ~1,580 checks" in COORDINATION.md while
 * GitHub CI had failed 60 consecutive runs, and local runs were skipping
 * every server-touching assertion.
 *
 * WHAT THIS CHANGES
 * -----------------
 * Skips are still reported per-check (so a human reading the log sees
 * which assertions did not run), but they are now also counted, and the
 * file can be told to treat "did not run" as a failure.
 *
 *   default              — skips are tolerated (back-compat for local runs)
 *   --require-server     — any skip fails the file with exit code 2
 *   SMOKE_REQUIRE_SERVER=1  — same, via environment (for CI)
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = at least one check FAILED
 *   2 = no failures, but assertions were SKIPPED and --require-server is on
 *
 * Code 2 is deliberately distinct from 1 so CI can tell "the app is
 * broken" apart from "the harness could not run".
 */

const argv = process.argv.slice(2);

/** True when skipped assertions must be treated as a failure. */
export const REQUIRE_SERVER =
  argv.includes("--require-server") ||
  process.env.SMOKE_REQUIRE_SERVER === "1";

/** Number of assertions skipped in this process. */
let skipped = 0;

/** Call from inside a `checkSkip()` body to register one skipped assertion. */
export function recordSkip() {
  skipped += 1;
}

/** How many assertions have been skipped so far. */
export function skippedCount() {
  return skipped;
}

/**
 * True when this file must exit non-zero because of skips alone.
 * `missCount` is passed in so a real failure still wins.
 */
export function shouldFail(missCount) {
  if (missCount > 0) return true;
  return REQUIRE_SERVER && skipped > 0;
}

/**
 * Build the final exit code. Prints a loud banner when skips are
 * fatal so the reason for the failure is never ambiguous.
 */
export function exitCodeFor(missCount) {
  if (missCount > 0) return 1;
  if (REQUIRE_SERVER && skipped > 0) {
    console.error(
      `\n!! ${skipped} check(s) were SKIPPED and --require-server is set.`,
    );
    console.error(
      "!! Start a dev server (pnpm dev, or `pnpm start` after a build) and re-run.",
    );
    return 2;
  }
  return 0;
}
