import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Coarse auth gate (Next.js 16 proxy.ts convention; replaces deprecated middleware.ts).
 *
 * Per PITFALLS §1.5: cookie-only check, NO DB lookup. Role checks happen in layouts
 * (Plan 06-06 / 06-07's requireUser / requireAdmin). This file only enforces the
 * coarse "logged in vs not" boundary.
 *
 * Per D-21: unauthenticated visitors are redirected to /login?next=<encoded-path>
 * so post-login they land where they tried to go. Authenticated visitors hitting
 * /login are redirected to /.
 *
 * The matcher excludes:
 *  - /_next/static, /_next/image, /favicon.ico, /fonts/  — static assets
 *  - /api/auth/*                                          — Better Auth's internal endpoints
 *  - /healthz                                              — Phase 5 unauthenticated health check
 *
 * Public routes whitelisted INSIDE the proxy (not via the matcher):
 *  - /login                — entry point for unauthenticated users
 *  - /invite/<token>       — partner sets initial password (D-09)
 *  - /reset/<token>        — partner resets password (D-09)
 *
 * Per RESEARCH §1: do NOT add `export const runtime = 'nodejs'`.
 * Next.js 16 throws on runtime declarations in proxy files (Node is the default).
 *
 * Per RESEARCH §1: export name is `proxy` (not `middleware`) — Next.js 16 naming.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Authenticated users on /login → home (D-21: no need to re-login)
  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Unauthenticated users on protected routes → /login?next=<encoded-path>
  // The ?next= parameter is preserved by the login page so the user lands where
  // they tried to go after successful authentication (D-21).
  if (!sessionCookie && !isPublicPath(pathname)) {
    const next = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  return NextResponse.next();
}

/**
 * Public paths that unauthenticated users may visit without being redirected.
 * These paths are checked INSIDE the proxy function (not via the matcher) so
 * that the matcher regex stays simple and easy to review.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/reset/')
  );
}

/**
 * Next.js 16 proxy matcher configuration.
 *
 * The negative lookahead excludes:
 *  - _next/static  — compiled JS/CSS bundles (never need auth)
 *  - _next/image   — Next.js image optimization endpoint
 *  - favicon.ico   — browser favicon request
 *  - fonts/        — self-hosted Plus Jakarta Sans (served from /public/fonts)
 *  - healthz       — Phase 5 unauthenticated health check endpoint
 *  - api/auth      — Better Auth's own catch-all route handler (/api/auth/[...all])
 *
 * All other paths (including / and any (authed) or (admin) routes) pass through
 * to the proxy function for the cookie presence check.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts/|healthz|api/auth).*)',
  ],
};
