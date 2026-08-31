#!/usr/bin/env node
/**
 * scripts/cron-audit-prune-dev.mjs — Cluster 7.8.1 dev scheduler.
 *
 * Long-running Node process that polls POST
 * /api/cron/audit-log-prune on a configurable interval
 * (default 24h, override via `AUDIT_LOG_PRUNE_POLL_MS`).
 * Mirrors what a Vercel cron job would do in production.
 *
 * Usage: `pnpm cron:dev:audit` (from the project root). Ctrl-C
 * to exit.
 *
 * The endpoint handles all the work (iterate users, call
 * pruneAuditLog for each, return the summary). This script is
 * just the poller.
 *
 * The CRON_SECRET auth is skipped when the env is unset (dev).
 * In production, set CRON_SECRET and pass it as a bearer.
 *
 * The default interval is 24h because audit log pruning is a
 * nightly job. In dev, override to a few seconds for fast
 * feedback:
 *   AUDIT_LOG_PRUNE_POLL_MS=5000 pnpm cron:dev:audit
 */

const BASE_URL = process.env.CRON_BASE_URL ?? "http://127.0.0.1:3000";
const DEFAULT_POLL_MS = 24 * 60 * 60 * 1000; // 24h
const POLL_INTERVAL_MS = Number.isFinite(Number(process.env.AUDIT_LOG_PRUNE_POLL_MS))
  ? Number(process.env.AUDIT_LOG_PRUNE_POLL_MS)
  : DEFAULT_POLL_MS;

let stopping = false;
let totalPolls = 0;
let totalUsersProcessed = 0;
let totalRolledUp = 0;
let totalDeleted = 0;
let totalUsersFailed = 0;
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
    const res = await fetch(`${BASE_URL}/api/cron/audit-log-prune`, {
      method: "POST",
      headers,
    });
    const body = await res.json();
    if (!res.ok || !body.ok) {
      log(
        `poll failed: status=${res.status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
      return;
    }
    totalUsersProcessed += body.usersProcessed ?? 0;
    totalRolledUp += body.totalRolledUp ?? 0;
    totalDeleted += body.totalDeleted ?? 0;
    totalUsersFailed += body.usersFailed ?? 0;
    if (body.usersFailed > 0) {
      log(
        `processed=${body.usersProcessed} rolledUp=${body.totalRolledUp} deleted=${body.totalDeleted} failed=${body.usersFailed}`,
      );
      for (const r of body.results.filter((x) => x.status === "ERROR")) {
        log(
          `  ERROR ${r.userId.slice(0, 8)}… ${r.error ?? "(no message)"}`,
        );
      }
    } else if (body.totalRolledUp > 0) {
      log(
        `processed=${body.usersProcessed} rolledUp=${body.totalRolledUp} deleted=${body.totalDeleted} rollupRows=${body.totalRollupRows}`,
      );
    } else {
      log(`no users due (retentionDays=${body.retentionDays})`);
    }
  } catch (err) {
    log(
      `poll error: ${err instanceof Error ? err.message : String(err)} — is the dev server running on ${BASE_URL}?`,
    );
  }
}

async function main() {
  log(
    `audit-prune scheduler started (poll=${
      POLL_INTERVAL_MS >= 60_000
        ? `${POLL_INTERVAL_MS / 60_000}m`
        : `${POLL_INTERVAL_MS / 1000}s`
    } base=${BASE_URL})`,
  );
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
      `audit-prune scheduler stopped (uptime=${Math.floor(
        uptimeMs / 1000,
      )}s polls=${totalPolls} users=${totalUsersProcessed} rolledUp=${totalRolledUp} deleted=${totalDeleted} failed=${totalUsersFailed})`,
    );
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    `audit-prune scheduler fatal: ${
      err instanceof Error ? err.stack || err.message : String(err)
    }`,
  );
  process.exit(1);
});
