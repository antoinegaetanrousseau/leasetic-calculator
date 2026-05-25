import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { hardDeleteDraft } from '@/lib/db/queries/proposals';

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
  const ok = await hardDeleteDraft(id, userId);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
