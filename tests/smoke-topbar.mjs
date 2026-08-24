/**
 * Smoke for the TopAppBar (Sovereign Monad / vessel design system).
 *
 * Walks: login → fetch a list of pages → assert the bar's three
 * regions are present on each.
 *
 * The bar's elements (vessel redesign):
 *   - Brand: pulsing accent dot + "Sovereign Monad" wordmark
 *   - Cycle: "CYCLE: AUG 15 ↔ AUG 29" chip with a thin progress
 *     rail on the right edge
 *   - Engine: a <form action={toggleEngineAction}> with a
 *     <button aria-label="Current engine: ⚙ L1 RULES ENGINE. Click
 *     to toggle."> pill + a separate <a href="/settings"> cog
 *
 * The aria-label still encodes the engine state so screen readers
 * and the engine-toggle smoke can both detect it. The visual label
 * carries a leading glyph (⚙ L1 / ⚡ L2) for high-contrast reading.
 *
 * Run with: node tests/smoke-topbar.mjs
 *
 * Requires the dev server on 127.0.0.1:3000.
 */

const BASE = "http://127.0.0.1:3000";

// ---------- Cookie jar ----------

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
async function postForm(path, fields, { actionId } = {}) {
  const headers = new Headers();
  applyCookies(headers);
  const form = new FormData();
  if (actionId) {
    form.append("$ACTION_REF_1", "");
    form.append("$ACTION_1:0", JSON.stringify({ id: actionId, bound: "$@1" }));
    form.append("$ACTION_1:1", "[\"$undefined\"]");
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const r = await fetch(BASE + path, { method: "POST", headers, body: form, redirect: "manual" });
  captureSetCookies(r.headers);
  return r;
}
function extractActionId(html) {
  let m = html.match(/"id":"([a-f0-9]{20,})"/);
  if (m) return m[1];
  m = html.match(/&quot;id&quot;:&quot;([a-f0-9]{20,})&quot;/);
  if (m) return m[1];
  return null;
}

const log = (k, v) => console.log(`[${k}] ${v}`);

// ---------- Pages to verify ----------

const PAGES = [
  { path: "/",              label: "dashboard"    },
  { path: "/envelopes",     label: "envelopes"    },
  { path: "/period",        label: "period"       },
  { path: "/insights",      label: "insights"     },
  { path: "/settings",      label: "settings"     },
  { path: "/transactions",  label: "transactions" },
];

// ---------- Main ----------

async function main() {
  console.log("--- TopAppBar smoke (vessel) ---\n");

  // Login
  const lr = await get("/login");
  const loginAid = extractActionId(await lr.text());
  if (!loginAid) { console.log("FATAL: no login aid"); process.exit(1); }
  const lp = await postForm("/login", {
    email: "mom@compass.local",
    password: "correct-horse-battery-staple",
  }, { actionId: loginAid });
  log("login", `status=${lp.status} session=${!!jar["compass_session"]}`);
  if (!jar["compass_session"]) { console.log("FATAL: login failed"); process.exit(1); }

  // Walk every page; for each, check the bar's elements.
  const results = [];
  for (const p of PAGES) {
    const r = await get(p.path);
    const html = await r.text();
    // Strip React 19 hydration comments so adjacent <span> children
    // are matched as one continuous chunk.
    const stripped = html.replace(/<!--\s*-->/g, "");

    // === Bar surface ===
    const hasBar = /class="top-app-bar"/.test(html);
    const hasBarAria = /aria-label="Sovereign Monad — top bar"/.test(html);

    // === Brand region ===
    const hasBrandAria = /aria-label="Sovereign Monad — home"/.test(html);
    const hasWordmark = />Sovereign Monad</.test(stripped);
    const hasAccentDot =
      /background:var\(--vessel-accent\)/.test(html) &&
      /border-radius:50%/.test(html);

    // === Cycle region ===
    const hasCycleLabel = />CYCLE:</.test(stripped);
    // The cycle chip shows the date range like "AUG 15 ↔ AUG 29".
    // We look for two MONTH-DAY chunks separated by the ↔ glyph.
    const hasCycleRange = /[A-Z]{3} \d+[\s\S]*?↔[\s\S]*?[A-Z]{3} \d+/.test(stripped);
    // The cycle chip's parent <div> applies `color: var(--vessel-accent)`;
    // the inner date <span> inherits the color rather than redeclaring it.
    // The chip carries the class "top-app-bar-cycle" — anchor the regex on it.
    const hasCycleColor =
      /class="top-app-bar-cycle"[^>]*color:var\(--vessel-accent\)/.test(html);
    // The mini progress rail (60×2 px accent fill) lives inside the chip.
    // The fill width is a decimal percentage (e.g. 21.4285…%), so allow
    // \d+ with an optional fraction.
    const hasCycleProgress =
      /position:absolute;inset:0 auto 0 0;width:\d+(?:\.\d+)?%;background:var\(--vessel-accent\)/.test(html);

    // === Engine region ===
    const hasEngineBtn =
      /aria-label="Current engine: [^"]+Click to toggle\."/.test(html);
    // The visible label is "⚙ L1 RULES ENGINE" or "⚡ L2 AI ENGINE".
    const hasEngineLabel =
      /(⚙|⚡)\s*(L1 RULES ENGINE|L2 AI ENGINE)/.test(stripped);
    // Engine level text (L1 or L2) somewhere in the bar.
    const hasEngineLevel = /L1 RULES ENGINE|L2 AI ENGINE/.test(stripped);
    // Cog links to /settings.
    const hasEngineCog =
      /<a[^>]*aria-label="Open settings"[^>]*href="\/settings"/.test(html);

    // === Form/action (toggled via server-action form) ===
    const hasForm =
      /<form action="" encType="multipart\/form-data" method="POST"/.test(html) ||
      /<form[^>]*method="POST"[^>]*>/.test(html);

    // === Vessel styling markers ===
    const hasVesselBg = /background:var\(--vessel-dark\)/.test(html);
    const hasVesselBorder = /border-bottom:1px solid var\(--vessel-border\)/.test(html);

    results.push({
      label: p.label,
      status: r.status,
      hasBar, hasBarAria,
      hasBrandAria, hasWordmark, hasAccentDot,
      hasCycleLabel, hasCycleRange, hasCycleColor, hasCycleProgress,
      hasEngineBtn, hasEngineLabel, hasEngineLevel, hasEngineCog,
      hasForm,
      hasVesselBg, hasVesselBorder,
    });
    log(
      p.label,
      `bar=${hasBar} brand=${hasBrandAria} cycle=${hasCycleRange} ` +
      `engineBtn=${hasEngineBtn} cog=${hasEngineCog} ` +
      `vessel=${hasVesselBg && hasVesselBorder}`,
    );
  }

  // ---------- Checks ----------

  const checks = [];
  for (const r of results) {
    checks.push([`${r.label}: 200`, r.status === 200]);
    checks.push([`${r.label}: top-app-bar class present`, r.hasBar]);
    checks.push([`${r.label}: bar aria-label (Sovereign Monad)`, r.hasBarAria]);
    checks.push([`${r.label}: brand link aria-label`, r.hasBrandAria]);
    checks.push([`${r.label}: wordmark "Sovereign Monad" present`, r.hasWordmark]);
    checks.push([`${r.label}: pulsing accent dot present`, r.hasAccentDot]);
    checks.push([`${r.label}: CYCLE: label present`, r.hasCycleLabel]);
    checks.push([`${r.label}: CYCLE range (MONTH DAY ↔ MONTH DAY) present`, r.hasCycleRange]);
    checks.push([`${r.label}: CYCLE date in vessel-accent`, r.hasCycleColor]);
    checks.push([`${r.label}: cycle progress rail present`, r.hasCycleProgress]);
    checks.push([`${r.label}: engine toggle button present`, r.hasEngineBtn]);
    checks.push([`${r.label}: engine toggle label (L1 RULES / L2 AI) present`, r.hasEngineLabel]);
    checks.push([`${r.label}: engine level text present`, r.hasEngineLevel]);
    checks.push([`${r.label}: engine cog links to /settings`, r.hasEngineCog]);
    checks.push([`${r.label}: engine toggle is a <form> (POST)`, r.hasForm]);
    checks.push([`${r.label}: vessel-dark background applied`, r.hasVesselBg]);
    checks.push([`${r.label}: vessel-border applied`, r.hasVesselBorder]);
  }

  console.log("\n--- checks ---");
  let pass = 0, fail = 0;
  for (const [name, cond] of checks) {
    const ok = Boolean(cond);
    log(name, ok ? "OK" : "MISS");
    if (ok) pass++; else fail++;
  }
  console.log(`\nchecks: ${pass} pass / ${fail} miss`);

  if (fail > 0) { console.log("\n!! FAILURES"); process.exit(3); }
  console.log("\nALL GREEN");
}

main().catch((e) => {
  console.error("crash:", e);
  process.exit(1);
});
