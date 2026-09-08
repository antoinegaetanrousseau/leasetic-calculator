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
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? '',
  plugins: [
    // Type-only mirror of the `input: true` additionalFields registered in
    // src/lib/auth/index.ts (Phase 42 Plan 04 — PROF-01/D-19). A plain
    // schema object, not a typeof-auth generic, so this file never imports
    // the server-only auth module (see file-header NEVER-import warning
    // above). Without this, `authClient.updateUser({ telephone })` fails
    // TS's excess-property check because the client has no static
    // knowledge of server-registered additionalFields.
    inferAdditionalFields({
      user: {
        telephone: { type: 'string' },
      },
    }),
  ],
});
