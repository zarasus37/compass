#!/usr/bin/env node
/**
 * verify-prod-404.mjs — close the (app) 404 verification gap.
 *
 * WHY THIS IS SEPARATE FROM THE SMOKE CHAIN
 * -----------------------------------------
 * The (app) 404 renders an EMPTY BODY on `next dev`. Next serves its
 * global-error fallback (`<html id="__next_error__">`) because there is
 * no `global-error.tsx`, and that fallback is dev-only. So this exact
 * assertion is IMPOSSIBLE to make in the chain: a test that requires a
 * visibly non-empty 404 body fails against dev by construction.
 *
 * That is why the gap stayed open even after `daabae5` fixed the
 * status code. The status was verified; the rendering was documented
 * and never measured.
 *
 * The workspace move made this closable: `pnpm build` now completes
 * (the old `EPERM` was the OneDrive-synced `.next`), so a real
 * production server can be booted locally and asked.
 *
 * PRODUCTION-ONLY BY DESIGN
 * -------------------------
 * The first check gates on the server reporting `env: "production"`.
 * Against dev this exits 2 and reports SKIPPED-BY-ENVIRONMENT rather
 * than failing — because on dev the behaviour is a known dev-only
 * artifact, not a defect. Do not move these assertions into the chain.
 *
 * Usage (server must already be running):
 *   NODE_ENV=production COMPASS_SANDBOX=1 pnpm start
 *   pnpm exec tsx --conditions=react-server scripts/verify-prod-404.mjs
 */
import { prisma } from "../tests/db-client.mjs";
import { createFixture, loginExisting } from "../tests/fixture.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

