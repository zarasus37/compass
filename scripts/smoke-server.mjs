#!/usr/bin/env node
/**
 * smoke-server — build prod, run `next start` with the sandbox bypass,
 * execute the smoke aggregator against the stable server, tear down.
 *
 * Why this exists (Cluster 7.15.1):
 *   `pnpm dev` is unstable in the sandbox during long smoke sequences
 *   (~10 restarts during the 7.15 full-suite run, mostly because
 *   `.next/dev/` cache ENOENTs when the slow filesystem writes
 *   compete with route first-compiles). The user's own note in
 *   HANDOVER.md: "next start (prod build) is stable."
 *
 *   This script wires that observation into a one-command workflow.
 *   The previous way of running smokes against `pnpm dev` still
 *   works (the smoke suite is decoupled from this script), but
 *   `pnpm smoke:all:server` is the recommended path from here on.
 *
 * Requirements:
 *   - NODE_ENV=production (or it falls back to `next dev`)
 *   - COMPASS_SANDBOX=1 (bypasses prod-env validator; the validator
 *     refuses to start with mock LLM / Sepolia chainId / dev DB URL,
 *     and the sandbox can't supply the real keys — so we add an
 *     explicit operator-only opt-in. Production deploys never set
 *     this flag, so the safety net stays intact.)
 *   - DATABASE_URL pointed at the local dev Postgres
 *   - AUTH_SECRET set (any string >= 32 chars works)
 *
 * Usage:
 *   pnpm smoke:server              # runs `pnpm smoke` once
 *   pnpm smoke:all:server          # runs `pnpm smoke && pnpm smoke:ui \
 *                                  #   && pnpm smoke:integration && pnpm smoke:deploy`
 *   node scripts/smoke-server.mjs --dev   # legacy: run against `pnpm dev`
 *   node scripts/smoke-server.mjs --keep  # leave server running after smokes
 *
 * Exit code: 0 on full green, 1 on any failure (script exit,
 *            not orchestrator exit — the orchestrator is honest
 *            about pass/fail).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const forceDev = args.includes("--dev");
const keepServer = args.includes("--keep");
const fullMode = args.includes("--full");

const PORT = process.env.PORT || "3000";
const BASE = `http://127.0.0.1:${PORT}`;

/** Pipe child stdout/stderr through if TTY, otherwise capture for logs. */
function run(label, cmd, args, opts = {}) {
  const t0 = Date.now();
  const child = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
    ...opts,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (child.status !== 0) {
    console.error(`[${label}] FAILED in ${dt}s (exit=${child.status})`);
    process.exit(child.status ?? 1);
  }
  console.log(`[${label}] OK in ${dt}s`);
}

/** Long-running child we manage ourselves (so we can kill it). */
function startServer() {
  const env = {
    ...process.env,
    NODE_ENV: forceDev ? "development" : "production",
    PORT,
    LLM_PROVIDER: "mock",
    LLM_PROVIDER_ADVISOR: "mock",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://compass:compass@localhost:5432/compass_dev",
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      "dev-only-secret-please-replace-with-a-real-one-aaaaaaaaaaaaaaaaaa",
    // The bypass flag that lets `next start` boot in a sandbox
    // without real prod keys. NEVER set in prod.
    COMPASS_SANDBOX: forceDev ? "" : "1",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=8192`.trim(),
  };

  if (forceDev) {
    console.log("[smoke-server] using pnpm dev (legacy mode)");
    const child = spawn("pnpm", ["dev"], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    child.stdout.on("data", (b) => process.stdout.write(b));
    child.stderr.on("data", (b) => process.stderr.write(b));
    return child;
  }

  // Build the prod artifact first. If a stale .next/dev exists
  // (from a previous dev session), nuke it; mixing caches breaks
  // the prod build's static chunk references.
  const nextDir = join(ROOT, ".next");
  if (existsSync(nextDir)) {
    console.log("[smoke-server] removing stale .next/ before prod build");
    rmSync(nextDir, { recursive: true, force: true });
  }

  console.log("[smoke-server] building prod artifact...");
  const build = spawnSync("pnpm", ["build"], {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    console.error(`[smoke-server] build failed (exit=${build.status})`);
    process.exit(build.status ?? 1);
  }

  console.log(`[smoke-server] starting next start on :${PORT}`);
  const child = spawn("pnpm", ["start"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  child.stdout.on("data", (b) => process.stdout.write(b));
  child.stderr.on("data", (b) => process.stderr.write(b));
  return child;
}

/** Poll /api/health until 200 (or give up after timeout). */
async function waitForReady(child) {
  const TIMEOUT_MS = 90_000;
  const t0 = Date.now();
  while (Date.now() - t0 < TIMEOUT_MS) {
    if (child.exitCode !== null && child.exitCode !== 0) {
      console.error(`[smoke-server] server exited code=${child.exitCode} before health`);
      process.exit(1);
    }
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.status === 200) {
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[smoke-server] ready in ${dt}s`);
        return;
      }
    } catch {
      // not ready yet — fall through
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`[smoke-server] timeout: server never returned 200 on /api/health`);
  child.kill("SIGTERM");
  process.exit(1);
}

async function main() {
  console.log("[smoke-server] starting workflow");
  const child = startServer();

  // Best-effort teardown on any exit path (success, failure, Ctrl-C).
  const teardown = () => {
    if (child.exitCode === null) {
      console.log("\n[smoke-server] stopping server");
      try {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (child.exitCode === null) child.kill("SIGKILL");
        }, 3000);
      } catch {}
    }
  };
  process.on("exit", teardown);
  process.on("SIGINT", () => {
    teardown();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    teardown();
    process.exit(143);
  });

  await waitForReady(child);

  try {
    if (fullMode) {
      console.log("[smoke-server] running full suite (smoke + smoke:ui + smoke:integration + smoke:deploy)");
      run("smoke:data", "pnpm", ["smoke"]);
      run("smoke:ui", "pnpm", ["smoke:ui"]);
      run("smoke:integration", "pnpm", ["smoke:integration"]);
      run("smoke:deploy", "pnpm", ["smoke:deploy"]);
    } else {
      console.log("[smoke-server] running data-layer smokes (pnpm smoke)");
      run("smoke:data", "pnpm", ["smoke"]);
    }
  } finally {
    if (!keepServer) teardown();
  }

  console.log("\n[smoke-server] ALL GREEN");
}

main().catch((e) => {
  console.error("[smoke-server] FATAL:", e);
  process.exit(1);
});
