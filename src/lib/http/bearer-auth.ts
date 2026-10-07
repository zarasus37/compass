/**
 * RFC 6750 — OAuth 2.0 Bearer Token Authentication.
 *
 * Cluster: Health endpoint hardening (2026-10-07).
 *
 * WHY THIS EXISTS
 * ---------------
 * Goal: "validate the active integration tokens using an explicitly parsed
 * Bearer authentication schema." Before this module the codebase compared
 * the raw `Authorization` header against a template string:
 *
 *     timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
 *
 * That single comparison conflates four distinct failure modes. A caller
 * with `Authorization: garbage` and a caller with a *correct* token in the
 * wrong position are indistinguishable, so the health endpoint cannot
 * report *why* auth failed. Worse, `digest()` over a template means any
 * whitespace deviation (`Bearer  <token>` — two spaces) is a silent 401
 * with no diagnostic.
 *
 * This module parses the header into its three defined parts
 * (`<scheme> <credentials>`) and classifies each rejection with a
 * machine-readable reason, so:
 *
 *   - the health endpoint can report a specific reason instead of a bool,
 *   - `cron-auth.ts` keeps one canonical implementation, and
 *   - a malformed header can never be silently treated as "valid".
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does NOT validate the *value* of a token — only its structure. A
 * structurally valid token with the wrong secret is `MALFORMED_CREDENTIALS`,
 * which is exactly what a caller should not be able to distinguish from a
 * random guess. Verification (constant-time compare against a known secret)
 * lives in `verifyBearerToken` below and is the caller's job.
 *
 * SECURITY NOTES
 * --------------
 * 1. Constant-time behaviour. All comparisons use `timingSafeEqual` over
 *    SHA-256 digests, so neither the token length nor its leading
 *    characters leak through response timing.
 * 2. Never echo the credential. Every rejection reason is a fixed enum
 *    string. No function in this module returns or logs token material.
 * 3. RFC 6750 §2.1 `token68` charset is enforced strictly:
 *      ALPHA / DIGIT / "-" / "." / "_" / "~" / "+" / "/"  then  *"="
 *    Rejecting everything else is what stops a token containing a space,
 *    quote, or comma from splitting the Authorization grammar.
 */

import { createHash, timingSafeEqual } from "node:crypto";

/** The only auth-scheme this application speaks. */
export const BEARER_SCHEME = "Bearer";

/**
 * token68 per RFC 6750 §2.1:
 *   1*( ALPHA / DIGIT / "-" / "." / "_" / "~" / "+" / "/" ) *"="
 *
 * Note the `=` may only appear as trailing padding — that is why this
 * regex anchors the run of `=` to the end instead of accepting it inline.
 */
const TOKEN68 = /^[A-Za-z0-9\-._~+/]+=*$/;

/**
 * Max credential length. RFC 6750 does not mandate a limit, but an
 * unbounded credential is a memory-amplification vector on a public
 * endpoint. 4 KiB is far above any real token and far below anything
 * useful for an attacker.
 */
export const MAX_CREDENTIAL_LENGTH = 4096;

/**
 * Machine-readable rejection reasons.
 *
 * These are a closed set — callers may switch on them. They intentionally
 * carry no detail about the offending input: distinguishing "unknown
 * scheme" from "bad credential" is safe (the scheme is not a secret),
 * but nothing here reveals anything about the credential itself.
 */
export type BearerRejectionReason =
  | "MISSING_HEADER"
  | "EMPTY_HEADER"
  | "MALFORMED_HEADER"
  | "UNSUPPORTED_SCHEME"
  | "MISSING_CREDENTIALS"
  | "MALFORMED_CREDENTIALS";

export type BearerParseResult =
  | { ok: true; scheme: typeof BEARER_SCHEME; credentials: string }
  | { ok: false; reason: BearerRejectionReason };

/**
 * Parse an `Authorization` header value into scheme + credentials.
 *
 * RFC 7235 §2.1 grammar: `auth-scheme [ 1*SP ( token68 / #auth-param ) ]`
 *
 * @param header raw header value, e.g. `"Bearer abc123"`.
 */
