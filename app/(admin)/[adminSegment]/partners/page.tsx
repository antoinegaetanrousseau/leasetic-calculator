import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listPartnersWithLastActivity, type PartnerStatus } from '@/lib/db/queries/partners';
import { PartnersList } from './PartnersList';

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

/** Enum-validate `status` searchParam (T-18-03-01) — invalid values silently drop to undefined. */
function validateStatus(raw: string | undefined): PartnerStatus | undefined {
  if (raw === 'active' || raw === 'invited' || raw === 'inactive') return raw;
  return undefined;
}

/**
 * Phase 18 Plan 03 — admin Partners list route.
 *
 * Task 1 wires the D-14 renamed PartnersList component to the new
 * `listPartnersWithLastActivity` query helper. Task 3 layers PageHero + SearchBar
 * + PartnersFilterPillTabs on top per UI-SPEC §Partners list layout.
 */
export default async function PartnersPage({ params, searchParams }: PageProps) {
  const { adminSegment } = await params;
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const status = validateStatus(sp.status); // T-18-03-01 — enum-validate
  const q = sp.q?.trim() || undefined;
  const cursor = sp.cursor || undefined;

  const { rows, nextCursor } = await listPartnersWithLastActivity({
    status,
    q,
    cursor,
    limit: 20,
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
        {t('admin.partners.page.title', lang)}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {t('admin.partners.page.subtitle', lang)}
      </p>

      <PartnersList
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        adminSegment={adminSegment}
        currentStatus={status}
        currentQ={q}
      />
    </div>
  );
}
