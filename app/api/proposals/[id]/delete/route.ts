import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { softDeleteProposal, writeAuditLog } from '@/lib/db/queries';

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
  const affected = await softDeleteProposal(id, userId);

  // affected === 0 means "not found / not owned / already deleted" — same
  // 404 surface (D-18 obscurity).
  if (affected === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: userId,
    action: 'proposal.delete',
    targetType: 'proposal',
    targetId: id,
    payload: { source: 'partner-detail-page' },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
