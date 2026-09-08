/**
 * Phase 42 Plan 07 — /{adminSegment}/advisor server-component route
 * (PROF-03 / D-06 / D-07 / D-08 / D-09).
 *
 * Renders the single Leasetic advisor identity — the settings row Plan 42-06
 * built the persistence + authorization layer for. Admin-only, sibling to
 * `coefficients` / `partners` / `history` / `lc-references` / `companies`;
 * mirrors those top-level admin routes' `main` + `PageHero` shape exactly
 * (see `lc-references/page.tsx`, `coefficients/page.tsx`). No breadcrumb —
 * unlike `partners/new/page.tsx` (a sub-route of the `/partners` list), this
 * is a top-level admin route with no parent list to link back to; none of
 * its top-level siblings render one either.
 *
 * D-09: `getAdvisor()` is called fresh on every request — this row is read
 * LIVE at proposal-render time (Phase 43) and is never snapshotted into
 * `proposals.inputs` / `params_snapshot`. This page only reads it for form
 * defaults; it never writes it into anything but `AdvisorForm`'s own state.
 *
 * ADMIN-09: this route and its four fields (name/fonction/telephone/email)
 * carry zero commission, rate or derived financial value — a contact block,
 * not a financial snapshot. `getAdvisor()` never touches `global_params`.
 *
 * The route is admin-only; a non-admin or unauthenticated caller 404s
 * (never 403s) via the layout's segment-obscurity `notFound()` plus its
 * `requireAdmin()`, and this page's own independent `requireAdmin()` call
 * below (AUTH-15 defense in depth — the layout gate is not the only gate).
 */
import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getAdvisor } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';

import { AdvisorForm } from './AdvisorForm';

// PITFALLS §1.6 — opts out of static rendering (cookie/session reads).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conseiller Leasetic — Leasetic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function AdvisorPage({ params }: PageProps) {
  await params; // PITFALL §1.1 — async params in Next.js 16; not otherwise needed on this page.
  // AUTH-15 defence-in-depth — primary gate is the layout; this is the
  // page-level secondary guard.
  await requireAdmin();
  const lang = await getCurrentLang();
  const advisor = await getAdvisor();

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px',
      }}
    >
      <PageHero
        title={t('admin.advisor.hero.title', lang)}
        subtitle={t('admin.advisor.hero.subtitle', lang)}
      />

      <AdvisorForm lang={lang} initial={advisor} />
    </main>
  );
}
