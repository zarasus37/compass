#!/usr/bin/env node
/**
 * scripts/cron-dev.mjs — Cluster 6.0 dev scheduler.
 *
 * Long-running Node process that polls POST /api/cron/vault every
 * 30s. Mirrors what a Vercel cron job would do in production.
 *
 * Usage: `pnpm cron:dev` (from the project root). Ctrl-C to exit.
 *
 * The endpoint handles all the work (find due users, call
 * runSchedulerForUser, record results). This script is just the
 * poller.
 *
 * The CRON_SECRET auth is skipped when the env is unset (dev).
 * In production, set CRON_SECRET and pass it as a bearer.
 */

const BASE_URL = process.env.CRON_BASE_URL ?? "http://127.0.0.1:3000";
const POLL_INTERVAL_MS = 30_000;

let stopping = false;
let totalPolls = 0;
let totalUsersProcessed = 0;
let totalBills = 0;
let startedAt = new Date();

function log(line) {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${ts}] ${line}`);
}

async function tick() {
  if (stopping) return;
  totalPolls += 1;
  try {
    const headers = { "content-type": "application/json" };
    if (process.env.CRON_SECRET) {
      headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
    }
    const res = await fetch(`${BASE_URL}/api/cron/vault`, {
      method: "POST",
      headers,
    });
    const body = (await res.json())?.body ?? (await res.json());
    if (!res.ok || !body.ok) {
      log(`poll failed: status=${res.status} body=${JSON.stringify(body).slice(0, 200)}`);
      return;
    }
    totalUsersProcessed += body.usersProcessed ?? 0;
    totalBills += body.billsAffected ?? 0;
    if (body.usersProcessed > 0) {
      log(
        `processed=${body.usersProcessed} bills=${body.billsAffected} (${body.results
          .map((r) => `${r.userId.slice(0, 8)}…=${r.status}/${r.billsAffected}`)
          .join(", ")})`,
      );
    } else {
      log(`no users due`);
    }
  } catch (err) {
    log(
      `poll error: ${err instanceof Error ? err.message : String(err)} — is the dev server running on ${BASE_URL}?`,
    );
  }
}

async function main() {
  log(`scheduler started (poll=${POLL_INTERVAL_MS / 1000}s base=${BASE_URL})`);
  await tick();
  const handle = setInterval(() => {
    tick().catch((err) => {
      log(`tick error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, POLL_INTERVAL_MS);

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(handle);
    const uptimeMs = Date.now() - startedAt.getTime();
    log(
      `scheduler stopped (uptime=${Math.floor(uptimeMs / 1000)}s polls=${totalPolls} users=${totalUsersProcessed} bills=${totalBills})`,
    );
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    `scheduler fatal: ${err instanceof Error ? err.stack || err.message : String(err)}`,
  );
  process.exit(1);
});
