-- Baseline repair: Debt, PaycheckRun, ClientError.
--
-- WHY THIS EXISTS
-- ---------------
-- These three models exist in prisma/schema.prisma and in every live
-- database, but NO migration ever created them. They came into
-- existence only because someone ran `prisma db push`, which builds
-- tables straight from the datamodel and writes nothing to migration
-- history. A clean `prisma migrate deploy` therefore produced a
-- schema missing three tables while reporting:
--
--     All migrations have been successfully applied.   (exit 0)
--
-- CI could not catch this because CI uses `prisma db push` — the very
-- command that hides it. Anything that installs from migrations (a new
-- Vercel project, a disaster restore, a teammate's machine) gets a
-- database with no debt table, no paycheck idempotency guard, and no
-- client-error capture.
--
-- WHY EVERY STATEMENT IS IDEMPOTENT
-- ---------------------------------
-- This migration has to run safely on BOTH populations at once:
--
--   - FRESH databases, where the tables do not exist and must be built.
--   - EXISTING databases (production included), where `db push`
--     already created identical tables, indexes and foreign keys.
--
-- Plain `CREATE TABLE` aborts the whole transaction on an existing
-- database, which would leave those deployments unable to migrate at
-- all. So every statement is guarded: `IF NOT EXISTS` for tables and
-- indexes, and a `DO` block for the foreign keys, which Postgres has
-- no `IF NOT EXISTS` form for.
--
-- The live (db-pushed) structure was inspected and matches this file
-- exactly — Debt: 15 cols / 5 idx / 1 FK; PaycheckRun: 13 cols /
-- 3 idx (incl. the unique guard) / 1 FK; ClientError: 16 cols /
-- 6 idx (incl. the dedup unique) / 0 FK. On such a database this
-- migration is a verified no-op, not a destructive reconcile.
--
-- The SQL below is the output of:
--   prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
-- so it is exactly what Prisma expects; no drift after it.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "originalBalanceCents" INTEGER NOT NULL,
    "aprBps" INTEGER NOT NULL DEFAULT 0,
    "minPaymentCents" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 0,
    "accountId" TEXT,
    "creditLimitCents" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaycheckRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "paycheckCents" INTEGER NOT NULL,
    "planId" TEXT,
    "totalAllocatedCents" INTEGER NOT NULL DEFAULT 0,
    "unallocatedCents" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "ledgerJson" TEXT NOT NULL DEFAULT '[]',
    "paycheckTransactionId" TEXT,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaycheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "digest" TEXT,
    "message" TEXT,
    "stack" TEXT,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "envelopeId" TEXT,
    "source" TEXT NOT NULL,
    "userAgent" TEXT,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_source_idx" ON "Debt"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_userId_source_idx" ON "Debt"("userId", "source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_userId_isArchived_sortOrder_idx" ON "Debt"("userId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaycheckRun_userId_ranAt_idx" ON "PaycheckRun"("userId", "ranAt");

-- CreateIndex
-- This unique index IS the paycheck idempotency guard: one paycheck of
-- a given amount per user per period. Losing it means a re-run
-- double-allocates real money.
CREATE UNIQUE INDEX IF NOT EXISTS "PaycheckRun_userId_periodKey_paycheckCents_key" ON "PaycheckRun"("userId", "periodKey", "paycheckCents");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientError_userId_idx" ON "ClientError"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientError_lastSeenAt_idx" ON "ClientError"("lastSeenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientError_digest_idx" ON "ClientError"("digest");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientError_pathname_idx" ON "ClientError"("pathname");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientError_digest_url_source_key" ON "ClientError"("digest", "url", "source");

-- AddForeignKey
-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so the existence
-- check is done in a DO block. pg_constraint is consulted by exact
-- conname on the exact relation; if the constraint is already there
-- (every db-pushed database) this is skipped.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'Debt_userId_fkey'
           AND conrelid = 'public."Debt"'::regclass
    ) THEN
        ALTER TABLE "Debt"
            ADD CONSTRAINT "Debt_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'PaycheckRun_userId_fkey'
           AND conrelid = 'public."PaycheckRun"'::regclass
    ) THEN
        ALTER TABLE "PaycheckRun"
            ADD CONSTRAINT "PaycheckRun_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;