/**
 * Server-side authorization guards.
 *
 * (a) PITFALLS §7.3 ordering rule: ALWAYS call require* FIRST before any data
 *     access. Pattern: requireUser() / requireAdmin() → business logic. Never
 *     the other way around — a caller that reads data before auth-checking could
 *     leak data before the guard fires.
 *
 * (b) AUTH-16 secondary in-band check: Better Auth's cookieCache.maxAge is 5 min,
 *     meaning a cookie that was cached before the session was revoked can still
 *     return a valid session from getSession() for up to 5 minutes. requireUser()
 *     adds a secondary DB re-check of users.deletedAt (and users.sessionVersion for
 *     forward-compat) to tighten the revocation window to per-request. Primary
 *     revocation still happens via the Better Auth admin plugin (disableUser in
 *     actions.ts), which deletes all DB session rows immediately.
 *
 * (c) D-18 reason for notFound() not 403: returning 403 would confirm that the
 *     admin URL segment exists. Returning 404 preserves URL secrecy (AUTH-14).
 *     requireAdmin() calls notFound(), NOT redirect() or a 403 response.
 *
 * (d) `import 'server-only'`: any accidental import from a Client Component will
 *     produce a build-time error ("This module cannot be imported from a Client
 *     Component module"). This enforces the server-only contract without relying
 *     on runtime checks.
 */
import 'server-only';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from './index';
import { db, schema } from '@/lib/db';

export type Role = 'partner' | 'admin';

export interface RequireUserResult {
  session: NonNullable<Awaited<ReturnType<ReturnType<typeof auth>['api']['getSession']>>>;
  role: Role;
}

/**
 * Require an authenticated user. Redirects to /login if no session exists.
 * Also performs a secondary in-band DB check (AUTH-16) to ensure the user
 * row exists and has not been disabled (deletedAt IS NULL).
 *
 * Returns { session, role } on success.
 */
export async function requireUser(): Promise<RequireUserResult> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/login');
  }
  // AUTH-16 secondary check: re-read role + deletedAt from DB per-request.
  // This catches the 5-min cookieCache window after an admin disables an account.
  const user = await db().query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { sessionVersion: true, deletedAt: true, role: true },
  });
  if (!user || user.deletedAt !== null) {
    redirect('/api/auth/sign-out?redirect=/login');
  }
  return {
    session,
    role: (user.role === 'admin' ? 'admin' : 'partner') as Role,
  };
}

/**
 * Require an authenticated admin user. Calls requireUser() first, then asserts
 * role === 'admin'. Non-admin users receive a 404 (not 403) — D-18: URL secrecy
 * means we do NOT confirm the admin URL exists for non-admins.
 *
 * Returns { session } on success.
 */
export async function requireAdmin(): Promise<{ session: RequireUserResult['session'] }> {
  const { session, role } = await requireUser();
  if (role !== 'admin') {
    notFound();
  }
  return { session };
}
