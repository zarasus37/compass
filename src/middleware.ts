/**
 * Route-protection middleware.
 *
 * Runs on the Edge runtime, so it CANNOT use Prisma. It only checks
 * for the presence of the session cookie; the actual session validity
 * is re-checked in the page (via `requireUser()`) and in the auth
 * layout (via `getCurrentUser()`).
 *
 * Public routes: /login, /welcome, /api/health, /api/dev-agent,
 * /api/dev (dev-only test endpoints, themselves gated by
 * NODE_ENV=development at the route handler), /api/cron (gated
 * by the route's own CRON_SECRET bearer auth — pre-existing for
 * /api/cron/vault, extended in Cluster 7.8.1 for
 * /api/cron/audit-log-prune), /api/vault/chain-config
 * (read-only chain-config introspection, no secrets — see the
 * endpoint's own doc for what's exposed and why).
 * Everything else: requires a cookie. If missing → redirect to /login.
 *
 * Note: we deliberately do NOT redirect from /login to / based on
 * cookie presence here. The auth layout already does that check
 * (DB-backed, accurate), and a stale cookie would create an
 * infinite loop: middleware says "you have a cookie, go to /",
 * the dashboard says "session is invalid, go to /login", repeat.
 * Leaving the redirect to the auth layout keeps the loop off.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "compass_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/welcome",
  "/api/health",
  "/api/dev-agent",
  "/api/dev",
  // Cluster 6.0 — vault auto bill-pay cron. Gated by the
  // route's own CRON_SECRET bearer (skipped in dev). The dev
  // scheduler process (scripts/cron-dev.mjs) hits this on a
  // 30s poll without a session cookie; without this public
  // prefix, the middleware would redirect it to /login and
  // the script would silently log "poll failed". Cluster
  // 7.8.1 extended the same pattern to /api/cron/audit-log-prune.
  "/api/cron",
  // Cluster 6.0.1 — mainnet. Read-only chain-config endpoint.
  // Returns canonical chainId + addresses + explorerUrl; no
  // signer key, no RPC with API key, no DB info. Public on
  // purpose so the smoke + ops dashboards can hit it without
  // signing in. If we ever add secrets to this response, take
  // it OUT of the public list immediately.
  "/api/vault/chain-config",
  "/_next",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Public route — always pass through. The (auth) layout decides
  // whether to redirect to / based on the actual session (DB query).
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where the user was trying to go (handy after a deep link).
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Match everything except Next.js internals + static assets.
   * Auth pages and the public API routes are short-circuited inside
   * the middleware body via the PUBLIC_PREFIXES list.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
