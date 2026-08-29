import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires a driver adapter — the old `new PrismaClient()` with a
 * datasource URL no longer connects. Production deploy prep cluster
 * (2026-08-28) switched us from SQLite (better-sqlite3) to Postgres
 * (`@prisma/adapter-pg` over `pg`) so dev and prod share the same
 * schema, the same migrations, and the same query semantics. The
 * connection URL comes from `DATABASE_URL` (loaded by prisma.config.ts
 * via `dotenv/config`).
 *
 * The generated client lives at `src/generated/prisma` (per the `output`
 * setting in prisma/schema.prisma) so pnpm + TypeScript can resolve it
 * through our `@/*` path alias.
 *
 * Next.js dev mode hot-reloads modules, which can create many PrismaClient
 * instances. Stash one on globalThis in dev so the connection pool stays sane.
 * In production we create a fresh client per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Check .env / .env.local and ensure " +
        "prisma.config.ts is loading the env (it imports dotenv/config).",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
