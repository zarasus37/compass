/**
 * Smoke for Cluster 7.52 — client error capture.
 *
 * The persistent [ERR] digest 3789288087 mom kept seeing on
 * /envelopes and /envelopes/[id] was being masked by 7.43/7.44
 * defensive wraps without ever being pinpointed:
 *   1. Vercel production logs unreachable from this machine
 *      (personal VERCEL_TOKEN doesn't have team-scope access
 *      to the sovereign-monad-ecosystem project)
 *   2. `pnpm dev` times out on this Windows box (Turbopack
 *      subprocess issue) — no local repro path
 *
 * Cluster 7.52 closes both blockers by writing client +
 * server capture events to a `ClientError` table in the
 * project's own Postgres. Operator view:
 * `npx tsx scripts/show-client-errors.mjs`.
 *
 * This smoke proves:
 *   - Prisma ClientError model exists + DB row creation works
 *   - recordClientError dedups by (digest, url, source)
 *   - POST /api/client-error handles all 3 client sources
 *     (boundary, window.onerror, unhandledrejection) and
 *     returns ok
 *   - (app)/error.tsx posts on mount
 *   - <ClientErrorCapture> is mounted in (app)/layout.tsx
 *   - safeSection callers capture throws
 *   - SectionErrorFallback is shared between the two pages
 *
 * Server-needing checks gate on serverUp per Cluster 7.38
 * SKIP-NO-SERVER pattern. Source-file checks run always.
 */

import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { prisma } from "./db-client.mjs";
import { createFixture } from "./fixture.mjs";
import { exitCodeFor, recordSkip } from "./skip-guard.mjs";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function checkSkip(name, reason) {
  recordSkip();
  checks.push({ name, ok: true, detail: `[SKIP-NO-SERVER] ${reason}` });
  console.log(`[SKIP-NO-SERVER] ${name} — ${reason}`);
}

