import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listCompaniesForAdmin } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';
import { SearchBar } from '@/components/proposals/SearchBar';
import { CompaniesList } from './CompaniesList';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sociétés — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{
    q?: string;
    cursor?: string;
  }>;
}

/**
 * `/[adminSegment]/companies` — Phase 30 Plan 08 Task 1 (CRM-01, CRM-03).
 *
 * The admin company registry list — every company across every partner, with
 * a RELATIONS count column that is the visual tell this is an
 * aggregate/oversight view (T-30-08-01/02). Deliberately mirrors
 * `PartnersList`'s exact chrome (plain shadcn `Table`, `.card
 * overflow-hidden p-0`, cursor "Charger plus" footer) rather than the
 * DataGrid machinery adopted for the partner-facing `/clients` book — see
 * 30-UI-SPEC.md §4 / Assumption A-8.
 *
 * SECURITY:
 *   - requireAdmin() called here as defense in depth (AUTH-15) even though
 *     the parent `(admin)/[adminSegment]/layout.tsx` already gated
 *     (T-30-08-01). notFound() not 403 (D-18).
 *   - Renders directly inside Shell's capped `<main>` — no nested
 *     custom width-capping wrapper (30-UI-SPEC.md §0 Container convention).
 */
export default async function CompaniesPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // FIRST — auth before any data access (AUTH-15 defense in depth)
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const cursor = sp.cursor || undefined;

  const { rows, nextCursor } = await listCompaniesForAdmin({ q, cursor, limit: 20 });

  return (
    <div>
      <PageHero
        title={t('admin.companies.page.title', lang)}
        subtitle={t('admin.companies.page.subtitle', lang)}
      />

      <div className="mb-4">
        <SearchBar lang={lang} />
      </div>

      <CompaniesList
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        adminSegment={adminSegment}
        currentQ={q}
      />
    </div>
  );
}
