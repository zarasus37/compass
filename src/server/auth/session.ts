/**
 * Session management — server-side, DB-backed, cookie-token-based.
 *
 * Cookie holds a **random opaque token** (not the session id). We store
 * `sha256(token)` in the DB. A DB leak therefore does not let an attacker
 * forge or hijack sessions — they'd need the raw token, which is only
 * ever in the cookie.
 *
 * The cookie is httpOnly + sameSite=lax + secure (in prod). The session
 * row carries a fixed `expiresAt` (v1 = no sliding window; "log out
 * everywhere" is a single `deleteMany` per user).
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { config } from "@/lib/config";

export const SESSION_COOKIE = "compass_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  // 32 bytes → 256 bits of entropy, base64url-encoded for the cookie.
  return randomBytes(32).toString("base64url");
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

/** Create a new session for a user, return the raw token to set in the cookie. */
export async function createSession(params: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<CreatedSession> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/** Resolve a token to a userId, if the session is valid and unexpired. */
export async function resolveSession(
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Expired — clean up and reject.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Touch lastSeenAt (fire-and-forget; not on the auth path).
  prisma.session
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
  return { userId: session.userId, sessionId: session.id };
}

/** Destroy the session for a given token. Idempotent. */
export async function destroySession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session
    .delete({ where: { tokenHash } })
    .catch(() => undefined);
}

/** Destroy every session for a user. ("Log out everywhere.") */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Set the session cookie. Use inside a Server Action or Route Handler —
 * not from a Server Component (Next.js forbids cookie writes there).
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Read the session cookie, if any. */
export async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/** Clear the session cookie. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

/** Constant-time string compare. Defensive — currently unused, kept handy. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
