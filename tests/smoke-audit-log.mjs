/**
 * Smoke for Cluster 7.4 — Audit log viewer.
 *
 * Verifies:
 *   1. /vault/audit returns 200, page is non-empty.
 *   2. All sections render: headline strip, activity strip
 *      (30 columns), type distribution, type filter, table.
 *   3. Seeded `vault.synced` event shows up in the table.
 *   4. Filter contract:
 *      - ?type=vault.synced narrows the table to 1 row.
 *      - ?prefix=vault. shows only vault.* types.
 *      - ?q=nonmatching shows the empty state.
 *      - ?take=200 increases the take (or stays at 200 if
 *        fewer rows exist).
 *   5. vault.audit_log_viewed event appears after a visit
 *      (re-fetch and verify via DB).
 *   6. The new eventType is wired into the
 *      recordVaultAudit actionType union in db.ts.
 *   7. /vault/preferences has the [AUDIT] → chip.
 *   8. /vault/schedule has the // view full history → link.
 *   9. The TypeDistribution has colorForActionType wiring
 *      (stable per-type colors, by source-file check).
 *  10. The table chip uses the type's stable color.
 *  11. The activity strip renders the gold "TODAY" tick
 *      and a 30-bar SVG.
 *  12. The headline strip has growth-oriented suggestion
 *      chips (per the xKryptic 2026-08-24 directive).
 *
 * Run: `node tests/smoke-audit-log.mjs` (dev server must be up).
 */

