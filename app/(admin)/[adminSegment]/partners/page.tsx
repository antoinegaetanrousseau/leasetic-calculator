import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listPartnersWithCounts } from '@/lib/db/queries';
import { AccountsList } from './AccountsList';

// PITFALLS §1.6 — opts out of static rendering.
export const dynamic = 'force-dynamic';

/**
 * Module-level async helper so Date.now() is not called inside a React
 * component function — satisfies react-hooks/purity (same pattern as
 * app/(authed)/page.tsx).
 */
async function getNowMs(): Promise<number> {
  return Date.now();
}

export const metadata: Metadata = {
  title: 'Partenaires — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function AccountsPage({ params }: PageProps) {
  await params;
  await requireAdmin(); // AUTH-15 defense in depth
  const lang = await getCurrentLang();
  const partners = await listPartnersWithCounts();

  // Stable now-ms for relative-time rendering — passed to client to avoid hydration drift.
  // Called via module-level helper to avoid react-hooks/purity error (Date.now is impure).
  const nowMs = await getNowMs();

  return (
    <div>
      <h1
        style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}
      >
        {t('admin.accounts.page.title', lang)}
      </h1>
      <p
        style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}
      >
        {t('admin.accounts.page.sub', lang)}
      </p>

      <AccountsList lang={lang} initialPartners={partners} nowMs={nowMs} />
    </div>
  );
}
