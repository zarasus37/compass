/**
 * Date + period utilities.
 *
 * The spec is hard: the pay period is the unit of truth. Every date
 * helper here operates in the user's timezone (assumed single-user,
 * server-local for v1) and is aware of periods.
 */

const DAY = 1000 * 60 * 60 * 24;

const LONG_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MONTH_DAY_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

/** "Saturday, August 30, 2025" */
export function formatLongDate(d: Date | string): string {
  return LONG_DATE_FMT.format(new Date(d));
}

/** "Aug 30" */
export function formatShortDate(d: Date | string): string {
  return SHORT_DATE_FMT.format(new Date(d));
}

/** "August 30" */
export function formatMonthDay(d: Date | string): string {
  return MONTH_DAY_FMT.format(new Date(d));
}

/** "Aug 30, 2025" — for pill labels */
export function formatPillDate(d: Date | string): string {
  const date = new Date(d);
  return `${SHORT_DATE_FMT.format(date)}, ${date.getFullYear()}`;
}

/** "Aug 22 – Sep 4" (range spanning ≤ 2 months). */
export function formatPeriodRange(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getFullYear() === e.getFullYear()) {
    return `${SHORT_DATE_FMT.format(s)} – ${SHORT_DATE_FMT.format(e)}`;
  }
  return `${SHORT_DATE_FMT.format(s)}, ${s.getFullYear()} – ${SHORT_DATE_FMT.format(e)}, ${e.getFullYear()}`;
}

/** Days between two dates, inclusive of start, exclusive of end. */
export function daysBetween(start: Date | string, end: Date | string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / DAY);
}

/** Add N days to a date. */
export function addDays(d: Date | string, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

/** Day-of-period (1-based) for a date in [start, end]. 0 if outside. */
export function dayOfPeriod(today: Date | string, start: Date | string, end: Date | string): number {
  const t = new Date(today);
  const s = new Date(start);
  const e = new Date(end);
  if (t < s || t >= e) return 0;
  return Math.floor((t.getTime() - s.getTime()) / DAY) + 1;
}

/** Total days in a period (start, end]. */
export function periodLength(start: Date | string, end: Date | string): number {
  return daysBetween(start, end);
}

/** "5 days" / "today" / "yesterday" — relative date for a target date. */
export function formatRelativeDate(target: Date | string, now: Date = new Date()): string {
  const t = new Date(target);
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((t.getTime() - t0.getTime()) / DAY);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1 && diff <= 14) return `in ${diff} days`;
  if (diff < -1 && diff >= -14) return `${Math.abs(diff)} days ago`;
  return formatShortDate(t);
}

/** ISO date (YYYY-MM-DD) for a Date object — useful for HTML date inputs. */
export function toISODate(d: Date | string): string {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

/** Plan cadence → next-pay-date calculator. */
export type PayCadence = "weekly" | "biweekly" | "semi_monthly" | "monthly";

export function nextPayDate(
  from: Date,
  cadence: PayCadence,
  /** Index of pay date within a month for semi_monthly (1 or 15). */
  semiMonthlyDays: [number, number] = [1, 15],
): Date {
  const f = new Date(from);
  switch (cadence) {
    case "weekly":
      return addDays(f, 7);
    case "biweekly":
      return addDays(f, 14);
    case "monthly":
      return addDays(f, 30);
    case "semi_monthly": {
      // Pick the next occurrence in semiMonthlyDays
      const [d1, d2] = semiMonthlyDays;
      const day = f.getDate();
      const next1 = new Date(f.getFullYear(), f.getMonth(), Math.min(d1, 28));
      const next2 = new Date(f.getFullYear(), f.getMonth(), Math.min(d2, 28));
      // ... plus the second-half of this month and the first-half of next.
      // For simplicity, return whichever is closer strictly in the future.
      const candidates: Date[] = [];
      const thisMonth1 = new Date(f.getFullYear(), f.getMonth(), Math.min(d1, 28));
      const thisMonth2 = new Date(f.getFullYear(), f.getMonth(), Math.min(d2, 28));
      const nextMonth1 = new Date(f.getFullYear(), f.getMonth() + 1, Math.min(d1, 28));
      const nextMonth2 = new Date(f.getFullYear(), f.getMonth() + 1, Math.min(d2, 28));
      for (const c of [thisMonth1, thisMonth2, nextMonth1, nextMonth2]) {
        if (c > f) candidates.push(c);
      }
      candidates.sort((a, b) => a.getTime() - b.getTime());
      return candidates[0] ?? addDays(f, 14);
    }
  }
}
