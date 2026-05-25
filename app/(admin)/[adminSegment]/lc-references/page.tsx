/**
 * Phase 19 Plan 02 Task 2 — LC References admin route.
 *
 * Cross-partner LC reference dashboard. Admin-only; upstream gate is
 * the (admin) layout.tsx + requireAdmin() defense-in-depth (AUTH-15).
 *
 * D-18: Reachable ONLY via 4th AdminNavCard (added in Task 3).
 *       NOT added to sidebar (Phase 18 D-27 lock).
 * D-13: Rows are read-only (enforced in LcReferencesList component).
 * T-19-02-01: Cross-partner — no userId scoping (handled in listLcReferences).
 */
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listLcReferences } from '@/lib/db/queries/lc-references';
import { PageHero } from '@/components/ui/PageHero';
import { LcReferencesList } from './_components/LcReferencesList';

// PITFALLS §1.6 — opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Références LC — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{
    q?: string;
    cursor?: string;
  }>;
}

export default async function LcReferencesPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const cursorEncoded = sp.cursor || null;

  const { rows, nextCursor } = await listLcReferences({
    q,
    cursorEncoded,
    limit: 20,
  });

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
      }}
    >
      <PageHero
        title={t('admin.lcReferences.title', lang)}
        subtitle={t('admin.lcReferences.subtitle', lang)}
      />

      <LcReferencesList
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        adminSegment={adminSegment}
        currentQ={q ?? ''}
      />
    </main>
  );
}
