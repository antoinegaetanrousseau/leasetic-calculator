import { NextResponse } from 'next/server';
import { checkDatabaseHealth, checkBlobHealth, buildHealthResponse } from '@/lib/health';

/**
 * GET /healthz — health probe (BOOT-12).
 *
 * Exercises a DB read + blob round-trip via the lib/db and lib/storage adapter
 * interfaces. Returns:
 *   200 { db: 'ok', blob: 'ok', checked_at } when both succeed
 *   503 { db: 'ok'|'error', blob: 'ok'|'error', checked_at, message } when either fails
 *
 * Unauthenticated by design — uptime monitors and Vercel deployment health checks
 * hit it without credentials. Error messages are bounded ('connection failed' etc)
 * so a hostile observer learns nothing useful from the response.
 *
 * Runtime: Node (NOT edge). Required because the storage adapter uses aws-sdk/client-s3
 * (which has Node-only deps) AND because Phase 8's PDF rendering runs on the same
 * runtime. Per PITFALLS §6.1 / §1.3.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Run both checks in parallel — independent failures should be reported precisely.
  const [dbResult, blobResult] = await Promise.all([
    checkDatabaseHealth(),
    checkBlobHealth(),
  ]);

  const body = buildHealthResponse(dbResult, blobResult);
  const status = body.db === 'ok' && body.blob === 'ok' ? 200 : 503;

  return NextResponse.json(body, {
    status,
    headers: {
      // Never cache — this is an instant-snapshot probe.
      'Cache-Control': 'no-store, max-age=0',
      // CORS: deliberately NOT permissive. Monitors should hit the route directly,
      // not from a browser context. Phase 6+ may add a same-origin allowlist if needed.
    },
  });
}
