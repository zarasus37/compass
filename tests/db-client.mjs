/**
 * Shared Prisma client for smoke tests.
 *
 * Cluster: Production deploy prep (2026-08-28) — Postgres-everywhere.
 * The dev server uses `src/server/db.ts` (Next.js / Edge-incompatible);
 * the smoke tests run as plain Node ESM scripts, so they need their
 * own client. Centralizing it here means the smoke suite picks up
 * adapter changes (e.g. SQLite → Postgres) in one place instead of
 * editing every test file.
 *
 * The connection string is read from `DATABASE_URL` (loaded by
 * `node -r dotenv/config` when the smoke is invoked) and falls back
 * to the local Docker compose dev URL. The Prisma 7 driver adapter
 * is `@prisma/adapter-pg` (over the `pg` package) for the Postgres
 * path; the previous SQLite path used `@prisma/adapter-better-sqlite3`
 * and is no longer referenced.
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

const require = createRequire(import.meta.url);

// Load .env.local first, then .env. The dev server relies on this
// same precedence (Next.js does it for us at runtime). For smokes
// we do it explicitly so `DATABASE_URL` is set before the adapter
// is constructed.
loadEnv({ path: join(process.cwd(), ".env.local") });
loadEnv({ path: join(process.cwd(), ".env") });

const generated = require(
  join(process.cwd(), "src/generated/prisma/client"),
);
const { PrismaClient } = generated;
const { PrismaPg } = require(
  join(process.cwd(), "node_modules/@prisma/adapter-pg"),
);

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://compass:compass@localhost:5433/compass_dev";

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