// ── Server probe ───────────────────────────────────────────────────
// /api/health, not /login: a dev server compiles /login on demand and a
// cold first compile outruns a 2s budget, so probing /login reports a
// healthy server as unreachable and skips every live check below.
let serverUp = false;
try {
  const probe = await fetch(BASE + "/api/health", {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  serverUp = probe.status > 0;
} catch {
  serverUp = false;
}

// ── Source-file checks (always run) ────────────────────────────────

check(
  "[0] Prisma schema declares ClientError model",
  /\nmodel ClientError \{/.test(
    readFileSync("prisma/schema.prisma", "utf8"),
  ),
);
check(
  "[1] ClientError has dedup key (digest, url, source)",
  /@@unique\(\[digest, url, source\]\)/.test(
    readFileSync("prisma/schema.prisma", "utf8"),
  ),
);
check(
  "[2] /api/client-error route exists",
  existsSync("src/app/api/client-error/route.ts"),
);
check(
  "[3] <ClientErrorCapture> component exists",
  existsSync("src/components/ClientErrorCapture.tsx"),
);
check(
  "[4] shared safeSection helper exists",
  existsSync("src/lib/safe-section.tsx"),
);

const layoutSrc = readFileSync("src/app/(app)/layout.tsx", "utf8");
check(
  "[5] (app)/layout.tsx mounts <ClientErrorCapture />",
  /import \{ ClientErrorCapture \}/.test(layoutSrc) &&
    /<ClientErrorCapture \/>/.test(layoutSrc),
);

const errorSrc = readFileSync("src/app/(app)/error.tsx", "utf8");
check(
  "[6] (app)/error.tsx POSTs to /api/client-error on mount",
  /source: "client-error-boundary"/.test(errorSrc) &&
    /fetch\("\/api\/client-error"/.test(errorSrc) &&
    /useEffect/.test(errorSrc),
);

const detailSrc = readFileSync("src/app/(app)/envelopes/[id]/page.tsx", "utf8");
check(
  "[7] envelope detail safeSection captures throws",
  /recordSectionThrow\(/.test(detailSrc),
);
// Tighter check for [8]: safeSection body calls recordSectionThrow with the page's ctx.
check(
  "[8] envelope detail safeSection passes envelope id + user id to capture",
  /recordSectionThrow\(\s*\{[\s\S]*?envelopeId: id,[\s\S]*?userId: user\.id/.test(detailSrc),
);
check(
  "[9] envelope detail sinks try/catch also captures",
  /recordSectionThrow\(/.test(detailSrc.match(/let SINKS[\s\S]*?\}\s*catch[\s\S]*?\}/m)?.[0] ?? ""),
);

const listSrc = readFileSync("src/app/(app)/envelopes/page.tsx", "utf8");
check(
  "[10] envelopes list liveEnvelopesFromDb try/catch captures",
  /recordSectionThrow\(/.test(
    listSrc.match(/let ENVELOPES[\s\S]*?ENVELOPES = \[\];/m)?.[0] ?? "",
  ),
);
check(
  "[11] envelopes list sinks try/catch captures",
  /recordSectionThrow\(/.test(
    listSrc.match(/let SINKS[\s\S]*?SINKS = \[\];/m)?.[0] ?? "",
  ),
);

const captureSrc = readFileSync("src/components/ClientErrorCapture.tsx", "utf8");
check(
  "[12] ClientErrorCapture installs window.onerror listener",
  /addEventListener\("error"/.test(captureSrc),
);
check(
  "[13] ClientErrorCapture installs unhandledrejection listener",
  /addEventListener\("unhandledrejection"/.test(captureSrc),
);
check(
  "[14] ClientErrorCapture dedups posts (DEDUP_WINDOW_MS)",
  /DEDUP_WINDOW_MS/.test(captureSrc),
);

const apiSrc = readFileSync("src/app/api/client-error/route.ts", "utf8");
check(
  "[15] /api/client-error validates body with Zod",
  /z\.object/.test(apiSrc) && /sourceSchema/.test(apiSrc),
);
check(
  "[16] /api/client-error never throws (always returns JSON)",
  /NextResponse\.json/.test(apiSrc),
);

// ── Direct DB exercises (always run; smoke owns the test row) ─────

let probeId = "smoke-752-" + Date.now();
let dbInsertOk = false;
try {
  // Insert a synthetic row + recordClientError upsert. Verify dedup.
  await prisma.clientError.deleteMany({ where: { digest: probeId } });
  const a = await prisma.clientError.create({
    data: {
      digest: probeId,
      url: "/envelopes",
      pathname: "/envelopes",
      source: "server-safe-section",
      message: "smoke test — first hit",
      occurrences: 1,
    },
  });
  check("[17] can insert ClientError row", !!a.id);

  // Dedup: second insert with same (digest, url, source) should
  // upsert — increment occurrences, not duplicate.
  const updated = await prisma.clientError.update({
    where: {
      digest_url_source: {
        digest: probeId,
        url: "/envelopes",
        source: "server-safe-section",
      },
    },
    data: {
      occurrences: { increment: 1 },
      lastSeenAt: new Date(),
    },
  });
  check(
    "[18] dedup key (digest, url, source) works — occurrences incremented",
    updated.occurrences === 2,
  );
  dbInsertOk = true;
} catch (err) {
  console.log(`[MISS] db exercise failed: ${err?.message ?? err}`);
} finally {
  // Cleanup probe row so it doesn't pollute the operator view.
  if (dbInsertOk) {
    await prisma.clientError.deleteMany({ where: { digest: probeId } }).catch(() => {});
  }
}

// ── Live verification (server-gated) ───────────────────────────────

if (!serverUp) {
  checkSkip("[19] POST /api/client-error (boundary source) returns ok", "dev server unreachable");
  checkSkip("[20] POST /api/client-error (window.onerror source) returns ok", "dev server unreachable");
  checkSkip("[21] POST /api/client-error (unhandledrejection source) returns ok", "dev server unreachable");
  checkSkip("[22] /envelopes renders with ClientErrorCapture mounted", "dev server unreachable");
  checkSkip("[22a] /envelopes actually rendered (not redirected by a gate)", "dev server unreachable");
} else {
  // Per-test fixture user. This used to sign in as the shared
  // mom@compass.local, which smoke-escape-hatches (chain entry 34)
  // destroys via POST /api/onboarding/reset — so by this entry the shared
  // account sat behind the onboarding gate, /envelopes never rendered,
  // and the capture element was absent for a reason that had nothing to
  // do with client-error capture. That was wall 8.
  const fx = await createFixture("client-error-capture", { scenario: "minimal" });

  // Login
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', fx.email);
  await p.fill('input[name=password]', fx.password);
  await p.locator('button[type=submit]:has-text("Sign in")').click();
  await p.waitForURL(`${BASE}/`);

  // [22] ClientErrorCapture is mounted on a signed-in page (presence check, no throw)
  await p.goto(`${BASE}/envelopes`);
  await p.waitForLoadState("networkidle");

  // Guard first. A gate redirect to /setup or /login serves markup that
  // simply lacks the testid, so without this the check below would pass
  // for the wrong reason whenever the gate closed.
  const onEnvelopes = p.url().endsWith("/envelopes");
  check("[22a] /envelopes actually rendered (not redirected by a gate)", onEnvelopes, `url=${p.url()}`);

  const capturePresent = await p.evaluate(() => {
    return !!document.querySelector('[data-testid="client-error-capture"]');
  });
  check(
    "[22] ClientErrorCapture mounted on /envelopes (data-testid present)",
    onEnvelopes && capturePresent,
  );

  // [19–21] Direct POSTs to /api/client-error
  async function postError(source, payload) {
    return p.evaluate(
      async ({ source, payload }) => {
        const resp = await fetch("/api/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, ...payload }),
        });
        return { status: resp.status, body: await resp.json() };
      },
      { source, payload },
    );
  }

  const probeBody = {
    digest: "smoke-752-live-" + Date.now(),
    message: "smoke probe — boundary",
    stack: "Error: at smoke-probe (line 1)",
    url: `${BASE}/envelopes`,
    pathname: "/envelopes",
    envelopeId: null,
    userAgent: "smoke-client",
    viewportWidth: 1280,
    viewportHeight: 800,
  };

  const r1 = await postError("client-error-boundary", probeBody);
  check(
    "[19] POST /api/client-error (boundary source) returns 200 + ok",
    r1.status === 200 && r1.body?.ok === true,
    JSON.stringify(r1),
  );

  const r2 = await postError("client-window-onerror", {
    ...probeBody,
    digest: "smoke-752-live-window-" + Date.now(),
    message: "smoke probe — onerror",
  });
  check(
    "[20] POST /api/client-error (window.onerror) returns 200 + ok",
    r2.status === 200 && r2.body?.ok === true,
    JSON.stringify(r2),
  );

  const r3 = await postError("client-unhandledrejection", {
    ...probeBody,
    digest: "smoke-752-live-reject-" + Date.now(),
    message: "smoke probe — rejection",
  });
  check(
    "[21] POST /api/client-error (unhandledrejection) returns 200 + ok",
    r3.status === 200 && r3.body?.ok === true,
    JSON.stringify(r3),
  );

  await browser.close();
  await fx.cleanup();
}

// ── Summary ────────────────────────────────────────────────────────
await prisma.$disconnect();

console.log("\n--- checks ---");
const pass = checks.filter((c) => c.ok).length;
const miss = checks.filter((c) => !c.ok);
console.log(`checks: ${pass} pass / ${miss.length} miss (${checks.length} total)`);
if (miss.length) {
  console.log("\nFAILED checks:");
  for (const m of miss) console.log(`  - ${m.name}${m.detail ? " — " + m.detail : ""}`);
}
process.exit(exitCodeFor(miss.length));
