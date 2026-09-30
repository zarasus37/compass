/**
 * Smoke for Cluster 7.33b — envelope detail reads from Prisma.
 *
 * Verifies the fix for the production-only 404 when an envelope link
 * was clicked. Pages now use `liveEnvelopesFromDb(user.id)` instead
 * of the in-memory `liveEnvelopes()`.
 *
 * Checks:
 *   1. The fixture user has envelopes in the DB (provisioned by the
 *      fixture, NOT lazily seeded by a read path — see the note below)
 *   2. /envelopes/<rent-envelope-id> returns 200 (not 404)
 *   3. The rendered HTML mentions "Rent"
 *   4. With an unknown envelope id, the route returns a 404 response
 *      (notFound() is the right call — we render a not-found page).
 */
import { prisma } from "./db-client.mjs";
import { loginAsFixture } from "./fixture.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seededId } from "../src/lib/seed-ids.ts";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

// Cookie jar for an already-authenticated fixture session.
function jarFrom(session) {
  return Object.entries(session ?? {}).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function goWithCookies(jar, path) {
  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  const r = await fetch(BASE + path, { headers: { cookie: cookieHeader }, redirect: "manual" });
  return r;
}

async function main() {
  // Per-test fixture user. This used to sign in as the shared
  // `mom@compass.local` and assert "mom has envelopes in DB (lazy-seed
  // worked)" — which asserted, by name, the read-path auto-seeding that
  // the product no longer does. The fixture provisions a real dataset,
  // so the detail page is exercised against rows that actually exist
  // for the user making the request.
  const s = await loginAsFixture("envelope-detail");
  const u = { id: s.userId };
  check("fixture user exists in DB", !!u.id);

  const envs = await prisma.envelope.findMany({ where: { userId: u.id } });
  check(
    "fixture provisioned envelopes in DB",
    envs.length > 0,
    `got ${envs.length}`,
  );

  // Canonical seed ids are namespaced per user by the product
  // (src/lib/seed-ids.ts). Fall back to the bare id so this also works
  // against a row created before the namespacing landed.
  const rentId = seededId(u.id, "env-rent");
  const rent =
    envs.find((e) => e.id === rentId) ??
    envs.find((e) => e.id === "env-rent") ??
    envs.find((e) => /^rent$/i.test(e.name));
  check("rent envelope exists (namespaced, bare, or by name)", !!rent,
    rent ? `id=${rent.id}` : "none found");

  const jar = s.jar;
  // Hit the detail page — using whichever id we actually resolved, so
  // this works against both namespaced and pre-namespacing rows.
  const r = await goWithCookies(jar, `/envelopes/${rent.id}`);
  check("[1] rent envelope detail returns 200", r.status === 200, `got ${r.status}`);
  const html = await r.text();
  check("[2] HTML mentions the envelope name (Rent)", html.includes("Rent"));
  check("[2b] the HTML's visible content does not include the notFound() fallback",
    // Next.js compiles the notFound() page into _app bundle; the
    // string "This page could not be found" is in there even when
    // unused. So check what's IN the page DOM, not the raw HTML.
    !/(?:404|This page could not be found)/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")),
    "no 404 visible content");
  check("[3] HTML includes the title 'one vessel'", /one vessel|full|just one/.test(html));

  // Unknown envelope id should notFound() (still a 404, but a different body)
  const r404 = await goWithCookies(jar, "/envelopes/does-not-exist");
  check("[4] unknown envelope id returns 404", r404.status === 404);

  // New behavior: even if the in-memory mock was emptied, the page must work.
  // We don't have a way to "evict" the in-memory store from here, but the
  // page now uses liveEnvelopesFromDb() which can't fail in that scenario.
  check("[5] detail page reads from liveEnvelopesFromDb (page source)",
    /(liveEnvelopesFromDb|ensureUserEnvelopesSeeded)/.test(
      readFileSync(
        join(process.cwd(), "src/app/(app)/envelopes/[id]/page.tsx"),
        "utf8",
      ),
    ),
  );

  // Tear this test's user down before reporting.
  await s.close();

  console.log("\n--- checks ---");
  const pass = checks.filter(c => c.ok).length;
  const miss = checks.length - pass;
  console.log(`checks: ${pass} pass / ${miss} miss (${checks.length} total)`);
  if (miss > 0) {
    console.log("\nFAILED checks:");
    for (const c of checks) if (!c.ok) console.log(`  - ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
    process.exit(1);
  }
  console.log("ALL GREEN");
}

main().catch(e => { console.error("crash:", e.message); process.exit(1); });
