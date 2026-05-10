import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { requireAdmin } from '@/lib/auth/require';
import { purgeSoftDeleted } from '@/lib/admin/purge';
import { writeAuditLog } from '@/lib/db/queries';

// PITFALLS §1.6: session-reading + cookie-auth routes opt out of static rendering.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * D-10-05/07/08 — Dual-auth purge endpoint:
 *   Gate A: Authorization: Bearer ${CRON_SECRET}  (Vercel Cron — uses Vercel's reserved env var name)
 *   Gate B: Admin session                          (manual ad-hoc invocation)
 *
 * Either gate alone is sufficient. The cron secret is compared via timingSafeEqual
 * to defeat timing-side-channel attacks. The secret is never logged.
 *
 * Response shape: { purged: number, errors: number }.
 *   - All rows succeeded OR no rows to purge → 200
 *   - At least one row succeeded            → 200 (best-effort per D-10-08)
 *   - All rows failed (and there were any)  → 500
 *
 * No alerting in v1.1 (CUT-07 defer); Vercel logs are the production observability surface.
 */
export async function POST(req: NextRequest) {
  // ── Gate A: cron secret bearer token ──────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET ?? ''; // Vercel's reserved name — auto-injected by Vercel Cron
  let hasCronSecret = false;
  if (cronSecret.length > 0 && authHeader.startsWith('Bearer ')) {
    const presented = authHeader.slice('Bearer '.length);
    const aBuf = Buffer.from(presented);
    const bBuf = Buffer.from(cronSecret);
    if (aBuf.length === bBuf.length) {
      hasCronSecret = timingSafeEqual(aBuf, bBuf);
    }
  }

  // ── Gate B: admin session (only checked if cron secret didn't pass) ───────
  let adminUserId: string | null = null;
  if (!hasCronSecret) {
    try {
      const { session } = await requireAdmin();
      adminUserId = session.user.id;
    } catch {
      // not an admin session — fall through to 401
    }
  }

  if (!hasCronSecret && !adminUserId) {
    // Generic 401 — never disclose which gate we evaluated or why it failed.
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ── Purge ────────────────────────────────────────────────────────────────
  const { purged, errors } = await purgeSoftDeleted({ actorId: adminUserId });

  // Optional: route-level audit row recording the invocation (separate from per-row).
  try {
    await writeAuditLog({
      actorId: adminUserId,
      action: 'proposal.purge',
      targetType: 'proposal',
      targetId: null,
      payload: {
        source: hasCronSecret ? 'cron' : 'admin-manual',
        purged,
        errors: errors.length,
      },
    });
  } catch (err) {
    console.error('[POST /api/internal/purge-soft-deleted] audit log write failed', err);
  }

  // 500 only if we tried to purge SOMETHING and ALL of it failed.
  const tried = purged + errors.length;
  const status = tried > 0 && purged === 0 ? 500 : 200;
  return NextResponse.json({ purged, errors: errors.length }, { status });
}
