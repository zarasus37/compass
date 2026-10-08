-- Tenant scoping for pay periods and engine preferences (Cluster 7.32c).
--
-- WHY
-- ---
-- Public multi-user registration landed in 54a7b83, but the financial
-- state it sits on top of is still global:
--
--   * PayPeriod had no owner. getCurrentPayPeriod() did
--     `findFirst({ where: { isActive: true } })` and rollForward() took
--     the newest active PaySchedule from ANY user. Two people on
--     different pay cycles fought over one shared window.
--   * The engine level lived on the single global SystemSettings row,
--     so one user's toggle changed every other user's.
--
-- WHAT
-- ---
--  1. PayPeriod gains a nullable userId + FK.
--  2. A partial unique index enforces "at most one ACTIVE period per
--     user" — Prisma cannot express `WHERE isActive`.
--  3. User gains activeEngineLvl, backfilled from the global row.
--  4. Legacy NULL-owner PayPeriod rows are claimed by the owner of the
--     earliest active PaySchedule.
--
-- SAFETY ON EXISTING DATABASES
-- ------------------------------
-- Every statement is idempotent (IF NOT EXISTS / guarded DO blocks), so
-- this is safe on a database that already has these columns — the same
-- discipline as the 20261008120000 baseline.
--
-- `userId` is deliberately NULLABLE. The pre-existing rows were global
-- and have no owner derivable from a column. They are backfilled to the
-- owner of the earliest active PaySchedule, which is exact in the
-- single-user case and harmless otherwise: the scoped reader filters on
-- userId, so a row left NULL simply stops being visible and each user
-- materialises their own period. Nothing is deleted.
--
-- The backfill deliberately does NOT make userId NOT NULL. Doing so
-- would fail on any database where no PaySchedule exists, turning a
-- safe additive migration into a deploy-time outage.

-- 1. PayPeriod.userId -----------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'PayPeriod'
           AND column_name = 'userId'
    ) THEN
        ALTER TABLE "PayPeriod" ADD COLUMN "userId" TEXT;
    END IF;
END
$$;

-- 2. User.activeEngineLvl -------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'User'
           AND column_name = 'activeEngineLvl'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "activeEngineLvl" TEXT NOT NULL DEFAULT 'L1';
    END IF;
END
$$;

-- 3. Backfill PayPeriod owners -------------------------------------------
-- Each unowned (NULL) period goes to the owner of the earliest active
-- PaySchedule. Deterministic: ties break on the schedule's createdAt,
-- then its id, so repeated runs never disagree.
UPDATE "PayPeriod" pp
   SET "userId" = owner."userId"
  FROM (
        SELECT DISTINCT ON (ps."userId") ps."userId"
          FROM "PaySchedule" ps
         WHERE ps."isActive" = true
         ORDER BY ps."userId", ps."createdAt" ASC, ps.id ASC
       ) owner
 WHERE pp."userId" IS NULL;

-- 4. Backfill engine preference ------------------------------------------
-- Preserve whatever the global row currently says (mom may already be on
-- L2). Left NULL-safe: if GLOBAL_CONFIG is absent, every user keeps 'L1'.
UPDATE "User" u
   SET "activeEngineLvl" = COALESCE(
         (SELECT s."activeEngineLvl" FROM "SystemSettings" s WHERE s.id = 'GLOBAL_CONFIG'),
         'L1'
       );

-- 5. Foreign key ----------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'PayPeriod_userId_fkey'
           AND conrelid = 'public."PayPeriod"'::regclass
    ) THEN
        ALTER TABLE "PayPeriod"
            ADD CONSTRAINT "PayPeriod_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- 6. Indexes --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "PayPeriod_userId_isActive_idx"
    ON "PayPeriod"("userId", "isActive");

-- At most one ACTIVE period per user. Partial, so the legacy NULL-owner
-- rows (which are inactive from the scoped reader's point of view) do
-- not collide with each other, and so several NULL rows may coexist
-- during the transition.
CREATE UNIQUE INDEX IF NOT EXISTS "PayPeriod_one_active_per_user_key"
    ON "PayPeriod"("userId")
    WHERE "isActive" = true AND "userId" IS NOT NULL;