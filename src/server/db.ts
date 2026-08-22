import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { config } from "@/lib/config";

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires a driver adapter — the old `new PrismaClient()` with a
 * datasource URL no longer connects. We use the better-sqlite3 adapter
 * for SQLite (file-based, synchronous, fast). Postgres migration in the
 * future is a one-line swap to `@prisma/adapter-pg`.
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
  const url = config.database.url;
  // Strip the `file:` prefix that Prisma's URL convention uses.
  const filename = url.startsWith("file:") ? url.slice("file:".length) : url;
  const adapter = new PrismaBetterSqlite3({ url: filename });
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
