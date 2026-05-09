import type { Metadata } from 'next';
import Link from 'next/link';
import { Settings2, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';

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
 * Admin home page (UI-SPEC §3.0).
 *
 * Per AUTH-15: every admin route/handler/page calls requireAdmin() independently —
 * defense in depth, do NOT rely on the parent layout alone (PITFALLS §7.1: hidden URL is
 * NOT security; role check is).
 *
 * ADMIN-07 is structurally satisfied by the existing Phase 6 layout (env-segment +
 * 2-layer requireAdmin gate). Phase 9 only updates the BODY of this page to add the
 * two card-style nav links — no gate work.
 */
export default async function AdminHomePage({ params }: PageProps) {
  const { adminSegment } = await params; // PITFALL §1.1
  await requireAdmin(); // AUTH-15 independent check
  const lang = await getCurrentLang();

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 8,
        }}
      >
        {t('admin.home.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 14.5,
          color: 'var(--muted)',
          marginBottom: 24,
        }}
      >
        {t('admin.home.subtitle', lang)}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginTop: 24,
        }}
      >
        <Link
          href={`/${adminSegment}/coefficients`}
          className="card admin-nav-card"
          aria-label={t('admin.home.coefficients.title', lang)}
        >
          <Settings2
            size={48}
            strokeWidth={1.4}
            color="var(--teal)"
            aria-hidden="true"
          />
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginTop: 12 }}>
            {t('admin.home.coefficients.title', lang)}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
            {t('admin.home.coefficients.sub', lang)}
          </div>
        </Link>

        <Link
          href={`/${adminSegment}/accounts`}
          className="card admin-nav-card"
          aria-label={t('admin.home.accounts.title', lang)}
        >
          <Users
            size={48}
            strokeWidth={1.4}
            color="var(--teal)"
            aria-hidden="true"
          />
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginTop: 12 }}>
            {t('admin.home.accounts.title', lang)}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
            {t('admin.home.accounts.sub', lang)}
          </div>
        </Link>
      </div>
    </div>
  );
}
