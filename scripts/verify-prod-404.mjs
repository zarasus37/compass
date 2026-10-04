#!/usr/bin/env node
/**
 * verify-prod-404.mjs — regression guard for the (app) 404.
 *
 * ── WHAT CHANGED, AND WHY (2026-10-03) ────────────────────────────────────
 *
 * This file previously ended with two assertions that could NEVER pass:
 *
 *     "the 404 card is VISIBLE, not just present in the RSC payload"
 *     "the 404 page has real visible text, not a bare shell"
 *
 * Both stripped `<script>` out of the server HTML and measured the
 * remainder. They reported 26 visible characters and were read as "a user
 * following a stale link sees a blank page". That conclusion was WRONG.
 *
 * The (app) 404 renders correctly. Measured in a real browser:
 *
 *     status                 404
 *     eyebrow                "[404] NOT FOUND"   (visible, 111x13)
 *     h1                     "That page doesn't exist."
 *     back-to-dashboard CTA  present, href="/"
 *
 * Why the HTML-only measurement was structurally doomed: the notFound()
 * path makes Next emit an ERROR-PATH DOCUMENT. Its root is
 * `<html id="__next_error__">` and its body is a single empty placeholder
 *
 *     <div hidden=""><!--$--><!--/$--></div>
 *
 * plus the RSC flight payload in `<script>`. That is a CLIENT-BOOTSTRAP
 * SHELL: the not-found element is serialized correctly (verified in the
 * flight payload under the layout router's `notFound` slot, alongside
 * `E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}`) and rendered on the client
 * after hydration. Strip the scripts and you have measured a shell, not a
 * page. Any assertion of the form "the card must be in the pre-hydration
 * HTML" fails against a WORKING build by construction.
 *
 * So the guard now measures visibility in an actual browser, which is the
 * only place the question "does a user see this?" has a truthful answer.
 * That is a real regression guard: if the card ever genuinely stops
 * rendering, these checks go red.
 *
 * Two cases are covered, because they are two different code paths:
 *   - a bad id inside the signed-in shell  -> (app)/not-found.tsx
 *   - a URL matching no route at all       -> app/not-found.tsx
 * Plus a NEGATIVE CONTROL (a real envelope id must NOT show the card), so
 * a probe that rendered the 404 card on every page could not pass.
 *
 * ── WHY THIS IS NOT IN THE SMOKE CHAIN ────────────────────────────────────
 * The visibility question only means something against a production
 * build; on `next dev` the same shell appears for a different reason.
 * Do not move these into the chain — they are production-only by design.
 *
 * Usage (build + start the server first):
 *   pnpm build
 *   NODE_ENV=production COMPASS_SANDBOX=1 pnpm start
 *   pnpm exec tsx --conditions=react-server scripts/verify-prod-404.mjs
 */
import { chromium } from "playwright";
import { prisma } from "../tests/db-client.mjs";
import { createFixture, loginExisting } from "../tests/fixture.mjs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

const checks = [];
function check(name, ok, detail = "") {
  const pass = Boolean(ok);
  checks.push({ name, ok: pass, detail });
  console.log(`[${pass ? "OK" : "MISS"}] ${name}${detail ? "  — " + detail : ""}`);
}
function skip(name, reason) {
  checks.push({ name, ok: true, detail: `[SKIP-ENV] ${reason}` });
  console.log(`[SKIP-ENV] ${name} — ${reason}`);
}
function note(line) {
  console.log(`[note] ${line}`);
}
function report() {
  const miss = checks.filter((c) => !c.ok);
  console.log(
    `\nchecks: ${checks.length - miss.length} pass / ${miss.length} miss (${checks.length} total)`,
  );
  for (const c of miss) console.log(`  - ${c.name}${c.detail ? "  — " + c.detail : ""}`);
  return miss.length;
}

const CARD_MARK = "[404] not found";
const CARD_CTA = "back to dashboard";
const CARD_HEADING = "doesn't exist";

