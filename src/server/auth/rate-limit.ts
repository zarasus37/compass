/**
 * Login throttling — DB-backed so it works on serverless (Vercel), where
 * in-memory counters reset on every cold start.
 *
 * Policy (rolling window, failures only):
 *   - per account (submitted email, whether or not it exists): 10 / 15 min
 *   - per client IP:                                           20 / 15 min
 * A successful login clears that account's counter.
 *
 * Tradeoff: an attacker who knows the victim's email can lock the account out
 * for up to 15 minutes. That is deliberately short, and the per-account cap is
 * loose enough (10) that a typo-prone user is not locked out by accident. Argon2
 * (~19 MiB, t=2) keeps the guess rate low even inside the cap.
 */
import { prisma } from "@/server/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 10;
const MAX_PER_IP = 20;

const emailKey = (email: string) => `email:${email.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

export interface LoginGate {
  allowed: boolean;
  /** Seconds until the oldest counted failure ages out (when blocked). */
  retryAfterSec: number;
}

async function countSince(key: string, since: Date) {
  return prisma.loginAttempt.count({ where: { key, createdAt: { gte: since } } });
}

/** Check BEFORE verifying the password. Never throws: fails open on DB error. */
export async function checkLoginAllowed(
  email: string,
  ip: string | null,
): Promise<LoginGate> {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const [acct, byIp] = await Promise.all([
      countSince(emailKey(email), since),
      ip ? countSince(ipKey(ip), since) : Promise.resolve(0),
    ]);
    if (acct >= MAX_PER_ACCOUNT || byIp >= MAX_PER_IP) {
      const key = acct >= MAX_PER_ACCOUNT ? emailKey(email) : ipKey(ip!);
      const oldest = await prisma.loginAttempt.findFirst({
        where: { key, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      const freeAt = (oldest?.createdAt.getTime() ?? Date.now()) + WINDOW_MS;
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((freeAt - Date.now()) / 1000)),
      };
    }
  } catch (err) {
    console.error("[auth] rate-limit check failed (failing open):", err);
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Record a failed attempt (call for unknown emails too, to avoid an oracle). */
export async function recordLoginFailure(email: string, ip: string | null) {
  try {
    const data = [{ key: emailKey(email) }, ...(ip ? [{ key: ipKey(ip) }] : [])];
    await prisma.loginAttempt.createMany({ data });
    // Opportunistic pruning (~2% of failures) keeps the table small.
    if (Math.random() < 0.02) {
      await prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
    }
  } catch (err) {
    console.error("[auth] could not record login failure:", err);
  }
}

/** Clear the account counter after a successful login. */
export async function clearLoginFailures(email: string) {
  try {
    await prisma.loginAttempt.deleteMany({ where: { key: emailKey(email) } });
  } catch {
    /* non-fatal */
  }
}
