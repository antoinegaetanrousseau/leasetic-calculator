import type { Metadata } from 'next';
import { Sliders, Users, History } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { AdminNavCard } from '@/components/ui/AdminNavCard';

// PITFALLS §1.6 — opts out of static rendering (reads session cookie via requireAdmin).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administration — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

/**
 * Admin home page — Phase 14 v1.2 design contract (UI-SPEC §5.5, D-13..D-16).
 *
 * Replaces the Phase 9 two-link layout (Settings2 + Users cards via plain Link)
 * with three AdminNavCard instances rendered in a 3-column grid (max-width 1040px,
 * 24px gap). Variants: 'coefficients' (Sliders icon), 'partners' (Users icon),
 * 'history' (History icon) per Figma node 41:46.
 *
 * Per AUTH-15: requireAdmin() is called independently (defense in depth) — do NOT
 * rely on the parent layout alone (PITFALLS §7.1: hidden URL is NOT security; role
 * check is).
 *
 * ADMIN-09 invariant: the 3 cards render only chrome labels (titles + descriptions);
 * no commission values are exposed. The literal string "Coefficients & commission"
 * is a card title, not a value (threat T-14-03-02 mitigated).
 */
export default async function AdminHomePage({ params }: PageProps) {
  const { adminSegment } = await params; // PITFALL §1.1
  await requireAdmin(); // AUTH-15 independent check
  const lang = await getCurrentLang();

  return (
    <div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {t('admin.home.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 0,
        }}
      >
        {t('admin.home.subtitle', lang)}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          maxWidth: 1040,
          marginTop: 32,
        }}
      >
        <AdminNavCard
          variant="coefficients"
          title={t('admin.nav.coefficients.title', lang)}
          description={t('admin.nav.coefficients.description', lang)}
          href={`/${adminSegment}/coefficients`}
          icon={Sliders}
          openLabel={t('admin.nav.open', lang)}
        />
        <AdminNavCard
          variant="partners"
          title={t('admin.nav.partners.title', lang)}
          description={t('admin.nav.partners.description', lang)}
          href={`/${adminSegment}/partners`}
          icon={Users}
          openLabel={t('admin.nav.open', lang)}
        />
        <AdminNavCard
          variant="history"
          title={t('admin.nav.history.title', lang)}
          description={t('admin.nav.history.description', lang)}
          href={`/${adminSegment}/history`}
          icon={History}
          openLabel={t('admin.nav.open', lang)}
        />
      </div>
    </div>
  );
}
