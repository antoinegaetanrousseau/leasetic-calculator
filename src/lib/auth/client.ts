/**
 * Browser-side Better Auth client. Per AUTH-18 / D-24 / PITFALLS §2.6:
 *
 *   ALWAYS use these methods (authClient.signIn.email, authClient.signOut, etc.)
 *   NEVER POST directly to /api/auth/... from app code.
 *
 * The custom POST path skips Better Auth's CSRF protections (Origin header
 * validation + SameSite cookie) and is forbidden.
 *
 * NEVER import this module from a Server Component (PITFALLS §P8 / 06-RESEARCH.md §9 P8).
 */
'use client';

import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? '',
});
