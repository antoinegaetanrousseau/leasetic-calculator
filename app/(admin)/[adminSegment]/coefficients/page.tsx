import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getLatestGlobalParams } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';
import { CoefficientsEditor } from './CoefficientsEditor';
import { ExplainTool } from './ExplainTool';
import { CoefficientHistorySidebar } from './CoefficientHistorySidebar';
import { CoefficientWarningBanner } from './_components/CoefficientWarningBanner';
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

  // Plan 18-05 — Coefficients page wiring per UI-SPEC §Coefficients lines
  // 458-471 + line 908 (max-width 1280px):
  //   - PageHero (Phase 16 primitive) replaces the inline <h1>/<p>.
  //   - SeedBanner stays above the hero (preserved Phase 10 surface — it is
  //     a critical first-edit prompt that must precede the new D-19 warning).
  //   - CoefficientWarningBanner mounts BETWEEN the hero subtitle and the
  //     2-column layout, full width, marginBottom:16 (D-19).
  //   - 2-column flex layout: left (flex:1, minWidth:0) = editor + Explain;
  //     right (width:360, flexShrink:0) = CoefficientHistorySidebar (D-21
  //     refreshed in place).
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
      <SeedBanner lang={lang} visible={isStillSeed} />
      <PageHero
        title={t('admin.coefficients.page.title', lang)}
        subtitle={t('admin.coefficients.page.sub', lang)}
      />
      <CoefficientWarningBanner lang={lang} />
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <CoefficientsEditor lang={lang} latestParams={latestParams} />
          <ExplainTool lang={lang} latestParams={latestParams} />
        </div>
        <div style={{ width: 360, flexShrink: 0 }}>
          <CoefficientHistorySidebar lang={lang} adminSegment={adminSegment} />
        </div>
      </div>
    </main>
  );
}
