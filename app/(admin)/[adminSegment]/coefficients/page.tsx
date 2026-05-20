import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getLatestGlobalParams } from '@/lib/db/queries';
import { CoefficientsEditor } from './CoefficientsEditor';
import { ExplainTool } from './ExplainTool';
import { CoefficientHistorySidebar } from './CoefficientHistorySidebar';
import { SeedBanner } from './SeedBanner';
import { seedParams } from '@/lib/calc/seed-params';
import type { Coefficients } from '@/lib/calc/coefficients';

/**
 * D-10-14: leaf-value deep equality for coefficient tables — immune to JSONB
 * key-order variation. JSON.stringify comparison would break if JSONB normalizes
 * key order differently from the in-memory object insertion order.
 */
function coefficientsEqual(a: Coefficients, b: Coefficients): boolean {
  const tranches = ['t1', 't2', 't3', 't4'] as const;
  const durations = [36, 48, 60] as const;
  return tranches.every((t) => durations.every((d) => a[t]?.[d] === b[t]?.[d]));
}

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
  const { adminSegment } = await params;

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

  // D-10-14: server-side deep-equal of latest coefficients vs seedParams.coefficients.
  // Uses leaf-value comparison (coefficientsEqual) to avoid JSONB key-order assumptions —
  // see WR-01 fix. When admin saves any edit, at least one cell differs → flips false.
  const isStillSeed = coefficientsEqual(
    latestParams.coefficients as Coefficients,
    seedParams.coefficients,
  );

  // Plan 14-04 D-17 / UI-SPEC §5.6 — 2-column layout at max-width 1040px:
  //   - Left column (minmax(0, 1fr)): editor + ExplainTool (Phase 9
  //     HistoryTable JSX usage REMOVED per UI-SPEC §5.6 ruling — the
  //     HistoryTable.tsx file stays on disk, only the page-level mount
  //     is removed).
  //   - Right column (360px fixed): CoefficientHistorySidebar (5 most-recent
  //     coefficient_history rows + footer link to /<seg>/history).
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <SeedBanner lang={lang} visible={isStillSeed} />
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div>
          <CoefficientsEditor lang={lang} latestParams={latestParams} />
          <ExplainTool lang={lang} latestParams={latestParams} />
        </div>
        <CoefficientHistorySidebar lang={lang} adminSegment={adminSegment} />
      </div>
    </div>
  );
}
