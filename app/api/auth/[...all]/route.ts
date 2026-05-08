/**
 * Catch-all HTTP route for Better Auth's internal endpoints
 * (sign-in, sign-out, get-session, refresh, etc.).
 *
 * Per 06-RESEARCH.md §6: delegates entirely to toNextJsHandler. No custom
 * logic. The proxy.ts (Plan 06-04) excludes /api/auth from its matcher so
 * these endpoints remain reachable for unauthenticated visitors.
 *
 * The handler is wrapped in async functions (rather than module-level const
 * destructuring) so that auth() — and the DATABASE_URL it requires — is only
 * instantiated on the first incoming request, not at `next build` static-
 * analysis time. This mirrors the db() lazy-singleton pattern.
 */
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Force-dynamic: cookie-based session reads must not be cached at the route level
// (PITFALLS §1.6). toNextJsHandler reads request cookies on every call.
export const dynamic = 'force-dynamic';

const handler = () => toNextJsHandler(auth());

export function GET(req: Request): Promise<Response> {
  return handler().GET(req);
}

export function POST(req: Request): Promise<Response> {
  return handler().POST(req);
}
