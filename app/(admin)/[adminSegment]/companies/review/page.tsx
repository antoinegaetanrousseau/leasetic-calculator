import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listPendingPairsForAdmin } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';
import { PairReviewList } from './PairReviewList';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Réconciliation — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{
    cursor?: string;
  }>;
}

/**
 * `/[adminSegment]/companies/review` — Phase 31 Plan 06 Task 2 (IMPORT-04,
 * IMPORT-05, D-16).
 *
 * The admin pair-review queue: one card per company pair the extraction
 * engine flagged as ambiguous (D-04, D-10), oldest-flagged-first, resolved
 * one at a time by merging (D-12) or marking permanently separate (D-09).
 *
 * D-16 / 31-UI-SPEC.md route-divergence note: CONTEXT.md's D-16 describes
 * "its own admin route, alongside the /[adminSegment]/companies tree" — the
 * ratified UI-SPEC places that route AT `/companies/review`, a sibling of
 * `page.tsx` and `[id]/` inside the same tree, rather than a new top-level
 * segment. The UI-SPEC is the binding contract; see 31-06-SUMMARY.md for the
 * recorded decision.
 *
 * SECURITY (D-11, load-bearing — read 31-UI-SPEC.md's Access & Non-Leakage
 * Contract before touching this file):
 *   - requireAdmin() called here as defense in depth (AUTH-15) even though
 *     the parent `(admin)/[adminSegment]/layout.tsx` already gated
 *     (T-31-06-01). notFound(), never a client-error status that would
 *     confirm existence (D-18, T-31-06-02).
 *   - A flagged pair frequently has its two sides held by DIFFERENT
 *     partners — this route, and everything it renders, must never reach a
 *     non-admin session (D-11).
 *   - Renders directly inside Shell's capped `<main>` — no nested custom
 *     width-capping wrapper (31-UI-SPEC.md §0 Container convention).
 */
export default async function ReconciliationReviewPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // FIRST — auth before any data access (AUTH-15 defense in depth), D-11/D-18
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const cursor = sp.cursor || undefined;

  const { rows, nextCursor } = await listPendingPairsForAdmin({ cursor });

  return (
    <div>
      <PageHero
        title={t('admin.reconciliation.page.title', lang)}
        subtitle={t('admin.reconciliation.page.subtitle', lang)}
      />

      <PairReviewList rows={rows} nextCursor={nextCursor} lang={lang} adminSegment={adminSegment} />
    </div>
  );
}
