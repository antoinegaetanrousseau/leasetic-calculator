import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import {
  listCoefficientHistory,
  decodeCoefficientHistoryCursor,
  encodeCoefficientHistoryCursor,
} from '@/lib/db/queries/coefficient-history';
import { CoefficientHistoryList } from './CoefficientHistoryList';

/**
 * Plan 14-05 Task 1 — Standalone /history server page.
 *
 * Per UI-SPEC §5.3 + D-21..D-25:
 *   - Server component (Next.js 16 async params + searchParams).
 *   - requireAdmin() defence-in-depth (AUTH-15) at the top.
 *   - dynamic = 'force-dynamic' (PITFALLS §1.6 — cookie/session-reading).
 *   - Metadata.robots = noindex, nofollow (admin URL secrecy).
 *   - Cursor-based pagination via ?cursor=<base64>, page size 20.
 *     Reuses Phase 12's encode/decode helpers in
 *     src/lib/db/queries/coefficient-history.ts (no new cursor library).
 *   - Renders <CoefficientHistoryList> which owns the single-active-detail
 *     expandedRowId state per D-25 (contrasts with the sidebar's multi-expand
 *     model per D-20).
 *
 * Threat model:
 *   - T-14-05-01 (Spoofing): requireAdmin() runs FIRST per PITFALLS §7.3.
 *   - T-14-05-02 (Malformed cursor): decodeCoefficientHistoryCursor returns
 *     null for invalid input (Phase 12 contract); we fall through to a
 *     no-cursor call to listCoefficientHistory.
 *   - T-14-05-04 (D-30 admin-only commission visibility): the expanded
 *     CoefficientDiffPanel renders before_json + after_json which include
 *     commission_pct. Admin-gated upstream by requireAdmin().
 */

// PITFALLS §1.6 — opts out of static rendering (cookies + session read).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Historique des coefficients — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export default async function HistoryPage({
  params,
  searchParams,
}: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defence in depth — must run before data access.
  const lang = await getCurrentLang();
  const sp = await searchParams;
  const cursorEncoded = sp.cursor ?? null;

  // Decode the cursor if present. decodeCoefficientHistoryCursor returns null
  // for malformed input (Phase 12 contract) — we fall through to a no-cursor
  // call rather than erroring (T-14-05-02 mitigation).
  const decoded = cursorEncoded
    ? decodeCoefficientHistoryCursor(cursorEncoded)
    : null;

  const result = await listCoefficientHistory({
    ...(decoded ? { cursor: decoded } : {}),
    limit: 20,
  });

  const nextCursorEncoded = result.nextCursor
    ? encodeCoefficientHistoryCursor(result.nextCursor)
    : null;

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 0' }}>
      <h1
        id="history-page-title"
        style={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {t('history.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.55,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 32,
        }}
      >
        {t('history.subtitle', lang)}
      </p>

      <CoefficientHistoryList
        rows={result.rows}
        hasMore={result.hasMore}
        nextCursorEncoded={nextCursorEncoded}
        currentCursor={cursorEncoded}
        adminSegment={adminSegment}
        lang={lang}
      />
    </div>
  );
}
