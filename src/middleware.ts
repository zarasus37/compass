/**
 * Route-protection middleware.
 *
 * Runs on the Edge runtime, so it CANNOT use Prisma. It only checks
 * for the presence of the session cookie; the actual session validity
 * is re-checked in the page (via `requireUser()`) and in the auth
 * layout (via `getCurrentUser()`).
 *
 * Public routes: /login, /welcome, /api/health.
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

const PUBLIC_PREFIXES = ["/login", "/welcome", "/api/health", "/_next", "/favicon"];

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
