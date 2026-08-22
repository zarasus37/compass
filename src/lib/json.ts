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
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;
