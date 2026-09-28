/**
 * Cluster 7.52 — operator view: print recent client errors.
 *
 * Usage:
 *   npx tsx scripts/show-client-errors.mjs           # default last 50
 *   npx tsx scripts/show-client-errors.mjs --limit 200
 *   npx tsx scripts/show-client-errors.mjs --since 24h
 *   npx tsx scripts/show-client-errors.mjs --digest 3789288087
 *
 * Reads from the same Postgres used by the app (DATABASE_URL
 * from .env.local, falling back to .env). Each row shows:
 *
 *   - digest (Next.js production hash, when present)
 *   - message (truncated)
 *   - pathname + URL
 *   - envelopeId (when the throw was on /envelopes/[id])
 *   - source (boundary / window.onerror / unhandledrejection /
 *     server-safe-section)
 *   - occurrences (dedup counter — same row spans multiple
 *     hits)
 *   - lastSeenAt (most recent hit)
 *
 * The point: this is the local replacement for Vercel logs,
 * which are unreachable from this machine because the personal
 * VERCEL_TOKEN doesn't have team-scope access to the
 * sovereign-monad-ecosystem project.
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

const require = createRequire(import.meta.url);
loadEnv({ path: join(process.cwd(), ".env.local") });
loadEnv({ path: join(process.cwd(), ".env") });

const generated = require(join(process.cwd(), "src/generated/prisma/client"));
const { PrismaClient } = generated;
const { PrismaPg } = require(join(process.cwd(), "node_modules/@prisma/adapter-pg"));

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://compass:compass@localhost:5432/compass_dev";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Argv parser — intentionally tiny. We don't pull in commander/yargs
// for a one-shot script.
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
}

const LIMIT = Number.parseInt(arg("limit", "50"), 10);
const DIGEST = arg("digest", undefined);
const SINCE = arg("since", undefined);
// Parse `--since 24h` / `--since 30m` / `--since 7d` as ms-ago.
let sinceDate = null;
if (SINCE) {
  const m = /^(\d+)([smhd])$/.exec(SINCE);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    const unit = m[2];
    const mul = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
    sinceDate = new Date(Date.now() - n * mul);
  }
}

const where = {};
if (DIGEST) where.digest = DIGEST;
if (sinceDate) where.lastSeenAt = { gte: sinceDate };

const rows = await prisma.clientError.findMany({
  where,
  orderBy: { lastSeenAt: "desc" },
  take: LIMIT,
});

// ANSI helpers — keep output readable on a dark terminal.
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function fmtTime(d) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 19) + "Z";
}

function sourceColor(source) {
  if (source === "client-error-boundary") return RED;
  if (source === "client-window-onerror") return YELLOW;
  if (source === "client-unhandledrejection") return YELLOW;
  return CYAN; // server-safe-section
}

if (rows.length === 0) {
  console.log(
    `${DIM}no client errors found${DIGEST ? ` for digest ${DIGEST}` : ""}` +
      `${sinceDate ? ` since ${fmtTime(sinceDate)}` : ""}${RESET}`,
  );
} else {
  console.log(
    `${BOLD}${rows.length}${RESET} error${rows.length === 1 ? "" : "s"}` +
      (DIGEST ? ` ${DIM}(digest=${DIGEST})${RESET}` : "") +
      (sinceDate ? ` ${DIM}since ${fmtTime(sinceDate)}${RESET}` : ""),
  );
  console.log("");
  for (const r of rows) {
    const sc = sourceColor(r.source);
    console.log(
      `${sc}${BOLD}[${r.source}]${RESET} ${r.digest ? `${CYAN}${r.digest}${RESET} ` : `${DIM}(no digest)${RESET} `}` +
        `${DIM}×${r.occurrences}${RESET} ${DIM}last ${fmtTime(r.lastSeenAt)}${RESET}`,
    );
    if (r.message) {
      console.log(`  ${r.message.slice(0, 200)}`);
    }
    console.log(
      `  ${DIM}${r.pathname}${r.envelopeId ? ` ${YELLOW}env=${r.envelopeId}${RESET}` : ""}${RESET}`,
    );
    if (r.userId) {
      console.log(`  ${DIM}user=${r.userId}${RESET}`);
    }
    if (r.stack) {
      // Show first ~5 lines of the stack — usually enough to
      // pinpoint the throw site + the few frames above it.
      const stackLines = r.stack
        .split("\n")
        .slice(0, 6)
        .map((l) => `    ${l.trim()}`)
        .join("\n");
      console.log(`  ${DIM}${stackLines}${RESET}`);
    }
    console.log("");
  }
}

await prisma.$disconnect();
