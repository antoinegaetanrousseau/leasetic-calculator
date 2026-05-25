'use server';
/**
 * Phase 19 Plan 01 — exportProposals server action.
 *
 * Returns a binary Response with Content-Disposition: attachment so the
 * browser triggers a file download. The buffer is ephemeral (not stored) — D-03.
 *
 * Contract:
 *   - PITFALLS §7.3: requireUser() FIRST — before any other await.
 *   - T-19-01-01 IDOR: buildExportQuery receives the session userId, NOT a
 *     URL param. Partners can ONLY export their own proposals.
 *   - D-05 / EXPORT-02: commission scrub delegated to buildExportQuery +
 *     generateProposalsXlsx. Neither function writes commission-bearing fields.
 *   - D-03: the buffer is returned directly as a Response body. Not stored in
 *     blob storage. No audit_log (read operation per Phase 12 lifecycle-only rule).
 *   - D-09: locale is read from session.user.language (language cookie-derived
 *     at auth time) and threaded into buildExportQuery + generateProposalsXlsx.
 *   - Export scope: respects ?q= and ?archived= filters from the URL params
 *     passed by the ExportButton caller. Drafts are EXCLUDED (buildExportQuery
 *     uses the default active/archived branches, same as buildListResponse).
 */
import { requireUser } from '@/lib/auth/require';
import { buildExportQuery } from '@/lib/api/proposals/list';
import { generateProposalsXlsx } from '@/lib/xlsx';

export interface ExportProposalsArgs {
  q?: string;
  archived?: boolean;
}

export async function exportProposalsAction(
  args: ExportProposalsArgs,
): Promise<Response> {
  // PITFALLS §7.3 — requireUser() FIRST: auth before any data access.
  const { session } = await requireUser();
  const userId = session.user.id;
  // D-09 — locale from session (set at login via language cookie → auth flow).
  const locale = (session.user.language as 'fr' | 'en') ?? 'fr';

  const rows = await buildExportQuery({
    userId,
    q: args.q,
    archived: args.archived,
    locale,
  });

  const buf = await generateProposalsXlsx({ rows, locale });

  // D-03 — ephemeral buffer returned as attachment Response.
  // Filename: propositions-YYYY-MM-DD.xlsx (UTC date of export).
  const today = new Date().toISOString().slice(0, 10); // "2026-05-25"
  const filename = `propositions-${today}.xlsx`;

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.length),
    },
  });
}