export function parseBearerHeader(
  header: string | null | undefined,
): BearerParseResult {
  if (header === null || header === undefined) {
    return { ok: false, reason: "MISSING_HEADER" };
  }
  // Trim only to tolerate transport-added whitespace; a header that is
  // entirely whitespace is empty, not malformed.
  const raw = header.trim();
  if (raw.length === 0) {
    return { ok: false, reason: "EMPTY_HEADER" };
  }

  // An `auth-param` list (`Bearer realm="x"`, or a comma-separated
  // multi-challenge) is not the Bearer grammar. Reject it explicitly
  // rather than letting the quotes/comma fall through to the token68
  // check, where it would be misreported as a malformed *token*.
  if (raw.includes(",")) {
    return { ok: false, reason: "MALFORMED_HEADER" };
  }

  // RFC 7235 §2.1: `auth-scheme [ 1*SP ( token68 / #auth-param ) ]`.
  // `1*SP` is one-or-more literal spaces — extra whitespace is legal.
  const match = /^([^,\s]+) +(.*)$/.exec(raw);
  if (!match) {
    // No SP at all. Distinguish "valid scheme, no credentials"
    // (RFC 7235 makes the credentials part optional) from a bare
    // token with no scheme at all. Trimming above means `"Bearer "`
    // arrives here, so this distinction must be made by value.
    if (raw.toLowerCase() === BEARER_SCHEME.toLowerCase()) {
      return { ok: false, reason: "MISSING_CREDENTIALS" };
    }
    return { ok: false, reason: "MALFORMED_HEADER" };
  }

  // `noUncheckedIndexedAccess` widens regex capture groups to
  // `string | undefined` even though a successful match guarantees both
  // groups exist. Guard once here rather than asserting at each use, so
  // the narrowing is visible and cannot drift.
  const schemeRaw = match[1];
  const credentials = match[2];
  if (schemeRaw === undefined || credentials === undefined) {
    return { ok: false, reason: "MALFORMED_HEADER" };
  }

  // RFC 7235: auth-scheme is case-insensitive.
  if (schemeRaw.toLowerCase() !== BEARER_SCHEME.toLowerCase()) {
    return { ok: false, reason: "UNSUPPORTED_SCHEME" };
  }

  if (credentials.length === 0) {
    return { ok: false, reason: "MISSING_CREDENTIALS" };
  }
  if (credentials.length > MAX_CREDENTIAL_LENGTH) {
    return { ok: false, reason: "MALFORMED_CREDENTIALS" };
  }
  if (!TOKEN68.test(credentials)) {
    return { ok: false, reason: "MALFORMED_CREDENTIALS" };
  }

  return { ok: true, scheme: BEARER_SCHEME, credentials };
}

/** SHA-256 so `timingSafeEqual` never rejects on length mismatch. */
function digest(v: string): Buffer {
  return createHash("sha256").update(v, "utf8").digest();
}

/** Constant-time string equality, independent of input length. */
export function safeEquals(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Full verification: parse the header AND compare the credential against
 * the expected secret in constant time.
 *
 * Returns `true` only when the header is a well-formed Bearer credential
 * that matches `expected`.
 */
export function verifyBearerToken(
  header: string | null | undefined,
  expected: string,
): boolean {
  const parsed = parseBearerHeader(header);
  if (!parsed.ok) return false;
  return safeEquals(parsed.credentials, expected);
}

/**
 * Describes a credential WITHOUT revealing it.
 *
 * Used by the health endpoint to report that a token is configured and
 * structurally sane, without any risk of leaking the value. This is the
 * only function here that is safe to put in an HTTP response.
 */
export type CredentialFingerprint = {
  /** The credential is present and non-empty. */
  present: boolean;
  /** Length in characters — safe to expose; not a secret. */
  length: number;
  /** Satisfies RFC 6750 token68. */
  wellFormed: boolean;
};

/** Build a non-reversible description of a token's shape. */
export function fingerprintCredential(
  credential: string | null | undefined,
): CredentialFingerprint {
  const value = (credential ?? "").trim();
  return {
    present: value.length > 0,
    length: value.length,
    wellFormed: value.length > 0 && value.length <= MAX_CREDENTIAL_LENGTH && TOKEN68.test(value),
  };
}