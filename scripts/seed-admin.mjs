#!/usr/bin/env node
/**
 * seed-admin — create the mom-ready user from env vars.
 *
 * Cluster 7.16. Idempotent: re-runs on every prod deploy, only creates
 * the user if no row exists for ADMIN_EMAIL. Safe to call against a
 * fresh DB (after `prisma migrate deploy`) or a populated DB.
 *
 * This script creates the USER only. Demo data (envelopes, bills,
 * goals, allocation plan, accounts) is populated two ways:
 *   1. The in-app onboarding chat agent walks mom through setup on
 *      her first visit (smoke-onboarding-agent is green at 108 checks).
 *   2. The `/api/reset-seed` admin endpoint re-seeds the canonical
 *      demo data — accessible via the "Reset to seed" button in
 *      /settings, or POSTable directly.
 *
 * Required env:
 *   - DATABASE_URL          (Postgres pooled connection string)
 *   - ADMIN_EMAIL           (e.g. mom@example.com)
 *   - ADMIN_NAME            (display name; e.g. "Mom")
 *   - ADMIN_PASSWORD        (>= 16 chars in prod; 8+ in dev)
 *
 * Optional:
 *   - ADMIN_ALLOW_OVERWRITE=1  re-create the user even if the row exists
 *                              (only for re-seeding; default off)
 *   - ADMIN_DRY_RUN=1          print the would-be user + exit 0
 *
 * Safety:
 *   - In production (NODE_ENV=production), refuses to run if
 *     ADMIN_PASSWORD is shorter than 16 chars or matches common weak
 *     patterns (e.g. "password", "mom12345", the ADMIN_EMAIL itself).
 *   - The DB write is wrapped in a transaction so a partial failure
 *     leaves the database in a clean state.
 *
 * Usage:
 *   pnpm seed:admin
 *   DATABASE_URL=... ADMIN_EMAIL=mom@example.com ADMIN_NAME=Mom \
 *     ADMIN_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))") \
 *     pnpm seed:admin
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const WEAK_PATTERNS = [
  /^password/i,
  /^mom\d*$/i,
  /^admin\d*$/i,
  /^compass\d*$/i,
  /^12345/,
  /^qwerty/i,
  /^letmein/i,
];

function fail(msg, code = 1) {
  console.error(`[seed-admin] ${msg}`);
  process.exit(code);
}

function isWeak(p) {
  if (p.length < 16) return "shorter than 16 chars";
  for (const pat of WEAK_PATTERNS) if (pat.test(p)) return `matches weak pattern ${pat}`;
  return null;
}

async function main() {
  const {
    DATABASE_URL,
    ADMIN_EMAIL,
    ADMIN_NAME,
    ADMIN_PASSWORD,
    NODE_ENV,
    ADMIN_ALLOW_OVERWRITE,
    ADMIN_DRY_RUN,
  } = process.env;

  if (!DATABASE_URL) fail("DATABASE_URL is not set.");
  if (!ADMIN_EMAIL) fail("ADMIN_EMAIL is not set.");
  if (!ADMIN_NAME) fail("ADMIN_NAME is not set.");
  if (!ADMIN_PASSWORD) fail("ADMIN_PASSWORD is not set.");

  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`ADMIN_EMAIL is not a valid email: ${ADMIN_EMAIL}`);
  }

  if (NODE_ENV === "production") {
    const weak = isWeak(ADMIN_PASSWORD);
    if (weak) {
      fail(
        `ADMIN_PASSWORD is too weak for production: ${weak}. ` +
          `Generate a 32-byte random one with: ` +
          `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
      );
    }
    if (ADMIN_PASSWORD.toLowerCase().includes(email.split("@")[0])) {
      fail(`ADMIN_PASSWORD contains the email local-part. Use a random one.`);
    }
  } else if (ADMIN_PASSWORD.length < 8) {
    fail(`ADMIN_PASSWORD is shorter than 8 chars (dev minimum).`);
  }

  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (ADMIN_DRY_RUN === "1") {
      console.log(JSON.stringify({
        mode: "dry-run",
        wouldCreate: !existing,
        existingUser: existing ? { id: existing.id, email: existing.email, name: existing.name } : null,
        target: { email, name: ADMIN_NAME },
      }, null, 2));
      return;
    }

    let created;

    if (existing) {
      if (ADMIN_ALLOW_OVERWRITE !== "1") {
        // Don't overwrite password, but keep going to seed a
        // FinancialIdentity (dev only) so smokes aren't redirected
        // to /onboarding.
        console.log(`[seed-admin] user ${email} already exists (id=${existing.id}).`);
        created = existing;
      } else {
        console.log(`[seed-admin] user ${email} exists; overwriting password (ADMIN_ALLOW_OVERWRITE=1).`);
        const passwordHash = await hash(ADMIN_PASSWORD, ARGON2_OPTIONS);
        const updated = await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data: { name: ADMIN_NAME, passwordHash },
          });
          // Invalidate sessions on overwrite so the new password takes effect.
          await tx.session.deleteMany({ where: { userId: existing.id } });
          return tx.user.findUniqueOrThrow({ where: { id: existing.id } });
        });
        console.log(`[seed-admin] updated ${email}; sessions invalidated.`);
        created = updated;
      }
    } else {
      const passwordHash = await hash(ADMIN_PASSWORD, ARGON2_OPTIONS);
      created = await prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email,
            name: ADMIN_NAME,
            passwordHash,
          },
        });
      });
      console.log(`[seed-admin] created user ${email} (id=${created.id})`);
    }

    // In dev only, pre-seed a completed FinancialIdentity so smoke
    // suites (which expect a logged-in user who can reach /vault)
    // don't get redirected to /onboarding. Production users go
    // through the chat. Mirrors the dev-mode branch in
    // src/app/(auth)/actions.ts:signupAction.
    if (process.env.NODE_ENV !== "production") {
      const identity = await prisma.financialIdentity.upsert({
        where: { userId: created.id },
        create: {
          userId: created.id,
          ageRange: "55_64",
          employmentStatus: "employed_full_time",
          location: "Texas",
          timeHorizonYears: 35,
          riskTolerance: "moderate",
          riskNotes: "Seed identity (dev-only seed-admin shortcut).",
          aiTierPref: "assistive",
          riskComfort: "moderate",
          currency: "USD",
          auditIdentity: "30-year-old with a $300K mortgage, $1,820 biweekly take-home.",
          auditFindings: "\n- Housing is 50% of take-home.\n- 35-year horizon at moderate risk.",
          auditPlan: "\n- Auto-allocate $432/check to the Emergency Fund.",
          auditFirstStep: "Set the auto-allocate plan to $432/check into Emergency Fund.",
          auditTeaching: "Compass treats your savings envelope as a hard cap.",
          auditBuiltAt: new Date(),
          completedAt: new Date(),
          lastProvider: "mock",
          lastFellBack: false,
          lastErrorMessage: null,
        },
        update: { completedAt: new Date() },
      });
      await prisma.identityIncome.upsert({
        where: { id: `${identity.id}-seed-income-1` },
        create: {
          id: `${identity.id}-seed-income-1`,
          identityId: identity.id,
          label: "Primary",
          cadence: "biweekly",
          amountDollars: 1820,
          isPrimary: true,
          sortOrder: 0,
        },
        update: {},
      });
      await prisma.identityDebt.upsert({
        where: { id: `${identity.id}-seed-debt-1` },
        create: {
          id: `${identity.id}-seed-debt-1`,
          identityId: identity.id,
          label: "Mortgage",
          kind: "mortgage",
          balanceDollars: 300000,
          aprPercent: 6.5,
          minPaymentDollars: 1800,
          sortOrder: 0,
        },
        update: {},
      });
      await prisma.identityGoal.upsert({
        where: { id: `${identity.id}-seed-goal-1` },
        create: {
          id: `${identity.id}-seed-goal-1`,
          identityId: identity.id,
          label: "Emergency Fund",
          targetDollars: 20000,
          targetDate: null,
          perPaycheckDollars: 432,
          kind: "TRANSFER",
          goalType: "EMERGENCY",
          priority: 1,
          sortOrder: 0,
        },
        update: {},
      });
      console.log(`[seed-admin] seeded FinancialIdentity (id=${identity.id}) + income/debt/goal rows`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`[seed-admin] fatal:`, err);
  process.exit(2);
});