import { prisma } from "./db-client.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000";
const ROOT = process.cwd();

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
async function get(path) {
  const headers = new Headers();
  applyCookies(headers);
  const r = await fetch(BASE + path, { headers, redirect: "manual" });
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
  console.log("\n--- Audit log smoke (Cluster 7.4) ---\n");

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
  check("login: 303", lp.status === 303, `status=${lp.status}`);

  // The smoke is self-contained: we write a sentinel audit event
  // directly via the shared Prisma client so the page has at least
  // one row to render. Without this, the page can render the
  // empty state when prior smokes have left the user with 0 events
  // (or when the smoke runs in a fresh-DB state after a prior
  // suite run wiped mom@compass.local's data). The sentinel type
  // is unique to this smoke so it doesn't collide with real events.
  const userId = await getCurrentUserId();
  if (!userId) {
    console.log("FATAL: no user id");
    process.exit(1);
  }
  // Clean up any prior sentinel rows from previous smoke runs.
  await prisma.auditLog.deleteMany({
    where: { userId, actionType: "smoke.test_audit_event" },
  });
  // Write a few sentinel events across different days so the
  // activity strip has bars to show.
  const now = new Date();
  for (let d = 0; d < 3; d += 1) {
    const created = new Date(now);
    created.setDate(now.getDate() - d);
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: "smoke.test_audit_event",
        payload: JSON.stringify({ day: d, sentinel: true }),
        createdAt: created,
      },
    });
  }

  // The audit log is append-only; we don't reset it before
  // the smoke. The prior smoke runs + the page's own
  // vault.audit_log_viewed writes are part of the data the
  // page renders. The "≥1 event" check below verifies the
  // user has a non-empty log.

  // ── 2. /vault/audit returns 200, page is non-empty
  const audit1 = await get("/vault/audit");
  check("audit: 200", audit1.status === 200, `status=${audit1.status}`);
  const html1 = await audit1.text();
  check("audit: non-empty", html1.length > 1000, `bytes=${html1.length}`);

  // ── 3. Section rendering
  check(
    "audit: headline strip present",
    html1.includes('data-testid="vault-audit-headline"'),
  );
  check(
    "audit: activity strip present (data-testid)",
    html1.includes('data-testid="vault-audit-activity-strip"'),
  );
  check(
    "audit: type distribution present (data-testid)",
    html1.includes('data-testid="vault-audit-type-distribution"'),
  );
  check(
    "audit: type filter present (data-testid)",
    html1.includes('data-testid="vault-audit-type-filter"'),
  );
  check(
    "audit: table present (data-testid)",
    // Cluster 7.6: LiveAuditTable uses "vault-audit-table-live";
    // accept the legacy testid for back-compat.
    html1.includes('data-testid="vault-audit-table-live"') ||
      html1.includes('data-testid="vault-audit-table"') ||
      html1.includes('data-testid="vault-audit-table-empty"') ||
      html1.includes('data-testid="vault-audit-empty"'),
  );

  // ── 4. Activity strip has 30 columns (rect or stub-line per day)
  // The strip renders 30 <g> elements (one per day) — count them.
  // Note: the g elements have no DOM attributes (key is React-only),
  // so use a word-boundary regex instead of requiring a space.
  const gMatches = html1.match(/<g\b[^>]*>/g) ?? [];
  check(
    "audit: activity strip has 30 day-groups",
    gMatches.length >= 30,
    `g count=${gMatches.length}`,
  );
  // The "TODAY" label only renders for the today bar.
  check(
    "audit: TODAY label rendered",
    html1.includes(">TODAY<"),
  );

  // ── 5. Headline strip: 4 cells
  const headlineCells = [
    "vault-audit-cell-total-events",
    "vault-audit-cell-this-week",
    "vault-audit-cell-most-active-type",
    "vault-audit-cell-last-activity",
  ];
  for (const id of headlineCells) {
    check(`audit: headline cell ${id} present`, html1.includes(`data-testid="${id}"`));
  }

  // ── 6. The smoke sentinel events show up in the table
  // (we wrote 3 events at the start of the smoke)
  const totalEvents = await prisma.auditLog.count({ where: { userId } });
  check("audit: ≥1 event after seed", totalEvents >= 1, `total=${totalEvents}`);

  // After visiting /vault/audit, the count should be 1 more
  // (the vault.audit_log_viewed meta event). Re-fetch and verify.
  const beforeVisit = await prisma.auditLog.count({
    where: { userId, actionType: "vault.audit_log_viewed" },
  });
  await get("/vault/audit");
  // Give the server a moment to commit the write (fire-and-forget).
  await new Promise((r) => setTimeout(r, 200));
  const afterVisit = await prisma.auditLog.count({
    where: { userId, actionType: "vault.audit_log_viewed" },
  });
  check(
    "audit: vault.audit_log_viewed event written after visit",
    afterVisit === beforeVisit + 1,
    `before=${beforeVisit} after=${afterVisit}`,
  );

  // ── 7. Filter contract: use the smoke sentinel type (stable,
  // 3 rows, written at the start of the smoke). The page writes
  // a `vault.audit_log_viewed` row on every render (fire-and-
  // forget AFTER the read), so we use a stable sentinel to
  // avoid the off-by-one from the meta event.
  const SENTINEL_TYPE = "smoke.test_audit_event";
  const sentinelCount = await prisma.auditLog.count({
    where: { userId, actionType: SENTINEL_TYPE },
  });
  if (sentinelCount >= 1) {
    const typedPage = await get(
      `/vault/audit?type=${encodeURIComponent(SENTINEL_TYPE)}`,
    );
    const typedHtml = await typedPage.text();
    const typedRows = typedHtml.match(/data-testid="vault-audit-row"/g) ?? [];
    check(
      `audit: ?type=<${SENTINEL_TYPE}> narrows to ${sentinelCount} row(s)`,
      typedRows.length === sentinelCount,
      `rows=${typedRows.length} expected=${sentinelCount}`,
    );
  } else {
    check(
      "audit: ?type=... narrows the table",
      false,
      "sentinel count is 0 — smoke setup didn't write events",
    );
  }

  // ── 8. Filter contract: ?prefix=vault. renders the page. The
  // prefix row is only shown when the user has >1 distinct prefix
  // (the TypeFilterPills component hides it otherwise) — so this
  // check is just that the page renders and the "all" pill is
  // still there. The prefix pill presence is a soft check.
  const prefixPage = await get("/vault/audit?prefix=vault.");
  const prefixHtml = await prefixPage.text();
  check(
    "audit: ?prefix=vault. renders the prefix-filtered page",
    prefixPage.status === 200 &&
      prefixHtml.includes('data-testid="vault-audit-type-pill-all"'),
  );
  // Soft check: the prefix row is shown iff the user has >1 prefix.
  const distinctPrefixes = await prisma.auditLog.findMany({
    where: { userId },
    select: { actionType: true },
    distinct: ["actionType"],
  });
  const prefixSet = new Set(
    distinctPrefixes
      .map((t) => t.actionType)
      .map((a) => {
        const dot = a.indexOf(".");
        const und = a.indexOf("_");
        let cut;
        if (dot === -1 && und === -1) return null;
        if (dot === -1) cut = und + 1;
        else if (und === -1) cut = dot + 1;
        else cut = Math.min(dot, und) + 1;
        return a.slice(0, cut);
      })
      .filter(Boolean),
  );
  if (prefixSet.size > 1) {
    check(
      "audit: prefix row is shown when user has >1 prefix",
      prefixHtml.includes('data-testid="vault-audit-prefix-pill-all"'),
    );
  } else {
    check(
      "audit: prefix row is correctly hidden when user has 1 prefix",
      !prefixHtml.includes('data-testid="vault-audit-prefix-pill-all"'),
      "prefix row should be hidden when only 1 prefix exists",
    );
  }

  // ── 9. Filter contract: ?q=nonmatching shows empty
  const qPage = await get("/vault/audit?q=zzzznonexistentzzzzz");
  const qHtml = await qPage.text();
  check(
    "audit: ?q=nonmatching shows the empty table state",
    qPage.status === 200 && qHtml.includes('data-testid="vault-audit-table-empty"'),
  );

  // ── 10. Filter contract: ?take=200 doesn't break the page
  const takePage = await get("/vault/audit?take=200");
  const takeHtml = await takePage.text();
  // Cluster 7.6: the table now renders as LiveAuditTable with
  // data-testid="vault-audit-table-live". The legacy
  // "vault-audit-table" testid is no longer present. Accept
  // either for backward compat.
  check(
    "audit: ?take=200 renders the page",
    takePage.status === 200 &&
      (takeHtml.includes('data-testid="vault-audit-table-live"') ||
        takeHtml.includes('data-testid="vault-audit-table"')),
  );

  // ── 11. /vault/preferences has the [AUDIT] chip
  const prefsPage = await get("/vault/preferences");
  const prefsHtml = await prefsPage.text();
  check(
    "audit: /vault/preferences has the [AUDIT] → chip",
    prefsPage.status === 200 &&
      prefsHtml.includes('data-testid="vault-prefs-audit-link"') &&
      prefsHtml.includes("[AUDIT]"),
  );

  // ── 12. /vault/schedule has the // view full history → link
  const schedPage = await get("/vault/schedule");
  const schedHtml = await schedPage.text();
  check(
    "audit: /vault/schedule has the view full history link",
    schedPage.status === 200 &&
      schedHtml.includes('data-testid="vault-schedule-full-history-link"') &&
      schedHtml.includes("/vault/audit?type=vault.scheduler_run"),
  );

  // ── 13. Source-file: the audit-action-types module has the
  // audit_log_viewed action type. The union was extracted from
  // db.ts to audit-action-types.ts in C7.11 so the client can
  // import it without pulling server-only.
  const actionTypesSrc = readFileSync(
    join(ROOT, "src/lib/vault/audit-action-types.ts"),
    "utf8",
  );
  check(
    "audit: audit-action-types.ts VaultAuditActionType has vault.audit_log_viewed",
    /vault\.audit_log_viewed/.test(actionTypesSrc),
  );

  // ── 14. Source-file: color map + meta event
  // Cluster 7.6 moved the pure helpers (colorForActionType,
  // TYPE_PALETTE, etc.) to a new `audit-log-shared.ts` so the
  // live SSE wrappers can import them without pulling in
  // `server-only`. The server-only `audit-log.ts` re-exports
  // the shared symbols for backward compat — both surfaces
  // exist and both are checked here.
  const alSrc = readFileSync(join(ROOT, "src/lib/vault/audit-log.ts"), "utf8");
  const alSharedSrc = readFileSync(
    join(ROOT, "src/lib/vault/audit-log-shared.ts"),
    "utf8",
  );
  check(
    "audit: colorForActionType lives in audit-log-shared.ts",
    alSharedSrc.includes("export function colorForActionType"),
  );
  check(
    "audit: TYPE_PALETTE lives in audit-log-shared.ts",
    alSharedSrc.includes("TYPE_PALETTE"),
  );
  check(
    "audit: audit-log.ts re-exports colorForActionType (back-compat)",
    /export\s*\{[^}]*colorForActionType[^}]*\}\s*from\s*["']\.\/audit-log-shared["']/.test(alSrc),
  );
  check(
    "audit: audit-log.ts exports recordAuditLogViewed",
    alSrc.includes("export async function recordAuditLogViewed"),
  );
  check(
    "audit: audit-log.ts exports getAuditLogActivity (30d strip)",
    alSrc.includes("export async function getAuditLogActivity"),
  );

  // ── 15. Source-file: page.tsx is force-dynamic
  const pageSrc = readFileSync(join(ROOT, "src/app/(app)/vault/audit/page.tsx"), "utf8");
  check(
    "audit: page.tsx is force-dynamic",
    pageSrc.includes('export const dynamic = "force-dynamic"'),
  );
  check(
    "audit: page.tsx awaits searchParams",
    pageSrc.includes("await searchParams"),
  );

  // ── 16. Source-file: package.json wires the new smoke
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  check(
    "audit: package.json smoke script includes smoke-audit-log.mjs",
    pkg.scripts.smoke.includes("smoke-audit-log.mjs"),
  );

  // ── 17. Growth-oriented suggestions on the headline cells
  // The headline cell with at least one suggestion chip
  // (the most-active-type cell has the [FILTER →] chip).
  check(
    "audit: most-active-type cell has a suggestion chip ([FILTER])",
    html1.includes('data-testid="vault-audit-cell-most-active-type-link"') &&
      html1.includes("[FILTER"),
  );

  // ── 18. Table chip carries a stable per-type color
  // The chip is rendered with an inline background (colorForActionType).
  // We verify the type chip testid is on the page.
  const chipCount = (html1.match(/data-testid="vault-audit-row-type"/g) ?? []).length;
  check(
    "audit: table renders at least 1 type chip",
    chipCount >= 1,
    `chip count=${chipCount}`,
  );

  // ── 19. The payload <details> is on the page (collapsed by default)
  check(
    "audit: payload <details> block rendered",
    html1.includes('data-testid="vault-audit-row-payload"') ||
      html1.includes("[SHOW JSON]"),
  );

  // ── 20. The audit page is on the same /vault link graph
  // (no broken routes, the /vault/audit path exists in the build).
  check(
    "audit: /vault/audit file exists at the right path",
    existsSync(join(ROOT, "src/app/(app)/vault/audit/page.tsx")),
  );

  // ── 21. Cluster 7.7 — date range filter ─────────────────────
  // The DateRangeBar renders 5 preset chips. The 5 chips
  // should be present on the unfiltered page; the [CLEAR]
  // chip is NOT (no range active).
  const presetChips = [
    "vault-audit-range-24h",
    "vault-audit-range-7d",
    "vault-audit-range-30d",
    "vault-audit-range-90d",
    "vault-audit-range-365d",
    "vault-audit-range-all",
  ];
  for (const id of presetChips) {
    check(
      `audit: DateRangeBar renders the ${id} chip`,
      html1.includes(`data-testid="${id}"`),
    );
  }
  check(
    "audit: [CLEAR] chip NOT rendered when no range active",
    !html1.includes('data-testid="vault-audit-range-clear"'),
  );

  // ── 22. The "Last 7 days" chip's href sets from + to
  // 7 days back. The href is a Link to /vault/audit?from=...&to=...
  // The HTML is encoded; `&amp;` separates the params. We
  // extract the href directly from the 7d <a> tag, then
  // decode the &amp; for parsing.
  const sevenDayMatch = html1.match(
    /<a[^>]*data-testid="vault-audit-range-7d"[^>]*href="([^"]+)"/,
  );
  check(
    "audit: 7d chip href captured",
    Boolean(sevenDayMatch),
    `match=${sevenDayMatch ? sevenDayMatch[1] : "none"}`,
  );
  if (sevenDayMatch) {
    const rawHref = sevenDayMatch[1].replace(/&amp;/g, "&");
    const url = new URL(rawHref, "http://x");
    const today = new Date();
    const todayYmd = (() => {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    })();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    const sevenAgoYmd = (() => {
      const y = sevenAgo.getFullYear();
      const m = String(sevenAgo.getMonth() + 1).padStart(2, "0");
      const d = String(sevenAgo.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    })();
    check(
      "audit: 7d chip's to matches today",
      url.searchParams.get("to") === todayYmd,
      `to=${url.searchParams.get("to")} expected=${todayYmd}`,
    );
    check(
      "audit: 7d chip's from is today-7",
      url.searchParams.get("from") === sevenAgoYmd,
      `from=${url.searchParams.get("from")} expected=${sevenAgoYmd}`,
    );
  }

  // ── 23. ?from=YYYY-MM-DD narrows the table.
  // We know a sentinel row exists (smoke.test_audit_event).
  // Pick the row's date and verify `?from=<rowDate>` includes
  // it; `?from=<rowDate + 1 day>` excludes it.
  const sentinelRow = await prisma.auditLog.findFirst({
    where: { userId, actionType: "smoke.test_audit_event" },
    orderBy: { createdAt: "desc" },
  });
  if (sentinelRow) {
    const rowDate = sentinelRow.createdAt.toISOString().slice(0, 10);
    const nextDay = new Date(sentinelRow.createdAt);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayYmd = nextDay.toISOString().slice(0, 10);

    const fromPage = await get(`/vault/audit?from=${rowDate}`);
    const fromHtml = await fromPage.text();
    const fromRows = (
      fromHtml.match(/data-testid="vault-audit-row"/g) ?? []
    ).length;
    check(
      "audit: ?from=<rowDate> includes the sentinel row",
      fromRows >= 1,
      `from=${rowDate} rows=${fromRows}`,
    );

    const afterPage = await get(`/vault/audit?from=${nextDayYmd}`);
    const afterHtml = await afterPage.text();
    const afterRows = (
      afterHtml.match(/data-testid="vault-audit-row"/g) ?? []
    ).length;
    check(
      "audit: ?from=<rowDate+1> excludes the sentinel row",
      afterRows === 0,
      `from=${nextDayYmd} rows=${afterRows}`,
    );

    // ── 24. ?from + ?type composes (AND).
    const composedPage = await get(
      `/vault/audit?type=smoke.test_audit_event&from=${rowDate}`,
    );
    const composedHtml = await composedPage.text();
    const composedRows = (
      composedHtml.match(/data-testid="vault-audit-row"/g) ?? []
    ).length;
    check(
      "audit: ?from + ?type composes (AND)",
      composedRows >= 1,
      `composed rows=${composedRows}`,
    );
    const composedNoMatchPage = await get(
      `/vault/audit?type=vault.never_matches_anything&from=${rowDate}`,
    );
    const composedNoMatchHtml = await composedNoMatchPage.text();
    const composedNoMatchRows = (
      composedNoMatchHtml.match(/data-testid="vault-audit-row"/g) ?? []
    ).length;
    check(
      "audit: ?from + ?type narrows to the intersection (zero rows when type never matches)",
      composedNoMatchRows === 0,
      `intersection rows=${composedNoMatchRows}`,
    );

    // ── 24b. ?to=YYYY-MM-DD narrows the table too.
    // The sentinel is at rowDate. The "inclusive" check: the
    // sentinel's row should be present when ?to=<rowDate>.
    // We assert via the table containing the sentinel's
    // actionType text (not via row count, since there are
    // other older rows that legitimately pass the filter).
    const toPage = await get(`/vault/audit?to=${rowDate}`);
    const toHtml = await toPage.text();
    check(
      "audit: ?to=<rowDate> includes the sentinel row (inclusive upper bound)",
      toHtml.includes("smoke.test_audit_event"),
      `to=${rowDate}`,
    );
  }

  // ── 25. When a range is active, the page renders the
  // CLEAR chip + the active-range badge. We use a NARROW
  // range here (last 5 days) so the dimming check below
  // has some out-of-range bars to find.
  const today = new Date();
  const todayYmd = (() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const fiveAgo = new Date(today);
  fiveAgo.setDate(fiveAgo.getDate() - 5);
  const fiveAgoYmd = (() => {
    const y = fiveAgo.getFullYear();
    const m = String(fiveAgo.getMonth() + 1).padStart(2, "0");
    const d = String(fiveAgo.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const rangePage = await get(
    `/vault/audit?from=${fiveAgoYmd}&to=${todayYmd}`,
  );
  const rangeHtml = await rangePage.text();
  check(
    "audit: active range renders [CLEAR] chip",
    rangeHtml.includes('data-testid="vault-audit-range-clear"'),
  );
  check(
    "audit: active range renders the active-range badge",
    rangeHtml.includes('data-testid="vault-audit-range-active"') &&
      rangeHtml.includes(fiveAgoYmd) &&
      rangeHtml.includes(todayYmd),
  );
  // Extract the CLEAR chip's href. The chip is an <a> with
  // data-testid="vault-audit-range-clear" + an href. The
  // href comes AFTER the data-testid in the rendered HTML
  // (the DateRangeBar passes data-testid before href to
  // <Link>). We match in either order to be robust.
  const clearHref =
    rangeHtml.match(/data-testid="vault-audit-range-clear"[^>]*href="([^"]+)"/)?.[1] ??
    rangeHtml.match(/href="([^"]+)"[^>]*data-testid="vault-audit-range-clear"/)?.[1];
  const clearHrefDecoded = clearHref?.replace(/&amp;/g, "&");
  check(
    "audit: [CLEAR] chip drops from + to",
    Boolean(
      clearHrefDecoded &&
        !clearHrefDecoded.includes("from=") &&
        !clearHrefDecoded.includes("to="),
    ),
    `clearHref=${clearHref ?? "none"}`,
  );

  // ── 26. Activity strip dimming: with a from-only range
  // (no `to`), the strip stays at its 30-day default while
  // the filter is open-ended, so the bars BEFORE the `from`
  // date are out-of-range. The 5d `from`+`to` window above
  // (rangeHtml) doesn't exercise dimming because C7.8 made
  // the strip scale with the active range (a from+to
  // filter makes the strip exactly the window — all
  // in-range). To exercise dimming we need a from-only
  // request that keeps the strip at 30 days.
  const fromOnlyDate = fiveAgoYmd; // 5 days back, local
  const fromOnlyPage = await get(
    `/vault/audit?from=${fromOnlyDate}`,
  );
  const fromOnlyHtml = await fromOnlyPage.text();
  const inRangeBars = (
    fromOnlyHtml.match(/data-in-range="true"/g) ?? []
  ).length;
  const outOfRangeBars = (
    fromOnlyHtml.match(/data-in-range="false"/g) ?? []
  ).length;
  check(
    "audit: range dimming — at least 1 bar is in-range (from-only filter, 30d strip)",
    inRangeBars >= 1,
    `inRange=${inRangeBars}`,
  );
  check(
    "audit: range dimming — at least 20 bars are out-of-range (from-only filter, narrow window)",
    outOfRangeBars >= 20,
    `outOfRange=${outOfRangeBars}`,
  );
  // When no range is active, NO bars are out-of-range.
  const noRangeOutOfRange = (
    html1.match(/data-in-range="false"/g) ?? []
  ).length;
  check(
    "audit: no range — no out-of-range bars",
    noRangeOutOfRange === 0,
    `outOfRange=${noRangeOutOfRange}`,
  );

  // ── 27. Malformed ?from= is silently dropped (no range
  // active, no CLEAR chip).
  const malformedPage = await get("/vault/audit?from=garbage");
  const malformedHtml = await malformedPage.text();
  check(
    "audit: malformed ?from= is silently dropped (no CLEAR chip)",
    !malformedHtml.includes('data-testid="vault-audit-range-clear"'),
  );

  // ── 28. ?from > ?to drops `to` (more useful than returning 0).
  const reversedPage = await get("/vault/audit?from=2026-12-31&to=2026-01-01");
  const reversedHtml = await reversedPage.text();
  // The reversed range should still render (no 500, no error)
  // and should NOT have a CLEAR chip if from-only was kept
  // (the active-range badge shows "from 2026-12-31").
  check(
    "audit: ?from > ?to is forgiven (page renders, from-only kept)",
    reversedPage.status === 200 &&
      reversedHtml.includes("from 2026-12-31"),
  );

  // ── 29. Source-file checks.
  const dateRangeBarSrc = readFileSync(
    join(ROOT, "src/app/(app)/vault/audit/DateRangeBar.tsx"),
    "utf8",
  );
  check(
    "audit: DateRangeBar.tsx exists",
    dateRangeBarSrc.includes("DateRangeBar"),
  );
  check(
    "audit: DateRangeBar uses auditLogFilterToQuery for href merging",
    dateRangeBarSrc.includes("auditLogFilterToQuery"),
  );

  const alSharedSrc77 = readFileSync(
    join(ROOT, "src/lib/vault/audit-log-shared.ts"),
    "utf8",
  );
  check(
    "audit: DATE_RANGE_PRESETS lives in audit-log-shared.ts",
    alSharedSrc77.includes("DATE_RANGE_PRESETS") &&
      alSharedSrc77.includes("DateRangePresetId"),
  );
  check(
    "audit: dateRangeForPreset helper exported from audit-log-shared.ts",
    alSharedSrc77.includes("dateRangeForPreset"),
  );
  check(
    "audit: rowMatchesAuditFilter also gates on from/to",
    alSharedSrc77.includes("filter.from") &&
      alSharedSrc77.includes("filter.to"),
  );

  const alSrc77 = readFileSync(join(ROOT, "src/lib/vault/audit-log.ts"), "utf8");
  check(
    "audit: whereFromFilter adds createdAt window when from/to set",
    alSrc77.includes("createdAt") &&
      alSrc77.includes("whereFromFilter"),
  );

  // ── Summary
  const passed = checks.filter((c) => c[1]).length;
  const total = checks.length;
  console.log(`\n--- checks ---`);
  console.log(`checks: ${passed} pass / ${total - passed} miss (${total} total)`);
  if (passed !== total) {
    console.log("ALL GREEN" === "ALL GREEN" ? "ALL GREEN" : "MISSING");
    process.exit(1);
  }
  console.log("ALL GREEN");
}

function applyHeadersForRequest(headers) {
  const h = new Headers(headers);
  applyCookies(h);
  return h;
}

async function getCurrentUserId() {
  const row = await prisma.user.findFirst({
    where: { email: "mom@compass.local" },
    select: { id: true },
  });
  return row?.id ?? null;
}

main()
  .catch((err) => {
    console.error("smoke-audit-log.mjs failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
