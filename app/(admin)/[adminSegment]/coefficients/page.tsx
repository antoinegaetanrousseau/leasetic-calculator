import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getLatestGlobalParams, listGlobalParamsHistory } from '@/lib/db/queries';
import { CoefficientsEditor } from './CoefficientsEditor';
import { ExplainTool } from './ExplainTool';
import { HistoryTable } from './HistoryTable';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Coefficients — Leasétic Matrice',
  // Robots: noindex (admin URL is hidden — defense in depth even if crawler somehow finds it).
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function CoefficientsPage({ params }: PageProps) {
  // PITFALL §1.1 — params is async in Next.js 16.
  await params;

  // AUTH-15 — independent requireAdmin call (defense in depth even though layout already gates).
  await requireAdmin();

  const lang = await getCurrentLang();
  const latestParams = await getLatestGlobalParams();
  if (!latestParams) {
    // Phase 8 seed migration (DATA-12) inserts the first row at deploy time. If absent,
    // we surface a hard error rather than render an empty editor — the seed is a hard
    // dependency for the create-proposal flow (matches getLatestGlobalParams JSDoc).
    throw new Error(
      'global_params seed missing — run scripts/build-seed-sql.ts and re-deploy.',
    );
  }
  const initialHistory = await listGlobalParamsHistory({ limit: 20 });

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 4,
        }}
      >
        {t('admin.coefficients.page.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          marginBottom: 24,
        }}
      >
        {t('admin.coefficients.page.sub', lang)}
      </p>

      <CoefficientsEditor lang={lang} latestParams={latestParams} />

      <ExplainTool lang={lang} latestParams={latestParams} />

      <HistoryTable
        lang={lang}
        initialRows={initialHistory.rows}
        initialHasMore={initialHistory.hasMore}
        initialNextCursor={initialHistory.nextCursor}
      />
    </div>
  );
}
