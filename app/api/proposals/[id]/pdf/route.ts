import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { getProposalById } from '@/lib/db/queries';
import { storage } from '@/lib/storage';

// PROP-13: stream route, NOT raw blob URL.
// Node runtime — storage adapter uses Node fetch / aws-sdk on the s3 path.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteParams) {
  // Step 1: auth.
  let userId: string;
  try {
    const { session } = await requireUser();
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Step 2: read the proposal row.
  const { id } = await ctx.params;
  const proposal = await getProposalById(id);

  // Step 3: 404 obscurity for not-found OR not-owned (D-18).
  if (!proposal || proposal.userId !== userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Step 4: 410 if hard-purgeable (deleted_at > 30d). Plan 08-14's CLI MAY
  // already have purged the blob; the row check fails-fast before we hit
  // the storage adapter and 404.
  if (proposal.deletedAt && Date.now() - proposal.deletedAt.getTime() > 30 * 24 * 3600 * 1000) {
    return NextResponse.json({ error: 'gone' }, { status: 410 });
  }

  // Step 5: 404 if no PDF yet (D-B1 tombstone OR mid-flight). Treat as
  // "not-found" since the row has no consumable artifact.
  if (!proposal.pdfBlobKey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Step 6: stream the bytes.
  let blob;
  try {
    blob = await storage().get(proposal.pdfBlobKey);
  } catch (err) {
    console.error('[GET /api/proposals/[id]/pdf] storage.get failed', err);
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
  }

  // DATA-09 transport integrity: expose stored sha256 so clients can verify
  // that the bytes received match the originally generated PDF.
  const responseHeaders: Record<string, string> = {
    'Content-Type': blob.contentType || 'application/pdf',
    'Content-Length': String(blob.size),
    'Content-Disposition': `inline; filename="Leasetic_Proposition_${proposal.lcRef}.pdf"`,
    'Cache-Control': 'private, max-age=0, no-store',
  };
  if (proposal.pdfSha256) {
    responseHeaders['X-Content-SHA256'] = proposal.pdfSha256;
  }

  return new NextResponse(blob.body, {
    status: 200,
    headers: responseHeaders,
  });
}
