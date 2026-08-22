import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

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
 * **Path resolution gotcha**: Prisma's CLI resolves `file:./dev.db` in
 * DATABASE_URL *relative to the prisma.config.ts location* (the project
 * root) — NOT relative to the schema file. The better-sqlite3 driver
 * adapter treats paths as cwd-relative too. As long as both run from
 * the project root, they agree. We just use `dev.db` directly.
 *
 * Next.js dev mode hot-reloads modules, which can create many PrismaClient
 * instances. Stash one on globalThis in dev so the connection pool stays sane.
 * In production we create a fresh client per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function dbFilePath(): string {
  return path.resolve(process.cwd(), "dev.db");
}

function buildClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: dbFilePath() });
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
