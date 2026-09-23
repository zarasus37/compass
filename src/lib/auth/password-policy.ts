/**
 * password-policy — shared password strength rules.
 *
 * Cluster 7.32a. Extracted from scripts/seed-admin.mjs so the same
 * rules are enforced whether the password is set:
 *   - via /signup (WebForm → signupAction)
 *   - via the operator CLI (scripts/seed-admin.mjs)
 *   - via the operator CLI test account scaffold
 *     (scripts/spawn-test-account.mjs)
 *
 * Single source of truth. To change the rule, edit here and both
 * surfaces update.
 *
 * The strict-mode threshold (12+ chars, dev minimum 8) protects
 * mom-launch from obviously-weak passwords without making the form
 * so strict that mom can't remember her own password.
 *
 * For multi-user launch (Cluster 7.32c), we'll layer in:
 *   - common-password dictionary check (top 1M most-common list)
 *   - breached-password check (haveibeenpwned-style k-anonymity API)
 *   - entropy floor (estimated via zxcvbn)
 * For now, the simpler rules are enough for mom + a single operator.
 */

const PRODUCTION_MIN_LENGTH = 12;
const DEV_MIN_LENGTH = 8;

/**
 * Common weak prefixes / patterns we always refuse regardless of length.
 * Sourced from public-password-intel patterns + project-specific names.
 *
 * Case-insensitive match against the lowercase password.
 */
const WEAK_PATTERNS: RegExp[] = [
  /^password/i,
  /^mom\d*$/i,
  /^admin\d*$/i,
  /^compass\d*$/i,
  /^12345/,
  /^qwerty/i,
  /^letmein/i,
  /^master/i,
  /^welcome/i,
  /^user\d*$/i,
  /^test\d*$/i,
  /^abc123/i,
  /^iloveyou/i,
];

/**
 * Returns a string reason if the password fails policy, or `null` if it passes.
 *
 * Mode:
 *   - `production`: 12+ chars, no WEAK_PATTERNS, no email-local-part echo
 *   - `development`: 8+ chars, no WEAK_PATTERNS, no email-local-part echo
 *
 * The email-local-part check is paranoid-tier but cheap; we never want
 * `email=user@example.com` + `password=user` to pass.
 */
export function isWeakPassword(
  password: string,
  mode: "production" | "development" = "development",
  email?: string,
): string | null {
  if (typeof password !== "string") return "password is not a string";
  const minLength =
    mode === "production" ? PRODUCTION_MIN_LENGTH : DEV_MIN_LENGTH;
  if (password.length < minLength) {
    return `shorter than ${minLength} chars`;
  }
  for (const pat of WEAK_PATTERNS) {
    if (pat.test(password)) return `matches weak pattern ${pat}`;
  }
  if (email) {
    const local = email.toLowerCase().split("@")[0] ?? "";
    if (local.length >= 4 && password.toLowerCase().includes(local)) {
      return "password contains the email local-part";
    }
  }
  return null;
}

/**
 * Throws if the password is weak; otherwise returns void.
 * Call from server actions and scripts so they fail fast with a
 * single helper.
 */
export function assertPasswordOk(
  password: string,
  mode: "production" | "development",
  email?: string,
): void {
  const why = isWeakPassword(password, mode, email);
  if (why) {
    throw new Error(
      `password rejected: ${why}. ` +
        `Generate a strong random one with: ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
    );
  }
}

export const __test__ = {
  WEAK_PATTERNS,
  PRODUCTION_MIN_LENGTH,
  DEV_MIN_LENGTH,
};
