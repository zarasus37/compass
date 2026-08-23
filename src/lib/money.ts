/**
 * Money utilities.
 *
 * The spec is hard: every monetary value in the database is integer cents.
 * No floats. Display is the only place we divide by 100.
 *
 * Use these helpers everywhere you touch money — they centralize the
 * formatting and prevent the kind of ad-hoc `.toFixed(2)` that drifts.
 */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format integer cents → "$1,234.56". */
export function formatMoney(cents: number): string {
  return USD.format(cents / 100);
}

/** Format integer cents → compact form, e.g. "$1.2K" for big numbers. */
export function formatMoneyCompact(cents: number): string {
  return USD_COMPACT.format(cents / 100);
}

/** Format integer cents → plain decimal string for inputs, e.g. "1234.56". */
export function formatMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Parse a user-entered money string ("12.34" or "$12.34") → integer cents. */
export function parseMoneyToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** Format a signed cents value, e.g. "+$80.00" or "−$212.00". */
export function formatMoneySigned(cents: number): string {
  if (cents === 0) return formatMoney(0);
  const abs = Math.abs(cents);
  return cents > 0 ? `+${formatMoney(abs)}` : `−${formatMoney(abs)}`;
}
