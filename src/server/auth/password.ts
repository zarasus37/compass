/**
 * Password hashing — argon2id.
 *
 * argon2id is the OWASP-recommended password hash: resistant to GPU,
 * ASIC, and side-channel attacks. `@node-rs/argon2` is the actively-
 * maintained native binding (Rust core, Node N-API).
 *
 * Parameters chosen for an interactive login on a small server:
 * memoryCost = 19 MiB, timeCost = 2, parallelism = 1.
 * Bump memoryCost up if you're on a beefier host; lower only if you
 * have a measured reason. Never lower timeCost below 2.
 *
 * Note: we don't pass `algorithm` — the library's default is already
 * Argon2id, and the `Algorithm` enum is a const enum (incompatible
 * with `isolatedModules`).
 */
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hash a plaintext password. Returns the encoded `$argon2id$...$...` string. */
export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

/** Constant-time verify. Returns true on match, false on mismatch or error. */
export async function verifyPassword(
  hashed: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(hashed, plaintext);
  } catch {
    // Corrupt hash, wrong algorithm, etc. — treat as a non-match.
    return false;
  }
}