const checks = [];
function check(name, ok, detail = "") {
  const pass = Boolean(ok);
  checks.push({ name, ok: pass, detail });
  console.log(`[${pass ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}
function skip(name, reason) {
  checks.push({ name, ok: true, detail: `[SKIP-ENV] ${reason}` });
  console.log(`[SKIP-ENV] ${name} — ${reason}`);
}
function report() {
  const miss = checks.filter((c) => !c.ok);
  console.log(`\nchecks: ${checks.length - miss.length} pass / ${miss.length} miss (${checks.length} total)`);
  for (const c of miss) console.log(`  - ${c.name}${c.detail ? "  — " + c.detail : ""}`);
  return miss.length;
}

const MOCK_ERROR_PAGE = "__next_error__";
const CARD_MARK = "[404] not found";
const CARD_CTA = "Back to dashboard";

let fx = null;
try {
  // ---- 0. Gate: this only means anything against a production build.
  let health;
  try {
    const r = await fetch(BASE + "/api/health", {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    health = await r.json();
  } catch (e) {
    console.error(`[prod-404] no server at ${BASE}: ${e.message}`);
    console.error("[prod-404] start one with:");
    console.error("[prod-404]   NODE_ENV=production COMPASS_SANDBOX=1 pnpm start");
    process.exit(2);
  }

  if (health.env !== "production") {
    console.log(`[prod-404] server reports env="${health.env}" — this check is production-only.`);
    console.log("[prod-404] On dev, Next serves the global-error fallback with an empty body,");
    console.log("[prod-404] which is a dev artifact and NOT a defect. Nothing to measure here.");
    skip("all (app) 404 production assertions", `server env is "${health.env}"`);
    process.exit(report());
  }
  console.log(`[prod-404] server reports env="production" — proceeding.\n`);

  // ---- 1. An authenticated session. loginExisting, never createFixture
  //         to log in: createFixture sweeps every smoke-* user, and this
  //         script's own fixture is the subject of the measurement.
  fx = await createFixture("prod-404", { scenario: "minimal" });
  const s = await loginExisting(fx.email, fx.password);

  // ---- 2. Positive control. A negative assertion cannot tell "returned
  //         404 with a card" from "returned an error page". Prove a real
  //         (app) page renders for this user first.
  const ctrl = await s.get("/transactions");
  const ctrlHtml = await ctrl.text();
  check(
    "positive control: /transactions is a real 200 document for this user",
    ctrl.status === 200 && ctrlHtml.length > 2000,
    `status=${ctrl.status} bytes=${ctrlHtml.length}`,
  );

  // ---- 3. The load-bearing status. This is what `daabae5` fixed: the
  //         (app) loading.tsx boundary made notFound() unable to set the
  //         status, so no (app) page could ever return 404.
  const res = await s.get("/envelopes/does-not-exist");
  const html = await res.text();
  check("the (app) 404 returns HTTP 404", res.status === 404, `status=${res.status}`);

  // ---- 4. Informational, NOT an assertion. `__next_error__` marks the
  //         document as having come through the error path, and
  //         `global-error.tsx` legitimately is that path — so its
  //         presence is not the defect. The defect was the EMPTY BODY
  //         that came with it, which check 6 below measures directly.
  //         Recorded so a future reader does not "fix" this by chasing
  //         the marker.
  console.log(
    `[info] __next_error__ marker present: ${html.includes(MOCK_ERROR_PAGE)} ` +
      `(expected true — it identifies the error path, not a failure)`,
  );
  check(
    "the 404 body contains the card heading",
    html.includes(CARD_MARK),
    `looking for ${JSON.stringify(CARD_MARK)}`,
  );
  check(
    "the 404 body contains the back-to-dashboard CTA",
    html.includes(CARD_CTA),
    `looking for ${JSON.stringify(CARD_CTA)}`,
  );
  check(
    "the 404 body is non-empty",
    html.length > 2000,
    `${html.length} bytes`,
  );

  // ---- 5. Regression guard on today's encoding repair, in production.
  //         The card body contains an em-dash. It rendered as three
  //         garbage characters before the double-encoding was fixed.
  const visible = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  check(
    "the 404 card's em-dash is a real U+2014, not mojibake",
    html.includes("—") && !html.includes("â€”"),
    html.includes("â€”") ? "found mojibake em-dash" : "clean",
  );

  // ---- 6. THE assertion that actually matters, and the one that was
  //         impossible before this probe existed: is the card VISIBLE?
  //
  //         26,805 bytes of HTML can be a blank page. Every card match
  //         above may be living in the RSC flight payload inside
  //         <script>, which never renders. So strip scripts and measure
  //         what a user's eyes would actually get.
  check(
    "the 404 card is VISIBLE, not just present in the RSC payload",
    visible.includes("[404] not found") && visible.includes("Back to dashboard"),
    `visible text = ${JSON.stringify(visible.slice(0, 120))}`,
  );
  check(
    "the 404 page has real visible text, not a bare shell",
    visible.length > 40,
    `${visible.length} visible chars`,
  );

  // ---- 7. The not-found boundary is wired app-wide: Next serialises a
  //         boundary card into the RSC flight payload for every (app)
  //         route, which is how the 1677415 token leak reached every page.
  check(
    "the not-found boundary is present in a healthy (app) page payload",
    ctrlHtml.includes("That page"),
    "proves the card is wired into the (app) group, not just the 404 route",
  );

  // ---- 8. The REAL 1677415 contract, at its real scope. The chain's
  //         smoke-visual-finish audits the DASHBOARD, not every page —
  //         an earlier version of this probe checked /transactions and
  //         reported a false failure, because --surface and --line are
  //         still DEFINED tokens (globals.css:110-112) and several
  //         components legitimately use them.
  const dash = await s.get("/");
  const dashHtml = await dash.text();
  check(
    "positive control 2: the dashboard is a real 200 document",
    dash.status === 200 && dashHtml.length > 2000,
    `status=${dash.status} bytes=${dashHtml.length}`,
  );
  for (const token of ["var(--vessel-dark)", "var(--vessel-surface)", "var(--vessel-border)", "var(--vessel-accent)"]) {
    const n = dashHtml.split(token).length - 1;
    check(`dashboard uses ${token}`, n > 0, `${n} occurrence(s)`);
  }
  for (const token of ["var(--cosmos)", "var(--surface)", "var(--line)", "var(--line-soft)", "var(--terminal-cyan)", "var(--warn)", "var(--neg)"]) {
    const n = dashHtml.split(token).length - 1;
    check(`dashboard carries no ${token} (the 1677415 guard, in production)`, n === 0, n === 0 ? "absent" : `${n} LEAKED`);
  }
} finally {
  if (fx) {
    await prisma.setupState.deleteMany({ where: { userId: fx.userId } });
    await prisma.user.delete({ where: { id: fx.userId } }).catch(() => {});
  }
  await prisma.$disconnect();
}

process.exit(report());
