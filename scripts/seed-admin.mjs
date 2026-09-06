#!/usr/bin/env node
/**
 * seed-admin — create the mom-ready user from env vars.
 *
 * Cluster 7.16. Idempotent: re-runs on every prod deploy, only creates
 * the user if no row exists for ADMIN_EMAIL. Safe to call against a
 * fresh DB (after `prisma migrate deploy`) or a populated DB.
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

    if (existing) {
      if (ADMIN_ALLOW_OVERWRITE !== "1") {
        console.log(`[seed-admin] user ${email} already exists (id=${existing.id}). nothing to do.`);
        return;
      }
      console.log(`[seed-admin] user ${email} exists; overwriting password (ADMIN_ALLOW_OVERWRITE=1).`);
      const passwordHash = await hash(ADMIN_PASSWORD, ARGON2_OPTIONS);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: { name: ADMIN_NAME, passwordHash },
        });
        // Invalidate sessions on overwrite so the new password takes effect.
        await tx.session.deleteMany({ where: { userId: existing.id } });
      });
      console.log(`[seed-admin] updated ${email}; sessions invalidated.`);
      return;
    }

    const passwordHash = await hash(ADMIN_PASSWORD, ARGON2_OPTIONS);
    const created = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email,
          name: ADMIN_NAME,
          passwordHash,
        },
      });
    });

    console.log(`[seed-admin] created user ${email} (id=${created.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`[seed-admin] fatal:`, err);
  process.exit(2);
});
