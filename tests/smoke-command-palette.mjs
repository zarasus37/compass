/**
 * Smoke for Cluster 7.1 — ⌘K command palette.
 *
 * Verifies:
 *   1. /api/command-palette returns 200 with the right
 *      index shape (routes + items + total) for the
 *      signed-in user.
 *   2. The TopAppBar renders the [⌘K] Search button on
 *      every signed-in page.
 *   3. The static route index has the expected pages
 *      (21 routes including Vault, Goals, Advisor, etc.).
 *   4. The dynamic items include envelopes, goals, bills,
 *      accounts (with the right kind + href shape).
 *   5. The command palette dialog is NOT rendered when
 *      closed (only the search button is on the initial
 *      page load).
 *   6. Unauthenticated request to /api/command-palette
 *      returns 401.
 *   7. The search button has the right aria-label + the
 *      [⌘ K] / [Ctrl K] kbd hint.
 *
 * The smoke does NOT exercise the ⌘K keydown handler (which
 * is a client-side window listener — Playwright would be
 * needed to simulate it; the existing smoke harness is
 * HTTP-only).
 *
 * Run: `node tests/smoke-command-palette.mjs` (dev server up).
 */

import { prisma } from "./db-client.mjs";

const BASE = "http://127.0.0.1:3000";

const jar = {};
function applyCookies(headers) {
  const cookies = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookies) headers.set("cookie", cookies);
}
function captureSetCookies(headers) {
  const list = headers.getSetCookie?.() ?? [];
  for (const sc of list) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    if (!k) continue;
    const v = rest.join("=").replace(/^"|"$/g, "");
    if (v === "" || /Expires=.*1970/i.test(sc)) delete jar[k];
    else jar[k] = v;
  }
}
async function get(path, { allow401 = false } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const r = await fetch(BASE + path, { headers, redirect: "manual" });
  captureSetCookies(r.headers);
  if (!allow401 && r.status === 401) {
    throw new Error(`401 on ${path}`);
  }
  return r;
}
async function postJson(path, body) {
  const headers = new Headers({ "content-type": "application/json" });
  applyCookies(headers);
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  captureSetCookies(r.headers);
  return r;
}
function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  m = html.match(/\$ACTION_ID_([a-f0-9]{20,})/);
  if (m) return m[1];
  return null;
}
async function postForm(path, fields, { actionId, kind = "plain" } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (actionId && kind === "bound") {
    form.append("$ACTION_REF_1", "");
    form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
    form.append("$ACTION_1:1", "[{\"ok\":false}]");
  } else if (actionId) {
    form.append(`$ACTION_ID_${actionId}`, "");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
  });
  captureSetCookies(r.headers);
  return r;
}

const log = (k, v) => console.log(`[${k}] ${v}`);
const checks = [];
function check(name, cond, detail) {
  const ok = Boolean(cond);
  checks.push([name, ok, detail]);
  log(name, ok ? "OK" : (detail ?? "MISS"));
}

