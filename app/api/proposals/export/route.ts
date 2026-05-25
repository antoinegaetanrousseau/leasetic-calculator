import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require';
import { buildExportQuery } from '@/lib/api/proposals/list';
import { generateProposalsXlsx } from '@/lib/xlsx';

/**
 * Phase 19 Plan 01 (post-19 hotfix) — POST /api/proposals/export
 *
 * Replaces the original exportProposalsAction Server Action. Server Actions
 * cannot return a binary Response — Next.js serializes their return value
 * through the RSC Flight protocol, which only accepts JSON-compatible types.
 * The original implementation silently failed at the client boundary.
 *
 * This Route Handler mirrors the Phase 13 finalize/route.ts pattern + the
 * Phase 8 /api/proposals/[id]/pdf binary-response pattern.
 *
 * runtime = 'nodejs' — exceljs requires Node APIs.
 * dynamic = 'force-dynamic' — cookie/session-reading per PITFALLS §1.6.
 *
 * Threat model (T-19-01-* cluster, preserved from the Server Action):
 *   - T-S Spoofing: requireUser() runs FIRST → 401 JSON on missing session.
 *   - T-19-01-01 IDOR: buildExportQuery receives session.user.id, NEVER a
 *     URL/body param. Partners can ONLY export their own proposals.
 *   - T-19-01-02 ADMIN-09 D-05/EXPORT-02: commission scrub delegated to
 *     buildExportQuery + generateProposalsXlsx. Neither writes commission
 *     fields. ADMIN-09 grep-contracts test gate 10 enforces this on every
 *     test run via ExcelJS parser-based scan of the output buffer.
 *   - T-T Tampering: q + archived are sanitized by buildExportQuery (q goes
 *     through ILIKE escape; archived is coerced to boolean). No raw shell or
 *     SQL surface.
 *   - T-R Repudiation: per Phase 12 lifecycle-only audit_log convention +
 *     CONTEXT.md D-04, no audit_log entry for read operations. Server-side
 *     log via console (request logger) is sufficient.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Step 0: requireUser FIRST (PITFALLS §7.3). Translate the thrown
  // NEXT_REDIRECT into a 401 JSON so the client toast logic works.
  let userId: string;
  let locale: 'fr' | 'en';
  try {
    const { session } = await requireUser();
    userId = session.user.id;
    // D-09 — locale from session (set at login via language cookie → auth flow).
    locale = (session.user.language as 'fr' | 'en') ?? 'fr';
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Step 1: parse + validate body. NextRequest.json() throws on invalid JSON.
  let body: { q?: unknown; archived?: unknown };
  try {
    body = (await req.json()) as { q?: unknown; archived?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // q: optional string; coerce non-strings to undefined to avoid ILIKE injection
  // of unintended types. archived: optional boolean; coerce to boolean explicitly.
  const q = typeof body?.q === 'string' && body.q.length > 0 ? body.q : undefined;
  const archived = body?.archived === true;

  // Step 2: query + generate.
  try {
    const rows = await buildExportQuery({ userId, q, archived, locale });
    const buf = await generateProposalsXlsx({ rows, locale });

    // D-04 — filename: propositions-YYYY-MM-DD.xlsx (UTC date of export).
    const today = new Date().toISOString().slice(0, 10);
    const filename = `propositions-${today}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    // ADMIN-09 anti-enumeration: never echo raw err.message.
    console.error('[POST /api/proposals/export] generation failed', err);
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
