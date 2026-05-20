/**
 * Phase 14 — /[adminSegment]/partners/new server-component route.
 *
 * D-05 — server component with requireAdmin() defence-in-depth (AUTH-15) +
 * dynamic = 'force-dynamic' (PITFALLS §1.6). Renders the title hero block +
 * <CreatePartnerForm> client component wired to createPartnerInvitationAction.
 *
 * The route is admin-only; non-admin or unauthenticated users hit notFound()
 * via requireAdmin → keeps the admin URL secret (AUTH-14).
 *
 * ADMIN-09 D-29 strict envelope: this page renders ZERO commission strings
 * (form fields are firstName/lastName/email/companyName/siret/phone/message —
 * none are financial-rate values).
 */
import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { createPartnerInvitationAction } from '@/lib/admin';

import { CreatePartnerForm } from './CreatePartnerForm';

// PITFALLS §1.6 — opts out of static rendering (cookie + session reads).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Créer un partenaire — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function CreatePartnerPage({ params }: PageProps) {
  const { adminSegment } = await params;
  // AUTH-15 defence-in-depth — primary gate is middleware + (admin)/layout,
  // this is the page-level secondary guard.
  await requireAdmin();
  const lang = await getCurrentLang();

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 0' }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {t('partners.new.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 32,
        }}
      >
        {t('partners.new.subtitle', lang)}
      </p>

      <CreatePartnerForm
        lang={lang}
        adminSegment={adminSegment}
        createPartnerAction={createPartnerInvitationAction}
      />
    </div>
  );
}