async function main() {
  console.log("\n--- Command palette smoke (Cluster 7.1) ---\n");

  // ── 1. Login + reset
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) {
    console.log("FATAL: no login aid");
    process.exit(1);
  }
  const lp = await postForm(
    "/login",
    { email: "mom@compass.local", password: "correct-horse-battery-staple" },
    { actionId: loginAid, kind: "bound" },
  );
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) {
    console.log("FATAL: login failed");
    process.exit(1);
  }
  const r1Reset = await postJson("/api/reset-seed");
  log("reset", `status=${r1Reset.status}`);

  // ── 2. The TopAppBar renders the [⌘K] Search button on
  // every signed-in page. Test on /vault (the most populous
  // page), then verify a few others.
  const v0 = await get("/vault");
  const v0Text = await v0.text();
  check("/vault returns 200", v0.status === 200, `got ${v0.status}`);
  check(
    "/vault has the topbar-search-button",
    v0Text.includes("topbar-search-button"),
    "search button not on /vault",
  );
  check(
    "search button has the right aria-label",
    /aria-label="Open command palette"/.test(v0Text),
    "aria-label not on the search button",
  );
  check(
    "search button shows the [⌘ K] or [Ctrl K] kbd hint",
    /⌘\s*K|Ctrl\s*K/.test(v0Text),
    "kbd hint missing",
  );

  // ── 3. The search button is on multiple pages (it's part
  // of the layout, so it appears on every page in the (app)
  // group).
  for (const path of ["/", "/envelopes", "/goals", "/obligations", "/vault/preferences", "/settings"]) {
    const r = await get(path);
    const t = await r.text();
    check(
      `${path} has the search button`,
      t.includes("topbar-search-button"),
      `search button missing on ${path}`,
    );
  }

  // ── 4. The command palette dialog is NOT rendered when
  // closed (only the search button is on the initial
  // page load). The dialog only mounts when the user opens
  // it via the button or the ⌘K shortcut.
  check(
    "command palette dialog is NOT rendered when closed",
    !v0Text.includes('data-testid="command-palette"'),
    "command palette dialog rendered on initial /vault load",
  );

  // ── 5. /api/command-palette returns the search index.
  const api = await get("/api/command-palette");
  const apiJson = await api.json();
  check(
    "/api/command-palette returns 200",
    api.status === 200,
    `got ${api.status}`,
  );
  check(
    "/api/command-palette returns ok: true",
    apiJson.ok === true,
    `got ok=${apiJson.ok}`,
  );
  check(
    "/api/command-palette returns the routes array",
    Array.isArray(apiJson.index?.routes),
    `routes=${typeof apiJson.index?.routes}`,
  );
  check(
    "/api/command-palette returns the items array",
    Array.isArray(apiJson.index?.items),
    `items=${typeof apiJson.index?.items}`,
  );
  check(
    "/api/command-palette returns the total",
    typeof apiJson.index?.total === "number",
    `total=${typeof apiJson.index?.total}`,
  );

  // ── 6. The static route index has the expected pages.
  const routes = apiJson.index.routes;
  const hrefs = new Set(routes.map((r) => r.href));
  for (const required of [
    "/",
    "/period",
    "/calendar",
    "/insights",
    "/accounts",
    "/transactions",
    "/envelopes",
    "/allocation",
    "/obligations",
    "/vault",
    "/vault/preferences",
    "/debts",
    "/holdings",
    "/goals",
    "/learn/field-guide",
    "/learn/your-numbers",
    "/advisor",
    "/learn/glossary",
    "/learn/habit-quiz",
    "/settings",
    "/onboarding",
  ]) {
    check(
      `static route index has ${required}`,
      hrefs.has(required),
      `missing ${required}`,
    );
  }
  check(
    "static route index has 21 routes",
    routes.length === 21,
    `got ${routes.length}`,
  );

  // ── 7. The static route index has the right kind +
  // chapter shape.
  const periodRoute = routes.find((r) => r.href === "/period");
  check(
    "Period route has kind: ROUTE",
    periodRoute?.kind === "ROUTE",
    `got ${periodRoute?.kind}`,
  );
  check(
    "Period route has chapter: Overview",
    periodRoute?.chapter === "Overview",
    `got ${periodRoute?.chapter}`,
  );
  check(
    "Period route has a sub",
    typeof periodRoute?.sub === "string" && periodRoute.sub.length > 0,
    `got ${periodRoute?.sub}`,
  );

  // ── 8. The dynamic items include envelopes, goals, bills,
  // accounts.
  const items = apiJson.index.items;
  const envItems = items.filter((i) => i.kind === "ENV");
  const goalItems = items.filter((i) => i.kind === "GOAL");
  const billItems = items.filter((i) => i.kind === "BILL");
  const accountItems = items.filter((i) => i.kind === "ACC");
  const debtItems = items.filter((i) => i.kind === "DEBT");
  check(
    "items include envelopes (>=7 from seed)",
    envItems.length >= 7,
    `got ${envItems.length}`,
  );
  check(
    "items include goals (>=4 from seed)",
    goalItems.length >= 4,
    `got ${goalItems.length}`,
  );
  check(
    "items include bills (>=6 from seed)",
    billItems.length >= 6,
    `got ${billItems.length}`,
  );
  check(
    "items include at least 1 account",
    accountItems.length >= 1,
    `got ${accountItems.length}`,
  );
  check(
    "items include at least 1 debt (from in-memory store)",
    debtItems.length >= 1,
    `got ${debtItems.length}`,
  );

  // ── 9. Item shape (each has href, title, kind, sub).
  const sampleEnv = envItems[0];
  check(
    "envelope item has href, title, kind, sub",
    !!sampleEnv?.href &&
      !!sampleEnv?.title &&
      sampleEnv.kind === "ENV" &&
      typeof sampleEnv.sub === "string",
    `shape mismatch: ${JSON.stringify(sampleEnv).slice(0, 200)}`,
  );
  check(
    "envelope item href is /envelopes/[id]",
    /^\/envelopes\/[a-zA-Z0-9_-]+$/.test(sampleEnv?.href ?? ""),
    `got ${sampleEnv?.href}`,
  );

  // ── 10. Total = routes + items
  const expectedTotal = routes.length + items.length;
  check(
    `total = routes (${routes.length}) + items (${items.length}) = ${expectedTotal}`,
    apiJson.index.total === expectedTotal,
    `got total=${apiJson.index.total}`,
  );

  // ── 11. Unauthenticated /api/command-palette returns 401
  // OR 307 (redirect to /login by the middleware). Either
  // response indicates the endpoint is auth-gated.
  // Reset the jar to clear the session cookie.
  Object.keys(jar).forEach((k) => delete jar[k]);
  const apiUnauth = await get("/api/command-palette", { allow401: true });
  check(
    "unauthenticated /api/command-palette returns 401 or 307 (auth-gated)",
    apiUnauth.status === 401 || apiUnauth.status === 307,
    `got ${apiUnauth.status}`,
  );

  // Re-login (we need the session to continue testing).
  const lr2 = await get("/login");
  const loginAid2 = extractActionId(await lr2.text());
  await postForm(
    "/login",
    { email: "mom@compass.local", password: "correct-horse-battery-staple" },
    { actionId: loginAid2, kind: "bound" },
  );

  // ── 12. /api/command-palette?q=period returns the right
  // ranked results.
  const qp = await get("/api/command-palette?q=period");
  const qpJson = await qp.json();
  check(
    "/api/command-palette?q=period returns 200",
    qp.status === 200,
    `got ${qp.status}`,
  );
  check(
    "/api/command-palette?q=period returns the query field",
    qpJson.query === "period",
    `got query=${qpJson.query}`,
  );
  check(
    "/api/command-palette?q=period returns resultCount > 0",
    qpJson.resultCount > 0,
    `got resultCount=${qpJson.resultCount}`,
  );
  // The first result should be the Period route (exact match).
  check(
    "first result for q=period is the Period route (rank 0)",
    qpJson.results?.[0]?.id === "route:/period",
    `got first=${qpJson.results?.[0]?.id}`,
  );

  // ── 13. /api/command-palette?q= returns everything (empty
  // query returns the full index).
  const qa = await get("/api/command-palette?q=");
  const qaJson = await qa.json();
  check(
    "empty query returns all items",
    qaJson.resultCount === qaJson.index.total,
    `resultCount=${qaJson.resultCount} total=${qaJson.index.total}`,
  );

  // ── 14. /api/command-palette?q=nonsense returns 0 results.
  const qn = await get("/api/command-palette?q=zzzzz-no-match");
  const qnJson = await qn.json();
  check(
    "nonsense query returns 0 results",
    qnJson.resultCount === 0,
    `got resultCount=${qnJson.resultCount}`,
  );

  // ── 15. Match ranking: prefix > substring.
  // The "Goals" route has title "Goals" (starts with "g" when
  // lowercased). The "Emergency Fund" goal contains "g" but
  // doesn't start with it. So q=g should rank Goals first.
  const qg = await get("/api/command-palette?q=g");
  const qgJson = await qg.json();
  const goalsResult = qgJson.results.find((r) => r.id === "route:/goals");
  const emergencyResult = qgJson.results.find(
    (r) => r.id.startsWith("goal:") && /emergency/i.test(r.id),
  );
  check(
    "q=g finds the Goals route",
    !!goalsResult,
    `goals result not found in ${qgJson.results.length} results`,
  );
  check(
    "Goals route ranks better than Emergency Fund for q=g",
    goalsResult && emergencyResult
      ? goalsResult.rank < emergencyResult.rank
      : false,
    `goals.rank=${goalsResult?.rank} emergency.rank=${emergencyResult?.rank}`,
  );

  // ── 16. The q= search returns the same total when no
  // query is provided (the smoke is verifying the endpoint
  // is consistent).
  check(
    "endpoint with q= has same index.total as without q",
    qaJson.index.total === apiJson.index.total,
    `with-q total=${qaJson.index.total} without-q total=${apiJson.index.total}`,
  );

  // ── 17. Cluster 7.2 — recent items wire format.
  // The recent items are pure client state (localStorage),
  // so the server returns recentCount: 0. The smoke locks in
  // the field exists; the actual list lives in the browser.
  check(
    "/api/command-palette returns recentCount field",
    typeof qaJson.recentCount === "number",
    `got recentCount=${qaJson.recentCount}`,
  );
  check(
    "/api/command-palette recentCount is 0 (server-side, no localStorage access)",
    qaJson.recentCount === 0,
    `got recentCount=${qaJson.recentCount}`,
  );

  // ── 18. The recent-items source file has the right shape.
  // (Source check, not HTTP — localStorage is a client-only
  // API and the smoke harness is HTTP-only.)
  const fs = await import("node:fs");
  const recentSrc = fs.readFileSync(
    "src/lib/command-palette/recent-items.ts",
    "utf8",
  );
  check(
    "recent-items.ts exports getRecent",
    /export function getRecent/.test(recentSrc),
    "getRecent not exported",
  );
  check(
    "recent-items.ts exports pushRecent",
    /export function pushRecent/.test(recentSrc),
    "pushRecent not exported",
  );
  check(
    "recent-items.ts exports clearRecent",
    /export function clearRecent/.test(recentSrc),
    "clearRecent not exported",
  );
  check(
    "recent-items.ts uses localStorage key 'compass-palette-recent'",
    /STORAGE_KEY\s*=\s*"compass-palette-recent"/.test(recentSrc),
    "STORAGE_KEY missing or wrong",
  );
  check(
    "recent-items.ts has MAX_RECENT = 8",
    /MAX_RECENT\s*=\s*8/.test(recentSrc),
    "MAX_RECENT missing or wrong",
  );
  check(
    "recent-items.ts is SSR-safe (checks for localStorage undefined)",
    /typeof localStorage === "undefined"/.test(recentSrc),
    "SSR guard missing",
  );

  // ── 19. The CommandPalette.tsx imports + uses the recent
  // items module.
  const paletteSrc = fs.readFileSync(
    "src/components/command-palette/CommandPalette.tsx",
    "utf8",
  );
  check(
    "CommandPalette imports getRecent",
    /import\s*\{[^}]*\bgetRecent\b[^}]*\}\s*from\s*["']@\/lib\/command-palette\/recent-items["']/.test(
      paletteSrc,
    ),
    "getRecent import missing",
  );
  check(
    "CommandPalette imports pushRecent",
    /import\s*\{[^}]*\bpushRecent\b[^}]*\}\s*from\s*["']@\/lib\/command-palette\/recent-items["']/.test(
      paletteSrc,
    ),
    "pushRecent import missing",
  );
  check(
    "CommandPalette calls pushRecent in the navigate function",
    /pushRecent\(item\)/.test(paletteSrc),
    "pushRecent not called in navigate",
  );
  check(
    "CommandPalette renders the RECENT section header",
    /command-palette-recent-header/.test(paletteSrc),
    "RECENT section header missing",
  );
  check(
    "CommandPalette reads recent on open",
    /setRecent\(getRecent\(\)\)/.test(paletteSrc),
    "recent not read on open",
  );

  // ── 12. The match function exists and is exported (we
  // verify via the /api/command-palette payload structure
  // since the function is pure; the index shape mirrors the
  // items it would be called with).
  check(
    "search index items have an `id` field for React keys",
    items.every((i) => typeof i.id === "string" && i.id.length > 0),
    `one or more items missing id`,
  );

  // ── 13. Direct DB read of seed counts to confirm the
  // items are sourced from the user's real data.
  const user = await prisma.user.findUnique({
    where: { email: "mom@compass.local" },
  });
  const [envCount, goalCount, billCount, accountCount] = await Promise.all([
    prisma.envelope.count({ where: { userId: user.id, isArchived: false } }),
    prisma.goal.count({ where: { userId: user.id, isArchived: false } }),
    prisma.bill.count({ where: { userId: user.id, isArchived: false } }),
    prisma.account.count({ where: { userId: user.id, isArchived: false } }),
  ]);
  check(
    "envelope item count == DB envelope count",
    envItems.length === envCount,
    `palette=${envItems.length} db=${envCount}`,
  );
  check(
    "goal item count == DB goal count",
    goalItems.length === goalCount,
    `palette=${goalItems.length} db=${goalCount}`,
  );
  check(
    "bill item count == DB bill count",
    billItems.length === billCount,
    `palette=${billItems.length} db=${billCount}`,
  );
  check(
    "account item count == DB account count",
    accountItems.length === accountCount,
    `palette=${accountItems.length} db=${accountCount}`,
  );

  // ── Summary
  const total = checks.length;
  const pass = checks.filter((c) => c[1]).length;
  const miss = total - pass;
  console.log(`\n--- checks: ${pass} pass / ${miss} miss (${total} total) ---`);
  if (miss > 0) {
    console.log("\nFailing checks:");
    for (const [n, ok, d] of checks) {
      if (!ok) console.log(`  - ${n}${d ? ` :: ${d}` : ""}`);
    }
  }
  console.log(miss === 0 ? "ALL GREEN" : "FAILED");
  process.exit(miss === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