let fx = null;
let browser = null;
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
    console.error("[prod-404]   pnpm build");
    console.error("[prod-404]   NODE_ENV=production COMPASS_SANDBOX=1 pnpm start");
    process.exit(2);
  }

  if (health.env !== "production") {
    console.log(`[prod-404] server reports env="${health.env}" — this check is production-only.`);
    skip("all (app) 404 production assertions", `server env is "${health.env}"`);
    process.exit(report());
  }
  console.log(`[prod-404] server reports env="production" — proceeding.\n`);

  // ---- 1. An authenticated session. loginExisting, never createFixture
  //         to log in: createFixture sweeps every smoke-* user, and this
  //         script's own fixture is the subject of the measurement.
  fx = await createFixture("prod-404", { scenario: "minimal" });
  const s = await loginExisting(fx.email, fx.password);
  const session = s.jar.compass_session;
  if (!session) throw new Error("[prod-404] login produced no compass_session cookie");

  // ---- 2. Positive control on the SERVER HTML: a real (app) page is a
  //         real document for this user. Guards the harness, not the app.
  const ctrl = await s.get("/transactions");
  const ctrlHtml = await ctrl.text();
  check(
    "positive control: /transactions is a real 200 document for this user",
    ctrl.status === 200 && ctrlHtml.length > 2000,
    `status=${ctrl.status} bytes=${ctrlHtml.length}`,
  );

  // ---- 3. The load-bearing SERVER-side assertion. This is what
  //         `daabae5` fixed: the (app) loading.tsx boundary made
  //         notFound() unable to set the status, so no (app) page could
  //         ever return 404. Status is real, server-measurable, and stays.
  const res = await s.get("/envelopes/does-not-exist");
  const html = await res.text();
  check("the (app) 404 returns HTTP 404", res.status === 404, `status=${res.status}`);

  // ---- 4. The not-found BOUNDARY is wired app-wide. Next serialises the
  //         boundary card into the RSC payload for every (app) route,
  //         which is how the 1677415 token leak once reached every page.
  //
  //         These prove WIRING, not VISIBILITY. They previously sat next to
  //         a visibility claim built on the same stripped-HTML string, and
  //         that adjacency is what made the earlier "blank page" reading
  //         look convincing. The visibility question is answered below, in
  //         a browser.
  check(
    "the not-found boundary is present in a healthy (app) page payload",
    ctrlHtml.includes("That page"),
    "proves the card is wired into the (app) group, not just the 404 route",
  );
  check(
    "the 404 payload contains the card eyebrow (WIRING, not visibility)",
    html.includes(CARD_MARK),
    `looking for ${JSON.stringify(CARD_MARK)}`,
  );

  // ---- 5. THE ASSERTION THAT MATTERS — measured where the question is
  //         meaningful. "Does a user see the card?" has no truthful answer
  //         in the pre-hydration HTML of an error-path document, so ask a
  //         real browser after hydration.
  browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies([
    { name: "compass_session", value: session, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await ctx.newPage();

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));

  /**
   * Read the LIVE DOM after hydration.
   *
   * Every text match is lowercased on BOTH sides. The card's eyebrow is
   * uppercased by CSS (`text-transform: uppercase`), so `innerText` returns
   * "[404] NOT FOUND" — a case-sensitive check for "[404] not found" reports
   * false against a perfectly working page. That mistake briefly produced a
   * false "still broken" reading during this investigation; it is the most
   * likely way to repeat it, so it is encoded here deliberately.
   */
  const readDom = async (path) => {
    const resp = await page.goto(BASE + path, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Give the client bootstrap time to render from the flight payload.
    await page.waitForTimeout(4000);
    const dom = await page.evaluate(() => {
      const text = (el) => (el?.innerText || "").trim();
      const lower = (s) => (s || "").toLowerCase();
      // Only real rendered elements. `querySelectorAll("*")` includes
      // <script>, and the RSC flight payload inside a <script> contains the
      // eyebrow as escaped source text — a <script> also has zero element
      // children and a 0x0 box, so an unfiltered search matches the script,
      // not the card. That produced a false "not visible" on a working page.
      const NON_RENDERED = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
      const all = [...document.querySelectorAll("*")].filter(
        (el) => !NON_RENDERED.has(el.tagName),
      );
      const eyebrowEl = all.find(
        (el) => lower(el.innerText).includes("[404] not found") && el.children.length === 0,
      );
      const ctaEl = [...document.querySelectorAll("a")].find((a) =>
        lower(a.innerText).includes("back to dashboard"),
      );
      const box = eyebrowEl ? eyebrowEl.getBoundingClientRect() : null;
      const cs = eyebrowEl ? getComputedStyle(eyebrowEl) : null;
      return {
        eyebrow: text(eyebrowEl) || null,
        eyebrowVisible: Boolean(
          cs && cs.visibility !== "hidden" && cs.display !== "none" && box && box.height > 0,
        ),
        h1: [...document.querySelectorAll("h1")].map((h) => text(h)),
        ctaHref: ctaEl ? ctaEl.getAttribute("href") : null,
        bodyChars: (document.body.innerText || "").replace(/\s+/g, " ").trim().length,
      };
    });
    return { status: resp.status(), ...dom };
  };

  // ---- 5a. Bad envelope id inside the signed-in shell -> (app) card.
  const bad = await readDom("/envelopes/does-not-exist");
  check("browser: bad envelope id returns HTTP 404", bad.status === 404, `status=${bad.status}`);
  check(
    "browser: the 404 eyebrow is VISIBLE to a user",
    Boolean(bad.eyebrow) && bad.eyebrowVisible,
    `text=${JSON.stringify(bad.eyebrow)} visible=${bad.eyebrowVisible}`,
  );
  check(
    "browser: the 404 heading renders",
    bad.h1.some((t) => t.toLowerCase().includes(CARD_HEADING)),
    `h1=${JSON.stringify(bad.h1)}`,
  );
  check(
    "browser: the back-to-dashboard CTA is a real link to /",
    bad.ctaHref === "/",
    `href=${JSON.stringify(bad.ctaHref)}`,
  );

  // ---- 5b. A URL matching no route at all -> the root not-found. A
  //         different file (app/not-found.tsx, which re-exports the (app)
  //         one) and a different resolution path, so it gets its own check.
  const unmatched = await readDom("/some-route-that-does-not-exist");
  check(
    "browser: an unmatched URL returns HTTP 404",
    unmatched.status === 404,
    `status=${unmatched.status}`,
  );
  check(
    "browser: an unmatched URL shows the 404 card",
    Boolean(unmatched.eyebrow) && unmatched.eyebrowVisible,
    `text=${JSON.stringify(unmatched.eyebrow)} visible=${unmatched.eyebrowVisible}`,
  );

  // ---- 5c. NEGATIVE CONTROL. A real envelope id must render its page and
  //         must NOT show the card. Without this, a probe that painted the
  //         404 on every route would sail through 5a and 5b.
  const realEnvelope = await prisma.envelope.findFirst({
    where: { userId: fx.userId },
    select: { id: true },
  });
  if (realEnvelope) {
    const good = await readDom(`/envelopes/${realEnvelope.id}`);
    check(
      "browser: a REAL envelope id is 200 and does NOT show the 404 card",
      good.status === 200 && !good.eyebrow,
      `status=${good.status} eyebrow=${JSON.stringify(good.eyebrow)}`,
    );
  } else {
    // Not silently green. A control that did not run is not a control.
    note(
      "NEGATIVE CONTROL DID NOT RUN — the 'minimal' fixture created no envelopes, " +
        "so nothing proves the card is not painted on every page. This is a gap, not a pass.",
    );
  }

  // ---- 6. A client-side throw during bootstrap would mean the shell never
  //         finished. Report it; it is the signature of a genuine failure.
  if (pageErrors.length) {
    note(`client page errors during the 404 run: ${[...new Set(pageErrors)].join(" | ")}`);
  } else {
    check("browser: no uncaught client errors while rendering the 404", true, "clean");
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fx) {
    await prisma.setupState.deleteMany({ where: { userId: fx.userId } });
    await prisma.user.delete({ where: { id: fx.userId } }).catch(() => {});
  }
  await prisma.$disconnect();
}

process.exit(report());
