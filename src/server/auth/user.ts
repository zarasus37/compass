/**
 * Server-side user / session helpers. Use these from server components,
 * server actions, and route handlers. They are NOT safe to import from
 * the Edge runtime (Prisma requires Node) — keep them out of middleware.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import {
  readSessionCookie,
  resolveSession,
  type CreatedSession,
} from "./session";

/** Public user shape — never include the password hash. */
export type SafeUser = {
  id: string;
  name: string;
  email: string;
  aiTier: number;
  routingLevel: number;
  defaultViewId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSafeUser(u: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  aiTier: number;
  routingLevel: number;
  defaultViewId: string | null;
  settings: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    aiTier: u.aiTier,
    routingLevel: u.routingLevel,
    defaultViewId: u.defaultViewId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * Get the current user from the session cookie. Returns `null` when no
 * valid session exists. `cache()` dedupes per-request so multiple server
 * components on the same page only hit the DB once.
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const token = await readSessionCookie();
  if (!token) return null;

  const resolved = await resolveSession(token);
  if (!resolved) return null;

  const user = await prisma.user.findUnique({
    where: { id: resolved.userId },
  });
  return user ? toSafeUser(user) : null;
});

/**
 * Like `getCurrentUser`, but redirects to /login when no valid session
 * exists. Use this at the top of any server component that requires auth.
 */
export async function requireUser(redirectTo = "/login"): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

/** Count total users. Used to gate the /welcome (signup) page. */
export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

/** Look up a user by email. Used by login + signup. */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

/** Create the first user. Throws if any user already exists. */
export async function createFirstUser(params: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<SafeUser> {
  // Transactional: count + create. Prevents a race where two signups
  // both see "no users" and both succeed.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.count();
    if (existing > 0) {
      throw new Error("A user already exists. Signup is closed.");
    }
    const user = await tx.user.create({
      data: {
        name: params.name,
        email: params.email.toLowerCase(),
        passwordHash: params.passwordHash,
      },
    });
    return toSafeUser(user);
  });
}

export type { CreatedSession };
