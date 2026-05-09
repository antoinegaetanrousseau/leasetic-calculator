import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { restoreProposal, writeAuditLog } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteParams) {
  let userId: string;
  try {
    const { session } = await requireUser();
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const affected = await restoreProposal(id, userId);

  if (affected === 0) {
    // restoreProposal fails when: not found / not owned / not deleted /
    // outside 30-day window. All collapse to 404 (D-18 obscurity).
    return NextResponse.json({ error: 'not_found_or_expired' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: userId,
    action: 'proposal.restore',
    targetType: 'proposal',
    targetId: id,
    payload: { source: 'partner-detail-page' },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
