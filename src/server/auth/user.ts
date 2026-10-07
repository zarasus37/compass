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

/** Outcome of a registration attempt. */
export type CreateUserResult =
  | { ok: true; user: SafeUser }
  | { ok: false; reason: "email_taken" };

/**
 * Register a user. Any number of accounts may exist.
 *
 * Cluster 7.32b — this replaces `createFirstUser`, which refused to
 * create a user once *any* user existed. Signup is now public, so the
 * duplicate-email check is the only gate.
 *
 * Race safety: the pre-check is advisory only. Two concurrent requests
 * for the same address can both pass it, so the unique index on
 * `User.email` is the real gate — we catch P2002 and map it to
 * `email_taken` rather than letting a raw Prisma error surface. This is
 * the same reason the old `countUsers()` guard existed, but scoped to
 * the identity that actually collides instead of the whole table.
 */
export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<CreateUserResult> {
  const email = params.email.toLowerCase();
  try {
    return await prisma.$transaction(async (tx) => {
      // Fast path: reject the common duplicate case without relying on
      // the error path, so the user gets a clean field error.
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) return { ok: false, reason: "email_taken" };

      const user = await tx.user.create({
        data: {
          name: params.name,
          email,
          passwordHash: params.passwordHash,
        },
      });
      return { ok: true, user: toSafeUser(user) };
    });
  } catch (err) {
    // Unique-constraint violation on User.email — the two requests
    // raced past the pre-check above. Treat it exactly like the
    // slow path so the caller cannot distinguish the two.
    if (isUniqueViolation(err)) return { ok: false, reason: "email_taken" };
    throw err;
  }
}

/** Prisma error code for a unique-constraint violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export type { CreatedSession };
