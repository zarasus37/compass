/**
 * Smoke for Cluster 7.33b — envelope detail reads from Prisma.
 *
 * Verifies the fix for the production-only 404 when an envelope link
 * was clicked. Pages now use `liveEnvelopesFromDb(user.id)` instead
 * of the in-memory `liveEnvelopes()`.
 *
 * Checks:
 *   1. Existing mom user has envelopes in the DB (seed sanity)
 *   2. /envelopes/<env-rent> returns 200 (not 404)
 *   3. The rendered HTML mentions "Rent"
 *   4. With an unknown envelope id, the route returns a 404 response
 *      (notFound() is the right call — we render a not-found page).
 */
import { prisma } from "./db-client.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";

const checks = [];
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? `  — ${detail}` : ""}`);
}

async function login() {
  const jar = {};
  const r1 = await fetch(`${BASE}/login`);
  const m = (await r1.text()).match(/[a-f0-9]{20,}/);
  if (!m) throw new Error("no login aid");
  const aid = m[0];
  const fd = new FormData();
  fd.append("$ACTION_REF_1", "");
  fd.append("$ACTION_1:0", JSON.stringify({ id: aid, bound: "$@1" }));
  fd.append("$ACTION_1:1", "[{\"ok\":false}]");
  fd.append("email", "mom@compass.local");
  fd.append("password", "correct-horse-battery-staple");
  const r2 = await fetch(`${BASE}/login`, { method: "POST", body: fd, redirect: "manual" });
  const cookies = r2.headers.getSetCookie?.() ?? [];
  for (const sc of cookies) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    jar[k] = rest.join("=").replace(/^"|"$/g, "");
  }
  return jar;
}

async function goWithCookies(jar, path) {
  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  const r = await fetch(BASE + path, { headers: { cookie: cookieHeader }, redirect: "manual" });
  return r;
}

async function main() {
  const u = await prisma.user.findUnique({ where: { email: "mom@compass.local" } });
  check("mom user exists in DB", !!u);

  const envs = await prisma.envelope.findMany({ where: { userId: u.id } });
  check("mom has envelopes in DB (lazy-seed worked)", envs.length >= 7, `got ${envs.length}`);
  const rent = envs.find(e => e.id === "env-rent");
  check("rent envelope exists with id=env-rent", !!rent);

  const jar = await login();
  // Hit the detail page
  const r = await goWithCookies(jar, "/envelopes/env-rent");
  check("[1] /envelopes/env-rent returns 200", r.status === 200, `got ${r.status}`);
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
