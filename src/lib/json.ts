/**
 * JSON helpers — the User.settings field is a TEXT column on SQLite, so we
 * serialize/parse on the app boundary. Keep this as the single source of truth
 * for that contract. If we ever migrate to Postgres, the only change is the
 * column type; the helpers stay the same.
 */
import { z } from "zod";

/** Safely parse a JSON string. Returns the fallback if the input is invalid. */
export function safeParseJson<T>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Stringify a value to JSON for storage. */
export function toJsonString(value: unknown): string {
  return JSON.stringify(value);
}

/** User settings — extend this schema as the app grows. */
export const UserSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  currency: z.string().length(3).default("USD"),
  locale: z.string().default("en-US"),
  /**
   * Set by `scripts/clear-demo-data.mjs`.
   *
   * The lazy seeders (`ensureUserEnvelopesSeeded`,
   * `ensureUserAccountsSeeded`) guard on "is the list empty?", which
   * cannot distinguish a brand-new user who needs the starter vessels
   * from a user who deliberately emptied their account. Without this
   * flag a cleared account gets the canonical demo persona's balances
   * back on the very next page load — measured: 0 envelopes / 0
   * accounts straight after a clear, 7 envelopes / Rent $800.00 after
   * one read.
   */
  demoDataCleared: z.boolean().default(false),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Has this user deliberately had the demo persona removed?
 *
 * Set by `scripts/clear-demo-data.mjs`. The lazy seeders check it so a
 * cleared account is not silently repopulated with the demo balances
 * on its next read — a row count alone cannot express "I emptied this
 * on purpose" as distinct from "I have never set this up".
 *
 * Lives here next to the schema so the flag has exactly one
 * definition. A missing/invalid settings blob is not an error: it
 * means "never cleared", which is the original behaviour.
 */
export function isDemoCleared(settings: string | null | undefined): boolean {
  return safeParseJson<Partial<UserSettings>>(settings, {}).demoDataCleared === true;
}
