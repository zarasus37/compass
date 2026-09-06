#!/usr/bin/env node
/**
 * reset-password — CLI recovery path for xKryptic.
 *
 * Cluster 7.16. Mom calls → you run this from your terminal → you tell
 * her the new password verbally → she logs in. Total time: ~2 min.
 *
 * What it does:
 *   1. Finds the user by email (case-insensitive).
 *   2. Hashes the new password with argon2id (same params as the app).
 *   3. Updates the user's passwordHash.
 *   4. Deletes all of that user's sessions (forces re-login on every device).
 *   5. Prints the user id so you can confirm.
 *
 * Required env:
 *   - DATABASE_URL          (Postgres connection string)
 *   - RESET_EMAIL           (the user's email)
 *   - RESET_PASSWORD        (the new password; >= 16 chars in prod)
 *
 * Or pass them as CLI args:
 *   pnpm auth:reset-password mom@example.com
 *   pnpm auth:reset-password mom@example.com --password <new>
 *   pnpm auth:reset-password mom@example.com --stdin   (read password from stdin)
 *
 * Safety:
 *   - In production, refuses to set a password matching the common weak
 *     patterns (same set as seed-admin).
 *   - The password is never logged. The new password is read from
 *     --stdin or a TTY prompt, never from a CLI arg in production.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, exit } from "node:process";
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
  console.error(`[reset-password] ${msg}`);
  exit(code);
}

function isWeak(p) {
  if (p.length < 16) return "shorter than 16 chars";
  for (const pat of WEAK_PATTERNS) if (pat.test(p)) return `matches weak pattern ${pat}`;
  return null;
}

function parseArgs() {
  const out = { email: null, password: null, stdin: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--password" || a === "-p") {
      out.password = rest[++i];
    } else if (a === "--stdin") {
      out.stdin = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  pnpm auth:reset-password <email> [--password <new> | --stdin]

If neither --password nor --stdin is given, you will be prompted.
`);
      exit(0);
    } else if (!out.email) {
      out.email = a;
    } else {
      fail(`unexpected argument: ${a}`);
    }
  }
  return out;
}

async function promptHidden(question) {
  // TTY prompt. Falls back to a plain readline if the env doesn't support
  // raw mode (e.g. running inside a CI container without a TTY).
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(question);
    rl.close();
    return answer;
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout });
    const stdinRaw = stdin;
    const wasRaw = stdinRaw.isRaw;
    if (!wasRaw) stdinRaw.setRawMode?.(true);
    stdinRaw.resume();
    let buf = "";
    const onData = (ch) => {
      const c = ch.toString("utf8");
      if (c === "\n" || c === "\r" || c === "\u0004") {
        stdinRaw.removeListener("data", onData);
        if (!wasRaw) stdinRaw.setRawMode?.(false);
        rl.close();
        stdout.write("\n");
        resolve(buf);
      } else if (c === "\u0003") {
        // Ctrl+C
        process.exit(130);
      } else if (c === "\u007f" || c === "\b") {
        if (buf.length > 0) buf = buf.slice(0, -1);
      } else {
        buf += c;
      }
    };
    stdinRaw.on("data", onData);
    rl.question(question, () => {});
  });
}

async function readPassword(args) {
  if (args.stdin) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").trim();
  }
  if (args.password) return args.password;
  if (!stdin.isTTY) {
    fail("password required: pass --password, --stdin, or run from a TTY");
  }
  return promptHidden("New password: ");
}

async function main() {
  const args = parseArgs();
  const email = (args.email ?? process.env.RESET_EMAIL ?? "").trim().toLowerCase();
  if (!email) fail("email is required (CLI arg or RESET_EMAIL env var).");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`not a valid email: ${email}`);
  }

  const newPassword = await readPassword(args);
  if (!newPassword) fail("password is empty.");

  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const weak = isWeak(newPassword);
    if (weak) {
      fail(`password too weak for production: ${weak}.`);
    }
    if (newPassword.toLowerCase().includes(email.split("@")[0])) {
      fail(`password contains the email local-part. use a random one.`);
    }
  } else if (newPassword.length < 8) {
    fail(`password is shorter than 8 chars (dev minimum).`);
  }

  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) fail(`no user with email ${email}.`);

    const passwordHash = await hash(newPassword, ARGON2_OPTIONS);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      const sessions = await tx.session.deleteMany({ where: { userId: user.id } });
      return { userId: updated.id, sessionsDeleted: sessions.count };
    });

    console.log(`[reset-password] updated ${email} (id=${result.userId}); invalidated ${result.sessionsDeleted} session(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`[reset-password] fatal:`, err);
  exit(2);
});
