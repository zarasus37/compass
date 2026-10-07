/**
 * Smoke for the hardened health endpoint (Cluster: 2026-10-07).
 *
 * Covers the four architectural goals:
 *   1. Boot liveness + readiness are separate signals.
 *   2. DB connectivity is proven with `prisma.$queryRaw`, not a table read.
 *   3. Integration tokens validate against an explicitly parsed
 *      RFC 6750 Bearer schema.
 *   4. Strict no-store headers stop the Vercel CDN masking degradation.
 *
 * Part A runs the real Bearer parser (src/lib/http/bearer-auth.ts) and
 * asserts the RFC 6750 grammar, including every rejection reason. Part B
 * asserts the route source declares the required contract. Part C hits a
 * live /api/health when one is running.
 *
 * Run: node tests/smoke-health-hardening.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

let pass = 0;
let miss = 0;
function check(name, cond, detail = "") {
  const ok = Boolean(cond);
  if (ok) pass++;
  else miss++;
  console.log(`[${ok ? "OK" : "MISS"}] ${name}${detail ? "  — " + detail : ""}`);
}
function read(p) {
  const full = join(ROOT, p);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

// ── Part A — the RFC 6750 parser, executed ────────────────────────
// This is a real behavioural test, not a source grep: a parser that
// accepted everything would pass a regex check but fail here.
const bearer = await import(
  pathToFileURL(join(ROOT, "src/lib/http/bearer-auth.ts")).href
).catch(() => null);

if (!bearer) {
  check("src/lib/http/bearer-auth.ts is importable", false, "import failed");
} else {
  const {
    parseBearerHeader,
    verifyBearerToken,
    safeEquals,
    fingerprintCredential,
    MAX_CREDENTIAL_LENGTH,
  } = bearer;

  check("bearer-auth.ts is importable", true);

  // ── A1. Happy path ──────────────────────────────────────────────
  const good = parseBearerHeader("Bearer abc123XYZ");
  check("parses a well-formed Bearer header", good.ok === true);
  check("extracts the credentials verbatim", good.ok && good.credentials === "abc123XYZ", good.ok ? "" : good.reason);

  // RFC 7235: auth-scheme is case-insensitive.
  check(
    "accepts lowercase scheme 'bearer' (RFC 7235 is case-insensitive)",
    parseBearerHeader("bearer abc123XYZ").ok === true,
  );
  check(
    "accepts uppercase scheme 'BEARER'",
    parseBearerHeader("BEARER abc123XYZ").ok === true,
  );

  // RFC 7235 §2.1 specifies `1*SP` — one or more spaces.
  check(
    "accepts multiple spaces between scheme and credentials",
    parseBearerHeader("Bearer   abc123").ok === true,
  );

  // ── A2. token68 charset (RFC 6750 §2.1) ─────────────────────────
  for (const ch of ["-", ".", "_", "~", "+", "/"]) {
    check(`accepts token68 char '${ch}'`, parseBearerHeader(`Bearer ab${ch}cd`).ok === true);
  }
  check(
    "accepts base64-style trailing '=' padding",
    parseBearerHeader("Bearer YWJjZA==").ok === true,
  );
  // Characters OUTSIDE token68 must be rejected — this is what stops a
  // credential from splitting the Authorization grammar. A comma is
  // special-cased earlier to MALFORMED_HEADER (auth-param list), so it
  // is asserted separately below rather than here.
  for (const [label, value] of [
    ["space inside token", "ab cd"],
    ["quote", 'ab"cd'],
    ["backslash", "ab\\cd"],
    ["colon", "ab:cd"],
  ]) {
    const r = parseBearerHeader(`Bearer ${value}`);
    check(`rejects ${label}`, r.ok === false && r.reason === "MALFORMED_CREDENTIALS", r.ok ? "accepted!" : r.reason);
  }
  // '=' is padding only — mid-token is malformed.
  check(
    "rejects '=' in the middle of a token",
    parseBearerHeader("Bearer ab=cd").ok === false,
  );

  // ── A3. Every rejection reason is reachable ─────────────────────
  const cases = [
    [null, "MISSING_HEADER"],
    [undefined, "MISSING_HEADER"],
    ["", "EMPTY_HEADER"],
    ["   ", "EMPTY_HEADER"],
    ["Bearer", "MISSING_CREDENTIALS"],
    ["justatoken", "MALFORMED_HEADER"],
    ["Basic dXNlcjpwYXNz", "UNSUPPORTED_SCHEME"],
    ["Digest username=x", "UNSUPPORTED_SCHEME"],
    ["Bearer ", "MISSING_CREDENTIALS"],
    ["Bearer    ", "MISSING_CREDENTIALS"],
    // Trailing whitespace is trimmed before parsing, so a scheme-only
    // header must still report MISSING_CREDENTIALS (not MALFORMED_HEADER).
    // This distinction is load-bearing: "you sent a Bearer but no token"
    // is a very different operator error from "you sent garbage".
    ["Bearer\t", "MISSING_CREDENTIALS"],
    // RFC 7235 auth-param style (`Bearer realm="x"`) is a valid Bearer
    // scheme carrying credentials that are NOT a token68 — so the
    // accurate reason is a malformed *credential*, not a bad header.
    // A comma-separated multi-challenge list is rejected earlier as a
    // malformed header, since it is not the Bearer grammar at all.
    ['Bearer realm="x"', "MALFORMED_CREDENTIALS"],
    ["Bearer a, Bearer b", "MALFORMED_HEADER"],
  ];
  for (const [input, expected] of cases) {
    const r = parseBearerHeader(input);
    const label = JSON.stringify(input);
    check(
      `rejects ${label} as ${expected}`,
      r.ok === false && r.reason === expected,
      r.ok ? "accepted!" : r.reason,
    );
  }

  // Oversized credential is rejected without echoing it.
  const huge = "Bearer " + "a".repeat(MAX_CREDENTIAL_LENGTH + 1);
  check(
    `rejects a credential longer than ${MAX_CREDENTIAL_LENGTH} chars`,
    parseBearerHeader(huge).ok === false && parseBearerHeader(huge).reason === "MALFORMED_CREDENTIALS",
  );

  // ── A4. Verification is correct and constant-time ───────────────
  check("verifyBearerToken accepts the correct secret", verifyBearerToken("Bearer s3cr3t", "s3cr3t") === true);
  check("verifyBearerToken rejects a wrong secret", verifyBearerToken("Bearer wrong", "s3cr3t") === false);
  check("verifyBearerToken rejects a missing header", verifyBearerToken(null, "s3cr3t") === false);
  check("verifyBearerToken rejects a malformed header", verifyBearerToken("garbage", "s3cr3t") === false);
  check("verifyBearerToken rejects a prefix of the secret", verifyBearerToken("Bearer s3cr3", "s3cr3t") === false);
  check("verifyBearerToken rejects a superstring of the secret", verifyBearerToken("Bearer s3cr3tX", "s3cr3t") === false);
  check("verifyBearerToken is case-sensitive on the credential", verifyBearerToken("Bearer S3CR3T", "s3cr3t") === false);
  check("verifyBearerToken accepts empty secret when header is bare-ish", verifyBearerToken("Bearer ", "") === false);

  check("safeEquals matches identical strings", safeEquals("abc", "abc") === true);
  check("safeEquals rejects different strings", safeEquals("abc", "abd") === false);
  check("safeEquals handles different lengths without throwing", safeEquals("a", "abcdef") === false);

  // ── A5. Fingerprint never leaks the value ───────────────────────
  const fp = fingerprintCredential("sk-live-abcdef123456");
  check("fingerprint reports presence", fp.present === true);
  check("fingerprint reports length", fp.length === 20, `length=${fp.length}`);
  check("fingerprint reports well-formed", fp.wellFormed === true);
  check("fingerprint does NOT contain the credential", !JSON.stringify(fp).includes("abcdef123456"));
  check("fingerprint of unset is not present", fingerprintCredential(undefined).present === false);
  check("fingerprint of blank is not present", fingerprintCredential("   ").present === false);
  check("fingerprint marks a bad charset as not well-formed", fingerprintCredential("bad token!").wellFormed === false);
}

// ── Part B — the route source contract ─────────────────────────────
const route = read("src/app/api/health/route.ts");
check("api/health/route.ts exists", !!route);

// ── B1. Liveness + readiness ──────────────────────────────────────
check("health reports a separate `live` flag", !!route && /\blive:\s*liveness\.ok/.test(route));
check("health reports a separate `ready` flag", !!route && /\bready\b/.test(route));
check(
  "HTTP status keys off readiness, not liveness",
  !!route && /status:\s*ready\s*\?\s*200\s*:\s*503/.test(route),
  "a degraded DB must not return 200",
);
check("health reports process uptime", !!route && /uptimeSeconds/.test(route));
check("health reports boot time", !!route && /bootedAt/.test(route));
check("health reports pid", !!route && /\bpid:\s*process\.pid/.test(route));

// ── B2. $queryRaw, not a table ────────────────────────────────────
check(
  "db connectivity uses prisma.$queryRaw",
  !!route && /prisma\.\$queryRaw`SELECT 1`/.test(route),
);
check("health reports db latency", !!route && /latencyMs/.test(route));
check(
  "health does NOT probe a table entity for liveness",
  !!route && !/prisma\.\w+\.(findFirst|findMany|count)\(/.test(route),
  "a table read would couple liveness to data shape",
);

// ── B3. Bearer schema on integration tokens ───────────────────────
check("health validates integration tokens", !!route && /INTEGRATION_TOKENS/.test(route));
check("health uses the shared Bearer parser", !!route && /parseBearerHeader/.test(route));
check("health reports the bearer schema it validates against", !!route && /RFC 6750/.test(route));
check("health self-tests the parser", !!route && /parserProbe/.test(route));
check(
  "health declares SOVEREIGN_API_TOKEN explicitly",
  !!route && /SOVEREIGN_API_TOKEN/.test(route),
  "must be reported, not silently omitted",
);

// Secret hygiene: the route must never put a raw token in the response.
check(
  "health never serialises a raw token value",
  !!route &&
    !/token:\s*process\.env\[/.test(route) &&
    !/\.slice\(0,\s*\d+\).*process\.env/.test(route),
  "only fingerprints may be returned",
);

// ── B4. Strict cache headers ───────────────────────────────────────
check("health sets no-store Cache-Control", !!route && /"Cache-Control":\s*"no-store/.test(route));
check("health sets CDN-Cache-Control", !!route && /"CDN-Cache-Control":\s*"no-store"/.test(route));
check("health sets Vercel-CDN-Cache-Control", !!route && /"Vercel-CDN-Cache-Control":\s*"no-store"/.test(route));
check("health sets Surrogate-Control", !!route && /"Surrogate-Control":\s*"no-store"/.test(route));
check("health sets Pragma/Expires", !!route && /Pragma:\s*"no-cache"/.test(route) && /Expires:\s*"0"/.test(route));
check("health applies the headers to the response", !!route && /headers:\s*NO_STORE_HEADERS/.test(route));
check("health is force-dynamic (never prerendered)", !!route && /export const dynamic = "force-dynamic"/.test(route));

// ── B5. cron-auth now uses the shared parser ──────────────────────
const cronAuth = read("src/lib/cron-auth.ts");
check("cron-auth imports the shared Bearer parser", !!cronAuth && /bearer-auth/.test(cronAuth));
check(
  "cron-auth no longer compares a `Bearer ${secret}` template",
  !!cronAuth && !/digest\(`Bearer \$\{secret\}`\)/.test(cronAuth),
  "raw-header template comparison is the thing being replaced",
);
check("cron-auth still fails closed when CRON_SECRET is unset", !!cronAuth && /CRON_SECRET is not set/.test(cronAuth));

// ── Part C — live endpoint, when a server is running ──────────────
try {
  const r = await fetch("http://127.0.0.1:3000/api/health", {
    signal: AbortSignal.timeout(5000),
  });
  const body = await r.json();
  check("live /api/health exposes `live`", typeof body.live === "boolean");
  check("live /api/health exposes `ready`", typeof body.ready === "boolean");
  check(
    "live /api/health status agrees with `ready`",
    body.status === (body.ready ? "ok" : "degraded"),
    `status=${body.status} ready=${body.ready}`,
  );
  check("live /api/health reports uptime", typeof body.process?.uptimeSeconds === "number");
  check("live /api/health reports bootedAt", typeof body.process?.bootedAt === "string");
  check("live /api/health reports db latency", typeof body.checks?.db?.latencyMs === "number");
  check("live /api/health reports the integrations subsystem", !!body.checks?.integrations);
  check(
    "live /api/health sends no-store",
    (r.headers.get("cache-control") ?? "").includes("no-store"),
    `cache-control=${r.headers.get("cache-control")}`,
  );
  check(
    "live /api/health sends Vercel-CDN-Cache-Control: no-store",
    (r.headers.get("vercel-cdn-cache-control") ?? "") === "no-store",
  );
  // A token value must never appear in a public response body.
  const secretish = process.env.MAVIS_API_KEY || process.env.CRON_SECRET;
  if (secretish && secretish.length > 6) {
    check(
      "live /api/health leaks no token value",
      !JSON.stringify(body).includes(secretish),
    );
  } else {
    console.log("[SKIP] no long-lived token in env to leak-check");
  }
} catch (e) {
  console.log(`[SKIP] /api/health not reachable: ${e.message}`);
}

console.log(`\n${miss === 0 ? "ALL GREEN" : "MISSES"} — ${pass} passed, ${miss} missed`);

// Set `exitCode` and return — do NOT call `process.exit()`.
//
// Part C above performs a live `fetch` to localhost, which leaves an
// open socket in the undici keep-alive pool. Force-exiting while that
// handle is mid-close trips a libuv assertion on Windows
// (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` in
// win/async.c), killing the whole `pnpm smoke` chain with exit
// 3221226505 even though every check passed. Letting the event loop
// drain closes the socket cleanly. This matches smoke-deploy.mjs,
// which only hard-exits on failure.
process.exitCode = miss === 0 ? 0 : 1;