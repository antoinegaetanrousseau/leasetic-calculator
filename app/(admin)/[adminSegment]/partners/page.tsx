import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlusIcon } from '@/components/ui/icons';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listPartnersWithLastActivity, type PartnerStatus } from '@/lib/db/queries/partners';
import { PageHero } from '@/components/ui/PageHero';
import { SearchBar } from '@/components/proposals/SearchBar';
import { PartnersList } from './PartnersList';
import { PartnersFilterPillTabs } from './_components/PartnersFilterPillTabs';

// PITFALLS §1.6 — opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Partenaires — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    cursor?: string;
  }>;
}

/**
 * Phase 18 Plan 03 Task 3 — admin Partners list route.
 *
 * Layout (UI-SPEC §Partners list lines 270-275):
 *   1. <PageHero> title=Partenaires + subtitle + Inviter un partenaire CTA (right)
 *   2. <SearchBar> placeholder=Rechercher par email ou nom… (Phase 17 reuse)
 *   3. <PartnersFilterPillTabs> 4 pills (D-09; currentStatus drives active)
 *   4. <PartnersList> 6-col table + D-13 empty states + D-12 cursor footer
 *
 * SECURITY:
 *   - T-18-03-01 (status enum injection): `status` searchParam is enum-
 *     validated via `validateStatus()` before reaching the SQL helper.
 *     Invalid values → undefined → no filter (safe default).
 *   - T-18-03-02 (q ILIKE injection): q is passed as-is to Drizzle's ilike()
 *     which bind-params the pattern; never string-concatenated into raw SQL.
 *   - requireAdmin() defense-in-depth (AUTH-15) — even though the parent
 *     (admin)/[adminSegment]/layout.tsx already gated.
 */

const VALID_STATUSES: ReadonlySet<PartnerStatus> = new Set([
  'active',
  'invited',
  'inactive',
]);

/** Enum-validate `status` searchParam (T-18-03-01) — invalid values drop to undefined. */
function validateStatus(raw: string | undefined): PartnerStatus | undefined {
  if (raw && (VALID_STATUSES as Set<string>).has(raw)) {
    return raw as PartnerStatus;
  }
  return undefined;
}

export default async function PartnersPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const status = validateStatus(sp.status);
  const q = sp.q?.trim() || undefined;
  const cursor = sp.cursor || undefined;

  const { rows, nextCursor } = await listPartnersWithLastActivity({
    status,
    q,
    cursor,
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
        title={t('admin.partners.page.title', lang)}
        subtitle={t('admin.partners.page.subtitle', lang)}
        actions={
          <Link
            href={`/${adminSegment}/partners/new`}
            className="btn-green"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <UserPlusIcon size={16} aria-hidden="true" />
            {t('admin.partners.invite.cta', lang)}
          </Link>
        }
      />

      {/* SearchBar — Phase 17 reuse (uses 'proposal.search.placeholder' i18n key
          internally; copy is generic 'Rechercher…' which is acceptable on the
          partners surface — future refinement could parameterize the key). */}
      <div style={{ marginTop: 0, marginBottom: 16 }}>
        <SearchBar lang={lang} />
      </div>

      {/* 4-tab filter pill row — D-09 (URL-driven, server-rendered active state) */}
      <div style={{ marginTop: 0, marginBottom: 16 }}>
        <PartnersFilterPillTabs
          currentStatus={status}
          currentQ={q}
          adminSegment={adminSegment}
          lang={lang}
        />
      </div>

      <PartnersList
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        adminSegment={adminSegment}
        currentStatus={status}
        currentQ={q}
      />
    </main>
  );
}
