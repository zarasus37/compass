/**
 * Calendar-date arithmetic.
 *
 * ## Why this exists
 *
 * "The next N days" is a **calendar** range, but the obvious way to
 * compute it — `new Date(d.getTime() + N * 24 * 60 * 60 * 1000)` — is a
 * fixed **instant** offset. The two disagree whenever the range straddles
 * a daylight-saving transition.
 *
 * Measured in US/Central, anchoring on 2026-10-06:
 *
 *     instant offset : Dec 04 2026 23:00   <- one hour short
 *     calendar       : Dec 05 2026 00:00
 *
 * That silently dropped any event scheduled at local midnight on the 60th
 * day, and shifted recurring dates by an hour for roughly half of all
 * inputs. It reproduced on 2 of 12 possible anchor months per year.
 *
 * CI did not catch it because the runner is `ubuntu-latest`, i.e. UTC,
 * which has no DST and where the two formulations are identical.
 *
 * ## When NOT to use it
 *
 * Do **not** use this for a genuine elapsed-duration window — e.g.
 * "everything due within 7×24h of now" compared against stored instants.
 * There, the instant offset is the correct semantics and the one-hour
 * difference is meaningless. Reach for this helper when the boundary is a
 * *calendar day* the user would name (a bill's due day, a pay period's
 * start, a payday).
 */

/**
 * Add `days` calendar days to `from`, returning local midnight of the
 * resulting calendar date.
 *
 * `Date.prototype.setDate` operates on calendar fields rather than on an
 * elapsed duration, so it stays exact in local time across DST
 * transitions — unlike adding `days * 24 * 60 * 60 * 1000` milliseconds.
 *
 * @param from Anchor date. Its time-of-day is discarded.
 * @param days Calendar days to advance. May be negative.
 */
export function addCalendarDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Advance `from` by `days` calendar days, **preserving time-of-day**.
 *
 * Same DST correction as {@link addCalendarDays} but without snapping to
 * midnight — use this when the anchor is a time of day that matters (e.g.
 * a 9:00 AM due date) and must not silently shift to 8:00 or 10:00 AM
 * depending on which side of a transition the span lands.
 */
export function addCalendarDaysKeepingTime(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}