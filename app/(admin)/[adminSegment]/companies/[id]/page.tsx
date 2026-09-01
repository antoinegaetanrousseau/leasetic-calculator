import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getCompanyForAdmin, listRelationshipsForCompany } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { CompanyRelationsTable } from './CompanyRelationsTable';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Société — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string; id: string }>;
}

/**
 * `/[adminSegment]/companies/[id]` — Phase 30 Plan 08 Task 2 (CRM-03).
 *
 * `[id]` is the COMPANY id — the one surface allowed to address it directly,
 * because only `requireAdmin()`-gated users reach it (30-UI-SPEC.md §0).
 *
 * Order of operations:
 *   1. requireAdmin() — FIRST, before any data access (AUTH-15/PITFALLS §7.3).
 *   2. getCompanyForAdmin(id) -> null => notFound() (D-18: 404 not 403).
 *   3. ONLY THEN listRelationshipsForCompany(id) — every relationship on
 *      this company, together with the holder's identity (CRM-03).
 *
 * The header uses the full `PageHero` treatment (no eyebrow — matches
 * `PartnersList`'s own list page, which also omits one) — this is
 * deliberately a different visual weight from the partner-facing
 * `/clients/[id]` page's 22px plain `<h1>`, per 30-UI-SPEC.md §4's "must
 * visually distinguish itself from the partner view" requirement.
 */
export default async function CompanyDetailPage({ params }: PageProps) {
  const { adminSegment, id } = await params;
  await requireAdmin(); // FIRST — auth before any data access

  const company = await getCompanyForAdmin(id);
  if (!company) {
    notFound();
  }

  const lang = await getCurrentLang();
  const relationships = await listRelationshipsForCompany(id);

  return (
    <div>
      <PageHero
        title={company.name}
        actions={
          // SIREN shown inline on the header row when present, omitted
          // entirely when null (never "—" in a header — only body/table
          // content renders the em-dash fallback).
          company.siren ? (
            <span className="text-[13px] text-muted-foreground">{company.siren}</span>
          ) : undefined
        }
      />

      <section className="card">
        <SectionTitle>{t('admin.companies.detail.section.relations', lang)}</SectionTitle>
        <CompanyRelationsTable
          relationships={relationships}
          lang={lang}
          adminSegment={adminSegment}
          companyId={id}
        />
      </section>
    </div>
  );
}
